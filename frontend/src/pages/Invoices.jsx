import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const statusColors = {
  paid: 'bg-green-100 text-green-800',
  sent: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};

const emptyForm = {
  client_id: '', project_id: '', invoice_number: '', amount: '', tax: '',
  status: 'draft', due_date: '', paid_date: '', line_items: '',
};

const fmt = (v) => {
  const n = Number(v);
  return isNaN(n) ? '$0.00' : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function Invoices() {
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
      const data = await api.getAll('invoices', params);
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
      invoice_number: selectedItem.invoice_number || '',
      amount: selectedItem.amount || '',
      tax: selectedItem.tax || '',
      status: selectedItem.status || 'draft',
      due_date: selectedItem.due_date ? selectedItem.due_date.slice(0, 10) : '',
      paid_date: selectedItem.paid_date ? selectedItem.paid_date.slice(0, 10) : '',
      line_items: selectedItem.line_items ? (typeof selectedItem.line_items === 'string' ? selectedItem.line_items : JSON.stringify(selectedItem.line_items, null, 2)) : '',
    });
    setIsEditing(true);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let parsedLineItems = formData.line_items;
      if (typeof parsedLineItems === 'string' && parsedLineItems.trim()) {
        try { parsedLineItems = JSON.parse(parsedLineItems); } catch { /* keep as string */ }
      }
      const payload = {
        ...formData,
        client_id: Number(formData.client_id) || null,
        project_id: Number(formData.project_id) || null,
        amount: Number(formData.amount) || 0,
        tax: Number(formData.tax) || 0,
        line_items: parsedLineItems,
      };
      if (isEditing) {
        await api.update('invoices', selectedItem.id, payload);
      } else {
        await api.create('invoices', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete('invoices', selectedItem.id);
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
      const data = await api.aiAnalyze('invoices', selectedItem.id, 'ai-predict');
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
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button onClick={openNew} className="btn-primary">New Invoice</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Invoice #', 'Client', 'Project', 'Amount', 'Tax', 'Status', 'Due Date'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell font-medium">{item.invoice_number || '-'}</td>
                <td className="table-cell">{item.client_name || item.client_id || '-'}</td>
                <td className="table-cell">{item.project_name || item.project_id || '-'}</td>
                <td className="table-cell">{fmt(item.amount)}</td>
                <td className="table-cell">{fmt(item.tax)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${statusColors[item.status] || ''}`}>{item.status}</span>
                </td>
                <td className="table-cell">{item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-500">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Invoice {selectedItem.invoice_number || `#${selectedItem.id}`}</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Status</span><div><span className={`status-badge ${statusColors[selectedItem.status] || ''}`}>{selectedItem.status}</span></div></div>
            <div><span className="text-gray-500">Client</span><div className="font-medium">{selectedItem.client_name || selectedItem.client_id || '-'}</div></div>
            <div><span className="text-gray-500">Project</span><div className="font-medium">{selectedItem.project_name || selectedItem.project_id || '-'}</div></div>
            <div><span className="text-gray-500">Amount</span><div className="font-medium">{fmt(selectedItem.amount)}</div></div>
            <div><span className="text-gray-500">Tax</span><div className="font-medium">{fmt(selectedItem.tax)}</div></div>
            <div><span className="text-gray-500">Total</span><div className="font-medium">{fmt((Number(selectedItem.amount) || 0) + (Number(selectedItem.tax) || 0))}</div></div>
            <div><span className="text-gray-500">Due Date</span><div className="font-medium">{selectedItem.due_date ? new Date(selectedItem.due_date).toLocaleDateString() : '-'}</div></div>
            <div><span className="text-gray-500">Paid Date</span><div className="font-medium">{selectedItem.paid_date ? new Date(selectedItem.paid_date).toLocaleDateString() : '-'}</div></div>
          </div>
          {selectedItem.line_items && (
            <div className="text-sm text-gray-600">
              <span className="text-gray-500">Line Items:</span>
              <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                {typeof selectedItem.line_items === 'string' ? selectedItem.line_items : JSON.stringify(selectedItem.line_items, null, 2)}
              </pre>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
            <button onClick={handleAI} className="btn-ai">AI Predict Payment</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Payment Prediction" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Invoice' : 'New Invoice'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input name="invoice_number" value={formData.invoice_number} onChange={onChange} className="input-field" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input name="amount" type="number" step="0.01" value={formData.amount} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                <input name="tax" type="number" step="0.01" value={formData.tax} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={onChange} className="select-field">
                  {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input name="due_date" type="date" value={formData.due_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid Date</label>
                <input name="paid_date" type="date" value={formData.paid_date} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Line Items (JSON)</label>
                <textarea name="line_items" value={formData.line_items} onChange={onChange} rows={4} className="input-field" placeholder='[{"description": "...", "amount": 100}]' />
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
