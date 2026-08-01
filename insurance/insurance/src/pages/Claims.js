import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal, Alert } from '../components/UI';

export default function Claims() {
  const { isCustomer, isAdmin, isAgent } = useAuth();
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReview, setShowReview] = useState(null);
  const [form, setForm] = useState({ policyId: '', claimAmount: '', reason: '' });
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', reviewNotes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchClaims = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/claims', { params });
      setClaims(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    api.get('/policies', { params: { status: 'ACTIVE', limit: 100 } }).then((res) => setPolicies(res.data.data));
  }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/claims', {
        ...form,
        policyId: parseInt(form.policyId, 10),
        claimAmount: parseFloat(form.claimAmount),
      });
      setSuccess('Claim submitted successfully');
      setShowModal(false);
      setForm({ policyId: '', claimAmount: '', reason: '' });
      fetchClaims();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit claim');
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/claims/${showReview.id}/review`, reviewForm);
      setSuccess('Claim reviewed successfully');
      setShowReview(null);
      fetchClaims(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review claim');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isCustomer ? 'My Claims' : 'Claim Management'}</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Submit Claim</button>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field max-w-xs">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : claims.length === 0 ? (
        <EmptyState message="No claims found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Policy</th>
                {!isCustomer && <th className="pb-3 font-medium">Customer</th>}
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Reason</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Status</th>
                {(isAdmin || isAgent) && <th className="pb-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-mono text-xs">{c.policy?.policyNumber}</td>
                  {!isCustomer && <td className="py-3">{c.policy?.customer?.name}</td>}
                  <td className="py-3">${c.claimAmount?.toLocaleString()}</td>
                  <td className="py-3 max-w-xs truncate">{c.reason}</td>
                  <td className="py-3">{new Date(c.submissionDate).toLocaleDateString()}</td>
                  <td className="py-3"><StatusBadge status={c.status} /></td>
                  {(isAdmin || isAgent) && (
                    <td className="py-3">
                      {['PENDING', 'UNDER_REVIEW'].includes(c.status) && (
                        <button onClick={() => { setShowReview(c); setReviewForm({ status: 'APPROVED', reviewNotes: '' }); }} className="text-primary-600 hover:underline text-sm">
                          Review
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchClaims} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Claim">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Policy</label>
            <select value={form.policyId} onChange={(e) => setForm({ ...form, policyId: e.target.value })} className="input-field" required>
              <option value="">Select policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.policyNumber} - {p.policyType}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Claim Amount ($)</label>
            <input type="number" step="0.01" value={form.claimAmount} onChange={(e) => setForm({ ...form, claimAmount: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field" rows={4} required minLength={10} />
          </div>
          <button type="submit" className="btn-primary w-full">Submit Claim</button>
        </form>
      </Modal>

      <Modal isOpen={!!showReview} onClose={() => setShowReview(null)} title="Review Claim">
        <form onSubmit={handleReview} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <p><strong>Amount:</strong> ${showReview?.claimAmount?.toLocaleString()}</p>
            <p className="mt-1"><strong>Reason:</strong> {showReview?.reason}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Decision</label>
            <select value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })} className="input-field">
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approve</option>
              <option value="REJECTED">Reject</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={reviewForm.reviewNotes} onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })} className="input-field" rows={3} />
          </div>
          <button type="submit" className="btn-primary w-full">Submit Review</button>
        </form>
      </Modal>
    </div>
  );
}
