
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts } from '../services/mockDb';
import * as api from '../services/api';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('tab_analytics'); // Default to new analytics
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
  
  // Knowledge Base State
  const [kbSearch, setKbSearch] = useState('');
  
  // Specific Job Order View State
  const [selectedCMReport, setSelectedCMReport] = useState<DetailedJobOrderReport | null>(null);
  const [selectedPMReport, setSelectedPMReport] = useState<PreventiveMaintenanceReport | null>(null);

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

  // Work Order Details Modal State
  const [selectedWorkOrderForDetails, setSelectedWorkOrderForDetails] = useState<WorkOrder | null>(null);
  const [isWorkOrderDetailsModalOpen, setIsWorkOrderDetailsModalOpen] = useState(false);

  // Calibration View State
  const [calibrationSearch, setCalibrationSearch] = useState('');
  const [updateCalibrationModalOpen, setUpdateCalibrationModalOpen] = useState(false);
  const [assetToCalibrate, setAssetToCalibrate] = useState<Asset | null>(null);
  const [newCalibrationDate, setNewCalibrationDate] = useState(new Date().toISOString().split('T')[0]);

  // Simulation State
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  // Generate 50 Mock Manuals for Knowledge Base
  const kbDocuments = useMemo(() => {
      const manufacturers = ['GE', 'Philips', 'Siemens', 'Drager', 'Baxter', 'Hamilton', 'Mindray', 'Zoll', 'Stryker', 'Olympus'];
      const devices = ['MRI Scanner', 'CT Scan', 'Ventilator', 'Infusion Pump', 'Patient Monitor', 'X-Ray', 'Ultrasound', 'Defibrillator', 'Anesthesia Machine', 'Endoscope'];
      const types = ['Service Manual', 'User Guide', 'Technical Reference', 'Maintenance Log', 'Error Code List', 'Schematics', 'Calibration Procedure'];
      
      return Array.from({ length: 50 }).map((_, i) => {
          const man = manufacturers[Math.floor(Math.random() * manufacturers.length)];
          const dev = devices[Math.floor(Math.random() * devices.length)];
          const type = types[Math.floor(Math.random() * types.length)];
          const ver = (Math.random() * 5 + 1).toFixed(1);
          
          return {
              id: i + 1,
              title: `${man} ${dev} - ${type} v${ver}`,
              updated: `${Math.floor(Math.random() * 12) + 1} months ago`,
              category: dev,
              type: type,
              fileSize: `${(Math.random() * 10 + 0.5).toFixed(1)} MB`
          };
      });
  }, []);

  const filteredKbDocs = kbDocuments.filter(doc => 
      doc.title.toLowerCase().includes(kbSearch.toLowerCase())
  );

  // Reset tab and selection when main view changes
  useEffect(() => {
    // Default tabs depending on view
    if (currentView === 'analysis') setActiveTab('tab_analytics');
    else setActiveTab('tab1');

    setSelectedAsset(null);
    setSelectedCMReport(null);
    setSelectedPMReport(null);
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

  // --- ANALYTICS DATA CALCULATIONS ---
  const analyticsData = useMemo(() => {
    // 1. MTTR Trend (Monthly)
    const closedWOs = workOrders.filter(wo => wo.status === 'Closed' && wo.start_time && wo.close_time);
    const mttrByMonth: {[key: string]: {total: number, count: number}} = {};
    
    closedWOs.forEach(wo => {
        const month = new Date(wo.close_time!).toLocaleString('default', { month: 'short' });
        if (!mttrByMonth[month]) mttrByMonth[month] = { total: 0, count: 0 };
        const duration = new Date(wo.close_time!).getTime() - new Date(wo.start_time!).getTime();
        mttrByMonth[month].total += duration;
        mttrByMonth[month].count += 1;
    });

    const mttrTrend = Object.keys(mttrByMonth).map(m => ({
        month: m,
        hours: parseFloat((mttrByMonth[m].total / mttrByMonth[m].count / (1000 * 60 * 60)).toFixed(1))
    })).slice(0, 6); // Just first 6 for demo

    // 2. Technician Performance
    const techStats: {[key: string]: {count: number, totalTime: number}} = {};
    workOrders.filter(wo => wo.status === 'Closed').forEach(wo => {
        const techId = wo.assigned_to_id;
        if (!techStats[techId]) techStats[techId] = { count: 0, totalTime: 0 };
        techStats[techId].count += 1;
        if (wo.start_time && wo.close_time) {
            techStats[techId].totalTime += (new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime());
        }
    });

    const techPerformance = Object.keys(techStats).map(id => {
        const user = users.find(u => u.user_id === parseInt(id));
        return {
            name: user ? user.name.split(' ')[0] : `Tech ${id}`,
            woCount: techStats[id].count,
            avgMttr: parseFloat((techStats[id].totalTime / techStats[id].count / (1000 * 60 * 60)).toFixed(1))
        };
    });

    // 3. Fault Distribution by Equipment
    const faultCounts: {[key: string]: number} = {};
    workOrders.filter(wo => wo.type === WorkOrderType.CORRECTIVE).forEach(wo => {
        const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
        const name = asset ? asset.name : 'Unknown';
        faultCounts[name] = (faultCounts[name] || 0) + 1;
    });
    
    const faultDistribution = Object.keys(faultCounts)
        .map(key => ({ name: key, count: faultCounts[key] }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5); // Top 5

    // 4. Asset Status Pie
    const statusData = [
        { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length, color: '#28A745' },
        { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length, color: '#DC3545' },
        { name: 'Maint.', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length, color: '#FFC107' },
        { name: 'Scrapped', value: assets.filter(a => a.status === AssetStatus.SCRAPPED).length, color: '#6C757D' },
    ];

    // 5. Predictive Risk Table (Sorted)
    const riskData = [...assets].sort((a,b) => b.risk_score - a.risk_score).slice(0, 10);

    // 6. QC Analysis (Simulated)
    const qcData = [
        { name: 'User Errors', value: 35 },
        { name: 'Technical Faults', value: 65 }
    ];

    return { mttrTrend, techPerformance, faultDistribution, statusData, riskData, qcData };
  }, [assets, workOrders, users]);

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
  
  const handleViewWODetails = (wo: WorkOrder) => {
      setSelectedWorkOrderForDetails(wo);
      setIsWorkOrderDetailsModalOpen(true);
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

  const handleFindJobReport = async () => {
      if (reportType === 'PPM') {
          // Fetch PM Report
          const report = await api.fetchPMReport(jobOrderSearchId || '5002');
          if (report) setSelectedPMReport(report);
          else alert('PM Report Not Found. Try 5002.');
      } else {
          // Fetch CM Report (Job Order)
          if (jobOrderSearchId === '2236' || jobOrderSearchId === '') {
              setSelectedCMReport(getDetailedReports()[0]);
          } else {
              alert('Job Order Report not found. Try 2236.');
          }
      }
  };

  const COLORS = ['#28A745', '#DC3545', '#FFC107', '#6C757D'];

  // --- 1. DASHBOARD MODULE ---
  if (currentView === 'dashboard') {
    const departments = Array.from(new Set(getLocations().map(l => l.department)));
    
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_dashboard')}</h2>
                <p className="text-text-muted text-sm">{t('op_overview')}</p>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setIsSimulationActive(!isSimulationActive)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 border ${isSimulationActive ? 'bg-success/10 text-success border-success/30' : 'bg-white text-gray-500 border-gray-200'}`}
                 >
                    <Activity size={16} className={isSimulationActive ? 'animate-pulse' : ''} />
                    {isSimulationActive ? 'Live Traffic ON' : 'Simulate Traffic'}
                 </button>
                 <div className="relative">
                     <button 
                        onClick={() => setShowAlertPanel(!showAlertPanel)}
                        className="p-2 bg-white border border-border rounded-lg hover:bg-gray-50 relative"
                     >
                        <Bell size={20} className="text-gray-600"/>
                        {alerts.filter(a => a.status === 'active').length > 0 && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-danger rounded-full border-2 border-white transform translate-x-1/3 -translate-y-1/3"></span>
                        )}
                     </button>
                     
                     {showAlertPanel && (
                         <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                             <div className="p-3 bg-gray-50 border-b border-border font-bold text-sm text-gray-700 flex justify-between items-center">
                                 <span>System Alerts</span>
                                 <span className="bg-danger text-white px-1.5 py-0.5 rounded text-xs">{alerts.filter(a => a.status === 'active').length}</span>
                             </div>
                             <div className="max-h-64 overflow-y-auto">
                                 {alerts.filter(a => a.status === 'active').length === 0 ? (
                                     <div className="p-4 text-center text-text-muted text-sm">No active alerts</div>
                                 ) : (
                                     alerts.filter(a => a.status === 'active').map(alert => (
                                         <div 
                                            key={alert.id} 
                                            onClick={() => handleAlertClick(alert)}
                                            className="p-3 border-b border-border hover:bg-red-50 cursor-pointer transition-colors"
                                         >
                                             <div className="flex items-start gap-2">
                                                 <AlertTriangle size={16} className={alert.severity === 'high' ? 'text-danger' : 'text-warning'} />
                                                 <div>
                                                     <p className="text-xs font-bold text-gray-900">{alert.type === 'BOUNDARY_CROSSING' ? t('alert_boundary') : alert.type}</p>
                                                     <p className="text-xs text-text-muted mt-1">{alert.message}</p>
                                                     <p className="text-[10px] text-gray-400 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
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
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-100 text-brand rounded-lg">
                        <Activity size={24} />
                    </div>
                    <span className="text-xs font-bold text-success bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <ArrowUpCircle size={12}/> +12%
                    </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{kpiData.totalAssets}</div>
                <div className="text-sm text-text-muted font-medium">{t('total_assets')}</div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-100 text-danger rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <span className="text-xs font-bold text-danger bg-red-50 px-2 py-1 rounded-full">High</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{kpiData.openWorkOrders}</div>
                <div className="text-sm text-text-muted font-medium">{t('open_tickets')}</div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-yellow-100 text-warning-dark rounded-lg">
                        <Package size={24} />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{kpiData.lowStockAlerts}</div>
                <div className="text-sm text-text-muted font-medium">{t('inventory_alerts')}</div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">98.2%</div>
                <div className="text-sm text-text-muted font-medium">{t('kpi_availability')}</div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Clock size={24} />
                    </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{kpiData.mttr} h</div>
                <div className="text-sm text-text-muted font-medium">{t('kpi_mttr')}</div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Availability Pie Chart */}
            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <h3 className="font-bold text-lg mb-6">{t('op_overview')}</h3>
                <div className="h-64">
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
            
            {/* MTBF Trend Line Chart */}
            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <h3 className="font-bold text-lg mb-6">{t('kpi_mtbf')} (Hours)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mtbfData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="mtbf" stroke="#007BFF" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Failure Analysis Bar Chart */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-lg mb-6">{t('failure_trend')}</h3>
            <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={failureTrendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="Power" stackId="a" fill="#007BFF" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="Software" stackId="a" fill="#28A745" />
                        <Bar dataKey="Mechanical" stackId="a" fill="#FFC107" />
                        <Bar dataKey="UserError" stackId="a" fill="#DC3545" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Interactive Map */}
        <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">{t('dept_map')}</h3>
                <div className="flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"></span> Running</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger"></span> Issue</div>
                </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl h-[400px] relative p-6 overflow-hidden">
                <div className="grid grid-cols-4 gap-4 h-full">
                     {departments.map((dept, idx) => {
                         const deptAssets = assets.filter(a => getLocationName(a.location_id).includes(dept));
                         const hasIssues = deptAssets.some(a => a.status === AssetStatus.DOWN);
                         const issueCount = deptAssets.filter(a => a.status === AssetStatus.DOWN).length;

                         return (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedMapZone(dept)}
                                className={`
                                    border-2 rounded-lg p-2 relative cursor-pointer hover:shadow-md transition-all
                                    ${hasIssues ? 'bg-red-50 border-danger/30' : 'bg-white border-gray-200 hover:border-brand/30'}
                                    ${selectedMapZone === dept ? 'ring-2 ring-brand ring-offset-2' : ''}
                                `}
                            >
                                <div className="text-xs font-bold text-gray-700 mb-2 truncate">{dept}</div>
                                <div className="flex flex-wrap gap-1">
                                    {deptAssets.slice(0, 12).map((a, i) => (
                                        <div 
                                            key={i} 
                                            className={`w-2 h-2 rounded-full transition-colors duration-500 ${a.status === AssetStatus.RUNNING ? 'bg-success' : a.status === AssetStatus.DOWN ? 'bg-danger' : 'bg-warning'}`}
                                            title={`${a.name} - ${a.status}`}
                                        />
                                    ))}
                                    {deptAssets.length > 12 && <span className="text-[9px] text-gray-400">+{deptAssets.length - 12}</span>}
                                </div>
                                {hasIssues && (
                                    <div className="absolute top-1 right-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
                                        {issueCount}
                                    </div>
                                )}
                            </div>
                         );
                     })}
                </div>
                
                {selectedMapZone && (
                     <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-border p-4 animate-in slide-in-from-bottom-10 transition-all">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="font-bold text-gray-900">{selectedMapZone} Details</h4>
                             <button onClick={() => setSelectedMapZone(null)} className="text-gray-500 hover:text-gray-900"><X size={16} /></button>
                         </div>
                         <div className="flex gap-4 overflow-x-auto pb-2">
                             {assets.filter(a => getLocationName(a.location_id).includes(selectedMapZone)).map(a => (
                                 <div key={a.asset_id} className="min-w-[140px] p-2 border border-border rounded-lg bg-gray-50 flex flex-col gap-1">
                                     <div className="text-xs font-bold truncate">{a.name}</div>
                                     <div className="flex justify-between items-center">
                                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.status === AssetStatus.RUNNING ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{a.status}</span>
                                         <span className="text-[10px] text-gray-400">{a.asset_id}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                )}
            </div>
        </div>

        {/* Boundary Justification Modal */}
        {justificationModalOpen && selectedAlert && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                 <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                     <div className="flex flex-col items-center text-center">
                         <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4">
                             <ShieldAlert size={32} />
                         </div>
                         <h3 className="text-xl font-bold text-gray-900 mb-2">{t('justification_required')}</h3>
                         <p className="text-text-muted mb-6 text-sm">
                             {selectedAlert.message}
                         </p>
                         <textarea 
                             value={justificationReason}
                             onChange={(e) => setJustificationReason(e.target.value)}
                             className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand outline-none mb-4"
                             placeholder={t('enter_reason')}
                             rows={3}
                         />
                         <div className="flex gap-3 w-full">
                             <button 
                                 onClick={() => setJustificationModalOpen(false)}
                                 className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                             >
                                 {t('btn_cancel')}
                             </button>
                             <button 
                                 onClick={submitJustification}
                                 disabled={!justificationReason}
                                 className="flex-1 py-3 bg-danger hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-md disabled:opacity-50"
                             >
                                 {t('btn_justify')}
                             </button>
                         </div>
                     </div>
                 </div>
            </div>
        )}
      </div>
    );
  }

  // --- 2. ASSETS MODULE (With Maintenance & Calibration History) ---
  if (currentView === 'assets') {
    if (selectedAsset) {
      // Detailed View Logic
      const assetHistory = workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id);
      const maintenanceHistory = assetHistory.filter(wo => wo.type !== WorkOrderType.CALIBRATION).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const calibrationHistory = assetHistory.filter(wo => wo.type === WorkOrderType.CALIBRATION).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const docs = getAssetDocuments(selectedAsset.asset_id);
      const movementLogs = getMovementLogs().filter(log => log.asset_id === selectedAsset.asset_id);

      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedAsset(null)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              <ChevronLeft size={20} className="rtl:rotate-180" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('asset_details')}</h2>
              <div className="flex gap-2 text-sm text-text-muted">
                <span>{selectedAsset.name}</span> • <span>{selectedAsset.asset_id}</span>
              </div>
            </div>
            <div className={`ms-auto px-4 py-1.5 rounded-full text-sm font-bold border ${selectedAsset.status === 'Running' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
              {selectedAsset.status}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Key Info Card */}
             <div className="lg:col-span-1 space-y-6">
                <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
                   <div className="h-48 bg-gray-100">
                     <img 
                        src={selectedAsset.image || "https://images.unsplash.com/photo-1579684385180-1ea90f842331?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"} 
                        alt={selectedAsset.name} 
                        className="w-full h-full object-cover"
                     />
                   </div>
                   <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="text-xs font-bold text-text-muted uppercase">{t('manufacturer')}</label>
                             <div className="font-medium text-gray-900">{selectedAsset.manufacturer || 'N/A'}</div>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-text-muted uppercase">{t('form_model')}</label>
                             <div className="font-medium text-gray-900">{selectedAsset.model}</div>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-text-muted uppercase">{t('serial_number')}</label>
                             <div className="font-medium text-gray-900 font-mono">{selectedAsset.serial_number || 'N/A'}</div>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-text-muted uppercase">{t('purchase_date')}</label>
                             <div className="font-medium text-gray-900">{selectedAsset.purchase_date}</div>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-text-muted uppercase">{t('warranty_exp')}</label>
                             <div className="font-medium text-gray-900">{selectedAsset.warranty_expiration || 'N/A'}</div>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-text-muted uppercase">{t('location')}</label>
                             <div className="font-medium text-gray-900">{getLocationName(selectedAsset.location_id)}</div>
                          </div>
                      </div>
                      <div className="pt-4 border-t border-border">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-sm font-bold text-gray-700">{t('risk_score')}</span>
                             <span className={`text-sm font-bold ${selectedAsset.risk_score > 50 ? 'text-danger' : 'text-success'}`}>{selectedAsset.risk_score}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-1000 ${selectedAsset.risk_score > 50 ? 'bg-danger' : 'bg-success'}`}
                                style={{ width: `${selectedAsset.risk_score}%` }}
                              ></div>
                          </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Tabbed Details */}
             <div className="lg:col-span-2">
                <div className="bg-surface rounded-xl border border-border shadow-sm min-h-[500px]">
                    <div className="flex border-b border-border bg-gray-50/50">
                        {['overview', 'telemetry', 'history', 'docs'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-brand text-brand bg-white' : 'border-transparent text-text-muted hover:text-gray-900'}`}
                            >
                                {tab === 'overview' ? t('tab_list') : 
                                 tab === 'telemetry' ? t('live_readings') :
                                 tab === 'history' ? t('maintenance_history') : 
                                 t('tab_docs')}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                             <div className="space-y-6">
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                     <div className="p-4 bg-blue-50 rounded-xl text-center">
                                         <div className="text-2xl font-bold text-brand">99.8%</div>
                                         <div className="text-xs font-bold text-text-muted mt-1 uppercase">{t('uptime')}</div>
                                     </div>
                                     <div className="p-4 bg-green-50 rounded-xl text-center">
                                         <div className="text-2xl font-bold text-success">5600</div>
                                         <div className="text-xs font-bold text-text-muted mt-1 uppercase">{t('op_hours')}</div>
                                     </div>
                                     <div className="p-4 bg-purple-50 rounded-xl text-center">
                                         <div className="text-2xl font-bold text-purple-600">320d</div>
                                         <div className="text-xs font-bold text-text-muted mt-1 uppercase">{t('mtbf')}</div>
                                     </div>
                                     <div className="p-4 bg-orange-50 rounded-xl text-center">
                                         <div className="text-2xl font-bold text-orange-600">$450</div>
                                         <div className="text-xs font-bold text-text-muted mt-1 uppercase">YTD Cost</div>
                                     </div>
                                 </div>
                                 
                                 <div>
                                     <h3 className="font-bold text-lg mb-4">{t('tab_tracking')}</h3>
                                     <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 font-bold text-text-muted">
                                                <tr>
                                                    <th className="p-3">Time</th>
                                                    <th className="p-3">From</th>
                                                    <th className="p-3">To</th>
                                                    <th className="p-3">User</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {movementLogs.length > 0 ? movementLogs.map(log => (
                                                    <tr key={log.log_id} className="bg-white">
                                                        <td className="p-3">{new Date(log.timestamp).toLocaleDateString()}</td>
                                                        <td className="p-3">{getLocationName(log.from_location_id)}</td>
                                                        <td className="p-3 font-bold text-gray-900">{getLocationName(log.to_location_id)}</td>
                                                        <td className="p-3">User #{log.user_id}</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={4} className="p-4 text-center text-text-muted">No movement logs recorded.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                     </div>
                                 </div>
                             </div>
                        )}

                        {/* MAINTENANCE & CALIBRATION HISTORY */}
                        {activeTab === 'history' && (
                             <div className="space-y-8">
                                 {/* Maintenance History Section */}
                                 <div>
                                     <div className="flex items-center gap-2 mb-4">
                                         <div className="p-1.5 bg-blue-100 text-brand rounded-lg">
                                             <History size={18} />
                                         </div>
                                         <h3 className="font-bold text-lg text-gray-900">{t('maintenance_history')}</h3>
                                     </div>
                                     
                                     <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 font-bold text-text-muted border-b border-border">
                                                <tr>
                                                    <th className="p-3">Date</th>
                                                    <th className="p-3">Type</th>
                                                    <th className="p-3">Description</th>
                                                    <th className="p-3">Technician</th>
                                                    <th className="p-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {maintenanceHistory.length > 0 ? maintenanceHistory.map(wo => {
                                                    const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                                    return (
                                                        <tr key={wo.wo_id} className="bg-white hover:bg-gray-50">
                                                            <td className="p-3 whitespace-nowrap">{new Date(wo.created_at).toLocaleDateString()}</td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${wo.type === WorkOrderType.PREVENTIVE ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                    {wo.type === WorkOrderType.PREVENTIVE ? 'PM' : 'Corrective'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 font-medium text-gray-900 truncate max-w-[200px]">{wo.description}</td>
                                                            <td className="p-3 text-text-muted">
                                                                {tech ? tech.name : `User #${wo.assigned_to_id}`}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="flex items-center gap-1 text-xs font-bold text-success">
                                                                    {wo.status === 'Closed' ? <Check size={12}/> : <Clock size={12}/>} {wo.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr><td colSpan={5} className="p-8 text-center text-text-muted italic">No maintenance work orders found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                     </div>
                                 </div>

                                 {/* Calibration History Section */}
                                 <div>
                                     <div className="flex items-center gap-2 mb-4">
                                         <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                             <Thermometer size={18} />
                                         </div>
                                         <h3 className="font-bold text-lg text-gray-900">Calibration History</h3>
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                             <span className="text-sm font-medium text-text-muted">{t('last_cal')}</span>
                                             <span className="font-bold text-gray-900">{selectedAsset.last_calibration_date || 'N/A'}</span>
                                         </div>
                                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                             <span className="text-sm font-medium text-text-muted">{t('next_due')}</span>
                                             <span className={`font-bold ${new Date(selectedAsset.next_calibration_date || '') < new Date() ? 'text-danger' : 'text-success'}`}>{selectedAsset.next_calibration_date || 'N/A'}</span>
                                         </div>
                                     </div>
                                     
                                     <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 font-bold text-text-muted border-b border-border">
                                                <tr>
                                                    <th className="p-3">Date</th>
                                                    <th className="p-3">Certificate No.</th>
                                                    <th className="p-3">Result</th>
                                                    <th className="p-3">Next Due</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {calibrationHistory.length > 0 ? calibrationHistory.map(wo => (
                                                    <tr key={wo.wo_id} className="bg-white hover:bg-gray-50">
                                                        <td className="p-3 whitespace-nowrap">{new Date(wo.created_at).toLocaleDateString()}</td>
                                                        <td className="p-3 font-mono text-xs">CAL-{wo.wo_id}-{new Date(wo.created_at).getFullYear()}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-success/10 text-success border border-success/20">Pass</span>
                                                        </td>
                                                        <td className="p-3 text-text-muted">
                                                            {new Date(new Date(wo.created_at).setFullYear(new Date(wo.created_at).getFullYear() + 1)).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-text-muted italic">
                                                            No digital calibration records found. 
                                                            <br/><span className="text-xs">Refer to the latest certificate date above.</span>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                     </div>
                                 </div>
                             </div>
                        )}

                        {activeTab === 'telemetry' && (
                            <div className="h-full flex items-center justify-center text-text-muted">
                                <div className="text-center">
                                    <Activity size={48} className="mx-auto mb-4 text-brand opacity-50" />
                                    <p>Live telemetry data stream connection established.</p>
                                    <p className="text-xs mt-2">Simulated Data: Temp 22°C | Voltage 120V</p>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'docs' && (
                             <div className="space-y-4">
                                 {docs.map(doc => (
                                     <div key={doc.doc_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                         <div className="flex items-center gap-3">
                                             <FileText size={20} className="text-text-muted" />
                                             <div>
                                                 <div className="font-bold text-sm text-gray-900">{doc.title}</div>
                                                 <div className="text-xs text-text-muted">{doc.date} • {doc.type}</div>
                                             </div>
                                         </div>
                                         <button className="text-brand text-sm font-bold hover:underline">Download</button>
                                     </div>
                                 ))}
                                 {docs.length === 0 && <p className="text-text-muted text-center py-8">No documents found.</p>}
                             </div>
                        )}
                    </div>
                </div>
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_assets')}</h2>
                <p className="text-text-muted text-sm">{t('op_overview')}</p>
            </div>
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
            >
                <Plus size={18} /> {t('add_equipment')}
            </button>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-text-muted font-bold border-b border-border">
                    <tr>
                        <th className="p-4">{t('asset_info')}</th>
                        <th className="p-4">{t('location')}</th>
                        <th className="p-4">{t('status')}</th>
                        <th className="p-4 hidden md:table-cell">{t('purchase_date')}</th>
                        <th className="p-4 hidden md:table-cell">{t('risk_score')}</th>
                        <th className="p-4">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {assets.map((asset) => (
                        <tr key={asset.asset_id} className="hover:bg-gray-50 transition-colors group">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-text-muted overflow-hidden">
                                        {asset.image ? <img src={asset.image} alt="" className="w-full h-full object-cover"/> : <Package size={20} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{asset.name}</div>
                                        <div className="text-xs text-text-muted font-mono">{asset.model}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 font-medium">{getLocationName(asset.location_id)}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    asset.status === 'Running' ? 'bg-success/10 text-success' : 
                                    asset.status === 'Down' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning-dark'
                                }`}>
                                    {asset.status}
                                </span>
                            </td>
                            <td className="p-4 hidden md:table-cell text-text-muted">{asset.purchase_date}</td>
                            <td className="p-4 hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full ${asset.risk_score > 50 ? 'bg-danger' : 'bg-success'}`} style={{width: `${asset.risk_score}%`}}></div>
                                    </div>
                                    <span className="text-xs font-medium">{asset.risk_score}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <button 
                                    onClick={() => setSelectedAsset(asset)}
                                    className="text-brand font-bold hover:underline"
                                >
                                    Details
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">{t('modal_add_title')}</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_name')}</label>
                            <input 
                                type="text" 
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                value={newAssetForm.name}
                                onChange={(e) => setNewAssetForm({...newAssetForm, name: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_model')}</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newAssetForm.model}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, model: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_sn')}</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newAssetForm.asset_id}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_id: e.target.value})}
                                    placeholder="Auto-generated if empty"
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_location')}</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                value={newAssetForm.location_id}
                                onChange={(e) => setNewAssetForm({...newAssetForm, location_id: parseInt(e.target.value)})}
                            >
                                {getLocations().map(loc => (
                                    <option key={loc.location_id} value={loc.location_id}>{loc.name} ({loc.department})</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_date')}</label>
                            <input 
                                type="date" 
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                value={newAssetForm.purchase_date}
                                onChange={(e) => setNewAssetForm({...newAssetForm, purchase_date: e.target.value})}
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-gray-700 mb-1">{t('form_image')}</label>
                             <div className="border border-gray-300 rounded-lg p-2 flex items-center gap-4">
                                 <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm font-bold text-gray-700 flex items-center gap-2">
                                     <UploadCloud size={16}/> Upload
                                     <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                 </label>
                                 {newAssetForm.image && <div className="text-xs text-success font-bold flex items-center gap-1"><Check size={12}/> Image Selected</div>}
                             </div>
                             {newAssetForm.image && (
                                 <div className="mt-2 w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                                     <img src={newAssetForm.image} alt="Preview" className="w-full h-full object-cover" />
                                 </div>
                             )}
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg shadow-md transition-all">
                                {t('btn_save')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- 4. MAINTENANCE MODULE (REPLACED) ---
  if (currentView === 'maintenance') {
      const filteredWOs = workOrders.filter(wo => {
          const matchPrio = maintenanceFilterPriority === 'all' || wo.priority === maintenanceFilterPriority;
          const matchType = maintenanceFilterType === 'all' || wo.type === maintenanceFilterType;
          return matchPrio && matchType;
      });

      const openWOs = filteredWOs.filter(wo => wo.status === 'Open');
      const inProgressWOs = filteredWOs.filter(wo => wo.status === 'In Progress');
      const closedWOs = filteredWOs.filter(wo => wo.status === 'Closed');

      return (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_maintenance')}</h2>
                    <p className="text-text-muted text-sm">Manage work orders and assignments</p>
                </div>
                <button 
                    onClick={() => setIsCreateWOModalOpen(true)}
                    className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> {t('create_wo')}
                </button>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-border shadow-sm">
                <div className="flex gap-2 items-center text-sm font-bold text-gray-700">
                    <LayoutGrid size={18} className="text-text-muted" /> View:
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button 
                        onClick={() => setMaintenanceViewMode('kanban')} 
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${maintenanceViewMode === 'kanban' ? 'bg-white shadow-sm text-brand' : 'text-text-muted'}`}
                    >
                        {t('view_board')}
                    </button>
                    <button 
                        onClick={() => setMaintenanceViewMode('list')} 
                        className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${maintenanceViewMode === 'list' ? 'bg-white shadow-sm text-brand' : 'text-text-muted'}`}
                    >
                        {t('view_list')}
                    </button>
                </div>
                
                <div className="w-px h-6 bg-gray-200 mx-2"></div>
                
                <select 
                    value={maintenanceFilterPriority}
                    onChange={(e) => setMaintenanceFilterPriority(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block p-2 outline-none"
                >
                    <option value="all">Priority: All</option>
                    <option value={Priority.LOW}>Low</option>
                    <option value={Priority.MEDIUM}>Medium</option>
                    <option value={Priority.HIGH}>High</option>
                    <option value={Priority.CRITICAL}>Critical</option>
                </select>

                <select 
                    value={maintenanceFilterType}
                    onChange={(e) => setMaintenanceFilterType(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-brand focus:border-brand block p-2 outline-none"
                >
                    <option value="all">Type: All</option>
                    <option value={WorkOrderType.CORRECTIVE}>Corrective</option>
                    <option value={WorkOrderType.PREVENTIVE}>Preventive</option>
                    <option value={WorkOrderType.CALIBRATION}>Calibration</option>
                </select>
            </div>

            {maintenanceViewMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                    {/* Open Column */}
                    <div className="flex flex-col bg-gray-50 rounded-xl border border-border p-4">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-blue-500"></span> {t('wo_status_open')}
                             </h3>
                             <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-xs font-bold text-gray-500">{openWOs.length}</span>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-3">
                             {openWOs.map(wo => (
                                 <div key={wo.wo_id} className="bg-white p-4 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow group">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{wo.priority}</span>
                                         <span className="text-xs text-text-muted font-mono">#{wo.wo_id}</span>
                                     </div>
                                     <h4 className="font-bold text-gray-900 mb-1">{wo.description}</h4>
                                     <div className="text-xs text-text-muted mb-3 flex items-center gap-1"><MapPin size={10}/> {wo.asset_id}</div>
                                     <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                         <div className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                             <Clock size={12}/> {new Date(wo.created_at).toLocaleDateString()}
                                         </div>
                                         <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleViewWODetails(wo)}
                                                className="text-xs font-bold text-brand hover:underline"
                                            >
                                                Details
                                            </button>
                                            <button className="text-xs font-bold text-brand hover:underline">{t('assign')}</button>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>

                    {/* In Progress Column */}
                    <div className="flex flex-col bg-gray-50 rounded-xl border border-border p-4">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-yellow-500"></span> {t('wo_status_inprogress')}
                             </h3>
                             <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-xs font-bold text-gray-500">{inProgressWOs.length}</span>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-3">
                             {inProgressWOs.map(wo => (
                                 <div key={wo.wo_id} className="bg-white p-4 rounded-lg border-l-4 border-l-warning border-y border-r border-gray-200 shadow-sm">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 text-yellow-800">{wo.type}</span>
                                         <span className="text-xs text-text-muted font-mono">#{wo.wo_id}</span>
                                     </div>
                                     <h4 className="font-bold text-gray-900 mb-1">{wo.description}</h4>
                                     <div className="text-xs text-text-muted mb-3">Assigned: Tech #{wo.assigned_to_id}</div>
                                     <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                                         <div className="bg-warning h-1.5 rounded-full w-1/2"></div>
                                     </div>
                                      <div className="flex justify-end items-center pt-2">
                                         <button 
                                            onClick={() => handleViewWODetails(wo)}
                                            className="text-xs font-bold text-brand hover:underline"
                                        >
                                            Details
                                        </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>

                    {/* Closed Column */}
                    <div className="flex flex-col bg-gray-50 rounded-xl border border-border p-4">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                 <span className="w-3 h-3 rounded-full bg-green-500"></span> {t('wo_status_closed')}
                             </h3>
                             <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-xs font-bold text-gray-500">{closedWOs.length}</span>
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-3">
                             {closedWOs.map(wo => (
                                 <div key={wo.wo_id} className="bg-white p-4 rounded-lg border border-border shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                                     <div className="flex justify-between items-start mb-2">
                                         <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">Done</span>
                                         <span className="text-xs text-text-muted font-mono">#{wo.wo_id}</span>
                                     </div>
                                     <h4 className="font-bold text-gray-900 mb-1 line-through text-gray-500">{wo.description}</h4>
                                     <div className="text-xs text-success font-bold flex items-center gap-1"><Check size={12}/> Completed</div>
                                     <div className="flex justify-end items-center pt-2">
                                         <button 
                                            onClick={() => handleViewWODetails(wo)}
                                            className="text-xs font-bold text-brand hover:underline"
                                        >
                                            Details
                                        </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-text-muted font-bold border-b border-border">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Asset</th>
                                <th className="p-4">Description</th>
                                <th className="p-4">Priority</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Assigned</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredWOs.map(wo => (
                                <tr key={wo.wo_id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono font-medium">#{wo.wo_id}</td>
                                    <td className="p-4">{wo.asset_id}</td>
                                    <td className="p-4 font-bold text-gray-900">{wo.description}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {wo.priority}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${wo.status === 'Open' ? 'bg-blue-100 text-blue-700' : wo.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {wo.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-text-muted">Tech #{wo.assigned_to_id}</td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleViewWODetails(wo)}
                                            className="text-brand font-bold hover:underline"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create WO Modal */}
            {isCreateWOModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">{t('modal_create_wo')}</h3>
                            <button onClick={() => setIsCreateWOModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateWOSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_description')}</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newWOForm.description}
                                    onChange={(e) => setNewWOForm({...newWOForm, description: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_asset')}</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newWOForm.assetId}
                                    onChange={(e) => setNewWOForm({...newWOForm, assetId: e.target.value})}
                                    required
                                >
                                    <option value="">Select Asset...</option>
                                    {assets.map(a => (
                                        <option key={a.asset_id} value={a.asset_id}>{a.name} ({a.asset_id})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('priority')}</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                        value={newWOForm.priority}
                                        onChange={(e) => setNewWOForm({...newWOForm, priority: e.target.value as Priority})}
                                    >
                                        <option value={Priority.LOW}>Low</option>
                                        <option value={Priority.MEDIUM}>Medium</option>
                                        <option value={Priority.HIGH}>High</option>
                                        <option value={Priority.CRITICAL}>Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('type')}</label>
                                    <select 
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                        value={newWOForm.type}
                                        onChange={(e) => setNewWOForm({...newWOForm, type: e.target.value as WorkOrderType})}
                                    >
                                        <option value={WorkOrderType.CORRECTIVE}>Corrective</option>
                                        <option value={WorkOrderType.PREVENTIVE}>Preventive</option>
                                        <option value={WorkOrderType.CALIBRATION}>Calibration</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_assign_tech')}</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newWOForm.assignedToId}
                                    onChange={(e) => setNewWOForm({...newWOForm, assignedToId: e.target.value})}
                                >
                                    <option value="2">Abdalla Yasir (Tech)</option>
                                    <option value="6">Vendor Steve</option>
                                </select>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg shadow-md transition-all">
                                    {t('btn_dispatch')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Work Order Details Modal */}
            {isWorkOrderDetailsModalOpen && selectedWorkOrderForDetails && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-0 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-50 border-b border-border p-6 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Work Order Details</h3>
                                <p className="text-sm text-text-muted">ID: #{selectedWorkOrderForDetails.wo_id}</p>
                            </div>
                            <button onClick={() => setIsWorkOrderDetailsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Key Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-xs text-blue-600 font-bold uppercase">Status</div>
                                    <div className="font-bold text-gray-900">{selectedWorkOrderForDetails.status}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-text-muted font-bold uppercase">Priority</div>
                                    <div className={`font-bold ${selectedWorkOrderForDetails.priority === Priority.CRITICAL ? 'text-danger' : 'text-gray-900'}`}>{selectedWorkOrderForDetails.priority}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-text-muted font-bold uppercase">Type</div>
                                    <div className="font-bold text-gray-900">{selectedWorkOrderForDetails.type}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs text-text-muted font-bold uppercase">Assigned To</div>
                                    <div className="font-bold text-gray-900">
                                        {users.find(u => u.user_id === selectedWorkOrderForDetails.assigned_to_id)?.name || `Tech #${selectedWorkOrderForDetails.assigned_to_id}`}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Description / Task</h4>
                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">{selectedWorkOrderForDetails.description}</p>
                            </div>

                            {/* Parts Used Section - New */}
                             {selectedWorkOrderForDetails.parts_used && selectedWorkOrderForDetails.parts_used.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Parts Used</h4>
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 font-bold text-text-muted">
                                                <tr>
                                                    <th className="p-2 pl-4">Part</th>
                                                    <th className="p-2 text-right pr-4">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {selectedWorkOrderForDetails.parts_used.map((partUsage, idx) => {
                                                    const partDetails = inventory.find(i => i.part_id === partUsage.part_id);
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="p-2 pl-4 font-medium">{partDetails ? partDetails.part_name : `Part #${partUsage.part_id}`}</td>
                                                            <td className="p-2 text-right pr-4 font-bold">{partUsage.quantity}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Asset Info */}
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Asset Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex justify-between border-b border-gray-100 py-1">
                                        <span className="text-text-muted">Asset ID:</span>
                                        <span className="font-mono font-medium">{selectedWorkOrderForDetails.asset_id}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 py-1">
                                        <span className="text-text-muted">Location:</span>
                                        <span className="font-medium">{getLocationName(assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.location_id || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 py-1">
                                        <span className="text-text-muted">Model:</span>
                                        <span className="font-medium">{assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.model || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div>
                                <h4 className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Timeline</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm text-center">
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-xs text-text-muted">Created</div>
                                        <div className="font-medium">{new Date(selectedWorkOrderForDetails.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-xs text-text-muted">Started</div>
                                        <div className="font-medium">{selectedWorkOrderForDetails.start_time ? new Date(selectedWorkOrderForDetails.start_time).toLocaleDateString() : '-'}</div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="text-xs text-text-muted">Closed</div>
                                        <div className="font-medium">{selectedWorkOrderForDetails.close_time ? new Date(selectedWorkOrderForDetails.close_time).toLocaleDateString() : '-'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <button 
                                    onClick={() => setIsWorkOrderDetailsModalOpen(false)}
                                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
      );
  }

  // --- 5. INVENTORY MODULE (IMPLEMENTED) ---
  if (currentView === 'inventory') {
      const sortedInventory = [...inventory].sort((a,b) => {
          if (a.current_stock <= a.min_reorder_level && b.current_stock > b.min_reorder_level) return -1;
          if (a.current_stock > a.min_reorder_level && b.current_stock <= b.min_reorder_level) return 1;
          return 0;
      });

      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_inventory')}</h2>
                <div className="bg-white border border-border px-3 py-1 rounded-lg text-sm shadow-sm font-medium">
                    Total SKU: {inventory.length}
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-text-muted font-bold border-b border-border">
                         <tr>
                             <th className="p-4">{t('part_name')}</th>
                             <th className="p-4">{t('stock_level')}</th>
                             <th className="p-4">{t('min_level_label')}</th>
                             <th className="p-4">{t('unit_cost')}</th>
                             <th className="p-4">{t('actions')}</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                         {sortedInventory.map(part => (
                             <tr key={part.part_id} className={`hover:bg-gray-50 transition-colors ${part.current_stock <= part.min_reorder_level ? 'bg-red-50/50' : ''}`}>
                                 <td className="p-4 font-medium text-gray-900 flex items-center gap-2">
                                     {part.current_stock <= part.min_reorder_level && <AlertCircle size={16} className="text-danger" />}
                                     {part.part_name}
                                 </td>
                                 <td className="p-4 font-bold">
                                     <span className={part.current_stock <= part.min_reorder_level ? 'text-danger' : 'text-success'}>
                                         {part.current_stock}
                                     </span>
                                 </td>
                                 <td className="p-4 text-text-muted">{part.min_reorder_level}</td>
                                 <td className="p-4 text-gray-700">${part.cost}</td>
                                 <td className="p-4">
                                     <button 
                                        onClick={() => initiateRestock(part)}
                                        className="text-brand font-bold hover:underline"
                                    >
                                        {t('btn_restock')}
                                    </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
            </div>

            {/* Restock Modal */}
            {restockModalOpen && selectedPartForRestock && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                     <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                         <h3 className="text-lg font-bold text-gray-900 mb-4">{t('restock_modal_title')}</h3>
                         <div className="mb-4">
                             <p className="text-sm text-text-muted mb-1">{selectedPartForRestock.part_name}</p>
                             <div className="flex justify-between text-sm font-bold">
                                 <span>{t('current_stock_label')}: {selectedPartForRestock.current_stock}</span>
                             </div>
                         </div>
                         <div className="mb-6">
                             <label className="block text-sm font-bold text-gray-700 mb-1">{t('restock_qty')}</label>
                             <input 
                                type="number" 
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand outline-none"
                                value={restockAmount}
                                onChange={(e) => setRestockAmount(e.target.value)}
                             />
                         </div>
                         <div className="flex gap-3">
                             <button 
                                onClick={() => { setRestockModalOpen(false); setSelectedPartForRestock(null); }}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200"
                             >
                                 {t('btn_cancel')}
                             </button>
                             <button 
                                onClick={handleRestockPreCheck}
                                className="flex-1 py-2 bg-brand text-white rounded-lg font-bold hover:bg-brand-dark"
                             >
                                 {t('restock_btn')}
                             </button>
                         </div>
                     </div>
                </div>
            )}

            {/* Large Quantity Confirmation Modal */}
            {confirmRestockOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                     <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border-t-4 border-warning">
                         <div className="flex flex-col items-center text-center">
                             <AlertTriangle size={48} className="text-warning mb-3" />
                             <h3 className="text-lg font-bold text-gray-900 mb-2">{t('confirm_large_restock_title')}</h3>
                             <p className="text-sm text-text-muted mb-6">
                                 {t('confirm_large_restock_msg').replace('{qty}', restockAmount)}
                             </p>
                             <div className="flex gap-3 w-full">
                                 <button 
                                    onClick={() => setConfirmRestockOpen(false)}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200"
                                 >
                                     {t('btn_cancel')}
                                 </button>
                                 <button 
                                    onClick={submitRestock}
                                    className="flex-1 py-2 bg-warning hover:bg-yellow-500 text-black rounded-lg font-bold"
                                 >
                                     {t('btn_confirm')}
                                 </button>
                             </div>
                         </div>
                     </div>
                </div>
            )}
          </div>
      );
  }

  // --- 6. CALIBRATION MODULE (IMPLEMENTED) ---
  if (currentView === 'calibration') {
      const overdueAssets = assets.filter(a => a.next_calibration_date && new Date(a.next_calibration_date) < new Date());
      const dueSoonAssets = assets.filter(a => {
          if (!a.next_calibration_date) return false;
          const today = new Date();
          const next = new Date(a.next_calibration_date);
          const diffTime = Math.abs(next.getTime() - today.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30 && diffDays > 0;
      });

      const complianceRate = Math.round(((assets.length - overdueAssets.length) / assets.length) * 100);

      return (
          <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold text-gray-900">{t('cal_dashboard')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                       <div>
                           <div className="text-3xl font-bold text-gray-900">{complianceRate}%</div>
                           <div className="text-sm text-text-muted font-bold uppercase">{t('cal_status')}</div>
                       </div>
                       <div className="p-3 bg-blue-50 text-brand rounded-full">
                           <ClipboardCheck size={32} />
                       </div>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex items-center justify-between border-l-4 border-l-danger">
                       <div>
                           <div className="text-3xl font-bold text-danger">{overdueAssets.length}</div>
                           <div className="text-sm text-text-muted font-bold uppercase">{t('cal_overdue')}</div>
                       </div>
                       <div className="p-3 bg-red-50 text-danger rounded-full">
                           <AlertCircle size={32} />
                       </div>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-border shadow-sm flex items-center justify-between border-l-4 border-l-warning">
                       <div>
                           <div className="text-3xl font-bold text-warning-dark">{dueSoonAssets.length}</div>
                           <div className="text-sm text-text-muted font-bold uppercase">{t('cal_due_soon')}</div>
                       </div>
                       <div className="p-3 bg-yellow-50 text-warning-dark rounded-full">
                           <Clock size={32} />
                       </div>
                   </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-lg font-bold text-gray-900">{t('cal_schedule')}</h3>
                       <div className="flex gap-2">
                           <div className="relative">
                               <Search className="absolute start-3 top-2.5 text-gray-400" size={16} />
                               <input 
                                  type="text" 
                                  placeholder="Search assets..." 
                                  value={calibrationSearch}
                                  onChange={(e) => setCalibrationSearch(e.target.value)}
                                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-brand"
                               />
                           </div>
                       </div>
                   </div>
                   
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 text-text-muted font-bold border-b border-border">
                               <tr>
                                   <th className="p-4">Asset</th>
                                   <th className="p-4">Last Cal.</th>
                                   <th className="p-4">Next Due</th>
                                   <th className="p-4">Status</th>
                                   <th className="p-4">Action</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-border">
                               {assets
                                 .filter(a => a.name.toLowerCase().includes(calibrationSearch.toLowerCase()))
                                 .sort((a,b) => new Date(a.next_calibration_date || '').getTime() - new Date(b.next_calibration_date || '').getTime())
                                 .slice(0, 10)
                                 .map(asset => {
                                   const isOverdue = asset.next_calibration_date && new Date(asset.next_calibration_date) < new Date();
                                   return (
                                       <tr key={asset.asset_id} className="hover:bg-gray-50">
                                           <td className="p-4 font-medium">{asset.name} <span className="text-xs text-text-muted block">{asset.asset_id}</span></td>
                                           <td className="p-4 text-text-muted">{asset.last_calibration_date}</td>
                                           <td className={`p-4 font-bold ${isOverdue ? 'text-danger' : 'text-gray-900'}`}>{asset.next_calibration_date}</td>
                                           <td className="p-4">
                                               {isOverdue ? (
                                                   <span className="px-2 py-1 bg-red-100 text-danger rounded text-xs font-bold">Overdue</span>
                                               ) : (
                                                   <span className="px-2 py-1 bg-green-100 text-success rounded text-xs font-bold">Compliant</span>
                                               )}
                                           </td>
                                           <td className="p-4">
                                               <button 
                                                  onClick={() => { setAssetToCalibrate(asset); setUpdateCalibrationModalOpen(true); }}
                                                  className="text-brand font-bold hover:underline text-xs"
                                               >
                                                   Update
                                               </button>
                                           </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>
              </div>

              {updateCalibrationModalOpen && assetToCalibrate && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('update_cal_title')}</h3>
                          <p className="text-sm text-text-muted mb-4">{assetToCalibrate.name} ({assetToCalibrate.asset_id})</p>
                          <div className="mb-4">
                              <label className="block text-sm font-bold text-gray-700 mb-1">{t('new_cal_date')}</label>
                              <input 
                                type="date"
                                className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand"
                                value={newCalibrationDate}
                                onChange={(e) => setNewCalibrationDate(e.target.value)}
                              />
                          </div>
                          <div className="flex gap-3">
                              <button 
                                onClick={() => setUpdateCalibrationModalOpen(false)}
                                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold"
                              >
                                {t('btn_cancel')}
                              </button>
                              <button 
                                onClick={handleUpdateCalibration}
                                className="flex-1 py-2 bg-brand text-white rounded-lg font-bold"
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

  // --- 7. ANALYSIS & REPORTS MODULE (With New Analytics) ---
  if (currentView === 'analysis') {
    if (selectedCMReport) {
        return (
            <div className="animate-in fade-in space-y-6 max-w-5xl mx-auto">
                <button onClick={() => setSelectedCMReport(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-4">
                    <ChevronLeft size={20}/> Back to Search
                </button>

                <div className="bg-white p-8 shadow-lg border border-gray-200 print:shadow-none print:border-none" id="printable-report">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="w-32">
                            {/* Placeholder for Logo */}
                            <div className="bg-gray-200 h-16 w-32 flex items-center justify-center text-xs font-bold text-gray-500">LOGO</div>
                        </div>
                        <div className="text-center flex-1 px-4">
                            <h1 className="text-xl font-bold uppercase tracking-wide">Job Order Report</h1>
                            <h2 className="text-lg font-arabic font-bold text-gray-800 mt-1">تقرير أمر العمل</h2>
                            <p className="text-xs mt-2 text-gray-600">Kingdom of Saudi Arabia - Tabuk Area</p>
                            <p className="text-xs font-bold text-brand">First Gulf Company</p>
                        </div>
                        <div className="w-32 text-right text-xs">
                             <div className="font-bold">Job No: <span className="font-mono text-sm">{selectedCMReport.job_order_no}</span></div>
                             <div>Date: {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    {/* Section I */}
                    <div className="mb-6 border border-gray-300">
                        <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">I. Job & Report Identification (معلومات التقرير)</div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4 text-sm">
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-600">Report ID:</span>
                                 <span className="font-mono font-bold">{selectedCMReport.report_id}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-600">Control No:</span>
                                 <span className="font-mono font-bold">{selectedCMReport.control_no}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-600">Priority:</span>
                                 <span className="font-bold uppercase">{selectedCMReport.priority}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-600">Risk Factor:</span>
                                 <span className="font-bold uppercase">{selectedCMReport.risk_factor}</span>
                             </div>
                        </div>
                    </div>

                    {/* Section II & III */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="border border-gray-300">
                            <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">II. Asset Identification (بيانات الجهاز)</div>
                            <div className="p-4 space-y-2 text-sm">
                                <p><span className="text-gray-600 w-24 inline-block">Equipment:</span> <span className="font-bold">{selectedCMReport.asset.name} ({selectedCMReport.asset.asset_id})</span></p>
                                <p><span className="text-gray-600 w-24 inline-block">Model:</span> <span className="font-bold">{selectedCMReport.asset.model}</span></p>
                                <p><span className="text-gray-600 w-24 inline-block">Manufacturer:</span> <span className="font-bold">{selectedCMReport.asset.manufacturer}</span></p>
                                <p><span className="text-gray-600 w-24 inline-block">Serial No:</span> <span className="font-bold">{selectedCMReport.asset.serial_no}</span></p>
                            </div>
                        </div>
                        <div className="border border-gray-300">
                            <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">III. Location Details (الموقع)</div>
                            <div className="p-4 space-y-2 text-sm">
                                <p><span className="text-gray-600 w-24 inline-block">Site:</span> <span className="font-bold">{selectedCMReport.location.site}</span></p>
                                <p><span className="text-gray-600 w-24 inline-block">Building:</span> <span className="font-bold">{selectedCMReport.location.building}</span></p>
                                <p><span className="text-gray-600 w-24 inline-block">Department:</span> <span className="font-bold">{selectedCMReport.location.department}</span></p>
                                <p><span className="text-gray-600 w-24 inline-block">Room:</span> <span className="font-bold">{selectedCMReport.location.room}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Section IV */}
                    <div className="mb-6 border border-gray-300">
                        <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">IV. Fault & Remedy Details (تفاصيل العطل والإصلاح)</div>
                        <div className="p-4 text-sm space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div><span className="text-gray-600">Failed Date:</span> <span className="font-bold ml-2">{selectedCMReport.fault_details.failed_date}</span></div>
                                 <div><span className="text-gray-600">Repair Date:</span> <span className="font-bold ml-2">{selectedCMReport.fault_details.repair_date}</span></div>
                             </div>
                             <div>
                                 <span className="text-gray-600 block mb-1">Fault Description:</span>
                                 <div className="bg-gray-50 p-2 border border-gray-200 rounded">{selectedCMReport.fault_details.fault_description}</div>
                             </div>
                             <div>
                                 <span className="text-gray-600 block mb-1">REMEDY / WORK DONE:</span>
                                 <div className="bg-gray-50 p-2 border border-gray-200 rounded min-h-[60px]">{selectedCMReport.fault_details.remedy_work_done}</div>
                             </div>
                             <div>
                                 <span className="text-gray-600">Technician:</span> <span className="font-bold ml-2">{selectedCMReport.fault_details.technician_name}</span>
                             </div>
                        </div>
                    </div>

                    {/* Spare Parts */}
                    <div className="mb-6 border border-gray-300">
                         <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">Spare Parts Used (قطع الغيار)</div>
                         <table className="w-full text-sm text-left">
                             <thead className="border-b border-gray-200">
                                 <tr>
                                     <th className="p-2 pl-4">Part Name</th>
                                     <th className="p-2">Part No.</th>
                                     <th className="p-2">Qty</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {selectedCMReport.spare_parts.map((part, idx) => (
                                     <tr key={idx} className="border-b border-gray-100">
                                         <td className="p-2 pl-4">{part.part_name}</td>
                                         <td className="p-2 font-mono">{part.part_no}</td>
                                         <td className="p-2 font-bold">{part.quantity}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>

                    {/* Section V: QC */}
                    <div className="mb-6 border border-gray-300">
                        <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">V. Quality Control Analysis</div>
                        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2"><div className={`w-4 h-4 border border-gray-400 flex items-center justify-center`}>{selectedCMReport.qc_analysis.need_calibration ? '✓' : ''}</div> Need Calibration</div>
                            <div className="flex items-center gap-2"><div className={`w-4 h-4 border border-gray-400 flex items-center justify-center`}>{selectedCMReport.qc_analysis.user_errors ? '✓' : ''}</div> User Errors</div>
                            <div className="flex items-center gap-2"><div className={`w-4 h-4 border border-gray-400 flex items-center justify-center`}>{selectedCMReport.qc_analysis.unrepairable ? '✓' : ''}</div> UnRepairable</div>
                            <div className="flex items-center gap-2"><div className={`w-4 h-4 border border-gray-400 flex items-center justify-center`}>{selectedCMReport.qc_analysis.agent_repair ? '✓' : ''}</div> Agent Repair</div>
                            <div className="col-span-2 mt-2 font-bold text-gray-700 border-t border-gray-100 pt-2">
                                Spare Parts Status: {selectedCMReport.qc_analysis.need_spare_parts}
                            </div>
                        </div>
                    </div>

                    {/* Section VI: Approvals */}
                    <div className="border border-gray-300">
                        <div className="bg-gray-100 px-3 py-1 font-bold text-sm border-b border-gray-300">VI. Caller and Approval Details (الاعتمادات)</div>
                        <div className="p-4 grid grid-cols-2 gap-6 text-sm">
                             <div>
                                 <div className="font-bold mb-1">Caller Details:</div>
                                 <div>{selectedCMReport.approvals.caller.name}</div>
                                 <div className="text-xs text-gray-500">{selectedCMReport.approvals.caller.contact}</div>
                             </div>
                             <div className="space-y-4">
                                 <div className="border-b border-gray-200 pb-1">
                                     <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Dep. Head</span> <span>{selectedCMReport.approvals.dept_head.date}</span></div>
                                     <div className="font-signature text-lg">{selectedCMReport.approvals.dept_head.name}</div>
                                 </div>
                                 <div className="border-b border-gray-200 pb-1">
                                     <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Site Supervisor</span> <span>{selectedCMReport.approvals.site_supervisor.date}</span></div>
                                     <div className="font-signature text-lg">{selectedCMReport.approvals.site_supervisor.name}</div>
                                 </div>
                                  <div className="border-b border-gray-200 pb-1">
                                     <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Site Admin</span> <span>{selectedCMReport.approvals.site_admin.date}</span></div>
                                     <div className="font-signature text-lg">{selectedCMReport.approvals.site_admin.name}</div>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-4 pb-8">
                    <button onClick={handlePrintJobReport} className="flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors">
                        <Printer size={20}/> Print Report
                    </button>
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg font-bold hover:bg-brand-dark transition-colors">
                        <Download size={20}/> Download PDF
                    </button>
                </div>
            </div>
        );
    }
    
    // Default Report Generator View
    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">{t('tab_analysis')}</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('tab_analytics')} 
                        className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'tab_analytics' ? 'bg-white shadow-sm text-brand' : 'text-text-muted'}`}
                    >
                        {t('tab_analytics')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('tab1')} 
                        className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'tab1' ? 'bg-white shadow-sm text-brand' : 'text-text-muted'}`}
                    >
                        {t('tab_gen_report')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('tab2')} 
                        className={`px-4 py-2 rounded-md text-sm font-bold ${activeTab === 'tab2' ? 'bg-white shadow-sm text-brand' : 'text-text-muted'}`}
                    >
                        {t('tab_kb')}
                    </button>
                </div>
            </div>

            {/* --- STRATEGIC ANALYTICS DASHBOARD --- */}
            {activeTab === 'tab_analytics' && (
                <div className="space-y-8 animate-in slide-in-from-right-2">
                    {/* PILLAR 1: OPERATIONAL EFFICIENCY */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                            <Activity size={20} className="text-brand"/> {t('pillar_operational')}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            {/* MTTR Card */}
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <div className="text-sm text-text-muted font-bold uppercase mb-2">{t('lbl_avg_mttr')}</div>
                                <div className="text-3xl font-bold text-gray-900">{analyticsData.mttrTrend.length > 0 ? analyticsData.mttrTrend[analyticsData.mttrTrend.length-1].hours : 0} h</div>
                                <div className="text-xs text-success mt-1 font-bold">Target: &lt; 24h</div>
                            </div>
                            
                            {/* WO Count Card */}
                             <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <div className="text-sm text-text-muted font-bold uppercase mb-2">{t('lbl_wo_count')} (YTD)</div>
                                <div className="text-3xl font-bold text-gray-900">{workOrders.length}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* MTTR Trend Chart */}
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <h4 className="font-bold text-gray-700 mb-4">{t('chart_mttr_trend')}</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData.mttrTrend}>
                                            <defs>
                                                <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#007BFF" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#007BFF" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Area type="monotone" dataKey="hours" stroke="#007BFF" fillOpacity={1} fill="url(#colorMttr)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                             {/* Technician Performance Chart */}
                             <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <h4 className="font-bold text-gray-700 mb-4">{t('chart_tech_perf')}</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.techPerformance} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                                            <Legend />
                                            <Bar dataKey="woCount" name="Closed WOs" fill="#28A745" radius={[0, 4, 4, 0]} barSize={20} />
                                            <Bar dataKey="avgMttr" name="Avg MTTR (h)" fill="#007BFF" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PILLAR 2: ASSET MANAGEMENT & PREDICTIVE */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2 mt-8">
                            <ShieldAlert size={20} className="text-brand"/> {t('pillar_assets')}
                        </h3>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Asset Status Pie */}
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <h4 className="font-bold text-gray-700 mb-4">{t('chart_asset_status')}</h4>
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analyticsData.statusData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analyticsData.statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Fault Distribution Bar */}
                            <div className="bg-white p-6 rounded-xl border border-border shadow-sm lg:col-span-2">
                                <h4 className="font-bold text-gray-700 mb-4">{t('chart_fault_dist')} (Top 5)</h4>
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.faultDistribution}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} interval={0} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="count" fill="#DC3545" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                            {/* QC Analysis */}
                             <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                                <h4 className="font-bold text-gray-700 mb-4">{t('chart_qc_analysis')}</h4>
                                <div className="h-60">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analyticsData.qcData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                dataKey="value"
                                                label
                                            >
                                                 <Cell fill="#FFC107" />
                                                 <Cell fill="#007BFF" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Predictive Risk Table */}
                            <div className="bg-white border border-border rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
                                <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-900">{t('table_risk_report')}</h4>
                                    <span className="text-xs font-bold text-white bg-danger px-2 py-1 rounded">Top High Risk</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-text-muted font-bold border-b border-border bg-white">
                                            <tr>
                                                <th className="p-3">Control No / ID</th>
                                                <th className="p-3">Equipment</th>
                                                <th className="p-3">Model</th>
                                                <th className="p-3">Risk Factor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analyticsData.riskData.map(asset => (
                                                <tr key={asset.asset_id} className={asset.risk_score > 70 ? "bg-red-50/50" : ""}>
                                                    <td className="p-3 font-mono">{asset.asset_id}</td>
                                                    <td className="p-3 font-medium">{asset.name}</td>
                                                    <td className="p-3 text-text-muted">{asset.model}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                                <div 
                                                                    className={`h-1.5 rounded-full ${asset.risk_score > 70 ? 'bg-danger' : asset.risk_score > 40 ? 'bg-warning' : 'bg-success'}`}
                                                                    style={{width: `${asset.risk_score}%`}}
                                                                ></div>
                                                            </div>
                                                            <span className={`font-bold ${asset.risk_score > 70 ? 'text-danger' : 'text-gray-700'}`}>{asset.risk_score}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'tab1' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* SPECIFIC JOB ORDER SEARCH */}
                     <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                         <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-blue-100 text-brand rounded-lg"><FileText size={24}/></div>
                             <div>
                                 <h3 className="font-bold text-lg text-gray-900">Find Specific Job Order</h3>
                                 <p className="text-sm text-text-muted">Enter WO# to view detailed technical report</p>
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-1">Job Order / WO Number</label>
                                 <input 
                                    type="text" 
                                    placeholder="e.g. 2236"
                                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand"
                                    value={jobOrderSearchId}
                                    onChange={(e) => setJobOrderSearchId(e.target.value)}
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-1">Report Type</label>
                                 <select 
                                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand"
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value as any)}
                                 >
                                     <option value="CM">Corrective Maintenance (CM)</option>
                                     <option value="PPM">Preventive Maintenance (PPM)</option>
                                 </select>
                             </div>
                             <button 
                                onClick={handleFindJobReport}
                                className="w-full bg-brand text-white py-3 rounded-lg font-bold hover:bg-brand-dark transition-colors shadow-md mt-2"
                             >
                                 Search & View Report
                             </button>
                         </div>
                     </div>

                     {/* BATCH REPORT GENERATOR */}
                     <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                         <div className="flex items-center gap-3 mb-6">
                             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><BarChart2 size={24}/></div>
                             <div>
                                 <h3 className="font-bold text-lg text-gray-900">Batch Report Generator</h3>
                                 <p className="text-sm text-text-muted">Generate summary reports for analysis</p>
                             </div>
                         </div>
                         
                         <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                                     <input 
                                        type="date" 
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand"
                                        value={reportStartDate}
                                        onChange={(e) => setReportStartDate(e.target.value)}
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                                     <input 
                                        type="date" 
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-brand"
                                        value={reportEndDate}
                                        onChange={(e) => setReportEndDate(e.target.value)}
                                     />
                                 </div>
                             </div>
                             
                             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                                 <h4 className="font-bold text-gray-900 mb-2">Select Summary Type:</h4>
                                 <div className="space-y-2">
                                     <label className="flex items-center gap-2 cursor-pointer">
                                         <input type="radio" name="batchType" className="accent-brand" defaultChecked />
                                         <span>Monthly Compliance Summary</span>
                                     </label>
                                     <label className="flex items-center gap-2 cursor-pointer">
                                         <input type="radio" name="batchType" className="accent-brand" />
                                         <span>Asset Failure Rate Analysis</span>
                                     </label>
                                 </div>
                             </div>

                             <button 
                                onClick={handleDownloadPDF}
                                className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
                             >
                                 <Download size={18}/> Generate PDF Summary
                             </button>
                         </div>
                     </div>
                </div>
            )}
            
            {activeTab === 'tab2' && (
                /* KNOWLEDGE BASE TAB */
                <div className="bg-white rounded-xl border border-border shadow-sm min-h-[500px] flex flex-col">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><Book size={20}/> Technical Library</h3>
                        <div className="relative w-64">
                            <Search className="absolute start-3 top-2.5 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search manuals, guides..."
                                value={kbSearch}
                                onChange={(e) => setKbSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-brand"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredKbDocs.map(doc => (
                                <div key={doc.id} className="p-4 border border-gray-200 rounded-xl hover:border-brand hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white text-gray-600 group-hover:text-brand transition-colors">
                                            {doc.type === 'Service Manual' ? <Wrench size={20}/> : <FileText size={20}/>}
                                        </div>
                                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">PDF • {doc.fileSize}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-1">{doc.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <span>{doc.category}</span>
                                        <span>•</span>
                                        <span>Updated {doc.updated}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  }

  // --- 8. USERS MODULE (IMPLEMENTED) ---
  if (currentView === 'users') {
      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">{t('users_title')}</h2>
                  <button 
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                  >
                      <Plus size={18} /> {t('add_user')}
                  </button>
              </div>

              <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-text-muted font-bold border-b border-border">
                          <tr>
                              <th className="p-4">{t('user_name')}</th>
                              <th className="p-4">{t('user_role')}</th>
                              <th className="p-4">{t('user_email')}</th>
                              <th className="p-4">{t('user_dept')}</th>
                              <th className="p-4">{t('user_phone')}</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                          {users.map(user => (
                              <tr key={user.user_id} className="hover:bg-gray-50">
                                  <td className="p-4 font-bold text-gray-900 flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold">
                                          {user.name.charAt(0)}
                                      </div>
                                      {user.name}
                                  </td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold border ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                          {user.role}
                                      </span>
                                  </td>
                                  <td className="p-4 text-text-muted">{user.email}</td>
                                  <td className="p-4">{user.department}</td>
                                  <td className="p-4 font-mono">{user.phone_number || '-'}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {isAddUserModalOpen && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold text-gray-900">{t('modal_add_user')}</h3>
                              <button onClick={() => setIsAddUserModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                  <X size={20} />
                              </button>
                          </div>
                          <form onSubmit={handleAddUserSubmit} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_name')}</label>
                                      <div className="relative">
                                          <input 
                                              type="text" 
                                              required
                                              className="w-full pl-9 border border-gray-300 rounded-lg p-2.5 outline-none focus:border-brand"
                                              value={newUserForm.name}
                                              onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                                          />
                                          <UsersIcon className="absolute left-3 top-3 text-gray-400" size={16}/>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_role')}</label>
                                      <select 
                                          className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-brand"
                                          value={newUserForm.role}
                                          onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                                      >
                                          <option value={UserRole.TECHNICIAN}>Technician</option>
                                          <option value={UserRole.NURSE}>Nurse</option>
                                          <option value={UserRole.SUPERVISOR}>Supervisor</option>
                                          <option value={UserRole.ENGINEER}>Engineer</option>
                                          <option value={UserRole.VENDOR}>Vendor</option>
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_email')}</label>
                                  <div className="relative">
                                      <input 
                                          type="email" 
                                          required
                                          className="w-full pl-9 border border-gray-300 rounded-lg p-2.5 outline-none focus:border-brand"
                                          value={newUserForm.email}
                                          onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                                      />
                                      <Mail className="absolute left-3 top-3 text-gray-400" size={16}/>
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_password')}</label>
                                      <div className="relative">
                                          <input 
                                              type="password" 
                                              required
                                              className="w-full pl-9 border border-gray-300 rounded-lg p-2.5 outline-none focus:border-brand"
                                              value={newUserForm.password}
                                              onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                                          />
                                          <Key className="absolute left-3 top-3 text-gray-400" size={16}/>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_phone')}</label>
                                      <div className="relative">
                                          <input 
                                              type="text" 
                                              className="w-full pl-9 border border-gray-300 rounded-lg p-2.5 outline-none focus:border-brand"
                                              value={newUserForm.phone}
                                              onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                                          />
                                          <Phone className="absolute left-3 top-3 text-gray-400" size={16}/>
                                      </div>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">{t('user_dept')}</label>
                                  <input 
                                      type="text" 
                                      required
                                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-brand"
                                      value={newUserForm.department}
                                      onChange={(e) => setNewUserForm({...newUserForm, department: e.target.value})}
                                  />
                              </div>
                              
                              <div className="border-t border-gray-100 pt-4 mt-2">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('upload_sign')}</label>
                                  <div className="flex items-center gap-4">
                                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 transition-colors flex items-center gap-2">
                                          <UploadCloud size={16}/> Choose Image
                                          <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                                      </label>
                                      {newUserForm.signature && <span className="text-success text-xs font-bold flex items-center gap-1"><Check size={12}/> Uploaded</span>}
                                  </div>
                              </div>

                              <div className="pt-4">
                                  <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg shadow-md transition-all">
                                      {t('btn_create_user')}
                                  </button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return null;
};
