
import React, { useState, useEffect } from 'react';
import { User, UserRole, Asset, InventoryPart, WorkOrder } from './types';
import * as api from './services/api';
import { Layout } from './components/Layout';
import { SupervisorView } from './components/SupervisorView';
import { TechnicianView } from './components/TechnicianView';
import { NurseView } from './components/NurseView';
import { InspectorView } from './components/InspectorView';
import { Login } from './components/Login';
import { LanguageProvider } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // App State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inventory, setInventory] = useState<InventoryPart[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [badges, setBadges] = useState<{ [key: string]: number }>({});

  // Load Data from Supabase
  const refreshData = async () => {
    try {
        const [a, i, w, u] = await Promise.all([
            api.fetchAssets(),
            api.fetchInventory(),
            api.fetchWorkOrders(),
            api.fetchUsers()
        ]);
        setAssets(a);
        setInventory(i);
        setWorkOrders(w);
        setUsers(u);
    } catch (e) {
        console.error("Failed to load data", e);
    }
  };

  // Calculate Badges (Only when logged in and data changes)
  useEffect(() => {
    if (!user) return;
    
    const criticalWOs = workOrders.filter(wo => wo.status !== 'Closed' && (wo.priority === 'Critical' || wo.priority === 'High')).length;
    const overdueCal = assets.filter(a => a.next_calibration_date && new Date(a.next_calibration_date) < new Date()).length;
    const lowStock = inventory.filter(p => p.current_stock <= p.min_reorder_level).length;

    setBadges({
        maintenance: criticalWOs,
        calibration: overdueCal,
        inventory: lowStock
    });
  }, [workOrders, assets, inventory, user]);

  // Handle Login & Initial Data Load
  const handleLogin = async (selectedUser: User) => {
    setLoading(true);
    try {
        setUser(selectedUser);
        
        // Seed DB if needed and fetch all data
        await api.seedDatabaseIfEmpty();
        await refreshData();

        // Route based on role
        if (selectedUser.role === UserRole.SUPERVISOR || selectedUser.role === UserRole.ADMIN) setCurrentView('dashboard');
        else if (selectedUser.role === UserRole.TECHNICIAN || selectedUser.role === UserRole.VENDOR) setCurrentView('tasks');
        else if (selectedUser.role === UserRole.INSPECTOR) setCurrentView('inspector');
        else setCurrentView('report');
    } catch (error) {
        console.error("Login process failed:", error);
        alert("Failed to connect to system. Starting in Offline Mode.");
        setUser(selectedUser); // Allow login anyway
    } finally {
        setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
    setAssets([]); 
    setWorkOrders([]);
  };

  // Handle Data Mutations
  const handleAddAsset = async (newAsset: Asset) => {
    await api.addAsset(newAsset);
    refreshData();
  };

  const handleAddUser = async (newUser: User) => {
    await api.addUser(newUser);
    refreshData();
  }

  // Render Loading Spinner
  if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
            <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-brand font-bold text-lg animate-pulse">Accessing A2M MED System...</div>
        </div>
      );
  }

  // Render Login if no user
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Render Main App
  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentView={currentView}
      onNavigate={setCurrentView}
      badgeCounts={badges}
    >
      {(user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) && (
        <SupervisorView 
          currentView={currentView}
          currentUser={user}
          assets={assets}
          workOrders={workOrders}
          inventory={inventory}
          users={users}
          onAddAsset={handleAddAsset}
          onAddUser={handleAddUser}
          refreshData={refreshData}
          onNavigate={setCurrentView}
        />
      )}

      {(user.role === UserRole.TECHNICIAN || user.role === UserRole.VENDOR) && (
        <TechnicianView 
          currentUser={user}
          userWorkOrders={workOrders.filter(wo => wo.assigned_to_id === user.user_id)}
          allWorkOrders={workOrders}
          users={users}
          inventory={inventory}
          refreshData={refreshData}
        />
      )}

      {user.role === UserRole.NURSE && (
        <NurseView 
          user={user}
          assets={assets}
          workOrders={workOrders}
          refreshData={refreshData}
        />
      )}

      {user.role === UserRole.INSPECTOR && (
        <InspectorView
          assets={assets}
          workOrders={workOrders}
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
