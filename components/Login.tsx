
import React, { useState } from 'react';
import { MOCK_USERS } from '../services/mockDb';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Activity, Mail, Lock, LogIn, ChevronDown, User as UserIcon, HeartPulse, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex font-sans">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark via-brand to-brand-light opacity-90"></div>
        
        <div className="relative z-10 text-white max-w-lg">
           <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-white/10 shadow-glow">
             <Activity size={40} className="text-white" />
           </div>
           <h1 className="text-5xl font-bold mb-6 leading-tight">Next-Gen <br/>Medical Asset Intelligence.</h1>
           <p className="text-lg text-blue-100 mb-8 leading-relaxed">
             Advanced predictive maintenance, real-time tracking, and AI-powered diagnostics for modern healthcare facilities.
           </p>
           
           <div className="flex gap-6 mt-12">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-lg"><HeartPulse size={20}/></div>
               <div>
                 <div className="font-bold text-lg">99.9%</div>
                 <div className="text-xs text-blue-200 uppercase tracking-wider">Uptime</div>
               </div>
             </div>
             <div className="flex items-center gap-3">
               <div className="p-2 bg-white/10 rounded-lg"><ShieldCheck size={20}/></div>
               <div>
                 <div className="font-bold text-lg">ISO</div>
                 <div className="text-xs text-blue-200 uppercase tracking-wider">Compliant</div>
               </div>
             </div>
           </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-light/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
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
          <div className="text-center lg:text-left">
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

              <button type="submit" disabled={isLoading} className="btn-primary w-full shadow-brand/30">
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

          <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="px-2 bg-white text-gray-400">Or Access Demo</span>
              </div>
          </div>

          <div>
              <button 
                  onClick={() => setShowDemoOptions(!showDemoOptions)}
                  className="w-full btn-secondary justify-between text-sm"
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
        
        <div className="absolute bottom-6 text-center text-xs text-gray-400">
            &copy; 2024 A2M Medical Systems. Secure & HIPAA Compliant.
        </div>
      </div>
    </div>
  );
};
