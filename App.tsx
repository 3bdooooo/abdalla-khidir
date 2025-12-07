
import React, { useState, useEffect } from 'react';
import { User, UserRole, Asset, InventoryPart, WorkOrder } from './types';
import { getAssets, getInventory, getWorkOrders, getTechnicianWorkOrders as getMockTechWOs } from './services/mockDb'; // Keep for fallback types/helpers if needed
import * as api from './services/api';
import { Layout } from './components/Layout';
import { SupervisorView } from './components/SupervisorView';
import { TechnicianView } from './components/TechnicianView';
import { NurseView } from './components/NurseView';
import { InspectorView } from './components/InspectorView'; // New Import
import { Login } from './components/Login';
import { LanguageProvider } from './contexts/LanguageContext';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  // App State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [inventory, setInventory] = useState<InventoryPart[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]); // New State
  const [badges, setBadges] = useState<{ [key: string]: number }>({});

  // Load Data from Supabase
  const refreshData = async () => {
    setLoading(true);
    try {
        const [a, i, w, u] = await Promise.all([
            api.fetchAssets(),
            api.fetchInventory(),
            api.fetchWorkOrders(),
            api.fetchUsers() // Fetch Users
        ]);
        setAssets(a);
        setInventory(i);
        setWorkOrders(w);
        setUsers(u);
    } catch (e) {
        console.error("Failed to load data", e);
    } finally {
        setLoading(false);
    }
  };

  // Initial Load & Seeding
  useEffect(() => {
    const init = async () => {
        // Attempt to seed if empty
        await api.seedDatabaseIfEmpty();
        await refreshData();
    };
    init();
  }, []);

  // Calculate Badges
  useEffect(() => {
    const criticalWOs = workOrders.filter(wo => wo.status !== 'Closed' && (wo.priority === 'Critical' || wo.priority === 'High')).length;
    const overdueCal = assets.filter(a => a.next_calibration_date && new Date(a.next_calibration_date) < new Date()).length;
    const lowStock = inventory.filter(p => p.current_stock <= p.min_reorder_level).length;

    setBadges({
        maintenance: criticalWOs,
        calibration: overdueCal,
        inventory: lowStock
    });
  }, [workOrders, assets, inventory]);

  // Handle Add Asset
  const handleAddAsset = async (newAsset: Asset) => {
    await api.addAsset(newAsset);
    refreshData();
  };

  // Handle Add User
  const handleAddUser = async (newUser: User) => {
    await api.addUser(newUser);
    refreshData();
  }

  // Handle Login
  const handleLogin = (selectedUser: User) => {
    setUser(selectedUser);
    if (selectedUser.role === UserRole.SUPERVISOR || selectedUser.role === UserRole.ADMIN) setCurrentView('dashboard');
    else if (selectedUser.role === UserRole.TECHNICIAN || selectedUser.role === UserRole.VENDOR) setCurrentView('tasks');
    else if (selectedUser.role === UserRole.INSPECTOR) setCurrentView('inspector');
    else setCurrentView('report');
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  if (loading && !user) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-brand font-bold animate-pulse">Connecting to Database...</div>
  }

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
      badgeCounts={badges}
    >
      {(user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) && (
        <SupervisorView 
          currentView={currentView}
          currentUser={user} // Pass current user to handle role-based approvals
          assets={assets}
          workOrders={workOrders}
          inventory={inventory}
          users={users} // Pass users
          onAddAsset={handleAddAsset}
          onAddUser={handleAddUser} // Pass handler
          refreshData={refreshData}
          onNavigate={setCurrentView}
        />
      )}

      {(user.role === UserRole.TECHNICIAN || user.role === UserRole.VENDOR) && (
        <TechnicianView 
          currentUser={user}
          userWorkOrders={workOrders.filter(wo => wo.assigned_to_id === user.user_id)} // Filter from live data
          allWorkOrders={workOrders} // Pass all WOs for history lookup
          users={users} // Pass users for history lookup
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
