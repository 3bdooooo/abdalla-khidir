import React from 'react';
import { MOCK_USERS } from '../services/mockDb';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Activity } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t, toggleLanguage, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative font-sans">
      <button 
        onClick={toggleLanguage} 
        className="absolute top-6 right-6 text-text-muted hover:text-brand flex items-center gap-2 bg-white border border-border px-4 py-2 rounded-full shadow-sm transition-all"
      >
        <Globe size={16} />
        <span className="text-sm font-medium">{language === 'en' ? 'العربية' : 'English'}</span>
      </button>

      <div className="bg-surface border border-border p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Activity size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{t('appName')}</h1>
          <p className="text-text-muted font-medium">{t('login_title')}</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 text-center">{t('select_persona')}</p>
          {MOCK_USERS.map((user) => (
            <button
              key={user.user_id}
              onClick={() => onLogin(user)}
              className="w-full p-4 text-start border border-border bg-gray-50 rounded-xl hover:border-brand hover:bg-white hover:shadow-md transition-all group"
            >
              <div className="font-bold text-gray-900 group-hover:text-brand">{user.name}</div>
              <div className="text-sm text-text-muted group-hover:text-gray-600">{user.role}</div>
            </button>
          ))}
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
            &copy; 2024 A2M Medical Systems
        </div>
      </div>
    </div>
  );
};