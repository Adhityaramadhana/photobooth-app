import { create } from 'zustand'

const useAppStore = create((set) => ({
  // ── Session State ─────────────────────────────────────
  currentSession: null,       // data sesi foto aktif
  currentSessionDir: null,    // direktori output sesi
  capturedPhotos: [],         // array path foto yang sudah diambil
  selectedFrame: null,        // frame config yang dipilih user { id, name, slots[] }
  paymentStatus: null,        // 'pending' | 'paid' | null
  paymentMethod: null,        // 'qris' | 'voucher' | null
  liveFrameBuffer: [],        // buffer frame paths untuk generate GIF
  resultQrUrl: null,          // URL halaman hasil (Firebase)
  resultQrImage: null,        // base64 PNG QR code untuk ditampilkan
  processingStep: null,       // step processing aktif (untuk UI progress)

  // ── Camera State ──────────────────────────────────────
  cameraStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  cameraModel: null,
  liveViewActive: false,
  liveViewFrameUrl: null,
  isMockMode: true,           // ikutin MOCK_MODE di handler

  // ── Admin State ───────────────────────────────────────
  adminAuthenticated: false,

  // ── Session Actions ───────────────────────────────────
  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentSessionDir: (dir) => set({ currentSessionDir: dir }),

  addCapturedPhoto: (photo) =>
    set((state) => ({ capturedPhotos: [...state.capturedPhotos, photo] })),

  clearSession: () =>
    set({
      currentSession: null,
      currentSessionDir: null,
      capturedPhotos: [],
      selectedFrame: null,
      paymentStatus: null,
      paymentMethod: null,
      liveFrameBuffer: [],
      resultQrUrl: null,
      resultQrImage: null,
      processingStep: null,
      liveViewActive: false,
      liveViewFrameUrl: null,
    }),

  setSelectedFrame: (frame) => set({ selectedFrame: frame }),
  setPaymentStatus: (status) => set({ paymentStatus: status }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  addLiveFrame: (path) =>
    set((state) => ({ liveFrameBuffer: [...state.liveFrameBuffer, path] })),
  clearLiveFrames: () => set({ liveFrameBuffer: [] }),

  setResultQrUrl: (url) => set({ resultQrUrl: url }),
  setResultQrImage: (img) => set({ resultQrImage: img }),
  setProcessingStep: (step) => set({ processingStep: step }),

  // ── Camera Actions ────────────────────────────────────
  setCameraStatus: (status) => set({ cameraStatus: status }),
  setCameraModel: (model) => set({ cameraModel: model }),
  setLiveViewActive: (bool) => set({ liveViewActive: bool }),
  setLiveViewFrameUrl: (url) => set({ liveViewFrameUrl: url }),

  // ── Admin Actions ─────────────────────────────────────
  setAdminAuthenticated: (bool) => set({ adminAuthenticated: bool }),
}))

export default useAppStore
