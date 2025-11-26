
import React, { useState, useMemo } from 'react';
import * as api from '../services/api';
import { LOCATIONS } from '../services/mockDb';
import { Priority, WorkOrderType, Asset, User, AssetStatus, WorkOrder } from '../types';
import { AlertTriangle, MapPin, CheckCircle2, Activity, AlertCircle, HeartPulse, Wrench, Scan, Wifi, X, Image as ImageIcon, ClipboardCheck, PenTool, Star } from 'lucide-react';
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
  const { t } = useLanguage();

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
        setActiveTab('dashboard');
        refreshData();
    }, 3000);
  };

  const handleQuickReport = (assetId: string) => {
      setSelectedAssetId(assetId);
      setActiveTab('report');
  };

  const handleNfcScan = () => {
    setIsScanning(true);
    setTimeout(() => {
        const randomAsset = deptAssets[Math.floor(Math.random() * deptAssets.length)];
        setSelectedAssetId(randomAsset.asset_id);
        setIsScanning(false);
    }, 2000);
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
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
            <h2 className="text-xl font-bold text-gray-900">{t('nurse_dashboard')}</h2>
            <div className="flex items-center gap-1 text-xs text-text-muted font-medium mt-1">
                <MapPin size={12} /> {t('my_dept')}
            </div>
        </div>
        <div className="bg-white border border-border px-3 py-1 rounded-full text-brand-dark text-xs font-bold shadow-sm">
            {user.name}
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

      {/* REPORT VIEW */}
      {activeTab === 'report' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 animate-in fade-in slide-in-from-right-4">
             
            {/* NFC Scanner Component */}
            <div className="w-full max-w-md">
                {!selectedAssetId ? (
                    <button 
                        onClick={handleNfcScan}
                        disabled={isScanning}
                        className={`w-full py-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all bg-white shadow-sm ${isScanning ? 'border-brand animate-pulse' : 'border-gray-300 hover:border-brand hover:bg-gray-50'}`}
                    >
                        {isScanning ? (
                            <>
                                <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-brand font-bold">{t('identifying')}</span>
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-brand/10 text-brand rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                    <Scan size={32} />
                                </div>
                                <div className="text-center">
                                    <span className="text-lg font-bold text-gray-900 block">{t('scan_nfc')}</span>
                                    <span className="text-xs text-text-muted font-medium">{t('tap_instruction')}</span>
                                </div>
                            </>
                        )}
                    </button>
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
                                     <Wifi size={20} />
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
