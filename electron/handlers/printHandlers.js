import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function printFile({ filePath, printerName, copies = 1 }) {
  if (!printerName) {
    console.log('[PRINT] No printer configured, skipping')
    return { success: true, skipped: true }
  }

  try {
    for (let i = 0; i < copies; i++) {
      await execAsync(`mspaint /pt "${filePath}" "${printerName}"`)
    }
    return { success: true }
  } catch (err) {
    console.error('[PRINT] Error:', err.message)
    return { success: false, error: err.message }
  }
}
