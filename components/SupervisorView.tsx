
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan } from 'lucide-react';
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

    // --- DATA MEMOIZATION ---
    const kbDocuments = useMemo(() => getKnowledgeBaseDocs(), []);
    const filteredKbDocs = kbDocuments.filter(doc => doc.title.toLowerCase().includes(kbSearch.toLowerCase()));
    
    // Risk Calculation Simulation
    useEffect(() => {
        const movementLogs = getMovementLogs();
        assets.forEach(asset => {
             const newScore = calculateAssetRiskScore(asset, workOrders, movementLogs);
             asset.risk_score = newScore; 
        });
    }, [assets, workOrders]);

    // View Switching Logic
    useEffect(() => { 
        if (currentView === 'analysis') setActiveTab('tab_analytics'); 
        else setActiveTab('tab1'); 
        
        setSelectedAsset(null); 
        setSelectedCMReport(null); 
        setSelectedPMReport(null);
        
        if (currentView !== 'dashboard') setIsSimulationActive(false); 
    }, [currentView]);

    // Simulation Loop
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
    
    // Analytics Calculations
    const analyticsData = useMemo(() => {
        const closedWOs = workOrders.filter(wo => wo.status === 'Closed' && wo.start_time && wo.close_time);
        
        // MTTR Trend
        const mttrByMonth: {[key: string]: {total: number, count: number}} = {};
        closedWOs.forEach(wo => { 
            const month = new Date(wo.close_time!).toLocaleString('default', { month: 'short' }); 
            if (!mttrByMonth[month]) mttrByMonth[month] = { total: 0, count: 0 }; 
            const duration = new Date(wo.close_time!).getTime() - new Date(wo.start_time!).getTime(); 
            mttrByMonth[month].total += duration; 
            mttrByMonth[month].count += 1; 
        });
        const mttrTrend = Object.keys(mttrByMonth).map(m => ({ month: m, hours: parseFloat((mttrByMonth[m].total / mttrByMonth[m].count / (1000 * 60 * 60)).toFixed(1)) })).slice(0, 6);
        
        // Tech Performance
        const techStats: {[key: string]: {count: number, totalTime: number, totalRating: number, ratingCount: number, firstFix: number}} = {};
        workOrders.filter(wo => wo.status === 'Closed').forEach(wo => {
            const techId = wo.assigned_to_id;
            if (!techStats[techId]) techStats[techId] = { count: 0, totalTime: 0, totalRating: 0, ratingCount: 0, firstFix: 0 };
            techStats[techId].count += 1;
            if (wo.start_time && wo.close_time) {
                techStats[techId].totalTime += (new Date(wo.close_time).getTime() - new Date(wo.start_time).getTime());
            }
            if (wo.nurse_rating) { techStats[techId].totalRating += wo.nurse_rating; techStats[techId].ratingCount += 1; }
            if (wo.is_first_time_fix) { techStats[techId].firstFix += 1; }
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

        // Other Stats
        const statusData = [ { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length, color: '#10B981' }, { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length, color: '#EF4444' }, { name: 'Maint.', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length, color: '#F59E0B' } ];
        const riskData = [...assets].sort((a,b) => b.risk_score - a.risk_score).slice(0, 10);
        
        // TCO Calculation
        const tcoData = [...assets]
            .filter(a => a.purchase_cost && a.accumulated_maintenance_cost)
            .sort((a,b) => (b.accumulated_maintenance_cost || 0) - (a.accumulated_maintenance_cost || 0))
            .slice(0, 5)
            .map(a => ({
                name: a.name,
                purchase: a.purchase_cost || 0,
                maintenance: a.accumulated_maintenance_cost || 0,
                recommendation: (a.accumulated_maintenance_cost || 0) > ((a.purchase_cost || 0) * 0.4) ? 'Replace' : 'Keep'
            }));

        return { mttrTrend, techPerformance, statusData, riskData, tcoData };
    }, [assets, workOrders, users]);

    // --- HANDLERS ---
    const handleAiSearch = async () => {
        if(!aiQuery) return;
        setIsAiSearching(true);
        setAiResult(null);
        const availableTitles = kbDocuments.map(d => d.title);
        const result = await searchKnowledgeBase(aiQuery, availableTitles, language);
        setAiResult(result);
        setIsAiSearching(false);
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
        setNewAssetForm({ name: '', model: '', asset_id: '', location_id: 101, purchase_date: new Date().toISOString().split('T')[0], image: '' });
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
            location_id: 101
        };
        onAddUser(newUser);
        setIsAddUserModalOpen(false);
        refreshData();
        setNewUserForm({ name: '', email: '', phone: '', password: '', role: UserRole.TECHNICIAN, department: '', signature: '' });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setNewAssetForm(prev => ({ ...prev, image: reader.result as string })); };
            reader.readAsDataURL(file);
        }
    };

    const initiateRestock = (part: InventoryPart) => { setSelectedPartForRestock(part); setRestockAmount(''); setRestockModalOpen(true); };
    const handleRestockPreCheck = () => { const qty = parseInt(restockAmount); if (!qty || qty <= 0) return; if (qty > 50) { setConfirmRestockOpen(true); } else { submitRestock(); } };
    const submitRestock = async () => { if (selectedPartForRestock && restockAmount) { await api.restockPart(selectedPartForRestock.part_id, parseInt(restockAmount)); refreshData(); setRestockModalOpen(false); setConfirmRestockOpen(false); setRestockAmount(''); setSelectedPartForRestock(null); } };
    
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
        setNewWOForm({ assetId: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, description: '', assignedToId: '' });
    };

    const handleSmartAssign = () => {
        if (!selectedWOForAssignment) return;
        const asset = assets.find(a => a.asset_id === selectedWOForAssignment.asset_id || a.nfc_tag_id === selectedWOForAssignment.asset_id);
        const techs = users.filter(u => u.role === UserRole.TECHNICIAN || u.role === UserRole.ENGINEER);
        if (asset) {
            const recommendations = recommendTechnicians(asset, techs, workOrders);
            setRecommendedTechs(recommendations);
            if (recommendations.length > 0) setSelectedTechForAssignment(recommendations[0].user.user_id.toString());
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
        }
    };
    
    const handleUpdateCalibration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (assetToCalibrate) {
            const nextCal = new Date(newCalibrationDate);
            nextCal.setFullYear(nextCal.getFullYear() + 1);
            await api.updateAssetCalibration(assetToCalibrate.asset_id, newCalibrationDate, nextCal.toISOString().split('T')[0]);
            refreshData();
            setUpdateCalibrationModalOpen(false);
            setAssetToCalibrate(null);
        }
    };

    const handleFindJobReport = async () => {
        if (reportType === 'PPM') {
            const report = await api.fetchPMReport(jobOrderSearchId || '5002');
            if (report) setSelectedPMReport(report); else alert('PM Report Not Found. Try 5002.');
        } else {
            if (jobOrderSearchId === '2236' || jobOrderSearchId === '') setSelectedCMReport(getDetailedReports()[0]);
            else alert('Job Order Report not found. Try 2236.');
        }
    };

    // RFID HANDLERS
    const startAudit = () => {
        if(!selectedAuditDept) return alert("Select a department");
        const expected = getAssetsInZone(selectedAuditDept);
        const newAudit: AuditSession = {
            id: Date.now(),
            date: new Date().toISOString(),
            department: selectedAuditDept,
            total_expected: expected.length,
            total_scanned: 0,
            missing_assets: expected.map(a => a.asset_id),
            found_assets: [],
            status: 'In Progress'
        };
        setActiveAudit(newAudit);
    };

    const simulateRfidScan = () => {
        if(!activeAudit) return;
        // Randomly pick a missing asset to "scan"
        if(activeAudit.missing_assets.length > 0) {
            const toScanId = activeAudit.missing_assets[0];
            setActiveAudit(prev => {
                if(!prev) return null;
                return {
                    ...prev,
                    total_scanned: prev.total_scanned + 1,
                    missing_assets: prev.missing_assets.filter(id => id !== toScanId),
                    found_assets: [...prev.found_assets, toScanId]
                }
            });
        }
    };

    const simulateGatePassage = () => {
        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
        const direction = Math.random() > 0.5 ? 'ENTER' : 'EXIT';
        const newLog: RfidGateLog = {
            id: Date.now(),
            asset_id: randomAsset.asset_id,
            rfid_tag: randomAsset.rfid_tag_id || `RFID-${randomAsset.asset_id}`,
            gate_location_id: randomAsset.location_id,
            direction: direction,
            timestamp: new Date().toISOString()
        };
        setGateLogs(prev => [newLog, ...prev]);
        
        // Trigger alert if exiting authorized zone
        if(direction === 'EXIT') {
             // Mock check: if moving out of assigned dept
             alert(`ALERT: ${randomAsset.name} detected LEAVING its zone!`);
        }
    };

    // --- RENDER HELPERS ---
    // Expanded Departments List for 3D Map
    const departmentZones = [
        { id: 'ICU', name: 'Intensive Care', x: 10, y: 10, width: 20, height: 20, color: 'bg-indigo-100' },
        { id: 'Emergency', name: 'ER & Triage', x: 40, y: 10, width: 25, height: 15, color: 'bg-red-100' },
        { id: 'Radiology', name: 'Radiology', x: 70, y: 10, width: 20, height: 20, color: 'bg-blue-100' },
        { id: 'Laboratory', name: 'Laboratory', x: 10, y: 40, width: 15, height: 20, color: 'bg-yellow-100' },
        { id: 'Pharmacy', name: 'Pharmacy', x: 30, y: 40, width: 15, height: 15, color: 'bg-green-100' },
        { id: 'Surgery', name: 'OR & Surgery', x: 50, y: 30, width: 25, height: 25, color: 'bg-teal-100' },
        { id: 'Cardiology', name: 'Cardiology', x: 80, y: 35, width: 15, height: 20, color: 'bg-rose-100' },
        { id: 'Neurology', name: 'Neurology', x: 10, y: 70, width: 20, height: 20, color: 'bg-purple-100' },
        { id: 'NICU', name: 'NICU', x: 35, y: 65, width: 15, height: 15, color: 'bg-pink-100' },
        { id: 'Maternity', name: 'Maternity', x: 55, y: 65, width: 20, height: 20, color: 'bg-fuchsia-100' },
        { id: 'Dialysis', name: 'Dialysis', x: 80, y: 60, width: 15, height: 15, color: 'bg-cyan-100' },
        { id: 'Oncology', name: 'Oncology', x: 80, y: 80, width: 15, height: 15, color: 'bg-amber-100' },
        { id: 'Pediatrics', name: 'Pediatrics', x: 35, y: 85, width: 20, height: 10, color: 'bg-lime-100' },
        { id: 'Orthopedics', name: 'Orthopedics', x: 60, y: 90, width: 15, height: 10, color: 'bg-orange-100' },
        { id: 'General Ward', name: 'General Ward', x: 5, y: 90, width: 25, height: 10, color: 'bg-gray-100' },
    ];
    
    const getAssetsInZone = (deptId: string) => {
        return assets.filter(a => {
            const loc = getLocations().find(l => l.location_id === a.location_id);
            // Match against department name directly or loosely
            return loc?.department === deptId || (loc?.department && loc.department.includes(deptId));
        });
    };
    
    // ---------------- VIEW ROUTING ----------------

    // 1. DASHBOARD
    if (currentView === 'dashboard') {
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

                {/* KPI Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                        <h3 className="font-bold text-lg text-gray-900 mb-6">{t('tech_rating')}</h3>
                        <div className="space-y-3">
                            {analyticsData.techPerformance.slice(0, 3).map(tech => (
                                <div key={tech.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <div className="font-bold text-sm">{tech.name}</div>
                                        <div className="text-xs text-text-muted">{tech.woCount} Jobs</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold bg-white px-2 py-1 rounded border">MTTR: {tech.avgMttr}h</span>
                                        <span className="flex items-center gap-1 text-warning font-bold text-sm"><Star size={14} fill="currentColor"/> {tech.avgRating}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* TCO Analysis Card */}
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-900">{t('tco_analysis')}</h3>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded"></div> {t('purchase_price')}</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded"></div> {t('maint_cost')}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData.tcoData} layout="vertical" margin={{ left: 0, right: 20, bottom: 0, top: 0 }}>
                                        <XAxis type="number" hide/>
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} interval={0}/>
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 border shadow-lg rounded-lg text-xs z-50">
                                                            <p className="font-bold mb-1">{data.name}</p>
                                                            <p className="text-blue-600">Purchase: ${data.purchase.toLocaleString()}</p>
                                                            <p className="text-amber-600">Maintenance: ${data.maintenance.toLocaleString()}</p>
                                                            <div className={`mt-2 font-bold px-2 py-1 rounded text-center ${data.recommendation === 'Replace' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                                Rec: {data.recommendation}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="purchase" fill="#3B82F6" barSize={10} radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="maintenance" fill="#F59E0B" barSize={10} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2">
                                {analyticsData.tcoData.map((item, idx) => (
                                    <div key={idx} className={`p-3 border rounded-xl flex flex-col gap-1 ${item.recommendation === 'Replace' ? 'bg-red-50 border-red-100' : 'bg-gray-50'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold text-xs truncate w-24" title={item.name}>{item.name}</div>
                                            {item.recommendation === 'Replace' ? 
                                                <span className="text-[10px] font-bold bg-white text-red-600 px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1"><AlertTriangle size={10}/> Replace</span>
                                                : <span className="text-[10px] font-bold bg-white text-green-600 px-1.5 py-0.5 rounded border border-green-200">Keep</span>
                                            }
                                        </div>
                                        <div className="text-[10px] text-gray-500 flex justify-between">
                                            <span>Maint. Ratio</span>
                                            <span className="font-mono">{((item.maintenance / item.purchase) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-1 rounded-full mt-1 overflow-hidden">
                                            <div className={`h-1 rounded-full ${item.recommendation === 'Replace' ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(((item.maintenance / item.purchase) * 100), 100)}%` }}></div>
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

    // 2. ASSETS
    if (currentView === 'assets') {
        return (
            <div className="space-y-6 animate-in fade-in">
                {!selectedAsset ? (
                   <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                         <div className="p-4 border-b border-border flex justify-between items-center">
                             <h2 className="text-xl font-bold text-gray-900">{t('nav_assets')}</h2>
                             <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm">
                                 <Plus size={16}/> {t('add_equipment')}
                             </button>
                         </div>
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
                                         <tr key={asset.asset_id} className="hover:bg-gray-50">
                                             <td className="px-6 py-4">
                                                 <div className="flex items-center gap-3">
                                                     <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                                         {asset.image ? <img src={asset.image} className="w-full h-full object-cover"/> : <Package className="p-2"/>}
                                                     </div>
                                                     <div>
                                                         <div className="font-bold text-gray-900">{asset.name}</div>
                                                         <div className="text-xs text-text-muted">{asset.model}</div>
                                                     </div>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4">{getLocationName(asset.location_id)}</td>
                                             <td className="px-6 py-4"><span className="px-2 py-1 rounded text-xs font-bold bg-gray-100">{asset.status}</span></td>
                                             <td className="px-6 py-4 text-end">
                                                 <button onClick={() => setSelectedAsset(asset)} className="text-brand font-bold text-xs hover:underline">Details</button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                   </div>
                ) : (
                    <div className="space-y-6">
                        <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold text-sm">
                            <ChevronLeft size={16}/> {t('back')}
                        </button>
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex gap-6">
                             <div className="w-40 h-40 bg-gray-50 rounded-xl overflow-hidden border">
                                  {selectedAsset.image && <img src={selectedAsset.image} className="w-full h-full object-cover"/>}
                             </div>
                             <div>
                                  <h2 className="text-2xl font-bold text-gray-900">{selectedAsset.name}</h2>
                                  <p className="text-text-muted">{selectedAsset.model} | {selectedAsset.serial_number}</p>
                                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                      <div><span className="text-gray-500">Location:</span> <b>{getLocationName(selectedAsset.location_id)}</b></div>
                                      <div><span className="text-gray-500">Warranty:</span> <b>{selectedAsset.warranty_expiration}</b></div>
                                  </div>
                             </div>
                        </div>
                    </div>
                )}

                {/* Add Asset Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-bold mb-4">{t('modal_add_title')}</h3>
                            <form onSubmit={handleAddSubmit} className="space-y-4">
                                <input className="input-modern" placeholder={t('form_name')} value={newAssetForm.name} onChange={e => setNewAssetForm({...newAssetForm, name: e.target.value})} required />
                                <input className="input-modern" placeholder={t('form_model')} value={newAssetForm.model} onChange={e => setNewAssetForm({...newAssetForm, model: e.target.value})} required />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                    <button type="submit" className="flex-1 btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 3. MAINTENANCE (Restored)
    if (currentView === 'maintenance') {
        const filteredWOs = workOrders.filter(wo => {
             if (maintenanceFilterPriority !== 'all' && wo.priority !== maintenanceFilterPriority) return false;
             if (maintenanceFilterType !== 'all' && wo.type !== maintenanceFilterType) return false;
             return true;
        });

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border">
                    <h2 className="text-2xl font-bold text-gray-900">{t('nav_maintenance')}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setMaintenanceViewMode('kanban')} className={`p-2 rounded-lg ${maintenanceViewMode === 'kanban' ? 'bg-brand text-white' : 'bg-gray-100'}`}><LayoutGrid size={20}/></button>
                        <button onClick={() => setMaintenanceViewMode('list')} className={`p-2 rounded-lg ${maintenanceViewMode === 'list' ? 'bg-brand text-white' : 'bg-gray-100'}`}><List size={20}/></button>
                        <button onClick={() => setIsCreateWOModalOpen(true)} className="btn-primary py-2 px-4 text-sm ml-2"><Plus size={16}/> {t('create_wo')}</button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-4">
                     <select className="input-modern w-40" value={maintenanceFilterPriority} onChange={(e) => setMaintenanceFilterPriority(e.target.value)}>
                         <option value="all">All Priorities</option>
                         <option value={Priority.HIGH}>High</option>
                         <option value={Priority.CRITICAL}>Critical</option>
                     </select>
                </div>

                {/* Kanban View */}
                {maintenanceViewMode === 'kanban' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
                        {['Open', 'In Progress', 'Closed'].map(status => (
                            <div key={status} className="bg-gray-50 rounded-2xl p-4 min-w-[300px]">
                                <h3 className="font-bold text-gray-700 mb-4 flex justify-between">
                                    {status} 
                                    <span className="bg-white px-2 py-1 rounded text-xs shadow-sm">{filteredWOs.filter(w => w.status === status).length}</span>
                                </h3>
                                <div className="space-y-3">
                                    {filteredWOs.filter(w => w.status === status).map(wo => {
                                        const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                                        return (
                                            <div key={wo.wo_id} className="bg-white p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${wo.priority === Priority.CRITICAL ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{wo.priority}</span>
                                                    <span className="text-xs text-gray-400">#{wo.wo_id}</span>
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-sm">{asset?.name || 'Unknown Asset'}</h4>
                                                <p className="text-xs text-text-muted mt-1 line-clamp-2">{wo.description}</p>
                                                <div className="mt-3 flex gap-2">
                                                     {status === 'Open' && <button onClick={() => { setSelectedWOForAssignment(wo); setIsAssignModalOpen(true); }} className="flex-1 py-1.5 bg-brand/10 text-brand text-xs font-bold rounded hover:bg-brand hover:text-white transition">{t('assign')}</button>}
                                                     <button onClick={() => { setSelectedWorkOrderForDetails(wo); setIsWorkOrderDetailsModalOpen(true); }} className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><Eye size={16}/></button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* List View */}
                {maintenanceViewMode === 'list' && (
                     <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                 <tr>
                                     <th className="px-6 py-4">ID</th>
                                     <th className="px-6 py-4">Asset</th>
                                     <th className="px-6 py-4">Priority</th>
                                     <th className="px-6 py-4">Status</th>
                                     <th className="px-6 py-4">Assigned To</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {filteredWOs.map(wo => (
                                     <tr key={wo.wo_id} className="hover:bg-gray-50">
                                         <td className="px-6 py-4 font-mono">#{wo.wo_id}</td>
                                         <td className="px-6 py-4 font-bold">{assets.find(a => a.asset_id === wo.asset_id)?.name}</td>
                                         <td className="px-6 py-4">{wo.priority}</td>
                                         <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{wo.status}</span></td>
                                         <td className="px-6 py-4">{users.find(u => u.user_id === wo.assigned_to_id)?.name || '-'}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                )}
                
                {/* Assignment Modal */}
                {isAssignModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                            <h3 className="font-bold text-lg mb-4">{t('assign_technician')}</h3>
                            <button onClick={handleSmartAssign} className="w-full mb-4 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-indigo-100 hover:bg-indigo-100 transition"><BrainCircuit size={18}/> {t('btn_smart_assign')}</button>
                            
                            {recommendedTechs.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    <div className="text-xs font-bold text-text-muted uppercase">AI Recommendations</div>
                                    {recommendedTechs.slice(0, 2).map(rec => (
                                        <div key={rec.user.user_id} onClick={() => setSelectedTechForAssignment(rec.user.user_id.toString())} className={`p-2 border rounded-lg cursor-pointer flex justify-between items-center ${selectedTechForAssignment === rec.user.user_id.toString() ? 'border-brand bg-brand/5' : 'hover:bg-gray-50'}`}>
                                            <div>
                                                <div className="font-bold text-sm">{rec.user.name}</div>
                                                <div className="text-xs text-green-600">{rec.reason}</div>
                                            </div>
                                            <div className="font-bold text-brand">{rec.score} pts</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <select className="input-modern mb-4" value={selectedTechForAssignment} onChange={e => setSelectedTechForAssignment(e.target.value)}>
                                <option value="">Select Technician...</option>
                                {users.filter(u => u.role === UserRole.TECHNICIAN).map(u => (
                                    <option key={u.user_id} value={u.user_id}>{u.name}</option>
                                ))}
                            </select>
                            
                            <div className="flex gap-2">
                                <button onClick={() => setIsAssignModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                <button onClick={handleAssignSubmit} className="flex-1 btn-primary">Assign</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 4. INVENTORY (Restored)
    if (currentView === 'inventory') {
        return (
            <div className="space-y-6 animate-in fade-in">
                 <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                     <div className="flex justify-between items-center mb-6">
                         <h2 className="text-2xl font-bold text-gray-900">{t('nav_inventory')}</h2>
                         <button className="btn-secondary text-sm"><Printer size={16}/> Report</button>
                     </div>
                     <table className="w-full text-sm text-left">
                         <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                             <tr>
                                 <th className="px-6 py-4">{t('part_name')}</th>
                                 <th className="px-6 py-4">{t('stock_level')}</th>
                                 <th className="px-6 py-4">{t('unit_cost')}</th>
                                 <th className="px-6 py-4 text-end">{t('actions')}</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {inventory.map(part => (
                                 <tr key={part.part_id} className="hover:bg-gray-50">
                                     <td className="px-6 py-4 font-bold text-gray-900">{part.part_name}</td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded font-bold text-xs ${part.current_stock <= part.min_reorder_level ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                                             {part.current_stock} units
                                         </span>
                                     </td>
                                     <td className="px-6 py-4">${part.cost}</td>
                                     <td className="px-6 py-4 text-end">
                                         <button onClick={() => initiateRestock(part)} className="text-brand font-bold hover:underline">{t('btn_restock')}</button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>

                 {restockModalOpen && (
                     <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                         <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                             <h3 className="font-bold text-lg mb-4">{t('restock_modal_title')}</h3>
                             <p className="text-sm text-gray-600 mb-4">Adding stock for: <b>{selectedPartForRestock?.part_name}</b></p>
                             <input type="number" className="input-modern mb-4" placeholder="Qty" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} />
                             <div className="flex gap-2">
                                 <button onClick={() => setRestockModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                 <button onClick={handleRestockPreCheck} className="flex-1 btn-primary">Add</button>
                             </div>
                         </div>
                     </div>
                 )}
            </div>
        )
    }

    // 5. CALIBRATION (Restored)
    if (currentView === 'calibration') {
        const calibrationAssets = assets.filter(a => a.next_calibration_date);
        return (
            <div className="space-y-6 animate-in fade-in">
                 <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                     <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('cal_dashboard')}</h2>
                     <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                 <tr>
                                     <th className="px-6 py-4">Asset</th>
                                     <th className="px-6 py-4">Last Cal.</th>
                                     <th className="px-6 py-4">Next Due</th>
                                     <th className="px-6 py-4">Status</th>
                                     <th className="px-6 py-4 text-end">Action</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {calibrationAssets.map(asset => {
                                     const isOverdue = new Date(asset.next_calibration_date!) < new Date();
                                     return (
                                         <tr key={asset.asset_id} className="hover:bg-gray-50">
                                             <td className="px-6 py-4 font-bold">{asset.name}</td>
                                             <td className="px-6 py-4">{asset.last_calibration_date}</td>
                                             <td className="px-6 py-4">{asset.next_calibration_date}</td>
                                             <td className="px-6 py-4">
                                                 <span className={`px-2 py-1 rounded text-xs font-bold ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                     {isOverdue ? t('cal_overdue') : t('cal_compliant')}
                                                 </span>
                                             </td>
                                             <td className="px-6 py-4 text-end">
                                                 <button onClick={() => { setAssetToCalibrate(asset); setUpdateCalibrationModalOpen(true); }} className="text-brand font-bold hover:underline">{t('btn_update_cal')}</button>
                                             </td>
                                         </tr>
                                     )
                                 })}
                             </tbody>
                         </table>
                     </div>
                 </div>
                 
                 {updateCalibrationModalOpen && (
                     <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                         <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                             <h3 className="font-bold text-lg mb-4">{t('update_cal_title')}</h3>
                             <p className="text-sm mb-4">Recording new calibration for <b>{assetToCalibrate?.name}</b></p>
                             <input type="date" className="input-modern mb-4" value={newCalibrationDate} onChange={e => setNewCalibrationDate(e.target.value)} />
                             <div className="flex gap-2">
                                 <button onClick={() => setUpdateCalibrationModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                                 <button onClick={handleUpdateCalibration} className="flex-1 btn-primary">Record</button>
                             </div>
                         </div>
                     </div>
                 )}
            </div>
        )
    }

    // 6. ANALYSIS & KNOWLEDGE BASE (Restored)
    if (currentView === 'analysis') {
        return (
            <div className="space-y-6 animate-in fade-in">
                 <div className="bg-white border-b border-border p-4 sticky top-0 z-30 flex gap-4">
                     <button onClick={() => setActiveTab('tab_analytics')} className={`pb-2 border-b-2 font-bold ${activeTab === 'tab_analytics' ? 'border-brand text-brand' : 'border-transparent text-gray-500'}`}>{t('tab_analytics')}</button>
                     <button onClick={() => setActiveTab('tab_kb')} className={`pb-2 border-b-2 font-bold ${activeTab === 'tab_kb' ? 'border-brand text-brand' : 'border-transparent text-gray-500'}`}>{t('tab_kb')}</button>
                     <button onClick={() => setActiveTab('tab_reports')} className={`pb-2 border-b-2 font-bold ${activeTab === 'tab_reports' ? 'border-brand text-brand' : 'border-transparent text-gray-500'}`}>{t('tab_reports')}</button>
                 </div>

                 {activeTab === 'tab_analytics' && (
                     <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                 <h3 className="font-bold mb-4">{t('chart_mttr_trend')}</h3>
                                 <ResponsiveContainer width="100%" height={250}><LineChart data={analyticsData.mttrTrend}><XAxis dataKey="month"/><YAxis/><Tooltip/><Line type="monotone" dataKey="hours" stroke="#3B82F6" strokeWidth={3}/></LineChart></ResponsiveContainer>
                             </div>
                             <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                  <h3 className="font-bold mb-4">{t('table_risk_report')}</h3>
                                  <div className="overflow-y-auto max-h-[250px]">
                                      <table className="w-full text-sm text-left">
                                          <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase sticky top-0">
                                              <tr>
                                                  <th className="px-4 py-2">Asset</th>
                                                  <th className="px-4 py-2">Score</th>
                                                  <th className="px-4 py-2">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              {analyticsData.riskData.map(asset => (
                                                  <tr key={asset.asset_id} className="border-b">
                                                      <td className="px-4 py-2 font-medium">{asset.name}</td>
                                                      <td className="px-4 py-2">
                                                          <div className="flex items-center gap-2">
                                                              <div className="w-full bg-gray-200 rounded-full h-2">
                                                                  <div className={`h-2 rounded-full ${asset.risk_score > 70 ? 'bg-red-500' : asset.risk_score > 40 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{width: `${asset.risk_score}%`}}></div>
                                                              </div>
                                                              <span className="text-xs font-bold">{asset.risk_score}</span>
                                                          </div>
                                                      </td>
                                                      <td className="px-4 py-2 text-xs">
                                                          {asset.risk_score > 70 ? <span className="text-red-600 font-bold">Urgent Maint.</span> : 'Monitor'}
                                                      </td>
                                                  </tr>
                                              ))}
                                          </tbody>
                                      </table>
                                  </div>
                             </div>
                         </div>
                     </div>
                 )}

                 {activeTab === 'tab_kb' && (
                     <div className="space-y-6">
                         <div className="flex justify-between items-center">
                             <h2 className="text-2xl font-bold text-gray-900">{t('kb_library')}</h2>
                             <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                                 <button onClick={() => setKbMode('list')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${kbMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}><List size={16}/></button>
                                 <button onClick={() => setKbMode('ai')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2 ${kbMode === 'ai' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}><Sparkles size={16}/> AI Search</button>
                             </div>
                         </div>

                         {kbMode === 'ai' ? (
                             <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100 text-center">
                                 <div className="max-w-2xl mx-auto space-y-6">
                                     <BrainCircuit size={48} className="mx-auto text-indigo-500"/>
                                     <h3 className="text-xl font-bold text-indigo-900">{t('ai_search_title')}</h3>
                                     <div className="relative">
                                         <input type="text" className="w-full p-4 rounded-xl border border-indigo-200 shadow-sm focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 outline-none" placeholder={t('ai_search_placeholder')} value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}/>
                                         <button onClick={handleAiSearch} disabled={isAiSearching} className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-6 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                                             {isAiSearching ? '...' : t('btn_analyze')}
                                         </button>
                                     </div>
                                     {aiResult && (
                                         <div className="text-left bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-in slide-in-from-bottom-4">
                                             <div className="mb-4">
                                                 <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wider mb-2">{t('ai_explanation')}</h4>
                                                 <p className="text-gray-700 leading-relaxed">{aiResult.explanation}</p>
                                             </div>
                                             <div className="mb-4">
                                                 <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wider mb-2">{t('ai_solution')}</h4>
                                                 <p className="text-gray-700 leading-relaxed whitespace-pre-line">{aiResult.solution}</p>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             </div>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {filteredKbDocs.map(doc => (
                                     <div key={doc.id} className="bg-white p-4 rounded-xl border border-border flex items-center justify-between hover:shadow-md transition cursor-pointer">
                                         <div className="flex items-center gap-3">
                                             <div className="p-3 bg-red-50 text-red-500 rounded-lg"><FileText size={20}/></div>
                                             <div>
                                                 <div className="font-bold text-gray-900">{doc.title}</div>
                                                 <div className="text-xs text-text-muted">{doc.category} • {doc.fileSize}</div>
                                             </div>
                                         </div>
                                         <Download size={18} className="text-gray-400 hover:text-brand"/>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 )}
                 
                 {activeTab === 'tab_reports' && (
                     <div className="bg-white p-6 rounded-2xl border border-border shadow-soft text-center py-20">
                         <FileCode size={48} className="mx-auto text-gray-300 mb-4"/>
                         <h3 className="text-xl font-bold text-gray-900">Report Generator</h3>
                         <p className="text-text-muted mb-6">Create detailed CM, PPM, or Compliance reports in PDF format.</p>
                         <button onClick={handleFindJobReport} className="btn-primary mx-auto">Generate Sample Report</button>
                     </div>
                 )}
            </div>
        )
    }

    // 7. USERS (Restored)
    if (currentView === 'users') {
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

    // 8. RFID & AUDIT (New View)
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Header with Switch */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Radio className="text-brand"/> {t('nav_rfid')}</h2>
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                         <button onClick={() => setRfidTab('audit')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${rfidTab === 'audit' ? 'bg-white shadow text-brand' : 'text-gray-500'}`}>{t('rfid_audit')}</button>
                         <button onClick={() => setRfidTab('gate')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${rfidTab === 'gate' ? 'bg-white shadow text-brand' : 'text-gray-500'}`}>{t('rfid_gate_monitor')}</button>
                    </div>
                </div>

                {rfidTab === 'audit' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Control Panel */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-fit">
                            <h3 className="font-bold text-lg mb-4">{t('start_audit')}</h3>
                            {!activeAudit ? (
                                <div className="space-y-4">
                                    <select className="input-modern" value={selectedAuditDept} onChange={e => setSelectedAuditDept(e.target.value)}>
                                        <option value="">Select Department...</option>
                                        {departmentZones.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <button onClick={startAudit} className="w-full btn-primary">{t('start_audit')}</button>
                                </div>
                            ) : (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-blue-50 text-brand rounded-full flex items-center justify-center mx-auto animate-pulse">
                                        <Scan size={32}/>
                                    </div>
                                    <h4 className="font-bold text-xl">{t('audit_in_progress')}</h4>
                                    <p className="text-sm text-text-muted">{activeAudit.department}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-xl">
                                            <div className="text-2xl font-bold">{activeAudit.total_expected}</div>
                                            <div className="text-xs text-text-muted">{t('expected_assets')}</div>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-xl text-green-700">
                                            <div className="text-2xl font-bold">{activeAudit.total_scanned}</div>
                                            <div className="text-xs font-bold">{t('scanned_assets')}</div>
                                        </div>
                                    </div>

                                    <button onClick={simulateRfidScan} className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-brand rounded-xl font-bold text-gray-500 hover:text-brand transition">
                                        {t('simulate_scan')}
                                    </button>

                                    <button onClick={() => setActiveAudit(null)} className="text-red-500 text-sm font-bold hover:underline">Stop Audit</button>
                                </div>
                            )}
                        </div>

                        {/* Audit List */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                             <div className="p-4 border-b bg-gray-50 flex justify-between">
                                 <h3 className="font-bold">{t('audit_summary')}</h3>
                                 {activeAudit && <span className="text-xs bg-brand text-white px-2 py-1 rounded font-bold">{((activeAudit.total_scanned / activeAudit.total_expected) * 100).toFixed(0)}% Complete</span>}
                             </div>
                             {activeAudit ? (
                                 <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
                                     {/* Missing Assets First */}
                                     {activeAudit.missing_assets.map(id => {
                                         const asset = assets.find(a => a.asset_id === id);
                                         return (
                                             <div key={id} className="flex justify-between items-center p-3 border border-red-100 bg-red-50/50 rounded-xl">
                                                 <div className="flex items-center gap-3">
                                                     <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                     <div>
                                                         <div className="font-bold text-gray-900">{asset?.name}</div>
                                                         <div className="text-xs text-red-500 font-bold">{t('missing_assets')}</div>
                                                     </div>
                                                 </div>
                                                 <span className="font-mono text-xs text-gray-400">{id}</span>
                                             </div>
                                         )
                                     })}
                                     {/* Found Assets */}
                                     {activeAudit.found_assets.map(id => {
                                         const asset = assets.find(a => a.asset_id === id);
                                         return (
                                             <div key={id} className="flex justify-between items-center p-3 border border-green-100 bg-green-50/50 rounded-xl opacity-60">
                                                 <div className="flex items-center gap-3">
                                                     <Check size={16} className="text-green-600"/>
                                                     <div>
                                                         <div className="font-bold text-gray-900">{asset?.name}</div>
                                                         <div className="text-xs text-green-600 font-bold">Verified</div>
                                                     </div>
                                                 </div>
                                                 <span className="font-mono text-xs text-gray-400">{id}</span>
                                             </div>
                                         )
                                     })}
                                 </div>
                             ) : (
                                 <div className="p-12 text-center text-gray-400">Start an audit session to verify inventory.</div>
                             )}
                        </div>
                    </div>
                )}

                {rfidTab === 'gate' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[500px] flex flex-col items-center justify-center text-center space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full animate-pulse"></div>
                                <img src="https://cdn-icons-png.flaticon.com/512/6257/6257896.png" className="w-48 h-48 relative z-10 opacity-80" alt="RFID Gate" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">Live Gate Monitor</h3>
                            <p className="text-text-muted max-w-xs">Simulating RFID Readers installed at department entrances.</p>
                            <button onClick={simulateGatePassage} className="btn-primary w-full max-w-sm">
                                {t('simulate_gate_pass')}
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden h-[500px] flex flex-col">
                             <div className="p-4 border-b bg-gray-50 font-bold text-lg">{t('gate_event')} Log</div>
                             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                 {gateLogs.length === 0 ? (
                                     <div className="text-center text-gray-400 mt-20">No recent movements detected.</div>
                                 ) : (
                                     gateLogs.map(log => {
                                         const asset = assets.find(a => a.asset_id === log.asset_id);
                                         return (
                                             <div key={log.id} className="flex items-center justify-between p-3 border rounded-xl animate-in slide-in-from-right">
                                                 <div className="flex items-center gap-3">
                                                     <div className={`p-2 rounded-lg ${log.direction === 'ENTER' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                         {log.direction === 'ENTER' ? <LogIn size={20}/> : <LogOut size={20}/>}
                                                     </div>
                                                     <div>
                                                         <div className="font-bold text-gray-900">{asset?.name}</div>
                                                         <div className="text-xs text-text-muted">{getLocationName(log.gate_location_id)}</div>
                                                     </div>
                                                 </div>
                                                 <div className="text-right">
                                                     <div className={`text-xs font-bold ${log.direction === 'ENTER' ? 'text-green-600' : 'text-orange-600'}`}>
                                                         {log.direction}
                                                     </div>
                                                     <div className="text-[10px] font-mono text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                                 </div>
                                             </div>
                                         )
                                     })
                                 )}
                             </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return <div>View not found</div>;
};
