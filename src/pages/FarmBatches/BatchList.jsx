import React, { useEffect, useState, useMemo } from 'react';
import DashboardSummaryCards from './Dash';
import { Link } from 'react-router'; 
import axios from 'axios';
import { toast } from 'react-toastify';
import CreateBatchForm from './CreateBatchForm';

const BatchList = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const statusColors = {
    PLANNED: 'bg-slate-100 text-slate-700',
    ACTIVE: 'bg-blue-100 text-blue-800',
    HARVESTING: 'bg-amber-100 text-amber-800',
    HARVESTED: 'bg-violet-100 text-violet-800',
    COMPLETED: 'bg-green-100 text-green-800',
  };
  const nextStatus = { PLANNED: 'ACTIVE', ACTIVE: 'HARVESTING', HARVESTING: 'ACTIVE', HARVESTED: 'COMPLETED' };
  const statusLabel = (status) => ({ PLANNED: 'Planned', ACTIVE: 'Active', HARVESTING: 'Harvesting', HARVESTED: 'Harvested', COMPLETED: 'Completed' }[status] || status);

  // --- CALCULATION LOGIC ---
  const stats = useMemo(() => {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    return batches.reduce((acc, batch) => {
      const qty = Number(batch.chicksQuantity) || 0;
      
      const status = batch.status || (batch.active === false ? 'COMPLETED' : 'ACTIVE');
      if (status === 'PLANNED') acc.plannedBatches += 1;
      if (status === 'ACTIVE') {
        acc.activeBatches += 1;
        acc.activeChicks += qty;
      }
      if (status === 'HARVESTING') {
        acc.harvestingBatches += 1;
        acc.activeChicks += qty;
      }
      if (status === 'HARVESTED') acc.harvestedBatches += 1;
      if (status === 'COMPLETED') {
        acc.completedBatches += 1;
        acc.completedChicks += qty;
      }

      // Count only birds still in active farming as nearing expected harvest.
      if (['ACTIVE', 'HARVESTING'].includes(status) && batch.expectedEndDate) {
        const expDate = new Date(batch.expectedEndDate);
        if (expDate >= today && expDate <= threeDaysFromNow) acc.readyChicks += qty;
      }
      
      return acc;
    }, {
      plannedBatches: 0,
      activeBatches: 0,
      harvestingBatches: 0,
      harvestedBatches: 0,
      activeChicks: 0,
      completedBatches: 0,
      completedChicks: 0,
      readyChicks: 0
    });
  }, [batches]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/batches`);
      if (response?.data?.success) {
        setBatches(response?.data?.batches || []);
      }
    } catch (error) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Handlers...
  const handleOpenCreate = () => { setEditingBatch(null); setIsModalOpen(true); };
  const handleOpenEdit = (batch) => { setEditingBatch(batch); setIsModalOpen(true); };
  const handleFormSuccess = () => { setIsModalOpen(false); fetchBatches(); };

  const advanceBatchStatus = async (batch) => {
    const current = batch.status || (batch.active === false ? 'COMPLETED' : 'ACTIVE');
    const next = nextStatus[current];
    if (!next) return;
    if (!window.confirm(`Change batch status from ${statusLabel(current)} to ${statusLabel(next)}?`)) return;
    try {
      await axios.patch(`${API_BASE_URL}/api/batches/${batch._id}/status`, { status: next });
      toast.success(`Batch moved to ${statusLabel(next)}`);
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update batch status');
    }
  };

  const deleteBatch = async (batchId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/batches/${batchId}`);
      toast.success('Batch deleted successfully!');
      fetchBatches();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {isModalOpen && (
        <CreateBatchForm
          batchData={editingBatch}
          onSuccess={handleFormSuccess}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-6">Batch Management Dashboard</h1>
      
      {/* Pass the calculated stats to your Summary Cards component */}
      <DashboardSummaryCards stats={stats} />

      <hr className="my-8" />

      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">All Batches</h2>
          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow transition"
          >
            ➕ Add New Batch
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Batch ID', 'Farmer', 'Shed', 'Placement Date', 'Status', "Chicks", 'Expected Harvest', "Breed", 'Actions'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr key={batch._id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{batch.batchCode || batch._id.slice(-6)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{batch.farmer}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{batch.shedName || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{batch.startDate ? new Date(batch.startDate).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4">
                    {(() => { const status = batch.status || (batch.active === false ? 'COMPLETED' : 'ACTIVE'); return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>{statusLabel(status)}</span>; })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{batch.chicksQuantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{batch.expectedEndDate ? new Date(batch.expectedEndDate).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{batch.chicksBreed}</td>
                  <td className="px-6 py-4 text-sm font-medium space-x-3">
                    <button onClick={() => handleOpenEdit(batch)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                    {nextStatus[batch.status || (batch.active === false ? 'COMPLETED' : 'ACTIVE')] && <button onClick={() => advanceBatchStatus(batch)} className="text-amber-700 hover:text-amber-900">Next Status</button>}
                    <Link to={batch._id} className="text-indigo-600 hover:text-indigo-900">Details</Link>
                    <button onClick={() => deleteBatch(batch._id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BatchList;