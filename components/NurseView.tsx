

import React, { useState, useMemo } from 'react';
import * as api from '../services/api';
import { LOCATIONS } from '../services/mockDb';
import { Priority, WorkOrderType, Asset, User, AssetStatus } from '../types';
import { AlertTriangle, MapPin, CheckCircle2, Activity, AlertCircle, HeartPulse, Wrench, Scan, Wifi, X, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NurseViewProps {
  user: User;
  assets: Asset[];
}

export const NurseView: React.FC<NurseViewProps> = ({ user, assets }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report'>('dashboard');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const { t } = useLanguage();

  // Filter assets for the user's department
  const deptAssets = useMemo(() => {
    const userLoc = LOCATIONS.find(l => l.location_id === user.location_id);
    return assets.filter(a => {
        const assetLoc = LOCATIONS.find(l => l.location_id === a.location_id);
        return assetLoc?.department === userLoc?.department || true; 
    });
  }, [assets, user.location_id]);
  
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
    </div>
  );
};