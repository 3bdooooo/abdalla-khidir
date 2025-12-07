
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { LogOut, LayoutDashboard, Boxes, Wrench, Menu, Package, Activity, FileText, Globe, Users as UsersIcon, ChevronRight, Bell, Radio, Home, ClipboardList, ScanLine, UserCircle, X, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { t, toggleLanguage, language, dir } = useLanguage();

  const LangToggle = () => (
    <button 
        onClick={toggleLanguage}
        className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-brand transition-colors"
        title="Switch Language"
    >
        <Globe size={18} />
    </button>
  );

  // Logo Component
  const BrandLogo = ({ compact = false }: { compact?: boolean }) => (
      <div className="flex items-center gap-3 select-none">
        <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-dark rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/20 shrink-0 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 rotate-45 transform translate-y-1/2 translate-x-1/2"></div>
            <Activity size={22} strokeWidth={2.5} className="relative z-10"/>
        </div>
        {!compact && (
            <div className="flex flex-col">
                <h1 className="text-2xl font-black text-gray-900 leading-none tracking-tight font-sans">
                    A2M <span className="text-brand">MED</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-0.5 w-3 bg-brand rounded-full opacity-50"></div>
                    <p className="text-[9px] uppercase tracking-[0.25em] text-text-muted font-bold">Systems</p>
                </div>
            </div>
        )}
      </div>
  );

  // --- NOTIFICATION PANEL ---
  const notifications = [
      { id: 1, type: 'critical', msg: t('alert_boundary_msg'), time: '2m ago' },
      { id: 2, type: 'warning', msg: 'Low stock: Ventilator Filters', time: '1h ago' },
      { id: 3, type: 'success', msg: t('wo_assigned_msg'), time: '3h ago' },
  ];

  // --- MOBILE / TABLET LAYOUT (Nurse, Technician, Vendor) ---
  if (user.role === UserRole.NURSE || user.role === UserRole.TECHNICIAN || user.role === UserRole.VENDOR) {
    return (
      <div className="min-h-screen bg-background text-text-main font-sans pb-24 md:pb-0">
        {/* Top Header (Mobile) */}
        <header className="bg-white/90 backdrop-blur-md border-b border-border h-16 px-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <BrandLogo compact={false} />
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={onLogout} className="p-2 text-text-muted hover:text-danger transition-colors">
                <LogOut size={20} className="rtl:rotate-180"/>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
          {children}
        </main>

        {/* Bottom Navigation Bar (Mobile Only) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-6 py-2 pb-safe z-50 md:hidden flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <button 
                onClick={() => onNavigate('dashboard')} 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'dashboard' || currentView === 'tasks' || currentView === 'report' ? 'text-brand' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <Home size={24} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{t('nav_dashboard')}</span>
            </button>
            
            {/* Contextual Middle Button */}
            {user.role === UserRole.TECHNICIAN && (
                <button className="flex flex-col items-center gap-1 p-2 text-gray-400">
                    <div className="w-12 h-12 bg-brand text-white rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-brand/30 border-4 border-white">
                        <ScanLine size={24} />
                    </div>
                    <span className="text-[10px] font-bold">Scan</span>
                </button>
            )}

            <button 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${currentView === 'profile' ? 'text-brand' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <UserCircle size={24} strokeWidth={currentView === 'profile' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Profile</span>
            </button>
        </nav>
      </div>
    );
  }

  // --- INSPECTOR LAYOUT (Simplified Sidebar) ---
  if (user.role === UserRole.INSPECTOR) {
      const sidebarTransform = isSidebarOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full');
      return (
        <div className="min-h-screen bg-background flex font-sans text-text-main overflow-hidden">
            <aside className={`fixed inset-y-0 start-0 z-50 w-72 bg-white border-e border-border shadow-soft transform transition-transform duration-300 ease-out ${sidebarTransform} lg:relative lg:translate-x-0 flex flex-col`}>
                <div className="h-24 flex items-center px-8 border-b border-border/50">
                    <BrandLogo />
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2 mt-4">Audit Mode</div>
                    <button onClick={() => onNavigate('inspector')} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-brand text-white shadow-lg shadow-brand/25 transition-all">
                        <ShieldCheck size={20} />
                        <span className="flex-1 text-start font-medium text-sm">{t('nav_inspector')}</span>
                        <ChevronRight size={16} className="text-white/50 rtl:rotate-180" />
                    </button>
                </nav>
                <div className="border-t border-border/50 bg-gray-50/50 p-4">
                    <div className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">{user.name[0]}</div>
                        <div className="flex-1 min-w-0 text-start">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-text-muted truncate">Auditor</p>
                        </div>
                        <button onClick={onLogout} className="text-text-muted hover:text-danger p-1"><LogOut size={18} className="rtl:rotate-180" /></button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth relative">
                {children}
            </main>
        </div>
      );
  }

  // --- DESKTOP LAYOUT (Supervisor, Admin) ---
  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'assets', label: t('nav_assets'), icon: Boxes },
    { id: 'maintenance', label: t('nav_maintenance'), icon: Wrench },
    { id: 'inventory', label: t('nav_inventory'), icon: Package },
    { id: 'calibration', label: t('nav_calibration'), icon: Activity },
    { id: 'analysis', label: t('nav_analysis'), icon: FileText },
    { id: 'rfid', label: t('nav_rfid'), icon: Radio },
  ];

  if (user.role === UserRole.ADMIN) {
    navItems.push({ id: 'users', label: t('nav_users'), icon: UsersIcon });
  }

  // Logic for RTL Sidebar transition
  const sidebarTransform = isSidebarOpen ? 'translate-x-0' : (dir === 'rtl' ? 'translate-x-full' : '-translate-x-full');

  return (
    <div className="min-h-screen bg-background flex font-sans text-text-main overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 start-0 z-50 w-72 bg-white border-e border-border shadow-soft transform transition-transform duration-300 ease-out
        ${sidebarTransform}
        lg:relative lg:translate-x-0 flex flex-col
      `}>
        {/* Brand Area */}
        <div className="h-24 flex items-center px-8 border-b border-border/50">
          <BrandLogo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 mb-2 mt-4">{t('op_overview')}</div>
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
                      : 'text-text-muted hover:bg-brand-soft hover:text-brand-dark'
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

        {/* Footer: Partner Logo & User Profile */}
        <div className="border-t border-border/50 bg-gray-50/50 flex flex-col">
          
          {/* Secondary Logo (Tabuk Cluster) */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
               <img 
                  src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/Ministry_of_Health_Saudi_Arabia_Logo.svg/1200px-Ministry_of_Health_Saudi_Arabia_Logo.svg.png" 
                  className="h-8 w-auto object-contain grayscale" 
                  alt="MOH Logo"
                  onError={(e) => e.currentTarget.style.display = 'none'}
               />
               <div className="text-[9px] font-bold text-gray-400 leading-tight uppercase tracking-wide">
                   Tabuk Health<br/>Cluster
               </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-4 px-2">
               <LangToggle />
               <div className="relative">
                   <button 
                      onClick={() => setIsNotifOpen(!isNotifOpen)}
                      className="p-2 text-text-muted hover:text-brand transition-colors rounded-lg hover:bg-gray-100 relative"
                   >
                       <Bell size={18} />
                       {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>}
                   </button>
                   
                   {/* Notification Dropdown */}
                   {isNotifOpen && (
                       <div className="absolute bottom-full mb-2 start-0 w-64 bg-white rounded-xl shadow-xl border border-border p-2 animate-in slide-in-from-bottom-2 z-50">
                           <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-gray-100">
                               <span className="text-xs font-bold text-gray-700">Notifications</span>
                               <button onClick={() => setIsNotifOpen(false)}><X size={14} className="text-gray-400 hover:text-gray-600"/></button>
                           </div>
                           <div className="space-y-1 max-h-48 overflow-y-auto">
                               {notifications.map(n => (
                                   <div key={n.id} className="p-2 rounded-lg hover:bg-gray-50 flex gap-2 items-start">
                                       <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.type === 'critical' ? 'bg-danger' : n.type === 'warning' ? 'bg-warning' : 'bg-success'}`}></div>
                                       <div>
                                           <p className="text-xs text-gray-800 leading-tight">{n.msg}</p>
                                           <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}
               </div>
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
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background relative">
        {/* Mobile Header (For Admins on small screens) */}
        <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-border h-16 px-4 flex justify-between items-center sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
          <BrandLogo compact={true} />
          <div className="w-8"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
