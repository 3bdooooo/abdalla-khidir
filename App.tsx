
import React, { useState, useEffect } from 'react';
import { User, UserRole, Asset } from './types';
import { getAssets, getInventory, getWorkOrders, getTechnicianWorkOrders } from './services/mockDb';
import { Layout } from './components/Layout';
import { SupervisorView } from './components/SupervisorView';
import { TechnicianView } from './components/TechnicianView';
import { NurseView } from './components/NurseView';
import { Login } from './components/Login';
import { LanguageProvider } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // App State (Loaded from Mock Service)
  const [assets, setAssets] = useState(getAssets());
  const [inventory, setInventory] = useState(getInventory());
  const [workOrders, setWorkOrders] = useState(getWorkOrders());
  
  // Refresh Data Handler
  const refreshData = () => {
    setAssets([...getAssets()]);
    setInventory([...getInventory()]);
    setWorkOrders([...getWorkOrders()]);
  };

  // Handle Add Asset
  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [...prev, newAsset]);
  };

  // Handle Login
  const handleLogin = (selectedUser: User) => {
    setUser(selectedUser);
    if (selectedUser.role === UserRole.SUPERVISOR || selectedUser.role === UserRole.ADMIN) setCurrentView('dashboard');
    else if (selectedUser.role === UserRole.TECHNICIAN) setCurrentView('tasks');
    else setCurrentView('report');
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  // If not logged in
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      {(user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) && (
        <SupervisorView 
          currentView={currentView}
          assets={assets}
          workOrders={workOrders}
          inventory={inventory}
          onAddAsset={handleAddAsset}
          refreshData={refreshData}
          onNavigate={setCurrentView}
        />
      )}

      {user.role === UserRole.TECHNICIAN && (
        <TechnicianView 
          userWorkOrders={getTechnicianWorkOrders(user.user_id)}
          inventory={inventory}
          refreshData={refreshData}
        />
      )}

      {user.role === UserRole.NURSE && (
        <NurseView 
          user={user}
          assets={assets}
        />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
