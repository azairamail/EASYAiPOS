import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { PosProvider, usePos } from './context/PosContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PosOrder } from './pages/PosOrder';
import { Kitchen } from './pages/Kitchen';
import { Reports } from './pages/Reports';
import { MenuManage } from './pages/MenuManage';
import { Inventory } from './pages/Inventory';
import { OrderHistory } from './pages/OrderHistory';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { LockScreen } from './components/LockScreen';
import { Role } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Role Route to protect specific pages based on staff role
const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: Role[] }> = ({ children, allowedRoles }) => {
    const { state } = usePos();
    if (!state.activeStaff) return null; // Handled by LockScreen, but safe return
    
    if (!allowedRoles.includes(state.activeStaff.role)) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { state } = usePos();

  // If no staff is logged in via PIN, show Lock Screen (except on login page which is outside this scope)
  if (!state.activeStaff) {
      return <LockScreen />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        <Routes>
          {/* Public Access (for logged in staff) */}
          <Route path="/" element={<PosOrder />} />
          <Route path="/kds" element={<Kitchen />} />
          <Route path="/orders" element={<OrderHistory />} />

          {/* Restricted Access */}
          <Route path="/reports" element={
              <RoleRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                  <Reports />
              </RoleRoute>
          } />
          <Route path="/menu" element={
              <RoleRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                  <MenuManage />
              </RoleRoute>
          } />
          <Route path="/inventory" element={
              <RoleRoute allowedRoles={[Role.ADMIN, Role.MANAGER]}>
                  <Inventory />
              </RoleRoute>
          } />
          <Route path="/settings" element={
              <RoleRoute allowedRoles={[Role.ADMIN]}>
                  <Settings />
              </RoleRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={
                  <ProtectedRoute>
                      <PosProvider>
                          <AppContent />
                      </PosProvider>
                  </ProtectedRoute>
              } />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;