import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const framesDir = () => path.join(__dirname, '../../resources/frames')

export async function compositeRun({ sessionDir, photos, frameId, slots }) {
  try {
    const framePng = path.join(framesDir(), frameId, 'frame.png')

    if (!fs.existsSync(framePng)) {
      return { success: false, error: `Frame PNG not found: ${framePng}` }
    }

    // Get frame canvas dimensions from PNG metadata
    const frameMeta = await sharp(framePng).metadata()
    const canvasW = frameMeta.width
    const canvasH = frameMeta.height

    // Resize each photo to fit its slot with cover crop
    const photoLayers = await Promise.all(
      slots.map(async (slot, i) => {
        if (!photos[i] || !fs.existsSync(photos[i])) return null
        const buf = await sharp(photos[i])
          .resize(Math.round(slot.width), Math.round(slot.height), { fit: 'cover', position: 'centre' })
          .toBuffer()
        return {
          input: buf,
          top: Math.round(slot.y),
          left: Math.round(slot.x)
        }
      })
    )

    const frameBuf = fs.readFileSync(framePng)
    const outputPath = path.join(sessionDir, 'composite.jpg')

    await sharp({
      create: {
        width: canvasW,
        height: canvasH,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([
        ...photoLayers.filter(Boolean),
        { input: frameBuf, top: 0, left: 0 }
      ])
      .jpeg({ quality: 92 })
      .toFile(outputPath)

    return { success: true, filePath: outputPath }
  } catch (err) {
    console.error('[COMPOSITE] Error:', err.message)
    return { success: false, error: err.message }
  }
}
