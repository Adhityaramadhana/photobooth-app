import GifEncoder from 'gif-encoder-2'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const GIF_W = 640
const GIF_H = 480
const MAX_FRAMES = 30

function pickFrames(frames, max) {
  if (frames.length <= max) return frames
  const result = []
  const step = frames.length / max
  for (let i = 0; i < max; i++) {
    result.push(frames[Math.floor(i * step)])
  }
  return result
}

async function encodeGif(frameFiles, outputPath, delay = 100, repeat = 0) {
  const encoder = new GifEncoder(GIF_W, GIF_H, 'neuquant', true, frameFiles.length)
  encoder.setDelay(delay)
  encoder.setRepeat(repeat)
  encoder.setQuality(10)

  const outputStream = fs.createWriteStream(outputPath)
  encoder.createReadStream().pipe(outputStream)
  encoder.start()

  for (const framePath of frameFiles) {
    if (!fs.existsSync(framePath)) continue
    const { data } = await sharp(framePath)
      .resize(GIF_W, GIF_H, { fit: 'cover', position: 'centre' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    encoder.addFrame(data)
  }

  encoder.finish()

  await new Promise((resolve, reject) => {
    outputStream.on('finish', resolve)
    outputStream.on('error', reject)
  })
}

export async function generateGif({ sessionDir, liveFrames }) {
  try {
    let frames = liveFrames ?? []

    if (frames.length === 0) {
      const mockPath = path.join(__dirname, '../../resources/mock/sample-capture.jpg')
      if (fs.existsSync(mockPath)) {
        frames = Array(12).fill(mockPath)
      } else {
        return { success: false, error: 'No frames available' }
      }
    }

    const picked = pickFrames(frames.filter(f => fs.existsSync(f)), MAX_FRAMES)
    if (picked.length === 0) return { success: false, error: 'No valid frames' }

    const outputPath = path.join(sessionDir, 'animation.gif')
    await encodeGif(picked, outputPath, 100)
    return { success: true, filePath: outputPath }
  } catch (err) {
    console.error('[GIF] Error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function generateBoomerang({ sessionDir, liveFrames }) {
  try {
    let frames = liveFrames ?? []

    if (frames.length === 0) {
      const mockPath = path.join(__dirname, '../../resources/mock/sample-capture.jpg')
      if (fs.existsSync(mockPath)) {
        frames = Array(12).fill(mockPath)
      } else {
        return { success: false, error: 'No frames available' }
      }
    }

    const validFrames = frames.filter(f => fs.existsSync(f))
    const picked = pickFrames(validFrames, MAX_FRAMES)
    if (picked.length === 0) return { success: false, error: 'No valid frames' }

    const boomerang = [...picked, ...[...picked].reverse()]
    const outputPath = path.join(sessionDir, 'boomerang.gif')
    await encodeGif(boomerang, outputPath, 60)
    return { success: true, filePath: outputPath }
  } catch (err) {
    console.error('[BOOMERANG] Error:', err.message)
    return { success: false, error: err.message }
  }
}
