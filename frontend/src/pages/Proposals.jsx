import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const statusColors = {
  accepted: 'bg-green-100 text-green-800',
  sent: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
};

const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];

const emptyForm = {
  client_id: '', title: '', description: '', proposed_amount: '', status: 'draft', sent_date: '',
};

const fmt = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '$0.00' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Proposals() {
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
      const data = await api.getAll('proposals', params);
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
      title: selectedItem.title || '',
      description: selectedItem.description || '',
      proposed_amount: selectedItem.proposed_amount || '',
      status: selectedItem.status || 'draft',
      sent_date: selectedItem.sent_date ? selectedItem.sent_date.slice(0, 10) : '',
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
        proposed_amount: Number(formData.proposed_amount),
      };
      if (isEditing) {
        await api.update('proposals', selectedItem.id, payload);
      } else {
        await api.create('proposals', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this proposal?')) return;
    try {
      await api.delete('proposals', selectedItem.id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAI = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAnalyze('proposals', selectedItem.id, 'ai-improve');
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
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <button onClick={openNew} className="btn-primary">New Proposal</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search proposals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Title', 'Client', 'Amount', 'Status', 'Sent Date', 'Win Prob'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell font-medium">{item.title || '-'}</td>
                <td className="table-cell">{item.client_name || item.client_id || '-'}</td>
                <td className="table-cell font-medium">{fmt(item.proposed_amount)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${statusColors[item.status] || ''}`}>{item.status}</span>
                </td>
                <td className="table-cell">{item.sent_date ? item.sent_date.slice(0, 10) : '-'}</td>
                <td className="table-cell">{item.win_probability != null ? `${Math.round(item.win_probability * 100)}%` : '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-gray-500">No proposals found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.title || 'Proposal'}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Client</span><div className="font-medium">{selectedItem.client_name || selectedItem.client_id || '-'}</div></div>
            <div><span className="text-gray-500">Amount</span><div className="font-medium">{fmt(selectedItem.proposed_amount)}</div></div>
            <div><span className="text-gray-500">Status</span><div><span className={`status-badge ${statusColors[selectedItem.status] || ''}`}>{selectedItem.status}</span></div></div>
            <div><span className="text-gray-500">Sent Date</span><div className="font-medium">{selectedItem.sent_date ? selectedItem.sent_date.slice(0, 10) : '-'}</div></div>
            <div><span className="text-gray-500">Win Probability</span><div className="font-medium">{selectedItem.win_probability != null ? `${Math.round(selectedItem.win_probability * 100)}%` : '-'}</div></div>
          </div>
          {selectedItem.description && <div className="text-sm text-gray-600"><span className="text-gray-500">Description:</span> {selectedItem.description}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAI} className="btn-ai">AI Improve</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Proposal Improvement" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Proposal' : 'New Proposal'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input name="client_id" type="number" value={formData.client_id} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={formData.title} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={onChange} rows={4} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Amount</label>
                <input name="proposed_amount" type="number" step="0.01" value={formData.proposed_amount} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={onChange} className="select-field">
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sent Date</label>
                <input name="sent_date" type="date" value={formData.sent_date} onChange={onChange} className="input-field" />
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
