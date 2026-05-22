import { useEffect, useState } from 'react';

export default function ClientInvoicePdf() {
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/custom-views/invoices-for-pdf', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        if (d.error) setError(d.error);
        else {
          setInvoices(d.data || []);
          if (d.data?.length) setSelected(d.data[0].id);
        }
      })
      .catch(e => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const download = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/custom-views/invoice-pdf/${selected}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const inv = invoices.find(i => i.id === Number(selected));
      a.download = `${inv?.invoice_number || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="text-gray-500 text-sm">Loading invoices…</div>;

  return (
    <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Client Invoice PDF</h3>
      {error && <div className="text-red-600 text-sm mb-3">Error: {error}</div>}
      {invoices.length === 0 ? (
        <div className="text-gray-500 text-sm">No invoices available.</div>
      ) : (
        <div className="space-y-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {invoices.map(i => (
              <option key={i.id} value={i.id}>
                {i.invoice_number} — {i.client_company || i.client_name || 'Client'} — ${Number(i.amount).toLocaleString()} [{i.status}]
              </option>
            ))}
          </select>
          <button
            onClick={download}
            disabled={!selected || downloading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          <p className="text-xs text-gray-500">
            Generates a printable PDF document with invoice number, client details, amounts, and status.
          </p>
        </div>
      )}
    </div>
  );
}
