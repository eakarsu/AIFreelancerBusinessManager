import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  abandoned: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

const categoryColors = {
  revenue: 'bg-emerald-100 text-emerald-800',
  clients: 'bg-blue-100 text-blue-800',
  skills: 'bg-purple-100 text-purple-800',
  projects: 'bg-orange-100 text-orange-800',
  savings: 'bg-cyan-100 text-cyan-800',
};

const statusOptions = ['active', 'completed', 'abandoned', 'paused'];
const categoryOptions = ['revenue', 'clients', 'skills', 'projects', 'savings'];
const unitOptions = ['dollars', 'count', 'hours', 'percent', 'score'];

const emptyForm = {
  title: '', description: '', category: 'revenue', target_value: '', current_value: '', unit: 'dollars', start_date: '', target_date: '', status: 'active',
};

export default function Goals() {
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
      const data = await api.getAll('goals', params);
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
      title: selectedItem.title || '',
      description: selectedItem.description || '',
      category: selectedItem.category || 'revenue',
      target_value: selectedItem.target_value || '',
      current_value: selectedItem.current_value || '',
      unit: selectedItem.unit || 'dollars',
      start_date: selectedItem.start_date ? selectedItem.start_date.slice(0, 10) : '',
      target_date: selectedItem.target_date ? selectedItem.target_date.slice(0, 10) : '',
      status: selectedItem.status || 'active',
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
        target_value: formData.target_value ? Number(formData.target_value) : 0,
        current_value: formData.current_value ? Number(formData.current_value) : 0,
      };
      if (isEditing) {
        await api.update('goals', selectedItem.id, payload);
      } else {
        await api.create('goals', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete('goals', selectedItem.id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAIPredict = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAnalyze('goals', selectedItem.id, 'ai-predict');
      setAiResult(data);
    } catch (err) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const getProgress = (item) => {
    if (!item.target_value || item.target_value === 0) return 0;
    return Math.min(100, Math.round((item.current_value || 0) / item.target_value * 100));
  };

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
        <button onClick={openNew} className="btn-primary">New Goal</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search goals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Title', 'Category', 'Progress', 'Target', 'Unit', 'Target Date', 'Status'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const progress = getProgress(item);
              return (
                <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                  <td className="table-cell font-medium">{item.title || '-'}</td>
                  <td className="table-cell">
                    <span className={`status-badge ${categoryColors[item.category] || ''}`}>{item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : '-'}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{progress}%</span>
                    </div>
                  </td>
                  <td className="table-cell">{item.target_value ?? '-'}</td>
                  <td className="table-cell">{item.unit || '-'}</td>
                  <td className="table-cell">{item.target_date ? item.target_date.slice(0, 10) : '-'}</td>
                  <td className="table-cell">
                    <span className={`status-badge ${statusColors[item.status] || ''}`}>{item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '-'}</span>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-500">No goals found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.title || 'Goal'}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Category</span><div><span className={`status-badge ${categoryColors[selectedItem.category] || ''}`}>{selectedItem.category ? selectedItem.category.charAt(0).toUpperCase() + selectedItem.category.slice(1) : '-'}</span></div></div>
            <div><span className="text-gray-500">Status</span><div><span className={`status-badge ${statusColors[selectedItem.status] || ''}`}>{selectedItem.status ? selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1) : '-'}</span></div></div>
            <div><span className="text-gray-500">Current Value</span><div className="font-medium">{selectedItem.current_value ?? '-'}</div></div>
            <div><span className="text-gray-500">Target Value</span><div className="font-medium">{selectedItem.target_value ?? '-'}</div></div>
            <div><span className="text-gray-500">Unit</span><div className="font-medium">{selectedItem.unit || '-'}</div></div>
            <div><span className="text-gray-500">Start Date</span><div className="font-medium">{selectedItem.start_date ? selectedItem.start_date.slice(0, 10) : '-'}</div></div>
            <div><span className="text-gray-500">Target Date</span><div className="font-medium">{selectedItem.target_date ? selectedItem.target_date.slice(0, 10) : '-'}</div></div>
          </div>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 font-medium">Progress</span>
              <span className="font-semibold text-gray-800">{getProgress(selectedItem)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgress(selectedItem) >= 100 ? 'bg-green-500' : getProgress(selectedItem) >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                style={{ width: `${getProgress(selectedItem)}%` }}
              />
            </div>
          </div>
          {selectedItem.description && <div className="text-sm text-gray-600"><span className="text-gray-500">Description:</span> {selectedItem.description}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAIPredict} className="btn-ai">AI Predict</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Goal Prediction" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={formData.title} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={onChange} rows={3} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={formData.category} onChange={onChange} className="select-field">
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input name="target_value" type="number" step="any" value={formData.target_value} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                <input name="current_value" type="number" step="any" value={formData.current_value} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select name="unit" value={formData.unit} onChange={onChange} className="select-field">
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input name="start_date" type="date" value={formData.start_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                <input name="target_date" type="date" value={formData.target_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={onChange} className="select-field">
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
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
