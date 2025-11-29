
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan, Bluetooth, Wifi, MonitorCheck, CheckCircle2 } from 'lucide-react';
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
    // State Management
    const [activeTab, setActiveTab] = useState('tab_analytics'); 
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const { t, language } = useLanguage();
    
    // Notification Toast State
    const [showToast, setShowToast] = useState(false);
    
    // Modals & Forms
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAssetForm, setNewAssetForm] = useState({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' });
    
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, department: '', signature: '' });
    
    // Inventory State
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [confirmRestockOpen, setConfirmRestockOpen] = useState(false);
    const [selectedPartForRestock, setSelectedPartForRestock] = useState<InventoryPart | null>(null);
    const [restockAmount, setRestockAmount] = useState('');
    
    // Reporting State
    const [reportType, setReportType] = useState<'CM' | 'PPM' | 'COMPLIANCE'>('CM');
    const [reportStartDate, setReportStartDate] = useState('2023-01-01');
    const [reportEndDate, setReportEndDate] = useState('2023-12-31');
    const [jobOrderSearchId, setJobOrderSearchId] = useState('');
    const [selectedCMReport, setSelectedCMReport] = useState<DetailedJobOrderReport | null>(null);
    const [selectedPMReport, setSelectedPMReport] = useState<PreventiveMaintenanceReport | null>(null);
    
    // Alerts State
    const [alerts, setAlerts] = useState<SystemAlert[]>(getSystemAlerts());
    const [showAlertPanel, setShowAlertPanel] = useState(false);
    const [justificationModalOpen, setJustificationModalOpen] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
    const [justificationReason, setJustificationReason] = useState('');
    
    // 3D Map State
    const [selectedMapZone, setSelectedMapZone] = useState<string | null>(null);
    const [isSimulationActive, setIsSimulationActive] = useState(false);
    
    // Maintenance State
    const [maintenanceViewMode, setMaintenanceViewMode] = useState<'kanban' | 'list'>('kanban');
    const [maintenanceFilterPriority, setMaintenanceFilterPriority] = useState<string>('all');
    const [maintenanceFilterType, setMaintenanceFilterType] = useState<string>('all');
    const [isCreateWOModalOpen, setIsCreateWOModalOpen] = useState(false);
    const [newWOForm, setNewWOForm] = useState({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' });
    const [selectedWorkOrderForDetails, setSelectedWorkOrderForDetails] = useState<WorkOrder | null>(null);
    const [isWorkOrderDetailsModalOpen, setIsWorkOrderDetailsModalOpen] = useState(false);
    
    // Calibration State
    const [calibrationSearch, setCalibrationSearch] = useState('');
    const [updateCalibrationModalOpen, setUpdateCalibrationModalOpen] = useState(false);
    const [assetToCalibrate, setAssetToCalibrate] = useState<Asset | null>(null);
    const [newCalibrationDate, setNewCalibrationDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Assignment State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedWOForAssignment, setSelectedWOForAssignment] = useState<WorkOrder | null>(null);
    const [selectedTechForAssignment, setSelectedTechForAssignment] = useState('');
    const [recommendedTechs, setRecommendedTechs] = useState<TechRecommendation[]>([]);

    // Knowledge Base State
    const [kbSearch, setKbSearch] = useState('');
    const [kbMode, setKbMode] = useState<'list' | 'ai'>('list');
    const [aiQuery, setAiQuery] = useState('');
    const [aiResult, setAiResult] = useState<{explanation: string, solution: string, relevantDocs: string[]} | null>(null);
    const [isAiSearching, setIsAiSearching] = useState(false);

    // Approval Workflow State
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [selectedWOForApproval, setSelectedWOForApproval] = useState<WorkOrder | null>(null);
    const [approvalSignature, setApprovalSignature] = useState('');

    // RFID & Audit State
    const [rfidTab, setRfidTab] = useState<'audit' | 'gate'>('audit');
    const [activeAudit, setActiveAudit] = useState<AuditSession | null>(null);
    const [selectedAuditDept, setSelectedAuditDept] = useState('');
    const [gateLogs, setGateLogs] = useState<RfidGateLog[]>([]);
    
    // GATE MONITORING REAL-TIME STATE
    const [isGateMonitoring, setIsGateMonitoring] = useState(false);
    const [gateReaders, setGateReaders] = useState([
        { id: 101, name: 'ICU Main', status: 'offline', lastPing: '' },
        { id: 301, name: 'Emergency Exit', status: 'offline', lastPing: '' },
        { id: 601, name: 'OR Entrance', status: 'offline', lastPing: '' },
        { id: 401, name: 'Lab Access', status: 'offline', lastPing: '' }
    ]);

    // ZEBRA SCANNER INTEGRATION
    const handleScannerInput = (scannedTag: string) => {
        if (rfidTab === 'audit' && activeAudit) {
            handleRealScan(scannedTag);
        } else if (rfidTab === 'gate') {
            handleGateScan(scannedTag, 101);
        }
    };

    const { status: zebraStatus, lastScanned: lastZebraScan } = useZebraScanner({
        onScan: handleScannerInput,
        isActive: currentView === 'rfid'
    });

    // --- DATA MEMOIZATION & EFFECTS ---
    const kbDocuments = useMemo(() => getKnowledgeBaseDocs(), []);
    const filteredKbDocs = kbDocuments.filter(doc => doc.title.toLowerCase().includes(kbSearch.toLowerCase()));
    
    useEffect(() => {
        const movementLogs = getMovementLogs();
        assets.forEach(asset => {
             const newScore = calculateAssetRiskScore(asset, workOrders, movementLogs);
             asset.risk_score = newScore; 
        });
    }, [assets, workOrders]);

    useEffect(() => { 
        if (currentView === 'analysis') setActiveTab('tab_analytics'); 
        else setActiveTab('tab1'); 
        
        setSelectedAsset(null); 
        setSelectedCMReport(null); 
        setSelectedPMReport(null);
        
        if (currentView !== 'dashboard') setIsSimulationActive(false); 
        if (currentView !== 'rfid') setIsGateMonitoring(false);
    }, [currentView]);

    useEffect(() => { 
        let interval: NodeJS.Timeout; 
        if (isSimulationActive && currentView === 'dashboard') { 
            interval = setInterval(async () => { 
                const randomIdx = Math.floor(Math.random() * assets.length); 
                const targetAsset = assets[randomIdx]; 
                const r = Math.random(); 
                let newStatus = AssetStatus.RUNNING; 
                if (r > 0.90) newStatus = AssetStatus.DOWN; 
                else if (r > 0.80) newStatus = AssetStatus.UNDER_MAINT; 
                
                if (targetAsset.status !== newStatus) { 
                    await api.updateAssetStatus(targetAsset.asset_id, newStatus); 
                    refreshData(); 
                } 
            }, 3000); 
        } 
        return () => clearInterval(interval); 
    }, [isSimulationActive, currentView, assets, refreshData]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGateMonitoring && currentView === 'rfid' && rfidTab === 'gate') {
            setGateReaders(prev => prev.map(r => ({ ...r, status: 'online', lastPing: new Date().toLocaleTimeString() })));
            interval = setInterval(() => {
                const randomReader = gateReaders[Math.floor(Math.random() * gateReaders.length)];
                const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                const direction = Math.random() > 0.5 ? 'ENTER' : 'EXIT';
                const newLog: RfidGateLog = {
                    id: Date.now(),
                    asset_id: randomAsset.asset_id,
                    rfid_tag: randomAsset.rfid_tag_id || randomAsset.asset_id,
                    gate_location_id: randomReader.id,
                    direction: direction,
                    timestamp: new Date().toISOString()
                };
                setGateLogs(prev => [newLog, ...prev.slice(0, 49)]);
                setGateReaders(prev => prev.map(r => r.id === randomReader.id ? { ...r, lastPing: new Date().toLocaleTimeString() } : r));
            }, 3500); 
        } else {
             setGateReaders(prev => prev.map(r => ({ ...r, status: 'offline' })));
        }
        return () => clearInterval(interval);
    }, [isGateMonitoring, currentView, rfidTab, assets]);


    // Analytics Calculations
    const analyticsData = useMemo(() => {
        const closedWOs = workOrders.filter(wo => wo.status === 'Closed' && wo.start_time && wo.close_time);
        const mttrByMonth: {[key: string]: {total: number, count: number}} = {};
        closedWOs.forEach(wo => { 
            const month = new Date(wo.close_time!).toLocaleString('default', { month: 'short' }); 
            if (!mttrByMonth[month]) mttrByMonth[month] = { total: 0, count: 0 }; 
            const duration = new Date(wo.close_time!).getTime() - new Date(wo.start_time!).getTime(); 
            mttrByMonth[month].total += duration; 
            mttrByMonth[month].count += 1; 
        });
        const mttrTrend = Object.keys(mttrByMonth).map(m => ({ month: m, hours: parseFloat((mttrByMonth[m].total / mttrByMonth[m].count / (1000 * 60 * 60)).toFixed(1)) })).slice(0, 6);
        
        const statusData = [ { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length, color: '#10B981' }, { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length, color: '#EF4444' }, { name: 'Maint.', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length, color: '#F59E0B' } ];
        const riskData = [...assets].sort((a,b) => b.risk_score - a.risk_score).slice(0, 10);
        
        const tcoData = [...assets].filter(a => a.purchase_cost).sort((a,b) => (b.accumulated_maintenance_cost || 0) - (a.accumulated_maintenance_cost || 0)).slice(0, 5);

        const financialAnalysis = assets.map(a => {
            const woCount = workOrders.filter(w => w.asset_id === a.asset_id || w.asset_id === a.nfc_tag_id).length;
            const maintCost = a.accumulated_maintenance_cost || 0;
            const purchase = a.purchase_cost || 1; 
            return {
                id: a.asset_id, name: a.name, model: a.model, purchase: purchase, maintCost: maintCost, woCount: woCount, ratio: parseFloat((maintCost / purchase).toFixed(2))
            };
        }).sort((a,b) => b.ratio - a.ratio);

        return { mttrTrend, statusData, riskData, tcoData, financialAnalysis };
    }, [assets, workOrders, users]);

    // --- HANDLERS ---
    const triggerNotification = () => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
    const handleAiSearch = async () => { if(!aiQuery) return; setIsAiSearching(true); setAiResult(null); const result = await searchKnowledgeBase(aiQuery, kbDocuments.map(d=>d.title), language); setAiResult(result); setIsAiSearching(false); };
    const handleAddSubmit = (e: React.FormEvent) => { e.preventDefault(); onAddAsset({...newAssetForm, location_id: Number(newAssetForm.location_id)} as any); setIsAddModalOpen(false); setNewAssetForm({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' }); };
    const handleAddUserSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!onAddUser) return; onAddUser({...newUserForm, user_id: Date.now(), location_id: 101} as User); setIsAddUserModalOpen(false); refreshData(); setNewUserForm({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, department: '', signature: '' }); };
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setNewAssetForm(prev => ({ ...prev, image: reader.result as string })); }; reader.readAsDataURL(file); } };
    const initiateRestock = (part: InventoryPart) => { setSelectedPartForRestock(part); setRestockAmount(''); setRestockModalOpen(true); };
    const handleRestockPreCheck = () => { const qty = parseInt(restockAmount); if (!qty || qty <= 0) return; if (qty > 50) { setConfirmRestockOpen(true); } else { submitRestock(); } };
    const submitRestock = async () => { if (selectedPartForRestock && restockAmount) { await api.restockPart(selectedPartForRestock.part_id, parseInt(restockAmount)); refreshData(); setRestockModalOpen(false); setConfirmRestockOpen(false); setRestockAmount(''); setSelectedPartForRestock(null); } };
    const handleCreateWOSubmit = async (e: React.FormEvent) => { e.preventDefault(); await api.createWorkOrder({ wo_id: Math.floor(Math.random() * 100000), asset_id: newWOForm.assetId, type: newWOForm.type, priority: newWOForm.priority, description: newWOForm.description, assigned_to_id: parseInt(newWOForm.assignedToId), status: 'Open', created_at: new Date().toISOString() }); refreshData(); setIsCreateWOModalOpen(false); setNewWOForm({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' }); };
    const handleSmartAssign = () => { if (!selectedWOForAssignment) return; const asset = assets.find(a => a.asset_id === selectedWOForAssignment.asset_id || a.nfc_tag_id === selectedWOForAssignment.asset_id); const techs = users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER); if (asset) { const recommendations = recommendTechnicians(asset, techs, workOrders); setRecommendedTechs(recommendations); if (recommendations.length > 0) setSelectedTechForAssignment(recommendations[0].user.user_id.toString()); } };
    const handleAssignSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (selectedWOForAssignment && selectedTechForAssignment) { await api.assignWorkOrder(selectedWOForAssignment.wo_id, parseInt(selectedTechForAssignment)); triggerNotification(); refreshData(); setIsAssignModalOpen(false); setSelectedWOForAssignment(null); } };
    const handleUpdateCalibration = async (e: React.FormEvent) => { e.preventDefault(); if (assetToCalibrate) { const nextCal = new Date(newCalibrationDate); nextCal.setFullYear(nextCal.getFullYear() + 1); await api.updateAssetCalibration(assetToCalibrate.asset_id, newCalibrationDate, nextCal.toISOString().split('T')[0]); refreshData(); setUpdateCalibrationModalOpen(false); setAssetToCalibrate(null); } };
    const handleFindJobReport = async () => { if (reportType === 'PPM') { const report = await api.fetchPMReport(jobOrderSearchId || '5002'); if (report) setSelectedPMReport(report); else alert('PM Report Not Found. Try 5002.'); } else { if (jobOrderSearchId === '2236' || jobOrderSearchId === '') setSelectedCMReport(getDetailedReports()[0]); else alert('Job Order Report not found. Try 2236.'); } };
    const startAudit = () => { if(!selectedAuditDept) return alert("Select a department"); const expected = getAssetsInZone(selectedAuditDept); setActiveAudit({ id: Date.now(), date: new Date().toISOString(), department: selectedAuditDept, total_expected: expected.length, total_scanned: 0, missing_assets: expected.map(a => a.asset_id), found_assets: [], status: 'In Progress' }); };
    const handleRealScan = (scannedId: string) => { if(!activeAudit) return; const cleanId = scannedId.trim(); if (activeAudit.missing_assets.includes(cleanId)) { setActiveAudit(prev => prev ? { ...prev, total_scanned: prev.total_scanned + 1, missing_assets: prev.missing_assets.filter(id => id !== cleanId), found_assets: [...prev.found_assets, cleanId] } : null); } };
    const handleGateScan = (scannedId: string, locationId: number) => { const cleanId = scannedId.trim(); const asset = assets.find(a => a.asset_id === cleanId || a.rfid_tag_id === cleanId); if (asset) { setGateLogs(prev => [{ id: Date.now(), asset_id: asset.asset_id, rfid_tag: cleanId, gate_location_id: locationId, direction: Math.random() > 0.5 ? 'ENTER' : 'EXIT', timestamp: new Date().toISOString() }, ...prev]); } };
    
    // --- RENDER HELPERS ---
    const departmentZones = [ { id: 'ICU', name: 'Intensive Care', x: 10, y: 10, width: 20, height: 20, color: 'bg-indigo-100' }, { id: 'Emergency', name: 'ER & Triage', x: 40, y: 10, width: 25, height: 15, color: 'bg-red-100' }, { id: 'Radiology', name: 'Radiology', x: 70, y: 10, width: 20, height: 20, color: 'bg-blue-100' }, { id: 'Laboratory', name: 'Laboratory', x: 10, y: 40, width: 15, height: 20, color: 'bg-yellow-100' }, { id: 'Pharmacy', name: 'Pharmacy', x: 30, y: 40, width: 15, height: 15, color: 'bg-green-100' }, { id: 'Surgery', name: 'OR & Surgery', x: 50, y: 30, width: 25, height: 25, color: 'bg-teal-100' }, { id: 'Cardiology', name: 'Cardiology', x: 80, y: 35, width: 15, height: 20, color: 'bg-rose-100' }, { id: 'Neurology', name: 'Neurology', x: 10, y: 70, width: 20, height: 20, color: 'bg-purple-100' }, { id: 'NICU', name: 'NICU', x: 35, y: 65, width: 15, height: 15, color: 'bg-pink-100' }, { id: 'Maternity', name: 'Maternity', x: 55, y: 65, width: 20, height: 20, color: 'bg-fuchsia-100' }, { id: 'Dialysis', name: 'Dialysis', x: 80, y: 60, width: 15, height: 15, color: 'bg-cyan-100' }, { id: 'Oncology', name: 'Oncology', x: 80, y: 80, width: 15, height: 15, color: 'bg-amber-100' }, { id: 'Pediatrics', name: 'Pediatrics', x: 35, y: 85, width: 20, height: 10, color: 'bg-lime-100' }, { id: 'Orthopedics', name: 'Orthopedics', x: 60, y: 90, width: 15, height: 10, color: 'bg-orange-100' }, { id: 'General Ward', name: 'General Ward', x: 5, y: 90, width: 25, height: 10, color: 'bg-gray-100' } ];
    const getAssetsInZone = (deptId: string) => assets.filter(a => { const loc = getLocations().find(l => l.location_id === a.location_id); return loc?.department === deptId || (loc?.department && loc.department.includes(deptId)); });

    // ---------------- VIEW ROUTING ----------------

    // 1. ASSETS VIEW
    if (currentView === 'assets') {
        if (selectedAsset) {
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-4">
                        <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
                    </button>
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex flex-col md:flex-row gap-6">
                        <div className="w-32 h-32 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                             {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover" /> : <Package size={40} className="text-gray-400"/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div><h2 className="text-2xl font-bold text-gray-900">{selectedAsset.name}</h2><p className="text-text-muted font-medium">{selectedAsset.manufacturer} • {selectedAsset.model}</p></div>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${selectedAsset.status === AssetStatus.RUNNING ? 'bg-success/10 text-success' : selectedAsset.status === AssetStatus.DOWN ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning-dark'}`}>{selectedAsset.status}</div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-text-muted font-bold uppercase">{t('serial_number')}</div><div className="font-mono text-sm font-bold">{selectedAsset.serial_number || 'N/A'}</div></div>
                                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-text-muted font-bold uppercase">{t('location')}</div><div className="text-sm font-bold">{getLocationName(selectedAsset.location_id)}</div></div>
                                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-text-muted font-bold uppercase">{t('warranty_exp')}</div><div className="text-sm font-bold">{selectedAsset.warranty_expiration || 'N/A'}</div></div>
                                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-text-muted font-bold uppercase">{t('risk_score')}</div><div className={`text-sm font-bold ${selectedAsset.risk_score > 70 ? 'text-danger' : 'text-success'}`}>{selectedAsset.risk_score}/100</div></div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History size={18} className="text-brand"/> {t('maintenance_history')}</h3>
                            <div className="space-y-4">
                                {workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id).length > 0 ? (
                                    workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id).map(wo => {
                                        const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                        return (
                                            <div key={wo.wo_id} className="p-4 border border-border rounded-xl hover:bg-gray-50 transition flex justify-between items-center">
                                                <div><div className="font-bold text-gray-900 text-sm">{wo.description}</div><div className="text-xs text-text-muted mt-1 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${wo.status === 'Closed' ? 'bg-success' : 'bg-warning'}`}></span>{new Date(wo.created_at).toLocaleDateString()} • {wo.type}</div></div>
                                                <div className="text-right text-xs"><div className="font-bold text-gray-700">{tech ? tech.name : `Tech #${wo.assigned_to_id}`}</div><div className="text-text-muted">#{wo.wo_id}</div></div>
                                            </div>
                                        );
                                    })
                                ) : ( <div className="text-center text-gray-400 py-8">No maintenance history available.</div> )}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity size={18} className="text-purple-500"/> Calibration</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100"><span className="text-sm font-medium text-purple-900">Last Calibrated</span><span className="text-sm font-bold text-purple-700">{selectedAsset.last_calibration_date}</span></div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100"><span className="text-sm font-medium text-purple-900">Next Due</span><span className="text-sm font-bold text-purple-700">{selectedAsset.next_calibration_date}</span></div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={18} className="text-blue-500"/> Documents</h3>
                                <div className="space-y-2">
                                    {getAssetDocuments(selectedAsset.asset_id).map(doc => (
                                        <div key={doc.doc_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group"><FileText size={16} className="text-text-muted group-hover:text-brand"/><span className="text-sm font-medium text-gray-700 group-hover:text-brand truncate">{doc.title}</span><Download size={14} className="ml-auto text-gray-300 group-hover:text-brand"/></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                  <h2 className="text-2xl font-bold text-gray-900">{t('tab_list')}</h2>
                  <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('add_equipment')}</button>
                </div>
                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase"><tr><th className="px-6 py-4">{t('form_name')}</th><th className="px-6 py-4">{t('form_model')}</th><th className="px-6 py-4">{t('serial_number')}</th><th className="px-6 py-4">{t('location')}</th><th className="px-6 py-4">{t('status')}</th><th className="px-6 py-4">{t('actions')}</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">{assets.map(asset => (<tr key={asset.asset_id} className="hover:bg-gray-50 transition-colors"><td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3"><div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 overflow-hidden shrink-0">{asset.image ? <img src={asset.image} className="w-full h-full object-cover"/> : <Package size={16} className="m-auto text-gray-400"/>}</div>{asset.name}</td><td className="px-6 py-4 text-gray-600 font-medium">{asset.model}</td><td className="px-6 py-4 text-gray-500 font-mono text-xs">{asset.serial_number}</td><td className="px-6 py-4 text-text-muted">{getLocationName(asset.location_id)}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${asset.status === AssetStatus.RUNNING ? 'bg-success/10 text-success' : asset.status === AssetStatus.DOWN ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning-dark'}`}>{asset.status}</span></td><td className="px-6 py-4"><button onClick={() => setSelectedAsset(asset)} className="text-brand font-bold hover:underline text-xs">View Details</button></td></tr>))}</tbody>
                    </table>
                </div>
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                            <h3 className="font-bold text-lg mb-4">{t('modal_add_title')}</h3>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="input-modern" placeholder={t('form_name')} value={newAssetForm.name} onChange={e => setNewAssetForm({...newAssetForm, name: e.target.value})} required />
                                    <input className="input-modern" placeholder={t('form_model')} value={newAssetForm.model} onChange={e => setNewAssetForm({...newAssetForm, model: e.target.value})} required />
                                </div>
                                <input className="input-modern" placeholder={t('form_sn')} value={newAssetForm.asset_id} onChange={e => setNewAssetForm({...newAssetForm, asset_id: e.target.value})} required />
                                <select className="input-modern" value={newAssetForm.location_id} onChange={e => setNewAssetForm({...newAssetForm, location_id: parseInt(e.target.value)})}>
                                    {getLocations().map(l => <option key={l.location_id} value={l.location_id}>{l.building} - {l.department} ({l.room})</option>)}
                                </select>
                                <input type="date" className="input-modern" value={newAssetForm.purchase_date} onChange={e => setNewAssetForm({...newAssetForm, purchase_date: e.target.value})} />
                                <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 cursor-pointer relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageChange} />
                                    <UploadCloud size={24} className="mx-auto text-gray-400 mb-2"/>
                                    <span className="text-sm text-text-muted">{t('form_image')}</span>
                                    {newAssetForm.image && <img src={newAssetForm.image} className="mt-2 h-16 w-16 object-cover rounded mx-auto border" />}
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                    <button type="submit" className="flex-1 btn-primary">{t('btn_save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. MAINTENANCE VIEW (RESTORED)
    if (currentView === 'maintenance') {
        const filteredWOs = workOrders.filter(wo => {
            if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
            if (maintenanceFilterType !== 'all' && wo.type !== maintenanceFilterType) return false;
            return true;
        });

        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Header Actions */}
                <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMaintenanceViewMode('kanban')} className={`p-2 rounded-lg ${maintenanceViewMode === 'kanban' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'}`}><LayoutGrid size={20}/></button>
                        <button onClick={() => setMaintenanceViewMode('list')} className={`p-2 rounded-lg ${maintenanceViewMode === 'list' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'}`}><List size={20}/></button>
                        <div className="w-px h-6 bg-gray-200 mx-2"></div>
                        <div className="flex items-center gap-2 text-sm text-gray-500"><Filter size={16}/> <select className="bg-transparent font-medium outline-none" value={maintenanceFilterPriority} onChange={e => setMaintenanceFilterPriority(e.target.value)}><option value="all">All Priorities</option>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 ml-4"><Wrench size={16}/> <select className="bg-transparent font-medium outline-none" value={maintenanceFilterType} onChange={e => setMaintenanceFilterType(e.target.value)}><option value="all">All Types</option>{Object.values(WorkOrderType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    </div>
                    <button onClick={() => setIsCreateWOModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('create_wo')}</button>
                </div>

                {maintenanceViewMode === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
                        {['Open', 'In Progress', 'Closed'].map(status => (
                            <div key={status} className="min-w-[300px] bg-gray-50/50 rounded-2xl p-4 border border-border/50 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h3 className="font-bold text-gray-700">{status}</h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200">{filteredWOs.filter(wo => (status === 'Open' ? (wo.status === 'Open' || wo.status === 'Assigned') : wo.status === status)).length}</span>
                                </div>
                                <div className="space-y-3 flex-1">
                                    {filteredWOs.filter(wo => (status === 'Open' ? (wo.status === 'Open' || wo.status === 'Assigned') : wo.status === status)).map(wo => {
                                        const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                                        const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                        return (
                                            <div key={wo.wo_id} className="bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{wo.priority}</span>
                                                    <span className="text-[10px] text-text-muted">#{wo.wo_id}</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-gray-900 mb-1">{asset?.name}</h4>
                                                <p className="text-xs text-text-muted mb-3 line-clamp-2">{wo.description}</p>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">{tech ? tech.name[0] : '?'}</div>
                                                        <span className="text-xs text-gray-600">{tech ? tech.name.split(' ')[0] : 'Unassigned'}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {status === 'Open' && (
                                                            <button onClick={() => { setSelectedWOForAssignment(wo); setIsAssignModalOpen(true); }} className="p-1.5 text-brand hover:bg-brand/10 rounded" title="Assign">
                                                                <UserPlus size={14}/>
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }}
                                                            className="text-xs font-bold text-gray-400 hover:text-brand"
                                                        >
                                                            Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase"><tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Asset</th><th className="px-6 py-4">Priority</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Assigned To</th><th className="px-6 py-4">Actions</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredWOs.map(wo => {
                                    const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                                    const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                    return (
                                        <tr key={wo.wo_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-xs">#{wo.wo_id}</td>
                                            <td className="px-6 py-4 font-medium">{asset?.name}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{wo.priority}</span></td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{wo.status}</span></td>
                                            <td className="px-6 py-4 text-xs">{tech?.name || '-'}</td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }} className="text-brand font-bold text-xs hover:underline">Details</button>
                                                {(wo.status === 'Open' || wo.status === 'Assigned') && <button onClick={() => { setSelectedWOForAssignment(wo); setIsAssignModalOpen(true); }} className="text-gray-500 font-bold text-xs hover:text-brand">Assign</button>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* CREATE WO MODAL */}
                {isCreateWOModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                            <h3 className="font-bold text-lg mb-4">{t('modal_create_wo')}</h3>
                            <form onSubmit={handleCreateWOSubmit} className="space-y-4">
                                <select className="input-modern" value={newWOForm.assetId} onChange={e => setNewWOForm({...newWOForm, assetId: e.target.value})} required>
                                    <option value="">{t('wo_asset')}</option>
                                    {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.name} ({a.asset_id})</option>)}
                                </select>
                                <select className="input-modern" value={newWOForm.type} onChange={e => setNewWOForm({...newWOForm, type: e.target.value as WorkOrderType})}>
                                    {Object.values(WorkOrderType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select className="input-modern" value={newWOForm.priority} onChange={e => setNewWOForm({...newWOForm, priority: e.target.value as Priority})}>
                                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <textarea className="input-modern min-h-[80px]" placeholder={t('wo_description')} value={newWOForm.description} onChange={e => setNewWOForm({...newWOForm, description: e.target.value})} required />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsCreateWOModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                    <button type="submit" className="flex-1 btn-primary">{t('btn_dispatch')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ASSIGN MODAL */}
                {isAssignModalOpen && selectedWOForAssignment && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                            <h3 className="font-bold text-lg mb-4">{t('assign_technician')}</h3>
                            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-xs text-text-muted font-bold uppercase">Task</div>
                                <div className="font-bold text-sm text-gray-900">{selectedWOForAssignment.description}</div>
                            </div>
                            <form onSubmit={handleAssignSubmit} className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-sm font-bold text-gray-700">{t('select_tech')}</label>
                                        <button type="button" onClick={handleSmartAssign} className="text-xs font-bold text-brand flex items-center gap-1 hover:underline"><Sparkles size={12}/> {t('btn_smart_assign')}</button>
                                    </div>
                                    <select className="input-modern" value={selectedTechForAssignment} onChange={e => setSelectedTechForAssignment(e.target.value)} required>
                                        <option value="">Select...</option>
                                        {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(u => <option key={u.user_id} value={u.user_id}>{u.name} ({u.role})</option>)}
                                    </select>
                                </div>
                                {recommendedTechs.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-gray-400 uppercase">AI Recommendations</div>
                                        {recommendedTechs.slice(0, 2).map(rec => (
                                            <div key={rec.user.user_id} onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())} className="p-2 border border-green-200 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition flex justify-between items-center">
                                                <div><div className="font-bold text-sm text-gray-900">{rec.user.name}</div><div className="text-[10px] text-green-700">{rec.reason}</div></div>
                                                <div className="text-xs font-bold text-green-600">{rec.score} pts</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsAssignModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                    <button type="submit" className="flex-1 btn-primary">{t('btn_assign_confirm')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                
                {/* WORK ORDER DETAILS MODAL */}
                {isWorkOrderDetailsModalOpen && selectedWorkOrderForDetails && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="bg-gray-50 px-6 py-4 border-b border-border flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900">Work Order #{selectedWorkOrderForDetails.wo_id} Details</h3>
                                <button onClick={() => setIsWorkOrderDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><div className="text-xs text-text-muted font-bold uppercase">Status</div><span className={`px-2 py-1 rounded text-xs font-bold ${selectedWorkOrderForDetails.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedWorkOrderForDetails.status}</span></div>
                                    <div><div className="text-xs text-text-muted font-bold uppercase">Priority</div><span className={`px-2 py-1 rounded text-xs font-bold ${selectedWorkOrderForDetails.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{selectedWorkOrderForDetails.priority}</span></div>
                                    <div><div className="text-xs text-text-muted font-bold uppercase">Asset</div><div className="font-bold text-sm">{assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id || a.nfc_tag_id === selectedWorkOrderForDetails.asset_id)?.name}</div></div>
                                    <div><div className="text-xs text-text-muted font-bold uppercase">Assigned To</div><div className="font-bold text-sm">{users.find(u => u.user_id === selectedWorkOrderForDetails.assigned_to_id)?.name || 'Unassigned'}</div></div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-border">
                                    <div className="text-xs text-text-muted font-bold uppercase mb-1">Description</div>
                                    <p className="text-sm text-gray-800">{selectedWorkOrderForDetails.description}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2"><Box size={16}/> Parts Used</h4>
                                    {selectedWorkOrderForDetails.parts_used && selectedWorkOrderForDetails.parts_used.length > 0 ? (
                                        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase"><tr><th className="px-3 py-2 text-left">Part Name</th><th className="px-3 py-2 text-right">Qty</th></tr></thead>
                                            <tbody>
                                                {selectedWorkOrderForDetails.parts_used.map((p, i) => {
                                                    const partDetails = inventory.find(inv => inv.part_id === p.part_id);
                                                    return (
                                                        <tr key={i} className="border-t border-border"><td className="px-3 py-2">{partDetails?.part_name || `Part #${p.part_id}`}</td><td className="px-3 py-2 text-right font-mono">{p.quantity}</td></tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    ) : ( <div className="text-sm text-gray-400 italic">No parts used recorded.</div> )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. INVENTORY VIEW (RESTORED)
    if (currentView === 'inventory') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_inventory')}</h2>
                    <div className="flex gap-3">
                         <div className="bg-red-50 text-danger px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border border-red-100">
                             <AlertCircle size={14}/> {inventory.filter(i => i.current_stock <= i.min_reorder_level).length} Low Stock
                         </div>
                         <button className="btn-primary py-2 px-4 text-sm"><Package size={16}/> {t('btn_order')}</button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">{t('part_name')}</th>
                                <th className="px-6 py-4">{t('stock_level')}</th>
                                <th className="px-6 py-4">{t('unit_cost')}</th>
                                <th className="px-6 py-4">{t('status')}</th>
                                <th className="px-6 py-4">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inventory.map(part => (
                                <tr key={part.part_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-900">{part.part_name}</td>
                                    <td className="px-6 py-4 font-mono">
                                        <div className="flex items-center gap-2">
                                            <span>{part.current_stock}</span>
                                            <span className="text-xs text-gray-400">/ min {part.min_reorder_level}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">${part.cost}</td>
                                    <td className="px-6 py-4">
                                        {part.current_stock <= part.min_reorder_level ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Low Stock</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Good</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => initiateRestock(part)} className="text-brand font-bold text-xs hover:underline flex items-center gap-1">
                                            <RefreshCw size={12}/> {t('btn_restock')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Restock Modal */}
                {restockModalOpen && selectedPartForRestock && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="font-bold text-lg mb-4">{t('restock_modal_title')}</h3>
                            <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-1">{selectedPartForRestock.part_name}</div>
                                <div className="text-xs text-text-muted">Current: {selectedPartForRestock.current_stock}</div>
                            </div>
                            <input type="number" className="input-modern mb-4" placeholder={t('restock_qty')} value={restockAmount} onChange={e => setRestockAmount(e.target.value)} />
                            <div className="flex gap-2">
                                <button onClick={() => setRestockModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                <button onClick={handleRestockPreCheck} className="flex-1 btn-primary">{t('restock_btn')}</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Confirmation Large Restock */}
                {confirmRestockOpen && (
                     <div className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4">
                         <div className="bg-white rounded-2xl p-6 w-full max-w-sm border-l-4 border-warning">
                             <h3 className="font-bold text-lg mb-2 text-warning-dark flex items-center gap-2"><AlertTriangle size={20}/> {t('confirm_large_restock_title')}</h3>
                             <p className="text-sm text-gray-600 mb-6">
                                 {t('confirm_large_restock_msg').replace('{qty}', restockAmount)}
                             </p>
                             <div className="flex gap-2">
                                 <button onClick={() => setConfirmRestockOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                 <button onClick={submitRestock} className="flex-1 btn-primary bg-warning hover:bg-yellow-600 border-none text-white">Confirm</button>
                             </div>
                         </div>
                     </div>
                )}
            </div>
        );
    }
    
    // 4. CALIBRATION VIEW (RESTORED)
    if (currentView === 'calibration') {
        const overdueAssets = assets.filter(a => new Date(a.next_calibration_date || '') < new Date());
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('cal_dashboard')}</h2>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-sm border border-purple-100 flex items-center gap-2">
                            <Activity size={16}/> {overdueAssets.length} {t('cal_overdue')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">{t('cal_schedule')}</h3>
                            <input type="text" placeholder="Search..." className="text-xs border rounded p-1" value={calibrationSearch} onChange={e => setCalibrationSearch(e.target.value)} />
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase"><tr><th className="px-6 py-4">Asset</th><th className="px-6 py-4">Last Cal.</th><th className="px-6 py-4">Next Due</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {assets.filter(a => a.name.toLowerCase().includes(calibrationSearch.toLowerCase())).map(asset => {
                                    const isOverdue = new Date(asset.next_calibration_date || '') < new Date();
                                    return (
                                        <tr key={asset.asset_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{asset.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{asset.last_calibration_date}</td>
                                            <td className="px-6 py-4 font-mono">{asset.next_calibration_date}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isOverdue ? t('cal_overdue') : t('cal_compliant')}</span></td>
                                            <td className="px-6 py-4"><button onClick={() => { setAssetToCalibrate(asset); setUpdateCalibrationModalOpen(true); }} className="text-purple-600 font-bold text-xs hover:underline">{t('btn_update_cal')}</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-fit">
                        <h3 className="font-bold text-lg mb-4">{t('cal_status')}</h3>
                        <div className="h-48 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ name: 'Compliant', value: assets.length - overdueAssets.length, color: '#10B981' }, { name: 'Overdue', value: overdueAssets.length, color: '#EF4444' }]} innerRadius={40} outerRadius={60} dataKey="value">
                                        <Cell fill="#10B981"/><Cell fill="#EF4444"/>
                                    </Pie>
                                    <Legend verticalAlign="bottom"/>
                                    <Tooltip/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                
                {/* Calibration Modal */}
                {updateCalibrationModalOpen && assetToCalibrate && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="font-bold text-lg mb-4">{t('update_cal_title')}</h3>
                            <div className="text-sm font-bold text-gray-900 mb-4">{assetToCalibrate.name}</div>
                            <form onSubmit={handleUpdateCalibration}>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('new_cal_date')}</label>
                                <input type="date" className="input-modern mb-6" value={newCalibrationDate} onChange={e => setNewCalibrationDate(e.target.value)} required />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setUpdateCalibrationModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                    <button type="submit" className="flex-1 btn-primary bg-purple-600 hover:bg-purple-700 border-none">{t('btn_record')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    // 5. RFID & TRACKING VIEW (NEW)
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_rfid')}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setRfidTab('audit')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${rfidTab === 'audit' ? 'bg-brand text-white shadow-lg' : 'text-text-muted hover:bg-gray-50'}`}
                        >
                            <ClipboardCheck size={16}/> {t('rfid_audit')}
                        </button>
                        <button 
                            onClick={() => setRfidTab('gate')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${rfidTab === 'gate' ? 'bg-brand text-white shadow-lg' : 'text-text-muted hover:bg-gray-50'}`}
                        >
                            <Signal size={16}/> {t('rfid_gate_monitor')}
                        </button>
                    </div>
                </div>

                {/* Zebra Scanner Status Bar */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${zebraStatus === 'listening' || zebraStatus === 'processing' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${zebraStatus === 'listening' || zebraStatus === 'processing' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                             <Scan size={20} className={zebraStatus === 'processing' ? 'animate-ping' : ''}/>
                         </div>
                         <div>
                             <h4 className={`text-sm font-bold ${zebraStatus === 'listening' || zebraStatus === 'processing' ? 'text-green-800' : 'text-gray-600'}`}>
                                 {zebraStatus === 'listening' || zebraStatus === 'processing' ? t('zebra_connected') : t('connect_zebra')}
                             </h4>
                             <p className="text-xs text-text-muted">{zebraStatus === 'listening' ? t('zebra_listening') : t('zebra_instructions')}</p>
                         </div>
                    </div>
                    {lastZebraScan && (
                        <div className="text-right">
                            <div className="text-[10px] font-bold uppercase text-text-muted">Last Scan</div>
                            <div className="font-mono text-sm font-bold text-brand">{lastZebraScan}</div>
                        </div>
                    )}
                </div>

                {/* TAB: AUDIT */}
                {rfidTab === 'audit' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Control Panel */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-fit">
                            <h3 className="font-bold text-lg mb-4">{t('start_audit')}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Department</label>
                                    <select 
                                        className="input-modern"
                                        value={selectedAuditDept}
                                        onChange={(e) => setSelectedAuditDept(e.target.value)}
                                        disabled={activeAudit !== null}
                                    >
                                        <option value="">Choose Dept...</option>
                                        {Array.from(new Set(getLocations().map(l => l.department))).map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {!activeAudit ? (
                                    <button onClick={startAudit} disabled={!selectedAuditDept} className="w-full btn-primary">
                                        Start Session
                                    </button>
                                ) : (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                        <div className="animate-pulse flex justify-center mb-2"><Radio className="text-brand"/></div>
                                        <div className="font-bold text-brand">{t('audit_in_progress')}</div>
                                        <button onClick={() => setActiveAudit(null)} className="mt-3 text-xs text-red-500 hover:underline">Stop Session</button>
                                    </div>
                                )}

                                {/* Manual Simulation Button */}
                                {activeAudit && (
                                    <button 
                                        onClick={() => {
                                            if(activeAudit.missing_assets.length > 0) handleRealScan(activeAudit.missing_assets[0]);
                                        }}
                                        className="w-full py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50"
                                    >
                                        {t('simulate_scan')} (Debug)
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress & Results */}
                        <div className="lg:col-span-2 space-y-6">
                            {activeAudit ? (
                                <>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-border text-center">
                                            <div className="text-2xl font-bold text-gray-900">{activeAudit.total_expected}</div>
                                            <div className="text-xs text-text-muted font-bold uppercase">{t('expected_assets')}</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-green-200 bg-green-50/30 text-center">
                                            <div className="text-2xl font-bold text-green-600">{activeAudit.total_scanned}</div>
                                            <div className="text-xs text-green-700 font-bold uppercase">{t('scanned_assets')}</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/30 text-center">
                                            <div className="text-2xl font-bold text-red-600">{activeAudit.total_expected - activeAudit.total_scanned}</div>
                                            <div className="text-xs text-red-700 font-bold uppercase">{t('missing_assets')}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                                        <div className="p-4 border-b border-border bg-gray-50 font-bold text-sm text-gray-700">{t('audit_summary')}</div>
                                        <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                                            {activeAudit.found_assets.map(id => {
                                                const asset = assets.find(a => a.asset_id === id);
                                                return (
                                                    <div key={id} className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle2 size={16} className="text-green-500"/>
                                                            <div>
                                                                <div className="font-bold text-sm text-gray-900">{asset?.name}</div>
                                                                <div className="text-xs text-green-700 font-mono">{id}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-green-600">MATCHED</span>
                                                    </div>
                                                )
                                            })}
                                            {activeAudit.missing_assets.map(id => {
                                                const asset = assets.find(a => a.asset_id === id);
                                                return (
                                                    <div key={id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg opacity-60">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                                                            <div>
                                                                <div className="font-bold text-sm text-gray-700">{asset?.name}</div>
                                                                <div className="text-xs text-gray-400 font-mono">{id}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">PENDING</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-400 flex flex-col items-center">
                                    <ClipboardCheck size={48} className="mb-4 opacity-20"/>
                                    <p>Select a department to verify inventory against database records.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: GATE MONITOR */}
                {rfidTab === 'gate' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {gateReaders.map(reader => (
                                <div key={reader.id} className={`p-4 rounded-2xl border ${reader.status === 'online' ? 'bg-white border-green-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-gray-900 text-sm">{reader.name}</div>
                                        <div className={`w-2 h-2 rounded-full ${reader.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                    </div>
                                    <div className="text-xs text-text-muted">Status: <span className="font-bold">{reader.status === 'online' ? 'Active' : 'Offline'}</span></div>
                                    {reader.status === 'online' && <div className="text-[10px] text-gray-400 mt-1">Last Ping: {reader.lastPing}</div>}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border shadow-soft">
                             <div>
                                 <h3 className="font-bold text-gray-900">{t('gate_network_active')}</h3>
                                 <p className="text-xs text-text-muted">Monitoring {gateReaders.length} entry points for unauthorized movement.</p>
                             </div>
                             <button 
                                onClick={() => setIsGateMonitoring(!isGateMonitoring)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${isGateMonitoring ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200'}`}
                             >
                                 {isGateMonitoring ? t('deactivate_gates') : t('activate_gates')}
                             </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2"><Activity size={16}/> {t('live_gate_feed')}</h3>
                                <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded font-bold animate-pulse">LIVE</span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">Time</th>
                                            <th className="px-6 py-3">Gate</th>
                                            <th className="px-6 py-3">Asset</th>
                                            <th className="px-6 py-3">Event</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {gateLogs.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Waiting for events...</td></tr>
                                        ) : (
                                            gateLogs.map(log => {
                                                const asset = assets.find(a => a.asset_id === log.asset_id);
                                                const reader = gateReaders.find(r => r.id === log.gate_location_id);
                                                // Simple logic: if asset not assigned to reader's dept (simplified check), alert
                                                // For demo, random alert
                                                const isUnauthorized = Math.random() > 0.9; 
                                                
                                                return (
                                                    <tr key={log.id} className="hover:bg-gray-50 animate-in slide-in-from-top-2">
                                                        <td className="px-6 py-3 font-mono text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                        <td className="px-6 py-3 font-bold text-gray-800">{reader?.name}</td>
                                                        <td className="px-6 py-3">
                                                            <div className="font-bold text-gray-900">{asset?.name || 'Unknown Tag'}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono">{log.rfid_tag}</div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.direction === 'ENTER' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                                {log.direction}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            {isUnauthorized ? (
                                                                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded w-fit">
                                                                    <ShieldAlert size={12}/> {t('unauthorized_movement')}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                                                                    <CheckCircle2 size={12}/> {t('authorized_movement')}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (currentView === 'analysis') {
         // ANALYSIS & REPORTS
        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Module Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_analysis')}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('tab_analytics')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tab_analytics' ? 'bg-brand text-white shadow-lg' : 'text-text-muted hover:bg-gray-50'}`}
                        >
                            {t('tab_analytics')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('tab_financial')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'tab_financial' ? 'bg-brand text-white shadow-lg' : 'text-text-muted hover:bg-gray-50'}`}
                        >
                            <DollarSign size={16}/> {t('tab_financial')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('tab_gen_report')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tab_gen_report' ? 'bg-brand text-white shadow-lg' : 'text-text-muted hover:bg-gray-50'}`}
                        >
                            {t('tab_gen_report')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('tab_kb')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tab_kb' ? 'bg-brand text-white shadow-lg' : 'text-text-muted hover:bg-gray-50'}`}
                        >
                            {t('tab_kb')}
                        </button>
                    </div>
                </div>

                {/* 1. STRATEGIC ANALYTICS */}
                {activeTab === 'tab_analytics' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1">{t('kpi_mttr')}</h4>
                                <div className="text-2xl font-bold text-gray-900 flex items-end gap-2">
                                    4.2h <span className="text-xs text-green-500 font-medium mb-1 flex items-center"><TrendingUp size={12} className="mr-1"/> -12%</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1">{t('kpi_availability')}</h4>
                                <div className="text-2xl font-bold text-gray-900 flex items-end gap-2">
                                    98.5% <span className="text-xs text-green-500 font-medium mb-1">+0.5%</span>
                                </div>
                            </div>
                             <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1">PPM Compliance</h4>
                                <div className="text-2xl font-bold text-gray-900 flex items-end gap-2">
                                    92% <span className="text-xs text-amber-500 font-medium mb-1">Target 95%</span>
                                </div>
                            </div>
                             <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Active Alerts</h4>
                                <div className="text-2xl font-bold text-gray-900 flex items-end gap-2">
                                    {alerts.length} <span className="text-xs text-red-500 font-medium mb-1">Critical</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* MTTR Chart */}
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4">{t('chart_mttr_trend')}</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData.mttrTrend}>
                                            <defs>
                                                <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}}/>
                                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}}/>
                                            <Area type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorMttr)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* Asset Status Pie */}
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4">{t('chart_asset_status')}</h3>
                                <div className="h-64 flex items-center justify-center">
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
                        </div>
                        
                        {/* Predictive Risk Report Table */}
                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                             <div className="p-4 border-b border-border bg-gray-50 flex justify-between items-center">
                                 <h3 className="font-bold text-lg text-gray-900">{t('table_risk_report')}</h3>
                                 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">AI Generated</span>
                             </div>
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                     <tr>
                                         <th className="px-6 py-4">{t('form_sn')}</th>
                                         <th className="px-6 py-4">{t('form_name')}</th>
                                         <th className="px-6 py-4">{t('risk_score')}</th>
                                         <th className="px-6 py-4">{t('actions')}</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                     {analyticsData.riskData.map(asset => (
                                         <tr key={asset.asset_id} className="hover:bg-gray-50">
                                             <td className="px-6 py-4 font-mono text-xs">{asset.asset_id}</td>
                                             <td className="px-6 py-4 font-bold text-gray-900">{asset.name}</td>
                                             <td className="px-6 py-4">
                                                 <div className="flex items-center gap-2">
                                                     <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                                         <div 
                                                            className={`h-2 rounded-full ${asset.risk_score > 70 ? 'bg-danger' : asset.risk_score > 40 ? 'bg-warning' : 'bg-success'}`}
                                                            style={{width: `${asset.risk_score}%`}}
                                                         ></div>
                                                     </div>
                                                     <span className="font-bold text-xs">{asset.risk_score}</span>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4">
                                                 <button className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors">
                                                     Generate PM
                                                 </button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                        </div>
                    </div>
                )}
                
                {/* 2. FINANCIAL & COST ANALYSIS */}
                {activeTab === 'tab_financial' && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-indigo-900 to-blue-900 p-6 rounded-2xl text-white shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-xl"><DollarSign size={24}/></div>
                                <div>
                                    <h3 className="text-xl font-bold">{t('tco_analysis')}</h3>
                                    <p className="text-blue-200 text-sm">Analyze asset efficiency, cost ratios, and replacement strategies.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Scatter Chart: Cost vs Value */}
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4">{t('chart_cost_vs_value')}</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" dataKey="purchase" name="Purchase Cost" unit="$" tick={{fontSize: 12}} />
                                            <YAxis type="number" dataKey="maintCost" name="Maint Cost" unit="$" tick={{fontSize: 12}} />
                                            <ZAxis type="number" dataKey="woCount" range={[50, 400]} name="WO Count" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '12px'}} />
                                            <Legend />
                                            <Scatter name="Assets" data={analyticsData.financialAnalysis} fill="#8884d8">
                                                {analyticsData.financialAnalysis.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.ratio > 0.5 ? '#EF4444' : entry.ratio > 0.3 ? '#F59E0B' : '#10B981'} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-xs text-center text-text-muted mt-2">
                                    X: Purchase Price | Y: Maintenance Cost | Size: Frequency
                                </div>
                            </div>

                            {/* Bar Chart: Maintenance Frequency Top 10 */}
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4">{t('chart_freq_vs_cost')}</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={analyticsData.financialAnalysis.sort((a,b) => b.woCount - a.woCount).slice(0, 10)}
                                            layout="vertical"
                                            margin={{top: 5, right: 30, left: 40, bottom: 5}}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Bar dataKey="woCount" fill="#2563EB" radius={[0, 4, 4, 0]} name="WO Count" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Financial Table */}
                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                             <div className="p-4 border-b border-border bg-gray-50">
                                 <h3 className="font-bold text-lg text-gray-900">{t('table_financial_report')}</h3>
                             </div>
                             <div className="overflow-x-auto">
                                 <table className="w-full text-sm text-left">
                                     <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                         <tr>
                                             <th className="px-6 py-4">{t('form_name')}</th>
                                             <th className="px-6 py-4">{t('purchase_price')}</th>
                                             <th className="px-6 py-4">{t('maint_cost')}</th>
                                             <th className="px-6 py-4">{t('maint_freq')}</th>
                                             <th className="px-6 py-4">{t('cost_ratio')}</th>
                                             <th className="px-6 py-4">{t('recommendation')}</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-100">
                                         {analyticsData.financialAnalysis.map(item => (
                                             <tr key={item.id} className="hover:bg-gray-50">
                                                 <td className="px-6 py-4">
                                                     <div className="font-bold text-gray-900">{item.name}</div>
                                                     <div className="text-xs text-text-muted">{item.model}</div>
                                                 </td>
                                                 <td className="px-6 py-4 text-gray-600">${item.purchase.toLocaleString()}</td>
                                                 <td className="px-6 py-4 text-gray-600">${item.maintCost.toLocaleString()}</td>
                                                 <td className="px-6 py-4">
                                                     <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-bold text-xs">{item.woCount} Orders</span>
                                                 </td>
                                                 <td className="px-6 py-4">
                                                     <div className="flex items-center gap-2">
                                                         <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                             <div className={`h-1.5 rounded-full ${item.ratio > 0.5 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${Math.min(item.ratio * 100, 100)}%`}}></div>
                                                         </div>
                                                         <span className="text-xs font-mono">{(item.ratio * 100).toFixed(0)}%</span>
                                                     </div>
                                                 </td>
                                                 <td className="px-6 py-4">
                                                     {item.ratio > 0.4 ? (
                                                         <span className="px-2 py-1 bg-red-100 text-red-700 rounded border border-red-200 text-xs font-bold flex items-center gap-1 w-fit">
                                                             <AlertTriangle size={10}/> {t('replace')}
                                                         </span>
                                                     ) : (
                                                         <span className="px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 text-xs font-bold flex items-center gap-1 w-fit">
                                                             <Check size={10}/> {t('repair')}
                                                         </span>
                                                     )}
                                                 </td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    </div>
                )}
                
                {/* 3. REPORT GENERATOR (CM/PPM) */}
                {activeTab === 'tab_gen_report' && (
                    <div className="space-y-6">
                        {/* Search Specific Job Report */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                             <h3 className="font-bold text-lg mb-4 text-gray-900 flex items-center gap-2">
                                 <Search className="text-brand"/> Find Job Order Report
                             </h3>
                             <div className="flex gap-4">
                                 <input 
                                     type="text" 
                                     placeholder="Enter Job Order ID (e.g. 2236)" 
                                     className="input-modern"
                                     value={jobOrderSearchId}
                                     onChange={(e) => setJobOrderSearchId(e.target.value)}
                                 />
                                 <select 
                                     className="input-modern w-40" 
                                     value={reportType} 
                                     onChange={(e) => setReportType(e.target.value as any)}
                                 >
                                     <option value="CM">Corrective</option>
                                     <option value="PPM">Preventive</option>
                                 </select>
                                 <button onClick={handleFindJobReport} className="btn-primary whitespace-nowrap">
                                     View Report
                                 </button>
                             </div>
                        </div>

                        {/* Batch Reports */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-lg mb-4 text-gray-900">{t('gen_report')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('report_type')}</label>
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                                            <input type="radio" name="rptType" checked={reportType === 'CM'} onChange={() => setReportType('CM')} className="text-brand"/>
                                            <span className="font-medium">{t('cm_report')}</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                                            <input type="radio" name="rptType" checked={reportType === 'PPM'} onChange={() => setReportType('PPM')} className="text-brand"/>
                                            <span className="font-medium">{t('ppm_report')}</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('date_range')}</label>
                                        <div className="flex gap-2">
                                            <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="input-modern"/>
                                            <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="input-modern"/>
                                        </div>
                                    </div>
                                    <button className="w-full btn-primary mt-4">
                                        <Download size={18}/> {t('download_pdf')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 4. KNOWLEDGE BASE */}
                {activeTab === 'tab_kb' && (
                    <div className="space-y-6">
                        <div className="flex gap-4 border-b border-border pb-1">
                             <button 
                                onClick={() => setKbMode('list')}
                                className={`pb-3 px-2 font-bold text-sm transition-all ${kbMode === 'list' ? 'text-brand border-b-2 border-brand' : 'text-text-muted'}`}
                             >
                                 <Library className="inline mr-2" size={16}/> {t('kb_library')}
                             </button>
                             <button 
                                onClick={() => setKbMode('ai')}
                                className={`pb-3 px-2 font-bold text-sm transition-all ${kbMode === 'ai' ? 'text-brand border-b-2 border-brand' : 'text-text-muted'}`}
                             >
                                 <BrainCircuit className="inline mr-2" size={16}/> {t('kb_ai_search')}
                             </button>
                        </div>
                        
                        {kbMode === 'list' ? (
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <div className="relative mb-6">
                                    <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                    <input 
                                        type="text" 
                                        className="input-modern pl-10" 
                                        placeholder="Search manuals, guides..."
                                        value={kbSearch}
                                        onChange={(e) => setKbSearch(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredKbDocs.map(doc => (
                                        <div key={doc.id} className="p-4 border border-border rounded-xl hover:shadow-md transition-all group cursor-pointer bg-gray-50 hover:bg-white">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-brand/30">
                                                        <Book className="text-brand" size={20}/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 group-hover:text-brand transition-colors line-clamp-1">{doc.title}</h4>
                                                        <p className="text-xs text-text-muted">{doc.category} • {doc.type}</p>
                                                    </div>
                                                </div>
                                                <Download size={16} className="text-gray-400 group-hover:text-brand"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft min-h-[400px]">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Sparkles className="text-violet-500"/> {t('ai_search_title')}
                                </h3>
                                <div className="flex gap-2 mb-6">
                                    <input 
                                        type="text" 
                                        className="input-modern"
                                        placeholder={t('ai_search_placeholder')}
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAiSearch}
                                        disabled={!aiQuery || isAiSearching}
                                        className="btn-primary bg-violet-600 hover:bg-violet-700 shadow-violet-200 disabled:opacity-70"
                                    >
                                        {isAiSearching ? t('analyzing') : t('btn_analyze')}
                                    </button>
                                </div>
                                
                                {aiResult && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
                                        <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                                            <h4 className="font-bold text-violet-900 text-sm mb-2 flex items-center gap-2"><Lightbulb size={16}/> {t('ai_explanation')}</h4>
                                            <p className="text-sm text-gray-800 leading-relaxed">{aiResult.explanation}</p>
                                        </div>
                                        
                                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <h4 className="font-bold text-emerald-900 text-sm mb-2 flex items-center gap-2"><CheckCircle2 size={16}/> {t('ai_solution')}</h4>
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">{aiResult.solution}</p>
                                        </div>

                                        {aiResult.relevantDocs.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="font-bold text-gray-900 text-sm mb-3">{t('ai_ref_docs')}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {aiResult.relevantDocs.map((docTitle, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                                            <BookOpen size={14} className="text-text-muted"/>
                                                            {docTitle}
                                                            <ArrowRight size={14} className="ml-auto text-gray-400"/>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
    
    // ... (Other views fallback)
    if (currentView === 'dashboard') {
        // ... (Dashboard JSX)
        return (
            <div className="space-y-6 animate-in fade-in">
                 {/* Header */}
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                  <h2 className="text-2xl font-bold text-gray-900">{t('nav_dashboard')}</h2>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => setIsSimulationActive(!isSimulationActive)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isSimulationActive ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <Activity size={16} className={isSimulationActive ? 'animate-pulse' : ''} />
                        {isSimulationActive ? 'Live Traffic ON' : 'Simulate Traffic'}
                    </button>
                  </div>
                </div>
                
                {/* 3D Map Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden min-h-[500px]">
                        <div className="p-4 border-b border-border bg-gray-50/50 flex justify-between">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Layers className="text-brand"/> {t('floor_plan_3d')}
                            </h3>
                        </div>
                        <div className="relative h-[500px] bg-gray-100 flex items-center justify-center p-4 overflow-hidden">
                             {/* Isometric Container */}
                             <div className="relative w-full h-full max-w-2xl aspect-square transform rotate-x-60 rotate-z-[-45deg] shadow-2xl bg-white/40 border-4 border-white/50 rounded-xl scale-75 lg:scale-90 transition-transform">
                                  {departmentZones.map(zone => {
                                      const zoneAssets = getAssetsInZone(zone.id);
                                      // Determine color based on highest severity status
                                      const downCount = zoneAssets.filter(a => a.status === AssetStatus.DOWN).length;
                                      const maintCount = zoneAssets.filter(a => a.status === AssetStatus.UNDER_MAINT).length;
                                      
                                      let statusColor = 'bg-white/80 border-white/50'; // Default
                                      let zIndex = 10;
                                      
                                      if (downCount > 0) {
                                          statusColor = 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
                                          zIndex = 30;
                                      } else if (maintCount > 0) {
                                          statusColor = 'bg-amber-500/20 border-amber-500/50';
                                          zIndex = 20;
                                      } else if (zoneAssets.length > 0) {
                                          statusColor = 'bg-emerald-500/10 border-emerald-500/30';
                                      }

                                      return (
                                          <div
                                              key={zone.id}
                                              onClick={() => setSelectedMapZone(zone.id)}
                                              className={`absolute transition-all duration-300 cursor-pointer border-2 rounded-lg flex items-center justify-center flex-col hover:-translate-y-2 hover:shadow-xl hover:bg-white
                                                ${selectedMapZone === zone.id ? '-translate-y-4 shadow-2xl border-brand z-40 bg-white' : `z-${zIndex} ${statusColor}`}
                                              `}
                                              style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
                                          >
                                              <div className="transform -rotate-z-[45deg] text-center">
                                                  <div className="font-bold text-[10px] lg:text-xs truncate px-1">{zone.name}</div>
                                                  {zoneAssets.length > 0 && (
                                                      <div className="text-[8px] font-bold bg-white/80 px-1 rounded-full mt-1 inline-block shadow-sm">
                                                          {zoneAssets.length}
                                                      </div>
                                                  )}
                                                  {isSimulationActive && zoneAssets.length > 0 && <Signal size={12} className="mx-auto mt-1 text-brand animate-ping"/>}
                                              </div>
                                          </div>
                                      )
                                  })}
                             </div>
                        </div>
                    </div>
                    {/* Zone Details Panel */}
                    <div className="bg-white rounded-2xl border border-border shadow-soft flex flex-col h-[500px]">
                        <div className="p-4 border-b border-border bg-gray-50/50">
                            <h3 className="font-bold text-lg text-gray-900">{selectedMapZone ? `${selectedMapZone} Details` : t('select_zone')}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
                            {selectedMapZone ? (
                                getAssetsInZone(selectedMapZone).length > 0 ? (
                                    getAssetsInZone(selectedMapZone).map(asset => (
                                        <div key={asset.asset_id} className="bg-white border p-3 rounded-xl flex items-center gap-3 hover:shadow-sm transition">
                                            <div className={`w-2 h-8 rounded-full ${asset.status === AssetStatus.RUNNING ? 'bg-success' : asset.status === AssetStatus.DOWN ? 'bg-danger' : 'bg-warning'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate">{asset.name}</div>
                                                <div className="text-xs text-text-muted">{asset.model}</div>
                                            </div>
                                            <span className="text-[10px] font-mono bg-gray-100 px-1 rounded">{asset.asset_id}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-400 py-10">No assets found in this zone.</div>
                                )
                            ) : (
                                <div className="text-center text-gray-400 py-10 flex flex-col items-center gap-2">
                                    <MapPin size={32} className="opacity-20"/>
                                    Select a zone on the 3D map to view assets
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (currentView === 'users') {
        // ... (Keep Users render)
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                    <h2 className="text-2xl font-bold text-gray-900">{t('users_title')}</h2>
                    <button onClick={() => setIsAddUserModalOpen(true)} className="btn-primary py-2 px-4 text-sm">
                        <UserPlus size={16}/> {t('add_user')}
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Department</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u.user_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">{u.name[0]}</div>
                                        {u.name}
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{u.role}</span></td>
                                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                                    <td className="px-6 py-4">{u.department || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {isAddUserModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                            <h3 className="font-bold text-lg mb-4">{t('modal_add_user')}</h3>
                            <form onSubmit={handleAddUserSubmit} className="space-y-4">
                                <input className="input-modern" placeholder={t('user_name')} value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} required />
                                <input className="input-modern" placeholder={t('user_email')} type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} required />
                                <select className="input-modern" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}>
                                    {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                    <button type="submit" className="flex-1 btn-primary">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // --- TOAST NOTIFICATION ---
    return (
        <div className="relative">
            {/* ... Existing views rendered above, fallback just in case */}
            
            {showToast && (
                <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4 flex items-center gap-3 z-50">
                    <div className="bg-green-500 rounded-full p-1"><Check size={14} /></div>
                    <div>
                        <div className="font-bold text-sm">Assignment Complete</div>
                        <div className="text-xs text-gray-300">Notification sent to technician.</div>
                    </div>
                </div>
            )}
        </div>
    );
};
