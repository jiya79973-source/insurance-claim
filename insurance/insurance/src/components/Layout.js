import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = {
  ADMIN: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/customers', label: 'Customers', icon: '👥' },
    { to: '/policies', label: 'Policies', icon: '📋' },
    { to: '/claims', label: 'Claims', icon: '📝' },
    { to: '/payments', label: 'Payments', icon: '💳' },
    { to: '/documents', label: 'Documents', icon: '📁' },
    { to: '/users', label: 'Employees', icon: '👔' },
  ],
  AGENT: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/customers', label: 'Customers', icon: '👥' },
    { to: '/policies', label: 'Policies', icon: '📋' },
    { to: '/claims', label: 'Claims', icon: '📝' },
    { to: '/payments', label: 'Payments', icon: '💳' },
    { to: '/documents', label: 'Documents', icon: '📁' },
  ],
  CUSTOMER: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/my-policies', label: 'My Policies', icon: '📋' },
    { to: '/my-claims', label: 'My Claims', icon: '📝' },
    { to: '/my-payments', label: 'Payments', icon: '💳' },
    { to: '/my-documents', label: 'Documents', icon: '📁' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-primary-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-primary-800">
          <h1 className="text-xl font-bold">InsuranceHub</h1>
          <p className="text-primary-300 text-xs mt-1">Management Platform</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-800'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-800">
          <div className="px-4 py-2">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-primary-300 truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 px-4 py-2 text-sm text-primary-200 hover:bg-primary-800 rounded-lg transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome, {user?.name}
            </h2>
            <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
