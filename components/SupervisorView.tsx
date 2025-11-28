
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ComposedChart } from 'recharts';
import { Asset, AssetStatus, InventoryPart, WorkOrder, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, Priority, WorkOrderType, User, UserRole, AuditSession, RfidGateLog } from '../types';
import { getLocationName, getAssetDocuments, getMovementLogs, getLocations, getDetailedReports, getPMReports, getSystemAlerts, getKnowledgeBaseDocs } from '../services/mockDb';
import * as api from '../services/api';
import { searchKnowledgeBase } from '../services/geminiService';
import { calculateAssetRiskScore, recommendTechnicians, TechRecommendation } from '../services/predictiveService';
import { useZebraScanner } from '../services/zebraService'; // Import the new service
import { AlertTriangle, Clock, AlertCircle, Activity, MapPin, FileText, Search, Calendar, TrendingUp, Sparkles, Package, ChevronLeft, Wrench, X, Download, Printer, ArrowUpCircle, Bell, ShieldAlert, Lock, BarChart2, Zap, LayoutGrid, List, Plus, UploadCloud, Check, Users as UsersIcon, Phone, Mail, Key, ClipboardCheck, RefreshCw, Book, FileCheck, FileCode, Eye, History, Thermometer, PieChart as PieChartIcon, MoreVertical, Filter, BrainCircuit, Library, Lightbulb, BookOpen, ArrowRight, UserPlus, FileSignature, CheckSquare, PenTool, Layers, Box, Signal, DollarSign, Star, ThumbsUp, Radio, LogIn, LogOut, Scan, Bluetooth, Wifi, MonitorCheck } from 'lucide-react';
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

        return { mttrTrend, techPerformance, statusData, riskData, tcoData };
    }, [assets, workOrders, users]);

    // --- HANDLERS ---
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
    // ... (Dashboard, Assets, Maintenance, Inventory, Calibration, Analysis, Users - Keep same)

    if (currentView === 'dashboard') {
        // ... (Keep Dashboard render)
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
                {/* KPI Cards... (Keep existing) */}
            </div>
        );
    }
    
    // ... (Assets, Maintenance, Inventory, Calibration, Analysis, Users - Keep same)
    
    // 8. RFID & AUDIT (Updated)
    if (currentView === 'rfid') {
        return (
            <div className="space-y-6 animate-in fade-in">
                {/* Header with Switch */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Radio className="text-brand"/> {t('nav_rfid')}</h2>
                        <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold ${zebraStatus === 'listening' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            <Bluetooth size={14} />
                            {zebraStatus === 'listening' ? t('zebra_connected') : t('connect_zebra')}
                        </div>
                    </div>
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
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all ${zebraStatus === 'processing' ? 'bg-green-500 text-white scale-110' : 'bg-blue-50 text-brand animate-pulse'}`}>
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
                                             <div key={id} className="flex justify-between items-center p-3 border border-green-100 bg-green-50/50 rounded-xl opacity-60 animate-in slide-in-from-left">
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

                {/* GATE MONITOR (REAL-TIME STATIC READERS) */}
                {rfidTab === 'gate' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT: STATUS PANEL */}
                        <div className="bg-white p-6 rounded-2xl border border-border shadow-soft h-[600px] flex flex-col space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">{t('reader_status')}</h3>
                                <div className={`w-3 h-3 rounded-full ${isGateMonitoring ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            </div>

                            <button 
                                onClick={() => setIsGateMonitoring(!isGateMonitoring)}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isGateMonitoring ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-brand text-white shadow-lg shadow-brand/20'}`}
                            >
                                <Wifi size={20}/>
                                {isGateMonitoring ? t('deactivate_gates') : t('activate_gates')}
                            </button>
                            
                            <div className="space-y-3 flex-1 overflow-y-auto">
                                {gateReaders.map(reader => (
                                    <div key={reader.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm text-gray-800">{reader.name}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${reader.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                                {reader.status === 'online' ? t('reader_online') : t('reader_offline')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-text-muted font-mono">
                                            <span>ID: {reader.id}</span>
                                            <span>Ping: {reader.lastPing || '--:--'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Manual Override */}
                            <div className="p-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400 mb-2">Simulate Manual Passage (Test)</p>
                                <button onClick={simulateGatePassage} disabled={!isGateMonitoring} className="w-full btn-secondary text-xs disabled:opacity-50">
                                    Test Single Pass
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: LIVE FEED */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-soft overflow-hidden h-[600px] flex flex-col">
                             <div className="p-4 border-b bg-gray-50 font-bold text-lg flex items-center gap-2">
                                <MonitorCheck size={20} className="text-brand"/> {t('live_gate_feed')}
                             </div>
                             
                             {!isGateMonitoring && gateLogs.length === 0 ? (
                                 <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60">
                                     <Radio size={48} className="mb-4"/>
                                     <p>{t('gate_network_inactive')}</p>
                                     <p className="text-xs">Activate monitoring to see real-time events.</p>
                                 </div>
                             ) : (
                                 <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                                     {gateLogs.length === 0 ? (
                                         <div className="text-center text-gray-400 mt-20">Monitoring... Waiting for tags.</div>
                                     ) : (
                                         gateLogs.map(log => {
                                             const asset = assets.find(a => a.asset_id === log.asset_id);
                                             // Determine if unauthorized: E.g., moving 'EXIT' from assigned department?
                                             const assetLoc = getLocations().find(l => l.location_id === asset?.location_id);
                                             const isUnauthorized = false; // Logic simplified for simulation

                                             return (
                                                 <div key={log.id} className={`flex items-center justify-between p-3 border rounded-xl animate-in slide-in-from-top duration-300 ${isUnauthorized ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                                                     <div className="flex items-center gap-4">
                                                         <div className={`p-3 rounded-lg ${log.direction === 'ENTER' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                             {log.direction === 'ENTER' ? <LogIn size={20}/> : <LogOut size={20}/>}
                                                         </div>
                                                         <div>
                                                             <div className="font-bold text-gray-900">{asset?.name} <span className="text-gray-400 font-normal text-xs">({asset?.model})</span></div>
                                                             <div className="text-xs text-text-muted flex items-center gap-1">
                                                                 <MapPin size={10}/> {gateReaders.find(r => r.id === log.gate_location_id)?.name || 'Unknown Gate'}
                                                             </div>
                                                         </div>
                                                     </div>
                                                     <div className="text-right">
                                                         {isUnauthorized ? (
                                                             <div className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded flex items-center gap-1">
                                                                 <ShieldAlert size={12}/> {t('unauth_move')}
                                                             </div>
                                                         ) : (
                                                             <div className={`text-xs font-bold ${log.direction === 'ENTER' ? 'text-green-600' : 'text-blue-600'}`}>
                                                                 {log.direction}
                                                             </div>
                                                         )}
                                                         <div className="text-[10px] font-mono text-gray-400 mt-1">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                                     </div>
                                                 </div>
                                             )
                                         })
                                     )}
                                 </div>
                             )}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Default Fallback
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

    return <div>View not found</div>;
};
