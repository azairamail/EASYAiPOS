import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, ChefHat, FileBarChart, Package, Settings, LogOut, Sun, Moon, Sliders, UserCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePos } from '../context/PosContext';
import { Role } from '../types';

const ALL_NAV_ITEMS = [
  { path: '/', label: 'POS', icon: ShoppingCart, roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER] },
  { path: '/kds', label: 'Kitchen (KDS)', icon: ChefHat, roles: [Role.ADMIN, Role.MANAGER, Role.KITCHEN, Role.CASHIER] },
  { path: '/orders', label: 'All Orders', icon: LayoutDashboard, roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER] },
  { path: '/inventory', label: 'Inventory', icon: Package, roles: [Role.ADMIN, Role.MANAGER] },
  { path: '/reports', label: 'Reports & AI', icon: FileBarChart, roles: [Role.ADMIN, Role.MANAGER] },
  { path: '/menu', label: 'Menu Setup', icon: Settings, roles: [Role.ADMIN, Role.MANAGER] },
  { path: '/settings', label: 'Master Settings', icon: Sliders, roles: [Role.ADMIN] },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state, dispatch } = usePos();
  const navigate = useNavigate();

  const activeStaff = state.activeStaff;

  const handleSwitchUser = () => {
      dispatch({ type: 'LOGOUT_STAFF' });
      navigate('/');
  };

  const handleSystemLogout = async () => {
      if(window.confirm('Log out from System (Firebase)? This will disconnect the store.')) {
        await logout();
        navigate('/login');
      }
  };

  const filteredNavItems = ALL_NAV_ITEMS.filter(item => 
     activeStaff && item.roles.includes(activeStaff.role)
  );

  return (
    <div className="h-screen w-20 md:w-64 bg-slate-900 text-white flex flex-col shadow-xl transition-all z-50 relative">
      <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-slate-800">
        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="font-bold text-xl">E</span>
        </div>
        <h1 className="text-xl font-bold hidden md:block text-orange-500">EasyPOS BD</h1>
      </div>
      
      <nav className="flex-1 py-6 space-y-2 overflow-y-auto no-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={24} />
              <span className="hidden md:block font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-2 py-2 text-slate-400 hover:bg-slate-800 hover:text-yellow-400 rounded-lg transition-colors"
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span className="hidden md:block text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="flex items-center gap-3 text-slate-400 mb-2 px-2 py-2 bg-slate-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {activeStaff?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{activeStaff?.name || 'Staff'}</p>
            <p className="text-[10px] uppercase font-bold text-slate-500">{activeStaff?.role || 'N/A'}</p>
          </div>
        </div>

        <button 
            onClick={handleSwitchUser}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-2 py-2 text-orange-400 hover:bg-slate-800 hover:text-orange-300 rounded-lg transition-colors"
            title="Switch active staff member"
        >
            <Users size={20} />
            <span className="hidden md:block text-sm font-bold">Switch User</span>
        </button>
        
        <button 
            onClick={handleSystemLogout}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-2 py-2 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors"
            title="Disconnect Store"
        >
            <LogOut size={20} />
            <span className="hidden md:block text-sm font-medium">System Logout</span>
        </button>
      </div>
    </div>
  );
};