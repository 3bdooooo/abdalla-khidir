
import React, { useState } from 'react';
import { Asset, WorkOrder, AssetDocument } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Search, FileText, CheckCircle2, AlertTriangle, Calendar, Clock, Download, ChevronLeft, ShieldCheck, History, ArrowRight, Scan, Wifi } from 'lucide-react';
import { getAssetDocuments, getLocationName, getUsers } from '../services/mockDb';

interface InspectorViewProps {
  assets: Asset[];
  workOrders: WorkOrder[];
}

export const InspectorView: React.FC<InspectorViewProps> = ({ assets, workOrders }) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'compliance'>('history');
  const [isScanning, setIsScanning] = useState(false);

  const filteredAssets = searchQuery 
    ? assets.filter(a => 
        a.asset_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setSearchQuery('');
  };

  const handleScan = () => {
      setIsScanning(true);
      // Simulate NFC Scan Delay
      setTimeout(() => {
          // For demo purposes, pick a random asset to simulate a "found" tag
          const randomAsset = assets[Math.floor(Math.random() * assets.length)];
          if (randomAsset) {
              handleSelectAsset(randomAsset);
          }
          setIsScanning(false);
      }, 2000);
  };

  const renderAssetFile = () => {
    if (!selectedAsset) return null;

    const assetWOs = workOrders.filter(wo => wo.asset_id === selectedAsset.asset_id || wo.asset_id === selectedAsset.nfc_tag_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const docs = getAssetDocuments(selectedAsset.asset_id);
    const users = getUsers();

    return (
      <div className="animate-in slide-in-from-right-4 duration-500">
        <button 
          onClick={() => setSelectedAsset(null)} 
          className="flex items-center gap-2 text-text-muted hover:text-brand font-bold mb-4 transition-colors"
        >
          <ChevronLeft size={20} className="rtl:rotate-180"/> {t('back')}
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-border shadow-soft p-6 mb-6 flex flex-col md:flex-row gap-6">
          <div className="w-32 h-32 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-200">
             {selectedAsset.image ? <img src={selectedAsset.image} className="w-full h-full object-cover rounded-xl"/> : <div className="text-gray-300 font-bold text-xs">NO IMAGE</div>}
          </div>
          <div className="flex-1">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">{selectedAsset.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">{selectedAsset.asset_id}</span>
                        <span>•</span>
                        <span>{selectedAsset.model}</span>
                        <span>•</span>
                        <span>{selectedAsset.serial_number}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-600">
                        {getLocationName(selectedAsset.location_id)}
                    </div>
                </div>
                <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedAsset.status === 'Running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedAsset.status}
                    </span>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                 <div>
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('risk_level')}</div>
                     <div className={`text-xl font-black ${selectedAsset.risk_score > 70 ? 'text-red-600' : selectedAsset.risk_score > 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                         {selectedAsset.risk_score}/100
                     </div>
                 </div>
                 <div>
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('next_cal_due')}</div>
                     <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                         <Calendar size={16} className="text-brand"/>
                         {selectedAsset.next_calibration_date || 'N/A'}
                     </div>
                 </div>
                 <div>
                     <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('warranty_exp')}</div>
                     <div className="text-lg font-bold text-gray-800">{selectedAsset.warranty_expiration}</div>
                 </div>
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden min-h-[500px]">
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-brand/5 text-brand border-b-2 border-brand' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <History size={18}/> {t('history_log')}
                </button>
                <button 
                    onClick={() => setActiveTab('compliance')}
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'compliance' ? 'bg-brand/5 text-brand border-b-2 border-brand' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <ShieldCheck size={18}/> {t('compliance_docs')}
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {assetWOs.length === 0 ? (
                            <div className="text-center text-gray-400 py-12">No work orders found for this asset.</div>
                        ) : (
                            assetWOs.map(wo => {
                                const tech = users.find(u => u.user_id === wo.assigned_to_id);
                                return (
                                    <div key={wo.wo_id} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full mt-2 ${wo.status === 'Closed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <div className="w-0.5 flex-1 bg-gray-100 group-last:hidden"></div>
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-brand/30 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${wo.type === 'Preventive' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{wo.type}</span>
                                                        <span className="text-xs font-mono text-gray-400 ml-2">#{wo.wo_id}</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500">{new Date(wo.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 mb-1">{wo.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>Tech: {tech?.name || 'Unknown'}</span>
                                                    <span>•</span>
                                                    <span>Status: {wo.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'compliance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {docs.map(doc => (
                            <div key={doc.doc_id} className="p-4 border border-gray-200 rounded-xl hover:border-brand hover:shadow-sm transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${doc.type === 'Certificate' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <FileText size={24}/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm group-hover:text-brand">{doc.title}</div>
                                        <div className="text-xs text-gray-500">{doc.type} • {doc.date}</div>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors">
                                    <Download size={18}/>
                                </button>
                            </div>
                        ))}
                        {docs.length === 0 && (
                            <div className="col-span-2 text-center py-12 text-gray-400">
                                <ShieldCheck size={48} className="mx-auto mb-3 opacity-20"/>
                                <p>No compliance documents uploaded.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  if (selectedAsset) {
    return (
      <div className="max-w-5xl mx-auto font-sans">
        {renderAssetFile()}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center -mt-20 font-sans p-4">
      <div className="text-center space-y-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center justify-center p-4 bg-brand/5 rounded-full mb-4">
            <ShieldCheck size={48} className="text-brand"/>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {t('nav_inspector')}
        </h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto">
            Access secure compliance records, historical logs, and asset certificates.
        </p>

        <div className="flex gap-2 w-full max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand to-brand-light rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative flex-1">
                <Search className="absolute left-6 top-5 text-gray-400" size={24}/>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('inspector_search_placeholder')}
                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-white text-lg font-medium shadow-xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all placeholder:text-gray-300"
                    autoFocus
                />
                
                {searchQuery && filteredAssets.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                        {filteredAssets.map(asset => (
                            <div 
                                key={asset.asset_id}
                                onClick={() => handleSelectAsset(asset)}
                                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-50 last:border-0 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                        {asset.image ? <img src={asset.image} className="w-full h-full object-cover rounded-lg"/> : <FileText size={18}/>}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900">{asset.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{asset.asset_id} • {asset.serial_number}</div>
                                    </div>
                                </div>
                                <ArrowRight size={18} className="text-gray-300 group-hover:text-brand transition-colors"/>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button 
                onClick={handleScan}
                disabled={isScanning}
                className="relative bg-brand text-white p-4 rounded-2xl shadow-xl hover:bg-brand-dark transition-all disabled:opacity-70 flex items-center justify-center min-w-[80px] z-10"
                title={t('scan_nfc')}
            >
                {isScanning ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <Scan size={24} />
                )}
            </button>
        </div>
        
        {isScanning && (
            <div className="text-brand font-bold animate-pulse flex items-center justify-center gap-2">
                <Wifi size={18} /> {t('identifying')}
            </div>
        )}
      </div>
    </div>
  );
};
