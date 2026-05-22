import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function RevenuePerClientChart() {
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/custom-views/revenue-per-client', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => { if (!mounted) return; if (d.error) setError(d.error); else setChart(d); })
      .catch(e => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="text-gray-500 text-sm">Loading revenue chart…</div>;
  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;
  if (!chart || !chart.data?.length) return <div className="text-gray-500 text-sm">No data.</div>;

  const max = Math.max(1, ...chart.data.map(d => d.paid + d.outstanding));

  return (
    <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{chart.title}</h3>
        <span className="text-xs text-gray-500">
          {chart.clientCount} clients · ${Math.round(chart.totalRevenue).toLocaleString()} paid
        </span>
      </div>
      <div className="space-y-2">
        {chart.data.slice(0, 12).map(row => {
          const paidPct = (row.paid / max) * 100;
          const outPct = (row.outstanding / max) * 100;
          return (
            <div key={row.clientId} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="font-medium text-gray-700 truncate">{row.label}</span>
                <span className="text-gray-500">
                  ${Math.round(row.paid).toLocaleString()}
                  {row.outstanding ? ` · $${Math.round(row.outstanding).toLocaleString()} due` : ''}
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} title="Paid" />
                <div className="h-full bg-amber-400" style={{ width: `${outPct}%` }} title="Outstanding" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 inline-block rounded" /> Paid</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400 inline-block rounded" /> Outstanding</span>
      </div>
    </div>
  );
}
