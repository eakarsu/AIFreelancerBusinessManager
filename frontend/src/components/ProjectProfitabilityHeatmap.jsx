import { useEffect, useState } from 'react';

export default function ProjectProfitabilityHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/custom-views/project-profitability-heatmap', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => { if (!mounted) return; if (d.error) setError(d.error); else setData(d); })
      .catch(e => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="text-gray-500 text-sm">Loading heatmap…</div>;
  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;
  if (!data || !data.rows?.length) return <div className="text-gray-500 text-sm">No project data.</div>;

  const colorFor = (profit) => {
    if (profit === 0) return 'bg-gray-100 text-gray-500';
    if (profit > 0) {
      const intensity = Math.min(1, profit / Math.max(1, data.scale.max));
      const step = Math.round(intensity * 4);
      return ['bg-emerald-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'][step] + ' text-emerald-900';
    }
    const intensity = Math.min(1, Math.abs(profit) / Math.max(1, Math.abs(data.scale.min)));
    const step = Math.round(intensity * 4);
    return ['bg-rose-100', 'bg-rose-200', 'bg-rose-300', 'bg-rose-400', 'bg-rose-500'][step] + ' text-rose-900';
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 border border-gray-100 overflow-x-auto">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{data.title}</h3>
        <span className="text-xs text-gray-500">
          Profit range: ${Math.round(data.scale.min).toLocaleString()} – ${Math.round(data.scale.max).toLocaleString()}
        </span>
      </div>
      <table className="text-xs min-w-full">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 font-medium text-gray-600">Project</th>
            {data.xAxis.map(m => (
              <th key={m.key} className="px-2 py-1 font-medium text-gray-600 text-center">{m.label}</th>
            ))}
            <th className="px-2 py-1 font-medium text-gray-600 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.slice(0, 20).map(row => (
            <tr key={row.projectId} className="border-t border-gray-100">
              <td className="px-2 py-1 text-gray-800 max-w-[200px] truncate">{row.project}</td>
              {row.cells.map(c => (
                <td key={c.month} className={`px-2 py-1 text-center ${colorFor(c.profit)}`} title={`Rev $${Math.round(c.revenue)} / Cost $${Math.round(c.cost)}`}>
                  ${Math.round(c.profit).toLocaleString()}
                </td>
              ))}
              <td className="px-2 py-1 text-right font-medium text-gray-700">${Math.round(row.totalProfit).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
