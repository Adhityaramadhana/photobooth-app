import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const framesDir = () => path.join(__dirname, '../../resources/frames')

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return fallback
  }
}

export async function compositeRun({ sessionDir, photos, frameId, slots, sessionData }) {
  try {
    // Load template config to check version
    const cfgPath = path.join(framesDir(), frameId, 'config.json')
    const config = readJson(cfgPath, null)

    if (config?.version === 2 && config.layers) {
      return compositeV2({ sessionDir, photos, frameId, config, sessionData })
    }

    // v1 fallback
    return compositeV1({ sessionDir, photos, frameId, slots })
  } catch (err) {
    console.error('[COMPOSITE] Error:', err.message)
    return { success: false, error: err.message }
  }
}

// ── V1: Original frame.png overlay approach ──────────────────────────────────

async function compositeV1({ sessionDir, photos, frameId, slots }) {
  const framePng = path.join(framesDir(), frameId, 'frame.png')
  if (!fs.existsSync(framePng)) {
    return { success: false, error: `Frame PNG not found: ${framePng}` }
  }

  const frameMeta = await sharp(framePng).metadata()
  const canvasW = frameMeta.width
  const canvasH = frameMeta.height

  const photoLayers = await Promise.all(
    slots.map(async (slot, i) => {
      if (!photos[i] || !fs.existsSync(photos[i])) return null
      const buf = await sharp(photos[i])
        .resize(Math.round(slot.width), Math.round(slot.height), { fit: 'cover', position: 'centre' })
        .toBuffer()
      return { input: buf, top: Math.round(slot.y), left: Math.round(slot.x) }
    })
  )

  const frameBuf = fs.readFileSync(framePng)
  const outputPath = path.join(sessionDir, 'composite.jpg')

  await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([
      ...photoLayers.filter(Boolean),
      { input: frameBuf, top: 0, left: 0 }
    ])
    .jpeg({ quality: 92 })
    .toFile(outputPath)

  return { success: true, filePath: outputPath }
}

// ── V2: Layer-based compositing ──────────────────────────────────────────────

async function compositeV2({ sessionDir, photos, frameId, config, sessionData }) {
  const canvasW = config.canvas?.width || 1200
  const canvasH = config.canvas?.height || 1800
  const bgColor = parseColor(config.canvas?.backgroundColor || '#ffffff')

  const compositeLayers = []

  for (const layer of config.layers) {
    if (layer.visible === false) continue
    const opacity = layer.opacity ?? 1
    if (opacity <= 0) continue

    switch (layer.layerRole) {
      case 'background': {
        const buf = await resolveImageLayer(frameId, layer, canvasW, canvasH)
        if (buf) compositeLayers.push({ input: buf, top: 0, left: 0 })
        break
      }

      case 'photo-slot': {
        const idx = layer.slotIndex ?? 0
        const photoPath = photos[idx]
        if (!photoPath || !fs.existsSync(photoPath)) break

        // Clamp slot position and size to stay within canvas bounds
        const slotLeft = Math.max(0, Math.round(layer.left || 0))
        const slotTop  = Math.max(0, Math.round(layer.top  || 0))
        const slotW = Math.min(Math.round(layer.width  || 400), canvasW - slotLeft)
        const slotH = Math.min(Math.round(layer.height || 300), canvasH - slotTop)
        if (slotW <= 0 || slotH <= 0) break

        const buf = await sharp(photoPath)
          .resize(slotW, slotH, { fit: 'cover', position: 'centre' })
          .toBuffer()

        compositeLayers.push({ input: buf, top: slotTop, left: slotLeft })
        break
      }

      case 'overlay': {
        // Clamp overlay to canvas bounds
        const oLeft = Math.max(0, Math.round(layer.left || 0))
        const oTop  = Math.max(0, Math.round(layer.top  || 0))
        const oW = Math.min(Math.round(layer.width  || canvasW), canvasW - oLeft)
        const oH = Math.min(Math.round(layer.height || canvasH), canvasH - oTop)
        const buf = await resolveImageLayer(frameId, layer, oW, oH)
        if (buf) compositeLayers.push({ input: buf, top: oTop, left: oLeft })
        break
      }

      case 'static-text':
      case 'dynamic-text': {
        let textContent = layer.text || ''
        if (layer.layerRole === 'dynamic-text' && sessionData) {
          textContent = substituteTokens(textContent, layer.dynamicField, sessionData)
        }
        const textLeft = Math.max(0, Math.round(layer.left || 0))
        const textTop  = Math.max(0, Math.round(layer.top  || 0))
        const maxTextW = canvasW - textLeft
        const maxTextH = canvasH - textTop
        const svgBuf = renderTextToSvgBuffer(textContent, layer, maxTextW, maxTextH)
        if (svgBuf) compositeLayers.push({ input: svgBuf, top: textTop, left: textLeft })
        break
      }
    }
  }

  const outputPath = path.join(sessionDir, 'composite.jpg')

  await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: bgColor }
  })
    .composite(compositeLayers)
    .jpeg({ quality: 92 })
    .toFile(outputPath)

  return { success: true, filePath: outputPath }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function resolveImageLayer(frameId, layer, fitW, fitH) {
  // Try loading from assets dir first, then frame.png fallback
  const assetsDir = path.join(framesDir(), frameId, 'assets')
  const framePng = path.join(framesDir(), frameId, 'frame.png')

  let imagePath = null

  // Check if layer has a src/filename reference
  if (layer.src) {
    const assetPath = path.join(assetsDir, layer.src)
    if (fs.existsSync(assetPath)) imagePath = assetPath
  }

  // For overlay without explicit src, try frame.png
  if (!imagePath && layer.layerRole === 'overlay') {
    if (fs.existsSync(framePng)) imagePath = framePng
  }

  // NOTE: layer.width/height come from canvasToLayers which uses obj.getScaledWidth() —
  // they are already the final rendered pixel size. Do NOT multiply by scaleX/Y again.

  // If layer has embedded base64 from fabric serialization
  if (!imagePath && layer.src?.startsWith('data:')) {
    const raw = layer.src.replace(/^data:image\/\w+;base64,/, '')
    const buf = Buffer.from(raw, 'base64')
    const w = fitW || Math.round(layer.width || 100)
    const h = fitH || Math.round(layer.height || 100)
    return sharp(buf).resize(w, h, { fit: 'fill' }).png().toBuffer()
  }

  if (!imagePath) return null

  const w = fitW || Math.round(layer.width || 100)
  const h = fitH || Math.round(layer.height || 100)

  return sharp(imagePath).resize(w, h, { fit: 'fill' }).png().toBuffer()
}

function substituteTokens(text, dynamicField, data) {
  if (dynamicField === 'date') return data.date || new Date().toLocaleDateString('id-ID')
  if (dynamicField === 'time') return data.time || new Date().toLocaleTimeString('id-ID')
  if (dynamicField === 'datetime') return `${data.date || new Date().toLocaleDateString('id-ID')} ${data.time || new Date().toLocaleTimeString('id-ID')}`
  if (dynamicField === 'session_id') return data.sessionId || ''
  if (dynamicField === 'studio_name') return data.studioName || 'Photobooth'
  // Fallback: replace mustache tokens
  return text
    .replace('<<Date>>', data.date || new Date().toLocaleDateString('id-ID'))
    .replace('<<Time>>', data.time || new Date().toLocaleTimeString('id-ID'))
    .replace('<<Date & Time>>', `${data.date || ''} ${data.time || ''}`.trim())
    .replace('<<Session Number>>', data.sessionId || '')
    .replace('<<Studio Name>>', data.studioName || 'Photobooth')
}

function renderTextToSvgBuffer(text, layer, maxW = 4000, maxH = 4000) {
  if (!text) return null
  const fontSize = layer.fontSize || 32
  const fontFamily = layer.fontFamily || 'Arial'
  const fill = layer.fill || '#333333'
  const fontWeight = layer.fontWeight || 'normal'
  const fontStyle = layer.fontStyle || 'normal'
  const textAnchor = layer.textAlign === 'center' ? 'middle' : layer.textAlign === 'right' ? 'end' : 'start'

  // Estimate text dimensions, clamped to available canvas space
  const charWidth = fontSize * 0.6
  const w = Math.min(Math.max(Math.ceil(text.length * charWidth) + 20, 50), Math.max(maxW, 1))
  const h = Math.min(Math.ceil(fontSize * 1.5), Math.max(maxH, 1))

  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="${textAnchor === 'middle' ? w / 2 : textAnchor === 'end' ? w : 0}" y="${fontSize}"
      font-size="${fontSize}" font-family="${fontFamily}" fill="${fill}"
      font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${textAnchor}">
      ${escaped}
    </text>
  </svg>`

  return Buffer.from(svg)
}

function parseColor(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return { r: 255, g: 255, b: 255, alpha: 1 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), alpha: 1 }
}
