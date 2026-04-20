import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isCollapsed?: boolean;
}

const SidebarItem = ({ to, icon: Icon, label, onClick, isCollapsed }: SidebarItemProps) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
      isActive 
        ? "bg-blue-50 text-blue-600 font-medium" 
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
      isCollapsed && "justify-center px-0"
    )}
  >
    <Icon className={cn(
      "w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0",
      "group-[.active]:text-blue-600"
    )} />
    {!isCollapsed && (
      <>
        <span className="truncate">{label}</span>
        <ChevronRight className={cn(
          "w-4 h-4 ml-auto opacity-0 transition-all duration-200",
          "group-hover:opacity-100 group-hover:translate-x-1"
        )} />
      </>
    )}
    {isCollapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {label}
      </div>
    )}
  </NavLink>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-white border-r border-gray-100 z-50 transition-all duration-300 lg:translate-x-0 lg:static",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn(
            "p-6 flex items-center gap-3 relative",
            isCollapsed && "justify-center p-4"
          )}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-gray-900 leading-tight truncate">Sistem SPPD</h1>
                <p className="text-xs text-gray-500 font-medium truncate">Dinsos PPPA Blora</p>
              </div>
            )}
            
            {/* Collapse Toggle Button (Desktop) */}
            <button
              onClick={() => setCollapsed(!isCollapsed)}
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-100 rounded-full items-center justify-center text-gray-400 hover:text-blue-600 shadow-sm z-10 transition-transform"
              style={{ transform: `translateY(-50%) rotate(${isCollapsed ? '0' : '180'}deg)` }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 px-4 space-y-1 mt-4",
            isCollapsed && "px-2"
          )}>
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} onClick={() => setSidebarOpen(false)} />
            <SidebarItem to="/sppd" icon={FileText} label="Data SPPD" isCollapsed={isCollapsed} onClick={() => setSidebarOpen(false)} />
            <SidebarItem to="/karyawan" icon={Users} label="Data Karyawan" isCollapsed={isCollapsed} onClick={() => setSidebarOpen(false)} />
            <SidebarItem to="/pengaturan" icon={Settings} label="Utilitas/Pengaturan" isCollapsed={isCollapsed} onClick={() => setSidebarOpen(false)} />
          </nav>

          {/* User Profile & Logout */}
          <div className={cn(
            "p-4 border-t border-gray-100",
            isCollapsed && "p-2"
          )}>
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group",
                isCollapsed && "justify-center px-0"
              )}
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1 shrink-0" />
              {!isCollapsed && <span className="font-medium">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{auth.currentUser?.displayName || 'Admin'}</p>
              <p className="text-xs text-gray-500">{auth.currentUser?.email}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full border-2 border-white shadow-sm overflow-hidden">
              <img 
                src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'Admin'}&background=random`} 
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
