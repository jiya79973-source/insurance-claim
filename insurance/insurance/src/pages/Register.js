import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/UI';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', dob: '', phone: '', address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(form.dob ? { dob: form.dob } : {}),
        ...(form.phone ? { phone: form.phone.trim() } : {}),
        ...(form.address ? { address: form.address.trim() } : {}),
      };

      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err.response?.data;
      const message = apiError?.errors?.[0]?.message || apiError?.message || err.message || 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 py-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Register as a customer</p>
        </div>

        <Alert message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {['name', 'email', 'password', 'dob', 'phone', 'address'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                {field === 'dob' ? 'Date of Birth' : field}
              </label>
              <input
                type={field === 'email' ? 'email' : field === 'password' ? 'password' : field === 'dob' ? 'date' : 'text'}
                name={field}
                value={form[field]}
                onChange={handleChange}
                className="input-field"
                required={field !== 'phone' && field !== 'address'}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
