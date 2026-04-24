import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  signed: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  expired: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
  sent: 'bg-blue-100 text-blue-800',
};

const emptyForm = {
  client_id: '', project_id: '', title: '', contract_type: 'fixed-price',
  value: '', status: 'draft', start_date: '', end_date: '', key_terms: '',
};

const fmt = (v) => {
  const n = Number(v);
  return isNaN(n) ? '$0.00' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Contracts() {
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
      const data = await api.getAll('contracts', params);
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
      title: selectedItem.title || '',
      contract_type: selectedItem.contract_type || 'fixed-price',
      value: selectedItem.value || '',
      status: selectedItem.status || 'draft',
      start_date: selectedItem.start_date ? selectedItem.start_date.slice(0, 10) : '',
      end_date: selectedItem.end_date ? selectedItem.end_date.slice(0, 10) : '',
      key_terms: selectedItem.key_terms || '',
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
        client_id: Number(formData.client_id) || null,
        project_id: Number(formData.project_id) || null,
        value: Number(formData.value) || 0,
      };
      if (isEditing) {
        await api.update('contracts', selectedItem.id, payload);
      } else {
        await api.create('contracts', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this contract?')) return;
    try {
      await api.delete('contracts', selectedItem.id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAnalyze('contracts', selectedItem.id, 'ai-review');
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
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <button onClick={openNew} className="btn-primary">New Contract</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search contracts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Title', 'Client', 'Type', 'Value', 'Status', 'End Date'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell font-medium">{item.title}</td>
                <td className="table-cell">{item.client_name || item.client_id || '-'}</td>
                <td className="table-cell">{item.contract_type || '-'}</td>
                <td className="table-cell">{fmt(item.value)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${statusColors[item.status] || ''}`}>{item.status}</span>
                </td>
                <td className="table-cell">{item.end_date ? new Date(item.end_date).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-gray-500">No contracts found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.title}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Status</span><div><span className={`status-badge ${statusColors[selectedItem.status] || ''}`}>{selectedItem.status}</span></div></div>
            <div><span className="text-gray-500">Type</span><div className="font-medium">{selectedItem.contract_type || '-'}</div></div>
            <div><span className="text-gray-500">Client</span><div className="font-medium">{selectedItem.client_name || selectedItem.client_id || '-'}</div></div>
            <div><span className="text-gray-500">Project</span><div className="font-medium">{selectedItem.project_name || selectedItem.project_id || '-'}</div></div>
            <div><span className="text-gray-500">Value</span><div className="font-medium">{fmt(selectedItem.value)}</div></div>
            <div><span className="text-gray-500">Start Date</span><div className="font-medium">{selectedItem.start_date ? new Date(selectedItem.start_date).toLocaleDateString() : '-'}</div></div>
            <div><span className="text-gray-500">End Date</span><div className="font-medium">{selectedItem.end_date ? new Date(selectedItem.end_date).toLocaleDateString() : '-'}</div></div>
          </div>
          {selectedItem.key_terms && <div className="text-sm text-gray-600"><span className="text-gray-500">Key Terms:</span> {selectedItem.key_terms}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAI} className="btn-ai">AI Review Contract</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Contract Review" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Contract' : 'New Contract'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={formData.title} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input name="client_id" type="number" value={formData.client_id} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                <input name="project_id" type="number" value={formData.project_id} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                <select name="contract_type" value={formData.contract_type} onChange={onChange} className="select-field">
                  {['fixed-price', 'hourly', 'retainer'].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input name="value" type="number" step="0.01" value={formData.value} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={onChange} className="select-field">
                  {['draft', 'sent', 'signed', 'active', 'expired', 'terminated'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input name="start_date" type="date" value={formData.start_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input name="end_date" type="date" value={formData.end_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Terms</label>
                <textarea name="key_terms" value={formData.key_terms} onChange={onChange} rows={3} className="input-field" />
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
