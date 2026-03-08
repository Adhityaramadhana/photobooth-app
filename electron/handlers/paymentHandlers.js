import fetch from 'node-fetch'
import QRCode from 'qrcode'
import { getSettings } from './adminHandlers.js'

function getBase(isProduction) {
  return isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2'
}

function authHeader(serverKey) {
  return `Basic ${Buffer.from(serverKey + ':').toString('base64')}`
}

async function getMockQr() {
  return QRCode.toDataURL('https://photobooth.mock/qr-demo', {
    width: 320,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#eaeaea' }
  })
}

export async function createOrder({ amount, orderId }) {
  try {
    const { settings } = getSettings()
    const serverKey = settings?.midtrans?.serverKey
    const isProduction = settings?.midtrans?.isProduction ?? false

    const txOrderId = orderId || `pb-${Date.now()}`

    if (!serverKey) {
      const qrImageBase64 = await getMockQr()
      return { success: true, orderId: txOrderId, qrImageBase64, mock: true }
    }

    const base = getBase(isProduction)
    const res = await fetch(`${base}/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader(serverKey),
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: {
          order_id: txOrderId,
          gross_amount: amount
        },
        qris: { acquirer: 'gopay' }
      })
    })

    const data = await res.json()

    if (!['201', '200'].includes(String(data.status_code))) {
      throw new Error(data.status_message || 'Midtrans error')
    }

    const qrImageBase64 = await QRCode.toDataURL(data.qr_string, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })

    return { success: true, orderId: txOrderId, qrImageBase64, mock: false }
  } catch (err) {
    console.error('[PAYMENT] createOrder error:', err.message)
    return { success: false, error: err.message }
  }
}

export async function checkPaymentStatus(orderId) {
  try {
    const { settings } = getSettings()
    const serverKey = settings?.midtrans?.serverKey
    const isProduction = settings?.midtrans?.isProduction ?? false

    if (!serverKey) {
      return { paid: false, mock: true }
    }

    const base = getBase(isProduction)
    const res = await fetch(`${base}/${orderId}/status`, {
      headers: { 'Authorization': authHeader(serverKey) }
    })

    const data = await res.json()
    const paid = ['settlement', 'capture'].includes(data.transaction_status)
    return { paid, status: data.transaction_status }
  } catch (err) {
    console.error('[PAYMENT] checkStatus error:', err.message)
    return { paid: false, error: err.message }
  }
}
