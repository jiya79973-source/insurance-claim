import { useState, useEffect } from 'react';
import api from '../services/api';
import { LoadingSpinner, EmptyState, Pagination, Modal, Alert } from '../components/UI';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/users', { params: { page, limit: 10 } });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      setSuccess('Employee created successfully');
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'AGENT' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    try {
      await api.delete(`/users/${id}`);
      setSuccess('Employee deleted');
      fetchUsers(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Employee</button>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {loading ? <LoadingSpinner /> : users.length === 0 ? (
        <EmptyState message="No employees found" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{u.name}</td>
                  <td className="py-3">{u.email}</td>
                  <td className="py-3"><span className="badge bg-primary-100 text-primary-800">{u.role}</span></td>
                  <td className="py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3">
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchUsers} />
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Employee">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
              <option value="AGENT">Insurance Agent</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">Create Employee</button>
        </form>
      </Modal>
    </div>
  );
}
