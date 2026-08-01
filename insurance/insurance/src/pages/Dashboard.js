import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard, LoadingSpinner, Alert } from '../components/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const { user, isCustomer, isAdmin, isAgent } = useAuth();
  const [data, setData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        if (isAdmin || isAgent) {
          const res = await api.get('/reports/dashboard');
          setData(res.data);
        } else if (isCustomer && user?.customer?.id) {
          const [policies, claims, payments] = await Promise.all([
            api.get('/policies'),
            api.get('/claims'),
            api.get('/payments'),
          ]);
          setCustomerData({
            policies: policies.data.data,
            claims: claims.data.data,
            payments: payments.data.data,
          });
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [isAdmin, isAgent, isCustomer, user]);

  if (loading) return <LoadingSpinner />;

  if (isCustomer) {
    const activePolicies = customerData?.policies?.filter((p) => p.status === 'ACTIVE').length || 0;
    const pendingClaims = customerData?.claims?.filter((c) => c.status === 'PENDING').length || 0;
    const pendingPayments = customerData?.payments?.filter((p) => p.paymentStatus === 'PENDING' || p.paymentStatus === 'OVERDUE').length || 0;

    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">My Dashboard</h1>
        <Alert message={error} type="error" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Active Policies" value={activePolicies} color="primary" />
          <StatCard title="Pending Claims" value={pendingClaims} color="yellow" />
          <StatCard title="Due Payments" value={pendingPayments} color="red" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/my-policies" className="card hover:shadow-md transition-shadow text-center">
            <span className="text-3xl">📋</span>
            <p className="font-medium mt-2">View Policies</p>
          </Link>
          <Link to="/my-claims" className="card hover:shadow-md transition-shadow text-center">
            <span className="text-3xl">📝</span>
            <p className="font-medium mt-2">Submit Claim</p>
          </Link>
          <Link to="/my-payments" className="card hover:shadow-md transition-shadow text-center">
            <span className="text-3xl">💳</span>
            <p className="font-medium mt-2">Pay Premium</p>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, policiesByType, claimsByStatus, monthlyCustomers, monthlyPremiums } = data || {};

  const policyChartData = {
    labels: policiesByType?.map((p) => p.type) || [],
    datasets: [{ data: policiesByType?.map((p) => p.count) || [], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }],
  };

  const claimChartData = {
    labels: claimsByStatus?.map((c) => c.status) || [],
    datasets: [{ data: claimsByStatus?.map((c) => c.count) || [], backgroundColor: ['#fbbf24', '#f97316', '#22c55e', '#ef4444'] }],
  };

  const customerGrowthData = {
    labels: monthlyCustomers?.map((m) => m.month) || [],
    datasets: [{ label: 'New Customers', data: monthlyCustomers?.map((m) => m.count) || [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 }],
  };

  const premiumData = {
    labels: monthlyPremiums?.map((m) => m.month) || [],
    datasets: [{ label: 'Premium ($)', data: monthlyPremiums?.map((m) => m.amount) || [], backgroundColor: '#10b981' }],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports Dashboard</h1>
        <button
          onClick={async () => {
            try {
              const res = await api.get('/reports/pdf', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'insurance-report.pdf');
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch {
              setError('Failed to export PDF');
            }
          }}
          className="btn-primary"
        >
          Export PDF
        </button>
      </div>
      <Alert message={error} type="error" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Customers" value={summary?.totalCustomers || 0} color="primary" />
        <StatCard title="Active Policies" value={summary?.activePolicies || 0} color="green" />
        <StatCard title="Pending Claims" value={summary?.pendingClaims || 0} color="yellow" />
        <StatCard title="Premium Collected" value={`$${(summary?.totalPremiumCollected || 0).toLocaleString()}`} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold mb-4">Customer Growth</h3>
          <Line data={customerGrowthData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Monthly Premium Collection</h3>
          <Bar data={premiumData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Policies by Type</h3>
          <div className="max-w-xs mx-auto">
            <Doughnut data={policyChartData} options={{ responsive: true }} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Claims by Status</h3>
          <div className="max-w-xs mx-auto">
            <Doughnut data={claimChartData} options={{ responsive: true }} />
          </div>
        </div>
      </div>
    </div>
  );
}
