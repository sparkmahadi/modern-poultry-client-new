import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Activity, Plus, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const headers = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const types = [
  { value: 'CHICK_PLACEMENT', label: 'Chick Placement', unit: 'birds' },
  { value: 'FEED_ISSUE', label: 'Feed Issue', unit: 'kg' },
  { value: 'MEDICINE_ISSUE', label: 'Medicine / Vaccine', unit: 'unit' },
  { value: 'EXPENSE', label: 'Other Expense', unit: 'unit' },
  { value: 'MORTALITY', label: 'Mortality', unit: 'birds' },
];
const blank = { type: 'FEED_ISSUE', quantity: '', unit: 'kg', unitCost: '', amount: '', itemName: '', date: new Date().toISOString().slice(0, 10), saleInvoiceId: '', countsTowardBirds: true, note: '' };
const money = (value) => `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

export default function BatchOperationsPanel({ batchId, status }) {
  const [data, setData] = useState({ operations: [], summary: {}, salesInvoices: [] });
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/batches/${batchId}/operations`, { headers: headers() });
      setData(response.data || { operations: [], summary: {}, salesInvoices: [] });
    } catch (error) { toast.error(error.response?.data?.message || 'Could not load farming operations.'); }
  }, [batchId]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const onTypeChange = (type) => {
    const item = types.find((entry) => entry.value === type);
    setForm((prev) => ({ ...prev, type, unit: item?.unit || 'unit', quantity: '', unitCost: '', amount: '' }));
  };
  const save = async (event) => {
    event.preventDefault();
    if (['CHICK_PLACEMENT', 'FEED_ISSUE', 'MEDICINE_ISSUE', 'MORTALITY'].includes(form.type) && Number(form.quantity) <= 0) return toast.error('Enter a valid quantity.');
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/batches/${batchId}/operations`, {
        ...form,
        quantity: Number(form.quantity || 0), unitCost: Number(form.unitCost || 0),
        amount: form.amount === '' ? undefined : Number(form.amount),
        saleInvoiceId: form.saleInvoiceId || null, countsTowardBirds: form.countsTowardBirds,
      }, { headers: headers() });
      toast.success('Farming operation recorded.');
      setForm(blank); setShowForm(false); await fetchData();
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save operation.'); }
    finally { setLoading(false); }
  };
  const summary = data.summary || {};
  const isClosed = ['HARVESTED', 'COMPLETED'].includes(status);
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600"/><div><h2 className="font-bold text-slate-900">Farming Operations & Cost</h2><p className="text-xs text-slate-500">Chick placement, feed, medicine, mortality and expenses</p></div></div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg border text-sm flex items-center gap-1"><RefreshCw size={14}/> Refresh</button>
          {!isClosed && <button onClick={() => setShowForm((v) => !v)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-1"><Plus size={15}/> Add Record</button>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          ['Chick Cost', summary.chick_cost], ['Feed Cost', summary.feed_cost], ['Medicine Cost', summary.medicine_cost], ['Other Cost', summary.other_cost], ['Total Farming Cost', summary.total_farming_cost],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 border p-3"><p className="text-[11px] text-slate-500 font-semibold">{label}</p><p className="text-lg font-black text-slate-900 mt-1">{money(value)}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-5 text-sm text-slate-600"><span>Current birds: <b className="text-slate-900">{Number(summary.current_bird_count || 0).toLocaleString()}</b></span><span>Mortality: <b className="text-rose-600">{Number(summary.mortality_count || 0).toLocaleString()}</b></span><span>Initial + placed chicks: <b className="text-slate-900">{Number(summary.placed_birds || 0).toLocaleString()}</b></span></div>
      {showForm && <form onSubmit={save} className="border rounded-xl p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-600">Operation Type<select value={form.type} onChange={(e) => onTypeChange(e.target.value)} className="mt-1 w-full border rounded-lg p-2 bg-white">{types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full border rounded-lg p-2 bg-white"/></label>
        {form.type !== 'EXPENSE' && <label className="text-xs font-semibold text-slate-600">Quantity<input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mt-1 w-full border rounded-lg p-2 bg-white" required={form.type !== 'EXPENSE'}/></label>}
        <label className="text-xs font-semibold text-slate-600">Unit<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1 w-full border rounded-lg p-2 bg-white"/></label>
        <label className="text-xs font-semibold text-slate-600">Item / Expense Name<input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="e.g. Starter feed, vaccine" className="mt-1 w-full border rounded-lg p-2 bg-white"/></label>
        <label className="text-xs font-semibold text-slate-600">Unit Cost (৳)<input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="mt-1 w-full border rounded-lg p-2 bg-white"/></label>
        <label className="text-xs font-semibold text-slate-600">Total Cost (৳)<input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} disabled={Boolean(form.saleInvoiceId)} placeholder={form.saleInvoiceId ? 'Taken from linked invoice' : 'Auto: quantity × unit cost'} className="mt-1 w-full border rounded-lg p-2 bg-white"/></label>
        {form.type === 'CHICK_PLACEMENT' && <label className="md:col-span-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={!form.countsTowardBirds} onChange={(e) => setForm({ ...form, countsTowardBirds: !e.target.checked })}/> Cost-only record for the initial chicks already counted in this batch (do not add birds again)</label>}
        <label className="text-xs font-semibold text-slate-600">Link Existing Farmer Sales Invoice (optional)<select value={form.saleInvoiceId} onChange={(e) => setForm({ ...form, saleInvoiceId: e.target.value })} className="mt-1 w-full border rounded-lg p-2 bg-white"><option value="">No invoice linked</option>{(data.salesInvoices || []).map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.memoNo || invoice.invoiceNo || invoice._id} — {money(invoice.total_amount ?? invoice.totalAmount)}</option>)}</select><span className="text-[10px] text-slate-400">Linked invoice total is used automatically and cannot be allocated twice.</span></label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">Notes<textarea rows="2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1 w-full border rounded-lg p-2 bg-white"/></label>
        <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button disabled={loading} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50">{loading ? 'Saving...' : 'Save Record'}</button></div>
      </form>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Quantity</th><th className="py-2 pr-3">Cost</th><th className="py-2">Reference / Note</th></tr></thead><tbody>{(data.operations || []).length === 0 ? <tr><td colSpan="6" className="py-6 text-center text-slate-400">No operation records yet.</td></tr> : [...data.operations].reverse().map((entry) => <tr key={entry._id} className="border-b last:border-0"><td className="py-3 pr-3 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td><td className="py-3 pr-3 font-semibold">{types.find((t) => t.value === entry.type)?.label || entry.type}</td><td className="py-3 pr-3">{entry.itemName || '—'}</td><td className="py-3 pr-3">{entry.quantity} {entry.unit}</td><td className="py-3 pr-3 font-semibold">{money(entry.amount)}</td><td className="py-3 text-xs text-slate-500">{entry.saleInvoiceId ? 'Sales invoice linked' : ''} {entry.note}</td></tr>)}</tbody></table></div>
      <p className="text-[11px] text-slate-400">Cost records are operational batch allocations. Linking a sales invoice does not create another accounting entry or change customer balance.</p>
    </section>
  );
}
