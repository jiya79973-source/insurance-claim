import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState, Modal, Alert } from '../components/UI';

export default function Documents() {
  const { user, isCustomer, isAdmin, isAgent } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customerId: '', docType: 'IDENTITY', file: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      if (isCustomer && user?.customer?.id) {
        const { data } = await api.get(`/documents/customer/${user.customer.id}`);
        setDocuments(data);
      } else if (isAdmin || isAgent) {
        const custRes = await api.get('/customers', { params: { limit: 100 } });
        setCustomers(custRes.data.data);
        if (custRes.data.data.length > 0) {
          const firstId = custRes.data.data[0].id;
          const { data } = await api.get(`/documents/customer/${firstId}`);
          setDocuments(data);
          setForm((f) => ({ ...f, customerId: firstId }));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [user, isCustomer, isAdmin, isAgent]);

  const loadCustomerDocs = async (customerId) => {
    try {
      const { data } = await api.get(`/documents/customer/${customerId}`);
      setDocuments(data);
      setForm((f) => ({ ...f, customerId }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', form.file);
    formData.append('customerId', form.customerId || user.customer.id);
    formData.append('docType', form.docType);

    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Document uploaded successfully');
      setShowModal(false);
      setForm({ customerId: form.customerId, docType: 'IDENTITY', file: null });
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Download failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Document Management</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Upload Document</button>
      </div>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {(isAdmin || isAgent) && customers.length > 0 && (
        <div className="mb-4">
          <select
            value={form.customerId}
            onChange={(e) => loadCustomerDocs(parseInt(e.target.value, 10))}
            className="input-field max-w-sm"
          >
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState message="No documents uploaded" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card flex items-start gap-4">
              <div className="text-3xl">📄</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-gray-500 mt-1">{doc.docType}</p>
                <p className="text-xs text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                <button onClick={() => handleDownload(doc)} className="text-primary-600 hover:underline text-sm mt-2">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          {(isAdmin || isAgent) && (
            <div>
              <label className="block text-sm font-medium mb-1">Customer</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="input-field" required>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })} className="input-field">
              <option value="IDENTITY">Identity Document</option>
              <option value="POLICY">Policy Document</option>
              <option value="CLAIM">Claim Document</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">File</label>
            <input type="file" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} className="input-field" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required />
          </div>
          <button type="submit" className="btn-primary w-full">Upload</button>
        </form>
      </Modal>
    </div>
  );
}
