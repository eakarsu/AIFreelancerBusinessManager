import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const statusColors = {
  done: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  todo: 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-800',
};

const statusOptions = ['todo', 'in_progress', 'review', 'done'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];

const emptyForm = {
  project_id: '', title: '', description: '', status: 'todo', priority: 'medium', due_date: '', estimated_hours: '',
};

const labelMap = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export default function Tasks() {
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
      const data = await api.getAll('tasks', params);
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
      title: selectedItem.title || '',
      description: selectedItem.description || '',
      status: selectedItem.status || 'todo',
      priority: selectedItem.priority || 'medium',
      due_date: selectedItem.due_date ? selectedItem.due_date.slice(0, 10) : '',
      estimated_hours: selectedItem.estimated_hours || '',
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
        estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : null,
      };
      if (isEditing) {
        await api.update('tasks', selectedItem.id, payload);
      } else {
        await api.create('tasks', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete('tasks', selectedItem.id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAIPrioritize = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAction('tasks', 'ai-prioritize');
      setAiResult(data);
    } catch (err) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIEstimate = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAnalyze('tasks', selectedItem.id, 'ai-estimate');
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
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <div className="flex gap-3">
          <button onClick={handleAIPrioritize} className="btn-ai">AI Prioritize All</button>
          <button onClick={openNew} className="btn-primary">New Task</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {!selectedItem && <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Task Prioritization" />}

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Title', 'Project', 'Status', 'Priority', 'Due Date', 'Est Hours'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell font-medium">{item.title || '-'}</td>
                <td className="table-cell">{item.project_name || item.project_id || '-'}</td>
                <td className="table-cell">
                  <span className={`status-badge ${statusColors[item.status] || ''}`}>{labelMap[item.status] || item.status}</span>
                </td>
                <td className="table-cell">
                  <span className={`status-badge ${priorityColors[item.priority] || ''}`}>{item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : '-'}</span>
                </td>
                <td className="table-cell">{item.due_date ? item.due_date.slice(0, 10) : '-'}</td>
                <td className="table-cell">{item.estimated_hours || '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-gray-500">No tasks found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.title || 'Task'}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Project</span><div className="font-medium">{selectedItem.project_name || selectedItem.project_id || '-'}</div></div>
            <div><span className="text-gray-500">Status</span><div><span className={`status-badge ${statusColors[selectedItem.status] || ''}`}>{labelMap[selectedItem.status] || selectedItem.status}</span></div></div>
            <div><span className="text-gray-500">Priority</span><div><span className={`status-badge ${priorityColors[selectedItem.priority] || ''}`}>{selectedItem.priority ? selectedItem.priority.charAt(0).toUpperCase() + selectedItem.priority.slice(1) : '-'}</span></div></div>
            <div><span className="text-gray-500">Due Date</span><div className="font-medium">{selectedItem.due_date ? selectedItem.due_date.slice(0, 10) : '-'}</div></div>
            <div><span className="text-gray-500">Estimated Hours</span><div className="font-medium">{selectedItem.estimated_hours || '-'}</div></div>
          </div>
          {selectedItem.description && <div className="text-sm text-gray-600"><span className="text-gray-500">Description:</span> {selectedItem.description}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAIEstimate} className="btn-ai">AI Estimate</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Task Estimation" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Task' : 'New Task'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                <input name="project_id" type="number" value={formData.project_id} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={formData.title} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={onChange} rows={3} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={onChange} className="select-field">
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{labelMap[s] || s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select name="priority" value={formData.priority} onChange={onChange} className="select-field">
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input name="due_date" type="date" value={formData.due_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input name="estimated_hours" type="number" step="0.5" value={formData.estimated_hours} onChange={onChange} className="input-field" />
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
