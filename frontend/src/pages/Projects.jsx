import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  paused: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const emptyForm = {
  name: '', description: '', client_id: '', status: 'draft',
  budget: '', start_date: '', end_date: '', deadline: '', priority: 'medium',
};

const fmt = (v) => {
  const n = Number(v);
  return isNaN(n) ? '$0.00' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Projects() {
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
      const data = await api.getAll('projects', params);
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
      name: selectedItem.name || '',
      description: selectedItem.description || '',
      client_id: selectedItem.client_id || '',
      status: selectedItem.status || 'draft',
      budget: selectedItem.budget || '',
      start_date: selectedItem.start_date ? selectedItem.start_date.slice(0, 10) : '',
      end_date: selectedItem.end_date ? selectedItem.end_date.slice(0, 10) : '',
      deadline: selectedItem.deadline ? selectedItem.deadline.slice(0, 10) : '',
      priority: selectedItem.priority || 'medium',
    });
    setIsEditing(true);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData, client_id: Number(formData.client_id) || null, budget: Number(formData.budget) || 0 };
      if (isEditing) {
        await api.update('projects', selectedItem.id, payload);
      } else {
        await api.create('projects', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.delete('projects', selectedItem.id);
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
      const data = await api.aiAnalyze('projects', selectedItem.id, 'ai-analyze');
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={openNew} className="btn-primary">New Project</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Name', 'Client', 'Status', 'Budget', 'Spent', 'Priority', 'Deadline'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell font-medium">{item.name}</td>
                <td className="table-cell">{item.client_name || item.client_id || '-'}</td>
                <td className="table-cell">
                  <span className={`status-badge ${statusColors[item.status] || ''}`}>{item.status}</span>
                </td>
                <td className="table-cell">{fmt(item.budget)}</td>
                <td className="table-cell">{fmt(item.spent)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${priorityColors[item.priority] || ''}`}>{item.priority}</span>
                </td>
                <td className="table-cell">{item.deadline ? new Date(item.deadline).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-500">No projects found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Status</span><div><span className={`status-badge ${statusColors[selectedItem.status] || ''}`}>{selectedItem.status}</span></div></div>
            <div><span className="text-gray-500">Priority</span><div><span className={`status-badge ${priorityColors[selectedItem.priority] || ''}`}>{selectedItem.priority}</span></div></div>
            <div><span className="text-gray-500">Client</span><div className="font-medium">{selectedItem.client_name || selectedItem.client_id || '-'}</div></div>
            <div><span className="text-gray-500">Budget</span><div className="font-medium">{fmt(selectedItem.budget)}</div></div>
            <div><span className="text-gray-500">Spent</span><div className="font-medium">{fmt(selectedItem.spent)}</div></div>
            <div><span className="text-gray-500">Deadline</span><div className="font-medium">{selectedItem.deadline ? new Date(selectedItem.deadline).toLocaleDateString() : '-'}</div></div>
            <div><span className="text-gray-500">Start Date</span><div className="font-medium">{selectedItem.start_date ? new Date(selectedItem.start_date).toLocaleDateString() : '-'}</div></div>
            <div><span className="text-gray-500">End Date</span><div className="font-medium">{selectedItem.end_date ? new Date(selectedItem.end_date).toLocaleDateString() : '-'}</div></div>
          </div>
          {selectedItem.description && <div className="text-sm text-gray-600"><span className="text-gray-500">Description:</span> {selectedItem.description}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAI} className="btn-ai">AI Analyze</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Project Analysis" />
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input name="name" value={formData.name} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={onChange} rows={3} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                <input name="client_id" type="number" value={formData.client_id} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={onChange} className="select-field">
                  {['active', 'draft', 'paused', 'completed', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input name="budget" type="number" step="0.01" value={formData.budget} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select name="priority" value={formData.priority} onChange={onChange} className="select-field">
                  {['low', 'medium', 'high'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input name="deadline" type="date" value={formData.deadline} onChange={onChange} className="input-field" />
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
