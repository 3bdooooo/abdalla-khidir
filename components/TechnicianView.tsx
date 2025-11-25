
import React, { useState, useEffect } from 'react';
import { Asset, InventoryPart, WorkOrder, AssetDocument, WorkOrderType, Priority, User } from '../types';
import { analyzeRootCause } from '../services/geminiService';
import { getAssets, getAssetDocuments } from '../services/mockDb';
import * as api from '../services/api';
import { ArrowRight, Check, Scan, Sparkles, ChevronLeft, PenTool, FileText, Clock, Box, Eye, CheckCircle2, Search, AlertTriangle, ListChecks, ClipboardList, CheckSquare, Image as ImageIcon, BookOpen, FileCheck, Filter, Activity, Briefcase, Plus, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TechnicianProps {
  currentUser: User;
  userWorkOrders: WorkOrder[];
  inventory: InventoryPart[];
  refreshData: () => void;
}

export const TechnicianView: React.FC<TechnicianProps> = ({ currentUser, userWorkOrders, inventory, refreshData }) => {
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  
  // Dashboard State
  const [dashboardTab, setDashboardTab] = useState<'requests' | 'inprogress' | 'pms'>('requests');
  
  // Filters State
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  
  // Detail View State
  const [activeDetailTab, setActiveDetailTab] = useState<'diagnosis' | 'parts' | 'visual' | 'finish'>('diagnosis');
  
  const { t, dir } = useLanguage();
  
  // Form State
  const [symptoms, setSymptoms] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [solution, setSolution] = useState('');
  const [signature, setSignature] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [operatingHours, setOperatingHours] = useState<string>('');
  const [selectedParts, setSelectedParts] = useState<{id: number, qty: number}[]>([]);
  const [isArActive, setIsArActive] = useState(false);
  const [partsSearch, setPartsSearch] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Create WO State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWO, setNewWO] = useState({
    assetId: '',
    description: '',
    type: WorkOrderType.CORRECTIVE,
    priority: Priority.MEDIUM
  });

  // Documents Modal State
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [assetDocs, setAssetDocs] = useState<AssetDocument[]>([]);

  // Helper to get Asset for WO
  const getAssetForWO = (assetId: string) => {
      // Note: In real app, we might need to fetch single asset async if list is huge
      return getAssets().find(a => a.asset_id === assetId);
  };

  // Checklist State (Mock)
  const [checklist, setChecklist] = useState<{id: number, text: string, checked: boolean}[]>([
      { id: 1, text: 'Check Power Supply Voltage', checked: false },
      { id: 2, text: 'Inspect Cables for Wear', checked: false },
      { id: 3, text: 'Clean Filters/Vents', checked: false },
      { id: 4, text: 'Verify Calibration Stickers', checked: false },
      { id: 5, text: 'Run Self-Test Sequence', checked: false },
  ]);

  // Reset form when WO changes
  useEffect(() => {
    if (selectedWO) {
      setSymptoms(selectedWO.description);
      setRootCause('');
      setSolution('');
      setSignature('');
      setOperatingHours('');
      setSelectedParts([]);
      setIsArActive(false);
      setPartsSearch('');
      setShowConfirmModal(false);
      setShowDocsModal(false);
      setAssetDocs([]);
      
      // Reset Checklist
      setChecklist(checklist.map(c => ({...c, checked: false})));
      
      // Set initial tab based on type
      if (selectedWO.type === WorkOrderType.PREVENTIVE || selectedWO.type === WorkOrderType.CALIBRATION) {
          setActiveDetailTab('diagnosis'); // Shows checklist
      } else {
          setActiveDetailTab('diagnosis');
      }
    }
  }, [selectedWO]);

  // Start Job / Verify NFC
  const handleStartJob = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    if (!selectedWO) return;
    
    // Capture ID to avoid closure issues in timeout
    const currentWoId = selectedWO.wo_id;
    const currentAssetId = selectedWO.asset_id;

    // Simulate 1.5s scan delay
    setTimeout(async () => {
        await api.startWorkOrder(currentWoId);
        refreshData();
        
        // Update local state to reflect status change immediately for UI
        setSelectedWO(prev => prev ? {...prev, status: 'In Progress'} : null);

        // Fetch and show docs
        const docs = getAssetDocuments(currentAssetId);
        if (docs && docs.length > 0) {
            setAssetDocs(docs);
            setShowDocsModal(true);
        }
    }, 1000);
  };

  const handleAIAnalysis = async () => {
    if (!selectedWO || !symptoms) return;
    
    setIsAnalyzing(true);
    const asset = getAssets().find(a => a.asset_id === selectedWO.asset_id);
    
    const result = await analyzeRootCause(
        asset?.name || 'Unknown Device', 
        symptoms, 
        asset?.model || 'Generic'
    );
    
    setRootCause(result);
    setIsAnalyzing(false);
  };

  const handleSubmit = async () => {
    if (!selectedWO) return;
    
    // 1. Update Inventory (Parallel)
    const stockPromises = selectedParts.map(p => api.updateStock(p.id, p.qty));
    await Promise.all(stockPromises);
    
    // 2. Close WO
    await api.closeWorkOrder(selectedWO.wo_id);
    
    // 3. Reset
    setShowConfirmModal(false);
    refreshData();
    setSelectedWO(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await api.createWorkOrder({
          wo_id: Math.floor(Math.random() * 1000000),
          asset_id: newWO.assetId,
          type: newWO.type,
          priority: newWO.priority,
          description: newWO.description,
          assigned_to_id: currentUser.user_id, // Self-assign
          status: 'Open',
          created_at: new Date().toISOString()
      });
      refreshData();
      setIsCreateModalOpen(false);
      setNewWO({
          assetId: '',
          description: '',
          type: WorkOrderType.CORRECTIVE,
          priority: Priority.MEDIUM
      });
  };

  // Filter Work Orders for Dashboard
  const filteredOrders = userWorkOrders.filter(wo => {
    // 1. Tab Logic (Base Filter)
    let matchesTab = false;
    if (dashboardTab === 'requests') matchesTab = wo.status === 'Open' && wo.type === WorkOrderType.CORRECTIVE;
    else if (dashboardTab === 'inprogress') matchesTab = wo.status === 'In Progress';
    else if (dashboardTab === 'pms') matchesTab = wo.status === 'Open' && (wo.type === WorkOrderType.PREVENTIVE || wo.type === WorkOrderType.CALIBRATION);
    
    if (!matchesTab) return false;

    // 2. Priority Filter
    if (filterPriority !== 'All' && wo.priority !== filterPriority) return false;

    // 3. Status Filter (Optional overlay on tabs)
    if (filterStatus !== 'All' && wo.status !== filterStatus) return false;

    // 4. Type Filter
    if (filterType !== 'All' && wo.type !== filterType) return false;

    return true;
  });

  // Inventory Filter
  const filteredInventory = inventory.filter(p => 
      p.part_name.toLowerCase().includes(partsSearch.toLowerCase())
  );

  // --- VIEW: Task List (Dashboard) ---
  if (!selectedWO) {
    return (
      <div className="space-y-6 font-sans">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 px-1">{t('tech_dashboard')}</h2>
                <p className="text-text-muted px-1 text-sm">Select a task or create new</p>
            </div>
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
            >
                <Plus size={18} /> {t('create_wo')}
            </button>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-white border border-border rounded-xl shadow-sm">
          <button 
            onClick={() => setDashboardTab('requests')} 
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${dashboardTab === 'requests' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:bg-gray-50'}`}
          >
            {t('tab_new_req')}
            {userWorkOrders.filter(w => w.status === 'Open' && w.type === WorkOrderType.CORRECTIVE).length > 0 && (
                <span className="ms-2 bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                    {userWorkOrders.filter(w => w.status === 'Open' && w.type === WorkOrderType.CORRECTIVE).length}
                </span>
            )}
          </button>
          <button 
            onClick={() => setDashboardTab('inprogress')} 
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${dashboardTab === 'inprogress' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:bg-gray-50'}`}
          >
            {t('inprogress')}
             {userWorkOrders.filter(w => w.status === 'In Progress').length > 0 && (
                <span className="ms-2 bg-warning text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                    {userWorkOrders.filter(w => w.status === 'In Progress').length}
                </span>
            )}
          </button>
          <button 
            onClick={() => setDashboardTab('pms')} 
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${dashboardTab === 'pms' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:bg-gray-50'}`}
          >
            {t('tab_scheduled_pm')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative">
                <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <select 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm font-medium outline-none focus:border-brand appearance-none min-w-[140px]"
                >
                    <option value="All">Priority: All</option>
                    <option value={Priority.CRITICAL}>{Priority.CRITICAL}</option>
                    <option value={Priority.HIGH}>{Priority.HIGH}</option>
                    <option value={Priority.MEDIUM}>{Priority.MEDIUM}</option>
                    <option value={Priority.LOW}>{Priority.LOW}</option>
                </select>
            </div>

            <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm font-medium outline-none focus:border-brand appearance-none min-w-[140px]"
                >
                    <option value="All">Type: All</option>
                    <option value={WorkOrderType.CORRECTIVE}>Corrective</option>
                    <option value={WorkOrderType.PREVENTIVE}>Preventive</option>
                    <option value={WorkOrderType.CALIBRATION}>Calibration</option>
                </select>
            </div>

            <div className="relative">
                <Activity className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-border rounded-lg text-sm font-medium outline-none focus:border-brand appearance-none min-w-[140px]"
                >
                    <option value="All">Status: All</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                </select>
            </div>
        </div>

        <div className="grid gap-4 pb-20 mt-4">
        {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-text-muted border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <CheckSquare size={48} className="mx-auto mb-4 opacity-30" />
                <div className="font-medium">No tasks match your filters</div>
            </div>
        ) : (
            filteredOrders.map(wo => {
                const asset = getAssetForWO(wo.asset_id);
                return (
                <div 
                    key={wo.wo_id} 
                    className="bg-white p-4 rounded-xl shadow-sm border border-border hover:border-brand hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                    onClick={() => setSelectedWO(wo)}
                >
                    <div className={`absolute top-0 start-0 w-1.5 h-full ${wo.priority === 'Critical' ? 'bg-danger' : wo.priority === 'High' ? 'bg-orange-500' : 'bg-brand'}`} />
                    
                    <div className="flex gap-4">
                         <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shrink-0">
                             {asset?.image ? (
                                 <img src={asset.image} alt="Asset" className="w-full h-full object-cover" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={24}/></div>
                             )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono font-bold text-text-muted bg-gray-100 px-2 py-1 rounded border border-gray-200">#{wo.wo_id}</span>
                                <div className="flex gap-2">
                                    {wo.type === WorkOrderType.PREVENTIVE && <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200">PM</span>}
                                    {wo.type === WorkOrderType.CALIBRATION && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200">CAL</span>}
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${wo.priority === 'Critical' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-brand/10 text-brand border-brand/20'}`}>
                                        {wo.priority}
                                    </span>
                                </div>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight truncate">{wo.description}</h3>
                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                <Box size={14}/> {wo.asset_id}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 border-t border-gray-100 pt-3 ps-2">
                        <span className="text-xs text-text-muted font-medium">{wo.created_at}</span>
                        {wo.status === 'Open' ? (
                            <button 
                                onClick={handleStartJob}
                                className="text-brand font-bold text-sm flex items-center gap-1 bg-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand hover:text-white transition-colors z-10"
                            >
                                {t('btn_start_job')} <ArrowRight size={16} className="rtl:rotate-180"/>
                            </button>
                        ) : (
                            <span className="text-warning font-bold text-sm flex items-center gap-1">
                                In Progress <Clock size={14} />
                            </span>
                        )}
                    </div>
                </div>
            )})
        )}
        </div>

        {/* Create Task Modal */}
        {isCreateModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900">{t('create_wo')}</h3>
                        <button onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_description')}</label>
                            <input 
                                type="text" 
                                required
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                value={newWO.description}
                                onChange={(e) => setNewWO({...newWO, description: e.target.value})}
                                placeholder="Describe the issue or task..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t('wo_asset')}</label>
                            <select 
                                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                value={newWO.assetId}
                                onChange={(e) => setNewWO({...newWO, assetId: e.target.value})}
                                required
                            >
                                <option value="">Select Asset...</option>
                                {getAssets().map(a => (
                                    <option key={a.asset_id} value={a.asset_id}>{a.name} ({a.asset_id})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('priority')}</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newWO.priority}
                                    onChange={(e) => setNewWO({...newWO, priority: e.target.value as Priority})}
                                >
                                    <option value={Priority.LOW}>Low</option>
                                    <option value={Priority.MEDIUM}>Medium</option>
                                    <option value={Priority.HIGH}>High</option>
                                    <option value={Priority.CRITICAL}>Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">{t('type')}</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand outline-none"
                                    value={newWO.type}
                                    onChange={(e) => setNewWO({...newWO, type: e.target.value as WorkOrderType})}
                                >
                                    <option value={WorkOrderType.CORRECTIVE}>Corrective</option>
                                    <option value={WorkOrderType.PREVENTIVE}>Preventive</option>
                                    <option value={WorkOrderType.CALIBRATION}>Calibration</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-3 rounded-lg shadow-md transition-all">
                                {t('btn_dispatch')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  }

  // Safe checks for WO type now that we know selectedWO is not null
  const isPM = selectedWO.type === WorkOrderType.PREVENTIVE || selectedWO.type === WorkOrderType.CALIBRATION;
  const currentAsset = getAssetForWO(selectedWO.asset_id);

  // --- VIEW: Work Order Detail (Tabbed) ---
  return (
    <div className="bg-background min-h-screen flex flex-col font-sans relative">
      
      {/* DOCS POPUP MODAL */}
      {showDocsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-0 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-brand p-6 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BookOpen size={32} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold">{t('manuals_detected')}</h3>
                      <p className="text-white/80 text-sm mt-1">{t('relevant_docs')}</p>
                  </div>
                  <div className="p-6 space-y-3">
                      {assetDocs.map((doc) => (
                          <div key={doc.doc_id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors group">
                              <div className="bg-gray-100 p-2 rounded text-gray-500 group-hover:text-brand group-hover:bg-white transition-colors">
                                  <FileText size={20} />
                              </div>
                              <div className="flex-1">
                                  <div className="font-bold text-gray-900 text-sm">{doc.title}</div>
                                  <div className="text-xs text-text-muted">{doc.type} • {doc.date}</div>
                              </div>
                              <div className="text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye size={18} />
                              </div>
                          </div>
                      ))}
                      <button 
                          onClick={() => setShowDocsModal(false)}
                          className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold mt-4 shadow-md"
                      >
                          {t('continue_work')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-border p-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSelectedWO(null)} className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronLeft className="rtl:rotate-180" size={24} />
            </button>
            {currentAsset?.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                    <img src={currentAsset.image} alt="" className="w-full h-full object-cover" />
                </div>
            )}
            <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">#{selectedWO.wo_id} - {selectedWO.asset_id}</h2>
                <p className="text-sm text-text-muted truncate font-medium">{selectedWO.description}</p>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${selectedWO.status === 'Open' ? 'bg-brand/10 text-brand border-brand/20' : 'bg-warning/10 text-warning-dark border-warning/20'}`}>
                {selectedWO.status}
            </div>
        </div>

        {/* Verification / Start Job Section */}
        {selectedWO.status === 'Open' ? (
             <div className="bg-white border-2 border-dashed border-brand/30 rounded-xl p-8 text-center animate-in fade-in shadow-sm">
                <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Scan size={40} className="text-brand" />
                </div>
                <h3 className="text-gray-900 font-bold text-xl mb-2">{t('start_instruction')}</h3>
                <p className="text-sm text-text-muted mb-6">{t('match_verified')} required to unlock tools.</p>
                <button 
                    onClick={handleStartJob}
                    className="w-full bg-brand hover:bg-brand-dark text-white py-4 rounded-xl font-bold text-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <Scan size={24} /> {t('btn_start_job')}
                </button>
             </div>
        ) : (
            /* Tabs Navigation - Optimized for Tablet */
            <div className="flex bg-gray-100 p-1.5 rounded-xl overflow-x-auto no-scrollbar gap-2">
                <button 
                    onClick={() => setActiveDetailTab('diagnosis')}
                    className={`flex-1 py-3 px-4 rounded-lg text-base font-bold whitespace-nowrap transition-all flex items-center justify-center gap-2 ${activeDetailTab === 'diagnosis' ? 'bg-white text-brand shadow-sm' : 'text-text-muted hover:text-gray-900'}`}
                >
                    {isPM ? <ListChecks size={20} /> : <Sparkles size={20} />}
                    {isPM ? t('tab_checklist') : t('tab_diagnosis')}
                </button>
                <button 
                    onClick={() => setActiveDetailTab('parts')}
                    className={`flex-1 py-3 px-4 rounded-lg text-base font-bold whitespace-nowrap transition-all flex items-center justify-center gap-2 ${activeDetailTab === 'parts' ? 'bg-white text-brand shadow-sm' : 'text-text-muted hover:text-gray-900'}`}
                >
                    <Box size={20} /> {t('tab_parts')}
                    {selectedParts.length > 0 && <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">{selectedParts.length}</span>}
                </button>
                <button 
                    onClick={() => setActiveDetailTab('visual')}
                    className={`flex-1 py-3 px-4 rounded-lg text-base font-bold whitespace-nowrap transition-all flex items-center justify-center gap-2 ${activeDetailTab === 'visual' ? 'bg-white text-brand shadow-sm' : 'text-text-muted hover:text-gray-900'}`}
                >
                    <Eye size={20} /> {t('step_visual')}
                </button>
                <button 
                    onClick={() => setActiveDetailTab('finish')}
                    className={`flex-1 py-3 px-4 rounded-lg text-base font-bold whitespace-nowrap transition-all flex items-center justify-center gap-2 ${activeDetailTab === 'finish' ? 'bg-white text-brand shadow-sm' : 'text-text-muted hover:text-gray-900'}`}
                >
                    <CheckCircle2 size={20} /> {t('tab_finish')}
                </button>
            </div>
        )}
      </div>

      {/* Main Content Area */}
      {selectedWO.status === 'In Progress' && (
          <div className="flex-1 overflow-y-auto p-6 pb-24">
            
            {/* TAB 1: DIAGNOSIS OR CHECKLIST */}
            {activeDetailTab === 'diagnosis' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    {isPM ? (
                        /* Checklist View */
                        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 border-b border-border flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg"><ClipboardList size={20}/> {t('checklist_progress')}</h3>
                                <span className="text-sm font-mono text-brand font-bold bg-brand/10 px-3 py-1 rounded border border-brand/20">
                                    {checklist.filter(c => c.checked).length}/{checklist.length}
                                </span>
                            </div>
                            <div className="divide-y divide-border">
                                {checklist.map(item => (
                                    <label key={item.id} className="flex items-center gap-4 p-5 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <div className={`w-8 h-8 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-brand border-brand' : 'border-gray-300 bg-white'}`}>
                                            {item.checked && <Check size={20} className="text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={item.checked}
                                            onChange={() => setChecklist(checklist.map(c => c.id === item.id ? {...c, checked: !c.checked} : c))}
                                        />
                                        <span className={`text-base font-medium ${item.checked ? 'text-text-muted line-through decoration-gray-400' : 'text-gray-900'}`}>
                                            {item.text}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Corrective Diagnosis View */
                        <div className="space-y-6">
                            <div>
                                <label className="block text-base font-bold text-gray-700 mb-2">{t('observed_symptoms')}</label>
                                <textarea 
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-xl p-5 min-h-[140px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none text-gray-900 placeholder-gray-400 shadow-sm transition-all text-base"
                                    placeholder="Describe what's wrong..."
                                />
                            </div>

                            {/* AI Assist */}
                            <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-200 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <label className="text-base font-bold text-purple-700 flex items-center gap-2">
                                        <Sparkles size={20} className="text-purple-500" /> {t('smart_kb')}
                                    </label>
                                    <button 
                                        onClick={handleAIAnalysis}
                                        disabled={isAnalyzing || !symptoms}
                                        className="text-sm bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all font-bold shadow-sm"
                                    >
                                        {isAnalyzing ? 'Analyzing...' : t('get_suggestions')}
                                    </button>
                                </div>
                                <div className="bg-white rounded-lg p-5 min-h-[80px] text-base text-gray-700 relative z-10 border border-purple-100 shadow-inner leading-relaxed">
                                    {rootCause || <span className="text-gray-400 italic">AI suggestions based on symptoms will appear here...</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-base font-bold text-gray-700 mb-2">{t('solution_applied')}</label>
                                <textarea 
                                    value={solution}
                                    onChange={(e) => setSolution(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-xl p-5 min-h-[140px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none text-gray-900 placeholder-gray-400 shadow-sm transition-all text-base"
                                    placeholder="Describe the fix..."
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: SPARE PARTS */}
            {activeDetailTab === 'parts' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="relative shadow-sm">
                        <Search className="absolute start-4 top-4 text-gray-400" size={24} />
                        <input 
                            type="text" 
                            value={partsSearch}
                            onChange={(e) => setPartsSearch(e.target.value)}
                            placeholder={t('search_parts')}
                            className="w-full bg-white border border-gray-300 rounded-xl ps-12 pe-4 py-4 text-lg text-gray-900 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-3 pb-20">
                        {filteredInventory.map(part => {
                            const currentQty = selectedParts.find(p => p.id === part.part_id)?.qty || 0;
                            return (
                                <div key={part.part_id} className="bg-white border border-border p-5 rounded-xl flex items-center justify-between shadow-sm hover:border-brand/30 transition-colors">
                                    <div>
                                        <div className="font-bold text-gray-900 text-lg">{part.part_name}</div>
                                        <div className="text-sm text-text-muted font-medium mt-1">In Stock: {part.current_stock} | ID: {part.part_id}</div>
                                    </div>
                                    <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-2 border border-gray-200">
                                        <button 
                                            onClick={() => {
                                                if(currentQty > 0) {
                                                    const newParts = selectedParts.map(p => p.id === part.part_id ? {...p, qty: p.qty - 1} : p).filter(p => p.qty > 0);
                                                    setSelectedParts(newParts);
                                                }
                                            }}
                                            className="w-10 h-10 rounded-lg bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 flex items-center justify-center font-bold text-xl disabled:opacity-50 transition-colors shadow-sm"
                                            disabled={currentQty === 0}
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-bold text-brand-dark text-xl">{currentQty}</span>
                                        <button 
                                            onClick={() => {
                                                if(currentQty < part.current_stock) {
                                                    const current = selectedParts.find(p => p.id === part.part_id);
                                                    if (current) {
                                                        setSelectedParts(selectedParts.map(p => p.id === part.part_id ? {...p, qty: p.qty + 1} : p));
                                                    } else {
                                                        setSelectedParts([...selectedParts, {id: part.part_id, qty: 1}]);
                                                    }
                                                }
                                            }}
                                            className="w-10 h-10 rounded-lg bg-brand hover:bg-brand-dark text-white flex items-center justify-center font-bold text-xl disabled:opacity-50 transition-colors shadow-sm"
                                            disabled={currentQty >= part.current_stock}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 3: VISUAL SUPPORT (AR) */}
            {activeDetailTab === 'visual' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-black rounded-xl overflow-hidden relative aspect-video shadow-lg border border-gray-800">
                        {/* Simulated Camera Feed */}
                        <img 
                            src={currentAsset?.image || "https://images.unsplash.com/photo-1579684385180-1ea90f842331?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80"} 
                            alt="AR Feed" 
                            className="w-full h-full object-cover opacity-80" 
                        />
                        
                        {/* UI Overlay */}
                        <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <span className="bg-danger text-white px-3 py-1.5 rounded-lg text-sm font-bold animate-pulse shadow-md">LIVE</span>
                                <div className="text-white font-mono text-xs bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">AR V2.1</div>
                            </div>
                            
                            {/* Simulated Markers */}
                            <div className="absolute top-1/3 left-1/4 w-16 h-16 border-4 border-brand rounded-full flex items-center justify-center animate-ping opacity-75"></div>
                            <div className="absolute top-1/3 left-1/4 w-16 h-16 bg-brand/20 border-2 border-brand rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,123,255,0.6)]">
                                <div className="w-4 h-4 bg-brand rounded-full shadow-sm"></div>
                            </div>
                            
                            {/* Instruction Overlay */}
                            <div className="bg-black/80 backdrop-blur-md text-white p-5 rounded-xl border border-white/10 mb-2 pointer-events-auto shadow-lg max-w-lg mx-auto">
                                <h4 className="font-bold text-brand-light flex items-center gap-2 mb-2 text-base uppercase tracking-wider">
                                    <Sparkles size={18}/> {t('ar_overlay')}
                                </h4>
                                <p className="text-base leading-relaxed text-gray-200">{t('ar_simulation_msg')}</p>
                            </div>
                        </div>
                        
                        {/* Grid Overlay */}
                        <div className="absolute inset-0 border-2 border-brand/30 pointer-events-none bg-[linear-gradient(rgba(0,123,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,123,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-900 text-base uppercase tracking-wider flex items-center gap-2 px-1">
                            <Eye size={20}/> {t('available_guides')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button className="p-5 border border-border rounded-xl text-base font-medium hover:border-brand hover:bg-brand/5 text-start transition flex items-center gap-4 bg-white shadow-sm group">
                                <span className="w-8 h-8 bg-brand/10 text-brand rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-brand group-hover:text-white transition-colors">1</span>
                                Power Unit Access & Safety
                            </button>
                            <button className="p-5 border border-border rounded-xl text-base font-medium hover:border-brand hover:bg-brand/5 text-start transition flex items-center gap-4 bg-white shadow-sm group">
                                <span className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-brand group-hover:text-white transition-colors">2</span>
                                Air Filter Replacement
                            </button>
                            <button className="p-5 border border-border rounded-xl text-base font-medium hover:border-brand hover:bg-brand/5 text-start transition flex items-center gap-4 bg-white shadow-sm group">
                                <span className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-brand group-hover:text-white transition-colors">3</span>
                                Sensor Calibration Points
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: CLOSURE */}
            {activeDetailTab === 'finish' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
                        <label className="block text-base font-bold text-gray-900 mb-3">{t('op_hours')} <span className="text-danger">*</span></label>
                        <input 
                            type="number" 
                            value={operatingHours}
                            onChange={(e) => setOperatingHours(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl p-5 text-2xl text-gray-900 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-mono tracking-wide transition-all"
                            placeholder="0000"
                        />
                        <p className="text-sm text-text-muted mt-2 flex items-center gap-1 font-medium"><AlertTriangle size={14}/> Required for predictive maintenance</p>
                    </div>

                    <div className="space-y-3">
                         <label className="block text-base font-bold text-gray-900">{t('digital_sig')} <span className="text-danger">*</span></label>
                         <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 bg-gray-50 hover:bg-white transition-colors relative group">
                             <input 
                                type="text" 
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                                placeholder="Tap to Sign Here"
                                className="w-full bg-transparent border-b-2 border-gray-300 focus:border-brand outline-none text-center text-3xl font-handwriting text-gray-900 placeholder-gray-300 pb-2 font-serif italic py-4"
                            />
                            <div className="text-center mt-4 text-sm text-text-muted flex justify-center items-center gap-2 font-medium">
                                <PenTool size={16}/> Signed electronically by User #{userWorkOrders[0]?.assigned_to_id}
                            </div>
                         </div>
                    </div>

                    <button 
                        onClick={() => setShowConfirmModal(true)}
                        disabled={!signature || !operatingHours || (isPM && checklist.some(c => !c.checked))}
                        className="w-full py-5 bg-success hover:bg-green-600 text-white rounded-xl font-bold text-xl shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2 mt-6 transition-all"
                    >
                        <CheckCircle2 size={28} /> {t('close_wo')}
                    </button>
                    
                    {isPM && checklist.some(c => !c.checked) && (
                        <p className="text-center text-danger text-sm font-bold bg-danger/5 py-3 rounded-lg border border-danger/10">Complete all checklist items to close.</p>
                    )}

                    {showConfirmModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-warning/10 text-warning rounded-full flex items-center justify-center mb-6">
                                        <AlertTriangle size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('confirm_close_title')}</h3>
                                    <p className="text-text-muted mb-8 text-lg">{t('confirm_close_msg')}</p>
                                    <div className="flex gap-4 w-full">
                                        <button 
                                            onClick={() => setShowConfirmModal(false)}
                                            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-lg"
                                        >
                                            {t('btn_cancel')}
                                        </button>
                                        <button 
                                            onClick={handleSubmit}
                                            className="flex-1 py-4 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold transition-colors shadow-md text-lg"
                                        >
                                            {t('btn_confirm')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
            )}
          </div>
      )}
    </div>
  );
};
