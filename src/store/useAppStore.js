import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // ── Session State ─────────────────────────────────────
  currentSession: null,
  currentSessionDir: null,
  capturedPhotos: [],
  selectedFrame: null,
  paymentStatus: null,
  paymentMethod: null,
  liveFrameBuffer: [],
  resultCompositeFile: null,
  resultQrUrl: null,
  resultQrImage: null,
  processingStep: null,

  // ── Camera State ──────────────────────────────────────
  cameraStatus: 'disconnected',
  cameraModel: null,
  liveViewActive: false,
  liveViewFrameUrl: null,
  isMockMode: true,

  // ── Admin State ───────────────────────────────────────
  adminAuthenticated: false,

  // ── Branding State (loaded once at startup) ───────────
  branding: {
    studioName: 'Photobooth',
    primaryColor: '#e94560',
    tagline: '',
    bgColor: '',
    logoDataUrl: null,
    bgImageDataUrl: null,
    layoutTemplate: 'centered',
    showLogoPersistent: false,
    decorativePreset: 'none',
    bgOverlayOpacity: 0,
  },
  brandingLoaded: false,

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
      resultCompositeFile: null,
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

  setResultCompositeFile: (path) => set({ resultCompositeFile: path }),
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

  // ── Branding Actions ──────────────────────────────────
  loadBranding: async () => {
    try {
      const { settings } = await window.electronAPI.admin.getSettings()
      const b = settings?.branding ?? {}

      const [logoRes, bgRes] = await Promise.all([
        b.logoFile ? window.electronAPI.branding.getLogo() : { data: null },
        b.bgImageFile ? window.electronAPI.branding.getBgImage() : { data: null },
      ])

      set({
        branding: {
          studioName: b.studioName || 'Photobooth',
          primaryColor: b.primaryColor || '#e94560',
          tagline: b.tagline || '',
          bgColor: b.bgColor || '',
          logoDataUrl: logoRes.data || null,
          bgImageDataUrl: bgRes.data || null,
          layoutTemplate: b.layoutTemplate || 'centered',
          showLogoPersistent: b.showLogoPersistent ?? false,
          decorativePreset: b.decorativePreset || 'none',
          bgOverlayOpacity: b.bgOverlayOpacity ?? 0,
        },
        brandingLoaded: true,
      })
    } catch (err) {
      console.error('[loadBranding]', err)
      set({ brandingLoaded: true })
    }
  },

  setBranding: (partial) =>
    set((state) => ({ branding: { ...state.branding, ...partial } })),

  // ── Admin Navigation Guard ────────────────────────────
  adminDirtyGuard: false,
  setAdminDirtyGuard: (bool) => set({ adminDirtyGuard: bool }),
}))

export default useAppStore
