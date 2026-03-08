import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import ModeSelect from './pages/ModeSelect'
import IdleScreen from './pages/user/IdleScreen'
import Payment from './pages/user/Payment'
import SelectFrame from './pages/user/SelectFrame'
import PhotoSession from './pages/user/PhotoSession'
import Processing from './pages/user/Processing'
import Result from './pages/user/Result'
import AdminLogin from './pages/admin/AdminLogin'
import AdminFrameManager from './pages/admin/AdminFrameManager'
import AdminGallery from './pages/admin/AdminGallery'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminVouchers from './pages/admin/AdminVouchers'
import AdminPaymentSettings from './pages/admin/AdminPaymentSettings'
import AdminPrinterSettings from './pages/admin/AdminPrinterSettings'
import AdminBrandingSettings from './pages/admin/AdminBrandingSettings'
import AdminCloudSettings from './pages/admin/AdminCloudSettings'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* User flow — pakai Layout (fullscreen + exit button) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<ModeSelect />} />
          <Route path="idle" element={<IdleScreen />} />
          <Route path="payment" element={<Payment />} />
          <Route path="select-frame" element={<SelectFrame />} />
          <Route path="photo-session" element={<PhotoSession />} />
          <Route path="processing" element={<Processing />} />
          <Route path="result" element={<Result />} />

        </Route>

        {/* Admin Login — standalone, path unik agar tidak konflik dengan AdminLayout */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin panel — pakai AdminLayout (sidebar + route guard) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/frames" replace />} />
          <Route path="frames" element={<AdminFrameManager />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="payment" element={<AdminPaymentSettings />} />
          <Route path="printer" element={<AdminPrinterSettings />} />
          <Route path="branding" element={<AdminBrandingSettings />} />
          <Route path="cloud" element={<AdminCloudSettings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
