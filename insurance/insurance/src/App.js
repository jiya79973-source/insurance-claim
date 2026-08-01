import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Policies from './pages/Policies';
import Claims from './pages/Claims';
import Payments from './pages/Payments';
import Documents from './pages/Documents';
import Users from './pages/Users';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />

          <Route path="/customers" element={<ProtectedRoute roles={['ADMIN', 'AGENT']}><Layout><Customers /></Layout></ProtectedRoute>} />

          <Route path="/policies" element={<ProtectedRoute roles={['ADMIN', 'AGENT']}><Layout><Policies /></Layout></ProtectedRoute>} />
          <Route path="/my-policies" element={<ProtectedRoute roles={['CUSTOMER']}><Layout><Policies /></Layout></ProtectedRoute>} />

          <Route path="/claims" element={<ProtectedRoute roles={['ADMIN', 'AGENT']}><Layout><Claims /></Layout></ProtectedRoute>} />
          <Route path="/my-claims" element={<ProtectedRoute roles={['CUSTOMER']}><Layout><Claims /></Layout></ProtectedRoute>} />

          <Route path="/payments" element={<ProtectedRoute roles={['ADMIN', 'AGENT']}><Layout><Payments /></Layout></ProtectedRoute>} />
          <Route path="/my-payments" element={<ProtectedRoute roles={['CUSTOMER']}><Layout><Payments /></Layout></ProtectedRoute>} />

          <Route path="/documents" element={<ProtectedRoute roles={['ADMIN', 'AGENT']}><Layout><Documents /></Layout></ProtectedRoute>} />
          <Route path="/my-documents" element={<ProtectedRoute roles={['CUSTOMER']}><Layout><Documents /></Layout></ProtectedRoute>} />

          <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><Layout><Users /></Layout></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
