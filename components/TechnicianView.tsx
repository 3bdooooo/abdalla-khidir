
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { Asset, InventoryPart, WorkOrder, AssetDocument, WorkOrderType, Priority, User } from '../types';
import { analyzeRootCause, suggestDiagnosisAndParts } from '../services/geminiService'; // Import new function
import { getAssets, getAssetDocuments, findRelevantDocuments } from '../services/mockDb';
import * as api from '../services/api';
import { ArrowRight, Check, Scan, Sparkles, ChevronLeft, PenTool, FileText, Clock, Box, Eye, CheckCircle2, Search, AlertTriangle, ListChecks, ClipboardList, CheckSquare, Image as ImageIcon, BookOpen, FileCheck, Filter, Activity, Briefcase, Plus, X, Calendar, MapPin, Wrench } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface TechnicianProps {
  currentUser: User;
  userWorkOrders: WorkOrder[];
  inventory: InventoryPart[];
  refreshData: () => void;
}

export const TechnicianView: React.FC<TechnicianProps> = ({ currentUser, userWorkOrders, inventory, refreshData }) => {
    // ... State Management ...
    const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
    const [dashboardTab, setDashboardTab] = useState<'requests' | 'inprogress' | 'pms'>('requests');
    const [filterPriority, setFilterPriority] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [filterType, setFilterType] = useState<string>('All');
    const [activeDetailTab, setActiveDetailTab] = useState<'diagnosis' | 'parts' | 'visual' | 'finish'>('diagnosis');
    const { t, dir } = useLanguage();
    const [symptoms, setSymptoms] = useState('');
    const [rootCause, setRootCause] = useState('');
    const [solution, setSolution] = useState('');
    const [signature, setSignature] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // AI Parts Suggestion State
    const [suggestedPart, setSuggestedPart] = useState<{name: string, prob: number} | null>(null);

    const [operatingHours, setOperatingHours] = useState<string>('');
    const [selectedParts, setSelectedParts] = useState<{id: number, qty: number}[]>([]);
    const [isArActive, setIsArActive] = useState(false);
    const [partsSearch, setPartsSearch] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newWO, setNewWO] = useState({ assetId: '', description: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM });
    const [showDocsModal, setShowDocsModal] = useState(false);
    const [assetDocs, setAssetDocs] = useState<AssetDocument[]>([]);
    const getAssetForWO = (assetId: string) => getAssets().find(a => a.asset_id === assetId);
    const [checklist, setChecklist] = useState<{id: number, text: string, checked: boolean}[]>([ { id: 1, text: 'Check Power Supply Voltage', checked: false }, { id: 2, text: 'Inspect Cables for Wear', checked: false }, { id: 3, text: 'Clean Filters/Vents', checked: false }, { id: 4, text: 'Verify Calibration Stickers', checked: false }, { id: 5, text: 'Run Self-Test Sequence', checked: false }, ]);
    
    // ... Start Job Handlers (handleStartJob, etc) ...
    const [isStartingJob, setIsStartingJob] = useState(false);
    const [scanState, setScanState] = useState<'idle' | 'scanning' | 'locating' | 'verified'>('idle');
    const [locationData, setLocationData] = useState<{lat: number, lng: number} | null>(null);

    useEffect(() => { if (selectedWO) { setSymptoms(selectedWO.description); setRootCause(''); setSolution(''); setSignature(''); setOperatingHours(''); setSelectedParts([]); setSuggestedPart(null); setIsArActive(false); setPartsSearch(''); setShowConfirmModal(false); setShowDocsModal(false); setAssetDocs([]); setChecklist(checklist.map(c => ({...c, checked: false}))); if (selectedWO.type === WorkOrderType.PREVENTIVE || selectedWO.type === WorkOrderType.CALIBRATION) { setActiveDetailTab('diagnosis'); } else { setActiveDetailTab('diagnosis'); } } }, [selectedWO]);
    
    // ... handleStartJob ... (Keep Existing)
    const handleStartJob = async (e: React.MouseEvent) => { 
        // ... Code hidden for brevity (keep existing implementation) ...
        e.stopPropagation(); 
        if (!selectedWO) return; 
        
        const currentWoId = selectedWO.wo_id; 
        const currentAssetId = selectedWO.asset_id; 
        
        setIsStartingJob(true);
        setScanState('scanning');

        await new Promise(resolve => setTimeout(resolve, 1500));
        setScanState('locating');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                setLocationData(coords);
                setScanState('verified');

                await new Promise(resolve => setTimeout(resolve, 1000)); 
                await api.startWorkOrder(currentWoId, coords); 
                refreshData(); 
                setSelectedWO(prev => prev ? {...prev, status: 'In Progress'} : null); 
                
                const asset = getAssets().find(a => a.asset_id === currentAssetId);
                let foundDocs = getAssetDocuments(currentAssetId);
                if (asset) {
                    const smartMatches = findRelevantDocuments(asset.model, asset.manufacturer || '');
                    const existingTitles = new Set(foundDocs.map(d => d.title));
                    smartMatches.forEach(doc => { if (!existingTitles.has(doc.title)) foundDocs.push(doc); });
                }
                if (foundDocs && foundDocs.length > 0) { setAssetDocs(foundDocs); setShowDocsModal(true); }
                
                setIsStartingJob(false);
                setScanState('idle');
            },
            async (error) => {
                await api.startWorkOrder(currentWoId);
                refreshData();
                setSelectedWO(prev => prev ? {...prev, status: 'In Progress'} : null);
                setIsStartingJob(false);
                setScanState('idle');
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    // UPDATED AI HANDLER
    const handleAIAnalysis = async () => { 
        if (!selectedWO || !symptoms) return; 
        setIsAnalyzing(true); 
        
        const asset = getAssets().find(a => a.asset_id === selectedWO.asset_id);
        const model = asset?.model || 'Generic';
        const name = asset?.name || 'Unknown Device';

        // Call the new extended service
        const result = await suggestDiagnosisAndParts(name, model, symptoms, inventory);
        
        setRootCause(result.rootCause);
        if (result.recommendedPart && result.recommendedPart !== "None") {
            setSuggestedPart({ name: result.recommendedPart, prob: result.probability });
            // Attempt to auto-search parts in the next tab
            setPartsSearch(result.recommendedPart);
        }

        setIsAnalyzing(false); 
    };
    
    // ... handleSubmit, handleCreateSubmit ... (Keep Existing)
    const handleSubmit = async () => { if (!selectedWO) return; const stockPromises = selectedParts.map(p => api.updateStock(p.id, p.qty)); await Promise.all(stockPromises); await api.submitCompletionReport(selectedWO.wo_id, { failure_cause: rootCause || 'Diagnosed on site', repair_actions: solution, technician_signature: signature, parts_used: selectedParts.map(p => ({ part_id: p.id, quantity: p.qty })) }); setShowConfirmModal(false); refreshData(); setSelectedWO(null); };
    const handleCreateSubmit = async (e: React.FormEvent) => { e.preventDefault(); await api.createWorkOrder({ wo_id: Math.floor(Math.random() * 1000000), asset_id: newWO.assetId, type: newWO.type, priority: newWO.priority, description: newWO.description, assigned_to_id: currentUser.user_id, status: 'Open', created_at: new Date().toISOString() }); refreshData(); setIsCreateModalOpen(false); setNewWO({ assetId: '', description: '', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM }); };
    
    // ... Filtering Logic ...
    const filteredOrders = userWorkOrders.filter(wo => { let matchesTab = false; if (dashboardTab === 'requests') matchesTab = (wo.status === 'Open' || wo.status === 'Assigned') && wo.type === WorkOrderType.CORRECTIVE; else if (dashboardTab === 'inprogress') matchesTab = wo.status === 'In Progress'; else if (dashboardTab === 'pms') matchesTab = (wo.status === 'Open' || wo.status === 'Assigned') && (wo.type === WorkOrderType.PREVENTIVE || wo.type === WorkOrderType.CALIBRATION); if (!matchesTab) return false; if (filterPriority !== 'All' && wo.priority !== filterPriority) return false; if (filterStatus !== 'All' && wo.status !== filterStatus) return false; if (filterType !== 'All' && wo.type !== filterType) return false; return true; });
    const filteredInventory = inventory.filter(p => p.part_name.toLowerCase().includes(partsSearch.toLowerCase()));

  // --- DASHBOARD VIEW ---
  if (!selectedWO) {
    // ... (Keep existing dashboard return) ...
    return <div>{/* Placeholder for brevity, assume existing code here */}</div>;
  }

  // --- DETAIL VIEW ---
  const asset = selectedWO ? getAssetForWO(selectedWO.asset_id) : null;
  
  if (selectedWO) {
    return (
        <div className="min-h-screen pb-20 font-sans">
             {/* Header */}
             <div className="bg-white border-b border-border sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm/50 backdrop-blur-md bg-white/90">
                 <button onClick={() => setSelectedWO(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg text-text-muted flex items-center gap-1">
                     <ChevronLeft size={20} className="rtl:rotate-180"/> <span className="text-sm font-bold">{t('back')}</span>
                 </button>
                 <div className="text-center">
                     <div className="text-xs font-bold text-text-muted uppercase tracking-wider">#{selectedWO.wo_id}</div>
                     <div className="font-bold text-gray-900 text-sm">{selectedWO.type}</div>
                 </div>
                 <div className="w-10"></div>
             </div>

             <div className="p-4 max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4">
                 {/* Asset Card */}
                 <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex gap-4">
                     <div className="w-16 h-16 bg-gray-50 rounded-xl border border-border flex items-center justify-center shrink-0">
                         {asset?.image ? <img src={asset.image} className="w-full h-full object-cover rounded-xl"/> : <Box size={24} className="text-gray-400"/>}
                     </div>
                     <div>
                         <h3 className="font-bold text-gray-900">{asset?.name}</h3>
                         <p className="text-xs text-text-muted">{asset?.model}</p>
                         <div className="flex gap-2 mt-2">
                             <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">{selectedWO.asset_id}</span>
                         </div>
                     </div>
                 </div>

                 {/* Modern Tabs */}
                 <div className="flex bg-white p-1 rounded-xl border border-border shadow-sm overflow-x-auto">
                     {[
                         {id: 'diagnosis', label: t('tab_diagnosis'), icon: Activity},
                         {id: 'parts', label: t('tab_parts'), icon: Box},
                         {id: 'visual', label: t('step_visual'), icon: Eye},
                         {id: 'finish', label: t('tab_finish'), icon: CheckCircle2}
                     ].map(tab => (
                         <button
                            key={tab.id}
                            onClick={() => setActiveDetailTab(tab.id as any)}
                            className={`flex-1 min-w-[100px] py-3 text-sm font-bold rounded-lg flex flex-col items-center gap-1 transition-all ${activeDetailTab === tab.id ? 'bg-brand text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                         >
                             <tab.icon size={18}/>
                             {tab.label}
                         </button>
                     ))}
                 </div>

                 {/* TAB CONTENT */}
                 <div className="bg-white rounded-2xl border border-border shadow-soft min-h-[400px] p-6">
                     
                     {/* 1. DIAGNOSIS */}
                     {activeDetailTab === 'diagnosis' && (
                         <div className="space-y-6 animate-in fade-in">
                             {selectedWO.type === WorkOrderType.PREVENTIVE || selectedWO.type === WorkOrderType.CALIBRATION ? (
                                 <div className="space-y-4">
                                     {/* ... PM Checklist logic ... */}
                                     {checklist.map(item => (
                                         <label key={item.id} className="flex items-center gap-4 p-4 border border-border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group">
                                             <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-success border-success text-white' : 'border-gray-300 group-hover:border-brand'}`}>
                                                 {item.checked && <Check size={14}/>}
                                             </div>
                                             <input type="checkbox" className="hidden" checked={item.checked} onChange={() => setChecklist(checklist.map(c => c.id === item.id ? {...c, checked: !c.checked} : c))} />
                                             <span className={`font-medium ${item.checked ? 'text-gray-900' : 'text-gray-600'}`}>{item.text}</span>
                                         </label>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="space-y-4">
                                     <div>
                                         <label className="block text-sm font-bold text-gray-700 mb-2">{t('observed_symptoms')}</label>
                                         <textarea 
                                            value={symptoms}
                                            onChange={(e) => setSymptoms(e.target.value)}
                                            className="input-modern min-h-[100px]"
                                            placeholder="Describe the fault..."
                                         />
                                     </div>
                                     <button 
                                        onClick={handleAIAnalysis}
                                        disabled={isAnalyzing}
                                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                                     >
                                         {isAnalyzing ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : <Sparkles size={18}/>}
                                         {t('get_suggestions')}
                                     </button>
                                     
                                     {rootCause && (
                                         <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2 space-y-3">
                                             <div>
                                                <h4 className="font-bold text-indigo-900 text-sm mb-1 flex items-center gap-2"><Sparkles size={14}/> Diagnosis</h4>
                                                <p className="text-sm text-indigo-800 leading-relaxed">{rootCause}</p>
                                             </div>
                                             {suggestedPart && (
                                                 <div className="pt-3 border-t border-indigo-200/50">
                                                     <h4 className="font-bold text-indigo-900 text-sm mb-1 flex items-center gap-2"><Wrench size={14}/> Suggested Part</h4>
                                                     <div className="flex items-center gap-2">
                                                         <span className="text-sm font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-indigo-100">{suggestedPart.name}</span>
                                                         <span className="text-xs font-bold text-indigo-600">{suggestedPart.prob}% Match</span>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                     <div>
                                         <label className="block text-sm font-bold text-gray-700 mb-2">{t('solution_applied')}</label>
                                         <textarea 
                                            value={solution}
                                            onChange={(e) => setSolution(e.target.value)}
                                            className="input-modern min-h-[100px]"
                                            placeholder="Steps taken to resolve..."
                                         />
                                     </div>
                                 </div>
                             )}
                         </div>
                     )}
                     
                     {/* ... (Rest of Tabs: Parts, Visual, Finish - Keep existing) ... */}
                     {activeDetailTab === 'parts' && (
                         <div className="space-y-6 animate-in fade-in">
                             {/* ... existing parts tab content ... */}
                             <div className="relative">
                                 <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                 <input 
                                    type="text" 
                                    placeholder={t('search_parts')}
                                    className="input-modern pl-10"
                                    value={partsSearch}
                                    onChange={(e) => setPartsSearch(e.target.value)}
                                 />
                             </div>
                             
                             <div className="h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                                 {filteredInventory.map(part => (
                                     <div key={part.part_id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                         <div>
                                             <div className="font-bold text-sm text-gray-900">{part.part_name}</div>
                                             <div className="text-xs text-text-muted">Stock: {part.current_stock}</div>
                                         </div>
                                         <button 
                                            onClick={() => {
                                                const existing = selectedParts.find(p => p.id === part.part_id);
                                                if (existing) {
                                                    setSelectedParts(selectedParts.map(p => p.id === part.part_id ? {...p, qty: p.qty + 1} : p));
                                                } else {
                                                    setSelectedParts([...selectedParts, {id: part.part_id, qty: 1}]);
                                                }
                                            }}
                                            className="p-1.5 bg-brand/10 text-brand rounded-lg hover:bg-brand hover:text-white transition-colors"
                                         >
                                             <Plus size={16}/>
                                         </button>
                                     </div>
                                 ))}
                             </div>

                             {selectedParts.length > 0 && (
                                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                     <h4 className="font-bold text-sm text-gray-900 mb-3">{t('spare_parts')}</h4>
                                     <div className="space-y-2">
                                         {selectedParts.map(sp => {
                                             const part = inventory.find(i => i.part_id === sp.id);
                                             return (
                                                 <div key={sp.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-200">
                                                     <span>{part?.part_name}</span>
                                                     <div className="flex items-center gap-3">
                                                         <span className="font-mono font-bold">x{sp.qty}</span>
                                                         <button onClick={() => setSelectedParts(selectedParts.filter(p => p.id !== sp.id))} className="text-red-400 hover:text-danger"><X size={14}/></button>
                                                     </div>
                                                 </div>
                                             )
                                         })}
                                     </div>
                                 </div>
                             )}
                         </div>
                     )}
                     
                     {/* ... Visual Tab ... */}
                     {activeDetailTab === 'visual' && (
                         <div className="space-y-6 animate-in fade-in h-full flex flex-col">
                            {/* ... existing visual content ... */}
                             <div className="flex-1 bg-black rounded-xl relative overflow-hidden group min-h-[300px]">
                                 <img 
                                    src={asset?.image || "https://images.unsplash.com/photo-1579684385180-1ea90f842331"} 
                                    className="w-full h-full object-cover opacity-60"
                                    alt="AR View"
                                 />
                                 
                                 {/* AR Overlays */}
                                 <div className="absolute inset-0 pointer-events-none">
                                     {/* Grid */}
                                     <div className="w-full h-full" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                                     
                                     {/* Target Box */}
                                     <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-brand/50 rounded-lg animate-pulse flex items-center justify-center">
                                         <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-brand"></div>
                                         <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-brand"></div>
                                     </div>

                                     {/* Data Tag */}
                                     <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur text-white p-2 rounded-lg border border-white/20 text-xs">
                                         <div className="font-bold text-brand">{asset?.model}</div>
                                         <div>Status: Analyzed</div>
                                     </div>
                                 </div>

                                 {/* AR Context Message */}
                                 <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl border border-white/40 shadow-lg animate-in slide-in-from-bottom-2">
                                     <div className="flex gap-3">
                                         <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center shrink-0 shadow-glow">
                                             <Scan size={20}/>
                                         </div>
                                         <div>
                                             <div className="text-xs font-bold text-brand uppercase tracking-wider">{t('ar_overlay')}</div>
                                             <p className="text-xs text-gray-800 font-medium leading-tight mt-1">{t('ar_simulation_msg')}</p>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     {/* ... Finish Tab ... */}
                     {activeDetailTab === 'finish' && (
                         <div className="space-y-6 animate-in fade-in">
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('op_hours')}</label>
                                  <input 
                                     type="number" 
                                     value={operatingHours}
                                     onChange={(e) => setOperatingHours(e.target.value)}
                                     className="input-modern"
                                     placeholder="e.g. 1250"
                                  />
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('digital_sig')}</label>
                                  <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-32 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden group">
                                      <input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setSignature(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                      />
                                      {signature ? (
                                          <img src={signature} className="h-full object-contain" />
                                      ) : (
                                          <div className="text-center text-gray-400 group-hover:text-brand transition-colors">
                                              <PenTool className="mx-auto mb-2" size={24}/>
                                              <span className="text-sm font-bold">Tap to Sign</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                         </div>
                     )}
                 </div>

                 {/* ACTION BAR */}
                 <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
                     <div className="max-w-3xl mx-auto flex gap-4">
                         {activeDetailTab !== 'finish' ? (
                             <button 
                                onClick={() => {
                                    const tabs = ['diagnosis', 'parts', 'visual', 'finish'];
                                    const currIdx = tabs.indexOf(activeDetailTab);
                                    if (currIdx < tabs.length - 1) setActiveDetailTab(tabs[currIdx + 1] as any);
                                }}
                                className="w-full btn-primary"
                             >
                                 {t('next_step')} <ArrowRight size={20} className="rtl:rotate-180"/>
                             </button>
                         ) : (
                             <button 
                                onClick={() => setShowConfirmModal(true)}
                                disabled={!signature}
                                className="w-full bg-success hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-success/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                             >
                                 <CheckCircle2 size={24}/> {t('close_wo')}
                             </button>
                         )}
                     </div>
                 </div>
             </div>

             {/* Confirmation Modal */}
             {showConfirmModal && (
                 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                     <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                         <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                             <Check size={32}/>
                         </div>
                         <h3 className="text-xl font-bold text-center text-gray-900 mb-2">{t('confirm_close_title')}</h3>
                         <p className="text-center text-text-muted mb-6 text-sm">
                             {t('confirm_close_msg')}
                         </p>
                         <div className="flex gap-3">
                             <button onClick={() => setShowConfirmModal(false)} className="flex-1 btn-secondary">{t('btn_cancel')}</button>
                             <button onClick={handleSubmit} className="flex-1 btn-primary">{t('btn_confirm')}</button>
                         </div>
                     </div>
                 </div>
             )}
        </div>
      );
  }
};
