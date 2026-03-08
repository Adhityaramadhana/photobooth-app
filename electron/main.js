import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join, extname } from 'path'
import { mkdirSync, readFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  checkService,
  getCameraList,
  connectCamera,
  startLiveView,
  stopLiveView,
  capturePhoto,
  saveWebcamFrame,
  saveLiveFrame,
  startHealthCheck,
  stopHealthCheck
} from './handlers/cameraHandlers'
import {
  verifyPassword,
  getSettings,
  saveSettings,
  getFrameList,
  getFrameConfig,
  saveFrameConfig,
  uploadFramePng,
  deleteFrame,
  getFramePng,
  uploadFrameAsset,
  getFrameAsset,
  listFrameAssets,
  deleteFrameAsset,
  getGallery,
  getTransactions,
  logTransaction,
  getVouchers,
  saveVoucher,
  deleteVoucher,
  validateVoucher
} from './handlers/adminHandlers'
import { compositeRun } from './handlers/compositeHandlers'
import { generateGif, generateBoomerang } from './handlers/gifHandlers'
import { uploadToCloud } from './handlers/uploadHandlers'
import { printFile } from './handlers/printHandlers'
import { createOrder, checkPaymentStatus } from './handlers/paymentHandlers'

let mainWindow = null

function createWindow() {
  if (!is.dev) {
    Menu.setApplicationMenu(null)
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC: Core ─────────────────────────────────────────────────────────────────
ipcMain.handle('ping', () => 'pong')

ipcMain.handle('app:getSessionDir', () => {
  const dir = join(app.getPath('userData'), 'sessions', Date.now().toString())
  mkdirSync(dir, { recursive: true })
  return dir
})

ipcMain.handle('app:readFileAsDataUrl', (_, filePath) => {
  if (!filePath || !existsSync(filePath)) return null
  const ext = extname(filePath).toLowerCase()
  const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg'
  const data = readFileSync(filePath)
  return `data:${mime};base64,${data.toString('base64')}`
})

// ── IPC: Camera ───────────────────────────────────────────────────────────────
ipcMain.handle('camera:checkService', () => checkService())
ipcMain.handle('camera:getList', () => getCameraList())
ipcMain.handle('camera:connect', () => connectCamera())
ipcMain.handle('camera:startLiveView', () => startLiveView())
ipcMain.handle('camera:stopLiveView', () => stopLiveView())
ipcMain.handle('camera:capture', (_, outputDir) => capturePhoto(outputDir))
ipcMain.handle('camera:saveWebcamFrame', (_, outputDir, base64) => saveWebcamFrame(outputDir, base64))
ipcMain.handle('camera:saveLiveFrame', (_, outputDir, base64, photoIndex, frameIndex) => saveLiveFrame(outputDir, base64, photoIndex, frameIndex))
ipcMain.handle('camera:startHealthCheck', () => startHealthCheck(mainWindow))
ipcMain.handle('camera:stopHealthCheck', () => stopHealthCheck())

// ── IPC: Admin Auth & Settings ────────────────────────────────────────────────
ipcMain.handle('admin:verifyPassword', (_, pw) => verifyPassword(pw))
ipcMain.handle('admin:getSettings', () => getSettings())
ipcMain.handle('admin:saveSettings', (_, settings) => saveSettings(settings))

// ── IPC: Frame Management ─────────────────────────────────────────────────────
ipcMain.handle('frame:getList', () => getFrameList())
ipcMain.handle('frame:getConfig', (_, id) => getFrameConfig(id))
ipcMain.handle('frame:saveConfig', (_, id, config) => saveFrameConfig(id, config))
ipcMain.handle('frame:uploadPng', (_, id, data) => uploadFramePng(id, data))
ipcMain.handle('frame:delete', (_, id) => deleteFrame(id))
ipcMain.handle('frame:getPng', (_, id) => getFramePng(id))
ipcMain.handle('frame:uploadAsset', (_, id, name, data) => uploadFrameAsset(id, name, data))
ipcMain.handle('frame:getAsset', (_, id, name) => getFrameAsset(id, name))
ipcMain.handle('frame:listAssets', (_, id) => listFrameAssets(id))
ipcMain.handle('frame:deleteAsset', (_, id, name) => deleteFrameAsset(id, name))

// ── IPC: Gallery & Transactions ───────────────────────────────────────────────
ipcMain.handle('admin:getGallery', () => getGallery())
ipcMain.handle('admin:getTransactions', () => getTransactions())
ipcMain.handle('db:logTransaction', (_, data) => logTransaction(data))

// ── IPC: Vouchers ─────────────────────────────────────────────────────────────
ipcMain.handle('admin:getVouchers', () => getVouchers())
ipcMain.handle('admin:saveVoucher', (_, v) => saveVoucher(v))
ipcMain.handle('admin:deleteVoucher', (_, code) => deleteVoucher(code))
ipcMain.handle('voucher:validate', (_, code) => validateVoucher(code))

// ── IPC: Payment ──────────────────────────────────────────────────────────────
ipcMain.handle('payment:createOrder', (_, data) => createOrder(data))
ipcMain.handle('payment:checkStatus', (_, orderId) => checkPaymentStatus(orderId))

// ── IPC: Composite, GIF, Upload, Print ────────────────────────────────────────
ipcMain.handle('composite:run', (_, data) => compositeRun(data))
ipcMain.handle('gif:generate', (_, data) => generateGif(data))
ipcMain.handle('gif:generateBoomerang', (_, data) => generateBoomerang(data))
ipcMain.handle('upload:toCloud', (_, data) => uploadToCloud(data))
ipcMain.handle('print:send', (_, data) => printFile(data))

// ── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.photobooth')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
