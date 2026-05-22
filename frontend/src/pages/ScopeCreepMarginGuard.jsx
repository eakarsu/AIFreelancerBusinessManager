import { useEffect, useState } from 'react';

export default function ScopeCreepMarginGuard() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ contract_hours: 80, logged_hours: 67, pending_change_requests: 5, unbilled_hours: 11, quoted_margin_pct: 32 });

  useEffect(() => {
    fetch('/api/scope-creep-margin-guard').then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  async function runAssessment(event) {
    event.preventDefault();
    const res = await fetch('/api/scope-creep-margin-guard/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setData(await res.json());
  }

  return (
    <div className="page">
      <h1>Scope Creep Margin Guard</h1>
      <form onSubmit={runAssessment} style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        {Object.keys(form).map((key) => (
          <label key={key}>
            {key.replaceAll('_', ' ')}
            <input type="number" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
          </label>
        ))}
        <button type="submit">Assess margin risk</button>
      </form>
      {data && (
        <section style={{ marginTop: 24 }}>
          <h2>{data.status}</h2>
          <p>Scope creep score: {data.creep_score}. Utilization: {data.utilization}%.</p>
          <ul>{data.guardrails.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
