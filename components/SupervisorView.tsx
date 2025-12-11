
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog, RoleDefinition, Resource, Action } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getKnowledgeBaseDocs, MOCK_VENDORS, TRAINING_SCENARIOS } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase, generateAssetThumbnail } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Package, ChevronLeft, X, Download, Printer, ShieldCheck as ShieldCheckIcon, Plus, Check, Users as UsersIcon, GraduationCap, Sparkles, Book, Coins, Box, ArrowRight, User as UserIcon, UserPlus, Image as ImageIcon, LayoutGrid, List, Radio, TrendingUp, DollarSign, Calendar, Lock, Unlock, PenTool, CheckCircle2, Sliders, Briefcase, ThumbsUp, Timer } from 'lucide-react';
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
    const { t, language } = useLanguage();
    
    const isAdmin = currentUser.role === UserRole.ADMIN;

    // Notification Toast State
    const [showToast, setShowToast] = useState(false);
    
    // Asset Search
    const [assetSearch, setAssetSearch] = useState('');

    // Vendor Search
    const [vendorSearch, setVendorSearch] = useState('');

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
    
    // Calibration State
    const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);
    const [selectedAssetForCal, setSelectedAssetForCal] = useState<Asset | null>(null);
    const [newCalDate, setNewCalDate] = useState('');

    // Reporting State
    const [selectedJobReport, setSelectedJobReport] = useState<DetailedJobOrderReport | null>(null);
    const [reportSearchId, setReportSearchId] = useState('');
    
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
        const asset = assetsRef.current.find(a => a.asset_id === cleanId || a.nfc_tag_id === cleanId || a.rfid_tag_id === cleanId);
        const targetId = asset ? asset.asset_id : cleanId;

        if (currentAudit.missing_assets.includes(targetId)) {
            setActiveAudit(prev => prev ? {
                ...prev,
                total_scanned: prev.total_scanned + 1,
                missing_assets: prev.missing_assets.filter(id => id !== targetId),
                found_assets: [...prev.found_assets, targetId]
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
            handleGateScan(scannedTag, 101); // Simulate Gate 101
        }
    }, [handleRealScan, handleGateScan]);

    const { status: zebraStatus } = useZebraScanner({
        onScan: handleScannerInput,
        isActive: currentView === 'rfid'
    });

    // --- DATA MEMOIZATION & EFFECTS ---
    const kbDocuments = useMemo(() => getKnowledgeBaseDocs(), []);
    const filteredKbDocs = kbDocuments.filter(doc => doc.title.toLowerCase().includes(kbSearch.toLowerCase()));
    
    // Filter Assets based on Search
    const filteredAssets = useMemo(() => {
        if (!assetSearch) return assets;
        const q = assetSearch.toLowerCase();
        return assets.filter(a => 
            a.name.toLowerCase().includes(q) || 
            a.model.toLowerCase().includes(q) || 
            a.asset_id.toLowerCase().includes(q) ||
            a.serial_number?.toLowerCase().includes(q)
        );
    }, [assets, assetSearch]);

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

        // 2. Vendor Analysis (Using MOCK_VENDORS for metadata, mapping assets to them)
        const vendorData = MOCK_VENDORS.map(vendor => {
            const vendorAssets = assets.filter(a => a.manufacturer === vendor.name || a.manufacturer?.includes(vendor.name.split(' ')[0]));
            const totalAssets = vendorAssets.length;
            const vendorWOs = workOrders.filter(wo => vendorAssets.some(a => a.asset_id === wo.asset_id));
            const defects = vendorWOs.filter(wo => wo.type === WorkOrderType.CORRECTIVE).length;
            
            // Adjust score based on actual defects vs baseline reliability
            const adjustedReliability = Math.max(0, vendor.reliability - (defects * 2));
            
            return {
                ...vendor,
                totalAssets,
                defects,
                score: adjustedReliability,
            };
        }).sort((a, b) => b.score - a.score);

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
                    if (wo.parts_used) {
                        const partsCost = wo.parts_used.reduce((acc, p) => {
                             const part = inventory.find(i => i.part_id === p.part_id);
                             return acc + (part ? part.cost * p.quantity : 0);
                        }, 0);
                        costByDept[loc.department].parts += partsCost;
                    }
                    if (wo.status === 'Closed' && wo.start_time && wo.close_time) {
                         const hours = (new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime()) / (1000 * 60 * 60);
                         costByDept[loc.department].labor += (hours * 50);
                    }
                 }
             }
        });
        const costAnalysis = Object.entries(costByDept).map(([name, costs]) => ({
            name, parts: Math.round(costs.parts), labor: Math.round(costs.labor)
        })).filter(c => c.parts > 0 || c.labor > 0).slice(0, 5);

        // 6. Capital Budget Forecast
        const currentYear = new Date().getFullYear();
        const budgetForecast = Array.from({length: 5}, (_, i) => {
            const year = currentYear + i;
            const replacementCost = assets.filter(a => {
                    const purchaseYear = new Date(a.purchase_date).getFullYear();
                    const eolYear = purchaseYear + (a.expected_lifespan || 10);
                    return eolYear === year || (a.risk_score > 80 && i === 0);
                }).reduce((sum, a) => sum + (a.purchase_cost || 5000), 0);
            return { year, amount: replacementCost };
        });

        // 7. Training Data (Using specific scenarios from mockDb)
        const trainingData = TRAINING_SCENARIOS.sort((a,b) => b.count - a.count);

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

    const handleCalibrateSubmit = async () => {
        if (selectedAssetForCal && newCalDate) {
            await api.updateAssetCalibration(
                selectedAssetForCal.asset_id, 
                new Date().toISOString().split('T')[0], 
                newCalDate
            );
            refreshData();
            setIsCalibrateModalOpen(false);
            setNewCalDate('');
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
                            <Activity size={24} className="text-slate-500"/>
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
        if (selectedAsset) {
            const assetDocs = getAssetDocuments(selectedAsset.asset_id);
            const assetHistory = workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id);
            const handleDownloadPdf = () => alert("Downloading PDF..."); // Mock

            return (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-4">
                        <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
                    </button>
                    
                    <div className="bg-white rounded-2xl border border-border shadow-soft p-6 flex flex-col md:flex-row gap-6">
                        <div className="w-48 h-48 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-200">
                            {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover rounded-xl"/> : <Package size={48} className="text-gray-300"/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900">{selectedAsset.name}</h1>
                                    <p className="text-text-muted font-mono mt-1">{selectedAsset.model} • {selectedAsset.asset_id}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleDownloadPdf} className="btn-secondary text-xs py-2 px-3 flex items-center gap-2"><Printer size={16}/> Print Datasheet</button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                                <div><div className="text-xs font-bold text-gray-400 uppercase">{t('status')}</div><div className={`text-lg font-bold ${selectedAsset.status === 'Running' ? 'text-success' : 'text-danger'}`}>{selectedAsset.status}</div></div>
                                <div><div className="text-xs font-bold text-gray-400 uppercase">{t('risk_score')}</div><div className="text-lg font-bold text-gray-800">{selectedAsset.risk_score}/100</div></div>
                                <div><div className="text-xs font-bold text-gray-400 uppercase">{t('location')}</div><div className="text-lg font-bold text-gray-800">{getLocationName(selectedAsset.location_id)}</div></div>
                                <div><div className="text-xs font-bold text-gray-400 uppercase">{t('purchase_date')}</div><div className="text-lg font-bold text-gray-800">{selectedAsset.purchase_date}</div></div>
                            </div>
                        </div>
                    </div>

                    {/* Asset Detail Tabs */}
                    <div className="bg-white rounded-2xl border border-border shadow-soft min-h-[400px]">
                        <div className="flex border-b border-gray-100">
                            {['overview', 'history', 'docs'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setAssetDetailTab(tab as any)}
                                    className={`flex-1 py-4 text-sm font-bold capitalize transition-colors ${assetDetailTab === tab ? 'text-brand border-b-2 border-brand bg-brand/5' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <div className="p-6">
                            {assetDetailTab === 'overview' && (
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-900 border-b pb-2">Lifecycle</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><div className="text-gray-500">Manufacturer</div><div className="font-medium">{selectedAsset.manufacturer}</div></div>
                                            <div><div className="text-gray-500">Serial No</div><div className="font-medium">{selectedAsset.serial_number}</div></div>
                                            <div><div className="text-gray-500">Warranty Exp</div><div className="font-medium">{selectedAsset.warranty_expiration}</div></div>
                                            <div><div className="text-gray-500">Lifespan</div><div className="font-medium">{selectedAsset.expected_lifespan} Years</div></div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-900 border-b pb-2">Financials</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><div className="text-gray-500">Purchase Cost</div><div className="font-medium">${selectedAsset.purchase_cost}</div></div>
                                            <div><div className="text-gray-500">Maint. Cost</div><div className="font-medium">${selectedAsset.accumulated_maintenance_cost}</div></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {assetDetailTab === 'history' && (
                                <div className="space-y-4">
                                    {assetHistory.map(wo => (
                                        <div key={wo.wo_id} className="p-4 border rounded-xl flex justify-between items-center bg-gray-50">
                                            <div>
                                                <div className="font-bold text-gray-900">{wo.type} #{wo.wo_id}</div>
                                                <div className="text-sm text-gray-500">{wo.description}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold uppercase text-gray-400">{new Date(wo.created_at).toLocaleDateString()}</div>
                                                <div className="text-sm font-medium">{wo.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {assetDetailTab === 'docs' && (
                                <div className="space-y-2">
                                    {assetDocs.map(doc => (
                                        <div key={doc.doc_id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer group">
                                            <div className="flex items-center gap-3">
                                                <FileText size={20} className="text-brand"/>
                                                <span className="font-medium text-gray-700">{doc.title}</span>
                                            </div>
                                            <Download size={18} className="text-gray-400 group-hover:text-brand"/>
                                        </div>
                                    ))}
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
                    <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm">
                        <Plus size={18}/> {t('add_equipment')}
                    </button>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20}/>
                    <input 
                        type="text" 
                        placeholder={t('search_assets')} 
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="input-modern pl-12"
                    />
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('asset_info')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('form_model')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('form_sn')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('location')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('status')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAssets.map(asset => (
                                <tr key={asset.asset_id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                                {asset.image ? <img src={asset.image} className="w-full h-full object-cover rounded-lg"/> : <Package size={18} className="text-gray-400"/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">{asset.name}</div>
                                                <div className="text-xs text-gray-500">{asset.classification}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">{asset.model}</td>
                                    <td className="p-4 text-sm text-gray-600 font-mono">{asset.serial_number}</td>
                                    <td className="p-4 text-sm text-gray-600">{getLocationName(asset.location_id)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${asset.status === 'Running' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => setSelectedAsset(asset)} className="text-brand hover:underline text-xs font-bold">View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Asset Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-xl">{t('modal_add_title')}</h3>
                                <button onClick={() => setIsAddModalOpen(false)}><X size={20}/></button>
                            </div>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('form_name')}</label>
                                        <input className="input-modern" required value={newAssetForm.name} onChange={e => setNewAssetForm({...newAssetForm, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('form_model')}</label>
                                        <input className="input-modern" required value={newAssetForm.model} onChange={e => setNewAssetForm({...newAssetForm, model: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('form_sn')}</label>
                                    <input className="input-modern" required value={newAssetForm.asset_id} onChange={e => setNewAssetForm({...newAssetForm, asset_id: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('form_image')}</label>
                                    <div className="flex gap-2">
                                        <input className="input-modern" value={newAssetForm.image} onChange={e => setNewAssetForm({...newAssetForm, image: e.target.value})} placeholder="Image URL..." />
                                        <button type="button" onClick={handleGenerateImage} disabled={isGeneratingImage || !newAssetForm.model} className="btn-secondary px-3 py-2 text-xs whitespace-nowrap">
                                            {isGeneratingImage ? t('generating_image') : t('btn_gen_image')}
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" className="w-full btn-primary mt-4">{t('btn_save')}</button>
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
            if (maintenanceFilterPriority !== 'all' && wo.priority.toLowerCase() !== maintenanceFilterPriority.toLowerCase()) return false;
            if (maintenanceFilterStatus !== 'all' && wo.status.toLowerCase() !== maintenanceFilterStatus.toLowerCase()) return false;
            return true;
        });

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_maintenance')}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setMaintenanceViewMode('kanban')} className={`p-2 rounded ${maintenanceViewMode === 'kanban' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}><LayoutGrid size={20}/></button>
                        <button onClick={() => setMaintenanceViewMode('list')} className={`p-2 rounded ${maintenanceViewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}><List size={20}/></button>
                        <button onClick={() => setIsCreateWOModalOpen(true)} className="btn-primary py-2 px-4 text-sm"><Plus size={18}/> {t('create_wo')}</button>
                    </div>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <select className="input-modern w-auto py-2 text-xs" value={maintenanceFilterPriority} onChange={e => setMaintenanceFilterPriority(e.target.value)}>
                        <option value="all">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                    </select>
                    <select className="input-modern w-auto py-2 text-xs" value={maintenanceFilterStatus} onChange={e => setMaintenanceFilterStatus(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="assigned">Assigned</option>
                        <option value="in progress">In Progress</option>
                    </select>
                </div>

                {maintenanceViewMode === 'kanban' ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-250px)] overflow-x-auto">
                        {['Open', 'Assigned', 'In Progress', 'Closed'].map(status => (
                            <div key={status} className="bg-gray-50 rounded-xl p-4 flex flex-col h-full border border-gray-200">
                                <h3 className="font-bold text-gray-700 mb-4 flex justify-between">{status} <span className="bg-gray-200 text-xs px-2 py-0.5 rounded-full">{filteredWOs.filter(w => w.status === status).length}</span></h3>
                                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                                    {filteredWOs.filter(w => w.status === status).map(wo => {
                                        const asset = assets.find(a => a.asset_id === wo.asset_id);
                                        return (
                                            <div key={wo.wo_id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${wo.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{wo.priority}</span>
                                                    <span className="text-xs font-mono text-gray-400">#{wo.wo_id}</span>
                                                </div>
                                                <div className="font-bold text-sm text-gray-900 mb-1">{asset?.name || 'Unknown Asset'}</div>
                                                <div className="text-xs text-gray-500 line-clamp-2 mb-2">{wo.description}</div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                                    {status === 'Open' && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleAssign(wo); }}
                                                            className="text-xs bg-brand text-white px-2 py-1 rounded font-bold hover:bg-brand-dark transition-colors w-full text-center"
                                                        >
                                                            {t('assign')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">WO ID</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Asset</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Priority</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredWOs.map(wo => {
                                    const asset = assets.find(a => a.asset_id === wo.asset_id);
                                    return (
                                        <tr key={wo.wo_id} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono text-xs">{wo.wo_id}</td>
                                            <td className="p-4 text-sm font-bold">{asset?.name}</td>
                                            <td className="p-4 text-sm text-gray-600 truncate max-w-xs">{wo.description}</td>
                                            <td className="p-4"><span className={`text-xs px-2 py-1 rounded font-bold ${wo.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{wo.priority}</span></td>
                                            <td className="p-4 text-sm">{wo.status}</td>
                                            <td className="p-4">
                                                {wo.status === 'Open' && <button onClick={() => handleAssign(wo)} className="text-brand hover:underline text-xs font-bold">Assign</button>}
                                                <button onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }} className="text-gray-500 hover:text-gray-900 text-xs font-bold ml-2">Details</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create WO Modal */}
                {isCreateWOModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('modal_create_wo')}</h3>
                            <div className="space-y-4">
                                <select className="input-modern" value={newWOForm.assetId} onChange={e => setNewWOForm({...newWOForm, assetId: e.target.value})}>
                                    <option value="">Select Asset...</option>
                                    {assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.name} ({a.asset_id})</option>)}
                                </select>
                                <textarea className="input-modern min-h-[100px]" placeholder="Description" value={newWOForm.description} onChange={e => setNewWOForm({...newWOForm, description: e.target.value})} />
                                <div className="flex gap-2">
                                    <button onClick={() => setIsCreateWOModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                    <button onClick={handleCreateWO} className="flex-1 btn-primary">{t('btn_dispatch')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assign Modal */}
                {isAssignModalOpen && selectedWOForAssignment && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('assign_technician')}</h3>
                            <div className="space-y-4">
                                {recommendedTechs.length > 0 && (
                                    <div className="bg-blue-50 p-3 rounded-lg mb-2">
                                        <p className="text-xs font-bold text-blue-700 uppercase mb-2">AI Recommendations</p>
                                        {recommendedTechs.slice(0, 2).map(rec => (
                                            <div key={rec.user.user_id} className="flex justify-between items-center mb-1 cursor-pointer hover:bg-blue-100 p-1 rounded" onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())}>
                                                <div className="text-sm font-bold">{rec.user.name}</div>
                                                <div className="text-xs text-blue-600">{rec.score} pts ({rec.reason})</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <select className="input-modern" value={selectedTechForAssignment} onChange={e => setSelectedTechForAssignment(e.target.value)}>
                                    <option value="">Select Technician...</option>
                                    {users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER).map(u => (
                                        <option key={u.user_id} value={u.user_id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsAssignModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                    <button onClick={handleAssignSubmit} className="flex-1 btn-primary">{t('btn_assign_confirm')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Details Modal */}
                {isWorkOrderDetailsModalOpen && selectedWorkOrderForDetails && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-xl">WO #{selectedWorkOrderForDetails.wo_id} Details</h3>
                                <button onClick={() => setIsWorkOrderDetailsModalOpen(false)}><X size={20}/></button>
                            </div>
                            <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><div className="text-gray-500 font-bold text-xs uppercase">Status</div><div className="font-medium">{selectedWorkOrderForDetails.status}</div></div>
                                    <div><div className="text-gray-500 font-bold text-xs uppercase">Priority</div><div className="font-medium">{selectedWorkOrderForDetails.priority}</div></div>
                                </div>
                                <div><div className="text-gray-500 font-bold text-xs uppercase">Description</div><div className="p-3 bg-gray-50 rounded border">{selectedWorkOrderForDetails.description}</div></div>
                                <div>
                                    <div className="text-gray-500 font-bold text-xs uppercase mb-2">Parts Used</div>
                                    {selectedWorkOrderForDetails.parts_used?.length ? (
                                        <div className="space-y-1">
                                            {selectedWorkOrderForDetails.parts_used.map((p, i) => {
                                                const part = inventory.find(inv => inv.part_id === p.part_id);
                                                return <div key={i} className="flex justify-between bg-gray-50 p-2 rounded"><span>{part?.part_name}</span><span>x{p.quantity}</span></div>
                                            })}
                                        </div>
                                    ) : <div className="text-gray-400 italic">No parts used.</div>}
                                </div>
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
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('stock_level')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('unit_cost')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inventory.map(part => (
                                <tr key={part.part_id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-sm text-gray-900">{part.part_name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded font-bold text-xs ${part.current_stock <= part.min_reorder_level ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {part.current_stock} units
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm">${part.cost}</td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => { setSelectedPartForRestock(part); setRestockModalOpen(true); }}
                                            className="text-brand hover:underline text-xs font-bold"
                                        >
                                            {t('btn_restock')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {restockModalOpen && selectedPartForRestock && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('restock_modal_title')}: {selectedPartForRestock.part_name}</h3>
                            <input 
                                type="number" 
                                className="input-modern mb-4" 
                                placeholder={t('restock_qty')} 
                                value={restockQty} 
                                onChange={(e) => setRestockQty(parseInt(e.target.value))} 
                            />
                            {showRestockConfirm ? (
                                <div className="bg-red-50 p-3 rounded-lg mb-4 border border-red-100">
                                    <p className="text-red-700 text-sm font-bold mb-2">High Quantity Warning</p>
                                    <p className="text-red-600 text-xs mb-3">Adding {restockQty} units. Confirm?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowRestockConfirm(false)} className="flex-1 btn-secondary py-1 text-xs">Cancel</button>
                                        <button onClick={handleRestock} className="flex-1 btn-primary py-1 text-xs bg-red-600 hover:bg-red-700">Confirm</button>
                                    </div>
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
        const dueSoon = assets.filter(a => {
            if (!a.next_calibration_date) return false;
            const days = (new Date(a.next_calibration_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
            return days < 30 && days > 0;
        });

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">{t('nav_calibration')}</h2>
                {dueSoon.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="text-orange-500 mt-1" size={20}/>
                        <div>
                            <h4 className="font-bold text-orange-800">Calibration Due Soon</h4>
                            <p className="text-sm text-orange-700 mt-1">{dueSoon.length} assets require calibration within 30 days.</p>
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
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('status')}</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {assets.filter(a => a.next_calibration_date).map(asset => (
                                <tr key={asset.asset_id} className="hover:bg-gray-50">
                                    <td className="p-4 text-sm font-bold">{asset.name}</td>
                                    <td className="p-4 text-sm text-gray-600">{asset.last_calibration_date}</td>
                                    <td className="p-4 text-sm text-gray-600">{asset.next_calibration_date}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${new Date(asset.next_calibration_date!) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {new Date(asset.next_calibration_date!) < new Date() ? 'Overdue' : 'Compliant'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => { setSelectedAssetForCal(asset); setIsCalibrateModalOpen(true); }}
                                            className="text-brand hover:underline text-xs font-bold"
                                        >
                                            {t('btn_update_cal')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isCalibrateModalOpen && selectedAssetForCal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('update_cal_title')}</h3>
                            <p className="text-sm text-gray-500 mb-4">Record new calibration date for {selectedAssetForCal.name}.</p>
                            <input 
                                type="date" 
                                className="input-modern mb-4" 
                                value={newCalDate} 
                                onChange={(e) => setNewCalDate(e.target.value)} 
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setIsCalibrateModalOpen(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                                <button onClick={handleCalibrateSubmit} disabled={!newCalDate} className="flex-1 btn-primary">{t('btn_record')}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 6. USERS
    if (currentView === 'users') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_users')}</h2>
                    <div className="bg-white p-1 rounded-xl border border-border flex shadow-sm">
                        <button onClick={() => setUserMgmtTab('users')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${userMgmtTab === 'users' ? 'bg-brand text-white' : 'text-gray-500'}`}>Users List</button>
                        <button onClick={() => setUserMgmtTab('roles')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${userMgmtTab === 'roles' ? 'bg-brand text-white' : 'text-gray-500'}`}>Roles & Permissions</button>
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
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_email')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_role')}</th>
                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">{t('user_dept')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(u => (
                                        <tr key={u.user_id} className="hover:bg-gray-50">
                                            <td className="p-4 text-sm font-bold">{u.name}</td>
                                            <td className="p-4 text-sm text-gray-600">{u.email}</td>
                                            <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{u.role}</span></td>
                                            <td className="p-4 text-sm text-gray-600">{u.department || '-'}</td>
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
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{role.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                                    </div>
                                    <button onClick={() => openRoleEditor(role)} className="p-2 hover:bg-gray-50 rounded-lg text-brand"><Sliders size={18}/></button>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-gray-400 uppercase">Access Overview</div>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(role.permissions).map(([res, acts]) => (
                                            acts.length > 0 && <span key={res} className="bg-gray-50 border border-gray-100 px-2 py-1 rounded text-[10px] text-gray-600 capitalize">{res} ({acts.length})</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                            <h3 className="font-bold text-lg mb-4">{t('modal_add_user')}</h3>
                            <form onSubmit={handleAddUserSubmit} className="space-y-4">
                                <input className="input-modern" required placeholder="Full Name" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}/>
                                <input className="input-modern" required type="email" placeholder="Email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}/>
                                <select className="input-modern" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}>
                                    <option value={UserRole.TECHNICIAN}>Technician</option>
                                    <option value={UserRole.SUPERVISOR}>Supervisor</option>
                                    <option value={UserRole.NURSE}>Nurse</option>
                                </select>
                                <button type="submit" className="w-full btn-primary">{t('btn_create_user')}</button>
                            </form>
                            <button onClick={() => setIsAddUserModalOpen(false)} className="absolute top-4 right-4"><X size={20}/></button>
                        </div>
                    </div>
                )}

                {/* Role Editor Modal */}
                {isRoleEditorOpen && editingRole && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-xl">{t('permissions_matrix')}: {editingRole.name}</h3>
                                    <p className="text-xs text-gray-500">Toggle capabilities for this role.</p>
                                </div>
                                <button onClick={() => setIsRoleEditorOpen(false)}><X size={20}/></button>
                            </div>
                            <div className="space-y-6">
                                {(['assets', 'work_orders', 'inventory', 'reports', 'users'] as Resource[]).map(res => (
                                    <div key={res} className="border-b border-gray-100 pb-4 last:border-0">
                                        <h4 className="font-bold text-gray-800 text-sm uppercase mb-3 flex items-center gap-2">
                                            {res === 'assets' ? <Box size={16}/> : res === 'work_orders' ? <CheckCircle2 size={16}/> : <FileText size={16}/>}
                                            {t(`res_${res}` as any)}
                                        </h4>
                                        <div className="grid grid-cols-4 gap-4">
                                            {(['view', 'create', 'edit', 'delete'] as Action[]).map(act => {
                                                const isAllowed = editingRole.permissions[res]?.includes(act);
                                                return (
                                                    <button
                                                        key={act}
                                                        onClick={() => togglePermission(res, act)}
                                                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition-all ${isAllowed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                                                    >
                                                        {isAllowed ? <Unlock size={14}/> : <Lock size={14}/>}
                                                        {t(`act_${act}` as any)}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => { api.saveRole(editingRole); setIsRoleEditorOpen(false); }} className="btn-primary py-2 px-6">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 7. ANALYSIS & REPORTS
    if (currentView === 'analysis') {
        const filteredVendors = analyticsData.vendorData.filter((v:any) => v.name.toLowerCase().includes(vendorSearch.toLowerCase()));

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

                {/* 1. Analytics Charts */}
                {activeTab === 'tab_analytics' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-gray-900 mb-4">{t('table_risk_report')}</h3>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold"><tr><th className="p-3">Asset</th><th className="p-3">Risk Score</th><th className="p-3">Status</th></tr></thead>
                                <tbody>
                                    {assets.sort((a,b) => b.risk_score - a.risk_score).slice(0,5).map(a => (
                                        <tr key={a.asset_id} className="border-b last:border-0"><td className="p-3 text-sm font-bold">{a.name}</td><td className="p-3"><div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className={`h-full ${a.risk_score > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${a.risk_score}%`}}></div></div></td><td className="p-3 text-xs">{a.risk_score > 70 ? 'Critical' : 'Monitor'}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 2. Knowledge Base with AI */}
                {activeTab === 'tab_kb' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-fit">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Sparkles size={20} className="text-brand"/> {t('kb_ai_search')}</h3>
                            <textarea 
                                className="input-modern min-h-[120px] mb-4" 
                                placeholder={t('ai_search_placeholder')}
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                            />
                            <button 
                                onClick={handleAiSearch} 
                                disabled={isAiSearching || !aiQuery}
                                className="w-full btn-primary"
                            >
                                {isAiSearching ? t('analyzing') : t('btn_analyze')}
                            </button>
                        </div>
                        <div className="col-span-2 space-y-6">
                            {aiResult && (
                                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl animate-in slide-in-from-top-4">
                                    <h4 className="font-bold text-indigo-900 text-lg mb-2">{t('ai_explanation')}</h4>
                                    <p className="text-indigo-800 text-sm mb-4">{aiResult.explanation}</p>
                                    <h4 className="font-bold text-indigo-900 text-lg mb-2">{t('ai_solution')}</h4>
                                    <div className="bg-white p-4 rounded-xl border border-indigo-100 text-sm text-gray-700 whitespace-pre-wrap">{aiResult.solution}</div>
                                </div>
                            )}
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-gray-900 mb-4">{t('kb_library')}</h3>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                    {filteredKbDocs.slice(0, 50).map((doc, idx) => ( // Limit rendering for performance
                                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <Book size={20} className="text-gray-400"/>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-900">{doc.title}</div>
                                                    <div className="flex gap-2 mt-1">{doc.tags.map((tag, i) => <span key={i} className="text-[10px] bg-gray-100 px-2 rounded text-gray-500 uppercase">{tag}</span>)}</div>
                                                </div>
                                            </div>
                                            <ChevronLeft size={16} className="text-gray-400 rtl:rotate-180"/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Report Generator */}
                {activeTab === 'tab_gen_report' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-fit">
                            <h3 className="font-bold text-gray-900 mb-4">{t('gen_report')}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Report Type</label>
                                    <select className="input-modern">
                                        <option>Job Order Report (Corrective)</option>
                                        <option>PPM Compliance Report</option>
                                        <option>Asset Lifecycle Report</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                    <FileText size={48} className="mx-auto text-gray-300 mb-2"/>
                                    <p className="text-xs text-gray-500">Preview generated reports here before downloading.</p>
                                </div>
                                <button onClick={handlePrintReport} className="w-full btn-primary"><Printer size={18}/> Print / PDF</button>
                            </div>
                        </div>
                        {/* Printable Report Preview */}
                        <div className="bg-white p-8 rounded-xl border border-border shadow-sm text-xs font-serif leading-relaxed h-[600px] overflow-y-auto">
                            <div className="text-center border-b-2 border-black pb-4 mb-4">
                                <h1 className="text-xl font-bold uppercase">Job Order Report</h1>
                                <p>First Gulf Company - Kingdom of Saudi Arabia</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><strong>Job Order No:</strong> 2236</div>
                                <div><strong>Date:</strong> 2023-10-25</div>
                                <div><strong>Asset:</strong> Ventilator Servo-U</div>
                                <div><strong>Location:</strong> ICU - Room 101</div>
                            </div>
                            <div className="mb-4">
                                <strong>Fault Description:</strong><br/>
                                Unit failed self-test (Code E045). Flow sensor error detected.
                            </div>
                            <div className="mb-8">
                                <strong>Work Done:</strong><br/>
                                Replaced flow sensor. Calibrated flow offset. Verified operation with test lung.
                            </div>
                            <div className="grid grid-cols-3 gap-8 mt-12 text-center">
                                <div className="border-t border-black pt-2">Technician</div>
                                <div className="border-t border-black pt-2">Supervisor</div>
                                <div className="border-t border-black pt-2">Nurse In-Charge</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Training Dashboard */}
                {activeTab === 'tab_training' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-brand"/> {t('training_dashboard')}</h3>
                            {analyticsData.trainingData.length > 0 ? (
                                <div className="space-y-4">
                                    {analyticsData.trainingData.slice(0, 10).map((d: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-brand shadow-sm">{i + 1}</div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{d.error}</div>
                                                    <div className="text-xs text-gray-500">{d.department} • Count: {d.count}</div>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded bg-red-50 text-red-600`}>{d.recommendation}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400"><Check size={48} className="mx-auto mb-2 text-green-200"/><p>{t('no_major_errors')}</p></div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. TCO & Financials */}
                {activeTab === 'tab_financial' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[300px]">
                            <h3 className="font-bold text-gray-900 mb-4">{t('chart_cost_vs_value')}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.tcoData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                    <XAxis type="number" hide/>
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}}/>
                                    <Tooltip/>
                                    <Legend/>
                                    <Bar dataKey="purchase" name="Purchase Cost" fill="#cbd5e1" stackId="a" radius={[0,4,4,0]}/>
                                    <Bar dataKey="maintenance" name="Maint. Cost" fill="#ef4444" stackId="a" radius={[0,4,4,0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* 6. Vendor Ratings */}
                {activeTab === 'tab_vendor' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 text-lg">Vendor Performance Matrix</h3>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                <input 
                                    type="text" 
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand"
                                    placeholder="Search vendors..."
                                    value={vendorSearch}
                                    onChange={(e) => setVendorSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredVendors.map((v: any, i: number) => (
                                <div key={v.id} className="bg-white p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-6xl group-hover:opacity-20 transition-opacity">#{i+1}</div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-500">{v.name[0]}</div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{v.name}</h3>
                                            <div className="flex gap-1 mt-0.5">
                                                {Array.from({length: 5}).map((_, starI) => (
                                                    <div key={starI} className={`w-2 h-2 rounded-full ${starI < Math.round(v.support) ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                                <span>Reliability</span>
                                                <span>{v.reliability}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${v.reliability > 95 ? 'bg-green-500' : v.reliability > 90 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${v.reliability}%`}}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                            <div className="text-xs text-gray-500">Defects: <span className="font-bold text-gray-800">{v.defects}</span></div>
                                            <div className="text-xs text-gray-500">Assets: <span className="font-bold text-gray-800">{v.totalAssets}</span></div>
                                        </div>
                                    </div>

                                    {v.score > 90 && (
                                        <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                                            <ThumbsUp size={12}/> Recommended
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 7. Capital Budget */}
                {activeTab === 'tab_budget' && (
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft animate-in fade-in">
                        <h3 className="font-bold text-gray-900 mb-6">{t('forecast_5y')}</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.budgetForecast}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                    <XAxis dataKey="year"/>
                                    <YAxis/>
                                    <Tooltip formatter={(value) => `$${value}`}/>
                                    <Bar dataKey="amount" fill="#2563eb" radius={[4,4,0,0]} name="Est. Replacement Cost" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 8. RFID
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_rfid')}</h2>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${zebraStatus !== 'disconnected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${zebraStatus !== 'disconnected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        {zebraStatus === 'disconnected' ? 'Scanner Disconnected' : 'Zebra RFD8500 Connected'}
                    </div>
                </div>

                <div className="bg-white p-1 rounded-xl border border-border inline-flex shadow-sm mb-4">
                    <button onClick={() => setRfidTab('audit')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${rfidTab === 'audit' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Audit Inventory</button>
                    <button onClick={() => setRfidTab('gate')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${rfidTab === 'gate' ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>Gate Monitor</button>
                </div>

                {rfidTab === 'audit' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Active Audit: ICU Dept</h3>
                                {activeAudit ? (
                                    <div className="mt-2">
                                        <div className="text-sm text-gray-500 mb-1">Progress: {activeAudit.total_scanned} / {activeAudit.total_expected} Assets</div>
                                        <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${(activeAudit.total_scanned / activeAudit.total_expected) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 mt-1">Select a department to begin auditing.</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {activeAudit && (
                                    <button onClick={handleSimulateScan} className="btn-secondary text-xs">Simulate Scan</button>
                                )}
                                <button onClick={() => !activeAudit && handleStartAudit('ICU')} disabled={!!activeAudit} className="btn-primary py-2 px-4 text-sm disabled:opacity-50">
                                    {activeAudit ? 'Audit In Progress' : 'Start Audit'}
                                </button>
                            </div>
                        </div>
                        {activeAudit && (
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><Check size={16}/> Found Assets ({activeAudit.found_assets.length})</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {activeAudit.found_assets.map(id => (
                                            <div key={id} className="bg-white p-2 rounded border border-green-100 text-xs font-mono flex items-center gap-2 shadow-sm animate-in zoom-in">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>{id}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><AlertCircle size={16}/> Missing Assets ({activeAudit.missing_assets.length})</h4>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
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
                            <button onClick={() => setIsGateMonitoring(!isGateMonitoring)} className={`btn-secondary py-2 px-4 text-sm flex items-center gap-2 ${isGateMonitoring ? 'text-red-600 border-red-200 bg-red-50' : 'text-green-600 border-green-200 bg-green-50'}`}>
                                <Radio size={16} className={isGateMonitoring ? 'animate-pulse' : ''}/> {isGateMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
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
                                    <tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">Time</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Gate</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Asset</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">Direction</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {gateLogs.map(log => (
                                        <tr key={log.id} className="animate-in slide-in-from-left-2">
                                            <td className="p-4 text-xs text-gray-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                            <td className="p-4 text-sm font-bold text-gray-800">{gateReaders.find(r => r.id === log.gate_location_id)?.name || 'Unknown Gate'}</td>
                                            <td className="p-4 text-sm text-gray-600">{assets.find(a => a.asset_id === log.asset_id)?.name || log.rfid_tag}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${log.direction === 'ENTER' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{log.direction}</span></td>
                                        </tr>
                                    ))}
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
