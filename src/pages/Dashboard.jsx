import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MessageSquare, BarChart3, Settings, LogOut, Moon, Sun, Menu, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HomePage from './HomePage';
import EmployeesPage from './EmployeesPage';
import FeedbackPage from './FeedbackPage';
import AnalyticsPage from './AnalyticsPage';
import SettingsPage from './SettingsPage';
import LeavesPage from './LeavesPage';
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog';
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';

export default function Dashboard({ user, onLogout }) {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Apply dark mode on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+1': () => navigate('/dashboard'),
    'ctrl+2': () => navigate('/dashboard/employees'),
    'ctrl+3': () => navigate('/dashboard/feedback'),
    'ctrl+4': () => {
      if (user.role === 'ADMIN' || user.role === 'HR') {
        navigate('/dashboard/analytics');
      }
    },
    'ctrl+5': () => navigate('/dashboard/settings'),
    'ctrl+/': (e) => {
      e.preventDefault();
      setShortcutsOpen(true);
    },
  }, [navigate, user.role]);

  const navigation = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Employees', path: '/dashboard/employees', icon: Users },
    { name: 'Feedback', path: '/dashboard/feedback', icon: MessageSquare },
    { name: 'Leaves', path: '/dashboard/leaves', icon: Calendar },
    ...(user.role === 'ADMIN' || user.role === 'HR'
      ? [{ name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 }]
      : []),
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } fixed md:static inset-y-0 left-0 z-50 w-64 transition-all duration-300 ease-in-out bg-card border-r border-border flex flex-col overflow-hidden`}
      >
        <div className="p-4 md:p-6 border-b border-border">
          <h1 className="text-xl md:text-2xl font-bold text-primary">EMIS</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Employee Management</p>
        </div>

        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-2 md:p-4 border-t border-border space-y-2">
          <div className="px-2 md:px-4 py-2">
            <p className="text-xs md:text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onLogout}
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-lg md:text-xl font-semibold truncate">
              {navigation.find(n => isActive(n.path))?.name || 'Dashboard'}
            </h2>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/employees" element={<EmployeesPage user={user} />} />
            <Route path="/feedback" element={<FeedbackPage user={user} />} />
            <Route path="/leaves" element={<LeavesPage user={user} />} />
            <Route path="/analytics" element={<AnalyticsPage user={user} />} />
            <Route path="/settings" element={<SettingsPage user={user} />} />
          </Routes>
        </main>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
