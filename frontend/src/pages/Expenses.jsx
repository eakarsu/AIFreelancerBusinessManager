import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const categories = ['software', 'equipment', 'office', 'hosting', 'education', 'travel', 'fees', 'insurance', 'utilities', 'marketing', 'other'];

const emptyForm = {
  project_id: '', description: '', amount: '', category: 'software', date: '', tax_deductible: false,
};

const fmt = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '$0.00' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Expenses() {
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
      const data = await api.getAll('expenses', params);
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
      amount: selectedItem.amount || '',
      category: selectedItem.category || 'software',
      date: selectedItem.date ? selectedItem.date.slice(0, 10) : '',
      tax_deductible: selectedItem.tax_deductible || false,
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
        project_id: formData.project_id ? Number(formData.project_id) : null,
        amount: Number(formData.amount),
      };
      if (isEditing) {
        await api.update('expenses', selectedItem.id, payload);
      } else {
        await api.create('expenses', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete('expenses', selectedItem.id);
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
      const data = await api.aiAnalyze('expenses', selectedItem.id, 'ai-categorize');
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
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button onClick={openNew} className="btn-primary">New Expense</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Date', 'Description', 'Category', 'Amount', 'Tax Deductible', 'Project'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell">{item.date ? item.date.slice(0, 10) : '-'}</td>
                <td className="table-cell font-medium">{item.description || '-'}</td>
                <td className="table-cell">
                  <span className="status-badge bg-blue-100 text-blue-800">{item.category || '-'}</span>
                </td>
                <td className="table-cell font-medium">{fmt(item.amount)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${item.tax_deductible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.tax_deductible ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="table-cell">{item.project_name || item.project_id || '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="table-cell text-center text-gray-500">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.description || 'Expense'}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Date</span><div className="font-medium">{selectedItem.date ? selectedItem.date.slice(0, 10) : '-'}</div></div>
            <div><span className="text-gray-500">Category</span><div><span className="status-badge bg-blue-100 text-blue-800">{selectedItem.category || '-'}</span></div></div>
            <div><span className="text-gray-500">Amount</span><div className="font-medium">{fmt(selectedItem.amount)}</div></div>
            <div><span className="text-gray-500">Tax Deductible</span><div><span className={`status-badge ${selectedItem.tax_deductible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{selectedItem.tax_deductible ? 'Yes' : 'No'}</span></div></div>
            <div><span className="text-gray-500">Project</span><div className="font-medium">{selectedItem.project_name || selectedItem.project_id || '-'}</div></div>
          </div>
          {selectedItem.description && <div className="text-sm text-gray-600"><span className="text-gray-500">Description:</span> {selectedItem.description}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAI} className="btn-ai">AI Categorize</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Expense Categorization" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Expense' : 'New Expense'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                <input name="project_id" type="number" value={formData.project_id} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input name="description" value={formData.description} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input name="amount" type="number" step="0.01" value={formData.amount} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={formData.category} onChange={onChange} className="select-field">
                  {categories.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input name="date" type="date" value={formData.date} onChange={onChange} required className="input-field" />
              </div>
              <div className="flex items-center gap-2">
                <input name="tax_deductible" type="checkbox" checked={formData.tax_deductible} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <label className="text-sm font-medium text-gray-700">Tax Deductible</label>
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
