
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog, RoleDefinition, Resource, Action } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, User as UserIcon, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan, Bluetooth, Wifi, MonitorCheck, CheckCircle2, Shield, Award, ThumbsDown, Briefcase, GraduationCap, Info, Table, XCircle, SearchX, Globe, Menu } from 'lucide-react';
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

    // Vendor Management State
    const [selectedVendorForDetails, setSelectedVendorForDetails] = useState<string | null>(null);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

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
    const activeAuditRef = useRef(activeAudit);
    useEffect(() => { activeAuditRef.current = activeAudit; }, [activeAudit]);

    const rfidTabRef = useRef(rfidTab);
    useEffect(() => { rfidTabRef.current = rfidTab; }, [rfidTab]);

    const assetsRef = useRef(assets);
    useEffect(() => { assetsRef.current = assets; }, [assets]);

    const handleRealScan = useCallback((scannedId: string) => {
        const currentAudit = activeAuditRef.current;
        if (!currentAudit) return;
        
        const cleanId = scannedId.trim();
        
        if (currentAudit.missing_assets.includes(cleanId)) {
            setActiveAudit(prev => prev ? {
                ...prev,
                total_scanned: prev.total_scanned + 1,
                missing_assets: prev.missing_assets.filter(id => id !== cleanId),
                found_assets: [...prev.found_assets, cleanId]
            } : null);
        }
    }, []);

    const handleGateScan = useCallback((scannedId: string, locationId: number) => {
        const cleanId = scannedId.trim();
        const currentAssets = assetsRef.current;
        const asset = currentAssets.find(a => a.asset_id === cleanId || a.nfc_tag_id === cleanId || a.rfid_tag_id === cleanId);
        
        if (asset) {
            setGateLogs(prev => [{
                id: Date.now(),
                asset_id: asset.asset_id,
                rfid_tag: cleanId,
                gate_location_id: locationId,
                direction: Math.random() > 0.5 ? 'ENTER' : 'EXIT',
                timestamp: new Date().toISOString()
            }, ...prev.slice(0, 49)]); 
        }
    }, []);

    const handleScannerInput = useCallback((scannedTag: string) => {
        if (rfidTabRef.current === 'audit') {
            handleRealScan(scannedTag);
        } else if (rfidTabRef.current === 'gate') {
            handleGateScan(scannedTag, 101);
        }
    }, [handleRealScan, handleGateScan]);

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

    // Dashboard Map Simulation
    useEffect(() => { 
        let interval: ReturnType<typeof setInterval>; 
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

    // Gate Monitoring Simulation
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isGateMonitoring && currentView === 'rfid' && rfidTab === 'gate') {
            setGateReaders(prev => prev.map(r => ({ ...r, status: 'online', lastPing: new Date().toLocaleTimeString() })));
            interval = setInterval(() => {
                const randomReader = gateReaders[Math.floor(Math.random() * gateReaders.length)];
                const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                const direction = Math.random() > 0.5 ? 'ENTER' : 'EXIT';
                const newLog: RfidGateLog = {
                    id: Date.now(),
                    asset_id: randomAsset.asset_id,
                    rfid_tag: randomAsset.nfc_tag_id || randomAsset.asset_id,
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
    const handleSimulateAuditScan = () => { 
        if(activeAudit && activeAudit.missing_assets.length > 0) { 
            const randomId = activeAudit.missing_assets[Math.floor(Math.random() * activeAudit.missing_assets.length)]; 
            handleRealScan(randomId); 
        } else if (activeAudit) {
            // If none missing, simulate finding an already found one just for UI feedback
            const randomFound = activeAudit.found_assets[0];
            if(randomFound) handleRealScan(randomFound);
        }
    };

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

    // ============================================
    // 1. DASHBOARD VIEW
    // ============================================
    if (currentView === 'dashboard') {
        const { mttrTrend, statusData } = analyticsData;
        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center gap-4">
                        <div className="p-3 bg-brand/10 text-brand rounded-xl"><Package size={24}/></div>
                        <div><p className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('total_assets')}</p><h3 className="text-2xl font-black text-gray-900">{assets.length}</h3></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center gap-4">
                        <div className="p-3 bg-warning/10 text-warning rounded-xl"><AlertTriangle size={24}/></div>
                        <div><p className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('open_tickets')}</p><h3 className="text-2xl font-black text-gray-900">{workOrders.filter(w=>w.status!=='Closed').length}</h3></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center gap-4">
                        <div className="p-3 bg-danger/10 text-danger rounded-xl"><AlertCircle size={24}/></div>
                        <div><p className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('inventory_alerts')}</p><h3 className="text-2xl font-black text-gray-900">{inventory.filter(i=>i.current_stock <= i.min_reorder_level).length}</h3></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Activity size={24}/></div>
                        <div><p className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('kpi_availability')}</p><h3 className="text-2xl font-black text-gray-900">98.2%</h3></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map Section */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-brand"/> {t('dept_map')}</h3>
                            <button onClick={() => setIsSimulationActive(!isSimulationActive)} className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${isSimulationActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                                {isSimulationActive ? 'Simulation ON' : 'Start Sim'}
                            </button>
                        </div>
                        <div className="flex-1 relative bg-gray-100 perspective-1000 overflow-hidden group">
                            <div className="absolute inset-0 transform rotate-x-60 scale-90 transition-transform duration-700 group-hover:rotate-x-45 group-hover:scale-100">
                                {departmentZones.map(zone => {
                                    const assetsInZone = getAssetsInZone(zone.name);
                                    const hasIssue = assetsInZone.some(a => a.status === AssetStatus.DOWN);
                                    const hasMaint = assetsInZone.some(a => a.status === AssetStatus.UNDER_MAINT);
                                    
                                    // Dynamic Color based on status
                                    let zoneColor = 'bg-emerald-100 border-emerald-300';
                                    if (hasIssue) zoneColor = 'bg-red-100 border-red-300 animate-pulse';
                                    else if (hasMaint) zoneColor = 'bg-amber-100 border-amber-300';

                                    return (
                                        <div 
                                            key={zone.id}
                                            onClick={() => setSelectedMapZone(zone.id)}
                                            className={`absolute ${zoneColor} border-2 opacity-90 rounded-lg shadow-xl cursor-pointer hover:translate-y-[-10px] transition-all duration-300 flex flex-col items-center justify-center`}
                                            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%` }}
                                        >
                                            <span className="font-black text-gray-700 text-xs uppercase tracking-wider">{zone.name}</span>
                                            <div className="flex gap-1 mt-1">
                                                {hasIssue && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                                {hasMaint && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                                                {!hasIssue && !hasMaint && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Slide-over Asset Panel */}
                            {selectedMapZone && (
                                <div className="absolute top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur shadow-2xl border-l border-border p-4 animate-in slide-in-from-right overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-lg">{selectedMapZone} Assets</h4>
                                        <button onClick={() => setSelectedMapZone(null)}><X size={18}/></button>
                                    </div>
                                    <div className="space-y-2">
                                        {getAssetsInZone(selectedMapZone).map(a => (
                                            <div key={a.asset_id} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm text-sm">
                                                <div className="font-bold">{a.name}</div>
                                                <div className="flex justify-between mt-1">
                                                    <span className="text-xs text-gray-500">{a.model}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats Column */}
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft h-[240px]">
                            <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">{t('chart_asset_status')}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft h-[240px]">
                            <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">{t('chart_mttr_trend')}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mttrTrend}>
                                    <defs>
                                        <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}}/>
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Area type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorMttr)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // 2. ASSETS VIEW
    // ============================================
    if (currentView === 'assets') {
        if (selectedAsset) {
            // Detail View
            const assetWOs = workOrders.filter(w => w.asset_id === selectedAsset.asset_id || w.asset_id === selectedAsset.nfc_tag_id);
            const calHistory = assetWOs.filter(w => w.type === WorkOrderType.CALIBRATION);
            const maintHistory = assetWOs.filter(w => w.type !== WorkOrderType.CALIBRATION);

            return (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-2">
                        <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
                    </button>
                    
                    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-gray-50 flex items-center gap-6">
                            <div className="w-24 h-24 bg-white rounded-xl border border-gray-200 p-1">
                                {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover rounded-lg"/> : <Box className="w-full h-full text-gray-300 p-4"/>}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900">{selectedAsset.name}</h1>
                                <p className="text-text-muted font-medium">{selectedAsset.model} • {selectedAsset.serial_number}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${selectedAsset.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedAsset.status}</span>
                                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-200 text-gray-700">{getLocationName(selectedAsset.location_id)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 border-b pb-2">{t('specifications')}</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="text-text-muted">{t('manufacturer')}</div><div className="font-medium text-right">{selectedAsset.manufacturer}</div>
                                    <div className="text-text-muted">{t('purchase_date')}</div><div className="font-medium text-right">{selectedAsset.purchase_date}</div>
                                    <div className="text-text-muted">{t('warranty_exp')}</div><div className="font-medium text-right">{selectedAsset.warranty_expiration}</div>
                                    <div className="text-text-muted">{t('op_hours')}</div><div className="font-medium text-right">{selectedAsset.operating_hours} hrs</div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-900 border-b pb-2">{t('maintenance_history')}</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {maintHistory.length > 0 ? maintHistory.map(wo => {
                                        const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                        return (
                                            <div key={wo.wo_id} className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex justify-between font-bold text-gray-800">
                                                    <span>{wo.type} #{wo.wo_id}</span>
                                                    <span className="text-xs text-gray-500">{new Date(wo.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-gray-600 text-xs mt-1 truncate">{wo.description}</p>
                                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                                    <UserIcon size={12}/> {tech?.name || 'Unknown Tech'}
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="text-center text-gray-400 py-4 italic">No maintenance history</div>}
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
                                <tr key={asset.asset_id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedAsset(asset)}>
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

                {/* Add Asset Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4">{t('modal_add_title')}</h3>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder={t('form_name')} className="input-modern" value={newAssetForm.name} onChange={e=>setNewAssetForm({...newAssetForm, name: e.target.value})} required/>
                                    <input placeholder={t('form_model')} className="input-modern" value={newAssetForm.model} onChange={e=>setNewAssetForm({...newAssetForm, model: e.target.value})} required/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder={t('form_sn')} className="input-modern" value={newAssetForm.asset_id} onChange={e=>setNewAssetForm({...newAssetForm, asset_id: e.target.value})} required/>
                                    <select className="input-modern" value={newAssetForm.location_id} onChange={e=>setNewAssetForm({...newAssetForm, location_id: parseInt(e.target.value)})}>
                                        {getLocations().map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('form_image')}</label>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="input-modern p-2"/>
                                    {newAssetForm.image && <img src={newAssetForm.image} className="mt-2 h-20 w-20 object-cover rounded-lg border"/>}
                                </div>
                                <div className="flex gap-2 justify-end pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary">Cancel</button>
                                    <button type="submit" className="btn-primary">{t('btn_save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 3. MAINTENANCE VIEW
    // ============================================
    if (currentView === 'maintenance') {
        // Filter Logic
        const filteredWOs = workOrders.filter(wo => {
            if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
            if (maintenanceFilterType !== 'all' && wo.type !== maintenanceFilterType) return false;
            return true;
        });

        // Kanban Columns
        const columns = {
            'Open': filteredWOs.filter(w => w.status === 'Open'),
            'Assigned': filteredWOs.filter(w => w.status === 'Assigned'),
            'In Progress': filteredWOs.filter(w => w.status === 'In Progress'),
            'Review': filteredWOs.filter(w => w.status === 'Awaiting Approval' || w.status === 'Manager Approved' || w.status === 'Awaiting Final Acceptance'),
            'Closed': filteredWOs.filter(w => w.status === 'Closed')
        };

        return (
            <div className="space-y-6 animate-in fade-in h-full flex flex-col">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-900">{t('wo_title')}</h2>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setMaintenanceViewMode('kanban')} className={`p-1.5 rounded ${maintenanceViewMode === 'kanban' ? 'bg-white shadow' : 'text-gray-500'}`}><LayoutGrid size={18}/></button>
                            <button onClick={() => setMaintenanceViewMode('list')} className={`p-1.5 rounded ${maintenanceViewMode === 'list' ? 'bg-white shadow' : 'text-gray-500'}`}><List size={18}/></button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <select className="input-modern py-2 w-auto" value={maintenanceFilterPriority} onChange={(e) => setMaintenanceFilterPriority(e.target.value)}>
                            <option value="all">{t('filter_all')} Priority</option>
                            <option value={Priority.CRITICAL}>{Priority.CRITICAL}</option>
                            <option value={Priority.HIGH}>{Priority.HIGH}</option>
                        </select>
                        <button onClick={() => setIsCreateWOModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('create_wo')}</button>
                    </div>
                </div>

                {maintenanceViewMode === 'kanban' ? (
                    <div className="flex-1 overflow-x-auto pb-4">
                        <div className="flex gap-6 min-w-[1200px] h-full">
                            {Object.entries(columns).map(([colName, colWOs]) => (
                                <div key={colName} className="flex-1 bg-gray-50/50 rounded-xl border border-border flex flex-col min-w-[280px]">
                                    <div className="p-3 border-b border-border bg-white rounded-t-xl font-bold text-sm flex justify-between">
                                        <span>{colName}</span>
                                        <span className="bg-gray-100 px-2 rounded-full text-xs flex items-center">{colWOs.length}</span>
                                    </div>
                                    <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                        {colWOs.map(wo => {
                                            const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                                            const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                            return (
                                                <div key={wo.wo_id} className="bg-white p-3 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group" onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }}>
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${wo.priority === Priority.CRITICAL ? 'bg-red-500' : wo.priority === Priority.HIGH ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                                    <div className="pl-2">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-bold text-xs text-gray-500">#{wo.wo_id}</span>
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{wo.type}</span>
                                                        </div>
                                                        <div className="font-bold text-gray-900 text-sm mb-1">{asset?.name || 'Unknown Asset'}</div>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{wo.description}</p>
                                                        
                                                        {wo.status === 'Open' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelectedWOForAssignment(wo); handleSmartAssign(); setIsAssignModalOpen(true); }}
                                                                className="w-full py-1.5 mt-2 bg-brand/10 text-brand hover:bg-brand hover:text-white rounded-lg text-xs font-bold transition-colors"
                                                            >
                                                                {t('assign_technician')}
                                                            </button>
                                                        )}
                                                        {tech && (
                                                            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 bg-gray-50 p-1 rounded">
                                                                <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">{tech.name[0]}</div>
                                                                <span className="truncate">{tech.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                <tr>
                                    <th className="p-4">{t('wo_id')}</th>
                                    <th className="p-4">{t('asset_info')}</th>
                                    <th className="p-4">{t('role_desc')}</th>
                                    <th className="p-4">{t('priority')}</th>
                                    <th className="p-4">{t('status')}</th>
                                    <th className="p-4">{t('assigned')}</th>
                                    <th className="p-4">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredWOs.map(wo => {
                                    const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                                    const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                    return (
                                        <tr key={wo.wo_id} className="hover:bg-gray-50 text-sm">
                                            <td className="p-4 font-mono text-gray-500">#{wo.wo_id}</td>
                                            <td className="p-4 font-bold">{asset?.name}</td>
                                            <td className="p-4 max-w-xs truncate text-gray-600">{wo.description}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{wo.priority}</span></td>
                                            <td className="p-4"><span className="px-2 py-1 rounded bg-gray-100 text-xs font-bold">{wo.status}</span></td>
                                            <td className="p-4">{tech ? tech.name : <span className="text-gray-400 italic">Unassigned</span>}</td>
                                            <td className="p-4">
                                                {wo.status === 'Open' ? (
                                                    <button onClick={() => { setSelectedWOForAssignment(wo); handleSmartAssign(); setIsAssignModalOpen(true); }} className="text-brand font-bold text-xs hover:underline">{t('assign')}</button>
                                                ) : (
                                                    <button onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }} className="text-gray-600 font-bold text-xs hover:text-gray-900">Details</button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modals for Maintenance */}
                {isCreateWOModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4">{t('create_wo')}</h3>
                            <form onSubmit={handleCreateWOSubmit} className="space-y-4">
                                <select className="input-modern" value={newWOForm.assetId} onChange={e => setNewWOForm({...newWOForm, assetId: e.target.value})} required>
                                    <option value="">{t('wo_asset')}</option>
                                    {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.name} ({a.asset_id})</option>)}
                                </select>
                                <select className="input-modern" value={newWOForm.priority} onChange={e => setNewWOForm({...newWOForm, priority: e.target.value as Priority})}>
                                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <textarea className="input-modern h-32" placeholder={t('wo_description')} value={newWOForm.description} onChange={e => setNewWOForm({...newWOForm, description: e.target.value})} required/>
                                <div className="flex gap-2 justify-end pt-4">
                                    <button type="button" onClick={() => setIsCreateWOModalOpen(false)} className="btn-secondary">{t('btn_cancel')}</button>
                                    <button type="submit" className="btn-primary">{t('btn_dispatch')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isAssignModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4">{t('assign_technician')}</h3>
                            
                            {/* Smart Recommendations */}
                            {recommendedTechs.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    <div className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1"><Sparkles size={12}/> AI Recommendations</div>
                                    {recommendedTechs.slice(0, 2).map((rec, i) => (
                                        <div 
                                            key={rec.user.user_id} 
                                            onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${selectedTechForAssignment === rec.user.user_id.toString() ? 'bg-brand/10 border-brand' : 'bg-gray-50 border-gray-100 hover:border-brand/50'}`}
                                        >
                                            <div>
                                                <div className="font-bold text-sm text-gray-900">{rec.user.name}</div>
                                                <div className="text-xs text-brand font-medium">{rec.reason}</div>
                                            </div>
                                            <div className="text-xs font-bold bg-white px-2 py-1 rounded border shadow-sm">Score: {rec.score}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={handleAssignSubmit} className="space-y-4">
                                <select className="input-modern" value={selectedTechForAssignment} onChange={e => setSelectedTechForAssignment(e.target.value)} required>
                                    <option value="">{t('select_tech')}</option>
                                    {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(u => (
                                        <option key={u.user_id} value={u.user_id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                                <div className="flex gap-2 justify-end pt-4">
                                    <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn-secondary">{t('btn_cancel')}</button>
                                    <button type="submit" className="btn-primary">{t('btn_assign_confirm')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isWorkOrderDetailsModalOpen && selectedWorkOrderForDetails && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-6 border-b pb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Work Order #{selectedWorkOrderForDetails.wo_id}</h3>
                                    <span className="text-sm text-gray-500">{new Date(selectedWorkOrderForDetails.created_at).toLocaleString()}</span>
                                </div>
                                <button onClick={() => setIsWorkOrderDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Asset Details</label>
                                    <div className="font-bold text-gray-900 mt-1">{assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.name}</div>
                                    <div className="text-xs text-text-muted">
                                        Model: {assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.model}<br/>
                                        S/N: {assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.serial_number}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Assigned Technician</label>
                                    <div className="font-bold text-gray-900 mt-1 flex items-center gap-2">
                                        <UserIcon size={14} className="text-brand"/>
                                        {users.find(u => u.user_id === selectedWorkOrderForDetails.assigned_to_id)?.name || 'Unassigned'}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Fault Description</label>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm mt-1">{selectedWorkOrderForDetails.description}</div>
                                </div>
                            </div>

                            {/* Parts Used Section */}
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Box size={16}/> Spare Parts Consumed</h4>
                                {selectedWorkOrderForDetails.parts_used && selectedWorkOrderForDetails.parts_used.length > 0 ? (
                                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                        <thead className="bg-gray-50">
                                            <tr><th className="p-2 text-left">Part Name</th><th className="p-2 text-right">Cost</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Total</th></tr>
                                        </thead>
                                        <tbody>
                                            {selectedWorkOrderForDetails.parts_used.map((part, idx) => {
                                                const pDetails = inventory.find(i => i.part_id === part.part_id);
                                                const cost = pDetails?.cost || 0;
                                                return (
                                                    <tr key={idx} className="border-t border-gray-100">
                                                        <td className="p-2 font-medium">{pDetails?.part_name || `Part #${part.part_id}`}</td>
                                                        <td className="p-2 text-right text-gray-500">${cost}</td>
                                                        <td className="p-2 text-center font-bold bg-gray-50">{part.quantity}</td>
                                                        <td className="p-2 text-right font-mono">${cost * part.quantity}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                                            <tr>
                                                <td colSpan={3} className="p-2 text-right">Total Parts Cost:</td>
                                                <td className="p-2 text-right font-mono">
                                                    ${selectedWorkOrderForDetails.parts_used.reduce((acc, p) => {
                                                        const cost = inventory.find(i => i.part_id === p.part_id)?.cost || 0;
                                                        return acc + (cost * p.quantity);
                                                    }, 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                ) : (
                                    <div className="text-gray-400 text-sm italic p-4 border border-dashed rounded-lg text-center bg-gray-50">
                                        No spare parts recorded for this job.
                                    </div>
                                )}
                            </div>

                            {/* Approval Workflow */}
                            {['Awaiting Approval', 'Manager Approved', 'Awaiting Final Acceptance'].includes(selectedWorkOrderForDetails.status) && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-in slide-in-from-bottom-2">
                                    <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2"><FileSignature size={18}/> {t('approval_workflow')}</h4>
                                    <div className="flex gap-2 mt-4">
                                        {(selectedWorkOrderForDetails.status === 'Awaiting Approval' && currentUser.role === UserRole.ADMIN) && (
                                            <button 
                                                onClick={() => { api.submitManagerApproval(selectedWorkOrderForDetails.wo_id, currentUser.user_id, "DigitalSig"); setIsWorkOrderDetailsModalOpen(false); refreshData(); triggerNotification(); }}
                                                className="btn-primary w-full bg-amber-600 hover:bg-amber-700"
                                            >
                                                {t('manager_review')} (Approve)
                                            </button>
                                        )}
                                        {(selectedWorkOrderForDetails.status === 'Manager Approved' && (currentUser.role === UserRole.SUPERVISOR || currentUser.role === UserRole.ADMIN)) && (
                                            <button 
                                                onClick={() => { api.submitSupervisorApproval(selectedWorkOrderForDetails.wo_id, currentUser.user_id, "DigitalSig"); setIsWorkOrderDetailsModalOpen(false); refreshData(); triggerNotification(); }}
                                                className="btn-primary w-full bg-green-600 hover:bg-green-700"
                                            >
                                                {t('supervisor_review')} (Approve)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 4. INVENTORY VIEW
    // ============================================
    if (currentView === 'inventory') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900">{t('tab_stock')}</h3>
                                <p className="text-text-muted text-sm">Real-time level monitoring</p>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={24}/></div>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900">{inventory.reduce((acc, i) => acc + i.current_stock, 0)} <span className="text-sm font-medium text-gray-400">units</span></h2>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900">{t('tab_alerts')}</h3>
                                <p className="text-text-muted text-sm">Items below min level</p>
                            </div>
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24}/></div>
                        </div>
                        <h2 className="text-4xl font-black text-danger">{inventory.filter(i => i.current_stock <= i.min_reorder_level).length} <span className="text-sm font-medium text-gray-400">items</span></h2>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                            <tr>
                                <th className="p-4">{t('part_name')}</th>
                                <th className="p-4">{t('stock_level')}</th>
                                <th className="p-4">{t('unit_cost')}</th>
                                <th className="p-4 text-center">{t('status')}</th>
                                <th className="p-4 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {inventory.map(part => {
                                const isLow = part.current_stock <= part.min_reorder_level;
                                return (
                                    <tr key={part.part_id} className="hover:bg-gray-50 text-sm">
                                        <td className="p-4 font-bold text-gray-900">{part.part_name}</td>
                                        <td className="p-4 font-mono">{part.current_stock} / {part.min_reorder_level}</td>
                                        <td className="p-4 text-gray-600">${part.cost}</td>
                                        <td className="p-4 text-center">
                                            {isLow ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Low Stock</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">OK</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => initiateRestock(part)}
                                                className="text-brand hover:bg-brand/10 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                            >
                                                {t('btn_restock')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Restock Modal */}
                {restockModalOpen && selectedPartForRestock && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-2">{t('restock_modal_title')}</h3>
                            <p className="text-sm text-gray-500 mb-6">Adding inventory for <strong>{selectedPartForRestock.part_name}</strong></p>
                            
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('restock_qty')}</label>
                                <input 
                                    type="number" 
                                    className="input-modern text-lg font-mono" 
                                    value={restockAmount} 
                                    onChange={(e) => setRestockAmount(e.target.value)} 
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setRestockModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={handleRestockPreCheck} className="flex-1 btn-primary">{t('restock_btn')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirmation for Large Restock */}
                {confirmRestockOpen && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95 border-2 border-red-100">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto"><AlertTriangle size={24}/></div>
                            <h3 className="text-xl font-bold text-center mb-2">{t('confirm_large_restock_title')}</h3>
                            <p className="text-center text-gray-600 mb-6 text-sm">
                                {t('confirm_large_restock_msg').replace('{qty}', restockAmount)}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmRestockOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={submitRestock} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">{t('btn_confirm')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 5. CALIBRATION VIEW
    // ============================================
    if (currentView === 'calibration') {
        const complianceRate = Math.round((assets.filter(a => !a.next_calibration_date || new Date(a.next_calibration_date) > new Date()).length / assets.length) * 100);
        
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex items-center gap-4">
                        <div className="p-4 bg-purple-100 text-purple-600 rounded-full"><Award size={32}/></div>
                        <div>
                            <h3 className="text-3xl font-black text-gray-900">{complianceRate}%</h3>
                            <p className="text-sm text-text-muted font-bold uppercase">{t('cal_compliant')}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                        <h4 className="font-bold text-gray-700 mb-2">{t('cal_overdue')}</h4>
                        <div className="text-2xl font-black text-red-500">{assets.filter(a => a.next_calibration_date && new Date(a.next_calibration_date) < new Date()).length} <span className="text-sm text-gray-400 font-medium">Assets</span></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                        <h4 className="font-bold text-gray-700 mb-2">{t('cal_due_soon')}</h4>
                        <div className="text-2xl font-black text-amber-500">{assets.filter(a => {
                            if (!a.next_calibration_date) return false;
                            const due = new Date(a.next_calibration_date);
                            const now = new Date();
                            const diff = due.getTime() - now.getTime();
                            const days = diff / (1000 * 3600 * 24);
                            return days > 0 && days < 30;
                        }).length} <span className="text-sm text-gray-400 font-medium">Assets</span></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                            <tr>
                                <th className="p-4">{t('asset_info')}</th>
                                <th className="p-4">{t('last_cal')}</th>
                                <th className="p-4">{t('next_due')}</th>
                                <th className="p-4 text-center">{t('status')}</th>
                                <th className="p-4 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {assets.map(asset => {
                                const isOverdue = asset.next_calibration_date && new Date(asset.next_calibration_date) < new Date();
                                const isDueSoon = asset.next_calibration_date && new Date(asset.next_calibration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && !isOverdue;
                                
                                return (
                                    <tr key={asset.asset_id} className="hover:bg-gray-50 text-sm">
                                        <td className="p-4 font-bold">{asset.name} <span className="text-gray-400 font-normal text-xs ml-1">({asset.asset_id})</span></td>
                                        <td className="p-4 text-gray-600">{asset.last_calibration_date}</td>
                                        <td className={`p-4 font-mono font-bold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-green-600'}`}>
                                            {asset.next_calibration_date}
                                        </td>
                                        <td className="p-4 text-center">
                                            {isOverdue ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">OVERDUE</span> : 
                                             isDueSoon ? <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">Due Soon</span> :
                                             <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Compliant</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => { setAssetToCalibrate(asset); setUpdateCalibrationModalOpen(true); }}
                                                className="text-brand hover:underline font-bold text-xs"
                                            >
                                                {t('btn_update_cal')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Update Calibration Modal */}
                {updateCalibrationModalOpen && assetToCalibrate && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4">{t('update_cal_title')}</h3>
                            <p className="text-sm text-gray-600 mb-6">Updating records for <strong>{assetToCalibrate.name}</strong></p>
                            
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t('new_cal_date')}</label>
                                <input type="date" className="input-modern" value={newCalibrationDate} onChange={e => setNewCalibrationDate(e.target.value)} />
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setUpdateCalibrationModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={handleUpdateCalibration} className="flex-1 btn-primary">{t('btn_record')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 6. ANALYSIS VIEW (Reports, KB, Analytics)
    // ============================================
    if (currentView === 'analysis') {
        const { financialAnalysis, topDepts, lowRepDepts, vendorStats } = analyticsData;
        const subTabs = [
            { id: 'tab_analytics', label: t('tab_analytics'), icon: BarChart2 },
            { id: 'tab_financial', label: t('tab_financial'), icon: DollarSign },
            { id: 'tab_gen_report', label: t('tab_gen_report'), icon: Printer },
            { id: 'tab_kb', label: t('tab_kb'), icon: Library },
            { id: 'tab_vendor', label: t('tab_vendor'), icon: Briefcase },
            { id: 'tab_training', label: t('tab_training'), icon: GraduationCap },
        ];

        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Sub Navigation */}
                <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm overflow-x-auto mb-6">
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>

                {/* --- 6.1 STRATEGIC ANALYTICS --- */}
                {activeTab === 'tab_analytics' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[350px]">
                                <h3 className="font-bold text-gray-900 mb-4">{t('reputation_score')}</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topDepts} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                        <XAxis type="number" hide/>
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}}/>
                                        <Tooltip cursor={{fill: 'transparent'}}/>
                                        <Bar dataKey="score" fill="#10B981" barSize={20} radius={[0, 4, 4, 0]} name="Score" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[350px]">
                                <h3 className="font-bold text-gray-900 mb-4 text-danger">{t('high_misuse_depts')}</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={lowRepDepts} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                        <XAxis type="number" hide/>
                                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}}/>
                                        <Tooltip cursor={{fill: 'transparent'}}/>
                                        <Bar dataKey="score" fill="#EF4444" barSize={20} radius={[0, 4, 4, 0]} name="Score" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 6.2 FINANCIAL ANALYSIS --- */}
                {activeTab === 'tab_financial' && (
                    <div className="space-y-6">
                        {/* CHART: TCO COMPARISON */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[350px] mb-6">
                            <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={20}/> Cost vs. Value (Top Expensive Assets)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financialAnalysis.slice(0, 7)} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60}/>
                                    <YAxis tickFormatter={(val) => `$${val/1000}k`}/>
                                    <Tooltip formatter={(val: number) => `$${val.toLocaleString()}`} />
                                    <Legend />
                                    <Bar dataKey="purchase" name="Purchase Price" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="maintCost" name="Maintenance Cost" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <div className="p-6 border-b border-border">
                                <h3 className="font-bold text-xl text-gray-900">{t('asset_health')} (Detailed Report)</h3>
                                <p className="text-text-muted text-sm">Assets where maintenance cost exceeds 40% of purchase price.</p>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">{t('asset_info')}</th>
                                        <th className="p-4 text-right">{t('purchase_price')}</th>
                                        <th className="p-4 text-right">{t('maint_cost')}</th>
                                        <th className="p-4 text-right">{t('cost_ratio')}</th>
                                        <th className="p-4 text-center">{t('recommendation')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {financialAnalysis.slice(0, 10).map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50 text-sm">
                                            <td className="p-4 font-bold">{a.name} <span className="text-gray-400 font-normal">({a.model})</span></td>
                                            <td className="p-4 text-right font-mono">${a.purchase.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono">${a.maintCost.toLocaleString()}</td>
                                            <td className={`p-4 text-right font-bold ${a.ratio > 0.4 ? 'text-red-500' : 'text-green-500'}`}>{(a.ratio * 100).toFixed(1)}%</td>
                                            <td className="p-4 text-center">
                                                {a.ratio > 0.4 ? 
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">{t('replace')}</span> : 
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">{t('repair')}</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- 6.3 REPORT GENERATOR --- */}
                {activeTab === 'tab_gen_report' && (
                    <div className="bg-white rounded-2xl border border-border shadow-soft p-8 max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Printer size={32}/></div>
                            <h2 className="text-2xl font-bold text-gray-900">{t('gen_report')}</h2>
                            <p className="text-gray-500">Generate PDF reports for compliance and auditing.</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('report_type')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setReportType('CM')} className={`p-4 rounded-xl border-2 text-left transition-all ${reportType === 'CM' ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/50'}`}>
                                        <span className="font-bold block text-gray-900">{t('cm_report')}</span>
                                        <span className="text-xs text-gray-500">Breakdown & Repair History</span>
                                    </button>
                                    <button onClick={() => setReportType('PPM')} className={`p-4 rounded-xl border-2 text-left transition-all ${reportType === 'PPM' ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/50'}`}>
                                        <span className="font-bold block text-gray-900">{t('ppm_report')}</span>
                                        <span className="text-xs text-gray-500">Scheduled Maintenance Logs</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Job Order No / Asset ID</label>
                                    <input 
                                        className="input-modern" 
                                        placeholder="e.g. 2236" 
                                        value={jobOrderSearchId} 
                                        onChange={(e) => setJobOrderSearchId(e.target.value)}
                                    />
                                </div>
                                <button onClick={handleFindJobReport} className="btn-primary">
                                    <Search size={18}/> Find
                                </button>
                            </div>

                            {selectedCMReport && (
                                <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-xl flex justify-between items-center animate-in fade-in">
                                    <div>
                                        <div className="font-bold text-green-800">Report Ready: #{selectedCMReport.job_order_no}</div>
                                        <div className="text-xs text-green-700">{selectedCMReport.asset.name}</div>
                                    </div>
                                    <button className="text-sm font-bold text-green-700 hover:underline flex items-center gap-1">
                                        <Download size={16}/> {t('download_pdf')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- 6.4 KNOWLEDGE BASE (AI) --- */}
                {activeTab === 'tab_kb' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                        {/* Search & List */}
                        <div className="lg:col-span-1 flex flex-col bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <div className="p-4 border-b border-border bg-gray-50">
                                <h3 className="font-bold text-gray-900 mb-2">{t('kb_library')}</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
                                    <input 
                                        className="input-modern pl-9 py-2 text-sm" 
                                        placeholder="Search manuals..." 
                                        value={kbSearch} 
                                        onChange={(e) => setKbSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {filteredKbDocs.map(doc => (
                                    <div key={doc.id} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer group border border-transparent hover:border-gray-100 transition-colors">
                                        <div className="font-bold text-sm text-gray-800 line-clamp-1 group-hover:text-brand">{doc.title}</div>
                                        <div className="flex justify-between mt-1 text-xs text-text-muted">
                                            <span>{doc.category}</span>
                                            <span>{doc.fileSize}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Smart Search */}
                        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <div className="p-6 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-lg mb-4">
                                    <Sparkles size={20} className="text-indigo-600"/> {t('kb_ai_search')}
                                </h3>
                                <div className="flex gap-2">
                                    <input 
                                        className="input-modern border-indigo-200 focus:ring-indigo-100" 
                                        placeholder={t('ai_search_placeholder')}
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleAiSearch} 
                                        disabled={isAiSearching}
                                        className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {isAiSearching ? <RefreshCw size={18} className="animate-spin"/> : <Search size={18}/>}
                                        {t('btn_analyze')}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                                {aiResult ? (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                        <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm">
                                            <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Info size={18}/> {t('ai_explanation')}</h4>
                                            <p className="text-gray-700 leading-relaxed">{aiResult.explanation}</p>
                                        </div>
                                        
                                        <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm">
                                            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><CheckCircle2 size={18}/> {t('ai_solution')}</h4>
                                            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResult.solution}</div>
                                        </div>

                                        <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                                            <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2"><Book size={18}/> {t('ai_ref_docs')}</h4>
                                            <div className="space-y-2">
                                                {aiResult.relevantDocs.map((doc, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-indigo-100 hover:shadow-md transition-shadow cursor-pointer">
                                                        <FileText size={18} className="text-indigo-500"/>
                                                        <span className="text-sm font-medium text-gray-800">{doc}</span>
                                                        <ArrowRight size={14} className="ml-auto text-gray-400"/>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                        <BrainCircuit size={64} className="mb-4 text-indigo-200"/>
                                        <p>Enter a fault code to get AI-powered diagnostics</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 6.5 VENDOR RATING --- */}
                {activeTab === 'tab_vendor' && (
                    <div className="space-y-6">
                        {/* CHART: VENDOR PERFORMANCE */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[320px] mb-6">
                            <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2"><Star size={20} className="text-amber-500"/> Vendor Performance Landscape</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{top: 20, right: 30, bottom: 10, left: 10}}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="score" name="Total Score" domain={[50, 100]} label={{ value: 'Total Score', position: 'bottom', offset: 0 }} />
                                    <YAxis type="number" dataKey="woCount" name="Issues" label={{ value: 'Reported Issues', angle: -90, position: 'left' }} />
                                    <ZAxis type="number" dataKey="assetCount" range={[50, 400]} name="Volume" />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Scatter name="Vendors" data={vendorStats} fill="#2563EB">
                                        {vendorStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.score > 85 ? '#10B981' : entry.score > 70 ? '#F59E0B' : '#EF4444'} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">{t('manufacturer')}</th>
                                        <th className="p-4 text-center">{t('total_units')}</th>
                                        <th className="p-4 text-center">{t('failure_rate')}</th>
                                        <th className="p-4 text-center">{t('support_speed')}</th>
                                        <th className="p-4 text-center">{t('vendor_score')}</th>
                                        <th className="p-4 text-right">{t('recommendation')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {vendorStats.map((v, i) => (
                                        <tr key={i} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedVendorForDetails(v.name); setIsVendorModalOpen(true); }}>
                                            <td className="p-4 font-bold text-gray-900">{v.name}</td>
                                            <td className="p-4 text-center font-mono">{v.assetCount}</td>
                                            <td className="p-4 text-center font-mono">{(v.woCount / (v.assetCount || 1) * 100).toFixed(1)}%</td>
                                            <td className="p-4 text-center font-mono">{v.avgMTTR}h</td>
                                            <td className="p-4 text-center">
                                                <div className="inline-flex items-center gap-1 font-bold">
                                                    <span className={v.score >= 80 ? 'text-green-600' : v.score >= 60 ? 'text-amber-600' : 'text-red-600'}>{v.score}</span>
                                                    <span className="text-gray-400 text-xs">/100</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {v.score >= 80 ? 
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1 w-fit ml-auto"><ThumbsUp size={12}/> {t('rec_buy')}</span> :
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold flex items-center gap-1 w-fit ml-auto"><ThumbsDown size={12}/> {t('rec_avoid')}</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* VENDOR DETAIL MODAL */}
                        {isVendorModalOpen && selectedVendorForDetails && (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                                        <h3 className="text-xl font-bold text-gray-900">{selectedVendorForDetails} - Asset Portfolio</h3>
                                        <button onClick={() => setIsVendorModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                                    </div>
                                    <div className="space-y-4">
                                        {assets.filter(a => (a.manufacturer || 'Generic') === selectedVendorForDetails).map(asset => {
                                            const wos = workOrders.filter(w => w.asset_id === asset.asset_id || w.asset_id === asset.nfc_tag_id);
                                            const recentIssues = wos.filter(w => w.type === 'Corrective').length;
                                            return (
                                                <div key={asset.asset_id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{asset.name}</div>
                                                        <div className="text-xs text-gray-500">{asset.model} • {asset.serial_number}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-gray-500">Issues (6mo)</div>
                                                        <div className={`font-bold ${recentIssues > 2 ? 'text-red-600' : 'text-green-600'}`}>{recentIssues}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {assets.filter(a => (a.manufacturer || 'Generic') === selectedVendorForDetails).length === 0 && (
                                            <div className="text-center text-gray-400 py-8">No assets found for this vendor.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 6.6 TRAINING DASHBOARD --- */}
                {activeTab === 'tab_training' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex items-center gap-4">
                            <GraduationCap size={32} className="text-brand"/>
                            <div>
                                <h3 className="font-bold text-lg">{t('training_dashboard')}</h3>
                                <p className="text-sm text-text-muted">Targeted education based on actual misuse data.</p>
                            </div>
                            <div className="ml-auto">
                                <select className="input-modern w-64" value={selectedTrainingDept} onChange={e => setSelectedTrainingDept(e.target.value)}>
                                    <option value="">{t('select_dept_training')}</option>
                                    {getLocations().map(l => l.department).filter((v, i, a) => a.indexOf(v) === i).map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedTrainingDept && trainingData && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2">
                                <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                    <h4 className="font-bold text-gray-900 mb-4">{t('top_user_errors')}</h4>
                                    <div className="space-y-4">
                                        {trainingData.topErrors.map((err, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                                <span className="font-medium text-red-900">{err.error}</span>
                                                <span className="font-bold bg-white px-2 py-1 rounded text-red-600 shadow-sm">{err.count} incidents</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-4">{t('educator_recommendation')}</h4>
                                        {trainingData.needsSession ? (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                                                <div className="flex items-center gap-2 font-bold text-amber-800 mb-2"><AlertTriangle size={18}/> {t('session_needed')}</div>
                                                <p className="text-sm text-amber-900">{t('schedule_session_msg')}</p>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
                                                <div className="flex items-center gap-2 font-bold text-green-800 mb-2"><CheckCircle2 size={18}/> Great Performance</div>
                                                <p className="text-sm text-green-900">{t('no_major_errors')}</p>
                                            </div>
                                        )}
                                    </div>
                                    <button className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700">
                                        <Printer size={18}/> {t('print_flyer')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 7. USER MANAGEMENT
    // ============================================
    if (currentView === 'users') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm w-fit mb-6">
                    <button onClick={() => setUserMgmtTab('users')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${userMgmtTab === 'users' ? 'bg-brand text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>{t('res_users')}</button>
                    <button onClick={() => setUserMgmtTab('roles')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${userMgmtTab === 'roles' ? 'bg-brand text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>{t('tab_roles')}</button>
                </div>

                {userMgmtTab === 'users' ? (
                    <div className="space-y-6">
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
                                        <th className="p-4 text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {users.map(u => (
                                        <tr key={u.user_id} className="hover:bg-gray-50 text-sm">
                                            <td className="p-4 font-bold">{u.name}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{u.role}</span></td>
                                            <td className="p-4 text-gray-600">{u.department}</td>
                                            <td className="p-4 font-mono text-gray-500">{u.email}</td>
                                            <td className="p-4 text-right"><button className="text-brand font-bold text-xs hover:underline">Edit</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                            <h2 className="text-2xl font-bold text-gray-900">{t('manage_roles')}</h2>
                            <button onClick={() => handleOpenRoleEditor()} className="btn-primary py-2 px-4 text-sm"><Plus size={16}/> {t('create_role')}</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {roles.map(role => (
                                <div key={role.id} className="bg-white p-5 rounded-2xl border border-border shadow-soft hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                                        {role.is_system_role && <span title="System Role"><Lock size={16} className="text-gray-400" /></span>}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{role.description}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenRoleEditor(role)} className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-700 border border-gray-200">Edit Permissions</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4">{t('modal_add_user')}</h3>
                            <form onSubmit={handleAddUserSubmit} className="space-y-4">
                                <input placeholder={t('user_name')} className="input-modern" value={newUserForm.name} onChange={e=>setNewUserForm({...newUserForm, name: e.target.value})} required/>
                                <input placeholder={t('user_email')} className="input-modern" type="email" value={newUserForm.email} onChange={e=>setNewUserForm({...newUserForm, email: e.target.value})} required/>
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="input-modern" value={newUserForm.role} onChange={e=>setNewUserForm({...newUserForm, role: e.target.value})}>
                                        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                    </select>
                                    <select className="input-modern" value={newUserForm.department} onChange={e=>setNewUserForm({...newUserForm, department: e.target.value})}>
                                        <option value="">Dept...</option>
                                        {getLocations().map(l => l.department).filter((v,i,a)=>a.indexOf(v)===i).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <input placeholder={t('user_password')} className="input-modern" type="password" value={newUserForm.password} onChange={e=>setNewUserForm({...newUserForm, password: e.target.value})} required/>
                                <div className="flex gap-2 justify-end pt-4">
                                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="btn-secondary">{t('btn_cancel')}</button>
                                    <button type="submit" className="btn-primary">{t('btn_create_user')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Role Editor Modal */}
                {isRoleEditorOpen && editingRole && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-3xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">{t('manage_roles')} - {editingRole.name || 'New Role'}</h3>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <input 
                                    className="input-modern" 
                                    placeholder={t('role_name')} 
                                    value={editingRole.name} 
                                    onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                                    disabled={editingRole.is_system_role}
                                />
                                <input 
                                    className="input-modern" 
                                    placeholder={t('role_desc')} 
                                    value={editingRole.description} 
                                    onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                                />
                            </div>
                            
                            <div className="border border-border rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                        <tr>
                                            <th className="p-3">Resource</th>
                                            <th className="p-3 text-center">View</th>
                                            <th className="p-3 text-center">Create</th>
                                            <th className="p-3 text-center">Edit</th>
                                            <th className="p-3 text-center">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {(['assets', 'work_orders', 'inventory', 'reports', 'users', 'settings'] as Resource[]).map(res => (
                                            <tr key={res} className="hover:bg-gray-50">
                                                <td className="p-3 font-bold capitalize">{t(`res_${res}` as any)}</td>
                                                {(['view', 'create', 'edit', 'delete'] as Action[]).map(act => (
                                                    <td key={act} className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded text-brand focus:ring-brand"
                                                            checked={editingRole.permissions[res]?.includes(act) || false}
                                                            onChange={() => handlePermissionToggle(res, act)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-2 justify-end pt-6">
                                <button onClick={() => setIsRoleEditorOpen(false)} className="btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={handleSaveRole} className="btn-primary">{t('btn_save')}</button>
                            </div>
                        </div>
                    </div>
                )}
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
                                        <div className="bg-brand h-4 rounded-full transition-all duration-300" style={{ width: `${(activeAudit.total_scanned / (activeAudit.total_expected || 1)) * 100}%` }}></div>
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

    return null; // Fallback
};
