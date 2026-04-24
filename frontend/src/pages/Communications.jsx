import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const typeColors = {
  email: 'bg-blue-100 text-blue-800',
  call: 'bg-green-100 text-green-800',
  meeting: 'bg-purple-100 text-purple-800',
  chat: 'bg-cyan-100 text-cyan-800',
};

const sentimentColors = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-800',
  negative: 'bg-red-100 text-red-800',
};

const directionOptions = ['inbound', 'outbound'];
const typeOptions = ['email', 'call', 'meeting', 'chat'];

const emptyForm = {
  client_id: '', project_id: '', subject: '', body: '', type: 'email', direction: 'inbound', date: '',
};

export default function Communications() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const params = search ? `search=${encodeURIComponent(search)}` : '';
      const data = await api.getAll('communications', params);
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const openNew = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setShowForm(true);
    setError('');
  };

  const openEdit = () => {
    setFormData({
      client_id: selectedItem.client_id || '',
      project_id: selectedItem.project_id || '',
      subject: selectedItem.subject || '',
      body: selectedItem.body || '',
      type: selectedItem.type || 'email',
      direction: selectedItem.direction || 'inbound',
      date: selectedItem.date ? selectedItem.date.slice(0, 10) : '',
    });
    setIsEditing(true);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        client_id: Number(formData.client_id),
        project_id: formData.project_id ? Number(formData.project_id) : null,
      };
      if (isEditing) {
        await api.update('communications', selectedItem.id, payload);
      } else {
        await api.create('communications', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this communication?')) return;
    try {
      await api.delete('communications', selectedItem.id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAIAnalyze = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAnalyze('communications', selectedItem.id, 'ai-analyze');
      setAiResult(data);
    } catch (err) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <button onClick={openNew} className="btn-primary">New Communication</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search communications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Date', 'Subject', 'Client', 'Type', 'Direction', 'Sentiment'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell">{item.date ? item.date.slice(0, 10) : '-'}</td>
                <td className="table-cell font-medium">{item.subject || '-'}</td>
                <td className="table-cell">{item.client_name || item.client_id || '-'}</td>
                <td className="table-cell">
                  <span className={`status-badge ${typeColors[item.type] || ''}`}>{item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '-'}</span>
                </td>
                <td className="table-cell">{item.direction ? item.direction.charAt(0).toUpperCase() + item.direction.slice(1) : '-'}</td>
                <td className="table-cell">
                  {item.sentiment ? (
                    <span className={`status-badge ${sentimentColors[item.sentiment] || ''}`}>{item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}</span>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-gray-500">No communications found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.subject || 'Communication'}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Client</span><div className="font-medium">{selectedItem.client_name || selectedItem.client_id || '-'}</div></div>
            <div><span className="text-gray-500">Project</span><div className="font-medium">{selectedItem.project_name || selectedItem.project_id || '-'}</div></div>
            <div><span className="text-gray-500">Type</span><div><span className={`status-badge ${typeColors[selectedItem.type] || ''}`}>{selectedItem.type ? selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1) : '-'}</span></div></div>
            <div><span className="text-gray-500">Direction</span><div className="font-medium">{selectedItem.direction ? selectedItem.direction.charAt(0).toUpperCase() + selectedItem.direction.slice(1) : '-'}</div></div>
            <div><span className="text-gray-500">Date</span><div className="font-medium">{selectedItem.date ? selectedItem.date.slice(0, 10) : '-'}</div></div>
            <div><span className="text-gray-500">Sentiment</span><div>{selectedItem.sentiment ? <span className={`status-badge ${sentimentColors[selectedItem.sentiment] || ''}`}>{selectedItem.sentiment.charAt(0).toUpperCase() + selectedItem.sentiment.slice(1)}</span> : '-'}</div></div>
          </div>
          {selectedItem.body && <div className="text-sm text-gray-600"><span className="text-gray-500">Body:</span> {selectedItem.body}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAIAnalyze} className="btn-ai">AI Analyze</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Communication Analysis" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Communication' : 'New Communication'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input name="client_id" type="number" value={formData.client_id} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                <input name="project_id" type="number" value={formData.project_id} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input name="subject" value={formData.subject} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea name="body" value={formData.body} onChange={onChange} rows={4} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select name="type" value={formData.type} onChange={onChange} className="select-field">
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select name="direction" value={formData.direction} onChange={onChange} className="select-field">
                  {directionOptions.map((d) => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input name="date" type="date" value={formData.date} onChange={onChange} className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">{isEditing ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
