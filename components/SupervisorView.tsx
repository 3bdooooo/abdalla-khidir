
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, SystemAlert, Priority, WorkOrderType, User, UserRole } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getSystemAlerts } from '../services/mockDb';
import * as api from '../services/api';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SupervisorProps {
  currentView: string;
  assets: Asset[];
  workOrders: WorkOrder[];
  inventory: InventoryPart[];
  users?: User[]; // New Prop
  onAddAsset: (asset: Asset) => void;
  onAddUser?: (user: User) => void; // New Prop
  refreshData: () => void;
  onNavigate: (view: string) => void;
}

export const SupervisorView: React.FC<SupervisorProps> = ({ currentView, assets, workOrders, inventory, users = [], onAddAsset, onAddUser, refreshData, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('tab1');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { t, language } = useLanguage();

  // Add Asset Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    model: '',
    asset_id: '',
    location_id: 101,
    purchase_date: new Date().toISOString().split('T')[0],
    image: ''
  });

  // Add User Modal State (New)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: UserRole.TECHNICIAN,
      department: '',
      signature: ''
  });

  // Inventory Restock State
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [confirmRestockOpen, setConfirmRestockOpen] = useState(false);
  const [selectedPartForRestock, setSelectedPartForRestock] = useState<InventoryPart | null>(null);
  const [restockAmount, setRestockAmount] = useState('');

  // Report Generation State
  const [reportType, setReportType] = useState<'CM' | 'PPM' | 'COMPLIANCE'>('CM');
  const [reportStartDate, setReportStartDate] = useState('2023-01-01');
  const [reportEndDate, setReportEndDate] = useState('2023-12-31');
  const [jobOrderSearchId, setJobOrderSearchId] = useState('');
  
  // Specific Job Order View State
  const [selectedJobReport, setSelectedJobReport] = useState<DetailedJobOrderReport | null>(null);

  // --- NEW ADMIN UI STATES ---
  const [alerts, setAlerts] = useState<SystemAlert[]>(getSystemAlerts());
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [justificationModalOpen, setJustificationModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [justificationReason, setJustificationReason] = useState('');
  const [selectedMapZone, setSelectedMapZone] = useState<string | null>(null);
  
  // Maintenance View State
  const [maintenanceViewMode, setMaintenanceViewMode] = useState<'kanban' | 'list'>('kanban');
  const [maintenanceFilterPriority, setMaintenanceFilterPriority] = useState<string>('all');
  const [maintenanceFilterType, setMaintenanceFilterType] = useState<string>('all');
  
  // Create Work Order Modal State
  const [isCreateWOModalOpen, setIsCreateWOModalOpen] = useState(false);
  const [newWOForm, setNewWOForm] = useState({
      assetId: '',
      type: WorkOrderType.CORRECTIVE,
      priority: Priority.MEDIUM,
      description: '',
      assignedToId: ''
  });

  // Calibration View State
  const [calibrationSearch, setCalibrationSearch] = useState('');
  const [updateCalibrationModalOpen, setUpdateCalibrationModalOpen] = useState(false);
  const [assetToCalibrate, setAssetToCalibrate] = useState<Asset | null>(null);
  const [newCalibrationDate, setNewCalibrationDate] = useState(new Date().toISOString().split('T')[0]);

  // Simulation State
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  // Reset tab and selection when main view changes
  useEffect(() => {
    setActiveTab('tab1');
    setSelectedAsset(null);
    setSelectedJobReport(null);
    // Disable simulation when leaving dashboard to prevent background updates
    if (currentView !== 'dashboard') setIsSimulationActive(false);
  }, [currentView]);

  // Real-time Simulation Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulationActive && currentView === 'dashboard') {
        interval = setInterval(async () => {
            // Pick a random asset to update
            const randomIdx = Math.floor(Math.random() * assets.length);
            const targetAsset = assets[randomIdx];
            
            // Randomly determine new status (weighted towards running)
            const r = Math.random();
            let newStatus = AssetStatus.RUNNING;
            
            if (r > 0.90) newStatus = AssetStatus.DOWN; // 10% chance of failure
            else if (r > 0.80) newStatus = AssetStatus.UNDER_MAINT; // 10% chance of maintenance
            
            // Only update if changed to avoid unnecessary renders
            if (targetAsset.status !== newStatus) {
                await api.updateAssetStatus(targetAsset.asset_id, newStatus);
                refreshData(); // Trigger App re-render to update map visuals
            }
        }, 3000); // Update every 3 seconds for async safety
    }
    return () => clearInterval(interval);
  }, [isSimulationActive, currentView, assets, refreshData]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    // MTTR Calculation
    const closedWOs = workOrders.filter(wo => wo.status === 'Closed' && wo.start_time && wo.close_time);
    let totalRepairTime = 0;
    closedWOs.forEach(wo => {
        const start = new Date(wo.start_time!).getTime();
        const end = new Date(wo.close_time!).getTime();
        totalRepairTime += (end - start);
    });
    // Ensure we don't divide by zero and format nicely (mocked slightly high to look realistic)
    const mttrHours = closedWOs.length ? (totalRepairTime / closedWOs.length / (1000 * 60 * 60)).toFixed(1) : '4.2';

    return {
      totalAssets: assets.length,
      openWorkOrders: workOrders.filter(wo => wo.status !== 'Closed').length,
      lowStockAlerts: inventory.filter(i => i.current_stock <= i.min_reorder_level).length,
      availability: [
          { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length },
          { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length },
          { name: 'Maint', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length },
      ],
      mttr: mttrHours
    };
  }, [assets, workOrders, inventory]);

  // Mock MTBF Data
  const mtbfData = [
      { month: 'Jan', mtbf: 450 },
      { month: 'Feb', mtbf: 480 },
      { month: 'Mar', mtbf: 520 },
      { month: 'Apr', mtbf: 510 },
      { month: 'May', mtbf: 550 },
      { month: 'Jun', mtbf: 590 },
  ];

  // Mock Failure Trend Data
  const failureTrendData = [
      { month: 'Jan', Power: 12, Software: 8, Mechanical: 5, UserError: 2 },
      { month: 'Feb', Power: 10, Software: 12, Mechanical: 4, UserError: 3 },
      { month: 'Mar', Power: 8, Software: 15, Mechanical: 6, UserError: 1 },
      { month: 'Apr', Power: 5, Software: 9, Mechanical: 8, UserError: 4 },
      { month: 'May', Power: 7, Software: 11, Mechanical: 7, UserError: 2 },
      { month: 'Jun', Power: 4, Software: 8, Mechanical: 9, UserError: 5 },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewAssetForm(prev => ({ ...prev, image: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset: Asset = {
        asset_id: newAssetForm.asset_id || `NFC-${Math.floor(Math.random() * 10000)}`,
        name: newAssetForm.name,
        model: newAssetForm.model,
        location_id: Number(newAssetForm.location_id),
        status: AssetStatus.RUNNING,
        purchase_date: newAssetForm.purchase_date,
        operating_hours: 0,
        risk_score: 0,
        last_calibration_date: newAssetForm.purchase_date,
        next_calibration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        image: newAssetForm.image || 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    };
    onAddAsset(asset);
    setIsAddModalOpen(false);
    setNewAssetForm({
        name: '',
        model: '',
        asset_id: '',
        location_id: 101,
        purchase_date: new Date().toISOString().split('T')[0],
        image: ''
    });
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewUserForm(prev => ({ ...prev, signature: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddUser) return;

      const newUser: User = {
          user_id: Math.floor(Math.random() * 100000),
          name: newUserForm.name,
          email: newUserForm.email,
          role: newUserForm.role,
          phone_number: newUserForm.phone,
          password: newUserForm.password,
          department: newUserForm.department,
          digital_signature: newUserForm.signature,
          location_id: 101 // Default location for now
      };
      
      onAddUser(newUser);
      setIsAddUserModalOpen(false);
      refreshData();
      setNewUserForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: UserRole.TECHNICIAN,
        department: '',
        signature: ''
      });
  };

  const initiateRestock = (part: InventoryPart) => {
    setSelectedPartForRestock(part);
    setRestockAmount('');
    setRestockModalOpen(true);
  };

  const handleRestockPreCheck = () => {
    const qty = parseInt(restockAmount);
    if (!qty || qty <= 0) return;
    
    if (qty > 50) { // "Large" amount threshold
        setConfirmRestockOpen(true);
    } else {
        submitRestock();
    }
  };

  const submitRestock = async () => {
     if (selectedPartForRestock && restockAmount) {
         await api.restockPart(selectedPartForRestock.part_id, parseInt(restockAmount));
         refreshData();
         setRestockModalOpen(false);
         setConfirmRestockOpen(false);
         setRestockAmount('');
         setSelectedPartForRestock(null);
     }
  };

  const handleDownloadPDF = () => {
      const printWindow = window.open('', '', 'height=800,width=1000');
      if (printWindow) {
          printWindow.document.write('<html><head><title>Compliance Report</title>');
          printWindow.document.write('</head><body>');
          printWindow.document.write('<h1>Strategic Compliance Report</h1>');
          printWindow.document.write(`<p>Type: ${reportType}</p>`);
          printWindow.document.write(`<p>Generated: ${new Date().toLocaleDateString()}</p>`);
          printWindow.document.write('<p>Includes: MTBF Analysis, Boundary Alerts, Regulatory Status</p>');
          printWindow.document.close();
          printWindow.print();
      }
  };
  
  const handlePrintJobReport = () => {
     window.print();
  };

  const handleAlertClick = (alert: SystemAlert) => {
      if (alert.type === 'BOUNDARY_CROSSING') {
          setSelectedAlert(alert);
          setJustificationModalOpen(true);
      }
  };

  const submitJustification = () => {
      if (selectedAlert && justificationReason) {
          // Mock: resolve alert (In real app, update DB)
          setAlerts(alerts.map(a => a.id === selectedAlert.id ? {...a, status: 'resolved'} : a));
          setJustificationModalOpen(false);
          setSelectedAlert(null);
          setJustificationReason('');
          setShowAlertPanel(false);
      }
  };

  const handleCreateWOSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      await api.createWorkOrder({
          wo_id: Math.floor(Math.random() * 100000),
          asset_id: newWOForm.assetId,
          type: newWOForm.type,
          priority: newWOForm.priority,
          description: newWOForm.description,
          assigned_to_id: parseInt(newWOForm.assignedToId),
          status: 'Open',
          created_at: new Date().toISOString()
      });

      refreshData();
      setIsCreateWOModalOpen(false);
      setNewWOForm({
          assetId: '',
          type: WorkOrderType.CORRECTIVE,
          priority: Priority.MEDIUM,
          description: '',
          assignedToId: ''
      });
  };

  const handleUpdateCalibration = async (e: React.FormEvent) => {
      e.preventDefault();
      if (assetToCalibrate) {
          const nextCal = new Date(newCalibrationDate);
          nextCal.setFullYear(nextCal.getFullYear() + 1);
          
          await api.updateAssetCalibration(
              assetToCalibrate.asset_id,
              newCalibrationDate,
              nextCal.toISOString().split('T')[0]
          );
          
          refreshData();
          setUpdateCalibrationModalOpen(false);
          setAssetToCalibrate(null);
      }
  };

  const handleFindJobReport = () => {
      // Logic to find specific report. Mocking 2236 for now
      if (jobOrderSearchId === '2236' || jobOrderSearchId === '') {
          setSelectedJobReport(getDetailedReports()[0]);
      } else {
          alert('Job Order Report not found. Try 2236.');
      }
  };

  const COLORS = ['#28A745', '#DC3545', '#FFC107'];

  // --- 1. DASHBOARD MODULE (ADMIN/HEAD UI) ---
  if (currentView === 'dashboard') {
    // ... [Existing Dashboard Code - Unchanged]
    const departments = Array.from(new Set(getLocations().map(l => l.department)));

    return (
      <div className="space-y-6 animate-in fade-in pb-20">
        
        {/* HEADER WITH NOTIFICATION SYSTEM */}
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('op_overview')}</h2>
                <p className="text-text-muted text-sm mt-1">Strategic command center for hospital assets.</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-sm text-text-muted flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-border shadow-sm">
                    <Calendar size={14} /> {new Date().toLocaleDateString()}
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setShowAlertPanel(!showAlertPanel)}
                        className="p-2 rounded-full bg-white border border-border hover:bg-gray-50 relative"
                    >
                        <Bell size={20} className="text-gray-600" />
                        {alerts.filter(a => a.status === 'active').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                {alerts.filter(a => a.status === 'active').length}
                            </span>
                        )}
                    </button>
                    
                    {/* NOTIFICATION PANEL */}
                    {showAlertPanel && (
                        <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-in slide-in-from-top-2">
                            <div className="bg-gray-50 p-3 border-b border-border flex justify-between items-center">
                                <h3 className="font-bold text-sm text-gray-800">System Notifications</h3>
                                <button onClick={() => setShowAlertPanel(false)}><X size={16} /></button>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {alerts.filter(a => a.status === 'active').length === 0 ? (
                                    <div className="p-8 text-center text-text-muted text-sm">No active alerts.</div>
                                ) : (
                                    alerts.filter(a => a.status === 'active').map(alert => (
                                        <div 
                                            key={alert.id} 
                                            onClick={() => handleAlertClick(alert)}
                                            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${alert.type === 'BOUNDARY_CROSSING' ? 'bg-red-50/50' : ''}`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-1 ${alert.severity === 'high' ? 'text-danger' : 'text-warning'}`}>
                                                    {alert.type === 'BOUNDARY_CROSSING' ? <ShieldAlert size={18} /> : <AlertCircle size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-0.5">{alert.type}</p>
                                                    <p className="text-sm font-bold text-gray-900 leading-snug">{alert.message}</p>
                                                    <p className="text-xs text-text-muted mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                                                    {alert.type === 'BOUNDARY_CROSSING' && (
                                                        <div className="mt-2 text-xs bg-white border border-danger/20 text-danger px-2 py-1 rounded w-fit font-bold">
                                                            Click to Justify
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-surface p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{t('total_assets')}</p>
              <p className="text-2xl font-bold text-brand-dark">{kpiData.totalAssets}</p>
            </div>
            <div className="p-3 bg-brand/10 text-brand rounded-full">
              <Package size={24} />
            </div>
          </div>

          <div className="bg-surface p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{t('kpi_availability')}</p>
              <p className="text-2xl font-bold text-success">94.2%</p>
            </div>
            <div className="p-3 bg-success/10 text-success rounded-full">
              <Activity size={24} />
            </div>
          </div>

          <div className="bg-surface p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{t('open_tickets')}</p>
              <p className="text-2xl font-bold text-gray-900">{kpiData.openWorkOrders}</p>
            </div>
            <div className="p-3 bg-warning/10 text-warning rounded-full">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-surface p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{t('kpi_mttr')}</p>
              <p className="text-2xl font-bold text-purple-600">{kpiData.mttr}h</p>
            </div>
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
              <Wrench size={24} />
            </div>
          </div>

          <div className="bg-surface p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{t('alert_boundary')}</p>
              <p className="text-2xl font-bold text-danger">{alerts.filter(a => a.type === 'BOUNDARY_CROSSING' && a.status === 'active').length}</p>
            </div>
            <div className="p-3 bg-danger/10 text-danger rounded-full animate-pulse">
              <ShieldAlert size={24} />
            </div>
          </div>
        </div>
        
        {/* STRATEGIC CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
                <h3 className="text-lg font-bold mb-6 text-gray-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-text-muted" />
                    {t('kpi_mtbf')} Analysis
                </h3>
                <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mtbfData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                        <XAxis dataKey="month" fontSize={12} tickLine={false} tick={{fill: '#6C757D'}} />
                        <YAxis fontSize={12} tickLine={false} tick={{fill: '#6C757D'}} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DEE2E6', color: '#212529', borderRadius: '8px' }}
                        />
                        <Line type="monotone" dataKey="mtbf" stroke="#007BFF" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                    </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl shadow-sm border border-border flex flex-col">
                 <h3 className="text-lg font-bold mb-6 text-gray-900 flex items-center gap-2">
                    <Activity size={20} className="text-text-muted" />
                    {t('kpi_availability')} Distribution
                </h3>
                <div className="h-64 w-full flex items-center justify-center" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={kpiData.availability}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {kpiData.availability.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* NEW FAILURE TREND CHART */}
            <div className="bg-surface p-6 rounded-xl shadow-sm border border-border lg:col-span-2">
                <h3 className="text-lg font-bold mb-6 text-gray-900 flex items-center gap-2">
                    <BarChart2 size={20} className="text-text-muted" />
                    {t('failure_trend')}
                </h3>
                <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={failureTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9ECEF" />
                            <XAxis dataKey="month" fontSize={12} tickLine={false} tick={{fill: '#6C757D'}} />
                            <YAxis fontSize={12} tickLine={false} tick={{fill: '#6C757D'}} />
                            <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DEE2E6', color: '#212529', borderRadius: '8px' }} />
                            <Legend />
                            <Bar dataKey="Power" fill="#007BFF" stackId="a" />
                            <Bar dataKey="Software" fill="#28A745" stackId="a" />
                            <Bar dataKey="Mechanical" fill="#FFC107" stackId="a" />
                            <Bar dataKey="UserError" fill="#6C757D" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* INTERACTIVE MAP */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <MapPin size={20} className="text-text-muted" />
                        {t('dept_map')}
                    </h3>
                    <button 
                        onClick={() => setIsSimulationActive(!isSimulationActive)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border ${
                            isSimulationActive 
                                ? 'bg-red-50 text-red-600 border-red-100 ring-2 ring-red-500/20' 
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <Zap size={12} className={isSimulationActive ? 'animate-pulse fill-current' : ''} />
                        {isSimulationActive ? 'Live Feed On' : 'Simulate Traffic'}
                    </button>
                </div>
                <div className="flex gap-2 text-[10px] font-medium items-center">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"></span> Running</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger"></span> Down</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning"></span> Maint</span>
                </div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg border border-dashed border-gray-300 relative overflow-y-auto p-4 min-h-[350px]" dir="ltr">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {departments.map((dept, idx) => {
                        const deptAssets = assets.filter(a => {
                            const loc = getLocations().find(l => l.location_id === a.location_id);
                            return loc?.department === dept;
                        });
                        const hasIssues = deptAssets.some(a => a.status === AssetStatus.DOWN);
                        const isSelected = selectedMapZone === dept;
                        
                        return (
                            <button 
                                key={idx}
                                onClick={() => setSelectedMapZone(isSelected ? null : dept)} 
                                className={`p-3 rounded-lg shadow-sm transition-all min-h-[100px] flex flex-col text-start relative border-2
                                    ${hasIssues ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}
                                    ${isSelected ? 'ring-2 ring-brand ring-offset-2 z-10 scale-105' : 'hover:scale-[1.02]'}
                                `}
                            >
                                <div className="flex justify-between items-start w-full mb-2 pb-1 border-b border-black/5">
                                    <span className="text-[10px] font-bold text-gray-700 uppercase truncate w-full" title={dept}>{dept}</span>
                                </div>
                                <div className="flex-1 flex content-start flex-wrap gap-1">
                                    {deptAssets.slice(0, 12).map(asset => (
                                        <div 
                                            key={asset.asset_id} 
                                            className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                                                asset.status === AssetStatus.RUNNING ? 'bg-success' :
                                                asset.status === AssetStatus.DOWN ? 'bg-danger' : 'bg-warning'
                                            }`}
                                        ></div>
                                    ))}
                                    {deptAssets.length > 12 && <span className="text-[8px] text-gray-400">+{deptAssets.length - 12}</span>}
                                </div>
                                {hasIssues && <div className="absolute top-1 right-1 text-danger animate-pulse"><AlertCircle size={10}/></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ZONE ASSET LIST */}
            {selectedMapZone && (
                <div className="mt-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            Assets in <span className="text-brand">{selectedMapZone}</span>
                        </h4>
                        <button onClick={() => setSelectedMapZone(null)} className="text-xs text-text-muted hover:text-danger">Close</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-2">Asset Name</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Last Calib.</th>
                                    <th className="px-4 py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.filter(a => {
                                    const loc = getLocations().find(l => l.location_id === a.location_id);
                                    return loc?.department === selectedMapZone;
                                }).map(asset => (
                                    <tr key={asset.asset_id} className="border-b border-gray-100">
                                        <td className="px-4 py-2 font-medium">{asset.name} <span className="text-xs text-gray-400">({asset.model})</span></td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors duration-300 ${asset.status === AssetStatus.RUNNING ? 'bg-green-100 text-green-800' : asset.status === AssetStatus.DOWN ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">{asset.last_calibration_date}</td>
                                        <td className="px-4 py-2"><button onClick={() => {setSelectedAsset(asset); onNavigate('assets');}} className="text-brand hover:underline">View</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* JUSTIFICATION MODAL */}
        {justificationModalOpen && selectedAlert && (
            <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-4">
                        <h3 className="text-lg font-bold text-danger flex items-center gap-2 mb-2">
                            <ShieldAlert size={20} /> {t('justification_required')}
                        </h3>
                        <p className="text-sm text-gray-800 font-medium">{selectedAlert.message}</p>
                        <p className="text-xs text-gray-500 mt-2">Asset: {selectedAlert.asset_id}</p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Movement <span className="text-danger">*</span></label>
                        <textarea 
                            value={justificationReason}
                            onChange={(e) => setJustificationReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand outline-none h-24"
                            placeholder={t('enter_reason')}
                        />
                    </div>

                    <div className="flex gap-3">
                         <button onClick={() => setJustificationModalOpen(false)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold">{t('btn_cancel')}</button>
                         <button 
                            onClick={submitJustification} 
                            disabled={!justificationReason}
                            className="flex-1 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                         >
                             <Lock size={16} /> {t('btn_justify')}
                         </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  }

  // --- 7. USERS MODULE (ADMIN ONLY) ---
  if (currentView === 'users') {
      // ... [Existing User Module Code - Unchanged]
      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-bold text-gray-900">{t('users_title')}</h2>
                      <p className="text-text-muted text-sm">Manage system access and permissions</p>
                  </div>
                  <button onClick={() => setIsAddUserModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2">
                      <Plus size={16} /> {t('add_user')}
                  </button>
              </div>

              <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                 <table className="w-full text-start border-collapse">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('user_name')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('user_role')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('user_dept')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('user_email')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('user_phone')}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                          {users.map(user => (
                              <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-4">
                                      <div className="font-bold text-gray-900">{user.name}</div>
                                      <div className="text-xs text-text-muted font-mono">ID: {user.user_id}</div>
                                  </td>
                                  <td className="p-4">
                                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                          {user.role}
                                      </span>
                                  </td>
                                  <td className="p-4 text-sm text-gray-700">{user.department || '-'}</td>
                                  <td className="p-4 text-sm text-gray-600">{user.email}</td>
                                  <td className="p-4 text-sm text-gray-600 font-mono">{user.phone_number || '-'}</td>
                              </tr>
                          ))}
                      </tbody>
                 </table>
              </div>

              {/* ADD USER MODAL */}
              {isAddUserModalOpen && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><UsersIcon size={20} /> {t('modal_add_user')}</h3>
                            <button onClick={() => setIsAddUserModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_name')}</label>
                                <div className="relative">
                                    <input required type="text" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand outline-none" />
                                    <UsersIcon className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_email')}</label>
                                    <div className="relative">
                                        <input required type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand outline-none" />
                                        <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_phone')}</label>
                                    <div className="relative">
                                        <input type="tel" value={newUserForm.phone} onChange={e => setNewUserForm({...newUserForm, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand outline-none" />
                                        <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_role')}</label>
                                    <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none bg-white">
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_dept')}</label>
                                    <input type="text" value={newUserForm.department} onChange={e => setNewUserForm({...newUserForm, department: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_password')}</label>
                                <div className="relative">
                                    <input required type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-brand outline-none" />
                                    <Key className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('upload_sign')}</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleSignatureUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {newUserForm.signature ? (
                                        <div className="relative h-20 w-full">
                                            <img src={newUserForm.signature} alt="Signature Preview" className="h-full w-full object-contain" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-md">
                                                <span className="text-white font-bold text-sm">Change</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <UploadCloud size={24} className="text-text-muted mb-1" />
                                            <p className="text-xs text-text-muted">Upload Digital Signature Image</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">{t('btn_cancel')}</button>
                                <button type="submit" className="flex-1 py-2.5 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark transition">{t('btn_create_user')}</button>
                            </div>
                        </form>
                    </div>
                 </div>
              )}
          </div>
      );
  }
  
  // --- 2. ASSETS MODULE ---
  if (currentView === 'assets') {
      // ... [Existing Assets Module Code - Unchanged]
      if (selectedAsset) {
          const assetWOs = workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id);
          return (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setSelectedAsset(null)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-text-muted hover:text-gray-900 transition-colors"><ChevronLeft className="rtl:rotate-180"/></button>
                      <div>
                          <div className="flex items-center gap-3"><h2 className="text-2xl font-bold text-gray-900">{selectedAsset.name}</h2><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${selectedAsset.status === AssetStatus.RUNNING ? 'bg-success/10 text-success border-success/20' : selectedAsset.status === AssetStatus.DOWN ? 'bg-danger/10 text-danger border-danger/20' : selectedAsset.status === AssetStatus.UNDER_MAINT ? 'bg-warning/10 text-warning border-warning/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{selectedAsset.status}</span></div>
                          <p className="text-sm text-text-muted font-mono mt-1">{selectedAsset.model} • {selectedAsset.asset_id}</p>
                      </div>
                  </div>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <div className="lg:col-span-2 space-y-6">
                       <div className="flex border-b border-border bg-white rounded-t-xl px-2 shadow-sm">
                          <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-gray-900'}`}>{t('specifications')}</button>
                          <button onClick={() => setActiveTab('telemetry')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'telemetry' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-gray-900'}`}><Activity size={16} /> {t('live_readings')}</button>
                          <button onClick={() => setActiveTab('history')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-gray-900'}`}>{t('maintenance_history')}</button>
                       </div>
                       <div className="bg-white rounded-b-xl rounded-r-xl border border-border border-t-0 p-6 shadow-sm min-h-[400px]">
                          {activeTab === 'overview' && (
                              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                 <div><p className="text-xs text-text-muted uppercase font-bold mb-1">{t('manufacturer')}</p><p className="font-medium text-gray-900">{selectedAsset.manufacturer || 'N/A'}</p></div>
                                 <div><p className="text-xs text-text-muted uppercase font-bold mb-1">{t('serial_number')}</p><p className="font-medium text-gray-900 font-mono">{selectedAsset.serial_number || 'N/A'}</p></div>
                                 <div><p className="text-xs text-text-muted uppercase font-bold mb-1">{t('location')}</p><p className="font-medium text-gray-900">{getLocationName(selectedAsset.location_id)}</p></div>
                                 <div><p className="text-xs text-text-muted uppercase font-bold mb-1">{t('purchase_date')}</p><p className="font-medium text-gray-900">{selectedAsset.purchase_date}</p></div>
                                 <div><p className="text-xs text-text-muted uppercase font-bold mb-1">{t('warranty_exp')}</p><p className="font-medium text-gray-900">{selectedAsset.warranty_expiration || 'N/A'}</p></div>
                              </div>
                          )}
                          {activeTab === 'history' && (
                              <div className="space-y-4">
                                  {assetWOs.length === 0 ? <p className="text-text-muted">No history.</p> : assetWOs.map(wo => (<div key={wo.wo_id} className="border p-3 rounded">#{wo.wo_id} - {wo.description}</div>))}
                              </div>
                          )}
                       </div>
                   </div>
                   <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
                        {selectedAsset.image && <img src={selectedAsset.image} alt="Asset" className="w-full rounded-lg mb-4 object-cover aspect-square"/>}
                   </div>
               </div>
            </div>
          );
      }

      return (
        <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-gray-900">{t('nav_assets')}</h2><p className="text-text-muted text-sm">Manage and track medical inventory</p></div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"><Activity size={16} /> + {t('add_equipment')}</button>
             </div>
             <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                 <table className="w-full text-start border-collapse">
                      <thead className="bg-gray-50"><tr><th className="p-4 text-xs font-bold text-text-muted uppercase text-start">Asset Info</th><th className="p-4 text-xs font-bold text-text-muted uppercase text-start">Status</th><th className="p-4 text-xs font-bold text-text-muted uppercase text-start">Actions</th></tr></thead>
                      <tbody className="divide-y divide-border">
                          {assets.map(asset => (
                              <tr key={asset.asset_id} className="hover:bg-gray-50">
                                  <td className="p-4"><div className="font-bold">{asset.name}</div><div className="text-xs text-text-muted">{asset.asset_id}</div></td>
                                  <td className="p-4"><span className="text-xs font-bold px-2 py-1 rounded bg-gray-100">{asset.status}</span></td>
                                  <td className="p-4"><button onClick={() => {setSelectedAsset(asset); setActiveTab('overview');}} className="text-brand font-bold text-sm">Details</button></td>
                              </tr>
                          ))}
                      </tbody>
                 </table>
             </div>
             {isAddModalOpen && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">{t('modal_add_title')}</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_name')}</label>
                                <input required type="text" value={newAssetForm.name} onChange={e => setNewAssetForm({...newAssetForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_model')}</label>
                                    <input required type="text" value={newAssetForm.model} onChange={e => setNewAssetForm({...newAssetForm, model: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_sn')}</label>
                                    <input type="text" value={newAssetForm.asset_id} onChange={e => setNewAssetForm({...newAssetForm, asset_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" placeholder="Auto-generated if empty" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_location')}</label>
                                    <select value={newAssetForm.location_id} onChange={e => setNewAssetForm({...newAssetForm, location_id: parseInt(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none">
                                        {getLocations().map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name} ({loc.department})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_date')}</label>
                                    <input type="date" value={newAssetForm.purchase_date} onChange={e => setNewAssetForm({...newAssetForm, purchase_date: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('form_image')}</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {newAssetForm.image ? (
                                        <div className="relative h-32 w-full">
                                            <img src={newAssetForm.image} alt="Preview" className="h-full w-full object-contain rounded-md" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-md">
                                                <span className="text-white font-bold text-sm">Change Image</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <UploadCloud size={32} className="text-text-muted mb-2" />
                                            <p className="text-sm text-text-muted">Click or drag image to upload</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">{t('btn_cancel')}</button>
                                <button type="submit" className="flex-1 py-2.5 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark transition">{t('btn_save')}</button>
                            </div>
                        </form>
                    </div>
                 </div>
             )}
        </div>
      );
  }

  // --- 3. MAINTENANCE MODULE ---
  if (currentView === 'maintenance') {
      const filteredWOs = workOrders.filter(wo => {
          if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
          if (maintenanceFilterType !== 'all' && wo.type !== maintenanceFilterType) return false;
          return true;
      });

      return (
        <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_maintenance')}</h2>
                    <p className="text-text-muted text-sm mt-1">{t('wo_title')} and Technician Management</p>
                </div>
                <div className="flex gap-3">
                     <div className="bg-white border border-border rounded-lg p-1 flex shadow-sm">
                         <button 
                            onClick={() => setMaintenanceViewMode('kanban')}
                            className={`p-2 rounded-md transition-all ${maintenanceViewMode === 'kanban' ? 'bg-brand/10 text-brand' : 'text-gray-400 hover:text-gray-600'}`}
                            title={t('view_board')}
                         >
                             <LayoutGrid size={18} />
                         </button>
                         <button 
                            onClick={() => setMaintenanceViewMode('list')}
                            className={`p-2 rounded-md transition-all ${maintenanceViewMode === 'list' ? 'bg-brand/10 text-brand' : 'text-gray-400 hover:text-gray-600'}`}
                            title={t('view_list')}
                         >
                             <List size={18} />
                         </button>
                     </div>
                     <button onClick={() => setIsCreateWOModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                         <Plus size={16} /> {t('create_wo')}
                     </button>
                </div>
             </div>

             {/* Filters */}
             <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Search size={16} className="text-text-muted" /> Filter:
                  </div>
                  <select 
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand"
                      value={maintenanceFilterPriority}
                      onChange={(e) => setMaintenanceFilterPriority(e.target.value)}
                  >
                      <option value="all">{t('priority')}: {t('filter_all')}</option>
                      {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select 
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand"
                      value={maintenanceFilterType}
                      onChange={(e) => setMaintenanceFilterType(e.target.value)}
                  >
                      <option value="all">{t('type')}: {t('filter_all')}</option>
                      {Object.values(WorkOrderType).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
             </div>

             {/* KANBAN / LIST VIEW RENDERING */}
             {maintenanceViewMode === 'kanban' ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {/* Column: Open */}
                     <div className="bg-gray-50/50 rounded-xl p-4 border border-border h-full min-h-[500px]">
                         <div className="flex justify-between items-center mb-4 px-1">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-brand"></span> {t('wo_status_open')}
                             </h3>
                             <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">
                                 {filteredWOs.filter(w => w.status === 'Open').length}
                             </span>
                         </div>
                         <div className="space-y-3">
                             {filteredWOs.filter(w => w.status === 'Open').map(wo => (
                                 <div key={wo.wo_id} className="bg-white p-4 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative">
                                     <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${wo.priority === Priority.CRITICAL ? 'bg-danger' : wo.priority === Priority.HIGH ? 'bg-orange-500' : 'bg-brand'}`}></div>
                                     <div className="flex justify-between items-start mb-2 pl-2">
                                         <span className="text-xs font-mono font-bold text-text-muted">#{wo.wo_id}</span>
                                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${wo.priority === Priority.CRITICAL ? 'bg-danger/10 text-danger border-danger/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{wo.priority}</span>
                                     </div>
                                     <h4 className="font-bold text-gray-900 text-sm mb-1 pl-2">{wo.description}</h4>
                                     <p className="text-xs text-text-muted pl-2 mb-3">{wo.asset_id} • {wo.type}</p>
                                     <div className="flex justify-end border-t border-gray-50 pt-2">
                                         <button className="text-xs font-bold text-brand hover:underline">{t('assign')}</button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Column: In Progress */}
                     <div className="bg-gray-50/50 rounded-xl p-4 border border-border h-full min-h-[500px]">
                         <div className="flex justify-between items-center mb-4 px-1">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-warning"></span> {t('wo_status_inprogress')}
                             </h3>
                             <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">
                                 {filteredWOs.filter(w => w.status === 'In Progress').length}
                             </span>
                         </div>
                         <div className="space-y-3">
                             {filteredWOs.filter(w => w.status === 'In Progress').map(wo => (
                                 <div key={wo.wo_id} className="bg-white p-4 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer relative">
                                     <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${wo.priority === Priority.CRITICAL ? 'bg-danger' : 'bg-warning'}`}></div>
                                     <div className="flex justify-between items-start mb-2 pl-2">
                                         <span className="text-xs font-mono font-bold text-text-muted">#{wo.wo_id}</span>
                                         <div className="flex items-center gap-1 text-xs text-warning-dark font-bold bg-warning/10 px-1.5 py-0.5 rounded">
                                             <Clock size={10} /> Active
                                         </div>
                                     </div>
                                     <h4 className="font-bold text-gray-900 text-sm mb-1 pl-2">{wo.description}</h4>
                                     <p className="text-xs text-text-muted pl-2">{wo.asset_id}</p>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Column: Closed */}
                     <div className="bg-gray-50/50 rounded-xl p-4 border border-border h-full min-h-[500px]">
                         <div className="flex justify-between items-center mb-4 px-1">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-success"></span> {t('wo_status_closed')}
                             </h3>
                             <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">
                                 {filteredWOs.filter(w => w.status === 'Closed').length}
                             </span>
                         </div>
                         <div className="space-y-3">
                             {filteredWOs.filter(w => w.status === 'Closed').slice(0, 5).map(wo => (
                                 <div key={wo.wo_id} className="bg-white p-4 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer opacity-75 hover:opacity-100">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="text-xs font-mono font-bold text-text-muted line-through">#{wo.wo_id}</span>
                                         <span className="text-xs text-success font-bold flex items-center gap-1"><Wrench size={10}/> Done</span>
                                     </div>
                                     <h4 className="font-bold text-gray-700 text-sm mb-1">{wo.description}</h4>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             ) : (
                 <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                     <table className="w-full text-start border-collapse">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('wo_id')}</th>
                                  <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">Asset</th>
                                  <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('priority')}</th>
                                  <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('status')}</th>
                                  <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('assigned')}</th>
                                  <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('actions')}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                              {filteredWOs.map(wo => (
                                  <tr key={wo.wo_id} className="hover:bg-gray-50">
                                      <td className="p-4 font-mono font-bold text-sm">#{wo.wo_id}</td>
                                      <td className="p-4 text-sm font-medium">{wo.asset_id}</td>
                                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold border ${wo.priority === Priority.CRITICAL ? 'bg-danger/10 text-danger border-danger/20' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{wo.priority}</span></td>
                                      <td className="p-4 text-sm font-bold text-gray-700">{wo.status}</td>
                                      <td className="p-4 text-sm text-text-muted">Tech #{wo.assigned_to_id}</td>
                                      <td className="p-4"><button className="text-brand font-bold text-sm hover:underline">View</button></td>
                                  </tr>
                              ))}
                          </tbody>
                     </table>
                 </div>
             )}

             {/* CREATE WO MODAL */}
             {isCreateWOModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">{t('modal_create_wo')}</h3>
                            <button onClick={() => setIsCreateWOModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleCreateWOSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_asset')}</label>
                                <select 
                                    required 
                                    value={newWOForm.assetId} 
                                    onChange={e => setNewWOForm({...newWOForm, assetId: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none bg-white"
                                >
                                    <option value="">Select Asset...</option>
                                    {assets.map(asset => (
                                        <option key={asset.asset_id} value={asset.asset_id}>{asset.name} ({asset.asset_id})</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('type')}</label>
                                    <select 
                                        value={newWOForm.type} 
                                        onChange={e => setNewWOForm({...newWOForm, type: e.target.value as WorkOrderType})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none bg-white"
                                    >
                                        {Object.values(WorkOrderType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('priority')}</label>
                                    <select 
                                        value={newWOForm.priority} 
                                        onChange={e => setNewWOForm({...newWOForm, priority: e.target.value as Priority})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none bg-white"
                                    >
                                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_description')}</label>
                                <textarea 
                                    required
                                    value={newWOForm.description}
                                    onChange={e => setNewWOForm({...newWOForm, description: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 h-24 focus:ring-2 focus:ring-brand outline-none resize-none"
                                    placeholder="Describe the issue..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_assign_tech')}</label>
                                <select 
                                    value={newWOForm.assignedToId} 
                                    onChange={e => setNewWOForm({...newWOForm, assignedToId: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none bg-white"
                                >
                                    <option value="">Unassigned</option>
                                    {users.filter(u => u.role === UserRole.TECHNICIAN).map(tech => (
                                        <option key={tech.user_id} value={tech.user_id}>{tech.name} ({tech.department})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsCreateWOModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">{t('btn_cancel')}</button>
                                <button type="submit" className="flex-1 py-2.5 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark transition">{t('btn_dispatch')}</button>
                            </div>
                        </form>
                    </div>
                </div>
             )}
        </div>
      );
  }

  // --- 4. INVENTORY MODULE ---
  if (currentView === 'inventory') {
      // ... [Existing Inventory Code - Unchanged]
      return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_inventory')}</h2>
                    <p className="text-text-muted text-sm">Spare parts and medical supplies</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="bg-brand/10 text-brand px-3 py-1 rounded-lg text-sm font-bold border border-brand/20">
                       {inventory.length} Items
                   </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-start border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-xs font-bold text-text-muted uppercase text-start w-1/3">{t('part_name')}</th>
                            <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('current_stock_label')}</th>
                            <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('min_level_label')}</th>
                            <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('unit_cost')}</th>
                            <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {inventory.map((part) => (
                            <tr key={part.part_id} className="hover:bg-gray-50 transition-colors group">
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{part.part_name}</div>
                                    <div className="text-xs text-text-muted font-mono">ID: {part.part_id}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                        part.current_stock <= part.min_reorder_level 
                                            ? 'bg-danger/10 text-danger border-danger/20 animate-pulse' 
                                            : 'bg-success/10 text-success border-success/20'
                                    }`}>
                                        {part.current_stock}
                                    </span>
                                </td>
                                <td className="p-4 text-sm font-medium text-text-muted">
                                    {part.min_reorder_level}
                                </td>
                                <td className="p-4 text-sm font-medium text-gray-900">
                                    ${part.cost}
                                </td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => initiateRestock(part)}
                                        className="flex items-center gap-1 text-brand bg-brand/5 hover:bg-brand hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-brand/20"
                                    >
                                        <ArrowUpCircle size={14} /> {t('restock_btn')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RESTOCK INPUT MODAL */}
            {restockModalOpen && selectedPartForRestock && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{t('restock_modal_title')}</h3>
                            <button onClick={() => setRestockModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
                             <p className="text-xs text-text-muted uppercase font-bold">{t('part_name')}</p>
                             <p className="font-medium text-gray-900">{selectedPartForRestock.part_name}</p>
                             <p className="text-xs text-text-muted mt-2">{t('current_stock_label')}: <span className="font-bold text-gray-900">{selectedPartForRestock.current_stock}</span></p>
                        </div>

                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('restock_qty')}</label>
                        <input 
                            type="number" 
                            value={restockAmount} 
                            onChange={(e) => setRestockAmount(e.target.value)}
                            autoFocus
                            className="w-full border-2 border-gray-300 rounded-xl p-3 text-lg focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-gray-900 mb-6 font-mono"
                            placeholder="0"
                        />

                        <div className="flex gap-3">
                             <button onClick={() => setRestockModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition">{t('btn_cancel')}</button>
                             <button 
                                onClick={handleRestockPreCheck} 
                                disabled={!restockAmount || parseInt(restockAmount) <= 0}
                                className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-lg font-bold transition disabled:opacity-50 shadow-md"
                             >
                                 {t('restock_btn')}
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM LARGE RESTOCK MODAL */}
            {confirmRestockOpen && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border-2 border-warning animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-4">
                            <div className="w-14 h-14 bg-warning/10 text-warning rounded-full flex items-center justify-center mb-3">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('confirm_large_restock_title')}</h3>
                            <p className="text-sm text-text-muted leading-relaxed">
                                {t('confirm_large_restock_msg').replace('{qty}', restockAmount)}
                            </p>
                        </div>
                        <div className="flex gap-3">
                             <button onClick={() => setConfirmRestockOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition">{t('btn_cancel')}</button>
                             <button 
                                onClick={submitRestock} 
                                className="flex-1 py-2.5 bg-warning hover:bg-yellow-500 text-black rounded-lg font-bold transition shadow-md"
                             >
                                 {t('btn_confirm')}
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  // --- 5. CALIBRATION MODULE ---
  if (currentView === 'calibration') {
      const filteredAssets = assets.filter(a => 
          a.name.toLowerCase().includes(calibrationSearch.toLowerCase()) || 
          a.asset_id.toLowerCase().includes(calibrationSearch.toLowerCase())
      );
      
      // Mock Stats
      const compliantCount = assets.filter(a => !a.next_calibration_date || new Date(a.next_calibration_date) > new Date()).length;
      const overdueCount = assets.length - compliantCount;
      const complianceRate = Math.floor((compliantCount / assets.length) * 100);

      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-end">
                  <div>
                      <h2 className="text-2xl font-bold text-gray-900">{t('cal_dashboard')}</h2>
                      <p className="text-text-muted text-sm mt-1">Track compliance and equipment certification</p>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-lg border border-border shadow-sm flex gap-6">
                      <div className="text-center">
                          <p className="text-xs font-bold text-text-muted uppercase">Compliance Rate</p>
                          <p className="text-xl font-bold text-success">{complianceRate}%</p>
                      </div>
                      <div className="w-px bg-gray-200"></div>
                      <div className="text-center">
                          <p className="text-xs font-bold text-text-muted uppercase">Overdue</p>
                          <p className="text-xl font-bold text-danger">{overdueCount}</p>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                  <Search size={18} className="text-text-muted" />
                  <input 
                    type="text"
                    placeholder="Search asset by name or ID..."
                    value={calibrationSearch}
                    onChange={(e) => setCalibrationSearch(e.target.value)}
                    className="flex-1 outline-none text-sm"
                  />
              </div>

              <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
                  <table className="w-full text-start border-collapse">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('asset_info')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('last_cal')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('next_due')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('cal_status')}</th>
                              <th className="p-4 text-xs font-bold text-text-muted uppercase text-start">{t('actions')}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                          {filteredAssets.map(asset => {
                              const isOverdue = asset.next_calibration_date && new Date(asset.next_calibration_date) < new Date();
                              return (
                                  <tr key={asset.asset_id} className="hover:bg-gray-50">
                                      <td className="p-4">
                                          <div className="font-bold text-gray-900">{asset.name}</div>
                                          <div className="text-xs text-text-muted">{asset.asset_id}</div>
                                      </td>
                                      <td className="p-4 text-sm text-gray-600">{asset.last_calibration_date || '-'}</td>
                                      <td className="p-4 text-sm font-bold">{asset.next_calibration_date || '-'}</td>
                                      <td className="p-4">
                                          {isOverdue ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                                                  <AlertCircle size={12}/> {t('cal_overdue')}
                                              </span>
                                          ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-success/10 text-success border border-success/20">
                                                  <ClipboardCheck size={12}/> {t('cal_compliant')}
                                              </span>
                                          )}
                                      </td>
                                      <td className="p-4">
                                          <button 
                                            onClick={() => {
                                                setAssetToCalibrate(asset);
                                                setUpdateCalibrationModalOpen(true);
                                            }}
                                            className="text-brand font-bold text-xs hover:underline flex items-center gap-1"
                                          >
                                              <RefreshCw size={12}/> {t('btn_update_cal')}
                                          </button>
                                      </td>
                                  </tr>
                              )
                          })}
                      </tbody>
                  </table>
              </div>

              {/* UPDATE CALIBRATION MODAL */}
              {updateCalibrationModalOpen && assetToCalibrate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">{t('update_cal_title')}</h3>
                            <button onClick={() => setUpdateCalibrationModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                <p className="text-sm font-bold">{assetToCalibrate.name}</p>
                                <p className="text-xs text-text-muted">{assetToCalibrate.asset_id}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('new_cal_date')}</label>
                                <input 
                                    type="date" 
                                    value={newCalibrationDate}
                                    onChange={(e) => setNewCalibrationDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                />
                            </div>
                            <button 
                                onClick={handleUpdateCalibration}
                                className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-lg font-bold mt-2"
                            >
                                {t('btn_record')}
                            </button>
                        </div>
                    </div>
                </div>
              )}
          </div>
      );
  }

  // --- 6. ANALYSIS & KNOWLEDGE MODULE ---
  if (currentView === 'analysis') {
      // ... [Existing Analysis Code - Unchanged]
      if (selectedJobReport) {
          return (
             <div className="space-y-6 animate-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center no-print">
                     <button 
                        onClick={() => setSelectedJobReport(null)} 
                        className="flex items-center gap-2 text-text-muted hover:text-gray-900 font-bold"
                     >
                        <ChevronLeft className="rtl:rotate-180"/> {t('back')}
                     </button>
                     <button 
                        onClick={handlePrintJobReport}
                        className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                     >
                        <Printer size={18} /> Print Report
                     </button>
                 </div>
                 <div className="bg-white p-8 mx-auto shadow-2xl max-w-[210mm] min-h-[297mm] text-black text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {/* Header */}
                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                         <div className="text-start">
                             <h1 className="text-xl font-bold uppercase tracking-wider">First Gulf Company</h1>
                             <p className="font-bold">Kingdom of Saudi Arabia</p>
                             <p>Tabuk area</p>
                         </div>
                         <div className="text-center">
                             <h2 className="text-2xl font-black underline uppercase mb-2">Job Order Report</h2>
                             <h3 className="text-xl font-bold font-serif">تقرير أمر العمل</h3>
                         </div>
                         <div className="text-end">
                             <div className="w-20 h-20 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-black">
                                LOGO
                             </div>
                         </div>
                     </div>

                     {/* I. Job & Report Identification */}
                     <div className="mb-6">
                        <h4 className="font-bold bg-gray-200 border border-black border-b-0 p-1 px-2 text-xs uppercase">I. Job & Report Identification</h4>
                        <div className="grid grid-cols-2 border border-black">
                            <div className="p-2 border-r border-black border-b flex justify-between">
                                <span className="font-bold">Job Order No. (رقم أمر العمل):</span>
                                <span>{selectedJobReport.job_order_no}</span>
                            </div>
                            <div className="p-2 border-b flex justify-between">
                                <span className="font-bold">Report ID (رقم التقرير):</span>
                                <span>{selectedJobReport.report_id}</span>
                            </div>
                            <div className="p-2 border-r border-black border-b flex justify-between">
                                <span className="font-bold">Control No. (رقم التحكم):</span>
                                <span>{selectedJobReport.control_no}</span>
                            </div>
                            <div className="p-2 border-b flex justify-between">
                                <span className="font-bold">Priority (الأولوية):</span>
                                <span>{selectedJobReport.priority}</span>
                            </div>
                            <div className="p-2 border-r border-black flex justify-between">
                                <span className="font-bold">Risk Factor (مستوى الخطورة):</span>
                                <span>{selectedJobReport.risk_factor}</span>
                            </div>
                             <div className="p-2"></div>
                        </div>
                     </div>

                     {/* II. Asset & III. Location */}
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Asset */}
                        <div>
                            <h4 className="font-bold bg-gray-200 border border-black border-b-0 p-1 px-2 text-xs uppercase">II. Asset Identification</h4>
                            <div className="border border-black text-xs">
                                 <div className="p-1 border-b border-black flex flex-col">
                                    <span className="font-bold mb-1">Equipment Name (اسم الجهاز):</span>
                                    <span>{selectedJobReport.asset.name}</span>
                                 </div>
                                 <div className="p-1 border-b border-black flex justify-between">
                                    <span className="font-bold">Model No:</span>
                                    <span>{selectedJobReport.asset.model}</span>
                                 </div>
                                 <div className="p-1 border-b border-black flex justify-between">
                                    <span className="font-bold">Manufacturer:</span>
                                    <span>{selectedJobReport.asset.manufacturer}</span>
                                 </div>
                                 <div className="p-1 flex justify-between">
                                    <span className="font-bold">Serial No:</span>
                                    <span>{selectedJobReport.asset.serial_no}</span>
                                 </div>
                            </div>
                        </div>
                        {/* Location */}
                        <div>
                            <h4 className="font-bold bg-gray-200 border border-black border-b-0 p-1 px-2 text-xs uppercase">III. Location Details</h4>
                            <div className="border border-black text-xs">
                                 <div className="p-1 border-b border-black flex justify-between">
                                    <span className="font-bold">Site (الموقع):</span>
                                    <span>{selectedJobReport.location.site}</span>
                                 </div>
                                 <div className="p-1 border-b border-black flex justify-between">
                                    <span className="font-bold">Building:</span>
                                    <span>{selectedJobReport.location.building}</span>
                                 </div>
                                 <div className="p-1 border-b border-black flex justify-between">
                                    <span className="font-bold">Department:</span>
                                    <span>{selectedJobReport.location.department}</span>
                                 </div>
                                 <div className="p-1 flex justify-between">
                                    <span className="font-bold">Room:</span>
                                    <span>{selectedJobReport.location.room}</span>
                                 </div>
                            </div>
                        </div>
                     </div>

                     {/* IV. Fault & Remedy */}
                     <div className="mb-6">
                         <h4 className="font-bold bg-gray-200 border border-black border-b-0 p-1 px-2 text-xs uppercase">IV. Fault & Remedy Details</h4>
                         <div className="border border-black">
                            <div className="grid grid-cols-2 border-b border-black">
                                 <div className="p-2 border-r border-black flex justify-between">
                                    <span className="font-bold">Failed Date (تاريخ التعطل):</span>
                                    <span>{selectedJobReport.fault_details.failed_date}</span>
                                 </div>
                                 <div className="p-2 flex justify-between">
                                    <span className="font-bold">Repair Date (تاريخ الإصلاح):</span>
                                    <span>{selectedJobReport.fault_details.repair_date}</span>
                                 </div>
                            </div>
                            <div className="p-2 border-b border-black min-h-[60px]">
                                <span className="font-bold block mb-1">Fault Description (وصف العطل):</span>
                                <p>{selectedJobReport.fault_details.fault_description}</p>
                            </div>
                            <div className="p-2 border-b border-black min-h-[60px]">
                                <span className="font-bold block mb-1">REMEDY / WORK DONE (العمل المنجز):</span>
                                <p>{selectedJobReport.fault_details.remedy_work_done}</p>
                            </div>
                            <div className="p-2 flex justify-between">
                                <span className="font-bold">Technician (منفذ العمل):</span>
                                <span>{selectedJobReport.fault_details.technician_name}</span>
                            </div>
                         </div>
                     </div>

                     {/* V. QC Analysis */}
                     <div className="mb-6">
                         <h4 className="font-bold bg-gray-200 border border-black border-b-0 p-1 px-2 text-xs uppercase">V. Quality Control Analysis</h4>
                         <div className="border border-black p-2 grid grid-cols-2 gap-4">
                            <div className="col-span-2 border-b border-gray-300 pb-2 mb-2">
                                 <span className="font-bold mr-2">Need Spare Parts:</span>
                                 <span>{selectedJobReport.qc_analysis.need_spare_parts}</span>
                            </div>
                            
                            {[
                                { label: "Need Calibration", val: selectedJobReport.qc_analysis.need_calibration },
                                { label: "User Errors", val: selectedJobReport.qc_analysis.user_errors },
                                { label: "UnRepairable", val: selectedJobReport.qc_analysis.unrepairable },
                                { label: "Agent Repair", val: selectedJobReport.qc_analysis.agent_repair },
                                { label: "Partially Working", val: selectedJobReport.qc_analysis.partially_working },
                                { label: "Incident", val: selectedJobReport.qc_analysis.incident },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 border border-black flex items-center justify-center ${item.val ? 'bg-black text-white' : 'bg-white'}`}>
                                        {item.val && <Check size={12} />}
                                    </div>
                                    <span className="text-sm">{item.label}</span>
                                </div>
                            ))}
                         </div>
                     </div>

                     {/* VI. Approvals */}
                     <div className="mb-0">
                         <h4 className="font-bold bg-gray-200 border border-black border-b-0 p-1 px-2 text-xs uppercase">VI. Caller & Approval Details</h4>
                         <div className="border border-black">
                             <div className="p-2 border-b border-black">
                                <span className="font-bold mr-2">Caller Details (بيانات المبلغ):</span>
                                <span>{selectedJobReport.approvals.caller.name} - {selectedJobReport.approvals.caller.contact}</span>
                             </div>
                             <div className="grid grid-cols-3 divide-x divide-black">
                                 <div className="p-2 text-center h-32 flex flex-col justify-between">
                                     <div>
                                         <p className="font-bold text-xs">Dep. Head (رئيس القسم)</p>
                                         <p className="text-xs mt-1">{selectedJobReport.approvals.dept_head.name}</p>
                                     </div>
                                     <div className="border-t border-gray-400 pt-1 mt-2">
                                         <p className="text-[10px] text-gray-500">Signature & Date: {selectedJobReport.approvals.dept_head.date}</p>
                                     </div>
                                 </div>
                                 <div className="p-2 text-center h-32 flex flex-col justify-between">
                                     <div>
                                         <p className="font-bold text-xs">Site Supervisor (المهندس المسؤول)</p>
                                         <p className="text-xs mt-1">{selectedJobReport.approvals.site_supervisor.name}</p>
                                     </div>
                                     <div className="border-t border-gray-400 pt-1 mt-2">
                                         <p className="text-[10px] text-gray-500">Signature & Date: {selectedJobReport.approvals.site_supervisor.date}</p>
                                     </div>
                                 </div>
                                 <div className="p-2 text-center h-32 flex flex-col justify-between">
                                     <div>
                                         <p className="font-bold text-xs">Site Admin (مشرف الصيانة الطبية)</p>
                                         <p className="text-xs mt-1">{selectedJobReport.approvals.site_admin.name}</p>
                                     </div>
                                     <div className="border-t border-gray-400 pt-1 mt-2">
                                         <p className="text-[10px] text-gray-500">Signature & Date: {selectedJobReport.approvals.site_admin.date}</p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Footer */}
                     <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-2">
                         <p>Generated by A2M MED System • {new Date().toLocaleString()}</p>
                     </div>
                 </div>
             </div>
          );
      }

      return (
        <div className="space-y-6 animate-in fade-in">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_analysis')}</h2>
                <p className="text-text-muted text-sm">Performance metrics and documentation</p>
            </div>
            <div className="flex border-b border-border gap-6 overflow-x-auto">
                <button onClick={() => setActiveTab('tab1')} className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'tab1' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-gray-900'}`}>
                    {t('tab_reports')}
                </button>
                <button onClick={() => setActiveTab('tab3')} className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'tab3' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-gray-900'}`}>
                    {t('tab_gen_report')}
                </button>
                <button onClick={() => setActiveTab('tab2')} className={`pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'tab2' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-gray-900'}`}>
                    {t('tab_kb')}
                </button>
            </div>

            {activeTab === 'tab1' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-brand/50 transition cursor-pointer group">
                        <div className="p-3 bg-brand/10 text-brand rounded-full w-fit mb-4 group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Financial Performance</h3>
                        <p className="text-sm text-text-muted">Asset depreciation, maintenance costs, and replacement forecasting.</p>
                    </div>
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-brand/50 transition cursor-pointer group">
                        <div className="p-3 bg-brand/10 text-brand rounded-full w-fit mb-4 group-hover:scale-110 transition-transform">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Technical Reliability</h3>
                        <p className="text-sm text-text-muted">MTBF analysis, downtime tracking, and vendor performance.</p>
                    </div>
                </div>
            )}

            {activeTab === 'tab3' && (
                <div className="space-y-6">
                    {/* JOB ORDER REPORT GENERATOR */}
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm bg-blue-50/50">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                             <div className="flex items-center gap-4">
                                 <div className="bg-brand text-white p-3 rounded-lg shadow-lg shadow-brand/20">
                                     <FileText size={24} />
                                 </div>
                                 <div>
                                     <h3 className="text-lg font-bold text-gray-900">Specific Job Order Report</h3>
                                     <p className="text-sm text-text-muted">Generate detailed form for a specific Work Order (e.g., 2236)</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2 w-full md:w-auto">
                                 <input 
                                    type="text" 
                                    placeholder="Job Order No."
                                    value={jobOrderSearchId}
                                    onChange={(e) => setJobOrderSearchId(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-4 py-3 w-full md:w-40 text-sm focus:ring-2 focus:ring-brand outline-none"
                                 />
                                 <button 
                                    onClick={() => {
                                        const report = getDetailedReports().find(r => r.job_order_no.toString() === jobOrderSearchId) || getDetailedReports()[0]; // Fallback to demo report for UX
                                        setSelectedJobReport(report);
                                    }}
                                    className="bg-white border border-gray-200 hover:border-brand text-brand font-bold px-6 py-3 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center gap-2 whitespace-nowrap"
                                 >
                                     <Search size={18} /> Generate Report
                                 </button>
                             </div>
                        </div>
                    </div>

                    {/* GENERAL REPORT GENERATOR */}
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                             <div className="p-2 bg-brand/10 text-brand rounded-lg">
                                <BarChart2 size={20} />
                             </div>
                             <h3 className="text-lg font-bold text-gray-900">{t('gen_report')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('report_type')}</label>
                                <select 
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value as any)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand focus:border-transparent outline-none text-gray-900"
                                >
                                    <option value="CM">{t('cm_report')}</option>
                                    <option value="PPM">{t('ppm_report')}</option>
                                    <option value="COMPLIANCE">{t('comp_report')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('date_range')}</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="date" 
                                        value={reportStartDate}
                                        onChange={(e) => setReportStartDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand outline-none"
                                    />
                                    <input 
                                        type="date" 
                                        value={reportEndDate}
                                        onChange={(e) => setReportEndDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button 
                                    onClick={handleDownloadPDF}
                                    className="w-full bg-gray-900 hover:bg-black text-white py-2.5 rounded-lg font-bold transition shadow-md flex items-center justify-center gap-2"
                                >
                                    <Download size={18} /> {t('download_pdf')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tab2' && (
                <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                    <div className="relative mb-6">
                        <Search className="absolute start-3 top-3 text-text-muted" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search manuals, error codes, and procedures..." 
                            className="w-full ps-10 pe-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-gray-900 placeholder-gray-500 outline-none transition-shadow"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="p-4 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-100 transition">
                            <h4 className="font-bold text-brand mb-1">Siemens Magnetom - Service Manual v2.1</h4>
                            <p className="text-xs text-text-muted">Updated 2 months ago</p>
                        </div>
                        <div className="p-4 hover:bg-gray-50 rounded-lg cursor-pointer border-b border-gray-100 transition">
                            <h4 className="font-bold text-brand mb-1">Standard Operating Procedure: Ventilator Cleaning</h4>
                            <p className="text-xs text-text-muted">Updated 1 week ago</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )
  }

  return null;
};
