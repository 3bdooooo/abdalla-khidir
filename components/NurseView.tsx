
import React, { useState, useMemo } from 'react';
import * as api from '../services/api';
import { LOCATIONS, getAssetDocuments } from '../services/mockDb';
import { Priority, WorkOrderType, Asset, User, AssetStatus, WorkOrder } from '../types';
import { AlertTriangle, MapPin, CheckCircle2, Activity, AlertCircle, HeartPulse, Wrench, Scan, Wifi, X, Image as ImageIcon, ClipboardCheck, PenTool, Star, QrCode, Camera, Lightbulb, BookOpen, ChevronDown, ChevronUp, FileText, Smartphone, UserCheck, Clock, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NurseViewProps {
  user: User;
  assets: Asset[];
  workOrders: WorkOrder[];
  refreshData: () => void;
}

export const NurseView: React.FC<NurseViewProps> = ({ user, assets, workOrders, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'verify'>('dashboard');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMethod, setScanMethod] = useState<'nfc' | 'qr'>('nfc');
  const { t, dir } = useLanguage();

  // Training Manual State
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);

  // Smart Point State
  const [showSmartPoint, setShowSmartPoint] = useState(false);
  
  // Verification State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedWoForVerify, setSelectedWoForVerify] = useState<WorkOrder | null>(null);
  const [nurseSignature, setNurseSignature] = useState('');
  const [rating, setRating] = useState(0); // 1-5 Stars

  // Filter assets for the user's department
  const deptAssets = useMemo(() => {
    const userLoc = LOCATIONS.find(l => l.location_id === user.location_id);
    return assets.filter(a => {
        const assetLoc = LOCATIONS.find(l => l.location_id === a.location_id);
        return assetLoc?.department === userLoc?.department || true; 
    });
  }, [assets, user.location_id]);

  // Filter WOs ready for verification
  const pendingVerifications = useMemo(() => {
      return workOrders.filter(wo => {
          const isPending = wo.status === 'Awaiting Final Acceptance';
          const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
          const userLoc = LOCATIONS.find(l => l.location_id === user.location_id);
          const assetLoc = LOCATIONS.find(l => l.location_id === asset?.location_id);
          
          // Show if pending AND in same department
          return isPending && (assetLoc?.department === userLoc?.department || true);
      });
  }, [workOrders, assets, user.location_id]);

  // Active WOs for Technician Arrival Button
  const activeDepartmentWOs = useMemo(() => {
      return workOrders.filter(wo => {
          const isActive = wo.status === 'Open' || wo.status === 'Assigned' || wo.status === 'In Progress';
          const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
          const userLoc = LOCATIONS.find(l => l.location_id === user.location_id);
          const assetLoc = LOCATIONS.find(l => l.location_id === asset?.location_id);
          
          return isActive && (assetLoc?.department === userLoc?.department || true);
      });
  }, [workOrders, assets, user.location_id]);
  
  const identifiedAsset = assets.find(a => a.asset_id === selectedAssetId);

  const stats = {
    running: deptAssets.filter(a => a.status === AssetStatus.RUNNING).length,
    down: deptAssets.filter(a => a.status === AssetStatus.DOWN).length,
    maint: deptAssets.filter(a => a.status === AssetStatus.UNDER_MAINT).length,
  };

  const handleReport = async () => {
    if (!description) return;

    const assetIdToReport = selectedAssetId || 'NFC-1004';
    
    await api.createWorkOrder({
      wo_id: Math.floor(Math.random() * 100000), // Random ID for simplicity
      asset_id: assetIdToReport,
      type: WorkOrderType.CORRECTIVE,
      priority: Priority.CRITICAL,
      assigned_to_id: 2,
      description: `${description}`,
      status: 'Open',
      created_at: new Date().toISOString().split('T')[0]
    });

    setIsSubmitted(true);
    setTimeout(() => {
        setIsSubmitted(false);
        setDescription('');
        setSelectedAssetId('');
        setShowSmartPoint(false);
        setActiveTab('dashboard');
        refreshData();
    }, 3000);
  };

  const handleQuickReport = (assetId: string) => {
      setSelectedAssetId(assetId);
      setActiveTab('report');
  };

  const handleScan = (method: 'nfc' | 'qr') => {
    setScanMethod(method);
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
        const randomAsset = deptAssets[Math.floor(Math.random() * deptAssets.length)];
        setSelectedAssetId(randomAsset.asset_id);
        setIsScanning(false);
        setShowSmartPoint(true); // Open Smart Point instead of form directly
    }, 2500);
  };

  const handleTechArrived = (woId: number) => {
      // Logic to log arrival time (In a real app, this updates the WO 'arrival_time' field)
      alert(t('tech_arrived_msg').replace('{id}', woId.toString()));
  };

  const openVerifyModal = (wo: WorkOrder) => {
      setSelectedWoForVerify(wo);
      setNurseSignature('');
      setRating(0);
      setVerifyModalOpen(true);
  };

  const submitVerification = async () => {
      if (selectedWoForVerify && nurseSignature) {
          await api.submitNurseVerification(selectedWoForVerify.wo_id, user.user_id, nurseSignature, rating);
          refreshData();
          setVerifyModalOpen(false);
          setSelectedWoForVerify(null);
          setNurseSignature('');
          setRating(0);
      }
  };

  const SmartPointOverlay = ({ asset, onClose, onReport }: { asset: Asset, onClose: () => void, onReport: () => void }) => {
      const [expandedStep, setExpandedStep] = useState<number | null>(null);
      const docs = getAssetDocuments(asset.asset_id);
      
      const steps = [
          { title: "Power Cycle Device", desc: "Turn off the device using the rear switch, wait 10 seconds, and turn it back on." },
          { title: "Check Connections", desc: "Ensure all patient cables and power cords are securely plugged in." },
          { title: "Verify Settings", desc: "Reset alarm limits to default to clear transient errors." }
      ];

      return (
          <div className="fixed inset-0 bg-gray-900/90 z-50 overflow-y-auto font-sans animate-in slide-in-from-bottom-10">
              <div className="min-h-screen flex flex-col p-4 md:p-6 max-w-lg mx-auto">
                  <div className="flex justify-between items-center text-white mb-6">
                      <h2 className="text-xl font-bold flex items-center gap-2"><Smartphone size={24}/> {t('smart_point_title')}</h2>
                      <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20}/></button>
                  </div>

                  {/* 1. Device Status Card */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-2xl mb-6">
                      <div className="relative h-48">
                          <img src={asset.image} className="w-full h-full object-cover" alt={asset.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                              <div>
                                  <div className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">{t('detected')}</div>
                                  <h1 className="text-2xl font-bold text-white leading-none">{asset.name}</h1>
                                  <p className="text-white/70 text-sm mt-1">{asset.model} • {asset.asset_id}</p>
                              </div>
                          </div>
                      </div>
                      <div className="p-4 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                          <div className="text-xs font-bold text-gray-500 uppercase">{t('status')}</div>
                          <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${asset.status === AssetStatus.RUNNING ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <div className={`w-2 h-2 rounded-full ${asset.status === AssetStatus.RUNNING ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              {asset.status}
                          </div>
                      </div>
                  </div>

                  {/* 2. Quick Troubleshooting */}
                  <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-2 text-white/90">
                          <Lightbulb className="text-yellow-400" size={20}/>
                          <h3 className="font-bold">{t('troubleshooting')}</h3>
                      </div>
                      <div className="space-y-2">
                          {steps.map((step, idx) => (
                              <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm">
                                  <button 
                                    onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                                  >
                                      <span className="font-bold text-gray-800 text-sm">{idx + 1}. {step.title}</span>
                                      {expandedStep === idx ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                  </button>
                                  {expandedStep === idx && (
                                      <div className="px-4 pb-4 pt-0 text-sm text-gray-600 bg-gray-50 border-t border-gray-100">
                                          {step.desc}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* 3. Docs */}
                  <div className="mb-8">
                      <div className="flex items-center gap-2 text-white/90 mb-3">
                          <BookOpen className="text-blue-300" size={20}/>
                          <h3 className="font-bold">{t('quick_guide')}</h3>
                      </div>
                      <div className="bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/10">
                          {docs.length > 0 ? docs.map(doc => (
                              <div key={doc.doc_id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg text-white transition-colors cursor-pointer">
                                  <div className="flex items-center gap-3">
                                      <FileText size={18} className="text-white/70"/>
                                      <span className="text-sm font-medium">{doc.title}</span>
                                  </div>
                                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{t('manual_link')}</span>
                              </div>
                          )) : <div className="p-4 text-white/50 text-sm text-center">No documents found.</div>}
                      </div>
                  </div>

                  {/* 4. Action */}
                  <div className="mt-auto bg-white rounded-t-2xl -mx-4 -mb-6 p-6 pb-8 space-y-4">
                      <h3 className="text-center font-bold text-gray-900">{t('is_problem_solved')}</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={onClose} className="py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all active:scale-95">
                              {t('btn_solved')}
                          </button>
                          <button onClick={onReport} className="py-4 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl font-bold transition-all active:scale-95 border border-gray-200">
                              {t('btn_not_solved')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )
  };

  // --- NURSE TRAINING MANUAL COMPONENT ---
  const NurseTrainingModal = ({ onClose }: { onClose: () => void }) => {
      const [step, setStep] = useState(0);
      const { dir } = useLanguage();

      const PhoneMockup = ({ children }: { children: React.ReactNode }) => (
          <div className="relative border-8 border-gray-900 rounded-[2rem] h-[400px] w-[220px] bg-white overflow-hidden shadow-2xl mx-auto flex flex-col">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-4 w-24 bg-gray-900 rounded-b-xl z-20"></div>
              <div className="flex-1 overflow-hidden relative font-sans text-xs">
                  {children}
              </div>
          </div>
      );

      const steps = [
          {
              title: "Nurse Training: Quick Reporting",
              desc: "This guide explains how to quickly report equipment faults using the NFC scan feature.",
              visual: (
                  <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 text-center">
                      <HeartPulse size={48} className="mb-4"/>
                      <h2 className="font-bold text-lg mb-2">Nurse Guide</h2>
                      <p className="text-xs opacity-80">v1.5</p>
                  </div>
              )
          },
          {
              title: "1. Locate 'Report' Tab",
              desc: "Tap the 'Report Issue' tab at the top of your dashboard, or use the bottom navigation bar on mobile.",
              visual: (
                  <div className="h-full bg-gray-50 p-2 pt-6">
                      <div className="flex bg-white p-1 rounded-lg border mb-4">
                          <div className="flex-1 text-center py-1 text-[8px] text-gray-400">Overview</div>
                          <div className="flex-1 text-center py-1 text-[8px] text-gray-400">Verify</div>
                          <div className="flex-1 text-center py-1 text-[8px] bg-brand text-white rounded font-bold">Report</div>
                      </div>
                      <div className="absolute inset-0 bg-black/10 flex items-start justify-center pt-8">
                          <div className="w-6 h-6 border-2 border-red-500 rounded-full animate-ping absolute top-8 right-12"></div>
                      </div>
                  </div>
              )
          },
          {
              title: "2. Scan Asset NFC",
              desc: "Tap the large 'Scan Device NFC' button. Hold your phone near the asset's tag to identify it instantly.",
              visual: (
                  <div className="h-full bg-white p-4 flex flex-col items-center justify-center">
                      <div className="p-4 border-2 border-dashed border-brand rounded-xl mb-2 bg-brand/5">
                          <Scan size={32} className="text-brand"/>
                      </div>
                      <div className="font-bold text-[10px]">Scanning...</div>
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <div className="bg-white/90 p-2 rounded-full border-2 border-brand animate-pulse">
                              <Smartphone size={24} className="text-brand"/>
                          </div>
                      </div>
                  </div>
              )
          },
          {
              title: "3. Smart Maintenance Point",
              desc: "Before filing a report, try the suggested troubleshooting steps. If it fixes the issue, click 'Yes, Solved'.",
              visual: (
                  <div className="h-full bg-gray-900 p-3 text-white pt-6">
                      <div className="flex items-center gap-2 mb-2">
                          <Lightbulb size={12} className="text-yellow-400"/>
                          <span className="font-bold text-[10px]">Troubleshooting</span>
                      </div>
                      <div className="bg-white/10 rounded p-2 mb-2">
                          <div className="text-[8px]">1. Check Power Cord</div>
                      </div>
                      <div className="bg-white/10 rounded p-2">
                          <div className="text-[8px]">2. Reset Alarm</div>
                      </div>
                      <div className="mt-4 flex gap-2">
                          <div className="flex-1 bg-green-500 py-1 rounded text-center text-[8px] font-bold">Solved</div>
                          <div className="flex-1 bg-gray-600 py-1 rounded text-center text-[8px] font-bold">Report</div>
                      </div>
                  </div>
              )
          },
          {
              title: "4. Submit Report",
              desc: "If the issue persists, describe the fault briefly and tap 'Report Fault Now' to alert the engineering team.",
              visual: (
                  <div className="h-full bg-white p-3 pt-6">
                      <div className="text-[10px] font-bold mb-1">Description</div>
                      <div className="bg-gray-50 border rounded h-16 p-2 text-[8px] text-gray-500 mb-4">
                          Screen is frozen and not responding to touch...
                      </div>
                      <div className="bg-red-500 text-white py-2 rounded-lg text-center font-bold text-[10px] flex items-center justify-center gap-1">
                          <AlertTriangle size={10}/> REPORT FAULT
                      </div>
                  </div>
              )
          }
      ];

      return (
          <div className="fixed inset-0 bg-gray-900/90 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
              <div className="bg-white rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
                  {/* Visual Side */}
                  <div className="w-full md:w-1/2 bg-gray-100 flex items-center justify-center p-8 relative">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-200 via-gray-100 to-gray-200"></div>
                      <PhoneMockup>
                          {steps[step].visual}
                      </PhoneMockup>
                  </div>

                  {/* Content Side */}
                  <div className="w-full md:w-1/2 p-8 flex flex-col">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest">Training Module</h3>
                          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                          <h1 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{steps[step].title}</h1>
                          <p className="text-gray-600 text-lg leading-relaxed">{steps[step].desc}</p>
                      </div>

                      <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-100">
                          <div className="flex gap-1">
                              {steps.map((_, i) => (
                                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-brand scale-125' : 'bg-gray-300'}`}></div>
                              ))}
                          </div>
                          <div className="flex gap-4">
                              <button 
                                  onClick={() => setStep(Math.max(0, step - 1))}
                                  disabled={step === 0}
                                  className="p-3 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
                              >
                                  <ChevronLeft size={24}/>
                              </button>
                              <button 
                                  onClick={() => step < steps.length - 1 ? setStep(step + 1) : onClose()}
                                  className="px-6 py-3 bg-brand text-white rounded-full font-bold flex items-center gap-2 hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
                              >
                                  {step === steps.length - 1 ? "Finish" : "Next"} <ChevronRight size={20}/>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  if (isSubmitted) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-in zoom-in duration-300 font-sans">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center text-success mb-6 border border-success/30 shadow-xl shadow-success/10">
                <CheckCircle2 size={64} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('report_sent')}</h2>
            <p className="text-text-muted text-center font-medium">Maintenance team has been notified.<br/>Help is on the way.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4 pb-16 font-sans">
      {/* TRAINING MODAL */}
      {isTrainingOpen && (
          <NurseTrainingModal onClose={() => setIsTrainingOpen(false)} />
      )}

      {/* SMART POINT OVERLAY */}
      {showSmartPoint && identifiedAsset && (
          <SmartPointOverlay 
            asset={identifiedAsset} 
            onClose={() => {
                setShowSmartPoint(false);
                setSelectedAssetId('');
            }}
            onReport={() => {
                setShowSmartPoint(false);
                // User stays on 'report' tab with ID selected, ready to type description
            }}
          />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
            <h2 className="text-xl font-bold text-gray-900">{t('nurse_dashboard')}</h2>
            <div className="flex items-center gap-1 text-xs text-text-muted font-medium mt-1">
                <MapPin size={12} /> {t('my_dept')}
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsTrainingOpen(true)}
                className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-1 shadow-sm hover:bg-blue-100"
            >
                <HelpCircle size={14}/> Guide
            </button>
            <div className="bg-white border border-border px-3 py-1 rounded-full text-brand-dark text-xs font-bold shadow-sm">
                {user.name}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1 rounded-xl border border-border flex shadow-sm">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-text-muted hover:text-gray-800'}`}
          >
            {t('tab_overview')}
          </button>
          <button 
            onClick={() => setActiveTab('verify')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'verify' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-text-muted hover:text-gray-800'}`}
          >
            {t('tab_verify')}
            {pendingVerifications.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {pendingVerifications.length}
                </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:text-gray-800'}`}
          >
            {t('tab_report')}
          </button>
      </div>

      {/* DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            {/* Status Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-success/20 p-3 rounded-xl text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-success font-bold text-2xl">{stats.running}</div>
                    <div className="text-text-muted text-xs font-bold uppercase">{t('running')}</div>
                </div>
                <div className="bg-white border border-danger/20 p-3 rounded-xl text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-danger font-bold text-2xl">{stats.down}</div>
                    <div className="text-text-muted text-xs font-bold uppercase">{t('stopped')}</div>
                </div>
                <div className="bg-white border border-warning/20 p-3 rounded-xl text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-warning-dark font-bold text-2xl">{stats.maint}</div>
                    <div className="text-text-muted text-xs font-bold uppercase">{t('maintenance')}</div>
                </div>
            </div>

            {/* Active Requests & Technician Arrival */}
            {activeDepartmentWOs.length > 0 && (
                <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={18} className="text-orange-500" />
                        <h3 className="font-bold text-gray-900 text-sm">{t('active_requests')}</h3>
                    </div>
                    <div className="space-y-3">
                        {activeDepartmentWOs.map(wo => {
                            const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                            return (
                                <div key={wo.wo_id} className="p-3 bg-orange-50/50 rounded-lg border border-orange-100 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">{asset?.name}</div>
                                        <div className="text-xs text-gray-500">#{wo.wo_id} • {wo.status}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleTechArrived(wo.wo_id)}
                                        className="px-3 py-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                        <UserCheck size={14} /> {t('btn_tech_arrived')}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Asset List */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider ms-1 mb-2">Department Devices</h3>
                {deptAssets.map(asset => (
                    <div key={asset.asset_id} className="bg-white border border-border p-4 rounded-xl flex items-center justify-between group shadow-sm hover:border-brand/30 transition-colors">
                        <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                                {asset.image ? (
                                    <img src={asset.image} alt={asset.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={18}/></div>
                                )}
                            </div>
                            <div>
                                <div className="font-bold text-gray-900">{asset.name}</div>
                                <div className="text-xs text-text-muted font-medium">{asset.model}</div>
                                {asset.control_number && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{asset.control_number}</div>}
                            </div>
                        </div>
                        
                        {asset.status === AssetStatus.RUNNING ? (
                             <button 
                                onClick={() => handleQuickReport(asset.asset_id)}
                                className="px-3 py-1.5 bg-gray-50 text-text-muted text-xs font-bold rounded-lg hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition border border-gray-200"
                             >
                                {t('quick_report')}
                             </button>
                        ) : (
                            <span className="px-2 py-1 bg-gray-100 text-text-muted text-xs font-bold rounded border border-gray-200">
                                {t('reported')}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* VERIFY VIEW */}
      {activeTab === 'verify' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <ClipboardCheck size={20}/>
                  </div>
                  <div>
                      <h3 className="font-bold text-indigo-900 text-sm">{t('pending_verify')}</h3>
                      <p className="text-xs text-indigo-700">{t('verify_desc')}</p>
                  </div>
              </div>

              {pendingVerifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                      <CheckCircle2 size={48} className="mx-auto mb-3 opacity-20"/>
                      <p>No repairs pending verification</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {pendingVerifications.map(wo => {
                          const asset = assets.find(a => a.asset_id === wo.asset_id || a.nfc_tag_id === wo.asset_id);
                          return (
                              <div key={wo.wo_id} className="bg-white border border-border p-4 rounded-xl shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-mono font-bold text-text-muted bg-gray-50 px-2 py-0.5 rounded">#{wo.wo_id}</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700">Repaired</span>
                                  </div>
                                  <div className="font-bold text-gray-900 text-sm mb-1">{asset?.name}</div>
                                  <div className="text-xs text-text-muted mb-3">{wo.description}</div>
                                  <button 
                                    onClick={() => openVerifyModal(wo)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                                  >
                                      {t('verify_action')}
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

      {/* REPORT VIEW (Includes NFC and QR) */}
      {activeTab === 'report' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 animate-in fade-in slide-in-from-right-4">
             
            {/* Scanner Component */}
            <div className="w-full max-w-md">
                {!selectedAssetId ? (
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => handleScan('nfc')}
                            disabled={isScanning}
                            className={`py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all bg-white shadow-sm ${isScanning && scanMethod === 'nfc' ? 'border-brand animate-pulse' : 'border-gray-300 hover:border-brand hover:bg-gray-50'}`}
                        >
                            {isScanning && scanMethod === 'nfc' ? (
                                <>
                                    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-brand font-bold text-sm">{t('identifying')}</span>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 bg-brand/10 text-brand rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <Scan size={28} />
                                    </div>
                                    <div className="text-center">
                                        <span className="font-bold text-gray-900 block text-sm">{t('scan_nfc')}</span>
                                    </div>
                                </>
                            )}
                        </button>

                        <button 
                            onClick={() => handleScan('qr')}
                            disabled={isScanning}
                            className={`py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all bg-white shadow-sm ${isScanning && scanMethod === 'qr' ? 'border-purple-500 animate-pulse' : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'}`}
                        >
                            {isScanning && scanMethod === 'qr' ? (
                                <>
                                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-purple-600 font-bold text-sm">{t('scanning_qr')}</span>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                        <QrCode size={28} />
                                    </div>
                                    <div className="text-center">
                                        <span className="font-bold text-gray-900 block text-sm">{t('scan_qr')}</span>
                                    </div>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-brand rounded-2xl overflow-hidden shadow-md">
                         {identifiedAsset?.image && (
                             <div className="w-full h-40 overflow-hidden relative">
                                 <img src={identifiedAsset.image} className="w-full h-full object-cover" alt="Identified Device" />
                                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                     <span className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                                         <CheckCircle2 size={14} className="text-success" /> Verified Match
                                     </span>
                                 </div>
                             </div>
                         )}
                         <div className="p-4 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-brand/10 text-brand rounded-lg">
                                     {scanMethod === 'nfc' ? <Wifi size={20} /> : <QrCode size={20} />}
                                 </div>
                                 <div>
                                     <div className="text-xs text-brand font-bold uppercase tracking-wider">{t('detected')}</div>
                                     <div className="font-bold text-gray-900">{identifiedAsset?.name}</div>
                                     <div className="text-xs text-text-muted font-mono">{selectedAssetId}</div>
                                 </div>
                             </div>
                             <button 
                                onClick={() => setSelectedAssetId('')} 
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-danger transition"
                             >
                                 <X size={18} />
                             </button>
                         </div>
                    </div>
                )}
            </div>

            <div className="w-full max-w-md space-y-4">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('report_issue')}</h2>
                </div>

                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('report_placeholder')}
                    className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl focus:border-brand focus:ring-4 focus:ring-brand/10 resize-none text-lg h-32 shadow-sm text-gray-900 placeholder-gray-400 transition-all outline-none"
                />

                <button
                    onClick={handleReport}
                    disabled={!description}
                    className="w-full py-6 bg-danger text-white rounded-2xl shadow-lg hover:bg-red-700 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 shadow-danger/30"
                >
                    <AlertTriangle size={32} />
                    <span className="text-xl font-bold">{t('btn_report')}</span>
                </button>
            </div>
            
            <p className="text-xs text-text-muted text-center max-w-xs font-medium">
                {t('report_desc')}
            </p>
        </div>
      )}

      {/* VERIFICATION MODAL */}
      {verifyModalOpen && selectedWoForVerify && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900">{t('verify_title')}</h3>
                      <button onClick={() => setVerifyModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="p-4 bg-gray-50 rounded-xl border border-border">
                          <div className="text-sm font-bold text-gray-900">{selectedWoForVerify.description}</div>
                          <div className="text-xs text-text-muted mt-1">
                              Asset: {assets.find(a => a.asset_id === selectedWoForVerify.asset_id || a.nfc_tag_id === selectedWoForVerify.asset_id)?.name}
                          </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-green-50/50">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 size={14}/></div>
                          <div className="text-sm font-medium text-gray-700">{t('confirm_working')}</div>
                      </div>

                      {/* STAR RATING */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">{t('rate_service')}</label>
                          <div className="flex gap-2 justify-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                             {[1, 2, 3, 4, 5].map((star) => (
                                 <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform active:scale-110">
                                     <Star 
                                        size={32} 
                                        fill={star <= rating ? "#F59E0B" : "none"} 
                                        className={star <= rating ? "text-warning" : "text-gray-300"}
                                     />
                                 </button>
                             ))}
                          </div>
                          {rating > 0 && <div className="text-center text-xs font-bold text-warning mt-1">{rating} / 5 Stars</div>}
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">{t('nurse_sig')}</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-32 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer relative overflow-hidden group">
                              <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setNurseSignature(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }}
                              />
                              {nurseSignature ? (
                                  <img src={nurseSignature} className="h-full object-contain" />
                              ) : (
                                  <div className="text-center text-gray-400 group-hover:text-brand transition-colors">
                                      <PenTool className="mx-auto mb-2" size={24}/>
                                      <span className="text-sm font-bold">Sign to Confirm</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      <button 
                        onClick={submitVerification}
                        disabled={!nurseSignature}
                        className="w-full btn-primary disabled:opacity-50"
                      >
                          {t('btn_verify_close')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
