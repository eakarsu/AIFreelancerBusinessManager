import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const emptyForm = {
  project_id: '', description: '', hours: '', hourly_rate: '', date: '', billable: true,
};

const fmt = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '$0.00' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function TimeTracking() {
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
      const data = await api.getAll('time-entries', params);
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
      project_id: selectedItem.project_id || '',
      description: selectedItem.description || '',
      hours: selectedItem.hours || '',
      hourly_rate: selectedItem.hourly_rate || '',
      date: selectedItem.date ? selectedItem.date.slice(0, 10) : '',
      billable: selectedItem.billable !== undefined ? selectedItem.billable : true,
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
        project_id: Number(formData.project_id),
        hours: Number(formData.hours),
        hourly_rate: Number(formData.hourly_rate),
      };
      if (isEditing) {
        await api.update('time-entries', selectedItem.id, payload);
      } else {
        await api.create('time-entries', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      await api.delete('time-entries', selectedItem.id);
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
      const data = await api.aiAction('time-entries', 'ai-analyze');
      setAiResult(data);
    } catch (err) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
        <div className="flex gap-3">
          <button onClick={handleAI} className="btn-ai">AI Productivity Analysis</button>
          <button onClick={openNew} className="btn-primary">New Time Entry</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search time entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Productivity Analysis" />

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Date', 'Project', 'Description', 'Hours', 'Rate', 'Billable', 'Amount'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell">{item.date ? item.date.slice(0, 10) : '-'}</td>
                <td className="table-cell">{item.project_name || item.project_id || '-'}</td>
                <td className="table-cell font-medium">{item.description || '-'}</td>
                <td className="table-cell">{item.hours || '-'}</td>
                <td className="table-cell">{fmt(item.hourly_rate)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${item.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.billable ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="table-cell font-medium">{fmt((item.hours || 0) * (item.hourly_rate || 0))}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-500">No time entries found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.description || 'Time Entry'}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Date</span><div className="font-medium">{selectedItem.date ? selectedItem.date.slice(0, 10) : '-'}</div></div>
            <div><span className="text-gray-500">Project</span><div className="font-medium">{selectedItem.project_name || selectedItem.project_id || '-'}</div></div>
            <div><span className="text-gray-500">Hours</span><div className="font-medium">{selectedItem.hours || '-'}</div></div>
            <div><span className="text-gray-500">Hourly Rate</span><div className="font-medium">{fmt(selectedItem.hourly_rate)}</div></div>
            <div><span className="text-gray-500">Billable</span><div><span className={`status-badge ${selectedItem.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{selectedItem.billable ? 'Yes' : 'No'}</span></div></div>
            <div><span className="text-gray-500">Amount</span><div className="font-medium">{fmt((selectedItem.hours || 0) * (selectedItem.hourly_rate || 0))}</div></div>
          </div>
          {selectedItem.description && <div className="text-sm text-gray-600"><span className="text-gray-500">Description:</span> {selectedItem.description}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Time Entry' : 'New Time Entry'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                <input name="project_id" type="number" value={formData.project_id} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input name="description" value={formData.description} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                <input name="hours" type="number" step="0.25" value={formData.hours} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                <input name="hourly_rate" type="number" step="0.01" value={formData.hourly_rate} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input name="date" type="date" value={formData.date} onChange={onChange} required className="input-field" />
              </div>
              <div className="flex items-center gap-2">
                <input name="billable" type="checkbox" checked={formData.billable} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <label className="text-sm font-medium text-gray-700">Billable</label>
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
