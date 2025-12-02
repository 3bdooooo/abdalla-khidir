
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog, RoleDefinition, Resource, Action } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan, Bluetooth, Wifi, MonitorCheck, CheckCircle2, Shield, Award, ThumbsDown, Briefcase, GraduationCap, Info, Table, XCircle, SearchX, Globe } from 'lucide-react';
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
    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('tab_analytics'); 
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const { t, language, dir } = useLanguage();
    
    // Notification Toast State
    const [showToast, setShowToast] = useState(false);
    
    // Modals & Forms
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAssetForm, setNewAssetForm] = useState({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' });
    
    // Users & Roles State
    const [userMgmtTab, setUserMgmtTab] = useState<'users' | 'roles'>('users');
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', phone: '', password: '', role: 'Technician', department: '', signature: '' });
    const [isRoleEditorOpen, setIsRoleEditorOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
    
    // Inventory State
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [confirmRestockOpen, setConfirmRestockOpen] = useState(false);
    const [selectedPartForRestock, setSelectedPartForRestock] = useState<InventoryPart | null>(null);
    const [restockAmount, setRestockAmount] = useState('');
    
    // Reporting State
    const [reportType, setReportType] = useState<'CM' | 'PPM' | 'COMPLIANCE'>('CM');
    const [jobOrderSearchId, setJobOrderSearchId] = useState('');
    const [selectedCMReport, setSelectedCMReport] = useState<DetailedJobOrderReport | null>(null);
    const [selectedPMReport, setSelectedPMReport] = useState<PreventiveMaintenanceReport | null>(null);
    
    // Alerts State
    const [alerts, setAlerts] = useState<SystemAlert[]>(getSystemAlerts());
    
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
    const [aiQuery, setAiQuery] = useState('');
    const [aiResult, setAiResult] = useState<{explanation: string, solution: string, relevantDocs: string[]} | null>(null);
    const [isAiSearching, setIsAiSearching] = useState(false);

    // Training Dashboard State
    const [selectedTrainingDept, setSelectedTrainingDept] = useState('');

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

    const { status: zebraStatus } = useZebraScanner({
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
        const loadRoles = async () => {
            const data = await api.fetchRoles();
            setRoles(data);
        };
        loadRoles();
    }, []);

    useEffect(() => { 
        if (currentView === 'analysis') setActiveTab('tab_analytics'); 
        else setActiveTab('tab1'); 
        
        setSelectedAsset(null); 
        setSelectedCMReport(null); 
        setSelectedPMReport(null);
        
        // Reset simulations on view change
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

        const departments = Array.from(new Set(getLocations().map(l => l.department)));
        const deptScores = departments.map(dept => {
            const deptAssets = assets.filter(a => {
                const loc = getLocations().find(l => l.location_id === a.location_id);
                return loc?.department === dept;
            });
            const assetIds = deptAssets.map(a => a.asset_id);
            const deptWOs = workOrders.filter(wo => assetIds.includes(wo.asset_id) || assetIds.includes(wo.asset_id.replace('NFC-', 'AST-')));
            const totalWOs = deptWOs.length;
            if (totalWOs === 0) return { name: dept, score: 100, totalWOs: 0, userErrors: 0 };
            const userErrors = deptWOs.filter(wo => wo.failure_type === 'UserError').length;
            const techFaults = deptWOs.filter(wo => wo.failure_type === 'Technical').length;
            let score = 100 - (userErrors * 15) - (techFaults * 2);
            if (score < 0) score = 0;
            if (score > 100) score = 100;
            return { name: dept, score, totalWOs, userErrors };
        });

        const topDepts = [...deptScores].sort((a, b) => b.score - a.score).slice(0, 5);
        const lowRepDepts = [...deptScores].sort((a, b) => a.score - b.score).slice(0, 5);

        const assetReputation = assets.map(a => {
             const wos = workOrders.filter(w => w.asset_id === a.asset_id);
             const userErrors = wos.filter(w => w.failure_type === 'UserError').length;
             return { ...a, userErrors };
        }).sort((a, b) => b.userErrors - a.userErrors).slice(0, 10);

        const manufacturers = Array.from(new Set(assets.map(a => a.manufacturer || 'Generic')));
        const vendorStats = manufacturers.map(mfg => {
            const mfgAssets = assets.filter(a => (a.manufacturer || 'Generic') === mfg);
            const assetIds = mfgAssets.map(a => a.asset_id);
            const mfgWOs = workOrders.filter(wo => assetIds.includes(wo.asset_id.replace('NFC-', 'AST-')));
            const correctiveWOs = mfgWOs.filter(wo => wo.type === WorkOrderType.CORRECTIVE).length;
            const failureRatio = mfgAssets.length > 0 ? correctiveWOs / mfgAssets.length : 0;
            const reliabilityScore = Math.max(0, 100 - (failureRatio * 20));
            let totalHours = 0;
            let countClosed = 0;
            mfgWOs.forEach(wo => {
                if (wo.status === 'Closed' && wo.start_time && wo.close_time) {
                    const diff = new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime();
                    totalHours += diff / (1000 * 60 * 60);
                    countClosed++;
                }
            });
            const avgMTTR = countClosed > 0 ? totalHours / countClosed : 0;
            const supportScore = Math.max(0, 100 - (avgMTTR * 2));
            const finalScore = Math.round((reliabilityScore * 0.6) + (supportScore * 0.4));
            return { name: mfg, assetCount: mfgAssets.length, woCount: correctiveWOs, avgMTTR: avgMTTR.toFixed(1), score: finalScore };
        }).sort((a, b) => b.score - a.score);

        return { mttrTrend, statusData, riskData, tcoData, financialAnalysis, topDepts, lowRepDepts, assetReputation, vendorStats };
    }, [assets, workOrders, users]);

    // TRAINING DATA CALCULATIONS
    const trainingData = useMemo(() => {
        if (!selectedTrainingDept) return null;
        const deptAssets = assets.filter(a => {
            const loc = getLocations().find(l => l.location_id === a.location_id);
            return loc?.department === selectedTrainingDept;
        });
        const deptAssetIds = deptAssets.map(a => a.asset_id);
        const userErrorWOs = workOrders.filter(wo => 
            (deptAssetIds.includes(wo.asset_id) || deptAssetIds.includes(wo.asset_id.replace('NFC-', 'AST-')))
        );
        const errorCounts: Record<string, number> = {};
        userErrorWOs.forEach(wo => {
            let errorKey = "General Misuse";
            const desc = wo.description.toLowerCase();
            if (desc.includes('cable') || desc.includes('cord')) errorKey = "Cable Damage / Yanking";
            else if (desc.includes('drop') || desc.includes('fell')) errorKey = "Physical Drop / Impact";
            else if (desc.includes('battery') || desc.includes('charge')) errorKey = "Battery Mgmt Failure";
            else if (desc.includes('clean') || desc.includes('fluid')) errorKey = "Improper Cleaning";
            else if (desc.includes('setting') || desc.includes('config')) errorKey = "Wrong Settings";
            errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
        });
        const topErrors = Object.entries(errorCounts)
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const totalErrors = userErrorWOs.length;
        const needsSession = totalErrors > 3;
        return { topErrors, totalErrors, needsSession };
    }, [selectedTrainingDept, assets, workOrders]);

    // --- HANDLERS ---
    const triggerNotification = () => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
    const handleAiSearch = async () => { if(!aiQuery) return; setIsAiSearching(true); setAiResult(null); const result = await searchKnowledgeBase(aiQuery, kbDocuments.map(d=>d.title), language); setAiResult(result); setIsAiSearching(false); };
    const handleAddSubmit = (e: React.FormEvent) => { e.preventDefault(); onAddAsset({...newAssetForm, location_id: Number(newAssetForm.location_id)} as any); setIsAddModalOpen(false); setNewAssetForm({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' }); };
    const handleAddUserSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!onAddUser) return; onAddUser({...newUserForm, user_id: Date.now(), location_id: 101} as User); setIsAddUserModalOpen(false); refreshData(); setNewUserForm({ name: '', email: '', phone: '', password: '', role: 'Technician', department: '', signature: '' }); };
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
    const handleSimulateAuditScan = () => { if(activeAudit && activeAudit.missing_assets.length > 0) { const randomId = activeAudit.missing_assets[Math.floor(Math.random() * activeAudit.missing_assets.length)]; handleRealScan(randomId); }};

    // ROLE MANAGEMENT
    const handleOpenRoleEditor = (role?: RoleDefinition) => {
        if (role) { setEditingRole({ ...role, permissions: JSON.parse(JSON.stringify(role.permissions)) }); } 
        else { setEditingRole({ id: Date.now().toString(), name: '', description: '', is_system_role: false, permissions: { assets: [], work_orders: [], inventory: [], reports: [], users: [], settings: [] } }); }
        setIsRoleEditorOpen(true);
    };
    const handlePermissionToggle = (resource: Resource, action: Action) => { if (!editingRole) return; const currentPerms = editingRole.permissions[resource] || []; const hasPerm = currentPerms.includes(action); setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [resource]: hasPerm ? currentPerms.filter(a => a !== action) : [...currentPerms, action] } }); };
    const handleSaveRole = async () => { if (!editingRole || !editingRole.name) return; await api.saveRole(editingRole); const data = await api.fetchRoles(); setRoles(data); setIsRoleEditorOpen(false); setEditingRole(null); };
    
    // --- RENDER HELPERS ---
    const departmentZones = [ { id: 'ICU', name: 'ICU', x: 10, y: 10, width: 20, height: 20, color: 'bg-indigo-100' }, { id: 'Emergency', name: 'ER', x: 40, y: 10, width: 25, height: 15, color: 'bg-red-100' }, { id: 'Radiology', name: 'Rad', x: 70, y: 10, width: 20, height: 20, color: 'bg-blue-100' }, { id: 'Laboratory', name: 'Lab', x: 10, y: 40, width: 15, height: 20, color: 'bg-yellow-100' }, { id: 'Surgery', name: 'OR', x: 50, y: 30, width: 25, height: 25, color: 'bg-teal-100' }, { id: 'Pharmacy', name: 'Pharm', x: 30, y: 40, width: 15, height: 15, color: 'bg-green-100' }, { id: 'General Ward', name: 'Ward', x: 5, y: 90, width: 25, height: 10, color: 'bg-gray-100' } ];
    const getAssetsInZone = (deptId: string) => assets.filter(a => { const loc = getLocations().find(l => l.location_id === a.location_id); return loc?.department === deptId || (loc?.department && loc.department.includes(deptId)); });

    // =========================================================================
    // 1. DASHBOARD VIEW
    // =========================================================================
    if (currentView === 'dashboard') {
        const stats = [
            { label: t('total_assets'), value: assets.length, icon: Box, color: 'bg-blue-500' },
            { label: t('open_tickets'), value: workOrders.filter(w => w.status !== 'Closed').length, icon: AlertCircle, color: 'bg-red-500' },
            { label: t('inventory_alerts'), value: inventory.filter(i => i.current_stock <= i.min_reorder_level).length, icon: Package, color: 'bg-orange-500' },
            { label: t('kpi_availability'), value: '98.2%', icon: Activity, color: 'bg-green-500' },
        ];

        return (
            <div className="space-y-8 animate-in fade-in">
                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, i) => (
                        <div key={i} className="glass rounded-2xl p-5 relative overflow-hidden group hover:shadow-glow transition-all">
                            <div className={`absolute top-0 end-0 p-3 rounded-bl-2xl opacity-10 ${stat.color} w-24 h-24 -mr-4 -mt-4`}></div>
                            <div className="relative z-10">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                                <p className="text-sm font-medium text-text-muted">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: 3D Map */}
                    <div className="lg:col-span-2 glass-panel rounded-3xl p-6 min-h-[500px] flex flex-col relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                                <MapPin className="text-brand" /> {t('dept_map')}
                            </h3>
                            <button 
                                onClick={() => setIsSimulationActive(!isSimulationActive)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isSimulationActive ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {isSimulationActive ? 'Simulation Active' : 'Start Sim'}
                            </button>
                        </div>
                        
                        <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 relative overflow-hidden perspective-1000 shadow-inner group">
                            <div className="absolute inset-0 flex items-center justify-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(20deg) rotateY(0deg) scale(0.9)' }}>
                                <div className="relative w-full h-full max-w-2xl max-h-2xl">
                                    {departmentZones.map(zone => {
                                        const zoneAssets = getAssetsInZone(zone.id);
                                        const hasIssues = zoneAssets.some(a => a.status === AssetStatus.DOWN);
                                        const hasMaint = zoneAssets.some(a => a.status === AssetStatus.UNDER_MAINT);
                                        
                                        // Dynamic Color Logic based on status
                                        let zoneColorClass = zone.color;
                                        if (hasIssues) zoneColorClass = 'bg-red-200 shadow-red-200/50 border-red-300';
                                        else if (hasMaint) zoneColorClass = 'bg-orange-200 shadow-orange-200/50 border-orange-300';
                                        else zoneColorClass = 'bg-white shadow-gray-200/50 border-gray-200';

                                        return (
                                            <div 
                                                key={zone.id}
                                                onClick={() => setSelectedMapZone(zone.id)}
                                                className={`absolute transition-all duration-500 cursor-pointer hover:translate-y-[-10px] hover:shadow-2xl border-2 ${zoneColorClass} rounded-lg flex flex-col items-center justify-center shadow-lg`}
                                                style={{ 
                                                    left: `${language === 'ar' ? (100 - zone.x - zone.width) : zone.x}%`, 
                                                    top: `${zone.y}%`, 
                                                    width: `${zone.width}%`, 
                                                    height: `${zone.height}%` 
                                                }}
                                            >
                                                <div className="font-bold text-[10px] md:text-xs text-gray-800 text-center px-1">{zone.name}</div>
                                                <div className="flex gap-1 mt-1">
                                                    {zoneAssets.length > 0 && <span className="w-2 h-2 rounded-full bg-gray-400"></span>}
                                                    {hasIssues && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Zone Panel */}
                        {selectedMapZone && (
                            <div className="absolute top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur shadow-2xl border-l border-gray-200 p-4 transform transition-transform animate-in slide-in-from-right z-20 overflow-hidden flex flex-col rounded-r-3xl">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">{departmentZones.find(z=>z.id===selectedMapZone)?.name}</h4>
                                        <p className="text-xs text-text-muted">{getAssetsInZone(selectedMapZone).length} Assets Detected</p>
                                    </div>
                                    <button onClick={() => setSelectedMapZone(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={18}/></button>
                                </div>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                                    {getAssetsInZone(selectedMapZone).map(a => (
                                        <div key={a.asset_id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-sm text-gray-800">{a.name}</div>
                                                <div className={`w-2 h-2 rounded-full ${a.status === AssetStatus.RUNNING ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{a.model}</div>
                                            <div className="text-[10px] font-mono text-gray-400 mt-1">{a.asset_id}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Asset Health & Alerts */}
                    <div className="space-y-6">
                        <div className="glass-panel rounded-3xl p-6">
                            <h3 className="font-bold text-lg text-gray-900 mb-4">{t('asset_health')}</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={analyticsData.statusData} 
                                            cx="50%" cy="50%" 
                                            innerRadius={60} outerRadius={80} 
                                            dataKey="value" paddingAngle={5}
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

                        {/* Recent Alerts List */}
                        <div className="glass-panel rounded-3xl p-6">
                            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                                <ShieldAlert className="text-brand" size={20}/> {t('alert_boundary')}
                            </h3>
                            <div className="space-y-3">
                                {alerts.slice(0, 3).map(alert => (
                                    <div key={alert.id} className="bg-red-50/50 border border-red-100 p-3 rounded-xl flex gap-3 items-start">
                                        <AlertTriangle size={16} className="text-red-500 mt-1 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{alert.message}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 2. USERS & ROLES VIEW
    // =========================================================================
    if (currentView === 'users') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm w-fit">
                    <button onClick={() => setUserMgmtTab('users')} className={`px-6 py-2 rounded-lg font-bold text-sm ${userMgmtTab === 'users' ? 'bg-brand text-white shadow' : 'text-gray-500'}`}>{t('users_title')}</button>
                    <button onClick={() => setUserMgmtTab('roles')} className={`px-6 py-2 rounded-lg font-bold text-sm ${userMgmtTab === 'roles' ? 'bg-brand text-white shadow' : 'text-gray-500'}`}>{t('tab_roles')}</button>
                </div>

                {userMgmtTab === 'users' ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                            <h2 className="text-2xl font-bold text-gray-900">{t('users_title')}</h2>
                            <button onClick={() => setIsAddUserModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><UserPlus size={16}/> {t('add_user')}</button>
                        </div>
                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-border">
                                    <tr>
                                        <th className="p-4">{t('user_name')}</th>
                                        <th className="p-4">{t('user_role')}</th>
                                        <th className="p-4">{t('user_dept')}</th>
                                        <th className="p-4">{t('user_email')}</th>
                                        <th className="p-4">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map(u => (
                                        <tr key={u.user_id} className="hover:bg-gray-50/50">
                                            <td className="p-4 font-bold text-gray-900">{u.name}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-brand rounded-lg text-xs font-bold">{u.role}</span></td>
                                            <td className="p-4 text-sm text-gray-600">{u.department}</td>
                                            <td className="p-4 text-sm text-gray-500">{u.email}</td>
                                            <td className="p-4"><button className="text-gray-400 hover:text-brand"><Wrench size={16}/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                            <h2 className="text-2xl font-bold text-gray-900">{t('manage_roles')}</h2>
                            <button onClick={() => handleOpenRoleEditor()} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('create_role')}</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roles.map(role => (
                                <div key={role.id} className="bg-white border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-gray-900 text-lg">{role.name}</h3>
                                        {role.is_system_role && <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded">SYSTEM</span>}
                                    </div>
                                    <p className="text-sm text-text-muted mb-4">{role.description}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenRoleEditor(role)} className="flex-1 btn-secondary text-xs py-2">Edit Permissions</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modals for User/Role would go here */}
            </div>
        );
    }

    // =========================================================================
    // 3. MAINTENANCE VIEW
    // =========================================================================
    if (currentView === 'maintenance') {
        const filteredWOs = workOrders.filter(wo => {
            if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
            if (maintenanceFilterType !== 'all' && wo.type !== maintenanceFilterType) return false;
            return true;
        });

        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Header & Controls */}
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                    <h2 className="text-2xl font-bold text-gray-900">{t('wo_title')}</h2>
                    <div className="flex gap-3">
                        <select className="input-modern py-2 text-xs w-32" value={maintenanceFilterPriority} onChange={e=>setMaintenanceFilterPriority(e.target.value)}>
                            <option value="all">{t('priority')}: {t('filter_all')}</option>
                            <option value={Priority.CRITICAL}>{Priority.CRITICAL}</option>
                            <option value={Priority.HIGH}>{Priority.HIGH}</option>
                        </select>
                        <button onClick={() => setMaintenanceViewMode(maintenanceViewMode === 'kanban' ? 'list' : 'kanban')} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
                            {maintenanceViewMode === 'kanban' ? <List size={20}/> : <LayoutGrid size={20}/>}
                        </button>
                        <button onClick={() => setIsCreateWOModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('create_wo')}</button>
                    </div>
                </div>

                {/* KANBAN BOARD */}
                {maintenanceViewMode === 'kanban' ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-220px)]">
                        {['Open', 'Assigned', 'In Progress', 'Closed'].map(status => (
                            <div key={status} className="flex-1 min-w-[300px] bg-gray-50/50 rounded-2xl border border-border p-4 flex flex-col">
                                <div className="flex justify-between items-center mb-4 px-2">
                                    <h3 className="font-bold text-gray-700">{status}</h3>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{filteredWOs.filter(w => w.status === status).length}</span>
                                </div>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                                    {filteredWOs.filter(w => w.status === status).map(wo => {
                                        const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                                        return (
                                            <div key={wo.wo_id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group">
                                                <div className="flex justify-between mb-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>{wo.priority}</span>
                                                    <span className="text-[10px] text-gray-400">#{wo.wo_id}</span>
                                                </div>
                                                <div className="font-bold text-gray-900 text-sm mb-1">{asset?.name || 'Unknown Asset'}</div>
                                                <div className="text-xs text-text-muted mb-3 line-clamp-2">{wo.description}</div>
                                                <div className="flex justify-between items-center mt-2 border-t pt-2 border-gray-100">
                                                    {status === 'Open' ? (
                                                        <button 
                                                            onClick={() => { setSelectedWOForAssignment(wo); setIsAssignModalOpen(true); }}
                                                            className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark w-full"
                                                        >
                                                            {t('assign')}
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }}
                                                            className="text-xs text-brand font-bold hover:underline"
                                                        >
                                                            Details
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // LIST VIEW
                    <div className="bg-white rounded-2xl border border-border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-border">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Asset</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4">Priority</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredWOs.map(wo => (
                                    <tr key={wo.wo_id} className="border-b border-border hover:bg-gray-50">
                                        <td className="p-4 text-xs font-mono">#{wo.wo_id}</td>
                                        <td className="p-4 text-sm font-bold">{assets.find(a => a.asset_id === wo.asset_id)?.name}</td>
                                        <td className="p-4 text-sm text-gray-600 truncate max-w-xs">{wo.description}</td>
                                        <td className="p-4"><span className={`text-xs font-bold px-2 py-1 rounded ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>{wo.priority}</span></td>
                                        <td className="p-4 text-xs">{wo.status}</td>
                                        <td className="p-4">
                                            <button onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }} className="text-brand hover:underline text-xs font-bold">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modals needed for Maintenance: Create, Assign, Details */}
                {isAssignModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">{t('assign_technician')}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">{t('select_tech')}</label>
                                    <select className="input-modern" value={selectedTechForAssignment} onChange={e => setSelectedTechForAssignment(e.target.value)}>
                                        <option value="">Choose...</option>
                                        {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(tech => (
                                            <option key={tech.user_id} value={tech.user_id}>{tech.name} ({tech.role})</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <button 
                                    type="button" 
                                    onClick={handleSmartAssign} 
                                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                                >
                                    <Sparkles size={18}/> {t('btn_smart_assign')}
                                </button>

                                {recommendedTechs.length > 0 && (
                                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
                                        <div className="text-xs font-bold text-purple-700 uppercase">AI Recommendations</div>
                                        {recommendedTechs.slice(0, 2).map(rec => (
                                            <div key={rec.user.user_id} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 cursor-pointer hover:bg-purple-50" onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())}>
                                                <div>
                                                    <div className="font-bold text-sm">{rec.user.name}</div>
                                                    <div className="text-[10px] text-gray-500">{rec.reason}</div>
                                                </div>
                                                <div className="text-xs font-bold text-green-600">{rec.score} pts</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setIsAssignModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                    <button onClick={handleAssignSubmit} className="flex-1 btn-primary">{t('btn_assign_confirm')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // 4. INVENTORY VIEW
    // =========================================================================
    if (currentView === 'inventory') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Package size={24}/></div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{inventory.length}</div>
                            <div className="text-sm text-text-muted">Total SKUs</div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><AlertCircle size={24}/></div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{inventory.filter(i => i.current_stock <= i.min_reorder_level).length}</div>
                            <div className="text-sm text-text-muted">{t('tab_alerts')}</div>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center"><DollarSign size={24}/></div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">${inventory.reduce((acc, i) => acc + (i.cost * i.current_stock), 0).toLocaleString()}</div>
                            <div className="text-sm text-text-muted">Total Value</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-border">
                            <tr>
                                <th className="p-4">{t('part_name')}</th>
                                <th className="p-4">{t('stock_level')}</th>
                                <th className="p-4">{t('min_level_label')}</th>
                                <th className="p-4">{t('unit_cost')}</th>
                                <th className="p-4">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {inventory.map(part => (
                                <tr key={part.part_id} className="hover:bg-gray-50/50">
                                    <td className="p-4 font-bold text-gray-900">{part.part_name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${part.current_stock <= part.min_reorder_level ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {part.current_stock}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">{part.min_reorder_level}</td>
                                    <td className="p-4 text-sm font-mono">${part.cost}</td>
                                    <td className="p-4">
                                        <button onClick={() => initiateRestock(part)} className="text-brand hover:underline text-xs font-bold flex items-center gap-1">
                                            <Plus size={14}/> {t('btn_restock')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {restockModalOpen && selectedPartForRestock && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="text-xl font-bold mb-4">{t('restock_modal_title')}</h3>
                            <p className="text-sm text-gray-600 mb-4">Adding stock for: <strong>{selectedPartForRestock.part_name}</strong></p>
                            <input type="number" className="input-modern mb-4" placeholder={t('restock_qty')} value={restockAmount} onChange={e => setRestockAmount(e.target.value)} />
                            <div className="flex gap-2">
                                <button onClick={() => setRestockModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={handleRestockPreCheck} className="flex-1 btn-primary">{t('restock_btn')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // 5. CALIBRATION VIEW
    // =========================================================================
    if (currentView === 'calibration') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{t('cal_dashboard')}</h2>
                        <p className="text-text-muted text-sm">Track compliance and certification status.</p>
                    </div>
                    <div className="flex gap-4 text-center">
                        <div className="px-6 py-2 bg-red-50 rounded-xl border border-red-100">
                            <div className="text-xl font-bold text-red-600">{assets.filter(a => a.next_calibration_date && new Date(a.next_calibration_date) < new Date()).length}</div>
                            <div className="text-xs text-red-400 uppercase font-bold">{t('cal_overdue')}</div>
                        </div>
                        <div className="px-6 py-2 bg-green-50 rounded-xl border border-green-100">
                            <div className="text-xl font-bold text-green-600">95%</div>
                            <div className="text-xs text-green-400 uppercase font-bold">{t('cal_compliant')}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-border">
                            <tr>
                                <th className="p-4">{t('asset_info')}</th>
                                <th className="p-4">{t('last_cal')}</th>
                                <th className="p-4">{t('next_due')}</th>
                                <th className="p-4">{t('status')}</th>
                                <th className="p-4">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {assets.filter(a => a.last_calibration_date).map(asset => {
                                const isOverdue = asset.next_calibration_date && new Date(asset.next_calibration_date) < new Date();
                                return (
                                    <tr key={asset.asset_id} className="hover:bg-gray-50/50">
                                        <td className="p-4 font-bold text-gray-900">{asset.name} <span className="text-xs font-normal text-gray-500 block">{asset.asset_id}</span></td>
                                        <td className="p-4 text-sm">{asset.last_calibration_date}</td>
                                        <td className="p-4 text-sm font-medium">{asset.next_calibration_date}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {isOverdue ? t('cal_overdue') : t('cal_compliant')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button onClick={() => { setAssetToCalibrate(asset); setUpdateCalibrationModalOpen(true); }} className="text-brand hover:underline text-xs font-bold">
                                                {t('btn_update_cal')}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                
                {updateCalibrationModalOpen && assetToCalibrate && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="text-xl font-bold mb-4">{t('update_cal_title')}</h3>
                            <div className="space-y-4">
                                <p className="text-sm">Device: <strong>{assetToCalibrate.name}</strong></p>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('new_cal_date')}</label>
                                    <input type="date" className="input-modern" value={newCalibrationDate} onChange={e => setNewCalibrationDate(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setUpdateCalibrationModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                    <button onClick={handleUpdateCalibration} className="flex-1 btn-primary">{t('btn_record')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // 6. ANALYSIS & REPORTING VIEW (Updated)
    // =========================================================================
    if (currentView === 'analysis') {
        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Analytics Nav */}
                <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm overflow-x-auto">
                    <button onClick={() => setActiveTab('tab_analytics')} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg ${activeTab === 'tab_analytics' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{t('tab_analytics')}</button>
                    <button onClick={() => setActiveTab('tab_financial')} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg ${activeTab === 'tab_financial' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{t('tab_financial')}</button>
                    <button onClick={() => setActiveTab('tab_vendor')} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg ${activeTab === 'tab_vendor' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{t('tab_vendor')}</button>
                    <button onClick={() => setActiveTab('tab_training')} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg ${activeTab === 'tab_training' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{t('tab_training')}</button>
                    <button onClick={() => setActiveTab('tab_gen_report')} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg ${activeTab === 'tab_gen_report' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{t('tab_gen_report')}</button>
                    <button onClick={() => setActiveTab('tab_kb')} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg ${activeTab === 'tab_kb' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>{t('tab_kb')}</button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-border min-h-[600px]">
                    {/* 6.1 STRATEGIC ANALYTICS */}
                    {activeTab === 'tab_analytics' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="h-[350px]">
                                    <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase">{t('chart_mttr_trend')}</h4>
                                    <ResponsiveContainer><AreaChart data={analyticsData.mttrTrend}><XAxis dataKey="month"/><YAxis/><Tooltip/><Area type="monotone" dataKey="hours" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.1}/></AreaChart></ResponsiveContainer>
                                </div>
                                <div className="h-[350px]">
                                    <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase">{t('chart_asset_status')}</h4>
                                    <ResponsiveContainer><PieChart><Pie data={analyticsData.statusData} dataKey="value" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}><Cell fill="#10B981"/><Cell fill="#EF4444"/><Cell fill="#F59E0B"/></Pie><Tooltip/></PieChart></ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* Predictive Risk Table */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase">{t('table_risk_report')}</h4>
                                <div className="overflow-hidden border border-border rounded-xl">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 font-bold text-gray-600"><tr><th className="p-3 text-left">Asset</th><th className="p-3 text-left">Location</th><th className="p-3 text-left">Score</th></tr></thead>
                                        <tbody className="divide-y divide-border">
                                            {analyticsData.riskData.map(a => (
                                                <tr key={a.asset_id}>
                                                    <td className="p-3 font-bold">{a.name}</td>
                                                    <td className="p-3 text-gray-500">{getLocationName(a.location_id)}</td>
                                                    <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold text-white ${a.risk_score > 70 ? 'bg-red-500' : 'bg-yellow-500'}`}>{a.risk_score}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6.2 VENDOR ANALYSIS */}
                    {activeTab === 'tab_vendor' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <h3 className="font-bold text-xl text-gray-900 mb-4">{t('vendor_leaderboard')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {analyticsData.vendorStats.slice(0, 3).map((v, i) => (
                                    <div key={v.name} className={`p-4 rounded-xl border-2 flex flex-col items-center text-center ${i === 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                                        <div className="text-2xl mb-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                                        <h4 className="font-bold text-lg">{v.name}</h4>
                                        <div className="text-sm text-gray-600 mt-1">Score: <span className="font-bold">{v.score}</span></div>
                                    </div>
                                ))}
                            </div>
                            <div className="overflow-hidden border border-border rounded-xl">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 font-bold text-gray-600"><tr><th className="p-3 text-left">Vendor</th><th className="p-3 text-center">MTTR (Hrs)</th><th className="p-3 text-center">Failures</th><th className="p-3 text-center">Score</th><th className="p-3 text-center">Verdict</th></tr></thead>
                                    <tbody className="divide-y divide-border">
                                        {analyticsData.vendorStats.map(v => (
                                            <tr key={v.name}>
                                                <td className="p-3 font-bold">{v.name}</td>
                                                <td className="p-3 text-center">{v.avgMTTR}</td>
                                                <td className="p-3 text-center">{v.woCount}</td>
                                                <td className="p-3 text-center font-bold">{v.score}</td>
                                                <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${v.score > 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{v.score > 80 ? t('rec_buy') : t('rec_avoid')}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 6.3 FINANCIAL ANALYSIS */}
                    {activeTab === 'tab_financial' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <h3 className="font-bold text-xl text-gray-900 mb-4">{t('tco_analysis')}</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="h-[350px]">
                                    <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase">Top 5 Costly Assets (Purchase vs Maint)</h4>
                                    <ResponsiveContainer>
                                        <BarChart data={analyticsData.tcoData} layout="vertical">
                                            <XAxis type="number"/><YAxis dataKey="name" type="category" width={100} style={{fontSize:'10px'}}/>
                                            <Tooltip/>
                                            <Legend/>
                                            <Bar dataKey="purchase_cost" name="Purchase" fill="#8884d8" stackId="a" />
                                            <Bar dataKey="accumulated_maintenance_cost" name="Maintenance" fill="#82ca9d" stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase">{t('table_financial_report')}</h4>
                                    <div className="overflow-hidden border border-border rounded-xl">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 font-bold text-gray-600"><tr><th className="p-3 text-left">Asset</th><th className="p-3 text-center">Cost Ratio</th><th className="p-3 text-center">Action</th></tr></thead>
                                            <tbody className="divide-y divide-border">
                                                {analyticsData.financialAnalysis.slice(0, 8).map(a => (
                                                    <tr key={a.id}>
                                                        <td className="p-3 font-bold text-xs">{a.name}</td>
                                                        <td className="p-3 text-center">{(a.ratio * 100).toFixed(0)}%</td>
                                                        <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${a.ratio > 0.4 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{a.ratio > 0.4 ? 'Replace' : 'Keep'}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 6.4 TRAINING DASHBOARD */}
                    {activeTab === 'tab_training' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xl text-gray-900">{t('training_dashboard')}</h3>
                                <select className="input-modern w-64" value={selectedTrainingDept} onChange={e => setSelectedTrainingDept(e.target.value)}>
                                    <option value="">{t('select_dept_training')}</option>
                                    {Array.from(new Set(getLocations().map(l => l.department))).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            
                            {trainingData ? (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                        <h4 className="font-bold text-lg mb-4 text-gray-800">{t('top_user_errors')}</h4>
                                        <div className="space-y-3">
                                            {trainingData.topErrors.map((err, i) => (
                                                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm">
                                                    <span className="font-medium text-gray-700">{i+1}. {err.error}</span>
                                                    <span className="bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full text-xs">{err.count} incidents</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-indigo-600 text-white rounded-2xl p-6 flex flex-col justify-between shadow-lg">
                                        <div>
                                            <h4 className="font-bold text-lg mb-2 opacity-90">{t('educator_recommendation')}</h4>
                                            <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                                                {trainingData.needsSession ? t('schedule_session_msg') : t('no_major_errors')}
                                            </p>
                                        </div>
                                        <button className="bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors w-full flex items-center justify-center gap-2">
                                            <Printer size={18}/> {t('print_flyer')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-400">Select a department to view training needs.</div>
                            )}
                        </div>
                    )}

                    {/* 6.5 KNOWLEDGE BASE */}
                    {activeTab === 'tab_kb' && (
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                    <input type="text" placeholder="Search manuals..." className="input-modern pl-10" value={kbSearch} onChange={e=>setKbSearch(e.target.value)}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredKbDocs.map(doc => (
                                    <div key={doc.id} className="p-4 border border-border rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Book size={20}/></div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900">{doc.title}</div>
                                                <div className="text-xs text-gray-500">{doc.category} • {doc.fileSize}</div>
                                            </div>
                                        </div>
                                        <button className="text-gray-400 hover:text-brand group-hover:translate-x-1 transition-all"><ArrowRight size={18}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* 6.6 REPORT GENERATOR */}
                    {activeTab === 'tab_gen_report' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl border border-border">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('report_type')}</label>
                                    <select className="input-modern" value={reportType} onChange={(e:any) => setReportType(e.target.value)}>
                                        <option value="CM">{t('cm_report')}</option>
                                        <option value="PPM">{t('ppm_report')}</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Job Order / Report ID</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                        <input 
                                            type="text" 
                                            className="input-modern pl-10" 
                                            placeholder="e.g. 2236"
                                            value={jobOrderSearchId}
                                            onChange={e => setJobOrderSearchId(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button onClick={handleFindJobReport} className="btn-primary mb-0.5">{t('gen_report')}</button>
                            </div>

                            {selectedCMReport && (
                                <div className="bg-white border border-gray-300 shadow-lg p-8 max-w-4xl mx-auto min-h-[800px] text-gray-900">
                                    {/* Report Header */}
                                    <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-blue-600 text-white flex items-center justify-center font-bold text-xl rounded">A2M</div>
                                            <div>
                                                <h1 className="text-2xl font-black uppercase tracking-widest">Job Order Report</h1>
                                                <p className="text-sm font-bold text-gray-600">Corrective Maintenance</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-500 uppercase">Report ID</div>
                                            <div className="text-lg font-mono font-bold">{selectedCMReport.report_id}</div>
                                            <div className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    {/* Asset Details */}
                                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm border p-4 rounded">
                                        <div><span className="font-bold">Asset:</span> {selectedCMReport.asset.name}</div>
                                        <div><span className="font-bold">Model:</span> {selectedCMReport.asset.model}</div>
                                        <div><span className="font-bold">S/N:</span> {selectedCMReport.asset.serial_no}</div>
                                        <div><span className="font-bold">Location:</span> {selectedCMReport.location.department} / {selectedCMReport.location.room}</div>
                                    </div>

                                    {/* Fault Info */}
                                    <div className="mb-6">
                                        <h4 className="font-bold border-b border-gray-300 mb-2">Fault & Remedy</h4>
                                        <p className="text-sm mb-2"><span className="font-bold">Problem:</span> {selectedCMReport.fault_details.fault_description}</p>
                                        <p className="text-sm bg-gray-50 p-2 rounded border border-gray-200"><span className="font-bold">Work Done:</span> {selectedCMReport.fault_details.remedy_work_done}</p>
                                    </div>

                                    {/* Parts */}
                                    <div className="mb-6">
                                        <h4 className="font-bold border-b border-gray-300 mb-2">Spare Parts</h4>
                                        <table className="w-full text-xs border border-gray-300">
                                            <thead className="bg-gray-100"><tr><th className="p-2 border">Part</th><th className="p-2 border">P/N</th><th className="p-2 border">Qty</th></tr></thead>
                                            <tbody>
                                                {selectedCMReport.spare_parts.map((p,i) => (
                                                    <tr key={i}><td className="p-2 border">{p.part_name}</td><td className="p-2 border">{p.part_no}</td><td className="p-2 border">{p.quantity}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Signatures */}
                                    <div className="grid grid-cols-3 gap-8 mt-12 text-center text-xs">
                                        <div className="border-t border-black pt-2">Technician Sign</div>
                                        <div className="border-t border-black pt-2">Supervisor Sign</div>
                                        <div className="border-t border-black pt-2">Dept Head Sign</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // 7. RFID VIEW (Updated with Zebra Status)
    // ============================================
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm w-fit">
                        <button onClick={() => setRfidTab('audit')} className={`px-6 py-2 rounded-lg font-bold text-sm ${rfidTab === 'audit' ? 'bg-brand text-white shadow' : 'text-gray-500'}`}>{t('rfid_audit')}</button>
                        <button onClick={() => setRfidTab('gate')} className={`px-6 py-2 rounded-lg font-bold text-sm ${rfidTab === 'gate' ? 'bg-brand text-white shadow' : 'text-gray-500'}`}>{t('rfid_gate_monitor')}</button>
                    </div>
                    {/* ZEBRA STATUS INDICATOR */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${zebraStatus === 'listening' || zebraStatus === 'processing' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                        <Bluetooth size={16} className={zebraStatus === 'listening' ? 'animate-pulse' : ''} />
                        <span className="text-xs font-bold">{zebraStatus === 'listening' || zebraStatus === 'processing' ? t('zebra_connected') : t('connect_zebra')}</span>
                    </div>
                </div>

                {rfidTab === 'audit' ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 mb-1">{t('start_audit')}</h3>
                                <p className="text-sm text-text-muted">Select a department to begin rapid inventory scan.</p>
                            </div>
                            <div className="flex gap-3">
                                <select className="input-modern w-48" value={selectedAuditDept} onChange={e => setSelectedAuditDept(e.target.value)}>
                                    <option value="">Select Dept...</option>
                                    {getLocations().map(l => <option key={l.location_id} value={l.department}>{l.department}</option>)}
                                </select>
                                <button onClick={startAudit} className="btn-primary" disabled={!!activeAudit}>{t('btn_record')}</button>
                            </div>
                        </div>
                        
                        {activeAudit && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                <div className="bg-white p-6 rounded-2xl border border-brand border-2 shadow-lg animate-pulse">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-xl text-brand">{t('audit_in_progress')}</h3>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-2xl font-bold">{activeAudit.total_scanned} / {activeAudit.total_expected}</span>
                                            {/* SIMULATION BUTTON FOR TESTING */}
                                            <button 
                                                onClick={handleSimulateAuditScan}
                                                className="bg-gray-100 hover:bg-gray-200 text-xs font-bold px-3 py-1 rounded-lg border border-gray-300"
                                            >
                                                {t('simulate_scan')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-4">
                                        <div className="bg-brand h-4 rounded-full transition-all duration-300" style={{ width: `${(activeAudit.total_scanned / activeAudit.total_expected) * 100}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* FOUND LIST */}
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 max-h-[400px] overflow-y-auto">
                                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2 sticky top-0 bg-green-50 pb-2 border-b border-green-200">
                                            <CheckCircle2 size={18} /> {t('scanned_assets')} ({activeAudit.found_assets.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {activeAudit.found_assets.map(id => {
                                                const asset = assets.find(a => a.asset_id === id);
                                                return (
                                                    <div key={id} className="bg-white p-3 rounded-lg border border-green-100 flex justify-between items-center shadow-sm">
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-800">{asset?.name || 'Unknown Asset'}</div>
                                                            <div className="text-xs text-gray-500">{asset?.model}</div>
                                                        </div>
                                                        <div className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">{id}</div>
                                                    </div>
                                                );
                                            })}
                                            {activeAudit.found_assets.length === 0 && <div className="text-center text-green-800/50 py-4 text-sm italic">Waiting for scans...</div>}
                                        </div>
                                    </div>

                                    {/* MISSING LIST */}
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 max-h-[400px] overflow-y-auto">
                                        <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2 sticky top-0 bg-red-50 pb-2 border-b border-red-200">
                                            <XCircle size={18} /> {t('missing_assets')} ({activeAudit.missing_assets.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {activeAudit.missing_assets.map(id => {
                                                const asset = assets.find(a => a.asset_id === id);
                                                return (
                                                    <div key={id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm opacity-80">
                                                        <div>
                                                            <div className="font-bold text-sm text-gray-800">{asset?.name || 'Unknown Asset'}</div>
                                                            <div className="text-xs text-gray-500">{asset?.model}</div>
                                                        </div>
                                                        <div className="text-xs font-mono bg-red-100 text-red-700 px-2 py-1 rounded">{id}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex gap-4 items-center">
                            <button onClick={() => setIsGateMonitoring(!isGateMonitoring)} className={`btn-primary ${isGateMonitoring ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                                {isGateMonitoring ? t('deactivate_gates') : t('activate_gates')}
                            </button>
                            <div className="flex gap-2">
                                {gateReaders.map(r => (
                                    <div key={r.id} className={`px-3 py-1 rounded-full text-xs font-bold border ${r.status === 'online' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                        {r.name}: {r.status}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-black rounded-2xl p-6 h-[400px] overflow-y-auto font-mono text-sm text-green-400 shadow-inner">
                            {gateLogs.length === 0 ? <div className="opacity-50 text-center mt-32">-- NO GATE ACTIVITY --</div> : 
                                gateLogs.map(log => (
                                    <div key={log.id} className="mb-2 border-b border-green-900/30 pb-1 flex justify-between">
                                        <span>[{new Date(log.timestamp).toLocaleTimeString()}] GATE-{log.gate_location_id}</span>
                                        <span>ASSET: {log.asset_id}</span>
                                        <span className={log.direction === 'ENTER' ? 'text-blue-400' : 'text-orange-400'}>{log.direction} &gt;&gt;</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default Asset List View
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                <h2 className="text-2xl font-bold text-gray-900">{t('tab_list')}</h2>
                <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('add_equipment')}</button>
            </div>
            <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-border">
                        <tr>
                            <th className="p-4">{t('asset_info')}</th>
                            <th className="p-4 hidden md:table-cell">{t('form_model')}</th>
                            <th className="p-4 hidden md:table-cell">{t('form_sn')}</th>
                            <th className="p-4">{t('location')}</th>
                            <th className="p-4">{t('status')}</th>
                            <th className="p-4">{t('risk_score')}</th>
                            <th className="p-4">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {assets.map(asset => (
                            <tr key={asset.asset_id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                                            {asset.image ? <img src={asset.image} className="w-full h-full object-cover"/> : <Box size={20} className="m-auto text-gray-400"/>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm">{asset.name}</div>
                                            <div className="text-[10px] text-text-muted">{asset.manufacturer}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-xs font-medium text-gray-600 hidden md:table-cell">{asset.model}</td>
                                <td className="p-4 text-xs font-mono text-gray-500 hidden md:table-cell">{asset.serial_number}</td>
                                <td className="p-4 text-xs font-medium text-text-muted">{getLocationName(asset.location_id)}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${asset.status === AssetStatus.RUNNING ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{asset.status}</span></td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${asset.risk_score > 70 ? 'bg-red-500' : asset.risk_score > 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{width: `${asset.risk_score}%`}}></div>
                                        </div>
                                        <span className="text-xs font-bold">{asset.risk_score}</span>
                                    </div>
                                </td>
                                <td className="p-4"><button className="text-brand hover:underline text-xs font-bold">Details</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
