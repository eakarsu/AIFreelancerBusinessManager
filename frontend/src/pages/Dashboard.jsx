import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const features = [
  { path: '/projects', label: 'Projects', desc: 'AI scope analysis & risk prediction', color: 'from-blue-500 to-blue-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', stat: 'projects' },
  { path: '/clients', label: 'Clients', desc: 'AI health scoring & churn prediction', color: 'from-emerald-500 to-emerald-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', stat: 'clients' },
  { path: '/invoices', label: 'Invoices', desc: 'AI payment prediction & auto-generation', color: 'from-amber-500 to-amber-600', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', stat: 'invoices' },
  { path: '/contracts', label: 'Contracts', desc: 'AI clause analysis & risk flagging', color: 'from-rose-500 to-rose-600', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', stat: null },
  { path: '/time-tracking', label: 'Time Tracking', desc: 'AI productivity analysis & insights', color: 'from-cyan-500 to-cyan-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', stat: null },
  { path: '/expenses', label: 'Expenses', desc: 'AI categorization & tax deduction finder', color: 'from-orange-500 to-orange-600', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', stat: 'expenses' },
  { path: '/proposals', label: 'Proposals', desc: 'AI proposal writer & win-rate predictor', color: 'from-violet-500 to-violet-600', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', stat: null },
  { path: '/tasks', label: 'Tasks', desc: 'AI priority ranking & effort estimation', color: 'from-teal-500 to-teal-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', stat: 'tasks' },
  { path: '/communications', label: 'Communications', desc: 'AI sentiment analysis & reply drafting', color: 'from-pink-500 to-pink-600', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', stat: null },
  { path: '/revenue-reports', label: 'Revenue & Reports', desc: 'AI financial forecasting & trends', color: 'from-indigo-500 to-indigo-600', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', stat: null },
  { path: '/goals', label: 'Goals & Milestones', desc: 'AI goal tracking & achievement prediction', color: 'from-yellow-500 to-yellow-600', icon: 'M13 10V3L4 14h7v7l9-11h-7z', stat: 'goals' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    api.aiDashboard().then(setStats).catch(() => {});
  }, []);

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const data = await api.aiBusinessHealth();
      setHealthData(data);
    } catch (err) {
      setHealthData({ error: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  const getStat = (key) => {
    if (!stats || !stats[key]) return null;
    const s = stats[key];
    if (key === 'projects') return `${s.active} active / ${s.total} total`;
    if (key === 'clients') return `${s.active} active / ${s.total} total`;
    if (key === 'invoices') return `$${Number(s.total_amount).toLocaleString()} total`;
    if (key === 'tasks') return `${s.in_progress} in progress / ${s.total} total`;
    if (key === 'expenses') return `$${Number(s.total).toLocaleString()} total`;
    if (key === 'goals') return `${s.active} active / ${s.total} total`;
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Your AI-powered freelance business overview</p>
        </div>
        <button onClick={runHealthCheck} disabled={healthLoading} className="btn-ai flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Business Health Check
        </button>
      </div>

      <AIResponseDisplay data={healthData} loading={healthLoading} title="AI Business Health Analysis" />

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {features.map((f) => (
          <button key={f.path} onClick={() => navigate(f.path)}
            className="card hover:shadow-lg transition-all duration-200 text-left group cursor-pointer border-transparent hover:border-indigo-200">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{f.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                {f.stat && getStat(f.stat) && (
                  <p className="text-sm font-medium text-indigo-600 mt-2">{getStat(f.stat)}</p>
                )}
              </div>
            </div>
          </button>
        ))}

        {/* AI Center Card */}
        <button onClick={() => navigate('/ai-center')}
          className="card hover:shadow-lg transition-all duration-200 text-left group cursor-pointer border-purple-200 hover:border-purple-400 ai-glow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl ai-gradient flex items-center justify-center flex-shrink-0 shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-purple-900 group-hover:text-purple-700 transition-colors">AI Center</h3>
              <p className="text-xs text-purple-600 mt-0.5">All AI features in one place + AI Chat Assistant</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
