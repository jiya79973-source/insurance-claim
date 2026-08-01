import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal, Alert } from '../components/UI';

export default function Policies() {
  const { isCustomer, isAdmin, isAgent } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customerId: '', policyType: '', premiumAmount: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPolicies = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/policies', { params });
      setPolicies(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    if (isAdmin || isAgent) {
      api.get('/customers', { params: { limit: 100 } }).then((res) => setCustomers(res.data.data));
    }
  }, [search, statusFilter, isAdmin, isAgent]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/policies', {
        ...form,
        customerId: parseInt(form.customerId, 10),
        premiumAmount: parseFloat(form.premiumAmount),
      });
      setSuccess('Policy created successfully');
      setShowModal(false);
      setForm({ customerId: '', policyType: '', premiumAmount: '', startDate: '', endDate: '' });
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create policy');
    }
  };

  const handleRenew = async (id) => {
    try {
      await api.patch(`/policies/${id}/renew`);
      setSuccess('Policy renewed successfully');
      fetchPolicies(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to renew policy');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this policy?')) return;
    try {
      await api.patch(`/policies/${id}/cancel`);
      setSuccess('Policy cancelled');
      fetchPolicies(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel policy');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isCustomer ? 'My Policies' : 'Policy Management'}</h1>
        {(isAdmin || isAgent) && (
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Create Policy</button>
        )}
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="flex gap-4 mb-4">
        <input type="text" placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field max-w-xs">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : policies.length === 0 ? (
        <EmptyState message="No policies found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Policy #</th>
                <th className="pb-3 font-medium">Type</th>
                {!isCustomer && <th className="pb-3 font-medium">Customer</th>}
                <th className="pb-3 font-medium">Premium</th>
                <th className="pb-3 font-medium">Start</th>
                <th className="pb-3 font-medium">End</th>
                <th className="pb-3 font-medium">Status</th>
                {(isAdmin || isAgent) && <th className="pb-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-mono text-xs">{p.policyNumber}</td>
                  <td className="py-3">{p.policyType}</td>
                  {!isCustomer && <td className="py-3">{p.customer?.name}</td>}
                  <td className="py-3">${p.premiumAmount}</td>
                  <td className="py-3">{new Date(p.startDate).toLocaleDateString()}</td>
                  <td className="py-3">{new Date(p.endDate).toLocaleDateString()}</td>
                  <td className="py-3"><StatusBadge status={p.status} /></td>
                  {(isAdmin || isAgent) && (
                    <td className="py-3 space-x-2">
                      {p.status === 'ACTIVE' && (
                        <>
                          <button onClick={() => handleRenew(p.id)} className="text-green-600 hover:underline text-sm">Renew</button>
                          <button onClick={() => handleCancel(p.id)} className="text-red-600 hover:underline text-sm">Cancel</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchPolicies} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Policy">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="input-field" required>
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Policy Type</label>
            <select value={form.policyType} onChange={(e) => setForm({ ...form, policyType: e.target.value })} className="input-field" required>
              <option value="">Select type</option>
              <option value="Health Insurance">Health Insurance</option>
              <option value="Auto Insurance">Auto Insurance</option>
              <option value="Life Insurance">Life Insurance</option>
              <option value="Home Insurance">Home Insurance</option>
              <option value="Travel Insurance">Travel Insurance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Premium Amount ($)</label>
            <input type="number" step="0.01" value={form.premiumAmount} onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-field" required />
          </div>
          <button type="submit" className="btn-primary w-full">Create Policy</button>
        </form>
      </Modal>
    </div>
  );
}
