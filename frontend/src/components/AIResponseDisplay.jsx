import { useState } from 'react';

function ScoreBar({ label, value, color = 'indigo' }) {
  const pct = Math.round((typeof value === 'number' ? value : 0) * 100);
  const colors = {
    indigo: 'bg-indigo-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    yellow: 'bg-amber-500',
    purple: 'bg-purple-500',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-semibold text-gray-800">{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colors[color] || colors.indigo}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getScoreColor(value) {
  if (value >= 0.7) return 'text-emerald-600 bg-emerald-50';
  if (value >= 0.4) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

function getLevelColor(level) {
  const l = (level || '').toLowerCase();
  if (['excellent', 'high', 'low', 'healthy', 'a', 'positive', 'growing'].includes(l)) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (['good', 'medium', 'b', 'on track', 'stable', 'neutral'].includes(l)) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function RenderValue({ value, depth = 0 }) {
  if (value === null || value === undefined) return <span className="text-gray-400">-</span>;
  if (typeof value === 'boolean') return <span className={value ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1 && String(value).includes('.')) {
      return <span className={`font-semibold ${getScoreColor(value).split(' ')[0]}`}>{Math.round(value * 100)}%</span>;
    }
    return <span className="font-semibold text-gray-800">{value.toLocaleString()}</span>;
  }
  if (typeof value === 'string') {
    const isLevel = value.length < 30;
    if (isLevel && ['excellent', 'good', 'fair', 'poor', 'high', 'medium', 'low', 'critical', 'healthy', 'warning'].includes(value.toLowerCase())) {
      return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getLevelColor(value)}`}>{value}</span>;
    }
    return <span className="text-gray-700">{value}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1.5 mt-1">
        {value.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
            <span className="text-gray-700">{typeof item === 'object' ? <RenderValue value={item} depth={depth + 1} /> : item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className={`space-y-3 ${depth > 0 ? 'pl-4 border-l-2 border-gray-200' : ''}`}>
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {k.replace(/_/g, ' ')}
            </span>
            <div className="mt-0.5"><RenderValue value={v} depth={depth + 1} /></div>
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

export default function AIResponseDisplay({ data, loading, title }) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 ai-gradient rounded-lg flex items-center justify-center animate-pulse-slow">
            <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-purple-900">AI is analyzing...</p>
            <p className="text-sm text-purple-600">This may take a few seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Extract key scores for the header
  const scores = {};
  const mainText = {};
  const lists = {};
  const rest = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'number' && value >= 0 && value <= 1 && String(value).includes('.')) {
      scores[key] = value;
    } else if (Array.isArray(value)) {
      lists[key] = value;
    } else if (typeof value === 'string' && value.length > 50) {
      mainText[key] = value;
    } else {
      rest[key] = value;
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 overflow-hidden mt-4 ai-glow">
      {/* Header */}
      <div className="ai-gradient px-5 py-3 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-white font-semibold text-sm">{title || 'AI Analysis Results'}</span>
        </div>
        <svg className={`w-5 h-5 text-white transition-transform ${expanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="bg-gradient-to-br from-purple-50/50 to-white p-5 space-y-5">
          {/* Scores */}
          {Object.keys(scores).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(scores).map(([key, value]) => (
                <div key={key} className={`rounded-lg p-3 text-center ${getScoreColor(value)}`}>
                  <p className="text-2xl font-bold">{Math.round(value * 100)}%</p>
                  <p className="text-xs font-medium capitalize mt-0.5">{key.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          )}

          {/* Main text sections */}
          {Object.entries(mainText).map(([key, value]) => (
            <div key={key} className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{key.replace(/_/g, ' ')}</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{value}</p>
            </div>
          ))}

          {/* Other values */}
          {Object.keys(rest).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(rest).map(([key, value]) => (
                <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                  <div className="text-sm"><RenderValue value={value} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Lists */}
          {Object.entries(lists).map(([key, items]) => (
            <div key={key} className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{key.replace(/_/g, ' ')}</h4>
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                    <span className="text-gray-700">{typeof item === 'object' ? <RenderValue value={item} /> : item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
