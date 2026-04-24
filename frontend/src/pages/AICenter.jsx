import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const quickActions = [
  {
    title: 'Business Health Check',
    description: 'Get a comprehensive analysis of your business health across all metrics.',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-600',
    action: 'health',
  },
  {
    title: 'Revenue Forecast',
    description: 'AI-powered revenue projections based on your historical data.',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    gradient: 'from-blue-500 to-indigo-600',
    action: 'forecast',
  },
  {
    title: 'Task Prioritization',
    description: 'Let AI prioritize your tasks based on deadlines, importance, and dependencies.',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    gradient: 'from-purple-500 to-violet-600',
    action: 'prioritize',
  },
  {
    title: 'Productivity Analysis',
    description: 'Analyze your time tracking data to find productivity patterns and improvements.',
    icon: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'from-orange-500 to-red-600',
    action: 'productivity',
  },
];

export default function AICenter() {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLogs, setAiLogs] = useState([]);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchStatus();
    fetchLogs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchStatus = async () => {
    try {
      const data = await api.aiStatus();
      setAiStatus(data);
    } catch (err) {
      setAiStatus({ configured: false, error: err.message });
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await api.aiLogs();
      setAiLogs(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      // Logs are optional, don't block the page
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);
    try {
      const data = await api.aiChat(message);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response || data.message || JSON.stringify(data), data }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}`, error: true }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    setActionLoading(true);
    setActionResult(null);
    setActiveAction(action);
    try {
      let data;
      switch (action) {
        case 'health':
          data = await api.aiBusinessHealth();
          break;
        case 'forecast':
          data = await api.aiAction('revenue-reports', 'ai-forecast');
          break;
        case 'prioritize':
          data = await api.aiAction('tasks', 'ai-prioritize');
          break;
        case 'productivity':
          data = await api.aiAction('time-entries', 'ai-analyze');
          break;
        default:
          break;
      }
      setActionResult(data);
    } catch (err) {
      setActionResult({ error: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const actionTitles = {
    health: 'Business Health Check',
    forecast: 'Revenue Forecast',
    prioritize: 'Task Prioritization',
    productivity: 'Productivity Analysis',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Center</h1>
        <p className="text-gray-500 mt-1">Your AI-powered business intelligence hub</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* AI Status */}
      {aiStatus && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${aiStatus.configured !== false ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className={`w-3 h-3 rounded-full ${aiStatus.configured !== false ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
          <div>
            <span className={`font-medium text-sm ${aiStatus.configured !== false ? 'text-green-800' : 'text-amber-800'}`}>
              {aiStatus.configured !== false ? 'AI Connected' : 'AI Not Configured'}
            </span>
            {aiStatus.provider && <span className="text-xs text-gray-500 ml-2">via {aiStatus.provider}</span>}
            {aiStatus.model && <span className="text-xs text-gray-500 ml-1">({aiStatus.model})</span>}
          </div>
        </div>
      )}

      {/* AI Chat Interface */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI Chat
          </h2>
        </div>
        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="font-medium">Ask me anything about your business</p>
              <p className="text-sm mt-1">I can analyze your data, provide insights, and offer recommendations.</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : msg.error
                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleChat} className="border-t border-gray-200 p-3 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask AI about your business..."
            className="input-field flex-1"
            disabled={chatLoading}
          />
          <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-ai px-6 disabled:opacity-50">
            Send
          </button>
        </form>
      </div>

      {/* Quick AI Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick AI Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((qa) => (
            <button
              key={qa.action}
              onClick={() => handleQuickAction(qa.action)}
              disabled={actionLoading}
              className="text-left group"
            >
              <div className={`rounded-xl p-5 bg-gradient-to-br ${qa.gradient} text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {qa.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-1">{qa.title}</h3>
                <p className="text-white/80 text-xs leading-relaxed">{qa.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Results */}
      {(actionResult || actionLoading) && (
        <AIResponseDisplay data={actionResult} loading={actionLoading} title={actionTitles[activeAction] || 'AI Analysis'} />
      )}

      {/* Recent AI Activity Log */}
      {aiLogs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-5 py-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Recent AI Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {aiLogs.slice(0, 10).map((log, i) => (
              <div key={log.id || i} className="px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="font-medium text-gray-800">{log.action || log.type || 'AI Action'}</span>
                  {log.resource && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{log.resource}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {log.status && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      log.status === 'success' ? 'bg-green-100 text-green-700' :
                      log.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{log.status}</span>
                  )}
                  <span className="text-xs text-gray-400">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
