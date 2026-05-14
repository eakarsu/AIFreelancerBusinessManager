import { useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * Apply pass 5 (FE) — surfaces the backlog endpoints added in Apply pass 5:
 *   - /api/vendors        (PRODUCT-DECISION)
 *   - /api/payments       (NEEDS-CREDS — Stripe / Wise)
 *   - /api/fx-rates       (NEEDS-CREDS — FX feed)
 *   - /api/marketing      (PRODUCT-DECISION — leads/funnel)
 *
 * Tabbed minimal viewer: list current rows, add a row.
 * JWT bearer is injected by services/api.js (token from localStorage).
 */

const TABS = [
  { id: 'vendors', label: 'Vendors' },
  { id: 'payments', label: 'Payments' },
  { id: 'fx-rates', label: 'FX Rates' },
  { id: 'marketing', label: 'Marketing' },
];

function ResultBox({ value }) {
  if (!value) return null;
  return (
    <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function Backlog() {
  const [tab, setTab] = useState('vendors');
  const [list, setList] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Vendors form
  const [vName, setVName] = useState('Subcontract Acme Inc');
  const [vCategory, setVCategory] = useState('subcontractor');
  // Payments form
  const [pAmount, setPAmount] = useState('500.00');
  const [pCurrency, setPCurrency] = useState('USD');
  // FX form
  const [base, setBase] = useState('USD');
  const [target, setTarget] = useState('EUR');
  // Marketing form
  const [leadName, setLeadName] = useState('Big Co Lead');
  const [leadStage, setLeadStage] = useState('new');

  const fetchProviders = async (id) => {
    if (id === 'payments' || id === 'fx-rates') {
      try {
        const r = await fetch(`/api/${id}/_/providers`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
        if (r.ok) setProviderStatus(await r.json());
      } catch (_) { /* ignore */ }
    } else if (id === 'marketing') {
      try {
        const r = await fetch(`/api/${id}/_/funnel`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
        if (r.ok) setProviderStatus(await r.json());
      } catch (_) { /* ignore */ }
    } else {
      setProviderStatus(null);
    }
  };

  const refresh = async (id = tab) => {
    setBusy(true);
    setError('');
    try {
      let url = '/' + id;
      if (id === 'payments') url = '/payments/intents';
      if (id === 'marketing') url = '/marketing/leads';
      const data = await api.getAll(id === 'payments' ? 'payments/intents' : id === 'marketing' ? 'marketing/leads' : id);
      setList(data);
      fetchProviders(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { refresh(tab); /* eslint-disable-next-line */ }, [tab]);

  const onCreate = async () => {
    setError('');
    setBusy(true);
    try {
      if (tab === 'vendors') {
        await api.create('vendors', { name: vName, category: vCategory });
      } else if (tab === 'payments') {
        await fetch('/api/payments/intents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify({ amount_cents: Math.round(Number(pAmount) * 100), currency: pCurrency }),
        }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); });
      } else if (tab === 'fx-rates') {
        await fetch('/api/fx-rates/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify({ base, target }),
        }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); });
      } else if (tab === 'marketing') {
        await fetch('/api/marketing/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          body: JSON.stringify({ name: leadName, stage: leadStage }),
        }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); });
      }
      await refresh(tab);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Backlog Tools</h1>
      <p style={{ color: '#64748b', marginBottom: 16 }}>
        Apply pass 5 backlog: vendors, payments (Stripe/Wise — 503 unless creds), FX rates,
        marketing leads pipeline. JWT bearer auto-injected.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: tab === t.id ? '#0f172a' : 'white',
              color: tab === t.id ? 'white' : '#0f172a',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
        {tab === 'vendors' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Name</div>
              <input value={vName} onChange={(e) => setVName(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Category</div>
              <input value={vCategory} onChange={(e) => setVCategory(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <button onClick={onCreate} disabled={busy} style={{ padding: '8px 14px', background: '#2563eb', color: 'white', border: 0, borderRadius: 6 }}>
              Add Vendor
            </button>
          </div>
        )}
        {tab === 'payments' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Amount</div>
              <input value={pAmount} onChange={(e) => setPAmount(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Currency</div>
              <input value={pCurrency} onChange={(e) => setPCurrency(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <button onClick={onCreate} disabled={busy} style={{ padding: '8px 14px', background: '#2563eb', color: 'white', border: 0, borderRadius: 6 }}>
              Create Intent
            </button>
          </div>
        )}
        {tab === 'fx-rates' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Base</div>
              <input value={base} onChange={(e) => setBase(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6, width: 80 }} />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Target</div>
              <input value={target} onChange={(e) => setTarget(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6, width: 80 }} />
            </label>
            <button onClick={onCreate} disabled={busy} style={{ padding: '8px 14px', background: '#2563eb', color: 'white', border: 0, borderRadius: 6 }}>
              Refresh Rate
            </button>
          </div>
        )}
        {tab === 'marketing' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Lead</div>
              <input value={leadName} onChange={(e) => setLeadName(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <label>
              <div style={{ fontSize: 12, color: '#64748b' }}>Stage</div>
              <select value={leadStage} onChange={(e) => setLeadStage(e.target.value)} style={{ padding: 6, border: '1px solid #cbd5e1', borderRadius: 6 }}>
                <option value="new">new</option>
                <option value="qualified">qualified</option>
                <option value="proposal">proposal</option>
                <option value="won">won</option>
                <option value="lost">lost</option>
              </select>
            </label>
            <button onClick={onCreate} disabled={busy} style={{ padding: '8px 14px', background: '#2563eb', color: 'white', border: 0, borderRadius: 6 }}>
              Add Lead
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', color: '#b91c1c', borderRadius: 8, marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      {providerStatus && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Provider / status</div>
          <ResultBox value={providerStatus} />
        </div>
      )}

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>List</div>
      <ResultBox value={list} />
    </div>
  );
}
