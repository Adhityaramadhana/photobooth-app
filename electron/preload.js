import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe, limited API to the renderer process.
// NEVER expose the full ipcRenderer object.
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),

  app: {
    getSessionDir: () => ipcRenderer.invoke('app:getSessionDir'),
    readFileAsDataUrl: (filePath) => ipcRenderer.invoke('app:readFileAsDataUrl', filePath),
  },

  camera: {
    checkService: () => ipcRenderer.invoke('camera:checkService'),
    getList: () => ipcRenderer.invoke('camera:getList'),
    connect: () => ipcRenderer.invoke('camera:connect'),
    startLiveView: () => ipcRenderer.invoke('camera:startLiveView'),
    stopLiveView: () => ipcRenderer.invoke('camera:stopLiveView'),
    capture: (outputDir) => ipcRenderer.invoke('camera:capture', outputDir),
    // Webcam mode: renderer ambil snapshot canvas → kirim base64 → main simpan ke disk
    saveWebcamFrame: (outputDir, base64) => ipcRenderer.invoke('camera:saveWebcamFrame', outputDir, base64),
    saveLiveFrame: (outputDir, base64, photoIndex, frameIndex) => ipcRenderer.invoke('camera:saveLiveFrame', outputDir, base64, photoIndex, frameIndex),
    startHealthCheck: () => ipcRenderer.invoke('camera:startHealthCheck'),
    stopHealthCheck: () => ipcRenderer.invoke('camera:stopHealthCheck'),
    onDisconnected: (cb) => ipcRenderer.on('camera:disconnected', cb)
  },

  admin: {
    verifyPassword: (pw) => ipcRenderer.invoke('admin:verifyPassword', pw),
    getSettings: () => ipcRenderer.invoke('admin:getSettings'),
    saveSettings: (s) => ipcRenderer.invoke('admin:saveSettings', s),
    getGallery: () => ipcRenderer.invoke('admin:getGallery'),
    getTransactions: () => ipcRenderer.invoke('admin:getTransactions'),
    getVouchers: () => ipcRenderer.invoke('admin:getVouchers'),
    saveVoucher: (v) => ipcRenderer.invoke('admin:saveVoucher', v),
    deleteVoucher: (code) => ipcRenderer.invoke('admin:deleteVoucher', code),
  },

  frame: {
    getList: () => ipcRenderer.invoke('frame:getList'),
    getConfig: (id) => ipcRenderer.invoke('frame:getConfig', id),
    saveConfig: (id, cfg) => ipcRenderer.invoke('frame:saveConfig', id, cfg),
    uploadPng: (id, data) => ipcRenderer.invoke('frame:uploadPng', id, data),
    delete: (id) => ipcRenderer.invoke('frame:delete', id),
    getPng: (id) => ipcRenderer.invoke('frame:getPng', id),
    uploadAsset: (id, name, data) => ipcRenderer.invoke('frame:uploadAsset', id, name, data),
    getAsset: (id, name) => ipcRenderer.invoke('frame:getAsset', id, name),
    listAssets: (id) => ipcRenderer.invoke('frame:listAssets', id),
    deleteAsset: (id, name) => ipcRenderer.invoke('frame:deleteAsset', id, name),
  },

  db: {
    logTransaction: (data) => ipcRenderer.invoke('db:logTransaction', data),
  },

  voucher: {
    validate: (code) => ipcRenderer.invoke('voucher:validate', code),
  },

  payment: {
    createOrder: (data) => ipcRenderer.invoke('payment:createOrder', data),
    checkStatus: (orderId) => ipcRenderer.invoke('payment:checkStatus', orderId),
  },

  composite: {
    run: (data) => ipcRenderer.invoke('composite:run', data),
  },

  gif: {
    generate: (data) => ipcRenderer.invoke('gif:generate', data),
    generateBoomerang: (data) => ipcRenderer.invoke('gif:generateBoomerang', data),
  },

  upload: {
    toCloud: (data) => ipcRenderer.invoke('upload:toCloud', data),
  },

  print: {
    send: (data) => ipcRenderer.invoke('print:send', data),
  },
})
