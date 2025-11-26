// ... existing imports ...
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService'; // Import Predictive Service
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SupervisorProps {
  currentView: string;
  currentUser: User; 
  assets: Asset[];
  workOrders: WorkOrder[];
  inventory: InventoryPart[];
  users?: User[]; 
  onAddAsset: (asset: Asset) => void;
  onAddUser?: (user: User) => void; 
  refreshData: () => void;
  onNavigate: (view: string) => void;
}

export const SupervisorView: React.FC<SupervisorProps> = ({ currentView, currentUser, assets, workOrders, inventory, users = [], onAddAsset, onAddUser, refreshData, onNavigate }) => {
    // ... KEEP ALL EXISTING STATE AND LOGIC UNCHANGED ...
    const [activeTab, setActiveTab] = useState('tab_analytics'); 
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const { t, language } = useLanguage();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAssetForm, setNewAssetForm] = useState({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' });
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, department: '', signature: '' });
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [confirmRestockOpen, setConfirmRestockOpen] = useState(false);
    const [selectedPartForRestock, setSelectedPartForRestock] = useState<InventoryPart | null>(null);
    const [restockAmount, setRestockAmount] = useState('');
    const [reportType, setReportType] = useState<'CM' | 'PPM' | 'COMPLIANCE'>('CM');
    const [reportStartDate, setReportStartDate] = useState('2023-01-01');
    const [reportEndDate, setReportEndDate] = useState('2023-12-31');
    const [jobOrderSearchId, setJobOrderSearchId] = useState('');
    const [kbSearch, setKbSearch] = useState('');
    const [selectedCMReport, setSelectedCMReport] = useState<DetailedJobOrderReport | null>(null);
    const [selectedPMReport, setSelectedPMReport] = useState<PreventiveMaintenanceReport | null>(null);
    const [alerts, setAlerts] = useState<SystemAlert[]>(getSystemAlerts());
    const [showAlertPanel, setShowAlertPanel] = useState(false);
    const [justificationModalOpen, setJustificationModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
    const [justificationReason, setJustificationReason] = useState('');
    // 3D Map State
    const [selectedMapZone, setSelectedMapZone] = useState<string | null>(null);
    
    const [maintenanceViewMode, setMaintenanceViewMode] = useState<'kanban' | 'list'>('kanban');
    const [maintenanceFilterPriority, setMaintenanceFilterPriority] = useState<string>('all');
    const [maintenanceFilterType, setMaintenanceFilterType] = useState<string>('all');
    const [isCreateWOModalOpen, setIsCreateWOModalOpen] = useState(false);
    const [newWOForm, setNewWOForm] = useState({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' });
    const [selectedWorkOrderForDetails, setSelectedWorkOrderForDetails] = useState<WorkOrder | null>(null);
    const [isWorkOrderDetailsModalOpen, setIsWorkOrderDetailsModalOpen] = useState(false);
    const [calibrationSearch, setCalibrationSearch] = useState('');
    const [updateCalibrationModalOpen, setUpdateCalibrationModalOpen] = useState(false);
    const [assetToCalibrate, setAssetToCalibrate] = useState<Asset | null>(null);
    const [newCalibrationDate, setNewCalibrationDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSimulationActive, setIsSimulationActive] = useState(false);
    
    // New State for Assignment
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedWOForAssignment, setSelectedWOForAssignment] = useState<WorkOrder | null>(null);
    const [selectedTechForAssignment, setSelectedTechForAssignment] = useState('');
    const [recommendedTechs, setRecommendedTechs] = useState<TechRecommendation[]>([]); // NEW STATE

    // New State for AI Search
    const [kbMode, setKbMode] = useState<'list' | 'ai'>('list');
    const [aiQuery, setAiQuery] = useState('');
    const [aiResult, setAiResult] = useState<{explanation: string, solution: string, relevantDocs: string[]} | null>(null);
    const [isAiSearching, setIsAiSearching] = useState(false);

    // Approval Workflow State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [selectedWOForApproval, setSelectedWOForApproval] = useState<WorkOrder | null>(null);
    const [approvalSignature, setApprovalSignature] = useState('');

    // Use Centralized Knowledge Base Docs
    const kbDocuments = useMemo(() => getKnowledgeBaseDocs(), []);
    const filteredKbDocs = kbDocuments.filter(doc => doc.title.toLowerCase().includes(kbSearch.toLowerCase()));
    
    // --- PREDICTIVE RISK CALCULATION ON LOAD ---
    useEffect(() => {
        // In a real app, this runs on the backend. Here we simulate the update on load.
        // We iterate through assets and update their risk score based on the new logic.
        const movementLogs = getMovementLogs(); // In real app, fetch these
        assets.forEach(asset => {
             const newScore = calculateAssetRiskScore(asset, workOrders, movementLogs);
             // We don't have a bulk update API in this demo, so we just mutate the local object for display
             // In a real scenario: api.updateAssetRisk(asset.asset_id, newScore);
             asset.risk_score = newScore; 
        });
    }, [assets, workOrders]); // Recalculate when data changes

    // Handlers
    const handleAiSearch = async () => {
        if(!aiQuery) return;
        setIsAiSearching(true);
        setAiResult(null);
        
        // Extract titles for context
        const availableTitles = kbDocuments.map(d => d.title);
        
        const result = await searchKnowledgeBase(aiQuery, availableTitles, language);
        setAiResult(result);
        setIsAiSearching(false);
    };

    useEffect(() => { if (currentView === 'analysis') setActiveTab('tab_analytics'); else setActiveTab('tab1'); setSelectedAsset(null); setSelectedCMReport(null); setSelectedPMReport(null); if (currentView !== 'dashboard') setIsSimulationActive(false); }, [currentView]);
    useEffect(() => { let interval: NodeJS.Timeout; if (isSimulationActive && currentView === 'dashboard') { interval = setInterval(async () => { const randomIdx = Math.floor(Math.random() * assets.length); const targetAsset = assets[randomIdx]; const r = Math.random(); let newStatus = AssetStatus.RUNNING; if (r > 0.90) newStatus = AssetStatus.DOWN; else if (r > 0.80) newStatus = AssetStatus.UNDER_MAINT; if (targetAsset.status !== newStatus) { await api.updateAssetStatus(targetAsset.asset_id, newStatus); refreshData(); } }, 3000); } return () => clearInterval(interval); }, [isSimulationActive, currentView, assets, refreshData]);
    
    const kpiData = useMemo(() => { /* ... existing logic ... */ return { totalAssets: assets.length, openWorkOrders: workOrders.filter(wo => wo.status !== 'Closed').length, lowStockAlerts: inventory.filter(i => i.current_stock <= i.min_reorder_level).length, availability: [ { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length }, { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length }, { name: 'Maint', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length }, ], mttr: '4.2' }; }, [assets, workOrders, inventory]);
    const mtbfData = [ { month: 'Jan', mtbf: 450 }, { month: 'Feb', mtbf: 480 }, { month: 'Mar', mtbf: 520 }, { month: 'Apr', mtbf: 510 }, { month: 'May', mtbf: 550 }, { month: 'Jun', mtbf: 590 }, ];
    const failureTrendData = [ { month: 'Jan', Power: 12, Software: 8, Mechanical: 5, UserError: 2 }, { month: 'Feb', Power: 10, Software: 12, Mechanical: 4, UserError: 3 }, { month: 'Mar', Power: 8, Software: 15, Mechanical: 6, UserError: 1 }, { month: 'Apr', Power: 5, Software: 9, Mechanical: 8, UserError: 4 }, { month: 'May', Power: 7, Software: 11, Mechanical: 7, UserError: 2 }, { month: 'Jun', Power: 4, Software: 8, Mechanical: 9, UserError: 5 }, ];
    
    const analyticsData = useMemo(() => {
        // ... (existing logic) ...
        const closedWOs = workOrders.filter(wo => wo.status === 'Closed' && wo.start_time && wo.close_time);
        const mttrByMonth: {[key: string]: {total: number, count: number}} = {};
        closedWOs.forEach(wo => { const month = new Date(wo.close_time!).toLocaleString('default', { month: 'short' }); if (!mttrByMonth[month]) mttrByMonth[month] = { total: 0, count: 0 }; const duration = new Date(wo.close_time!).getTime() - new Date(wo.start_time!).getTime(); mttrByMonth[month].total += duration; mttrByMonth[month].count += 1; });
        const mttrTrend = Object.keys(mttrByMonth).map(m => ({ month: m, hours: parseFloat((mttrByMonth[m].total / mttrByMonth[m].count / (1000 * 60 * 60)).toFixed(1)) })).slice(0, 6);
        
        // TECHNICIAN PERFORMANCE & RATING
        const techStats: {[key: string]: {count: number, totalTime: number, totalRating: number, ratingCount: number, firstFix: number}} = {};
        
        workOrders.filter(wo => wo.status === 'Closed').forEach(wo => {
            const techId = wo.assigned_to_id;
            if (!techStats[techId]) techStats[techId] = { count: 0, totalTime: 0, totalRating: 0, ratingCount: 0, firstFix: 0 };
            
            techStats[techId].count += 1;
            
            if (wo.start_time && wo.close_time) {
                techStats[techId].totalTime += (new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime());
            }
            
            // Rating
            if (wo.nurse_rating) {
                techStats[techId].totalRating += wo.nurse_rating;
                techStats[techId].ratingCount += 1;
            }

            // First Fix
            if (wo.is_first_time_fix) {
                techStats[techId].firstFix += 1;
            }
        });

        const techPerformance = Object.keys(techStats).map(id => {
            const user = users.find(u => u.user_id === parseInt(id));
            const stats = techStats[id];
            return {
                id: id,
                name: user ? user.name : `Tech ${id}`,
                woCount: stats.count,
                avgMttr: parseFloat((stats.totalTime / stats.count / (1000 * 60 * 60)).toFixed(1)),
                avgRating: stats.ratingCount > 0 ? (stats.totalRating / stats.ratingCount).toFixed(1) : 'N/A',
                ftfr: ((stats.firstFix / stats.count) * 100).toFixed(0) + '%'
            };
        });

        const faultCounts: {[key: string]: number} = {};
        workOrders.filter(wo => wo.type === WorkOrderType.CORRECTIVE).forEach(wo => { const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id); const name = asset ? asset.name : 'Unknown'; faultCounts[name] = (faultCounts[name] || 0) + 1; });
        const faultDistribution = Object.keys(faultCounts).map(key => ({ name: key, count: faultCounts[key] })).sort((a,b) => b.count - a.count).slice(0, 5);
        const statusData = [ { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length, color: '#10B981' }, { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length, color: '#EF4444' }, { name: 'Maint.', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length, color: '#F59E0B' }, { name: 'Scrapped', value: assets.filter(a => a.status === AssetStatus.SCRAPPED).length, color: '#64748B' }, ];
        const riskData = [...assets].sort((a,b) => b.risk_score - a.risk_score).slice(0, 10);
        const qcData = [ { name: 'User Errors', value: 35 }, { name: 'Technical Faults', value: 65 } ];
        
        // TCO ANALYSIS
        const tcoData = assets
            .filter(a => a.purchase_cost && a.accumulated_maintenance_cost)
            .sort((a,b) => (b.accumulated_maintenance_cost || 0) - (a.accumulated_maintenance_cost || 0))
            .slice(0, 5)
            .map(a => ({
                name: a.name,
                purchase: a.purchase_cost || 0,
                maintenance: a.accumulated_maintenance_cost || 0,
                recommendation: (a.accumulated_maintenance_cost || 0) > ((a.purchase_cost || 0) * 0.4) ? 'Replace' : 'Repair'
            }));

        return { mttrTrend, techPerformance, faultDistribution, statusData, riskData, qcData, tcoData };
    }, [assets, workOrders, users]);

    // ... COPY ALL HANDLERS (handleImageChange, handleAddSubmit, etc...) ...
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewAssetForm(prev => ({ ...prev, image: reader.result as string })); }; reader.readAsDataURL(file); } };
    const handleAddSubmit = (e: React.FormEvent) => { e.preventDefault(); const asset: Asset = { asset_id: newAssetForm.asset_id || `NFC-${Math.floor(Math.random() * 10000)}`, name: newAssetForm.name, model: newAssetForm.model, location_id: Number(newAssetForm.location_id), status: AssetStatus.RUNNING, purchase_date: newAssetForm.purchase_date, operating_hours: 0, risk_score: 0, last_calibration_date: newAssetForm.purchase_date, next_calibration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], image: newAssetForm.image || 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' }; onAddAsset(asset); setIsAddModalOpen(false); setNewAssetForm({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' }); };
    // ... OTHER HANDLERS ...
    const handleAddUserSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!onAddUser) return; const newUser: User = { user_id: Math.floor(Math.random() * 100000), name: newUserForm.name, email: newUserForm.email, role: newUserForm.role, phone_number: newUserForm.phone, password: newUserForm.password, department: newUserForm.department, digital_signature: newUserForm.signature, location_id: 101 }; onAddUser(newUser); setIsAddUserModalOpen(false); refreshData(); setNewUserForm({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, department: '', signature: '' }); };
    const initiateRestock = (part: InventoryPart) => { setSelectedPartForRestock(part); setRestockAmount(''); setRestockModalOpen(true); };
    const handleRestockPreCheck = () => { const qty = parseInt(restockAmount); if (!qty || qty <= 0) return; if (qty > 50) { setConfirmRestockOpen(true); } else { submitRestock(); } };
    const submitRestock = async () => { if (selectedPartForRestock && restockAmount) { await api.restockPart(selectedPartForRestock.part_id, parseInt(restockAmount)); refreshData(); setRestockModalOpen(false); setConfirmRestockOpen(false); setRestockAmount(''); setSelectedPartForRestock(null); } };
    const handleDownloadPDF = () => { const printWindow = window.open('', '', 'height=800,width=1000'); if (printWindow) { printWindow.document.write('<html><head><title>Compliance Report</title></head><body><h1>Strategic Compliance Report</h1><p>Includes: MTBF Analysis, Boundary Alerts</p></body></html>'); printWindow.print(); } };
    const handlePrintJobReport = () => { window.print(); };
    const handleAlertClick = (alert: SystemAlert) => { if (alert.type === 'BOUNDARY_CROSSING') { setSelectedAlert(alert); setJustificationModalOpen(true); } };
    const submitJustification = () => { if (selectedAlert && justificationReason) { setAlerts(alerts.map(a => a.id === selectedAlert.id ? {...a, status: 'resolved'} : a)); setJustificationModalOpen(false); setSelectedAlert(null); setJustificationReason(''); setShowAlertPanel(false); } };
    const handleCreateWOSubmit = async (e: React.FormEvent) => { e.preventDefault(); await api.createWorkOrder({ wo_id: Math.floor(Math.random() * 100000), asset_id: newWOForm.assetId, type: newWOForm.type, priority: newWOForm.priority, description: newWOForm.description, assigned_to_id: parseInt(newWOForm.assignedToId), status: 'Open', created_at: new Date().toISOString() }); refreshData(); setIsCreateWOModalOpen(false); setNewWOForm({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' }); };
    const handleViewWODetails = (wo: WorkOrder) => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); };
    const handleUpdateCalibration = async (e: React.FormEvent) => { e.preventDefault(); if (assetToCalibrate) { const nextCal = new Date(newCalibrationDate); nextCal.setFullYear(nextCal.getFullYear() + 1); await api.updateAssetCalibration(assetToCalibrate.asset_id, newCalibrationDate, nextCal.toISOString().split('T')[0]); refreshData(); setUpdateCalibrationModalOpen(false); setAssetToCalibrate(null); } };
    const handleFindJobReport = async () => { if (reportType === 'PPM') { const report = await api.fetchPMReport(jobOrderSearchId || '5002'); if (report) setSelectedPMReport(report); else alert('PM Report Not Found. Try 5002.'); } else { if (jobOrderSearchId === '2236' || jobOrderSearchId === '') { setSelectedCMReport(getDetailedReports()[0]); } else { alert('Job Order Report not found. Try 2236.'); } } };
    
    // Assignment Handlers
    const openAssignModal = (wo: WorkOrder) => {
        setSelectedWOForAssignment(wo);
        setSelectedTechForAssignment('');
        setRecommendedTechs([]); // Clear previous recommendations
        setIsAssignModalOpen(true);
    };

    // --- SMART ASSIGN LOGIC ---
    const handleSmartAssign = () => {
        if (!selectedWOForAssignment) return;
        const asset = assets.find(a => a.asset_id === selectedWOForAssignment.asset_id || a.nfc_tag_id === selectedWOForAssignment.asset_id);
        const techs = users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER);
        
        if (asset) {
            const recommendations = recommendTechnicians(asset, techs, workOrders);
            setRecommendedTechs(recommendations);
            
            // Auto-select the top match
            if (recommendations.length > 0) {
                setSelectedTechForAssignment(recommendations[0].user.user_id.toString());
            }
        }
    };

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedWOForAssignment && selectedTechForAssignment) {
            await api.assignWorkOrder(selectedWOForAssignment.wo_id, parseInt(selectedTechForAssignment));
            alert(t('wo_assigned_msg'));
            refreshData();
            setIsAssignModalOpen(false);
            setSelectedWOForAssignment(null);
            setSelectedTechForAssignment('');
            setRecommendedTechs([]);
        }
    };

    // ... APPROVAL HANDLERS (Same as before) ...
    const openApprovalModal = (wo: WorkOrder) => { setSelectedWOForApproval(wo); setApprovalSignature(''); setIsApprovalModalOpen(true); };
    const handleApprovalSubmit = async () => { if (!selectedWOForApproval || !approvalSignature) return; if (currentUser.role === UserRole.ADMIN && selectedWOForApproval.status === 'Awaiting Approval') { await api.submitManagerApproval(selectedWOForApproval.wo_id, currentUser.user_id, approvalSignature); } else if (currentUser.role === UserRole.SUPERVISOR && selectedWOForApproval.status === 'Manager Approved') { await api.submitSupervisorApproval(selectedWOForApproval.wo_id, currentUser.user_id, approvalSignature); } refreshData(); setIsApprovalModalOpen(false); setApprovalSignature(''); setSelectedWOForApproval(null); };

  const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#64748B'];

  // Map Logic
  const departmentZones = [
      { id: 'ICU', name: 'Intensive Care', x: 20, y: 20, width: 25, height: 25, color: 'bg-indigo-100' },
      { id: 'Emergency', name: 'ER & Triage', x: 55, y: 20, width: 30, height: 20, color: 'bg-red-100' },
      { id: 'Radiology', name: 'Radiology / X-Ray', x: 20, y: 55, width: 25, height: 25, color: 'bg-blue-100' },
      { id: 'Laboratory', name: 'Laboratory', x: 55, y: 50, width: 20, height: 30, color: 'bg-yellow-100' },
      { id: 'Pharmacy', name: 'Pharmacy', x: 80, y: 50, width: 15, height: 20, color: 'bg-green-100' },
  ];

  const getAssetsInZone = (deptId: string) => {
      return assets.filter(a => {
          const loc = getLocations().find(l => l.location_id === a.location_id);
          return loc?.department === deptId || (deptId === 'Emergency' && loc?.department === 'ER');
      });
  }

  const selectedZoneAssets = selectedMapZone ? getAssetsInZone(selectedMapZone) : [];

  // ... RENDER LOGIC ...
  if (currentView === 'dashboard') {
    return <div className="space-y-6 animate-in fade-in">
        {/* ... (Existing Dashboard Header and Charts) ... */}
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
          <h2 className="text-2xl font-bold text-gray-900">{t('nav_dashboard')}</h2>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm">
               <Download size={16}/> {t('download_pdf')}
            </button>
            <button 
                onClick={() => setIsSimulationActive(!isSimulationActive)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isSimulationActive ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-gray-100 text-gray-600'}`}
            >
                <Activity size={16} className={isSimulationActive ? 'animate-pulse' : ''} />
                {isSimulationActive ? 'Live Traffic ON' : 'Simulate Traffic'}
            </button>
          </div>
        </div>

        {/* ALERTS & KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {/* ... existing KPIs ... */}
             <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center justify-center gap-4">
                 <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                     <BrainCircuit size={24}/>
                 </div>
                 <div>
                     <p className="text-text-muted text-xs font-bold uppercase tracking-wider">{t('predictive_risk')}</p>
                     <p className="text-xl font-bold text-gray-900 mt-1">Active</p>
                 </div>
             </div>
             {/* ... */}
        </div>

        {/* 3D FLOOR PLAN & ASSET DETAIL PANEL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* LEFT: 3D MAP */}
             <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col min-h-[500px]">
                 <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                     <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Layers className="text-brand"/> {t('floor_plan_3d')}
                     </h3>
                     <div className="flex gap-2 text-xs font-bold">
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Down</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Maint</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Running</span>
                     </div>
                 </div>
                 
                 <div className="flex-1 relative bg-gray-100 overflow-hidden flex items-center justify-center p-8 perspective-[1000px]">
                     {/* ISOMETRIC PLANE */}
                     <div className="relative w-full h-full max-w-2xl aspect-square transform rotate-x-60 rotate-z-[-45deg] shadow-2xl bg-white/40 border-4 border-white/50 rounded-xl transition-all duration-500">
                          {/* Grid Lines */}
                          <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

                          {/* ZONES */}
                          {departmentZones.map(zone => {
                              const zoneAssets = getAssetsInZone(zone.id);
                              const zoneAssetCount = zoneAssets.length;
                              const hasDownAssets = zoneAssets.some(a => a.status === AssetStatus.DOWN);
                              const hasMaintAssets = zoneAssets.some(a => a.status === AssetStatus.UNDER_MAINT);
                              
                              let zoneColorClass = 'bg-white/80';
                              let textColorClass = 'text-gray-800';
                              let signalColorClass = 'text-brand';

                              if (hasDownAssets) {
                                  zoneColorClass = 'bg-red-500/90 border-red-400';
                                  textColorClass = 'text-white';
                                  signalColorClass = 'text-white';
                              } else if (hasMaintAssets) {
                                  zoneColorClass = 'bg-amber-400/90 border-amber-500';
                                  textColorClass = 'text-white';
                                  signalColorClass = 'text-white';
                              } else if (zoneAssetCount > 0) {
                                  zoneColorClass = 'bg-emerald-50/90 border-emerald-200';
                                  textColorClass = 'text-emerald-800';
                                  signalColorClass = 'text-emerald-600';
                              }
                              
                              return (
                                  <div
                                      key={zone.id}
                                      onClick={() => setSelectedMapZone(zone.id)}
                                      className={`
                                        absolute transition-all duration-300 cursor-pointer group hover:-translate-y-4 hover:shadow-2xl
                                        ${selectedMapZone === zone.id ? 'translate-y-[-10px] shadow-xl border-brand z-20' : 'z-10 border-white/50'}
                                        border-2 rounded-lg flex items-center justify-center flex-col
                                        ${zoneColorClass}
                                      `}
                                      style={{
                                          left: `${zone.x}%`,
                                          top: `${zone.y}%`,
                                          width: `${zone.width}%`,
                                          height: `${zone.height}%`,
                                          boxShadow: selectedMapZone === zone.id ? '10px 10px 30px rgba(0,0,0,0.2)' : '5px 5px 15px rgba(0,0,0,0.05)'
                                      }}
                                  >
                                      {/* 3D Sides Effect (CSS only) */}
                                      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                                      
                                      <div className={`transform -rotate-z-[45deg] text-center transition-transform group-hover:scale-110 ${textColorClass}`}>
                                          <div className="font-bold text-xs lg:text-sm uppercase tracking-wider">{zone.name}</div>
                                          <div className="text-[10px] font-bold mt-1 opacity-80">{zoneAssetCount} Assets</div>
                                          
                                          {/* RFID Signal Simulation */}
                                          {isSimulationActive && zoneAssetCount > 0 && (
                                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center">
                                                  <Signal size={16} className={`animate-ping ${signalColorClass}`}/>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              )
                          })}
                     </div>
                 </div>
             </div>

             {/* RIGHT: ZONE DETAIL PANEL */}
             <div className="bg-white rounded-2xl border border-border shadow-soft flex flex-col h-[500px]">
                  <div className="p-4 border-b border-border bg-gray-50/50">
                      <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                          <Box className="text-brand"/> {selectedMapZone ? `${selectedMapZone} ${t('zone_details')}` : t('select_zone')}
                      </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {!selectedMapZone ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-6">
                              <Layers size={48} className="mb-4 opacity-20"/>
                              <p>Click on a department zone in the 3D map to view live assets.</p>
                          </div>
                      ) : (
                          <>
                              {selectedZoneAssets.length === 0 ? (
                                  <div className="text-center py-10 text-gray-400">No assets detected in this zone.</div>
                              ) : (
                                  selectedZoneAssets.map(asset => (
                                      <div key={asset.asset_id} className="bg-white border border-border p-3 rounded-xl shadow-sm hover:border-brand/50 transition-colors group flex items-start gap-3">
                                          <div className={`w-2 h-full min-h-[40px] rounded-full ${asset.status === AssetStatus.RUNNING ? 'bg-success' : asset.status === AssetStatus.DOWN ? 'bg-danger' : 'bg-warning'}`}></div>
                                          <div className="flex-1">
                                              <div className="flex justify-between items-start">
                                                  <h4 className="font-bold text-gray-900 text-sm group-hover:text-brand">{asset.name}</h4>
                                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{asset.asset_id}</span>
                                              </div>
                                              <p className="text-xs text-text-muted mt-0.5">{asset.model}</p>
                                              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                                  <Signal size={10} className="text-brand animate-pulse"/> Live Signal
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </>
                      )}
                  </div>
             </div>
        </div>
        
        {/* ASSET LIFECYCLE & TCO (New Section) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                    <DollarSign className="text-brand"/> {t('tco_analysis')}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.tcoData} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                         <XAxis type="number" hide/>
                         <YAxis dataKey="name" type="category" width={100} style={{fontSize: '12px'}}/>
                         <Tooltip cursor={{fill: 'transparent'}} />
                         <Legend />
                         <Bar dataKey="purchase" stackId="a" fill="#3B82F6" name={t('purchase_price')} radius={[0, 4, 4, 0]} barSize={20} />
                         <Bar dataKey="maintenance" stackId="a" fill="#F59E0B" name={t('maint_cost')} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                    {analyticsData.tcoData.map(d => (
                        <div key={d.name} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                             <span className="font-bold">{d.name}</span>
                             {d.recommendation === 'Replace' ? (
                                 <span className="text-danger font-bold flex items-center gap-1"><AlertTriangle size={12}/> {t('replace')}</span>
                             ) : (
                                 <span className="text-success font-bold flex items-center gap-1"><Check size={12}/> {t('repair')}</span>
                             )}
                        </div>
                    ))}
                </div>
            </div>

            {/* TECHNICIAN RATING MATRIX */}
             <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                 <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                     <Star className="text-warning"/> {t('tech_rating')}
                 </h3>
                 <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                         <thead>
                             <tr className="bg-gray-50 text-gray-500">
                                 <th className="px-4 py-2 rounded-l-lg">Technician</th>
                                 <th className="px-4 py-2">MTTR (Hrs)</th>
                                 <th className="px-4 py-2">First Fix %</th>
                                 <th className="px-4 py-2 rounded-r-lg">Nurse Rating</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {analyticsData.techPerformance.map(tech => (
                                 <tr key={tech.id} className="hover:bg-gray-50">
                                     <td className="px-4 py-3 font-bold text-gray-900">{tech.name}</td>
                                     <td className="px-4 py-3">{tech.avgMttr}</td>
                                     <td className="px-4 py-3">
                                         <span className={`px-2 py-0.5 rounded text-xs font-bold ${parseInt(tech.ftfr) > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                             {tech.ftfr}
                                         </span>
                                     </td>
                                     <td className="px-4 py-3 flex items-center gap-1 text-warning font-bold">
                                         <Star size={14} fill="currentColor"/> {tech.avgRating}
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        </div>

        {/* Update Risk Table to show recalculated score */}
        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft lg:col-span-2">
             <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-danger rounded-full"></div>
                  {t('table_risk_report')}
             </h3>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                     <thead>
                         <tr className="bg-gray-50 border-b border-gray-200">
                             <th className="px-4 py-3 text-start font-bold text-gray-500">Asset</th>
                             <th className="px-4 py-3 text-start font-bold text-gray-500">Model</th>
                             <th className="px-4 py-3 text-start font-bold text-gray-500">Predictive Score</th> {/* Updated Label */}
                             <th className="px-4 py-3 text-start font-bold text-gray-500">Factors</th> {/* Added column */}
                         </tr>
                     </thead>
                     <tbody>
                         {analyticsData.riskData.map(a => (
                             <tr key={a.asset_id} className="border-b border-gray-100 hover:bg-gray-50">
                                 <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                                 <td className="px-4 py-3 text-gray-500">{a.model}</td>
                                 <td className="px-4 py-3">
                                     <div className="flex items-center gap-2">
                                         <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                             <div className={`h-full rounded-full ${a.risk_score > 70 ? 'bg-danger' : a.risk_score > 40 ? 'bg-warning' : 'bg-success'}`} style={{width: `${a.risk_score}%`}}></div>
                                         </div>
                                         <span className={`font-bold ${a.risk_score > 70 ? 'text-danger' : 'text-gray-700'}`}>{a.risk_score}</span>
                                     </div>
                                 </td>
                                 <td className="px-4 py-3 text-xs text-text-muted">
                                     {a.risk_score > 70 ? "High Usage / Recent Failures" : "Stable"}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         </div>
         {/* ... (Rest of Dashboard) ... */}
    </div>;
  }
  
  // ... (Keep existing views) ...
  // Update Asset Details to show Manuals Link more prominently
  if (currentView === 'assets') {
      // ... (keep existing setup) ...
      // In the return statement for Asset Details:
      /* 
         {activeTab === 'docs' && (
             ...
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><BookOpen size={20}/></div>
                    <div>
                        <h4 className="font-bold text-blue-900">Interactive Library</h4>
                        <p className="text-xs text-blue-700">Access manuals linked directly to this asset.</p>
                    </div>
                    <button className="ml-auto btn-primary py-2 px-4 text-xs" onClick={() => setActiveTab('docs')}>Browse</button>
                </div>
             ...
         )}
      */
  }
  
  if (currentView === 'assets') {
      return (
          <div className="space-y-6 animate-in fade-in">
              {!selectedAsset ? (
                  // Asset List
                   <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                         {/* ... (Existing Asset List Header) ... */}
                         <div className="p-4 border-b border-border flex justify-between items-center">
                             <h2 className="text-xl font-bold text-gray-900">{t('nav_assets')}</h2>
                             <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm">
                                 <Plus size={16}/> {t('add_equipment')}
                             </button>
                         </div>
                         {/* ... (Existing Asset List Table) ... */}
                         <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                     <tr>
                                         <th className="px-6 py-4">{t('asset_info')}</th>
                                         <th className="px-6 py-4">{t('location')}</th>
                                         <th className="px-6 py-4">{t('status')}</th>
                                         <th className="px-6 py-4 text-end">{t('actions')}</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                     {assets.map(asset => (
                                         <tr key={asset.asset_id} className="hover:bg-gray-50/80 transition-colors group">
                                             <td className="px-6 py-4">
                                                 <div className="flex items-center gap-3">
                                                     <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                                                         {asset.image ? <img src={asset.image} className="w-full h-full object-cover"/> : <Package className="p-2 text-gray-400"/>}
                                                     </div>
                                                     <div>
                                                         <div className="font-bold text-gray-900">{asset.name}</div>
                                                         <div className="text-xs text-text-muted">{asset.model} <span className="text-gray-300">|</span> {asset.serial_number}</div>
                                                     </div>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4 text-gray-600">{getLocationName(asset.location_id)}</td>
                                             <td className="px-6 py-4">
                                                 <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                     asset.status === AssetStatus.RUNNING ? 'bg-green-50 text-green-700 border-green-200' :
                                                     asset.status === AssetStatus.DOWN ? 'bg-red-50 text-red-700 border-red-200' :
                                                     'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                 }`}>
                                                     {asset.status}
                                                 </span>
                                             </td>
                                             <td className="px-6 py-4 text-end">
                                                 <button 
                                                    onClick={() => setSelectedAsset(asset)}
                                                    className="px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-bold hover:bg-brand hover:text-white hover:border-brand transition-all shadow-sm"
                                                 >
                                                     Details
                                                 </button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                   </div>
              ) : (
                  // Asset Details View
                  <div className="space-y-6">
                      <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold text-sm">
                          <ChevronLeft size={16} className="rtl:rotate-180"/> {t('back')}
                      </button>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left Panel: Image & Status */}
                          <div className="space-y-6">
                              <div className="bg-white p-6 rounded-2xl border border-border shadow-soft text-center">
                                  <div className="w-32 h-32 mx-auto bg-gray-50 rounded-2xl mb-4 border border-border overflow-hidden">
                                      {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover"/> : <Package size={48} className="m-auto text-gray-300"/>}
                                  </div>
                                  <h2 className="text-xl font-bold text-gray-900">{selectedAsset.name}</h2>
                                  <p className="text-sm text-text-muted mb-4">{selectedAsset.model}</p>
                                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                                      selectedAsset.status === AssetStatus.RUNNING ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                  }`}>
                                      <Activity size={16}/> {selectedAsset.status}
                                  </div>
                              </div>
                              
                              <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-brand"/> Performance</h3>
                                  <div className="space-y-4">
                                      <div className="flex justify-between text-sm">
                                          <span className="text-text-muted">Uptime</span>
                                          <span className="font-bold text-success">98.5%</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                          <span className="text-text-muted">MTBF</span>
                                          <span className="font-bold text-gray-900">1,240 Hrs</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                          <span className="text-text-muted">Reliability</span>
                                          <span className="font-bold text-brand">High</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Interactive Knowledge Base Link */}
                              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-sm cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => setActiveTab('docs')}>
                                   <div className="flex items-center gap-3 mb-2">
                                       <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><BookOpen size={20}/></div>
                                       <h4 className="font-bold text-indigo-900">Knowledge Base</h4>
                                   </div>
                                   <p className="text-xs text-indigo-700 leading-relaxed mb-3">Access manuals, schematics, and troubleshooting guides specific to this {selectedAsset.model}.</p>
                                   <div className="text-xs font-bold text-indigo-800 flex items-center gap-1">View Documents <ArrowRight size={12}/></div>
                              </div>
                          </div>
                          
                          {/* Right Panel: Tabs & Data */}
                          <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col min-h-[500px]">
                               <div className="flex border-b border-border">
                                   {['overview', 'history', 'calibration', 'docs'].map(tab => (
                                       <button 
                                          key={tab}
                                          onClick={() => setActiveTab(tab)}
                                          className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-brand text-brand bg-brand/5' : 'border-transparent text-text-muted hover:text-gray-900'}`}
                                       >
                                           {tab}
                                       </button>
                                   ))}
                               </div>
                               
                               <div className="p-6 flex-1 overflow-y-auto">
                                   {/* ... (Existing Tab Content Logic for overview, history, etc...) ... */}
                                   {activeTab === 'overview' && (
                                       <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-xs font-bold text-text-muted uppercase mb-4">Identity</h4>
                                                <div className="space-y-3">
                                                    <div><div className="text-xs text-gray-500">Asset ID</div><div className="font-medium">{selectedAsset.asset_id}</div></div>
                                                    <div><div className="text-xs text-gray-500">Serial Number</div><div className="font-medium">{selectedAsset.serial_number}</div></div>
                                                    <div><div className="text-xs text-gray-500">Manufacturer</div><div className="font-medium">{selectedAsset.manufacturer}</div></div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-text-muted uppercase mb-4">Location & Date</h4>
                                                <div className="space-y-3">
                                                    <div><div className="text-xs text-gray-500">Department</div><div className="font-medium">{getLocationName(selectedAsset.location_id)}</div></div>
                                                    <div><div className="text-xs text-gray-500">Purchase Date</div><div className="font-medium">{selectedAsset.purchase_date}</div></div>
                                                    <div><div className="text-xs text-gray-500">Warranty Ends</div><div className="font-medium text-warning">{selectedAsset.warranty_expiration || 'N/A'}</div></div>
                                                </div>
                                            </div>
                                            
                                            <div className="col-span-2 pt-6 border-t border-gray-100">
                                                <h4 className="text-xs font-bold text-text-muted uppercase mb-4">Financials (TCO)</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                     <div className="p-3 bg-gray-50 rounded-lg">
                                                         <div className="text-xs text-gray-500">Purchase Cost</div>
                                                         <div className="font-bold text-gray-900">${selectedAsset.purchase_cost?.toLocaleString()}</div>
                                                     </div>
                                                     <div className="p-3 bg-gray-50 rounded-lg">
                                                         <div className="text-xs text-gray-500">Maint. Cost</div>
                                                         <div className="font-bold text-warning">${selectedAsset.accumulated_maintenance_cost?.toLocaleString()}</div>
                                                     </div>
                                                     <div className="p-3 bg-gray-50 rounded-lg">
                                                         <div className="text-xs text-gray-500">Total Cost (TCO)</div>
                                                         <div className="font-bold text-brand">${((selectedAsset.purchase_cost || 0) + (selectedAsset.accumulated_maintenance_cost || 0)).toLocaleString()}</div>
                                                     </div>
                                                </div>
                                            </div>
                                       </div>
                                   )}

                                   {/* ... (Keep other tabs) ... */}
                                   {activeTab === 'history' && (
                                       <table className="w-full text-sm text-left">
                                           <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                               <tr><th>Date</th><th>Type</th><th>Technician</th><th>Status</th></tr>
                                           </thead>
                                           <tbody className="divide-y divide-gray-100">
                                               {workOrders.filter(wo => (wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id)).map(wo => (
                                                   <tr key={wo.wo_id}>
                                                       <td className="py-3 px-2">{wo.created_at.split('T')[0]}</td>
                                                       <td className="py-3 px-2"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">{wo.type}</span></td>
                                                       <td className="py-3 px-2">{users.find(u => u.user_id === wo.assigned_to_id)?.name || 'Unknown'}</td>
                                                       <td className="py-3 px-2">{wo.status}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                       </table>
                                   )}
                                   
                                   {activeTab === 'docs' && (
                                        <div className="space-y-3">
                                            {getAssetDocuments(selectedAsset.asset_id).map(doc => (
                                                <div key={doc.doc_id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-gray-50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-red-50 text-red-500 rounded-lg"><FileText size={18}/></div>
                                                        <div>
                                                            <div className="font-bold text-gray-900 text-sm">{doc.title}</div>
                                                            <div className="text-xs text-text-muted">{doc.type} • {doc.date}</div>
                                                        </div>
                                                    </div>
                                                    <button className="text-brand hover:underline text-xs font-bold">View</button>
                                                </div>
                                            ))}
                                            {/* AI Suggestion */}
                                            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                                                 <Sparkles className="text-indigo-500"/>
                                                 <div className="text-xs text-indigo-700">
                                                     <strong>AI Tip:</strong> Based on recent fault history, check the "Power Supply Unit Service Guide" first.
                                                 </div>
                                            </div>
                                        </div>
                                   )}
                               </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )
  }

  // ... (Rest of views remain the same) ...
  return <div>{/* ... */}</div>;
};