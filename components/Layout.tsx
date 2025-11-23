import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, LayoutDashboard, Boxes, Wrench, Menu, Package, Activity, FileText, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, currentView, onNavigate, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { t, toggleLanguage, language } = useLanguage();

  const LangToggle = () => (
    <button 
        onClick={toggleLanguage}
        className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-brand transition-colors flex items-center gap-2 text-sm font-medium"
        title="Switch Language"
    >
        <Globe size={18} />
        <span>{language === 'en' ? 'AR' : 'EN'}</span>
    </button>
  );

  // Mobile-first simplified header for non-supervisors
  if (user.role === UserRole.NURSE || user.role === UserRole.TECHNICIAN) {
    return (
      <div className="min-h-screen bg-background text-text-main font-sans">
        <header className="bg-surface border-b border-border p-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="font-bold text-xl tracking-tight text-brand flex items-center gap-2">
              <Activity size={24} />
              {t('appName')}
            </div>
            <span className="text-xs bg-gray-100 text-text-muted border border-border px-2 py-1 rounded-full font-medium">{user.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={onLogout} className="text-sm font-medium text-text-muted hover:text-danger transition-colors">{t('logout')}</button>
          </div>
        </header>
        <main className="p-4 max-w-4xl mx-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop-first Sidebar layout for Supervisors/Admins
  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'assets', label: t('nav_assets'), icon: Boxes },
    { id: 'maintenance', label: t('nav_maintenance'), icon: Wrench },
    { id: 'inventory', label: t('nav_inventory'), icon: Package },
    { id: 'calibration', label: t('nav_calibration'), icon: Activity },
    { id: 'analysis', label: t('nav_analysis'), icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background flex font-sans text-text-main">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 start-0 z-50 w-64 bg-surface border-e border-border shadow-sm transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}
        md:relative md:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="bg-brand text-white p-2 rounded-lg shadow-lg shadow-brand/30">
                <Activity size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('appName')}</h1>
                <p className="text-xs text-text-muted font-medium">Medical CMMS</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-start font-medium ${
                  currentView === item.id 
                    ? 'bg-brand/10 text-brand border border-brand/10' 
                    : 'text-text-muted hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} className={currentView === item.id ? 'text-brand' : 'text-gray-400 rtl:rotate-180'} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border bg-gray-50/50 space-y-3">
            <div className="flex justify-center">
                <LangToggle />
            </div>
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-brand font-bold shadow-sm">
                {user.name[0]}
              </div>
              <div className="flex-1 overflow-hidden text-start">
                <p className="text-sm font-semibold truncate text-gray-900">{user.name}</p>
                <p className="text-xs text-text-muted">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-2 text-danger hover:bg-red-50 border border-transparent hover:border-red-100 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut size={16} className="rtl:rotate-180" /> {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface border-b border-border p-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-text-muted hover:text-brand">
            <Menu />
          </button>
          <span className="font-bold text-brand flex items-center gap-2"><Activity size={18}/> {t('appName')}</span>
          <div className="w-6" /> {/* Spacer */}
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};