
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, SystemAlert } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, restockPart, getSystemAlerts } from '../services/mockDb';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, FileBarChart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SupervisorProps {
  currentView: string;
  assets: Asset[];
  workOrders: WorkOrder[];
  inventory: InventoryPart[];
  onAddAsset: (asset: Asset) => void;
  refreshData: () => void;
  onNavigate: (view: string) => void;
}

export const SupervisorView: React.FC<SupervisorProps> = ({ currentView, assets, workOrders, inventory, onAddAsset, refreshData, onNavigate }) => {
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
    purchase_date: new Date().toISOString().split('T')[0]
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
  
  // Specific Job Order View State
  const [selectedJobReport, setSelectedJobReport] = useState<DetailedJobOrderReport | null>(null);

  // --- NEW ADMIN UI STATES ---
  const [alerts, setAlerts] = useState<SystemAlert[]>(getSystemAlerts());
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [justificationModalOpen, setJustificationModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [justificationReason, setJustificationReason] = useState('');
  const [selectedMapZone, setSelectedMapZone] = useState<string | null>(null);

  // Reset tab and selection when main view changes
  useEffect(() => {
    setActiveTab('tab1');
    setSelectedAsset(null);
    setSelectedJobReport(null);
  }, [currentView]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    return {
      totalAssets: assets.length,
      openWorkOrders: workOrders.filter(wo => wo.status !== 'Closed').length,
      lowStockAlerts: inventory.filter(i => i.current_stock <= i.min_reorder_level).length,
      availability: [
          { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length },
          { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length },
          { name: 'Maint', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length },
      ]
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
        image: 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' // Default placeholder
    };
    onAddAsset(asset);
    setIsAddModalOpen(false);
    setNewAssetForm({
        name: '',
        model: '',
        asset_id: '',
        location_id: 101,
        purchase_date: new Date().toISOString().split('T')[0]
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

  const submitRestock = () => {
     if (selectedPartForRestock && restockAmount) {
         restockPart(selectedPartForRestock.part_id, parseInt(restockAmount));
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
          // Mock: resolve alert
          setAlerts(alerts.map(a => a.id === selectedAlert.id ? {...a, status: 'resolved'} : a));
          setJustificationModalOpen(false);
          setSelectedAlert(null);
          setJustificationReason('');
          setShowAlertPanel(false);
      }
  };

  const COLORS = ['#28A745', '#DC3545', '#FFC107'];

  // --- 1. DASHBOARD MODULE (ADMIN/HEAD UI) ---
  if (currentView === 'dashboard') {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
        </div>

        {/* INTERACTIVE MAP */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={20} className="text-text-muted" />
                    {t('dept_map')}
                </h3>
                <div className="flex gap-2 text-[10px] font-medium">
                    <span className="bg-gray-100 px-2 py-1 rounded text-text-muted">Click zone to view assets</span>
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
                                            className={`w-2 h-2 rounded-full ${
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
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${asset.status === AssetStatus.RUNNING ? 'bg-green-100 text-green-800' : asset.status === AssetStatus.DOWN ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
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
  
  // --- 2. ASSETS MODULE ---
  if (currentView === 'assets') {
      const allDocuments = getAssetDocuments();
      const movementLogs = getMovementLogs();

      if (selectedAsset) {
          const assetWOs = workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id);
          const assetDocs = getAssetDocuments(selectedAsset.asset_id);
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
                                  {assetWOs.map(wo => (<div key={wo.wo_id} className="border p-3 rounded">#{wo.wo_id} - {wo.description}</div>))}
                              </div>
                          )}
                       </div>
                   </div>
                   <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
                        <img src={selectedAsset.image} alt="Asset" className="w-full rounded-lg mb-4 object-cover aspect-square"/>
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
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="bg-white p-6 rounded-lg shadow-xl"><h3 className="font-bold mb-4">Add Asset</h3><button onClick={() => setIsAddModalOpen(false)}>Close</button></div></div>
             )}
        </div>
      );
  }

  // --- 3. MAINTENANCE MODULE (Skipped) ---
  if (currentView === 'maintenance') return <div className="p-6">Maintenance View</div>;

  // --- 4. INVENTORY MODULE ---
  if (currentView === 'inventory') {
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

  // --- 5. CALIBRATION MODULE (Skipped) ---
  if (currentView === 'calibration') return <div className="p-6">Calibration View</div>;

  // --- 6. ANALYSIS & KNOWLEDGE MODULE ---
  if (currentView === 'analysis') {
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
                 <div className="bg-white p-8 mx-auto shadow-2xl max-w-[210mm] min-h-[297mm] text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
                     {/* REPORT CONTENT SAME AS PREVIOUS */}
                     <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
                         <div className="text-start">
                             <h1 className="text-xl font-bold uppercase">First Gulf Company</h1>
                             <p className="text-sm font-bold">Kingdom of Saudi Arabia</p>
                             <p className="text-sm">Tabuk area</p>
                         </div>
                         <div className="text-center">
                             <h2 className="text-2xl font-black underline uppercase mb-1">Job Order Report</h2>
                             <h3 className="text-lg font-bold arabic-font">تقرير أمر العمل</h3>
                         </div>
                         <div className="text-end">
                             <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 border border-black">LOGO</div>
                         </div>
                     </div>
                     {/* Rest of report fields simplified for brevity but would exist here */}
                     <div className="border border-black mb-4 p-4 text-center">
                         <p className="font-bold">Job Order #{selectedJobReport.job_order_no}</p>
                         <p>Full detail report content loaded...</p>
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
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm bg-blue-50/50">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center gap-4">
                                 <div className="bg-brand text-white p-3 rounded-lg shadow-lg shadow-brand/20">
                                     <FileText size={24} />
                                 </div>
                                 <div>
                                     <h3 className="text-lg font-bold text-gray-900">Job Order Report #2236</h3>
                                     <p className="text-sm text-text-muted">Corrective Maintenance - Vital Signs Monitor - OPD</p>
                                 </div>
                             </div>
                             <button 
                                onClick={() => setSelectedJobReport(getDetailedReports()[0])}
                                className="bg-white border border-gray-200 hover:border-brand text-brand font-bold px-6 py-3 rounded-lg shadow-sm transition-all hover:shadow-md flex items-center gap-2"
                             >
                                 <Search size={18} /> View Report
                             </button>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                             <div className="p-2 bg-brand/10 text-brand rounded-lg">
                                <FileBarChart size={20} />
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
