
import React, { useState } from 'react';
import { MOCK_USERS } from '../services/mockDb';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Mail, Lock, LogIn, ChevronDown, User as UserIcon, HeartPulse, ShieldCheck, Activity } from 'lucide-react';
import * as api from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t, toggleLanguage, language } = useLanguage();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const user = await api.authenticateUser(email, password);
        if (user) {
            onLogin(user);
        } else {
            setError(t('login_error'));
        }
    } catch (err) {
        setError(t('login_error'));
    } finally {
        setIsLoading(false);
    }
  };

  const handleDemoLogin = (user: User) => {
      onLogin(user);
  };

  // Custom A2M Logo Component
  const A2MLogo = ({ className = "h-12" }: { className?: string }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-brand rounded-xl rotate-6 opacity-20"></div>
            <div className="absolute inset-0 bg-brand rounded-xl -rotate-3 opacity-20"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-brand-light to-brand rounded-xl shadow-lg flex items-center justify-center text-white">
                <Activity size={28} strokeWidth={2.5} />
            </div>
            {/* Medical Cross Badge */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            </div>
        </div>
        <div>
            <h1 className="font-black text-2xl tracking-tighter text-gray-900 leading-none">
                A2M <span className="text-brand">MED</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Systems</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/90 via-brand/80 to-slate-900/90"></div>
        
        <div className="relative z-10 text-white max-w-lg">
           {/* Logo Display */}
           <div className="mb-10 animate-in slide-in-from-left-4 duration-700">
               <div className="flex items-center gap-4 mb-4">
                   <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-glow">
                        <Activity size={36} className="text-white" />
                   </div>
                   <div>
                       <h1 className="text-5xl font-black tracking-tight">A2M <span className="text-blue-300">MED</span></h1>
                       <p className="text-sm font-medium text-blue-200 uppercase tracking-widest border-t border-blue-400/30 pt-1 mt-1">Intelligent Healthcare Assets</p>
                   </div>
               </div>
           </div>

           <h2 className="text-3xl font-bold mb-6 leading-tight text-white/90">
             The Future of Medical<br/>Maintenance.
           </h2>
           <p className="text-lg text-blue-100 mb-8 leading-relaxed font-light">
             Seamlessly integrated with Tabuk Health Cluster standards for predictive maintenance and real-time asset tracking.
           </p>
           
           <div className="flex gap-6 mt-12">
             <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
               <div className="p-2 bg-green-500/20 text-green-300 rounded-lg"><HeartPulse size={20}/></div>
               <div>
                 <div className="font-bold text-lg">99.9%</div>
                 <div className="text-xs text-blue-200 uppercase tracking-wider">Uptime</div>
               </div>
             </div>
             <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
               <div className="p-2 bg-blue-500/20 text-blue-300 rounded-lg"><ShieldCheck size={20}/></div>
               <div>
                 <div className="font-bold text-lg">JCI</div>
                 <div className="text-xs text-blue-200 uppercase tracking-wider">Ready</div>
               </div>
             </div>
           </div>

           {/* Strategic Partner Logo (Tabuk Cluster) */}
           <div className="mt-20 border-t border-white/10 pt-6">
               <p className="text-xs text-blue-300 uppercase tracking-widest mb-4 font-bold opacity-70">Strategic Deployment</p>
               <div className="flex items-center gap-4 opacity-90 grayscale hover:grayscale-0 transition-all duration-500">
                   {/* Placeholder for Tabuk Logo - Using a styled text representation if image fails */}
                   <div className="flex items-center gap-3">
                       <img 
                        src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/Ministry_of_Health_Saudi_Arabia_Logo.svg/1200px-Ministry_of_Health_Saudi_Arabia_Logo.svg.png" 
                        className="h-12 w-auto object-contain brightness-0 invert" 
                        alt="MOH Logo"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                       />
                       <div className="h-10 w-px bg-white/30 mx-2"></div>
                       <div className="text-white text-right">
                           <div className="font-bold text-lg leading-none">تجمع تبوك الصحي</div>
                           <div className="text-[10px] uppercase tracking-wide opacity-80">Tabuk Health Cluster</div>
                       </div>
                   </div>
               </div>
           </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-8 relative">
        <button 
          onClick={toggleLanguage} 
          className="absolute top-8 right-8 text-text-muted hover:text-brand flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:border-brand/30 transition-all text-sm font-medium"
        >
          <Globe size={16} />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center lg:text-left mb-10">
             <div className="lg:hidden mb-6 flex justify-center">
                 <A2MLogo />
             </div>
             <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('welcome')} Back</h2>
             <p className="text-text-muted">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                  <div className="bg-red-50 text-danger text-sm font-medium px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger"></span> {error}
                  </div>
              )}
              
              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">{t('email_label')}</label>
                  <div className="relative group">
                      <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input-modern pl-11"
                          placeholder="name@hospital.com"
                      />
                      <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand transition-colors" size={18} />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">{t('password_label')}</label>
                  <div className="relative group">
                      <input 
                          type="password" 
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-modern pl-11"
                          placeholder="••••••••"
                      />
                      <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand transition-colors" size={18} />
                  </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-brand focus:ring-brand" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-brand font-medium hover:underline">Forgot password?</a>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full shadow-brand/30 py-4 text-base">
                  {isLoading ? (
                      <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          {t('logging_in')}
                      </>
                  ) : (
                      <>
                          {t('btn_login')} <LogIn size={18} />
                      </>
                  )}
              </button>
          </form>

          <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="px-2 bg-white text-gray-400">Or Access Demo</span>
              </div>
          </div>

          <div>
              <button 
                  onClick={() => setShowDemoOptions(!showDemoOptions)}
                  className="w-full btn-secondary justify-between text-sm py-3"
              >
                  <span className="flex items-center gap-2"><UserIcon size={16} className="text-gray-500"/> {t('select_persona')}</span>
                  <ChevronDown size={16} className={`transition-transform text-gray-400 ${showDemoOptions ? 'rotate-180' : ''}`} />
              </button>
              
              {showDemoOptions && (
                  <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
                      {MOCK_USERS.map((user) => (
                          <button
                              key={user.user_id}
                              onClick={() => handleDemoLogin(user)}
                              className="w-full p-3 flex items-center justify-between border border-border bg-gray-50/50 hover:bg-white hover:border-brand/50 hover:shadow-sm rounded-xl transition-all group"
                          >
                              <div className="text-left">
                                  <div className="font-semibold text-gray-900 text-sm group-hover:text-brand">{user.name}</div>
                                  <div className="text-xs text-text-muted">{user.role}</div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-brand group-hover:border-brand/30">
                                  <LogIn size={14} />
                              </div>
                          </button>
                      ))}
                  </div>
              )}
          </div>
        </div>
        
        <div className="absolute bottom-6 text-center">
            <p className="text-xs text-gray-400">&copy; 2024 A2M Medical Systems. Tabuk Cluster Compliant.</p>
        </div>
      </div>
    </div>
  );
};
