
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog, RoleDefinition, Resource, Action } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase, generateAssetThumbnail } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, User as UserIcon, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan, Bluetooth, Wifi, MonitorCheck, CheckCircle2, Shield, Award, ThumbsDown, Briefcase, GraduationCap, Info, Table, XCircle, SearchX, Globe, Menu, Image as ImageIcon, CalendarDays, Factory, Hourglass, ShieldCheck as ShieldCheckIcon, Server, Database, Cpu, HardDrive, TrendingDown, Coins, DoorOpen } from 'lucide-react';
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
    
    const isAdmin = currentUser.role === UserRole.ADMIN;

    // Notification Toast State
    const [showToast, setShowToast] = useState(false);
    
    // Asset Search
    const [assetSearch, setAssetSearch] = useState('');

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
    const [selectedPartForRestock, setSelectedPartForRestock] = useState<InventoryPart | null>(null);
    const [restockQty, setRestockQty] = useState(0);
    const [showRestockConfirm, setShowRestockConfirm] = useState(false);
    
    // Reporting State
    const [reportType, setReportType] = useState<'CM' | 'PPM' | 'COMPLIANCE'>('CM');
    const [selectedJobReport, setSelectedJobReport] = useState<DetailedJobOrderReport | null>(null);
    
    // 3D Map State
    const [selectedMapZone, setSelectedMapZone] = useState<string | null>(null);
    const [isSimulationActive, setIsSimulationActive] = useState(false);
    
    // Maintenance State
    const [maintenanceViewMode, setMaintenanceViewMode] = useState<'kanban' | 'list'>('kanban');
    const [maintenanceFilterPriority, setMaintenanceFilterPriority] = useState<string>('all');
    const [maintenanceFilterStatus, setMaintenanceFilterStatus] = useState<string>('all');
    const [maintenanceFilterTechnician, setMaintenanceFilterTechnician] = useState<string>('all');
    const [maintenanceFilterAsset, setMaintenanceFilterAsset] = useState<string>('');

    const [isCreateWOModalOpen, setIsCreateWOModalOpen] = useState(false);
    const [newWOForm, setNewWOForm] = useState({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' });
    const [selectedWorkOrderForDetails, setSelectedWorkOrderForDetails] = useState<WorkOrder | null>(null);
    const [isWorkOrderDetailsModalOpen, setIsWorkOrderDetailsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedWOForAssignment, setSelectedWOForAssignment] = useState<WorkOrder | null>(null);
    const [selectedTechForAssignment, setSelectedTechForAssignment] = useState('');
    const [recommendedTechs, setRecommendedTechs] = useState<TechRecommendation[]>([]);

    // Knowledge Base State
    const [kbSearch, setKbSearch] = useState('');
    const [aiQuery, setAiQuery] = useState('');
    const [aiResult, setAiResult] = useState<{explanation: string, solution: string, relevantDocs: string[]} | null>(null);
    const [isAiSearching, setIsAiSearching] = useState(false);

    // RFID & Audit State
    const [rfidTab, setRfidTab] = useState<'audit' | 'gate'>('audit');
    const [activeAudit, setActiveAudit] = useState<AuditSession | null>(null);
    const [gateLogs, setGateLogs] = useState<RfidGateLog[]>([]);
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
        // If missing, move to found
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
            handleGateScan(scannedTag, 101); // Simulate Gate 101 for now
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
        if (currentView !== 'dashboard') setIsSimulationActive(false); 
        if (currentView !== 'rfid') setIsGateMonitoring(false);
    }, [currentView]);

    // Dashboard Simulation Effect
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

    // Gate Monitor Simulation Effect
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isGateMonitoring && currentView === 'rfid' && rfidTab === 'gate') {
            interval = setInterval(() => {
                // Randomly pick a reader to come online/ping
                setGateReaders(prev => prev.map(r => ({
                    ...r,
                    status: Math.random() > 0.1 ? 'online' : 'offline',
                    lastPing: new Date().toLocaleTimeString()
                })));

                // Randomly trigger a scan
                if (Math.random() > 0.7) {
                    const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                    const randomGate = gateReaders[Math.floor(Math.random() * gateReaders.length)];
                    handleGateScan(randomAsset.asset_id, randomGate.id);
                }
            }, 2000);
        } else {
            setGateReaders(prev => prev.map(r => ({ ...r, status: 'offline' })));
        }
        return () => clearInterval(interval);
    }, [isGateMonitoring, currentView, rfidTab, assets, handleGateScan]);

    // Analytics Calculations
    const analyticsData = useMemo(() => {
        const closedWOs = workOrders.filter(wo => wo.status === 'Closed' && wo.start_time && wo.close_time);
        
        // 1. MTTR Trend
        const mttrByMonth: {[key: string]: {total: number, count: number}} = {};
        closedWOs.filter(wo => wo.type === WorkOrderType.CORRECTIVE).forEach(wo => { 
            const month = new Date(wo.close_time!).toLocaleString('default', { month: 'short' }); 
            if (!mttrByMonth[month]) mttrByMonth[month] = { total: 0, count: 0 }; 
            const duration = new Date(wo.close_time!).getTime() - new Date(wo.start_time!).getTime(); 
            mttrByMonth[month].total += duration; 
            mttrByMonth[month].count += 1; 
        });
        const mttrTrend = Object.keys(mttrByMonth).map(m => ({ 
            month: m, 
            hours: parseFloat((mttrByMonth[m].total / mttrByMonth[m].count / (1000 * 60 * 60)).toFixed(1)) 
        })).slice(0, 6);

        // 2. Vendor Analysis
        const vendorStats = assets.reduce((acc, asset) => {
            const vendor = asset.manufacturer || 'Unknown';
            if (!acc[vendor]) acc[vendor] = { name: vendor, totalAssets: 0, defects: 0 };
            acc[vendor].totalAssets++;
            const defects = workOrders.filter(wo => wo.asset_id === asset.asset_id && wo.type === WorkOrderType.CORRECTIVE).length;
            acc[vendor].defects += defects;
            return acc;
        }, {} as Record<string, any>);
        
        const vendorData = Object.values(vendorStats).map((v: any) => ({
            ...v,
            score: Math.max(0, 100 - (v.defects * 5)), // Mock score logic
            reliability: v.totalAssets > 0 ? (1 - (v.defects / v.totalAssets)) * 100 : 100
        })).sort((a: any, b: any) => b.score - a.score);

        // 3. TCO Analysis
        const tcoData = assets
            .filter(a => a.purchase_cost && a.accumulated_maintenance_cost)
            .sort((a, b) => (b.accumulated_maintenance_cost || 0) - (a.accumulated_maintenance_cost || 0))
            .slice(0, 5)
            .map(a => ({
                name: a.name,
                purchase: a.purchase_cost || 0,
                maintenance: a.accumulated_maintenance_cost || 0,
                ratio: ((a.accumulated_maintenance_cost || 0) / (a.purchase_cost || 1)) * 100
            }));

        // 4. Technician Performance Stats
        const technicianStats = users
            .filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER)
            .map(tech => {
                const jobs = closedWOs.filter(wo => wo.assigned_to_id === tech.user_id);
                const totalTime = jobs.reduce((acc, wo) => {
                    if (wo.start_time && wo.close_time) {
                        return acc + (new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime());
                    }
                    return acc;
                }, 0);
                const avgMttr = jobs.length > 0 ? (totalTime / jobs.length / (1000 * 60 * 60)) : 0;
                return {
                    name: tech.name.split(' ')[0],
                    jobs: jobs.length,
                    mttr: parseFloat(avgMttr.toFixed(1))
                };
            })
            .sort((a, b) => b.jobs - a.jobs);

        // 5. Cost Analysis by Department
        const costByDept: Record<string, { parts: number, labor: number }> = {};
        const locations = getLocations();
        
        workOrders.forEach(wo => {
             const asset = assets.find(a => a.asset_id === wo.asset_id);
             if (asset) {
                 const loc = locations.find(l => l.location_id === asset.location_id);
                 if (loc) {
                    if (!costByDept[loc.department]) costByDept[loc.department] = { parts: 0, labor: 0 };
                    
                    // Parts Cost
                    if (wo.parts_used) {
                        const partsCost = wo.parts_used.reduce((acc, p) => {
                             const part = inventory.find(i => i.part_id === p.part_id);
                             return acc + (part ? part.cost * p.quantity : 0);
                        }, 0);
                        costByDept[loc.department].parts += partsCost;
                    }

                    // Labor Cost (Mock: $50/hr for closed jobs)
                    if (wo.status === 'Closed' && wo.start_time && wo.close_time) {
                         const hours = (new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime()) / (1000 * 60 * 60);
                         costByDept[loc.department].labor += (hours * 50);
                    }
                 }
             }
        });

        const costAnalysis = Object.entries(costByDept).map(([name, costs]) => ({
            name,
            parts: Math.round(costs.parts),
            labor: Math.round(costs.labor)
        })).filter(c => c.parts > 0 || c.labor > 0).slice(0, 5);

        // 6. Capital Budget Forecast
        const currentYear = new Date().getFullYear();
        const budgetForecast = Array.from({length: 5}, (_, i) => {
            const year = currentYear + i;
            const replacementCost = assets
                .filter(a => {
                    const purchaseYear = new Date(a.purchase_date).getFullYear();
                    const eolYear = purchaseYear + (a.expected_lifespan || 10);
                    // Replace if EOL this year OR Risk > 80 this year
                    return eolYear === year || (a.risk_score > 80 && i === 0);
                })
                .reduce((sum, a) => sum + (a.purchase_cost || 5000), 0);
            return { year, amount: replacementCost };
        });

        // 7. User Error Analysis (Mock)
        const userErrors = workOrders
            .filter(wo => wo.failure_type === 'UserError')
            .reduce((acc, wo) => {
                const asset = assets.find(a => a.asset_id === wo.asset_id);
                if (asset) {
                    const loc = getLocations().find(l => l.location_id === asset.location_id);
                    const dept = loc?.department || 'Unknown';
                    acc[dept] = (acc[dept] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);
        
        const trainingData = Object.entries(userErrors).map(([dept, count]) => ({
            department: dept,
            errors: count,
            recommendation: count > 2 ? 'Schedule Training' : 'Monitor'
        }));

        return { mttrTrend, vendorData, tcoData, technicianStats, costAnalysis, budgetForecast, trainingData };
    }, [workOrders, users, assets, inventory]);

    // --- ACTIONS ---
    const handleGenerateImage = async () => {
        if (!newAssetForm.model) return;
        setIsGeneratingImage(true);
        const image = await generateAssetThumbnail(newAssetForm.model);
        if (image) setNewAssetForm(prev => ({ ...prev, image }));
        setIsGeneratingImage(false);
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddAsset({
            ...newAssetForm,
            status: AssetStatus.RUNNING,
            operating_hours: 0,
            risk_score: 0,
            nfc_tag_id: newAssetForm.asset_id,
            expected_lifespan: 10,
            warranty_expiration: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]
        } as Asset);
        setIsAddModalOpen(false);
    };

    const handleCreateWO = async () => {
        if (!newWOForm.assetId) return;
        await api.createWorkOrder({
            wo_id: Math.floor(Math.random() * 100000),
            asset_id: newWOForm.assetId,
            type: newWOForm.type,
            priority: newWOForm.priority,
            description: newWOForm.description,
            assigned_to_id: newWOForm.assignedToId ? parseInt(newWOForm.assignedToId) : undefined as any,
            status: newWOForm.assignedToId ? 'Assigned' : 'Open',
            created_at: new Date().toISOString()
        } as WorkOrder);
        refreshData();
        setIsCreateWOModalOpen(false);
        setNewWOForm({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' });
    };

    const handleAssign = async (wo: WorkOrder) => {
        if (!users || users.length === 0) return;
        setSelectedWOForAssignment(wo);
        const asset = assets.find(a => a.asset_id === wo.asset_id);
        const techs = users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER);
        if (asset) {
            const recommendations = recommendTechnicians(asset, techs, workOrders);
            setRecommendedTechs(recommendations);
        }
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = async () => {
        if (selectedWOForAssignment && selectedTechForAssignment) {
            await api.assignWorkOrder(selectedWOForAssignment.wo_id, parseInt(selectedTechForAssignment));
            refreshData();
            setIsAssignModalOpen(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const handleRestock = async () => {
        if (!selectedPartForRestock || restockQty <= 0) return;
        if (restockQty > 50 && !showRestockConfirm) {
            setShowRestockConfirm(true);
            return;
        }
        await api.restockPart(selectedPartForRestock.part_id, restockQty);
        refreshData();
        setRestockModalOpen(false);
        setRestockQty(0);
        setShowRestockConfirm(false);
    };

    const handleStartAudit = (dept: string) => {
        if (!dept) return;
        const deptAssets = assets.filter(a => getLocationName(a.location_id).includes(dept));
        if (deptAssets.length === 0) return;
        
        setActiveAudit({
            id: Date.now(),
            date: new Date().toISOString(),
            department: dept,
            total_expected: deptAssets.length,
            total_scanned: 0,
            missing_assets: deptAssets.map(a => a.asset_id),
            found_assets: [],
            status: 'In Progress'
        });
    };

    const handleSimulateScan = () => {
        if (activeAudit && activeAudit.missing_assets.length > 0) {
            const nextAssetId = activeAudit.missing_assets[0];
            handleRealScan(nextAssetId);
        }
    };

    const handleAiSearch = async () => {
        if (!aiQuery) return;
        setIsAiSearching(true);
        const docs = kbDocuments.map(d => d.title);
        const result = await searchKnowledgeBase(aiQuery, docs, language);
        setAiResult(result);
        setIsAiSearching(false);
    };

    const handlePrintReport = () => {
        window.print();
    };

    const openRoleEditor = (role: RoleDefinition) => {
        setEditingRole(role);
        setIsRoleEditorOpen(true);
    };

    const togglePermission = (resource: Resource, action: Action) => {
        if (!editingRole) return;
        const currentPermissions = editingRole.permissions[resource] || [];
        const newPermissions = currentPermissions.includes(action)
            ? currentPermissions.filter(a => a !== action)
            : [...currentPermissions, action];
        
        setEditingRole({
            ...editingRole,
            permissions: {
                ...editingRole.permissions,
                [resource]: newPermissions
            }
        });
    };

    const handleAddUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onAddUser) {
            onAddUser({
                user_id: Math.floor(Math.random() * 10000),
                ...newUserForm
            } as any);
        }
        setIsAddUserModalOpen(false);
    };

    // --- RENDER SECTIONS ---

    // 1. DASHBOARD
    if (currentView === 'dashboard') {
        const stats = {
            total: assets.length,
            down: assets.filter(a => a.status === AssetStatus.DOWN).length,
            maint: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length,
            running: assets.filter(a => a.status === AssetStatus.RUNNING).length,
            openWOs: workOrders.filter(w => w.status !== 'Closed').length
        };

        const chartData = [
            { name: t('running'), value: stats.running, color: '#10B981' },
            { name: t('down'), value: stats.down, color: '#EF4444' },
            { name: t('maintenance'), value: stats.maint, color: '#F59E0B' },
        ];

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_dashboard')}</h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsSimulationActive(!isSimulationActive)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isSimulationActive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}
                        >
                            <Activity size={16} className={isSimulationActive ? 'animate-pulse' : ''} />
                            {isSimulationActive ? 'Stop Sim' : 'Simulate Traffic'}
                        </button>
                    </div>
                </div>

                {/* Admin Only: Executive Overview */}
                {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 animate-in fade-in">
                        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">System Health</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="font-bold">Online</span>
                                </div>
                            </div>
                            <Server size={24} className="text-slate-500"/>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Financial Exposure</p>
                                <h4 className="font-black text-xl text-gray-900 mt-1">$4.2M</h4>
                            </div>
                            <Coins size={24} className="text-brand"/>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-text-muted text-xs font-bold uppercase tracking-wider">Active Users</p>
                                <h4 className="font-black text-xl text-gray-900 mt-1">{users.length}</h4>
                            </div>
                            <UsersIcon size={24} className="text-green-500"/>
                        </div>
                    </div>
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-xs font-bold uppercase">{t('total_assets')}</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.total}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand flex items-center justify-center"><Package size={24}/></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-xs font-bold uppercase">{t('open_tickets')}</p>
                            <h3 className="text-3xl font-black text-gray-900 mt-1">{stats.openWOs}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-warning flex items-center justify-center"><AlertTriangle size={24}/></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-xs font-bold uppercase">{t('uptime')}</p>
                            <h3 className="text-3xl font-black text-success mt-1">98.2%</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-green-50 text-success flex items-center justify-center"><Activity size={24}/></div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                        <div>
                            <p className="text-text-muted text-xs font-bold uppercase">{t('kpi_mttr')}</p>
                            <h3 className="text-3xl font-black text-indigo-600 mt-1">4.2h</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Clock size={24}/></div>
                    </div>
                </div>

                {/* 3D Map & Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-brand"/> {t('dept_map')}</h3>
                            <div className="flex gap-2 text-[10px] font-bold uppercase text-gray-500">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Running</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Maint</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Down</span>
                            </div>
                        </div>
                        <div className="relative flex-1 bg-slate-50 overflow-hidden group perspective-1000">
                            {/* Isometric Grid */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                                style={{backgroundImage: 'linear-gradient(0deg, transparent 24%, #000 25%, #000 26%, transparent 27%, transparent 74%, #000 75%, #000 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #000 25%, #000 26%, transparent 27%, transparent 74%, #000 75%, #000 76%, transparent 77%, transparent)', backgroundSize: '50px 50px'}}>
                            </div>
                            
                            <div className="absolute inset-0 flex items-center justify-center transform scale-90 hover:scale-95 transition-transform duration-500 ease-out origin-center">
                                <div className="relative w-[600px] h-[400px] transform rotate-x-60 rotate-z-45 transition-transform duration-500">
                                    {getLocations().map((loc, idx) => {
                                        const deptAssets = assets.filter(a => a.location_id === loc.location_id);
                                        const hasDown = deptAssets.some(a => a.status === AssetStatus.DOWN);
                                        const hasMaint = deptAssets.some(a => a.status === AssetStatus.UNDER_MAINT);
                                        const statusColor = hasDown ? 'bg-red-500' : hasMaint ? 'bg-amber-500' : 'bg-emerald-500';
                                        
                                        const left = (idx % 3) * 35 + '%';
                                        const top = Math.floor(idx / 3) * 45 + '%';

                                        return (
                                            <div 
                                                key={loc.location_id}
                                                onClick={() => setSelectedMapZone(loc.department)}
                                                className={`absolute w-32 h-24 rounded-lg shadow-xl border-2 border-white/50 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group/zone flex items-center justify-center ${hasDown ? 'bg-red-50 border-red-200' : hasMaint ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}
                                                style={{ left, top }}
                                            >
                                                {/* 3D Sides */}
                                                <div className={`absolute top-full left-0 w-full h-4 ${hasDown ? 'bg-red-200' : 'bg-gray-200'} origin-top transform -skew-x-45`}></div>
                                                <div className={`absolute top-0 right-[-16px] w-4 h-full ${hasDown ? 'bg-red-300' : 'bg-gray-300'} origin-left transform skew-y-45`}></div>
                                                
                                                <div className="text-center transform -rotate-45">
                                                    <div className="text-xs font-bold text-gray-800">{loc.department}</div>
                                                    <div className="flex justify-center gap-1 mt-1">
                                                        {deptAssets.slice(0, 3).map((_, i) => (
                                                            <div key={i} className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`}></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Zone Detail Panel */}
                            {selectedMapZone && (
                                <div className="absolute top-4 right-4 w-64 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-border p-4 animate-in slide-in-from-right-10">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-gray-900">{selectedMapZone}</h4>
                                        <button onClick={() => setSelectedMapZone(null)}><X size={14}/></button>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {assets.filter(a => getLocationName(a.location_id).includes(selectedMapZone)).map(a => (
                                            <div key={a.asset_id} className="text-xs flex justify-between p-2 bg-white rounded border border-gray-100">
                                                <span>{a.name}</span>
                                                <span className={`font-bold ${a.status === 'Down' ? 'text-red-500' : 'text-green-500'}`}>{a.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Charts */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[240px]">
                            <h3 className="font-bold text-gray-900 text-sm mb-4">{t('chart_asset_status')}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[240px]">
                            <h3 className="font-bold text-gray-900 text-sm mb-4">{t('chart_mttr_trend')}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData.mttrTrend}>
                                    <defs>
                                        <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false}/>
                                    <YAxis fontSize={10} tickLine={false} axisLine={false}/>
                                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Area type="monotone" dataKey="hours" stroke="#6366f1" fillOpacity={1} fill="url(#colorMttr)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. ASSETS
    if (currentView === 'assets') {
        const filteredAssets = assets.filter(a => 
            a.name.toLowerCase().includes(assetSearch.toLowerCase()) || 
            a.model.toLowerCase().includes(assetSearch.toLowerCase()) ||
            a.asset_id.toLowerCase().includes(assetSearch.toLowerCase()) ||
            a.serial_number?.toLowerCase().includes(assetSearch.toLowerCase())
        );

        if (selectedAsset) {
            return (
                <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-gray-500 hover:text-brand font-bold transition-colors">
                            <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
                        </button>
                        <button onClick={() => window.print()} className="btn-secondary text-xs py-2 px-3">
                            <Printer size={16}/> Print Datasheet
                        </button>
                    </div>

                    {/* Hero Card */}
                    <div className="bg-white rounded-2xl border border-border shadow-soft p-6 flex flex-col md:flex-row gap-8">
                        <div className="w-48 h-48 bg-gray-50 rounded-xl border border-border shrink-0 flex items-center justify-center p-2 overflow-hidden">
                            {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover rounded-lg"/> : <ImageIcon size={48} className="text-gray-300"/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900">{selectedAsset.name}</h1>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="bg-gray-100 text-gray-700 font-mono text-sm px-2 py-1 rounded font-bold">{selectedAsset.asset_id}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedAsset.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedAsset.status}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Risk Score</div>
                                    <div className={`text-2xl font-black ${selectedAsset.risk_score > 70 ? 'text-red-600' : 'text-green-600'}`}>{selectedAsset.risk_score}/100</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-border">
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('manufacturer')}</div>
                                    <div className="font-semibold text-gray-900">{selectedAsset.manufacturer}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('form_model')}</div>
                                    <div className="font-semibold text-gray-900">{selectedAsset.model}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('location')}</div>
                                    <div className="font-semibold text-gray-900">{getLocationName(selectedAsset.location_id)}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('warranty_exp')}</div>
                                    <div className="font-semibold text-gray-900">{selectedAsset.warranty_expiration}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white rounded-2xl border border-border shadow-soft min-h-[400px]">
                        <div className="flex border-b border-border">
                            {['overview', 'history', 'docs'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setAssetDetailTab(tab as any)}
                                    className={`flex-1 py-4 text-sm font-bold capitalize transition-colors ${assetDetailTab === tab ? 'text-brand border-b-2 border-brand bg-brand/5' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {tab === 'docs' ? t('tab_docs') : tab === 'history' ? t('maintenance_history') : t('asset_info')}
                                </button>
                            ))}
                        </div>
                        <div className="p-6">
                            {assetDetailTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Lifecycle Data</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="block text-gray-500 text-xs">Purchase Date</span>{selectedAsset.purchase_date}</div>
                                            <div><span className="block text-gray-500 text-xs">Install Date</span>{selectedAsset.installation_date || 'N/A'}</div>
                                            <div><span className="block text-gray-500 text-xs">Life Expectancy</span>{selectedAsset.expected_lifespan} Years</div>
                                            <div><span className="block text-gray-500 text-xs">Accumulated Cost</span>${selectedAsset.accumulated_maintenance_cost}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Live Readings (Mock)</h4>
                                        <div className="h-40 w-full bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400">
                                            <Activity size={24} className="mr-2"/> IoT Telemetry Feed
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {assetDetailTab === 'history' && (
                                <div className="space-y-4">
                                    {workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id).map(wo => (
                                        <div key={wo.wo_id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                            <div>
                                                <div className="font-bold text-gray-900">{wo.type} - #{wo.wo_id}</div>
                                                <div className="text-xs text-gray-500">{new Date(wo.created_at).toLocaleDateString()} • {users.find(u => u.user_id === wo.assigned_to_id)?.name}</div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-bold rounded ${wo.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{wo.status}</span>
                                        </div>
                                    ))}
                                    {workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id).length === 0 && (
                                        <div className="text-center text-gray-400 py-8">No maintenance history found.</div>
                                    )}
                                </div>
                            )}

                            {assetDetailTab === 'docs' && (
                                <div className="space-y-3">
                                    {getAssetDocuments(selectedAsset.asset_id).map(doc => (
                                        <div key={doc.doc_id} className="flex justify-between items-center p-3 border border-gray-200 rounded-xl hover:border-brand transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <FileText className="text-brand" size={20}/>
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-brand">{doc.title}</span>
                                            </div>
                                            <button className="text-gray-400 hover:text-brand"><Download size={18}/></button>
                                        </div>
                                    ))}
                                    {getAssetDocuments(selectedAsset.asset_id).length === 0 && (
                                        <div className="text-center text-gray-400 py-8">No documents linked.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_assets')}</h2>
                    <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={18}/> {t('add_equipment')}</button>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-brand transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder={t('search_assets')}
                        className="input-modern pl-12 h-12 text-base"
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                    />
                </div>

                {/* Asset List */}
                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('asset_info')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('form_model')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('form_sn')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('location')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('status')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAssets.map(asset => (
                                <tr key={asset.asset_id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden">
                                                {asset.image ? <img src={asset.image} className="w-full h-full object-cover"/> : <Box size={18} className="text-gray-400"/>}
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">{asset.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{asset.model}</td>
                                    <td className="p-4 text-sm font-mono text-gray-500">{asset.asset_id}</td>
                                    <td className="p-4 text-sm text-gray-600">{getLocationName(asset.location_id)}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${asset.status === 'Running' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => setSelectedAsset(asset)}
                                            className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                        >
                                            <ArrowRight size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Asset Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4">{t('modal_add_title')}</h3>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder={t('form_name')} className="input-modern" value={newAssetForm.name} onChange={e => setNewAssetForm({...newAssetForm, name: e.target.value})} required/>
                                    <input placeholder={t('form_model')} className="input-modern" value={newAssetForm.model} onChange={e => setNewAssetForm({...newAssetForm, model: e.target.value})} required/>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input placeholder="Image URL (Optional)" className="input-modern flex-1" value={newAssetForm.image} onChange={e => setNewAssetForm({...newAssetForm, image: e.target.value})}/>
                                    <button type="button" onClick={handleGenerateImage} disabled={isGeneratingImage || !newAssetForm.model} className="btn-secondary py-2 px-3 text-xs">
                                        {isGeneratingImage ? 'Generating...' : '✨ AI Gen'}
                                    </button>
                                </div>
                                {newAssetForm.image && <div className="h-32 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200"><img src={newAssetForm.image} className="w-full h-full object-cover"/></div>}
                                <input placeholder={t('form_sn')} className="input-modern" value={newAssetForm.asset_id} onChange={e => setNewAssetForm({...newAssetForm, asset_id: e.target.value})} required/>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary">{t('btn_cancel')}</button>
                                    <button type="submit" className="btn-primary">{t('btn_save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. MAINTENANCE
    if (currentView === 'maintenance') {
        const filteredWOs = workOrders.filter(wo => {
            if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
            if (maintenanceFilterStatus !== 'all' && wo.status.toLowerCase() !== maintenanceFilterStatus.toLowerCase()) return false;
            if (maintenanceFilterTechnician !== 'all' && wo.assigned_to_id.toString() !== maintenanceFilterTechnician) return false;
            if (maintenanceFilterAsset) {
                const asset = assets.find(a => a.asset_id === wo.asset_id);
                if (!asset?.name.toLowerCase().includes(maintenanceFilterAsset.toLowerCase())) return false;
            }
            return true;
        });

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_maintenance')}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setIsCreateWOModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={18}/> {t('create_wo')}</button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-border shadow-sm">
                    <select className="input-modern py-2 text-xs w-32" value={maintenanceFilterPriority} onChange={e => setMaintenanceFilterPriority(e.target.value)}>
                        <option value="all">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                    <select className="input-modern py-2 text-xs w-32" value={maintenanceFilterStatus} onChange={e => setMaintenanceFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="Open">Open</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Closed">Closed</option>
                    </select>
                    <select className="input-modern py-2 text-xs w-40" value={maintenanceFilterTechnician} onChange={e => setMaintenanceFilterTechnician(e.target.value)}>
                        <option value="all">All Technicians</option>
                        {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(u => (
                            <option key={u.user_id} value={u.user_id}>{u.name}</option>
                        ))}
                    </select>
                    <input 
                        className="input-modern py-2 text-xs w-48"
                        placeholder="Filter by Asset Name..."
                        value={maintenanceFilterAsset}
                        onChange={e => setMaintenanceFilterAsset(e.target.value)}
                    />
                    <div className="flex bg-gray-100 p-1 rounded-lg ml-auto">
                        <button onClick={() => setMaintenanceViewMode('kanban')} className={`p-2 rounded ${maintenanceViewMode === 'kanban' ? 'bg-white shadow text-brand' : 'text-gray-500'}`}><LayoutGrid size={18}/></button>
                        <button onClick={() => setMaintenanceViewMode('list')} className={`p-2 rounded ${maintenanceViewMode === 'list' ? 'bg-white shadow text-brand' : 'text-gray-500'}`}><List size={18}/></button>
                    </div>
                </div>

                {/* Kanban View */}
                {maintenanceViewMode === 'kanban' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
                        {['Open', 'Assigned', 'In Progress', 'Closed'].map(status => (
                            <div key={status} className="bg-gray-50/50 rounded-2xl p-3 border border-border min-w-[280px]">
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{status}</h4>
                                    <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{filteredWOs.filter(w => w.status === status).length}</span>
                                </div>
                                <div className="space-y-3">
                                    {filteredWOs.filter(w => w.status === status).map(wo => {
                                        const asset = assets.find(a => a.asset_id === wo.asset_id);
                                        return (
                                            <div key={wo.wo_id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${wo.priority === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{wo.priority}</span>
                                                    <span className="text-xs font-mono text-gray-400">#{wo.wo_id}</span>
                                                </div>
                                                <div className="font-bold text-gray-900 text-sm mb-1">{asset?.name || 'Unknown Asset'}</div>
                                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{wo.description}</p>
                                                <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                                                    <div className="flex -space-x-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                            {wo.assigned_to_id ? users.find(u => u.user_id === wo.assigned_to_id)?.name[0] : '?'}
                                                        </div>
                                                    </div>
                                                    {status === 'Open' && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleAssign(wo); }}
                                                            className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded hover:bg-brand hover:text-white transition-colors"
                                                        >
                                                            {t('assign')}
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
                )}

                {/* List View */}
                {maintenanceViewMode === 'list' && (
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Asset</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Priority</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Assigned To</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredWOs.map(wo => (
                                    <tr key={wo.wo_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }}>
                                        <td className="p-4 text-sm font-mono text-gray-500">#{wo.wo_id}</td>
                                        <td className="p-4 text-sm font-bold text-gray-900">{assets.find(a => a.asset_id === wo.asset_id)?.name}</td>
                                        <td className="p-4 text-sm text-gray-600 truncate max-w-xs">{wo.description}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${wo.priority === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{wo.priority}</span></td>
                                        <td className="p-4 text-sm text-gray-600">{users.find(u => u.user_id === wo.assigned_to_id)?.name || '-'}</td>
                                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">{wo.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modals */}
                {isCreateWOModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('modal_create_wo')}</h3>
                            <div className="space-y-4">
                                <select className="input-modern" value={newWOForm.assetId} onChange={e => setNewWOForm({...newWOForm, assetId: e.target.value})}>
                                    <option value="">Select Asset</option>
                                    {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.name}</option>)}
                                </select>
                                <select className="input-modern" value={newWOForm.priority} onChange={e => setNewWOForm({...newWOForm, priority: e.target.value as Priority})}>
                                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <textarea className="input-modern" placeholder={t('wo_description')} value={newWOForm.description} onChange={e => setNewWOForm({...newWOForm, description: e.target.value})}/>
                                <button onClick={handleCreateWO} className="w-full btn-primary">{t('btn_dispatch')}</button>
                                <button onClick={() => setIsCreateWOModalOpen(false)} className="w-full btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {isAssignModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('assign_technician')}</h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-sm font-bold text-gray-900">{assets.find(a => a.asset_id === selectedWOForAssignment?.asset_id)?.name}</div>
                                    <div className="text-xs text-gray-500">{selectedWOForAssignment?.description}</div>
                                </div>
                                
                                {recommendedTechs.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-brand uppercase mb-2">AI Recommendations</div>
                                        <div className="space-y-2">
                                            {recommendedTechs.slice(0, 2).map((rec, i) => (
                                                <div 
                                                    key={i} 
                                                    onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())}
                                                    className={`p-2 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${selectedTechForAssignment === rec.user.user_id.toString() ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/50'}`}
                                                >
                                                    <div>
                                                        <div className="font-bold text-sm">{rec.user.name}</div>
                                                        <div className="text-[10px] text-gray-500">{rec.reason}</div>
                                                    </div>
                                                    <div className="text-xs font-bold text-green-600">{rec.score} pts</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Technician</label>
                                    <select className="input-modern" value={selectedTechForAssignment} onChange={(e) => setSelectedTechForAssignment(e.target.value)}>
                                        <option value="">Select...</option>
                                        {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(u => (
                                            <option key={u.user_id} value={u.user_id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button onClick={handleAssignSubmit} className="w-full btn-primary">{t('btn_assign_confirm')}</button>
                                <button onClick={() => setIsAssignModalOpen(false)} className="w-full btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {isWorkOrderDetailsModalOpen && selectedWorkOrderForDetails && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-gray-900">Work Order #{selectedWorkOrderForDetails.wo_id}</h3>
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${selectedWorkOrderForDetails.status === 'Closed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{selectedWorkOrderForDetails.status}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Created: {new Date(selectedWorkOrderForDetails.created_at).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setIsWorkOrderDetailsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20}/></button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Asset Details</h4>
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                                            <Package size={24} className="text-gray-400"/>
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.name}</div>
                                            <div className="text-xs text-gray-600">{assets.find(a => a.asset_id === selectedWorkOrderForDetails.asset_id)?.model}</div>
                                            <div className="text-xs font-mono text-gray-400 mt-1">{selectedWorkOrderForDetails.asset_id}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Issue Description</h4>
                                    <p className="text-sm text-gray-700 bg-white border border-gray-200 p-3 rounded-lg">{selectedWorkOrderForDetails.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Assigned Technician</h4>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
                                                {users.find(u => u.user_id === selectedWorkOrderForDetails.assigned_to_id)?.name[0]}
                                            </div>
                                            <span className="text-sm font-medium">{users.find(u => u.user_id === selectedWorkOrderForDetails.assigned_to_id)?.name || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Priority</h4>
                                        <span className={`text-sm font-bold ${selectedWorkOrderForDetails.priority === 'Critical' ? 'text-red-600' : 'text-blue-600'}`}>{selectedWorkOrderForDetails.priority}</span>
                                    </div>
                                </div>

                                {selectedWorkOrderForDetails.parts_used && selectedWorkOrderForDetails.parts_used.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Parts Consumed</h4>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Part</th>
                                                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {selectedWorkOrderForDetails.parts_used.map((p, idx) => {
                                                        const part = inventory.find(i => i.part_id === p.part_id);
                                                        return (
                                                            <tr key={idx}>
                                                                <td className="px-3 py-2">{part?.part_name || `Part #${p.part_id}`}</td>
                                                                <td className="px-3 py-2 text-center">{p.quantity}</td>
                                                                <td className="px-3 py-2 text-right">${(part?.cost || 0) * p.quantity}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 4. INVENTORY
    if (currentView === 'inventory') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_inventory')}</h2>
                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('part_name')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Stock</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Reorder Point</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Cost</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inventory.map(part => (
                                <tr key={part.part_id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-900 text-sm">{part.part_name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${part.current_stock <= part.min_reorder_level ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                            {part.current_stock} Units
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{part.min_reorder_level}</td>
                                    <td className="p-4 text-sm text-gray-600">${part.cost}</td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => { setSelectedPartForRestock(part); setRestockModalOpen(true); }}
                                            className="text-xs font-bold text-brand hover:underline"
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
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('restock_modal_title')}</h3>
                            <p className="text-sm text-gray-600 mb-4">{selectedPartForRestock.part_name}</p>
                            <input 
                                type="number" 
                                className="input-modern mb-4"
                                placeholder={t('restock_qty')}
                                value={restockQty} 
                                onChange={(e) => setRestockQty(parseInt(e.target.value))}
                            />
                            {showRestockConfirm ? (
                                <div className="space-y-3">
                                    <p className="text-red-500 text-xs font-bold">{t('confirm_large_restock_msg').replace('{qty}', restockQty.toString())}</p>
                                    <button onClick={handleRestock} className="w-full btn-primary bg-red-600 hover:bg-red-700">Confirm Large Restock</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setRestockModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                    <button onClick={handleRestock} className="flex-1 btn-primary">{t('restock_btn')}</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 5. CALIBRATION
    if (currentView === 'calibration') {
        const overdue = assets.filter(a => a.next_calibration_date && new Date(a.next_calibration_date) < new Date());
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_calibration')}</h2>
                
                {/* Alert Box */}
                {overdue.length > 0 && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
                        <AlertCircle className="text-red-500" size={24}/>
                        <div>
                            <h4 className="font-bold text-red-800">Compliance Alert</h4>
                            <p className="text-sm text-red-600">{overdue.length} assets are overdue for calibration.</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('asset_info')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('last_cal')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('next_due')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">{t('status')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {assets.filter(a => a.next_calibration_date).map(asset => {
                                const isOverdue = new Date(asset.next_calibration_date!) < new Date();
                                return (
                                    <tr key={asset.asset_id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-900 text-sm">{asset.name} <span className="text-gray-400 font-normal ml-1">({asset.asset_id})</span></td>
                                        <td className="p-4 text-sm text-gray-600">{asset.last_calibration_date}</td>
                                        <td className="p-4 text-sm text-gray-600">{asset.next_calibration_date}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {isOverdue ? t('cal_overdue') : t('cal_compliant')}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 6. ANALYSIS
    if (currentView === 'analysis') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_analysis')}</h2>
                <div className="flex gap-2 bg-white p-1 rounded-xl border border-border shadow-sm mb-4 overflow-x-auto">
                    {['tab_analytics', 'tab_financial', 'tab_vendor', 'tab_training', 'tab_kb', 'tab_gen_report', 'tab_budget'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            {t(tab as any)}
                        </button>
                    ))}
                </div>

                {activeTab === 'tab_analytics' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-gray-900 mb-4">MTTR Trend (6 Months)</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={analyticsData.mttrTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12}/>
                                    <YAxis axisLine={false} tickLine={false} fontSize={12}/>
                                    <Tooltip/>
                                    <Line type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-gray-900 mb-4">Technician Performance</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analyticsData.technicianStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12}/>
                                    <YAxis axisLine={false} tickLine={false} fontSize={12}/>
                                    <Tooltip cursor={{fill: 'transparent'}}/>
                                    <Legend/>
                                    <Bar dataKey="jobs" fill="#2563EB" radius={[4, 4, 0, 0]} name="Jobs Done"/>
                                    <Bar dataKey="mttr" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Avg MTTR (h)"/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeTab === 'tab_financial' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-gray-900 mb-4">Cost Analysis by Department</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analyticsData.costAnalysis} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f1f5f9"/>
                                        <XAxis type="number" axisLine={false} tickLine={false} fontSize={12}/>
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={100}/>
                                        <Tooltip cursor={{fill: 'transparent'}}/>
                                        <Legend/>
                                        <Bar dataKey="parts" stackId="a" fill="#2563EB" radius={[0, 4, 4, 0]} name="Parts Cost"/>
                                        <Bar dataKey="labor" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} name="Labor Cost"/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-gray-900 mb-4">Total Cost of Ownership (Top 5)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analyticsData.tcoData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} angle={-45} textAnchor="end" height={60}/>
                                        <YAxis axisLine={false} tickLine={false} fontSize={12}/>
                                        <Tooltip/>
                                        <Legend/>
                                        <Bar dataKey="purchase" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Purchase Price"/>
                                        <Bar dataKey="maintenance" fill="#ef4444" radius={[4, 4, 0, 0]} name="Maint. Cost"/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tab_vendor' && (
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Vendor</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Reliability Score</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Defect Rate</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Recommendation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {analyticsData.vendorData.map((v: any) => (
                                    <tr key={v.name} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-900">{v.name}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full ${v.score > 80 ? 'bg-green-500' : v.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${v.score}%`}}></div>
                                                </div>
                                                <span className="text-xs font-bold">{v.score.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{v.defects} Failures / {v.totalAssets} Units</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${v.score > 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {v.score > 70 ? 'Recommended' : 'Review Contract'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'tab_training' && (
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex items-center justify-center min-h-[300px] text-center">
                        <div>
                            <GraduationCap size={48} className="text-brand/30 mx-auto mb-4"/>
                            <h3 className="text-lg font-bold text-gray-900">Training Insights</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">No user-error patterns detected requiring intervention at this time.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'tab_kb' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input 
                                className="input-modern flex-1" 
                                placeholder="Describe fault or enter error code for AI analysis..." 
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                            />
                            <button 
                                onClick={handleAiSearch}
                                disabled={isAiSearching}
                                className="btn-primary"
                            >
                                {isAiSearching ? 'Analyzing...' : 'AI Search'}
                            </button>
                        </div>
                        
                        {aiResult && (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-in slide-in-from-top-2">
                                <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-2"><Sparkles size={16}/> AI Analysis</h4>
                                <p className="text-sm text-indigo-800 mb-3">{aiResult.explanation}</p>
                                <div className="bg-white p-3 rounded-lg border border-indigo-100">
                                    <div className="text-xs font-bold text-indigo-500 uppercase mb-1">Suggested Solution</div>
                                    <p className="text-sm text-gray-800">{aiResult.solution}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {filteredKbDocs.map(doc => (
                                <div key={doc.id} className="p-4 bg-white rounded-xl border border-gray-200 hover:border-brand transition-all cursor-pointer flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <Book size={20} className="text-brand"/>
                                        <span className="font-bold text-gray-800 text-sm group-hover:text-brand">{doc.title}</span>
                                    </div>
                                    <Download size={18} className="text-gray-400 hover:text-brand"/>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'tab_gen_report' && (
                    <div className="space-y-6">
                        {/* Controls - Hidden on Print */}
                        <div className="bg-white p-4 rounded-2xl border border-border shadow-soft flex items-center justify-between print:hidden">
                             <div>
                                <h3 className="font-bold text-gray-900">Job Order Report Generator</h3>
                                <p className="text-sm text-gray-500">Generate compliance-ready PDF reports.</p>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => setSelectedJobReport(getDetailedReports()[0])} className="btn-secondary text-sm">Load Sample CM Report</button>
                                 {selectedJobReport && (
                                     <button onClick={handlePrintReport} className="btn-primary text-sm flex items-center gap-2">
                                        <Printer size={16} /> Print / Save PDF
                                     </button>
                                 )}
                             </div>
                        </div>

                        {/* Report Preview / Print Area */}
                        {selectedJobReport ? (
                            <div className="bg-white p-8 shadow-2xl mx-auto print:shadow-none print:w-full print:max-w-none print:p-0 print:m-0" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
                                {/* Print CSS Styles */}
                                <style>{`
                                    @media print {
                                        @page { size: A4; margin: 10mm; }
                                        body * { visibility: hidden; }
                                        #printable-report, #printable-report * { visibility: visible; }
                                        #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
                                        .no-print { display: none !important; }
                                    }
                                `}</style>

                                <div id="printable-report" className="font-serif text-black">
                                    {/* Header */}
                                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                                        <div>
                                            <h1 className="text-2xl font-bold uppercase tracking-wider">Job Order Report</h1>
                                            <div className="text-sm mt-1">First Gulf Company | Kingdom of Saudi Arabia</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold uppercase text-gray-500">Report ID</div>
                                            <div className="font-mono font-bold text-lg">{selectedJobReport.report_id}</div>
                                        </div>
                                    </div>

                                    {/* Section I: Job ID */}
                                    <div className="grid grid-cols-3 gap-4 mb-6 border border-black p-4">
                                        <div>
                                            <div className="text-xs font-bold uppercase text-gray-500 mb-1">Job Order No.</div>
                                            <div className="font-bold">{selectedJobReport.job_order_no}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase text-gray-500 mb-1">Control No.</div>
                                            <div className="font-bold">{selectedJobReport.control_no}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase text-gray-500 mb-1">Risk Factor</div>
                                            <div className="font-bold">{selectedJobReport.risk_factor}</div>
                                        </div>
                                    </div>

                                    {/* Section II: Asset & Location */}
                                    <div className="mb-6">
                                        <h3 className="font-bold uppercase bg-gray-100 p-2 border-t border-l border-r border-black text-sm">Asset & Location Details</h3>
                                        <div className="border border-black grid grid-cols-2">
                                            <div className="p-2 border-r border-b border-black">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Equipment Name</span>
                                                {selectedJobReport.asset.name}
                                            </div>
                                            <div className="p-2 border-b border-black">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Manufacturer</span>
                                                {selectedJobReport.asset.manufacturer}
                                            </div>
                                            <div className="p-2 border-r border-b border-black">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Model</span>
                                                {selectedJobReport.asset.model}
                                            </div>
                                            <div className="p-2 border-b border-black">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Serial No.</span>
                                                {selectedJobReport.asset.serial_no}
                                            </div>
                                            <div className="p-2 border-r border-black">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Department</span>
                                                {selectedJobReport.location.department}
                                            </div>
                                            <div className="p-2 border-black">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Location / Room</span>
                                                {selectedJobReport.location.room}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section III: Fault & Remedy */}
                                    <div className="mb-6">
                                        <h3 className="font-bold uppercase bg-gray-100 p-2 border-t border-l border-r border-black text-sm">Fault & Remedy</h3>
                                        <div className="border border-black p-4 space-y-4">
                                            <div className="flex justify-between">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-gray-500">Failed Date</span>
                                                    <div className="font-bold">{selectedJobReport.fault_details.failed_date}</div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-gray-500">Repair Date</span>
                                                    <div className="font-bold">{selectedJobReport.fault_details.repair_date}</div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-gray-500">Technician</span>
                                                    <div className="font-bold">{selectedJobReport.fault_details.technician_name}</div>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Fault Description</span>
                                                <p className="text-sm">{selectedJobReport.fault_details.fault_description}</p>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-gray-500">Work Done / Remedy</span>
                                                <p className="text-sm">{selectedJobReport.fault_details.remedy_work_done}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section IV: QC Analysis */}
                                    <div className="mb-6">
                                        <h3 className="font-bold uppercase bg-gray-100 p-2 border-t border-l border-r border-black text-sm">Quality Control Analysis</h3>
                                        <div className="border border-black p-4 grid grid-cols-4 gap-4 text-xs">
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedJobReport.qc_analysis.need_calibration} readOnly/> Need Calibration</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedJobReport.qc_analysis.user_errors} readOnly/> User Errors</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedJobReport.qc_analysis.unrepairable} readOnly/> Unrepairable</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" checked={selectedJobReport.qc_analysis.incident} readOnly/> Incident</label>
                                        </div>
                                    </div>

                                    {/* Section V: Approvals */}
                                    <div className="mt-8 border-t-2 border-black pt-6">
                                        <div className="grid grid-cols-3 gap-8 text-center">
                                            <div>
                                                <div className="h-16 border-b border-gray-400 mb-2 flex items-end justify-center pb-2">
                                                    <span className="font-script text-xl">{selectedJobReport.approvals.dept_head.name}</span>
                                                </div>
                                                <div className="text-xs font-bold uppercase">Department Head</div>
                                                <div className="text-[10px] text-gray-500">{selectedJobReport.approvals.dept_head.date}</div>
                                            </div>
                                            <div>
                                                <div className="h-16 border-b border-gray-400 mb-2 flex items-end justify-center pb-2">
                                                    <span className="font-script text-xl">{selectedJobReport.approvals.site_supervisor.name}</span>
                                                </div>
                                                <div className="text-xs font-bold uppercase">Site Supervisor</div>
                                                <div className="text-[10px] text-gray-500">{selectedJobReport.approvals.site_supervisor.date}</div>
                                            </div>
                                            <div>
                                                <div className="h-16 border-b border-gray-400 mb-2 flex items-end justify-center pb-2">
                                                    <span className="font-script text-xl">{selectedJobReport.approvals.site_admin.name}</span>
                                                </div>
                                                <div className="text-xs font-bold uppercase">Site Admin</div>
                                                <div className="text-[10px] text-gray-500">{selectedJobReport.approvals.site_admin.date}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                                <FileText size={48} className="mb-4 opacity-50"/>
                                <p>No report loaded.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tab_budget' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Coins size={20} className="text-brand"/> {t('forecast_5y')}
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analyticsData.budgetForecast}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} fontSize={12}/>
                                    <YAxis axisLine={false} tickLine={false} fontSize={12}/>
                                    <Tooltip cursor={{fill: 'transparent'}}/>
                                    <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} name="Estimated Replacement Cost ($)"/>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                {analyticsData.budgetForecast.map(item => (
                                    <div key={item.year} className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                        <div className="text-xs font-bold text-gray-500 uppercase">{item.year}</div>
                                        <div className="text-xl font-black text-gray-900">${item.amount.toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 7. USERS & ROLES
    if (currentView === 'users' && isAdmin) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_users')}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setUserMgmtTab('users')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${userMgmtTab === 'users' ? 'bg-brand text-white' : 'text-gray-500 bg-gray-100'}`}>Users</button>
                        <button onClick={() => setUserMgmtTab('roles')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${userMgmtTab === 'roles' ? 'bg-brand text-white' : 'text-gray-500 bg-gray-100'}`}>Roles & Permissions</button>
                    </div>
                </div>

                {userMgmtTab === 'users' ? (
                    <>
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setIsAddUserModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><UserPlus size={18}/> {t('add_user')}</button>
                        </div>
                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_name')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_role')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_dept')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_email')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(u => (
                                        <tr key={u.user_id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-900 text-sm">{u.name}</td>
                                            <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">{u.role}</span></td>
                                            <td className="p-4 text-sm text-gray-600">{u.department || '-'}</td>
                                            <td className="p-4 text-sm text-gray-600">{u.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roles.map(role => (
                            <div key={role.id} className="bg-white p-6 rounded-2xl border border-border shadow-soft hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-brand/10 text-brand rounded-xl">
                                        <ShieldCheckIcon size={24}/>
                                    </div>
                                    {role.is_system_role && <span className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold px-2 py-1 rounded">System</span>}
                                </div>
                                <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                                <p className="text-sm text-gray-500 mt-1 mb-4 h-10">{role.description}</p>
                                <button 
                                    onClick={() => openRoleEditor(role)}
                                    className="w-full btn-secondary text-sm"
                                >
                                    Edit Permissions
                                </button>
                            </div>
                        ))}
                        <button className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 hover:text-brand hover:border-brand hover:bg-brand/5 transition-all">
                            <Plus size={32} className="mb-2"/>
                            <span className="font-bold text-sm">Create Custom Role</span>
                        </button>
                    </div>
                )}

                {/* Role Editor Modal */}
                {isRoleEditorOpen && editingRole && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Edit Permissions: {editingRole.name}</h3>
                                <button onClick={() => setIsRoleEditorOpen(false)}><X size={20}/></button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3 font-bold text-gray-600">Resource</th>
                                            <th className="p-3 text-center font-bold text-gray-600">View</th>
                                            <th className="p-3 text-center font-bold text-gray-600">Create</th>
                                            <th className="p-3 text-center font-bold text-gray-600">Edit</th>
                                            <th className="p-3 text-center font-bold text-gray-600">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(['assets', 'work_orders', 'inventory', 'reports', 'users', 'settings'] as Resource[]).map(res => (
                                            <tr key={res}>
                                                <td className="p-3 font-bold text-gray-800 capitalize">{res.replace('_', ' ')}</td>
                                                {(['view', 'create', 'edit', 'delete'] as Action[]).map(act => {
                                                    const isChecked = editingRole.permissions[res]?.includes(act);
                                                    return (
                                                        <td key={act} className="p-3 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked} 
                                                                onChange={() => togglePermission(res, act)}
                                                                className="rounded border-gray-300 text-brand focus:ring-brand w-4 h-4"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setIsRoleEditorOpen(false)} className="btn-secondary">Cancel</button>
                                <button onClick={() => { /* Save logic would go here via API */ setIsRoleEditorOpen(false); }} className="btn-primary">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('modal_add_user')}</h3>
                            <form onSubmit={handleAddUserSubmit} className="space-y-3">
                                <input placeholder={t('user_name')} className="input-modern" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} required/>
                                <input placeholder={t('user_email')} className="input-modern" type="email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} required/>
                                <input placeholder={t('user_phone')} className="input-modern" value={newUserForm.phone} onChange={e => setNewUserForm({...newUserForm, phone: e.target.value})}/>
                                <input placeholder={t('user_password')} className="input-modern" type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} required/>
                                <div className="grid grid-cols-2 gap-3">
                                    <select className="input-modern" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}>
                                        <option value={UserRole.TECHNICIAN}>{UserRole.TECHNICIAN}</option>
                                        <option value={UserRole.ENGINEER}>{UserRole.ENGINEER}</option>
                                        <option value={UserRole.SUPERVISOR}>{UserRole.SUPERVISOR}</option>
                                        <option value={UserRole.NURSE}>{UserRole.NURSE}</option>
                                    </select>
                                    <input placeholder={t('user_dept')} className="input-modern" value={newUserForm.department} onChange={e => setNewUserForm({...newUserForm, department: e.target.value})}/>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="btn-secondary">{t('btn_cancel')}</button>
                                    <button type="submit" className="btn-primary">{t('btn_create_user')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 8. RFID
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_rfid')}</h2>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${zebraStatus !== 'disconnected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${zebraStatus !== 'disconnected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        {zebraStatus === 'disconnected' ? 'Scanner Disconnected' : 'Zebra RFD8500 Connected'}
                    </div>
                </div>

                <div className="bg-white p-1 rounded-xl border border-border inline-flex shadow-sm mb-4">
                    <button onClick={() => setRfidTab('audit')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${rfidTab === 'audit' ? 'bg-brand text-white shadow-md' : 'text-gray-500'}`}>Audit Inventory</button>
                    <button onClick={() => setRfidTab('gate')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${rfidTab === 'gate' ? 'bg-brand text-white shadow-md' : 'text-gray-500'}`}>Gate Monitor</button>
                </div>

                {rfidTab === 'audit' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Active Audit: ICU Dept</h3>
                                <p className="text-sm text-gray-500">Progress: {activeAudit ? Math.round((activeAudit.total_scanned / activeAudit.total_expected) * 100) : 0}%</p>
                            </div>
                            <div className="flex gap-2">
                                {activeAudit && (
                                    <button 
                                        onClick={handleSimulateScan} 
                                        className="btn-secondary text-xs"
                                    >
                                        Simulate Scan
                                    </button>
                                )}
                                <button 
                                    onClick={() => !activeAudit && handleStartAudit('ICU')} 
                                    disabled={!!activeAudit}
                                    className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
                                >
                                    {activeAudit ? 'Audit In Progress' : 'Start Audit'}
                                </button>
                            </div>
                        </div>
                        {activeAudit && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <h4 className="font-bold text-green-800 mb-2">Found Assets ({activeAudit.found_assets.length})</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {activeAudit.found_assets.map(id => (
                                            <div key={id} className="bg-white p-2 rounded border border-green-100 text-xs font-mono flex items-center gap-2"><Check size={12} className="text-green-500"/> {id}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <h4 className="font-bold text-red-800 mb-2">Missing Assets ({activeAudit.missing_assets.length})</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {activeAudit.missing_assets.map(id => (
                                            <div key={id} className="bg-white p-2 rounded border border-red-100 text-xs font-mono opacity-60">{id}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {rfidTab === 'gate' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Live Gate Activity</h3>
                            <button 
                                onClick={() => setIsGateMonitoring(!isGateMonitoring)}
                                className={`btn-secondary py-2 px-4 text-sm ${isGateMonitoring ? 'text-red-600 border-red-200 bg-red-50' : ''}`}
                            >
                                {isGateMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {gateReaders.map(reader => (
                                <div key={reader.id} className="bg-white p-4 rounded-xl border border-border shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-800 text-sm">{reader.name}</span>
                                        <div className={`w-2 h-2 rounded-full ${reader.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                    </div>
                                    <div className="text-xs text-gray-500">Last Ping: {reader.lastPing || 'Never'}</div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Time</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Gate</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Asset</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Direction</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {gateLogs.map(log => (
                                        <tr key={log.id} className="animate-in slide-in-from-left-2">
                                            <td className="p-4 text-xs text-gray-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                            <td className="p-4 text-sm font-bold text-gray-800">{gateReaders.find(r => r.id === log.gate_location_id)?.name}</td>
                                            <td className="p-4 text-sm text-gray-600">{assets.find(a => a.asset_id === log.asset_id)?.name || log.rfid_tag}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.direction === 'ENTER' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                                                    {log.direction}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {gateLogs.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No activity detected yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <div>Select a View</div>;
};
