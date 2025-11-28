
import React from 'react';
import { User, UserRole } from '../types';
import { LogOut, LayoutDashboard, Boxes, Wrench, Menu, Package, Activity, FileText, Globe, Users as UsersIcon, ChevronRight, Bell, Radio } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
  badgeCounts?: { [key: string]: number };
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, currentView, onNavigate, children, badgeCounts }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { t, toggleLanguage, language } = useLanguage();

  const LangToggle = () => (
    <button 
        onClick={toggleLanguage}
        className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-brand transition-colors"
        title="Switch Language"
    >
        <Globe size={18} />
    </button>
  );

  // Mobile Header for limited roles
  if (user.role === UserRole.NURSE || user.role === UserRole.TECHNICIAN || user.role === UserRole.VENDOR) {
    return (
      <div className="min-h-screen bg-background text-text-main font-sans">
        <header className="bg-white border-b border-border h-16 px-4 flex justify-between items-center sticky top-0 z-50 shadow-sm/50 backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white shadow-glow">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 leading-none">{t('appName')}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{user.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <button onClick={onLogout} className="text-sm font-medium text-text-muted hover:text-danger transition-colors">{t('logout')}</button>
          </div>
        </header>
        <main className="p-4 lg:p-6 max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    );
  }

  // Supervisor / Admin Sidebar Layout
  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'assets', label: t('nav_assets'), icon: Boxes },
    { id: 'maintenance', label: t('nav_maintenance'), icon: Wrench },
    { id: 'inventory', label: t('nav_inventory'), icon: Package },
    { id: 'calibration', label: t('nav_calibration'), icon: Activity },
    { id: 'analysis', label: t('nav_analysis'), icon: FileText },
    { id: 'rfid', label: t('nav_rfid'), icon: Radio }, // Added RFID Menu
  ];

  if (user.role === UserRole.ADMIN) {
    navItems.push({ id: 'users', label: t('nav_users'), icon: UsersIcon });
  }

  return (
    <div className="min-h-screen bg-background flex font-sans text-text-main overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 start-0 z-50 w-72 bg-white border-e border-border shadow-soft transform transition-transform duration-300 ease-out
        ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}
        lg:relative lg:translate-x-0 flex flex-col
      `}>
        {/* Brand Area */}
        <div className="h-20 flex items-center px-8 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-dark rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
                <Activity size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t('appName')}</h1>
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Enterprise</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2 mt-4">Main Menu</div>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const badge = badgeCounts?.[item.id] || 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-brand text-white shadow-lg shadow-brand/25' 
                      : 'text-text-muted hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon size={20} className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand'} transition-colors rtl:rotate-180`} />
                  <span className="flex-1 text-start font-medium text-sm">{item.label}</span>
                  
                  {badge > 0 && (
                    <span className={`
                        px-2 py-0.5 rounded-md text-[10px] font-bold 
                        ${isActive ? 'bg-white/20 text-white' : 'bg-danger/10 text-danger'}
                    `}>
                        {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  
                  {isActive && <ChevronRight size={16} className="text-white/50 rtl:rotate-180" />}
                </button>
              );
            })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-border/50 bg-gray-50/50">
          <div className="flex items-center justify-between mb-4 px-2">
             <LangToggle />
             <button className="p-2 text-text-muted hover:text-brand transition-colors rounded-lg hover:bg-gray-100 relative">
                 <Bell size={18} />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
             </button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl shadow-sm">
             <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                {user.name[0]}
             </div>
             <div className="flex-1 min-w-0 text-start">
                <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-text-muted truncate">{user.role}</p>
             </div>
             <button onClick={onLogout} className="text-text-muted hover:text-danger p-1">
                 <LogOut size={18} className="rtl:rotate-180" />
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background relative">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-border h-16 px-4 flex justify-between items-center sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-bold text-brand flex items-center gap-2 text-lg"><Activity size={20}/> {t('appName')}</span>
          <div className="w-8"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8 pb-10">
              {children}
          </div>
        </main>
      </div>
      
      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
