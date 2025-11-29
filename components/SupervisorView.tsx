
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService'; // Import the new service
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
        // If in Audit Mode
        if (rfidTab === 'audit' && activeAudit) {
            handleRealScan(scannedTag);
        }
        // If in Gate Mode - treat manual scan as an override or test
        else if (rfidTab === 'gate') {
            handleGateScan(scannedTag, 101); // Default to ICU gate for manual
        }
    };

    // Activate scanner listener only when RFID view is open
    const { status: zebraStatus, lastScanned: lastZebraScan } = useZebraScanner({
        onScan: handleScannerInput,
        isActive: currentView === 'rfid'
    });

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
        if (currentView !== 'rfid') setIsGateMonitoring(false);
    }, [currentView]);

    // Simulation Loop (Dashboard Traffic)
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

    // --- REAL-TIME GATE SIMULATION LOOP ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGateMonitoring && currentView === 'rfid' && rfidTab === 'gate') {
            // Set Readers Online
            setGateReaders(prev => prev.map(r => ({ ...r, status: 'online', lastPing: new Date().toLocaleTimeString() })));
            
            interval = setInterval(() => {
                // 1. Pick a random gate
                const randomReader = gateReaders[Math.floor(Math.random() * gateReaders.length)];
                
                // 2. Pick a random asset
                const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                
                // 3. Determine if unauthorized (Simplified: If asset's designated department != gate's department)
                // For this sim, we'll just check if it's moving
                
                const direction = Math.random() > 0.5 ? 'ENTER' : 'EXIT';
                
                // 4. Create Log
                const newLog: RfidGateLog = {
                    id: Date.now(),
                    asset_id: randomAsset.asset_id,
                    rfid_tag: randomAsset.rfid_tag_id || randomAsset.asset_id,
                    gate_location_id: randomReader.id,
                    direction: direction,
                    timestamp: new Date().toISOString()
                };
                
                setGateLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50
                
                // 5. Trigger alert if 'EXIT' from ICU/OR for critical device
                if (direction === 'EXIT' && (randomAsset.model.includes('Ventilator') || randomAsset.model.includes('Defib'))) {
                     // Add alert logic here if desired
                }

                // Update ping
                setGateReaders(prev => prev.map(r => r.id === randomReader.id ? { ...r, lastPing: new Date().toLocaleTimeString() } : r));

            }, 3500); // New event every 3.5 seconds
        } else {
             // Set Readers Offline
             setGateReaders(prev => prev.map(r => ({ ...r, status: 'offline' })));
        }
        return () => clearInterval(interval);
    }, [isGateMonitoring, currentView, rfidTab, assets]);


    // Analytics Calculations
    const analyticsData = useMemo(() => {
        // ... (Existing Analytics Calculations - kept same)
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

        const statusData = [ { name: 'Running', value: assets.filter(a => a.status === AssetStatus.RUNNING).length, color: '#10B981' }, { name: 'Down', value: assets.filter(a => a.status === AssetStatus.DOWN).length, color: '#EF4444' }, { name: 'Maint.', value: assets.filter(a => a.status === AssetStatus.UNDER_MAINT).length, color: '#F59E0B' } ];
        const riskData = [...assets].sort((a,b) => b.risk_score - a.risk_score).slice(0, 10);
        
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

        // Financial & Frequency Analysis Data
        const financialAnalysis = assets.map(a => {
            const woCount = workOrders.filter(w => w.asset_id === a.asset_id || w.asset_id === a.nfc_tag_id).length;
            const maintCost = a.accumulated_maintenance_cost || 0;
            const purchase = a.purchase_cost || 1; // avoid div by zero
            return {
                id: a.asset_id,
                name: a.name,
                model: a.model,
                purchase: purchase,
                maintCost: maintCost,
                woCount: woCount,
                ratio: parseFloat((maintCost / purchase).toFixed(2))
            };
        }).sort((a,b) => b.ratio - a.ratio);

        return { mttrTrend, techPerformance, statusData, riskData, tcoData, financialAnalysis };
    }, [assets, workOrders, users]);

    // --- HANDLERS ---
    const triggerNotification = () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // (Existing handlers kept same...)
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
            
            // Trigger Notification UI
            console.log(`[UI] Notification triggered for assignment of WO #${selectedWOForAssignment.wo_id}`);
            triggerNotification();

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

    const handleRealScan = (scannedId: string) => {
         if(!activeAudit) return;
         // Clean scanned ID (sometimes scanners add \r\n)
         const cleanId = scannedId.trim();
         
         // Find if this asset is in missing list
         if (activeAudit.missing_assets.includes(cleanId)) {
             setActiveAudit(prev => {
                if(!prev) return null;
                return {
                    ...prev,
                    total_scanned: prev.total_scanned + 1,
                    missing_assets: prev.missing_assets.filter(id => id !== cleanId),
                    found_assets: [...prev.found_assets, cleanId]
                };
             });
         } else {
             console.log("Unexpected asset scanned:", cleanId);
         }
    };

    const simulateRfidScan = () => {
        if(!activeAudit) return;
        // Randomly pick a missing asset to "scan"
        if(activeAudit.missing_assets.length > 0) {
            handleRealScan(activeAudit.missing_assets[0]);
        }
    };

    const handleGateScan = (scannedId: string, locationId: number) => {
        const cleanId = scannedId.trim();
        const asset = assets.find(a => a.asset_id === cleanId || a.rfid_tag_id === cleanId);
        
        if (asset) {
            const direction = Math.random() > 0.5 ? 'ENTER' : 'EXIT';
            const newLog: RfidGateLog = {
                id: Date.now(),
                asset_id: asset.asset_id,
                rfid_tag: cleanId,
                gate_location_id: locationId, 
                direction: direction,
                timestamp: new Date().toISOString()
            };
            setGateLogs(prev => [newLog, ...prev]);
        }
    };

    const simulateGatePassage = () => {
        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
        handleGateScan(randomAsset.rfid_tag_id || randomAsset.asset_id, 101);
    };

    // --- RENDER HELPERS ---
    const departmentZones = [
        // ... (Keep existing zones)
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
            return loc?.department === deptId || (loc?.department && loc.department.includes(deptId));
        });
    };
    
    // ---------------- VIEW ROUTING ----------------

    if (currentView === 'assets') {
        if (selectedAsset) {
            // ASSET DETAILS VIEW
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <button onClick={() => setSelectedAsset(null)} className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-4">
                        <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
                    </button>

                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-soft flex flex-col md:flex-row gap-6">
                        <div className="w-32 h-32 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                             {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover" /> : <Package size={40} className="text-gray-400"/>}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedAsset.name}</h2>
                                    <p className="text-text-muted font-medium">{selectedAsset.manufacturer} • {selectedAsset.model}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${
                                    selectedAsset.status === AssetStatus.RUNNING ? 'bg-success/10 text-success' : 
                                    selectedAsset.status === AssetStatus.DOWN ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning-dark'
                                }`}>
                                    {selectedAsset.status}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-xs text-text-muted font-bold uppercase">{t('serial_number')}</div>
                                    <div className="font-mono text-sm font-bold">{selectedAsset.serial_number || 'N/A'}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-xs text-text-muted font-bold uppercase">{t('location')}</div>
                                    <div className="text-sm font-bold">{getLocationName(selectedAsset.location_id)}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-xs text-text-muted font-bold uppercase">{t('warranty_exp')}</div>
                                    <div className="text-sm font-bold">{selectedAsset.warranty_expiration || 'N/A'}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="text-xs text-text-muted font-bold uppercase">{t('risk_score')}</div>
                                    <div className={`text-sm font-bold ${selectedAsset.risk_score > 70 ? 'text-danger' : 'text-success'}`}>{selectedAsset.risk_score}/100</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Maintenance History */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-border shadow-soft">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><History size={18} className="text-brand"/> {t('maintenance_history')}</h3>
                            <div className="space-y-4">
                                {workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id).length > 0 ? (
                                    workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id).map(wo => {
                                        const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                        return (
                                            <div key={wo.wo_id} className="p-4 border border-border rounded-xl hover:bg-gray-50 transition flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{wo.description}</div>
                                                    <div className="text-xs text-text-muted mt-1 flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${wo.status === 'Closed' ? 'bg-success' : 'bg-warning'}`}></span>
                                                        {new Date(wo.created_at).toLocaleDateString()} • {wo.type}
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs">
                                                    <div className="font-bold text-gray-700">{tech ? tech.name : `Tech #${wo.assigned_to_id}`}</div>
                                                    <div className="text-text-muted">#{wo.wo_id}</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-gray-400 py-8">No maintenance history available.</div>
                                )}
                            </div>
                        </div>

                        {/* Calibration & Docs */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity size={18} className="text-purple-500"/> Calibration</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                                        <span className="text-sm font-medium text-purple-900">Last Calibrated</span>
                                        <span className="text-sm font-bold text-purple-700">{selectedAsset.last_calibration_date}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-100">
                                        <span className="text-sm font-medium text-purple-900">Next Due</span>
                                        <span className="text-sm font-bold text-purple-700">{selectedAsset.next_calibration_date}</span>
                                    </div>
                                    <div className="pt-2">
                                        <div className="text-xs font-bold text-text-muted uppercase mb-2">History</div>
                                        {workOrders.filter(wo => (wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id) && wo.type === WorkOrderType.CALIBRATION).slice(0, 3).map(wo => (
                                            <div key={wo.wo_id} className="text-xs flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                <span>{new Date(wo.created_at).toLocaleDateString()}</span>
                                                <span className="text-success font-bold">Pass</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl border border-border shadow-soft">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><BookOpen size={18} className="text-blue-500"/> Documents</h3>
                                <div className="space-y-2">
                                    {getAssetDocuments(selectedAsset.asset_id).map(doc => (
                                        <div key={doc.doc_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group">
                                            <FileText size={16} className="text-text-muted group-hover:text-brand"/>
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-brand truncate">{doc.title}</span>
                                            <Download size={14} className="ml-auto text-gray-300 group-hover:text-brand"/>
                                        </div>
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
                  <button onClick={() => setIsAddModalOpen(true)} className="btn-primary py-2 px-4 text-sm">
                      <Plus size={16}/> {t('add_equipment')}
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">{t('form_name')}</th>
                                <th className="px-6 py-4">{t('form_model')}</th>
                                <th className="px-6 py-4">{t('serial_number')}</th>
                                <th className="px-6 py-4">{t('location')}</th>
                                <th className="px-6 py-4">{t('status')}</th>
                                <th className="px-6 py-4">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {assets.map(asset => (
                                <tr key={asset.asset_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                                            {asset.image ? <img src={asset.image} className="w-full h-full object-cover"/> : <Package size={16} className="m-auto text-gray-400"/>}
                                        </div>
                                        {asset.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{asset.model}</td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{asset.serial_number}</td>
                                    <td className="px-6 py-4 text-text-muted">{getLocationName(asset.location_id)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            asset.status === AssetStatus.RUNNING ? 'bg-success/10 text-success' : 
                                            asset.status === AssetStatus.DOWN ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning-dark'
                                        }`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => setSelectedAsset(asset)}
                                            className="text-brand font-bold hover:underline text-xs"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
