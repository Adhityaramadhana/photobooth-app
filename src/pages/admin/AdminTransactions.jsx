import { useState, useEffect } from 'react'

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.electronAPI.admin.getTransactions().then(({ transactions: list }) => {
      setTransactions(list ?? [])
      setLoading(false)
    })
  }, [])

  const formatDate = (ts) => ts ? new Date(ts).toLocaleString('id-ID') : '-'
  const formatRp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Transaksi</h1>

      {loading && <p className="text-brand-text/40">Memuat...</p>}

      {!loading && transactions.length === 0 && (
        <p className="text-brand-text/30">Belum ada transaksi.</p>
      )}

      {transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-brand-text/50">
                <th className="text-left py-3 pr-4">Waktu</th>
                <th className="text-left py-3 pr-4">Metode</th>
                <th className="text-left py-3">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 text-brand-text hover:bg-white/5">
                  <td className="py-3 pr-4 text-brand-text/60">{formatDate(tx.timestamp)}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${tx.method === 'voucher' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'}`}>
                      {tx.method ?? '-'}
                    </span>
                  </td>
                  <td className="py-3">{tx.amount ? formatRp(tx.amount) : 'Gratis'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
