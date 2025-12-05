
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog, RoleDefinition, Resource, Action } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase, generateAssetThumbnail } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, User as UserIcon, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan, Bluetooth, Wifi, MonitorCheck, CheckCircle2, Shield, Award, ThumbsDown, Briefcase, GraduationCap, Info, Table, XCircle, SearchX, Globe, Menu, Image as ImageIcon, CalendarDays, Factory, Hourglass, ShieldCheck as ShieldCheckIcon } from 'lucide-react';
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
    const [newAssetForm, setNewAssetForm] = useState({ 
        name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], 
        manufacturing_date: '', installation_date: '', image: '' 
    });
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    // Asset Detail Tab State
    const [assetDetailTab, setAssetDetailTab] = useState<'overview' | 'history' | 'docs'>('overview');

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
        if (currentView !== 'dashboard') setIsSimulationActive(false); 
        if (currentView !== 'rfid') setIsGateMonitoring(false);
    }, [currentView]);

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
            return { id: a.asset_id, name: a.name, model: a.model, purchase: purchase, maintCost: maintCost, woCount: woCount, ratio: parseFloat((maintCost / purchase).toFixed(2)) };
        }).sort((a,b) => b.ratio - a.ratio);
        const departments = Array.from(new Set(getLocations().map(l => l.department)));
        const deptScores = departments.map(dept => {
            const deptAssets = assets.filter(a => { const loc = getLocations().find(l => l.location_id === a.location_id); return loc?.department === dept; });
            const assetIds = deptAssets.map(a => a.asset_id);
            const deptWOs = workOrders.filter(wo => assetIds.includes(wo.asset_id) || assetIds.includes(wo.asset_id.replace('NFC-', 'AST-')));
            const userErrors = deptWOs.filter(wo => wo.failure_type === 'UserError').length;
            const techFaults = deptWOs.filter(wo => wo.failure_type === 'Technical').length;
            let score = 100 - (userErrors * 15) - (techFaults * 2);
            if (score < 0) score = 0; if (score > 100) score = 100;
            return { name: dept, score, totalWOs: deptWOs.length, userErrors };
        });
        const topDepts = [...deptScores].sort((a, b) => b.score - a.score).slice(0, 5);
        const lowRepDepts = [...deptScores].sort((a, b) => a.score - b.score).slice(0, 5);
        const assetReputation = assets.map(a => { const wos = workOrders.filter(w => w.asset_id === a.asset_id); const userErrors = wos.filter(w => w.failure_type === 'UserError').length; return { ...a, userErrors }; }).sort((a, b) => b.userErrors - a.userErrors).slice(0, 10);
        const manufacturers = Array.from(new Set(assets.map(a => a.manufacturer || 'Generic')));
        const vendorStats = manufacturers.map(mfg => {
            const mfgAssets = assets.filter(a => (a.manufacturer || 'Generic') === mfg);
            const assetIds = mfgAssets.map(a => a.asset_id);
            const mfgWOs = workOrders.filter(wo => assetIds.includes(wo.asset_id.replace('NFC-', 'AST-')));
            const correctiveWOs = mfgWOs.filter(wo => wo.type === WorkOrderType.CORRECTIVE).length;
            const failureRatio = mfgAssets.length > 0 ? correctiveWOs / mfgAssets.length : 0;
            const reliabilityScore = Math.max(0, 100 - (failureRatio * 20));
            let totalHours = 0; let countClosed = 0;
            mfgWOs.forEach(wo => { if (wo.status === 'Closed' && wo.start_time && wo.close_time) { const diff = new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime(); totalHours += diff / (1000 * 60 * 60); countClosed++; } });
            const avgMTTR = countClosed > 0 ? totalHours / countClosed : 0;
            const supportScore = Math.max(0, 100 - (avgMTTR * 2));
            const finalScore = Math.round((reliabilityScore * 0.6) + (supportScore * 0.4));
            return { name: mfg, assetCount: mfgAssets.length, woCount: correctiveWOs, avgMTTR: avgMTTR.toFixed(1), score: finalScore };
        }).sort((a, b) => b.score - a.score);
        return { mttrTrend, statusData, riskData, tcoData, financialAnalysis, topDepts, lowRepDepts, assetReputation, vendorStats };
    }, [assets, workOrders, users]);

    // Training Data Calc
    const trainingData = useMemo(() => {
        if (!selectedTrainingDept) return null;
        const deptAssets = assets.filter(a => { const loc = getLocations().find(l => l.location_id === a.location_id); return loc?.department === selectedTrainingDept; });
        const deptAssetIds = deptAssets.map(a => a.asset_id);
        const userErrorWOs = workOrders.filter(wo => (deptAssetIds.includes(wo.asset_id) || deptAssetIds.includes(wo.asset_id.replace('NFC-', 'AST-'))));
        const errorCounts: Record<string, number> = {};
        userErrorWOs.forEach(wo => { let errorKey = "General Misuse"; const desc = wo.description.toLowerCase(); if (desc.includes('cable') || desc.includes('cord')) errorKey = "Cable Damage / Yanking"; else if (desc.includes('drop') || desc.includes('fell')) errorKey = "Physical Drop / Impact"; else if (desc.includes('battery') || desc.includes('charge')) errorKey = "Battery Mgmt Failure"; else if (desc.includes('clean') || desc.includes('fluid')) errorKey = "Improper Cleaning"; else if (desc.includes('setting') || desc.includes('config')) errorKey = "Wrong Settings"; errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1; });
        const topErrors = Object.entries(errorCounts).map(([error, count]) => ({ error, count })).sort((a, b) => b.count - a.count).slice(0, 5);
        return { topErrors, totalErrors: userErrorWOs.length, needsSession: userErrorWOs.length > 3 };
    }, [selectedTrainingDept, assets, workOrders]);

    // --- HANDLERS ---
    const triggerNotification = () => { setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
    const handleAiSearch = async () => { if(!aiQuery) return; setIsAiSearching(true); setAiResult(null); const result = await searchKnowledgeBase(aiQuery, kbDocuments.map(d=>d.title), language); setAiResult(result); setIsAiSearching(false); };
    const handleAddSubmit = (e: React.FormEvent) => { e.preventDefault(); onAddAsset({...newAssetForm, location_id: Number(newAssetForm.location_id)} as any); setIsAddModalOpen(false); setNewAssetForm({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], manufacturing_date: '', installation_date: '', image: '' }); };
    
    // AI IMAGE GENERATION HANDLER
    const handleGenerateImage = async () => {
        if (!newAssetForm.model) { alert('Please enter a model name first.'); return; }
        setIsGeneratingImage(true);
        const imageUrl = await generateAssetThumbnail(newAssetForm.model);
        if (imageUrl) { setNewAssetForm(prev => ({ ...prev, image: imageUrl })); }
        setIsGeneratingImage(false);
    };

    const handleDownloadManual = (title: string, assetModel: string) => {
        const content = `OFFICIAL SERVICE MANUAL\nDevice Model: ${assetModel}\nDocument: ${title}\nDate Generated: ${new Date().toLocaleDateString()}\n[Simulation]`;
        const blob = new Blob([content], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

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
    const handleSimulateAuditScan = () => { if(activeAudit && activeAudit.missing_assets.length > 0) { const randomId = activeAudit.missing_assets[Math.floor(Math.random() * activeAudit.missing_assets.length)]; handleRealScan(randomId); } else if (activeAudit) { const randomFound = activeAudit.found_assets[0]; if(randomFound) handleRealScan(randomFound); } };

    // ROLE MANAGEMENT
    const handleOpenRoleEditor = (role?: RoleDefinition) => { if (role) { setEditingRole({ ...role, permissions: JSON.parse(JSON.stringify(role.permissions)) }); } else { setEditingRole({ id: Date.now().toString(), name: '', description: '', is_system_role: false, permissions: { assets: [], work_orders: [], inventory: [], reports: [], users: [], settings: [] } }); } setIsRoleEditorOpen(true); };
    const handlePermissionToggle = (resource: Resource, action: Action) => { if (!editingRole) return; const currentPerms = editingRole.permissions[resource] || []; const hasPerm = currentPerms.includes(action); setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [resource]: hasPerm ? currentPerms.filter(a => a !== action) : [...currentPerms, action] } }); };
    const handleSaveRole = async () => { if (!editingRole || !editingRole.name) return; await api.saveRole(editingRole); const data = await api.fetchRoles(); setRoles(data); setIsRoleEditorOpen(false); setEditingRole(null); };
    
    // --- RENDER HELPERS ---
    const departmentZones = [ { id: 'ICU', name: 'ICU', x: 10, y: 10, width: 20, height: 20, color: 'bg-indigo-100' }, { id: 'Emergency', name: 'ER', x: 40, y: 10, width: 25, height: 15, color: 'bg-red-100' }, { id: 'Radiology', name: 'Rad', x: 70, y: 10, width: 20, height: 20, color: 'bg-blue-100' }, { id: 'Laboratory', name: 'Lab', x: 10, y: 40, width: 15, height: 20, color: 'bg-yellow-100' }, { id: 'Surgery', name: 'OR', x: 50, y: 30, width: 25, height: 25, color: 'bg-teal-100' }, { id: 'Pharmacy', name: 'Pharm', x: 30, y: 40, width: 15, height: 15, color: 'bg-green-100' }, { id: 'General Ward', name: 'Ward', x: 5, y: 90, width: 25, height: 10, color: 'bg-gray-100' } ];
    const getAssetsInZone = (deptId: string) => assets.filter(a => { const loc = getLocations().find(l => l.location_id === a.location_id); return loc?.department === deptId || (loc?.department && loc.department.includes(deptId)); });

    // ============================================
    // 2. ASSETS VIEW (Enhanced)
    // ============================================
    if (currentView === 'assets') {
        if (selectedAsset) {
            const assetWOs = workOrders.filter(w => w.asset_id === selectedAsset.asset_id || w.asset_id === selectedAsset.nfc_tag_id);
            const calHistory = assetWOs.filter(w => w.type === WorkOrderType.CALIBRATION);
            const maintHistory = assetWOs.filter(w => w.type !== WorkOrderType.CALIBRATION);
            const docs = getAssetDocuments(selectedAsset.asset_id);

            return (
                <div className="space-y-6 animate-in slide-in-from-right-4 font-sans">
                    <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-2 transition-colors">
                        <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
                    </button>
                    
                    {/* ASSET HEADER CARD */}
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                            {/* Image Section */}
                            <div className="md:w-1/3 bg-gray-50 p-6 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-border relative group">
                                <div className="w-full aspect-square rounded-xl overflow-hidden bg-white shadow-sm mb-4 relative">
                                    {selectedAsset.image ? (
                                        <img src={selectedAsset.image} className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-500"/>
                                    ) : (
                                        <Box className="w-full h-full text-gray-300 p-12"/>
                                    )}
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-[10px] font-bold rounded backdrop-blur-sm uppercase">
                                        ID: {selectedAsset.asset_id}
                                    </div>
                                </div>
                                <div className="w-full flex gap-2">
                                    <button className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-brand hover:text-white hover:border-brand transition-colors">
                                        Edit Details
                                    </button>
                                    <button className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                                        Decommission
                                    </button>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="md:w-2/3 p-6 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{selectedAsset.name}</h1>
                                        <div className="flex items-center gap-3 mt-2 text-sm">
                                            <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{selectedAsset.manufacturer}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-text-muted">{selectedAsset.model}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="font-mono text-gray-500">{selectedAsset.serial_number}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${selectedAsset.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            <div className={`w-2 h-2 rounded-full ${selectedAsset.status === 'Running' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            {selectedAsset.status}
                                        </div>
                                        <div className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                            <MapPin size={12}/> {getLocationName(selectedAsset.location_id)}
                                        </div>
                                    </div>
                                </div>

                                {/* Lifecycle Timeline */}
                                <div className="mb-8">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Hourglass size={14}/> {t('asset_timeline')}
                                    </h3>
                                    <div className="relative flex justify-between items-center px-2">
                                        {/* Line */}
                                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 -z-10"></div>
                                        
                                        {[
                                            { label: t('manuf_date'), date: selectedAsset.manufacturing_date, icon: Factory },
                                            { label: t('purchase_date'), date: selectedAsset.purchase_date, icon: DollarSign },
                                            { label: t('install_date'), date: selectedAsset.installation_date, icon: Wrench },
                                            { label: t('warranty_exp'), date: selectedAsset.warranty_expiration, icon: ShieldCheckIcon }
                                        ].map((milestone, idx) => (
                                            <div key={idx} className="flex flex-col items-center bg-white px-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${new Date(milestone.date) < new Date() ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                                                    <milestone.icon size={14}/>
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-500 uppercase">{milestone.label}</div>
                                                <div className="text-xs font-bold text-gray-900">{milestone.date || 'N/A'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Detailed Specs Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-auto border-t border-gray-100 pt-6">
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Expected Lifespan</div>
                                        <div className="font-bold text-gray-900">{selectedAsset.expected_lifespan} Years</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Operating Hours</div>
                                        <div className="font-bold text-gray-900">{selectedAsset.operating_hours.toLocaleString()} hrs</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Purchase Cost</div>
                                        <div className="font-bold text-gray-900">${selectedAsset.purchase_cost?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Risk Score</div>
                                        <div className={`font-bold ${selectedAsset.risk_score > 70 ? 'text-red-600' : 'text-green-600'}`}>{selectedAsset.risk_score}/100</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="bg-gray-50 border-t border-border px-6 flex gap-6">
                            {[
                                { id: 'overview', label: t('tab_overview'), icon: Activity },
                                { id: 'history', label: t('tab_history'), icon: History },
                                { id: 'docs', label: t('tab_docs'), icon: Book }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setAssetDetailTab(tab.id as any)}
                                    className={`py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${assetDetailTab === tab.id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                                >
                                    <tab.icon size={16}/> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 bg-white min-h-[300px]">
                            {assetDetailTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-4">{t('live_readings')}</h4>
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-48 flex items-center justify-center text-gray-400 italic">
                                            IoT Telemetry Visualization Placeholder
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-4">{t('asset_health')}</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-green-50 border border-green-100 rounded-lg">
                                                <span className="text-sm font-medium text-green-800">Calibration Status</span>
                                                <span className="text-xs font-bold bg-white px-2 py-1 rounded text-green-600">Compliant</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                <span className="text-sm font-medium text-blue-800">Uptime (YTD)</span>
                                                <span className="text-xs font-bold bg-white px-2 py-1 rounded text-blue-600">99.4%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {assetDetailTab === 'history' && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-gray-900 mb-2">{t('maintenance_history')}</h4>
                                    {maintHistory.length > 0 ? (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                                    <tr>
                                                        <th className="p-3">{t('date')}</th>
                                                        <th className="p-3">{t('wo_id')}</th>
                                                        <th className="p-3">{t('type')}</th>
                                                        <th className="p-3">{t('wo_description')}</th>
                                                        <th className="p-3 text-right">{t('status')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {maintHistory.map(wo => (
                                                        <tr key={wo.wo_id} className="hover:bg-gray-50">
                                                            <td className="p-3 font-mono text-gray-600">{new Date(wo.created_at).toLocaleDateString()}</td>
                                                            <td className="p-3 font-bold">#{wo.wo_id}</td>
                                                            <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-bold">{wo.type}</span></td>
                                                            <td className="p-3 text-gray-600 max-w-xs truncate">{wo.description}</td>
                                                            <td className="p-3 text-right"><span className="text-xs font-bold text-green-600">Closed</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-400 italic">No maintenance history recorded.</div>
                                    )}
                                </div>
                            )}

                            {assetDetailTab === 'docs' && (
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-4">{t('kb_library')}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {docs.map(doc => (
                                            <div key={doc.doc_id} className="p-4 border border-gray-200 rounded-xl hover:border-brand/50 hover:shadow-sm transition-all flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileText size={24}/></div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 group-hover:text-brand transition-colors">{doc.title}</div>
                                                        <div className="text-xs text-gray-500">{doc.type} • {doc.date}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDownloadManual(doc.title, selectedAsset.model)}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                >
                                                    <Download size={14}/> {t('download_manual')}
                                                </button>
                                            </div>
                                        ))}
                                        {/* Auto-generated manuals based on Model */}
                                        <div className="p-4 border border-gray-200 rounded-xl hover:border-brand/50 hover:shadow-sm transition-all flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileText size={24}/></div>
                                                <div>
                                                    <div className="font-bold text-gray-900 group-hover:text-brand transition-colors">{selectedAsset.model} User Guide</div>
                                                    <div className="text-xs text-gray-500">Manual • {selectedAsset.purchase_date}</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDownloadManual(`${selectedAsset.model} User Guide`, selectedAsset.model)}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                            >
                                                <Download size={14}/> {t('download_manual')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in">
                {/* ... (Existing List View remains same but ensures onRowClick sets selectedAsset) ... */}
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
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
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

                {/* Add Asset Modal (Updated with new fields) */}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">{t('purchase_date')}</label>
                                        <input type="date" className="input-modern" value={newAssetForm.purchase_date} onChange={e=>setNewAssetForm({...newAssetForm, purchase_date: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">{t('manuf_date')}</label>
                                        <input type="date" className="input-modern" value={newAssetForm.manufacturing_date} onChange={e=>setNewAssetForm({...newAssetForm, manufacturing_date: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('form_image')}</label>
                                    <div className="flex gap-2">
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="input-modern p-2 flex-1"/>
                                        <button 
                                            type="button" 
                                            onClick={handleGenerateImage}
                                            disabled={isGeneratingImage || !newAssetForm.model}
                                            className="px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                                        >
                                            {isGeneratingImage ? (
                                                <><RefreshCw size={14} className="animate-spin"/> {t('generating_image')}</>
                                            ) : (
                                                <><Sparkles size={14}/> {t('btn_gen_image')}</>
                                            )}
                                        </button>
                                    </div>
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
        const filteredWOs = workOrders.filter(wo => {
            if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
            if (maintenanceFilterType !== 'all' && wo.type !== maintenanceFilterType) return false;
            return true;
        });
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
                                                            <button onClick={(e) => { e.stopPropagation(); setSelectedWOForAssignment(wo); handleSmartAssign(); setIsAssignModalOpen(true); }} className="w-full py-1.5 mt-2 bg-brand/10 text-brand hover:bg-brand hover:text-white rounded-lg text-xs font-bold transition-colors">{t('assign_technician')}</button>
                                                        )}
                                                        {tech && (
                                                            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 bg-gray-50 p-1 rounded"><div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">{tech.name[0]}</div><span className="truncate">{tech.name}</span></div>
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
                
                {/* 1. Create WO Modal */}
                {isCreateWOModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('modal_create_wo')}</h3>
                            <form onSubmit={handleCreateWOSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('wo_asset')}</label>
                                    <select className="input-modern" value={newWOForm.assetId} onChange={e => setNewWOForm({...newWOForm, assetId: e.target.value})} required>
                                        <option value="">Select Asset...</option>
                                        {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.name} ({a.asset_id})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('type')}</label>
                                        <select className="input-modern" value={newWOForm.type} onChange={e => setNewWOForm({...newWOForm, type: e.target.value as WorkOrderType})}>
                                            <option value={WorkOrderType.CORRECTIVE}>{WorkOrderType.CORRECTIVE}</option>
                                            <option value={WorkOrderType.PREVENTIVE}>{WorkOrderType.PREVENTIVE}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('priority')}</label>
                                        <select className="input-modern" value={newWOForm.priority} onChange={e => setNewWOForm({...newWOForm, priority: e.target.value as Priority})}>
                                            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('wo_description')}</label>
                                    <textarea className="input-modern" value={newWOForm.description} onChange={e => setNewWOForm({...newWOForm, description: e.target.value})} required/>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsCreateWOModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                    <button type="submit" className="flex-1 btn-primary">{t('btn_dispatch')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2. Assign Modal */}
                {isAssignModalOpen && selectedWOForAssignment && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('assign_technician')}</h3>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Task</div>
                                <div className="font-bold text-gray-900">{selectedWOForAssignment.description}</div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Recommended Technicians (AI)</h4>
                                    {recommendedTechs.map(rec => (
                                        <div 
                                            key={rec.user.user_id} 
                                            onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())}
                                            className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${selectedTechForAssignment === rec.user.user_id.toString() ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">{rec.user.name[0]}</div>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">{rec.user.name}</div>
                                                    <div className="text-[10px] text-gray-500 flex gap-1 items-center"><Star size={10} className="text-yellow-500 fill-yellow-500"/> {rec.reason}</div>
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-green-600">{rec.score} pts</div>
                                        </div>
                                    ))}
                                    {recommendedTechs.length === 0 && <div className="text-center text-gray-400 text-sm py-2">No smart recommendations available.</div>}
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Manual Selection</label>
                                    <select className="input-modern" value={selectedTechForAssignment} onChange={e => setSelectedTechForAssignment(e.target.value)}>
                                        <option value="">Select Technician...</option>
                                        {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(u => (
                                            <option key={u.user_id} value={u.user_id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-6">
                                <button onClick={() => setIsAssignModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={handleAssignSubmit} className="flex-1 btn-primary">{t('btn_assign_confirm')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Details Modal */}
                {isWorkOrderDetailsModalOpen && selectedWorkOrderForDetails && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Work Order Details</h3>
                                <button onClick={() => setIsWorkOrderDetailsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                                        <div className="mt-1"><span className="px-2 py-1 bg-gray-100 rounded text-sm font-bold">{selectedWorkOrderForDetails.status}</span></div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Assigned To</label>
                                        <div className="font-bold text-gray-900 mt-1 flex items-center gap-2">
                                            <UserIcon size={16}/> 
                                            {users.find(u => u.user_id === selectedWorkOrderForDetails.assigned_to_id)?.name || 'Unassigned'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                                        <div className="text-gray-700 text-sm mt-1">{selectedWorkOrderForDetails.description}</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Asset</label>
                                        <div className="font-bold text-gray-900 mt-1">
                                            {assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id || a.nfc_tag_id === selectedWorkOrderForDetails.asset_id)?.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Model: {assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id || a.nfc_tag_id === selectedWorkOrderForDetails.asset_id)?.model}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Timeline</label>
                                        <div className="text-xs text-gray-600 mt-1">
                                            <div>Created: {new Date(selectedWorkOrderForDetails.created_at).toLocaleString()}</div>
                                            {selectedWorkOrderForDetails.start_time && <div>Started: {new Date(selectedWorkOrderForDetails.start_time).toLocaleString()}</div>}
                                            {selectedWorkOrderForDetails.close_time && <div>Closed: {new Date(selectedWorkOrderForDetails.close_time).toLocaleString()}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Parts Used Table */}
                            {selectedWorkOrderForDetails.parts_used && selectedWorkOrderForDetails.parts_used.length > 0 && (
                                <div className="border-t border-gray-100 pt-4">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Box size={16}/> Parts Consumed</h4>
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                            <tr><th className="p-2">Part Name</th><th className="p-2">Qty</th><th className="p-2">Cost</th></tr>
                                        </thead>
                                        <tbody>
                                            {selectedWorkOrderForDetails.parts_used.map((part, idx) => {
                                                const inventoryPart = inventory.find(p => p.part_id === part.part_id);
                                                return (
                                                    <tr key={idx} className="border-b border-gray-50">
                                                        <td className="p-2">{inventoryPart?.part_name || `Part #${part.part_id}`}</td>
                                                        <td className="p-2">{part.quantity}</td>
                                                        <td className="p-2">${((inventoryPart?.cost || 0) * part.quantity).toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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
                <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
                    <h3 className="font-bold text-gray-900 mb-4">{t('tab_stock')}</h3>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase"><tr><th className="p-4">Part</th><th className="p-4">Stock</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                        <tbody>
                            {inventory.map(part => (
                                <tr key={part.part_id} className="border-t">
                                    <td className="p-4 font-bold">{part.part_name}</td>
                                    <td className="p-4">{part.current_stock} / {part.min_reorder_level}</td>
                                    <td className="p-4">{part.current_stock <= part.min_reorder_level ? <span className="text-red-600 font-bold">Low</span> : <span className="text-green-600">OK</span>}</td>
                                    <td className="p-4"><button onClick={() => initiateRestock(part)} className="text-brand font-bold text-xs">Restock</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Restock Modal Logic */}
                {restockModalOpen && selectedPartForRestock && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="text-xl font-bold mb-4">{t('restock_modal_title')}</h3>
                            <input type="number" className="input-modern mb-4" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} />
                            <div className="flex gap-2"><button onClick={() => setRestockModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button onClick={handleRestockPreCheck} className="btn-primary flex-1">Add</button></div>
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
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase"><tr><th className="p-4">Asset</th><th className="p-4">Last Cal</th><th className="p-4">Next Due</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
                        <tbody>
                            {assets.map(asset => {
                                const isOverdue = asset.next_calibration_date && new Date(asset.next_calibration_date) < new Date();
                                return (
                                    <tr key={asset.asset_id} className="border-t hover:bg-gray-50">
                                        <td className="p-4 font-bold">{asset.name}</td>
                                        <td className="p-4">{asset.last_calibration_date}</td>
                                        <td className={`p-4 font-bold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>{asset.next_calibration_date}</td>
                                        <td className="p-4">{isOverdue ? 'Overdue' : 'Compliant'}</td>
                                        <td className="p-4"><button className="text-brand font-bold text-xs" onClick={() => { setAssetToCalibrate(asset); setUpdateCalibrationModalOpen(true); }}>Update</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {updateCalibrationModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                            <h3 className="text-xl font-bold mb-4">{t('update_cal_title')}</h3>
                            <input type="date" className="input-modern mb-4" value={newCalibrationDate} onChange={e => setNewCalibrationDate(e.target.value)} />
                            <div className="flex gap-2"><button onClick={() => setUpdateCalibrationModalOpen(false)} className="btn-secondary flex-1">Cancel</button><button onClick={handleUpdateCalibration} className="btn-primary flex-1">Record</button></div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 6. ANALYSIS VIEW (Reports, AI, Financial)
    // ============================================
    if (currentView === 'analysis') {
        const subTabs = [
            { id: 'tab_analytics', label: t('tab_analytics'), icon: BarChart2 },
            { id: 'tab_financial', label: t('tab_financial'), icon: DollarSign },
            { id: 'tab_gen_report', label: t('tab_gen_report'), icon: FileText },
            { id: 'tab_vendor', label: t('tab_vendor'), icon: Award },
            { id: 'tab_training', label: t('tab_training'), icon: GraduationCap },
            { id: 'tab_kb', label: t('tab_kb'), icon: BookOpen }
        ];

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm overflow-x-auto">
                    {subTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                            <tab.icon size={18} />{tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'tab_analytics' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm"><div className="text-sm text-gray-500 font-bold mb-1">{t('kpi_mtbf')}</div><div className="text-2xl font-black text-gray-900">4,200h</div></div>
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm"><div className="text-sm text-gray-500 font-bold mb-1">{t('kpi_mttr')}</div><div className="text-2xl font-black text-gray-900">3.5h</div></div>
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm"><div className="text-sm text-gray-500 font-bold mb-1">{t('kpi_availability')}</div><div className="text-2xl font-black text-green-600">98.2%</div></div>
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm"><div className="text-sm text-gray-500 font-bold mb-1">{t('total_assets')}</div><div className="text-2xl font-black text-blue-600">{assets.length}</div></div>
                        </div>
                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft h-[350px]">
                                <h3 className="font-bold text-gray-900 mb-4">{t('chart_mttr_trend')}</h3>
                                <ResponsiveContainer width="100%" height="90%"><LineChart data={analyticsData.mttrTrend}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis/><Tooltip/><Line type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3} dot={{r: 4}}/></LineChart></ResponsiveContainer>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft h-[350px]">
                                <h3 className="font-bold text-gray-900 mb-4">{t('chart_asset_status')}</h3>
                                <ResponsiveContainer width="100%" height="90%"><PieChart><Pie data={analyticsData.statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"><Cell fill="#10B981"/><Cell fill="#EF4444"/><Cell fill="#F59E0B"/></Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tab_financial' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[400px]">
                            <h3 className="font-bold text-gray-900 mb-6">{t('chart_cost_vs_value')}</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={analyticsData.tcoData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="model" tick={{fontSize: 10}}/>
                                    <YAxis />
                                    <Tooltip cursor={{fill: 'transparent'}}/>
                                    <Legend />
                                    <Bar dataKey="purchase_cost" name="Purchase Price" fill="#2563EB" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="accumulated_maintenance_cost" name="Maintenance Cost" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-gray-900 mb-4">{t('table_financial_report')}</h3>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="p-3">Asset</th>
                                        <th className="p-3">Purchase</th>
                                        <th className="p-3">Maint. Cost</th>
                                        <th className="p-3">Ratio</th>
                                        <th className="p-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {analyticsData.financialAnalysis.slice(0, 5).map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-bold">{item.name}</td>
                                            <td className="p-3">${item.purchase.toLocaleString()}</td>
                                            <td className="p-3 text-red-600">${item.maintCost.toLocaleString()}</td>
                                            <td className="p-3 font-bold">{(item.ratio * 100).toFixed(0)}%</td>
                                            <td className="p-3">
                                                {item.ratio > 0.4 ? <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">Recommend Replace</span> : <span className="text-green-600 font-bold text-xs">Keep</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'tab_gen_report' && (
                    <div className="bg-white p-8 rounded-2xl border border-border shadow-soft min-h-[500px]">
                        <div className="max-w-2xl mx-auto text-center space-y-6">
                            <div className="p-4 bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-brand mb-6"><FileText size={40}/></div>
                            <h2 className="text-3xl font-black text-gray-900">{t('gen_report')}</h2>
                            <p className="text-gray-500">Select report type and parameters to generate official PDF documents.</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setReportType('CM')} className={`p-4 border rounded-xl font-bold transition-all ${reportType === 'CM' ? 'border-brand bg-brand/5 text-brand ring-2 ring-brand/20' : 'border-gray-200 hover:border-gray-300'}`}>{t('cm_report')}</button>
                                <button onClick={() => setReportType('PPM')} className={`p-4 border rounded-xl font-bold transition-all ${reportType === 'PPM' ? 'border-brand bg-brand/5 text-brand ring-2 ring-brand/20' : 'border-gray-200 hover:border-gray-300'}`}>{t('ppm_report')}</button>
                            </div>

                            <div className="flex gap-2">
                                <input className="input-modern" placeholder="Enter Job Order No. (e.g. 2236)" value={jobOrderSearchId} onChange={e => setJobOrderSearchId(e.target.value)} />
                                <button onClick={handleFindJobReport} className="btn-primary w-32">Search</button>
                            </div>

                            {selectedCMReport && reportType === 'CM' && (
                                <div className="mt-8 p-6 border-2 border-gray-100 rounded-xl bg-gray-50 text-left animate-in slide-in-from-bottom-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-gray-900">Report Preview: {selectedCMReport.report_id}</h4>
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Ready</span>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600 mb-6">
                                        <p><strong>Asset:</strong> {selectedCMReport.asset.name}</p>
                                        <p><strong>Fault:</strong> {selectedCMReport.fault_details.fault_description}</p>
                                        <p><strong>Technician:</strong> {selectedCMReport.fault_details.technician_name}</p>
                                    </div>
                                    <button className="w-full btn-primary"><Download size={18}/> Download PDF</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'tab_vendor' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {analyticsData.vendorStats.slice(0, 3).map((v, i) => (
                                <div key={v.name} className="bg-white p-6 rounded-2xl border border-border shadow-soft relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-gray-400">#{i+1}</div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{v.name}</h3>
                                    <div className="text-4xl font-black text-brand mb-4">{v.score}<span className="text-lg font-medium text-gray-400">/100</span></div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span>Reliability</span><span className="font-bold text-gray-700">{(100 - (v.woCount/v.assetCount)*20).toFixed(0)}%</span></div>
                                        <div className="flex justify-between"><span>Speed (MTTR)</span><span className="font-bold text-gray-700">{v.avgMTTR}h</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr><th className="p-4">Vendor</th><th className="p-4">Assets</th><th className="p-4">Failures</th><th className="p-4">Avg Repair Time</th><th className="p-4">Score</th><th className="p-4">Verdict</th></tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {analyticsData.vendorStats.map(v => (
                                        <tr key={v.name} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{v.name}</td>
                                            <td className="p-4">{v.assetCount}</td>
                                            <td className="p-4">{v.woCount}</td>
                                            <td className="p-4">{v.avgMTTR}h</td>
                                            <td className="p-4 font-bold">{v.score}</td>
                                            <td className="p-4">
                                                {v.score > 85 ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Recommended</span> : 
                                                 v.score < 60 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Avoid</span> : 
                                                 <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">Average</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'tab_training' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex flex-col">
                            <h3 className="font-bold text-gray-900 mb-6">{t('select_dept_training')}</h3>
                            <div className="space-y-2 flex-1 overflow-y-auto">
                                {analyticsData.topDepts.concat(analyticsData.lowRepDepts).map(d => (
                                    <button 
                                        key={d.name} 
                                        onClick={() => setSelectedTrainingDept(d.name)}
                                        className={`w-full p-4 rounded-xl border text-left transition-all flex justify-between items-center ${selectedTrainingDept === d.name ? 'border-brand bg-brand/5 ring-1 ring-brand' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <span className="font-bold text-gray-800">{d.name}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${d.score > 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.score}% Score</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-border shadow-soft">
                            {trainingData ? (
                                <div className="space-y-8 animate-in fade-in">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900">{selectedTrainingDept} Analysis</h2>
                                            <p className="text-gray-500">User Error Report & Training Needs</p>
                                        </div>
                                        {trainingData.needsSession ? (
                                            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><AlertTriangle size={20}/> Session Recommended</div>
                                        ) : (
                                            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><CheckCircle2 size={20}/> Performance Good</div>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-4">Top Recurring Mistakes</h4>
                                        <div className="space-y-3">
                                            {trainingData.topErrors.map((err, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">{i+1}</div>
                                                    <div className="flex-1 font-bold text-gray-800">{err.error}</div>
                                                    <div className="text-sm font-mono text-gray-500">{err.count} incidents</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                                        <h4 className="font-bold text-blue-900 mb-2">Training Material Generator</h4>
                                        <p className="text-sm text-blue-700 mb-4">Generate a 1-page PDF flyer with specific tips to avoid these errors.</p>
                                        <button className="btn-primary bg-blue-600 hover:bg-blue-700 mx-auto"><Printer size={18}/> Generate Flyer</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <GraduationCap size={64} className="mb-4 opacity-20"/>
                                    <p>Select a department to view training insights.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'tab_kb' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                        {/* Search & AI Pane */}
                        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-border shadow-soft flex flex-col">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><BrainCircuit className="text-brand"/> {t('kb_ai_search')}</h3>
                            <div className="bg-indigo-50 p-4 rounded-xl mb-4 border border-indigo-100">
                                <label className="text-xs font-bold text-indigo-800 uppercase mb-2 block">{t('ai_search_title')}</label>
                                <textarea className="input-modern min-h-[100px] mb-3" placeholder={t('ai_search_placeholder')} value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} />
                                <button onClick={handleAiSearch} disabled={isAiSearching} className="w-full btn-primary bg-indigo-600 hover:bg-indigo-700 text-sm">
                                    {isAiSearching ? t('analyzing') : <><Sparkles size={16}/> {t('btn_analyze')}</>}
                                </button>
                            </div>
                            {/* Manual Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input type="text" placeholder="Search manuals..." className="input-modern pl-10" value={kbSearch} onChange={(e) => setKbSearch(e.target.value)} />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {filteredKbDocs.slice(0, 10).map(doc => (
                                    <div key={doc.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center gap-3 cursor-pointer group">
                                        <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileText size={18}/></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-800 truncate group-hover:text-brand">{doc.title}</div>
                                            <div className="text-[10px] text-gray-500">{doc.category} • {doc.fileSize}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Results Pane */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-soft overflow-y-auto">
                            {aiResult ? (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center"><Lightbulb size={20}/></div>
                                        <h2 className="text-xl font-bold text-gray-900">Analysis Result</h2>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="font-bold text-gray-900 mb-2">{t('ai_explanation')}</h4>
                                        <p className="text-gray-700 leading-relaxed">{aiResult.explanation}</p>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                        <h4 className="font-bold text-green-900 mb-2">{t('ai_solution')}</h4>
                                        <div className="text-green-800 leading-relaxed whitespace-pre-wrap">{aiResult.solution}</div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 mb-3">{t('ai_ref_docs')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {aiResult.relevantDocs.map((doc, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-brand cursor-pointer">
                                                    <BookOpen size={18} className="text-brand"/>
                                                    <span className="text-sm font-medium">{doc}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Library size={64} className="mb-4 opacity-20"/>
                                    <p>Select a document or use AI Search</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 7. USERS VIEW (List & Roles)
    // ============================================
    if (currentView === 'users') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-white p-1 rounded-xl border border-border shadow-sm inline-flex mb-4">
                    <button onClick={() => setUserMgmtTab('users')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${userMgmtTab === 'users' ? 'bg-brand text-white' : 'text-gray-500'}`}>Users List</button>
                    <button onClick={() => setUserMgmtTab('roles')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${userMgmtTab === 'roles' ? 'bg-brand text-white' : 'text-gray-500'}`}>Roles & Permissions</button>
                </div>

                {userMgmtTab === 'users' ? (
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">{t('users_title')}</h3>
                            <button onClick={() => setIsAddUserModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><UserPlus size={16}/> {t('add_user')}</button>
                        </div>
                        <table className="w-full text-left">
                            <thead className="text-xs font-bold text-gray-500 uppercase bg-gray-50"><tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Email</th><th className="p-4">Actions</th></tr></thead>
                            <tbody className="divide-y divide-border">
                                {users.map(u => (
                                    <tr key={u.user_id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">{u.name[0]}</div>{u.name}</td>
                                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{u.role}</span></td>
                                        <td className="p-4 text-gray-600 text-sm">{u.email}</td>
                                        <td className="p-4"><button className="text-gray-400 hover:text-brand"><Wrench size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {roles.map(role => (
                            <div key={role.id} className="bg-white p-5 rounded-2xl border border-border shadow-soft relative group hover:border-brand/50 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                                        <p className="text-xs text-gray-500">{role.description}</p>
                                    </div>
                                    {role.is_system_role && <Lock size={16} className="text-gray-400" />}
                                </div>
                                <div className="space-y-2 mb-4">
                                    {Object.entries(role.permissions).slice(0, 3).map(([res, acts]) => (
                                        <div key={res} className="flex justify-between text-xs">
                                            <span className="capitalize text-gray-600">{res}</span>
                                            <span className="font-mono text-gray-400">{acts.length > 0 ? acts.length + ' rights' : 'None'}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleOpenRoleEditor(role)} className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold transition-colors">Edit Permissions</button>
                            </div>
                        ))}
                        <button onClick={() => handleOpenRoleEditor()} className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 hover:text-brand hover:border-brand transition-colors h-full min-h-[200px]">
                            <Plus size={32} className="mb-2"/>
                            <span className="font-bold">Create Custom Role</span>
                        </button>
                    </div>
                )}
                
                {/* Role Editor Modal */}
                {isRoleEditorOpen && editingRole && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in-95">
                            <div className="p-6 border-b border-border flex justify-between items-center">
                                <h3 className="text-xl font-bold">{editingRole.id ? 'Edit Role' : 'Create Role'}</h3>
                                <button onClick={() => setIsRoleEditorOpen(false)}><X size={24}/></button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role Name</label>
                                    <input className="input-modern" value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} disabled={editingRole.is_system_role} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-3">Permissions Matrix</h4>
                                    <div className="border border-border rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
                                                <tr><th className="p-3">Resource</th><th className="p-3 text-center">View</th><th className="p-3 text-center">Create</th><th className="p-3 text-center">Edit</th><th className="p-3 text-center">Delete</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {(['assets', 'work_orders', 'inventory', 'reports', 'users', 'settings'] as Resource[]).map(res => (
                                                    <tr key={res}>
                                                        <td className="p-3 font-medium capitalize">{res.replace('_', ' ')}</td>
                                                        {(['view', 'create', 'edit', 'delete'] as Action[]).map(act => (
                                                            <td key={act} className="p-3 text-center">
                                                                <input type="checkbox" checked={editingRole.permissions[res]?.includes(act)} onChange={() => handlePermissionToggle(res, act)} className="w-4 h-4 text-brand rounded focus:ring-brand" />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-border bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                                <button onClick={() => setIsRoleEditorOpen(false)} className="btn-secondary">Cancel</button>
                                <button onClick={handleSaveRole} className="btn-primary">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 8. RFID VIEW (Audit & Gate)
    // ============================================
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6 animate-in fade-in h-full flex flex-col">
                <div className="flex justify-between items-start">
                    <div className="bg-white p-1 rounded-xl border border-border shadow-sm inline-flex">
                        <button onClick={() => setRfidTab('audit')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${rfidTab === 'audit' ? 'bg-brand text-white' : 'text-gray-500'}`}><ClipboardCheck size={16}/> Inventory Audit</button>
                        <button onClick={() => setRfidTab('gate')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${rfidTab === 'gate' ? 'bg-brand text-white' : 'text-gray-500'}`}><DoorOpen size={16}/> Gate Monitor</button>
                    </div>
                    {/* Scanner Status Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${zebraStatus === 'listening' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${zebraStatus === 'listening' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        {zebraStatus === 'listening' ? 'Zebra Scanner Connected' : 'Scanner Disconnected'}
                    </div>
                </div>

                {rfidTab === 'audit' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                        {/* Control Panel */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex flex-col h-full">
                            <h3 className="font-bold text-lg text-gray-900 mb-6">Audit Control</h3>
                            {!activeAudit ? (
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Select Department</label>
                                    <select className="input-modern" value={selectedAuditDept} onChange={e => setSelectedAuditDept(e.target.value)}>
                                        <option value="">Choose Zone...</option>
                                        {departmentZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                    </select>
                                    <button onClick={startAudit} disabled={!selectedAuditDept} className="w-full btn-primary py-4 text-base disabled:opacity-50">Start New Audit</button>
                                </div>
                            ) : (
                                <div className="space-y-6 flex-1 flex flex-col">
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                                        <div className="text-blue-800 font-bold text-lg mb-1">{activeAudit.department}</div>
                                        <div className="text-blue-600 text-xs uppercase font-bold tracking-wider">Active Zone</div>
                                    </div>
                                    <div className="text-center py-4">
                                        <div className="text-5xl font-black text-gray-900 mb-2">{Math.round((activeAudit.total_scanned / activeAudit.total_expected) * 100)}%</div>
                                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${(activeAudit.total_scanned / activeAudit.total_expected) * 100}%` }}></div>
                                        </div>
                                        <div className="flex justify-between mt-2 text-xs font-bold text-gray-500">
                                            <span>0%</span>
                                            <span>{activeAudit.total_scanned} / {activeAudit.total_expected} Assets</span>
                                            <span>100%</span>
                                        </div>
                                    </div>
                                    <button onClick={handleSimulateAuditScan} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand hover:text-brand font-bold transition-all mt-auto">Simulate Scan (Test)</button>
                                    <button onClick={() => setActiveAudit(null)} className="w-full btn-secondary text-danger border-danger/20 hover:bg-red-50">Stop Audit</button>
                                </div>
                            )}
                        </div>
                        {/* Results Panel */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft flex flex-col overflow-hidden h-full">
                            <div className="flex border-b border-border">
                                <div className="flex-1 p-4 text-center border-r border-border bg-green-50/50">
                                    <div className="text-xs font-bold text-green-600 uppercase mb-1">Found</div>
                                    <div className="text-2xl font-black text-green-700">{activeAudit?.found_assets.length || 0}</div>
                                </div>
                                <div className="flex-1 p-4 text-center bg-red-50/50">
                                    <div className="text-xs font-bold text-red-600 uppercase mb-1">Missing</div>
                                    <div className="text-2xl font-black text-red-700">{activeAudit?.missing_assets.length || 0}</div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Scanned Assets</h4>
                                    {activeAudit?.found_assets.map(id => (
                                        <div key={id} className="p-3 bg-white border border-green-200 rounded-lg shadow-sm flex items-center gap-3 animate-in slide-in-from-left-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="font-mono text-sm font-bold">{id}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Missing Assets</h4>
                                    {activeAudit?.missing_assets.map(id => (
                                        <div key={id} className="p-3 bg-white border border-red-100 rounded-lg opacity-60 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-300"></div>
                                            <span className="font-mono text-sm text-gray-500">{id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                        {/* Gate Status Cards */}
                        <div className="lg:col-span-1 space-y-4">
                            <button 
                                onClick={() => setIsGateMonitoring(!isGateMonitoring)} 
                                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex flex-col items-center gap-2 ${isGateMonitoring ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                            >
                                <Radio size={24} className={isGateMonitoring ? 'animate-pulse' : ''}/>
                                {isGateMonitoring ? 'Stop Monitoring' : 'Activate Gate Network'}
                            </button>
                            {gateReaders.map(reader => (
                                <div key={reader.id} className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{reader.name}</div>
                                        <div className="text-[10px] text-gray-400">ID: {reader.id}</div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${reader.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${reader.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        {reader.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Live Feed */}
                        <div className="lg:col-span-3 bg-black rounded-2xl border border-gray-800 shadow-lg p-6 flex flex-col overflow-hidden relative">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
                            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                                <h3 className="text-green-500 font-mono font-bold flex items-center gap-2"><Activity size={18}/> LIVE GATE TRAFFIC</h3>
                                <div className="text-gray-500 font-mono text-xs">{new Date().toLocaleTimeString()}</div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 font-mono">
                                {gateLogs.map(log => {
                                    const asset = assets.find(a => a.asset_id === log.asset_id);
                                    const reader = gateReaders.find(r => r.id === log.gate_location_id);
                                    return (
                                        <div key={log.id} className="flex items-center gap-4 text-sm p-2 hover:bg-white/5 rounded border-b border-white/5 animate-in slide-in-from-right-2">
                                            <span className="text-gray-500 w-20">{new Date(log.timestamp).toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                            <span className={`font-bold w-16 ${log.direction === 'ENTER' ? 'text-green-400' : 'text-orange-400'}`}>{log.direction}</span>
                                            <span className="text-white flex-1">{asset?.name || 'Unknown Asset'} <span className="text-gray-600 text-xs">({log.asset_id})</span></span>
                                            <span className="text-gray-400 text-xs">@ {reader?.name}</span>
                                        </div>
                                    )
                                })}
                                {gateLogs.length === 0 && <div className="text-gray-600 text-center py-12">Waiting for signal...</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // 1. DASHBOARD VIEW (Default)
    // ============================================
    return (
        <div className="space-y-6 animate-in fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-border flex items-center justify-between group hover:border-brand/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{t('kpi_mtbf')}</p>
                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-brand transition-colors">4,250h</h3>
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center w-fit gap-1 mt-1"><TrendingUp size={10}/> +12%</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-brand/5 text-brand flex items-center justify-center"><Activity size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-border flex items-center justify-between group hover:border-brand/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{t('kpi_mttr')}</p>
                        <h3 className="text-2xl font-black text-gray-900">3.2h</h3>
                        <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded flex items-center w-fit gap-1 mt-1"><TrendingUp size={10}/> -5%</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><Clock size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-border flex items-center justify-between group hover:border-brand/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Availability</p>
                        <h3 className="text-2xl font-black text-gray-900">98.5%</h3>
                        <span className="text-[10px] text-text-muted mt-1 block">Target: 99.0%</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center"><CheckCircle2 size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-soft border border-border flex items-center justify-between group hover:border-brand/30 transition-colors">
                    <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Open WOs</p>
                        <h3 className="text-2xl font-black text-gray-900">{workOrders.filter(w => w.status === 'Open').length}</h3>
                        <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded mt-1 block w-fit">Needs Attention</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={24}/></div>
                </div>
            </div>

            {/* 3D Map Section */}
            <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col lg:flex-row h-[600px]">
                <div className="flex-1 relative bg-gray-50 overflow-hidden">
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><MapPin size={16} className="text-brand"/> {t('dept_map')}</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span><span className="text-[10px] font-bold text-gray-500">Normal</span>
                            <span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-[10px] font-bold text-gray-500">Issues</span>
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-4 z-10">
                        <button onClick={() => setIsSimulationActive(!isSimulationActive)} className={`px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 ${isSimulationActive ? 'bg-brand text-white' : 'bg-white text-gray-700'}`}>
                            <Zap size={14} className={isSimulationActive ? 'text-yellow-300' : ''}/> {isSimulationActive ? 'Simulating Live Traffic' : 'Start Simulation'}
                        </button>
                    </div>
                    
                    {/* Isometric Map Container */}
                    <div className="w-full h-full flex items-center justify-center perspective-[1000px] overflow-auto p-10">
                        <div className="relative w-[600px] h-[600px] transform rotate-x-60 rotate-z-45 transition-transform duration-500" style={{transformStyle: 'preserve-3d'}}>
                            {departmentZones.map(zone => {
                                const zoneAssets = getAssetsInZone(zone.id);
                                const hasIssues = zoneAssets.some(a => a.status === AssetStatus.DOWN);
                                const issueCount = zoneAssets.filter(a => a.status === AssetStatus.DOWN).length;
                                const isSelected = selectedMapZone === zone.id;
                                
                                return (
                                    <div 
                                        key={zone.id}
                                        onClick={() => setSelectedMapZone(zone.id)}
                                        className={`absolute transition-all duration-300 cursor-pointer shadow-xl border-2 hover:-translate-y-2 group
                                            ${isSelected ? 'border-brand z-50 translate-y-[-10px]' : hasIssues ? 'border-red-400' : 'border-white'}
                                            ${hasIssues ? 'bg-red-50' : zone.color}
                                        `}
                                        style={{
                                            left: `${zone.x}%`,
                                            top: `${zone.y}%`,
                                            width: `${zone.width}%`,
                                            height: `${zone.height}%`,
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        {/* Zone Label */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className={`text-xs font-black uppercase tracking-wider transform -rotate-45 ${hasIssues ? 'text-red-700' : 'text-gray-400 group-hover:text-gray-800'}`}>{zone.name}</span>
                                        </div>
                                        {/* Issue Bubble */}
                                        {issueCount > 0 && (
                                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-md animate-bounce z-20 transform -rotate-45">
                                                {issueCount}
                                            </div>
                                        )}
                                        {/* Asset Dots (Simulated) */}
                                        <div className="absolute inset-0 p-1 flex flex-wrap content-start gap-0.5 opacity-50">
                                            {zoneAssets.slice(0, 12).map((a, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${a.status === AssetStatus.DOWN ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar Details Panel */}
                <div className={`w-full lg:w-80 bg-white border-l border-border flex flex-col transition-all duration-300 ${selectedMapZone ? 'translate-x-0' : 'translate-x-full hidden lg:flex'}`}>
                    {selectedMapZone ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-900">{departmentZones.find(z => z.id === selectedMapZone)?.name} Details</h3>
                                <button onClick={() => setSelectedMapZone(null)}><X size={18} className="text-gray-400 hover:text-gray-600"/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {getAssetsInZone(selectedMapZone).map(asset => (
                                    <div key={asset.asset_id} className="p-3 bg-white border border-border rounded-xl shadow-sm hover:border-brand transition-colors cursor-pointer" onClick={() => { setSelectedAsset(asset); onNavigate('assets'); }}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${asset.status === AssetStatus.RUNNING ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{asset.status}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">{asset.asset_id}</span>
                                        </div>
                                        <div className="font-bold text-sm text-gray-900">{asset.name}</div>
                                        <div className="text-xs text-gray-500">{asset.model}</div>
                                    </div>
                                ))}
                                {getAssetsInZone(selectedMapZone).length === 0 && <div className="text-center text-gray-400 py-8 text-sm">No assets in this zone.</div>}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                            <MapPin size={48} className="mb-4 opacity-20"/>
                            <p className="text-sm font-medium">Select a zone on the map to view asset details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Simple Icon wrapper for map usage if needed
const DoorOpen = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>
);
