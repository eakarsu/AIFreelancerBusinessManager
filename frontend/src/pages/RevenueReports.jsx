import { useState, useEffect } from 'react';
import { api } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const typeColors = {
  monthly: 'bg-blue-100 text-blue-800',
  quarterly: 'bg-purple-100 text-purple-800',
  annual: 'bg-green-100 text-green-800',
  custom: 'bg-gray-100 text-gray-800',
};

const typeOptions = ['monthly', 'quarterly', 'annual', 'custom'];

const emptyForm = {
  report_type: 'monthly', period_start: '', period_end: '', total_revenue: '', total_expenses: '', net_profit: '', invoices_count: '', projects_count: '',
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
};

const formatPeriod = (start, end) => {
  const s = start ? start.slice(0, 10) : '';
  const e = end ? end.slice(0, 10) : '';
  if (s && e) return `${s} - ${e}`;
  return s || e || '-';
};

export default function RevenueReports() {
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
      const data = await api.getAll('revenue-reports', params);
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
      report_type: selectedItem.report_type || 'monthly',
      period_start: selectedItem.period_start ? selectedItem.period_start.slice(0, 10) : '',
      period_end: selectedItem.period_end ? selectedItem.period_end.slice(0, 10) : '',
      total_revenue: selectedItem.total_revenue || '',
      total_expenses: selectedItem.total_expenses || '',
      net_profit: selectedItem.net_profit || '',
      invoices_count: selectedItem.invoices_count || '',
      projects_count: selectedItem.projects_count || '',
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
        total_revenue: formData.total_revenue ? Number(formData.total_revenue) : 0,
        total_expenses: formData.total_expenses ? Number(formData.total_expenses) : 0,
        net_profit: formData.net_profit ? Number(formData.net_profit) : 0,
        invoices_count: formData.invoices_count ? Number(formData.invoices_count) : 0,
        projects_count: formData.projects_count ? Number(formData.projects_count) : 0,
      };
      if (isEditing) {
        await api.update('revenue-reports', selectedItem.id, payload);
      } else {
        await api.create('revenue-reports', payload);
      }
      setShowForm(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await api.delete('revenue-reports', selectedItem.id);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAIForecast = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await api.aiAction('revenue-reports', 'ai-forecast');
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
        <h1 className="text-2xl font-bold text-gray-900">Revenue Reports</h1>
        <div className="flex gap-3">
          <button onClick={handleAIForecast} className="btn-ai">AI Forecast Revenue</button>
          <button onClick={openNew} className="btn-primary">New Report</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {!selectedItem && <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Revenue Forecast" />}

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {['Period', 'Type', 'Revenue', 'Expenses', 'Net Profit', 'Invoices', 'Projects'].map((h) => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} onClick={() => { setSelectedItem(item); setAiResult(null); }} className="hover:bg-gray-50 cursor-pointer">
                <td className="table-cell font-medium">{formatPeriod(item.period_start, item.period_end)}</td>
                <td className="table-cell">
                  <span className={`status-badge ${typeColors[item.report_type] || ''}`}>{item.report_type ? item.report_type.charAt(0).toUpperCase() + item.report_type.slice(1) : '-'}</span>
                </td>
                <td className="table-cell text-green-700 font-medium">{formatCurrency(item.total_revenue)}</td>
                <td className="table-cell text-red-700 font-medium">{formatCurrency(item.total_expenses)}</td>
                <td className="table-cell font-bold">{formatCurrency(item.net_profit)}</td>
                <td className="table-cell">{item.invoices_count ?? '-'}</td>
                <td className="table-cell">{item.projects_count ?? '-'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-500">No reports found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.report_type ? selectedItem.report_type.charAt(0).toUpperCase() + selectedItem.report_type.slice(1) : ''} Report</h2>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Period</span><div className="font-medium">{formatPeriod(selectedItem.period_start, selectedItem.period_end)}</div></div>
            <div><span className="text-gray-500">Type</span><div><span className={`status-badge ${typeColors[selectedItem.report_type] || ''}`}>{selectedItem.report_type ? selectedItem.report_type.charAt(0).toUpperCase() + selectedItem.report_type.slice(1) : '-'}</span></div></div>
            <div><span className="text-gray-500">Revenue</span><div className="font-medium text-green-700">{formatCurrency(selectedItem.total_revenue)}</div></div>
            <div><span className="text-gray-500">Expenses</span><div className="font-medium text-red-700">{formatCurrency(selectedItem.total_expenses)}</div></div>
            <div><span className="text-gray-500">Net Profit</span><div className="font-bold">{formatCurrency(selectedItem.net_profit)}</div></div>
            <div><span className="text-gray-500">Invoices</span><div className="font-medium">{selectedItem.invoices_count ?? '-'}</div></div>
            <div><span className="text-gray-500">Projects</span><div className="font-medium">{selectedItem.projects_count ?? '-'}</div></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={openEdit} className="btn-secondary">Edit</button>
            <button onClick={handleDelete} className="btn-danger">Delete</button>
          </div>
          <AIResponseDisplay data={aiResult} loading={aiLoading} title="AI Revenue Forecast" />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit Report' : 'New Report'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select name="report_type" value={formData.report_type} onChange={onChange} className="select-field">
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                <input name="period_start" type="date" value={formData.period_start} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                <input name="period_end" type="date" value={formData.period_end} onChange={onChange} required className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Revenue</label>
                <input name="total_revenue" type="number" step="0.01" value={formData.total_revenue} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Expenses</label>
                <input name="total_expenses" type="number" step="0.01" value={formData.total_expenses} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Net Profit</label>
                <input name="net_profit" type="number" step="0.01" value={formData.net_profit} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoices Count</label>
                <input name="invoices_count" type="number" value={formData.invoices_count} onChange={onChange} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projects Count</label>
                <input name="projects_count" type="number" value={formData.projects_count} onChange={onChange} className="input-field" />
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
