
import React, { useState } from 'react';
import { MOCK_USERS } from '../services/mockDb';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Activity, Mail, Lock, LogIn, ChevronDown, User as UserIcon } from 'lucide-react';
import * as api from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t, toggleLanguage, language } = useLanguage();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Toggle for Demo Personas
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative font-sans">
      <button 
        onClick={toggleLanguage} 
        className="absolute top-6 right-6 text-text-muted hover:text-brand flex items-center gap-2 bg-white border border-border px-4 py-2 rounded-full shadow-sm transition-all z-10"
      >
        <Globe size={16} />
        <span className="text-sm font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
      </button>

      <div className="bg-surface border border-border rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-brand/5 to-white p-8 pb-6 text-center border-b border-gray-100">
          <div className="w-16 h-16 bg-brand text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand/30">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">{t('appName')}</h1>
          <p className="text-text-muted text-sm font-medium">{t('login_subtitle')}</p>
        </div>

        <div className="p-8 pt-6">
            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-danger/10 text-danger text-sm font-bold px-4 py-3 rounded-lg border border-danger/20 flex items-center gap-2">
                        <span className="block w-1.5 h-1.5 rounded-full bg-danger"></span> {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('email_label')}</label>
                    <div className="relative">
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                            placeholder="user@hospital.com"
                        />
                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('password_label')}</label>
                    <div className="relative">
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
                            placeholder="••••••••"
                        />
                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {t('logging_in')}
                        </>
                    ) : (
                        <>
                            <LogIn size={20} /> {t('btn_login')}
                        </>
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-surface text-text-muted font-medium">{t('or_continue_as')}</span>
                </div>
            </div>

            {/* Demo Personas Toggle */}
            <div>
                <button 
                    onClick={() => setShowDemoOptions(!showDemoOptions)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700"
                >
                    <span className="flex items-center gap-2"><UserIcon size={16}/> {t('select_persona')}</span>
                    <ChevronDown size={16} className={`transition-transform ${showDemoOptions ? 'rotate-180' : ''}`} />
                </button>
                
                {showDemoOptions && (
                    <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                        {MOCK_USERS.map((user) => (
                            <button
                                key={user.user_id}
                                onClick={() => handleDemoLogin(user)}
                                className="w-full p-3 text-start border border-border bg-white rounded-lg hover:border-brand hover:bg-brand/5 transition-all group flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold text-gray-900 group-hover:text-brand text-sm">{user.name}</div>
                                    <div className="text-xs text-text-muted">{user.role}</div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-brand">
                                    <LogIn size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
            &copy; 2024 A2M Medical Systems
        </div>
      </div>
    </div>
  );
};
