import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Alert } from '../components/UI';

export default function Payments() {
  const { isCustomer } = useAuth();
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/payments', { params });
      setPayments(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [statusFilter]);

  const handlePay = async (id) => {
    try {
      await api.patch(`/payments/${id}/pay`, { paymentStatus: 'PAID' });
      setSuccess('Payment recorded successfully');
      fetchPayments(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{isCustomer ? 'My Payments' : 'Premium Tracking'}</h1>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field max-w-xs">
          <option value="">All Statuses</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : payments.length === 0 ? (
        <EmptyState message="No payments found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Policy</th>
                {!isCustomer && <th className="pb-3 font-medium">Customer</th>}
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Due Date</th>
                <th className="pb-3 font-medium">Paid Date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-mono text-xs">{p.policy?.policyNumber}</td>
                  {!isCustomer && <td className="py-3">{p.policy?.customer?.name}</td>}
                  <td className="py-3">${p.amount}</td>
                  <td className="py-3">{new Date(p.dueDate).toLocaleDateString()}</td>
                  <td className="py-3">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-'}</td>
                  <td className="py-3"><StatusBadge status={p.paymentStatus} /></td>
                  <td className="py-3">
                    {['PENDING', 'OVERDUE'].includes(p.paymentStatus) && (
                      <button onClick={() => handlePay(p.id)} className="text-green-600 hover:underline text-sm">
                        {isCustomer ? 'Pay Now' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchPayments} />
        </div>
      )}
    </div>
  );
}
