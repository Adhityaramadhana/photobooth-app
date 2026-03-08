import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import { getSettings } from './adminHandlers.js'

async function uploadToFirebase(apiKey, bucket, filePath, remotePath, contentType) {
  const fileBuffer = fs.readFileSync(filePath)
  const encodedPath = encodeURIComponent(remotePath)
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedPath}&uploadType=media&key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: fileBuffer
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Firebase upload failed (${res.status}): ${errText}`)
  }

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`
}

function buildResultHtml({ studioName, compositeUrl, photoUrls, gifUrl, boomerangUrl }) {
  const photoItems = photoUrls.map((url, i) => `
    <div class="item">
      <img src="${url}" alt="Foto ${i + 1}" loading="lazy" />
      <a href="${url}" download="foto-${i + 1}.jpg" class="btn">⬇ Download Foto ${i + 1}</a>
    </div>`).join('')

  const sectionComposite = compositeUrl ? `
  <div class="section">
    <h2>📸 Foto dengan Frame</h2>
    <div class="item">
      <img src="${compositeUrl}" alt="Foto dengan frame" />
      <a href="${compositeUrl}" download="foto-frame.jpg" class="btn">⬇ Download</a>
    </div>
  </div>` : ''

  const sectionPhotos = photoUrls.length > 0 ? `
  <div class="section">
    <h2>🖼 Foto Original</h2>
    <div class="grid">${photoItems}</div>
  </div>` : ''

  const sectionGif = gifUrl ? `
  <div class="section">
    <h2>🎞 GIF Animasi</h2>
    <div class="item">
      <img src="${gifUrl}" alt="GIF" />
      <a href="${gifUrl}" download="animasi.gif" class="btn">⬇ Download GIF</a>
    </div>
  </div>` : ''

  const sectionBoomerang = boomerangUrl ? `
  <div class="section">
    <h2>🔄 Boomerang</h2>
    <div class="item">
      <img src="${boomerangUrl}" alt="Boomerang" />
      <a href="${boomerangUrl}" download="boomerang.gif" class="btn">⬇ Download Boomerang</a>
    </div>
  </div>` : ''

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${studioName} — Foto Kamu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #eaeaea; min-height: 100vh; padding: 20px; }
    h1 { text-align: center; color: #e94560; margin-bottom: 6px; font-size: 1.8rem; }
    .subtitle { text-align: center; color: #888; font-size: 0.9rem; margin-bottom: 28px; }
    .section { background: #16213e; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.08); }
    .section h2 { font-size: 0.95rem; color: #e94560; margin-bottom: 14px; letter-spacing: 0.04em; }
    .item { margin-bottom: 12px; }
    .item img { width: 100%; border-radius: 10px; margin-bottom: 10px; display: block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
    .btn { display: block; width: 100%; text-align: center; padding: 10px; background: #e94560; color: white; text-decoration: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; }
    .btn:active { opacity: 0.8; }
  </style>
</head>
<body>
  <h1>📸 ${studioName}</h1>
  <p class="subtitle">Foto kamu siap! Pilih mana yang mau didownload.</p>
  ${sectionComposite}
  ${sectionPhotos}
  ${sectionGif}
  ${sectionBoomerang}
</body>
</html>`
}

export async function uploadToCloud({ sessionDir, compositeFile, rawPhotos, gifFile, boomerangFile, studioName }) {
  try {
    const { settings } = getSettings()
    const apiKey = settings?.firebase?.apiKey
    const bucket = settings?.firebase?.storageBucket

    if (!apiKey || !bucket) {
      console.log('[UPLOAD] Firebase not configured, returning mock')
      return { success: true, qrUrl: 'mock', qrImageBase64: null }
    }

    const sessionId = path.basename(sessionDir)
    const prefix = `photobooth/${sessionId}`

    let compositeUrl = null
    let gifUrl = null
    let boomerangUrl = null
    const photoUrls = []

    if (compositeFile && fs.existsSync(compositeFile)) {
      compositeUrl = await uploadToFirebase(apiKey, bucket, compositeFile, `${prefix}/composite.jpg`, 'image/jpeg')
    }

    for (let i = 0; i < (rawPhotos?.length ?? 0); i++) {
      if (fs.existsSync(rawPhotos[i])) {
        const url = await uploadToFirebase(apiKey, bucket, rawPhotos[i], `${prefix}/photo-${i + 1}.jpg`, 'image/jpeg')
        photoUrls.push(url)
      }
    }

    if (gifFile && fs.existsSync(gifFile)) {
      gifUrl = await uploadToFirebase(apiKey, bucket, gifFile, `${prefix}/animation.gif`, 'image/gif')
    }

    if (boomerangFile && fs.existsSync(boomerangFile)) {
      boomerangUrl = await uploadToFirebase(apiKey, bucket, boomerangFile, `${prefix}/boomerang.gif`, 'image/gif')
    }

    const html = buildResultHtml({
      studioName: studioName || 'Photobooth',
      compositeUrl,
      photoUrls,
      gifUrl,
      boomerangUrl
    })
    const htmlPath = path.join(sessionDir, 'result.html')
    fs.writeFileSync(htmlPath, html, 'utf-8')

    const qrUrl = await uploadToFirebase(apiKey, bucket, htmlPath, `${prefix}/result.html`, 'text/html')

    const qrImageBase64 = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#eaeaea' }
    })

    return { success: true, qrUrl, qrImageBase64 }
  } catch (err) {
    console.error('[UPLOAD] Error:', err.message)
    return { success: false, error: err.message }
  }
}
