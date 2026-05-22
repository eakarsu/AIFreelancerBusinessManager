import { useEffect, useState } from 'react';

const TIER_DEFAULTS = { name: '', hourlyRate: 100, minHours: 0, maxHours: 40, description: '' };
const RETAINER_DEFAULTS = { name: '', monthlyAmount: 3000, includedHours: 20, overageRate: 125, autoRenew: true, noticeDays: 30 };

export default function PricingRulesEditor() {
  const [rules, setRules] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newTier, setNewTier] = useState(TIER_DEFAULTS);
  const [newRetainer, setNewRetainer] = useState(RETAINER_DEFAULTS);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const load = () =>
    fetch('/api/custom-views/pricing-rules', { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setRules(d); })
      .catch(e => setError(e.message));

  useEffect(() => { load(); }, []);

  const createItem = async (kind, item) => {
    setBusy(true);
    try {
      const res = await fetch('/api/custom-views/pricing-rules', {
        method: 'POST', headers: headers(), body: JSON.stringify({ kind, item }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'failed');
      await load();
      if (kind === 'rateTier') setNewTier(TIER_DEFAULTS);
      else setNewRetainer(RETAINER_DEFAULTS);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const updateField = async (id, patch) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-views/pricing-rules/${id}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'failed');
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const removeItem = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-views/pricing-rules/${id}`, {
        method: 'DELETE', headers: headers(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'failed');
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (!rules) return <div className="text-gray-500 text-sm">Loading pricing rules…</div>;

  return (
    <div className="bg-white rounded-xl shadow p-5 border border-gray-100 space-y-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Pricing &amp; Contract Rules</h3>
        <span className="text-xs text-gray-500">
          {rules.summary.tierCount} tiers · {rules.summary.retainerCount} retainers
        </span>
      </div>
      {error && <div className="text-red-600 text-sm">Error: {error}</div>}

      <section>
        <h4 className="font-medium text-gray-800 mb-2">Rate Tiers</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left">
              <th className="py-1">Name</th><th>Rate $/hr</th><th>Min h</th><th>Max h</th><th>Description</th><th />
            </tr>
          </thead>
          <tbody>
            {rules.rateTiers.map(t => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="py-1"><input className="border rounded px-1 py-0.5 w-28" defaultValue={t.name} onBlur={e => updateField(t.id, { name: e.target.value })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-20" defaultValue={t.hourlyRate} onBlur={e => updateField(t.id, { hourlyRate: Number(e.target.value) })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-16" defaultValue={t.minHours} onBlur={e => updateField(t.id, { minHours: Number(e.target.value) })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-16" defaultValue={t.maxHours} onBlur={e => updateField(t.id, { maxHours: Number(e.target.value) })} /></td>
                <td><input className="border rounded px-1 py-0.5 w-48" defaultValue={t.description} onBlur={e => updateField(t.id, { description: e.target.value })} /></td>
                <td><button className="text-red-600 text-xs" disabled={busy} onClick={() => removeItem(t.id)}>Delete</button></td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 bg-gray-50">
              <td><input className="border rounded px-1 py-0.5 w-28" placeholder="Name" value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-20" value={newTier.hourlyRate} onChange={e => setNewTier({ ...newTier, hourlyRate: Number(e.target.value) })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-16" value={newTier.minHours} onChange={e => setNewTier({ ...newTier, minHours: Number(e.target.value) })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-16" value={newTier.maxHours} onChange={e => setNewTier({ ...newTier, maxHours: Number(e.target.value) })} /></td>
              <td><input className="border rounded px-1 py-0.5 w-48" placeholder="Description" value={newTier.description} onChange={e => setNewTier({ ...newTier, description: e.target.value })} /></td>
              <td><button className="text-indigo-600 text-xs" disabled={busy || !newTier.name} onClick={() => createItem('rateTier', newTier)}>Add</button></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h4 className="font-medium text-gray-800 mb-2">Retainer Rules</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left">
              <th className="py-1">Name</th><th>Monthly $</th><th>Incl h</th><th>Overage $/h</th><th>Auto-renew</th><th>Notice days</th><th />
            </tr>
          </thead>
          <tbody>
            {rules.retainerRules.map(r => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="py-1"><input className="border rounded px-1 py-0.5 w-40" defaultValue={r.name} onBlur={e => updateField(r.id, { name: e.target.value })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-24" defaultValue={r.monthlyAmount} onBlur={e => updateField(r.id, { monthlyAmount: Number(e.target.value) })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-16" defaultValue={r.includedHours} onBlur={e => updateField(r.id, { includedHours: Number(e.target.value) })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-20" defaultValue={r.overageRate} onBlur={e => updateField(r.id, { overageRate: Number(e.target.value) })} /></td>
                <td><input type="checkbox" defaultChecked={r.autoRenew} onChange={e => updateField(r.id, { autoRenew: e.target.checked })} /></td>
                <td><input type="number" className="border rounded px-1 py-0.5 w-16" defaultValue={r.noticeDays} onBlur={e => updateField(r.id, { noticeDays: Number(e.target.value) })} /></td>
                <td><button className="text-red-600 text-xs" disabled={busy} onClick={() => removeItem(r.id)}>Delete</button></td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 bg-gray-50">
              <td><input className="border rounded px-1 py-0.5 w-40" placeholder="Name" value={newRetainer.name} onChange={e => setNewRetainer({ ...newRetainer, name: e.target.value })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-24" value={newRetainer.monthlyAmount} onChange={e => setNewRetainer({ ...newRetainer, monthlyAmount: Number(e.target.value) })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-16" value={newRetainer.includedHours} onChange={e => setNewRetainer({ ...newRetainer, includedHours: Number(e.target.value) })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-20" value={newRetainer.overageRate} onChange={e => setNewRetainer({ ...newRetainer, overageRate: Number(e.target.value) })} /></td>
              <td><input type="checkbox" checked={newRetainer.autoRenew} onChange={e => setNewRetainer({ ...newRetainer, autoRenew: e.target.checked })} /></td>
              <td><input type="number" className="border rounded px-1 py-0.5 w-16" value={newRetainer.noticeDays} onChange={e => setNewRetainer({ ...newRetainer, noticeDays: Number(e.target.value) })} /></td>
              <td><button className="text-indigo-600 text-xs" disabled={busy || !newRetainer.name} onClick={() => createItem('retainer', newRetainer)}>Add</button></td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
