import { useState } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

/**
 * Frontend for the 3 new AI endpoints in backend/src/routes/ai.js (ESM):
 *   POST /api/ai/project-profitability — joins projects/time/expenses
 *   POST /api/ai/rate-optimization     — per-skill rate suggestions
 *   POST /api/ai/client-churn          — churn risk + retention actions
 *
 * Mirrors AICenter.jsx style — uses Tailwind classes that match other pages
 * and the existing AIResponseDisplay component.
 */

const TABS = [
  {
    id: 'project-profitability',
    label: 'Project Profitability',
    description: 'Joins projects, time entries, and expenses; AI returns top performers, underperformers, and rate/scope recommendations.',
    gradient: 'from-emerald-500 to-teal-600',
    fields: [
      { name: 'lookback_days', label: 'Lookback (days)', type: 'number', defaultValue: 90 },
      { name: 'min_hours', label: 'Minimum hours per project', type: 'number', defaultValue: 0 },
    ],
  },
  {
    id: 'rate-optimization',
    label: 'Rate Optimization',
    description: 'Per-skill average rate + invoice trends; AI suggests new hourly rates per skill with warnings.',
    gradient: 'from-blue-500 to-indigo-600',
    fields: [
      { name: 'target_revenue_growth_pct', label: 'Target revenue growth (%)', type: 'number', defaultValue: 10 },
      { name: 'market', label: 'Market context', type: 'text', placeholder: 'e.g., US, EU, remote SaaS' },
    ],
  },
  {
    id: 'client-churn',
    label: 'Client Churn',
    description: 'Joins clients with project + invoice + comm recency; AI assigns risk + retention actions.',
    gradient: 'from-purple-500 to-pink-600',
    fields: [
      { name: 'comm_lookback_days', label: 'Comm lookback (days)', type: 'number', defaultValue: 60 },
      { name: 'invoice_lookback_days', label: 'Invoice lookback (days)', type: 'number', defaultValue: 90 },
    ],
  },
  // ===== Apply pass 4 (mechanical backlog) — 5 new tabs =====
  {
    id: 'skill-gap-identifier',
    label: 'Skill Gap Identifier',
    description: 'Compares your time-entry skills to a target role; AI returns gaps + a learning plan.',
    gradient: 'from-amber-500 to-orange-600',
    fields: [
      { name: 'goal_role', label: 'Target role / direction', type: 'text', placeholder: 'e.g., senior full-stack contractor' },
      { name: 'current_skills', label: 'Self-reported skills (optional)', type: 'text', placeholder: 'comma list (optional)' },
    ],
  },
  {
    id: 'cash-flow-simulator',
    label: 'Cash Flow Simulator',
    description: 'Projects weekly inflow/outflow and runway from invoices and expenses.',
    gradient: 'from-cyan-500 to-blue-600',
    fields: [
      { name: 'horizon_weeks', label: 'Horizon (weeks)', type: 'number', defaultValue: 12 },
      { name: 'monthly_fixed_costs', label: 'Monthly fixed costs', type: 'number', defaultValue: 0 },
      { name: 'scenario', label: 'Scenario', type: 'text', placeholder: 'baseline / pessimistic / optimistic' },
    ],
  },
  {
    id: 'contract-risk-scanner',
    label: 'Contract Risk Scanner',
    description: 'Paste contract text or use a saved contract id; AI flags risky clauses (not legal advice).',
    gradient: 'from-rose-500 to-red-600',
    fields: [
      { name: 'contract_id', label: 'Contract ID (optional)', type: 'number' },
      { name: 'contract_text', label: 'Contract text (paste, optional)', type: 'textarea', placeholder: 'Paste contract terms here' },
    ],
  },
  {
    id: 'proposal-generator',
    label: 'Proposal Generator',
    description: 'Generate a structured proposal from a brief.',
    gradient: 'from-indigo-500 to-violet-600',
    fields: [
      { name: 'client_name', label: 'Client name', type: 'text' },
      { name: 'brief', label: 'Project brief', type: 'textarea', placeholder: 'Describe the project, goals, constraints' },
      { name: 'scope_summary', label: 'Scope summary (optional)', type: 'text' },
      { name: 'budget_range', label: 'Budget range', type: 'text', placeholder: 'e.g., $5k-$8k fixed' },
      { name: 'timeline_weeks', label: 'Timeline (weeks)', type: 'number' },
      { name: 'tone', label: 'Tone', type: 'text', placeholder: 'professional / warm / formal' },
    ],
  },
  {
    id: 'peer-benchmarking',
    label: 'Peer Benchmarking',
    description: 'Compare your stats to typical peers (LLM-estimated benchmarks; not a real survey).',
    gradient: 'from-emerald-500 to-green-600',
    fields: [
      { name: 'discipline', label: 'Discipline', type: 'text', placeholder: 'e.g., full-stack JS, brand designer' },
      { name: 'region', label: 'Region', type: 'text', placeholder: 'e.g., US-remote, EU' },
      { name: 'years_experience', label: 'Years experience', type: 'number' },
    ],
  },
];

export default function AIBusinessIntelligence() {
  const [activeTab, setActiveTab] = useState('project-profitability');
  const [formValues, setFormValues] = useState(() => {
    const initial = {};
    TABS.forEach((t) => {
      initial[t.id] = {};
      t.fields.forEach((f) => { initial[t.id][f.name] = f.defaultValue ?? ''; });
    });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const tab = TABS.find((t) => t.id === activeTab);

  const updateField = (tabId, name, value) => {
    setFormValues((prev) => ({ ...prev, [tabId]: { ...prev[tabId], [name]: value } }));
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // coerce numeric fields
      const payload = {};
      tab.fields.forEach((f) => {
        const v = formValues[tab.id][f.name];
        if (f.type === 'number') {
          payload[f.name] = v === '' || v == null ? undefined : Number(v);
        } else if (v !== '' && v != null) {
          payload[f.name] = v;
        }
      });
      const data = await api.aiAction('ai', tab.id, payload);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Business Intelligence</h1>
        <p className="text-gray-500 mt-1">Profitability, rate, and churn analysis powered by the new <code>/api/ai</code> endpoints.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setResult(null); setError(''); }}
            className="text-left"
          >
            <div className={`rounded-xl p-4 bg-gradient-to-br ${t.gradient} text-white transition-all duration-200 ${activeTab === t.id ? 'ring-2 ring-offset-2 ring-indigo-400 scale-[1.02]' : 'opacity-90 hover:opacity-100'}`}>
              <h3 className="font-semibold text-base mb-1">{t.label}</h3>
              <p className="text-white/80 text-xs leading-relaxed">{t.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{tab.label}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tab.fields.map((f) => (
            <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={5}
                  value={formValues[tab.id][f.name] ?? ''}
                  placeholder={f.placeholder || ''}
                  onChange={(e) => updateField(tab.id, f.name, e.target.value)}
                  className="input-field w-full"
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={formValues[tab.id][f.name] ?? ''}
                  placeholder={f.placeholder || ''}
                  onChange={(e) => updateField(tab.id, f.name, e.target.value)}
                  className="input-field w-full"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-ai px-6 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Run Analysis'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {(result || loading) && (
        <AIResponseDisplay data={result} loading={loading} title={tab.label} />
      )}
    </div>
  );
}
