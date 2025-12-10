
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as MockDb from './mockDb';
import { Asset, InventoryPart, WorkOrder, User, AssetStatus, Priority, WorkOrderType, RoleDefinition } from '../types';

// Data Fetchers
export const fetchAssets = async (): Promise<Asset[]> => {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('assets').select('*');
        if (!error && data) return data;
    }
    return MockDb.getAssets();
};

export const fetchInventory = async (): Promise<InventoryPart[]> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('inventory').select('*');
        if (data) return data;
    }
    return MockDb.getInventory();
};

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('work_orders').select('*');
        if (data) return data;
    }
    return MockDb.getWorkOrders();
};

export const fetchUsers = async (): Promise<User[]> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('users').select('*');
        if (data) return data;
    }
    return MockDb.getUsers();
};

export const fetchRoles = async (): Promise<RoleDefinition[]> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('roles').select('*');
        if (data) return data;
    }
    return MockDb.getRoles();
};

export const fetchPMReport = async (id: string) => {
    const reports = MockDb.getPMReports();
    return reports.find(r => r.pm_id === id || r.wo_id.toString() === id) || null;
};

// NEW: SQL-like Aggregation for Advanced Reports
export const fetchAdvancedAnalytics = async (filters?: { startDate?: string, endDate?: string, assetType?: string }) => {
    // 1. Fetch raw data
    const wos = await fetchWorkOrders();
    const inventory = await fetchInventory();

    // 2. Filter Logic (Simulating SQL WHERE clause)
    let filteredWos = wos.filter(w => w.status === 'Closed');
    
    // 3. Calculate MTTR (Mean Time To Repair)
    // SQL: AVG(EXTRACT(EPOCH FROM (close_time - start_time))/3600)
    let totalRepairHours = 0;
    let cmCount = 0;
    
    filteredWos.filter(w => w.type === WorkOrderType.CORRECTIVE && w.start_time && w.close_time).forEach(w => {
        const start = new Date(w.start_time!).getTime();
        const end = new Date(w.close_time!).getTime();
        const durationHours = (end - start) / (1000 * 60 * 60);
        if (durationHours > 0) {
            totalRepairHours += durationHours;
            cmCount++;
        }
    });
    const mttr = cmCount > 0 ? (totalRepairHours / cmCount) : 0;

    // 4. Calculate Average Cost per CM
    // SQL: SUM(parts_cost + labor_cost) / COUNT(*)
    let totalCost = 0;
    filteredWos.filter(w => w.type === WorkOrderType.CORRECTIVE).forEach(w => {
        // Parts Cost
        let partsCost = 0;
        if (w.parts_used) {
            w.parts_used.forEach(p => {
                const part = inventory.find(i => i.part_id === p.part_id);
                if (part) partsCost += part.cost * p.quantity;
            });
        }
        // Labor Cost (Mock Rate $50/hr)
        let laborCost = 0;
        if (w.start_time && w.close_time) {
             const hours = (new Date(w.close_time).getTime() - new Date(w.start_time).getTime()) / (1000 * 60 * 60);
             laborCost = hours * 50;
        }
        totalCost += (partsCost + laborCost);
    });
    const avgCostPerCM = cmCount > 0 ? (totalCost / cmCount) : 0;

    // 5. Calculate PM Compliance
    // SQL: (COUNT(closed_pm) / COUNT(total_pm)) * 100
    const allPMs = wos.filter(w => w.type === WorkOrderType.PREVENTIVE);
    const closedPMs = allPMs.filter(w => w.status === 'Closed');
    const pmCompliance = allPMs.length > 0 ? (closedPMs.length / allPMs.length) * 100 : 100;

    return {
        mttr: parseFloat(mttr.toFixed(2)),
        avgCostPerCM: parseFloat(avgCostPerCM.toFixed(2)),
        pmCompliance: parseFloat(pmCompliance.toFixed(1))
    };
};

// Actions
export const updateAssetStatus = async (assetId: string, status: AssetStatus) => {
    if (isSupabaseConfigured) {
        await supabase.from('assets').update({ status }).eq('asset_id', assetId);
    } else {
        const assets = MockDb.getAssets();
        const asset = assets.find(a => a.asset_id === assetId);
        if (asset) asset.status = status;
    }
};

export const restockPart = async (partId: number, quantity: number) => {
     if (isSupabaseConfigured) {
        // await supabase.rpc('restock_part', { p_id: partId, qty: quantity });
     } else {
        const inv = MockDb.getInventory().find(p => p.part_id === partId);
        if (inv) inv.current_stock += quantity;
     }
};

export const createWorkOrder = async (wo: WorkOrder) => {
    if (isSupabaseConfigured) {
        await supabase.from('work_orders').insert(wo);
    } else {
        MockDb.createWorkOrder(wo);
    }
};

export const assignWorkOrder = async (woId: number, userId: number) => {
    if (isSupabaseConfigured) {
        await supabase.from('work_orders').update({ assigned_to_id: userId, status: 'Assigned' }).eq('wo_id', woId);
    } else {
        const wo = MockDb.getWorkOrders().find(w => w.wo_id === woId);
        if (wo) {
            wo.assigned_to_id = userId;
            wo.status = 'Assigned';
        }
    }
};

export const updateAssetCalibration = async (assetId: string, lastCal: string, nextCal: string) => {
     if (isSupabaseConfigured) {
        await supabase.from('assets').update({ last_calibration_date: lastCal, next_calibration_date: nextCal }).eq('asset_id', assetId);
    } else {
        const asset = MockDb.getAssets().find(a => a.asset_id === assetId);
        if (asset) {
            asset.last_calibration_date = lastCal;
            asset.next_calibration_date = nextCal;
        }
    }
};

export const saveRole = async (role: RoleDefinition) => {
    const roles = MockDb.getRoles();
    const idx = roles.findIndex(r => r.id === role.id);
    if (idx >= 0) roles[idx] = role;
    else roles.push(role);
};

export const startWorkOrder = async (woId: number, location?: {lat: number, lng: number}) => {
    if (isSupabaseConfigured) {
         await supabase.from('work_orders').update({ status: 'In Progress', start_time: new Date().toISOString() }).eq('wo_id', woId);
    } else {
        const wo = MockDb.getWorkOrders().find(w => w.wo_id === woId);
        if (wo) {
            wo.status = 'In Progress';
            wo.start_time = new Date().toISOString();
        }
    }
};

export const updateStock = async (partId: number, usedQty: number) => {
    if (!isSupabaseConfigured) {
        const part = MockDb.getInventory().find(p => p.part_id === partId);
        if (part) part.current_stock = Math.max(0, part.current_stock - usedQty);
    }
};

export const submitCompletionReport = async (woId: number, reportData: any) => {
    if (isSupabaseConfigured) {
        await supabase.from('work_orders').update({ 
            status: 'Closed', 
            close_time: new Date().toISOString(),
            description: reportData.repair_actions
        }).eq('wo_id', woId);
    } else {
        const wo = MockDb.getWorkOrders().find(w => w.wo_id === woId);
        if (wo) {
            wo.status = 'Closed';
            wo.close_time = new Date().toISOString();
        }
    }
};

export const submitNurseVerification = async (woId: number, userId: number, signature: string, rating: number) => {
     if (isSupabaseConfigured) {
        await supabase.from('work_orders').update({ status: 'Closed', nurse_rating: rating }).eq('wo_id', woId);
    } else {
        const wo = MockDb.getWorkOrders().find(w => w.wo_id === woId);
        if (wo) {
            wo.status = 'Closed';
            wo.nurse_rating = rating;
        }
    }
};

export const authenticateUser = async (email: string, pass: string): Promise<User | null> => {
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();
            
            if (error || !data) return null;
            return data as User;
        } catch (e) {
            console.error("Auth error", e);
            return null;
        }
    } else {
        return MockDb.getUsers().find(u => u.email === email) || null;
    }
};

export const seedDatabaseIfEmpty = async () => {
    if (!isSupabaseConfigured) return;
    const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    
    if (count === 0) {
        console.log("Database empty. Seeding initial data...");
        await supabase.from('users').insert(MockDb.MOCK_USERS);
        const mockAssets = MockDb.getAssets();
        for (let i = 0; i < mockAssets.length; i += 50) {
            const batch = mockAssets.slice(i, i + 50);
            await supabase.from('assets').insert(batch);
        }
        console.log("Seeding complete.");
    }
};

export const addAsset = async (asset: Asset) => {
    if (isSupabaseConfigured) {
        await supabase.from('assets').insert(asset);
    } else {
        MockDb.addAsset(asset);
    }
};

export const addUser = async (user: User) => {
    if (isSupabaseConfigured) {
        await supabase.from('users').insert(user);
    } else {
        MockDb.addUser(user);
    }
};
