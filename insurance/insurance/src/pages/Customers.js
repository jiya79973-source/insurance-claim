import { useState, useEffect } from 'react';
import api from '../services/api';
import { StatusBadge, LoadingSpinner, EmptyState, Pagination, Modal, Alert } from '../components/UI';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', dob: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { search, page, limit: 10 } });
      setCustomers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (selected) {
        await api.put(`/customers/${selected.id}`, form);
        setSuccess('Customer updated successfully');
      } else {
        await api.post('/customers', form);
        setSuccess('Customer created successfully');
      }
      setShowModal(false);
      setSelected(null);
      setForm({ name: '', email: '', dob: '', phone: '', address: '' });
      fetchCustomers(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const openEdit = (customer) => {
    setSelected(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      dob: customer.dob?.split('T')[0] || '',
      phone: customer.phone,
      address: customer.address,
    });
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Management</h1>
        <button onClick={() => { setSelected(null); setForm({ name: '', email: '', dob: '', phone: '', address: '' }); setShowModal(true); }} className="btn-primary">
          + Add Customer
        </button>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-sm"
        />
      </div>

      {loading ? <LoadingSpinner /> : customers.length === 0 ? (
        <EmptyState message="No customers found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Phone</th>
                <th className="pb-3 font-medium">Policies</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3">{c.email}</td>
                  <td className="py-3">{c.phone}</td>
                  <td className="py-3">{c._count?.policies || 0}</td>
                  <td className="py-3">
                    <button onClick={() => openEdit(c)} className="text-primary-600 hover:underline text-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchCustomers} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={selected ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {['name', 'email', 'dob', 'phone', 'address'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1 capitalize">{field === 'dob' ? 'Date of Birth' : field}</label>
              <input
                type={field === 'email' ? 'email' : field === 'dob' ? 'date' : 'text'}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="input-field"
                required
              />
            </div>
          ))}
          <button type="submit" className="btn-primary w-full">{selected ? 'Update' : 'Create'}</button>
        </form>
      </Modal>
    </div>
  );
}
