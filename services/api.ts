
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as MockDb from './mockDb';
import { Asset, InventoryPart, WorkOrder, User, AssetStatus } from '../types';

// READ

export const fetchAssets = async (): Promise<Asset[]> => {
  if (!isSupabaseConfigured) return MockDb.getAssets();
  const { data, error } = await supabase.from('assets').select('*');
  if (error || !data) return MockDb.getAssets();
  return data;
};

export const fetchInventory = async (): Promise<InventoryPart[]> => {
  if (!isSupabaseConfigured) return MockDb.getInventory();
  const { data, error } = await supabase.from('inventory').select('*');
  if (error || !data) return MockDb.getInventory();
  return data;
};

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  if (!isSupabaseConfigured) return MockDb.getWorkOrders();
  const { data, error } = await supabase.from('work_orders').select('*');
  if (error || !data) return MockDb.getWorkOrders();
  return data;
};

export const fetchUsers = async (): Promise<User[]> => {
    if (!isSupabaseConfigured) return MockDb.getUsers();
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data) return MockDb.getUsers();
    return data;
}

export const fetchPMReport = async (id: string) => {
    if (!isSupabaseConfigured) return null;
    return null; 
}

// WRITE

export const startWorkOrder = async (woId: number, coordinates?: {lat: number, lng: number}) => {
    if (!isSupabaseConfigured) {
      MockDb.startWorkOrder(woId);
      return;
    }
    try {
      await supabase.from('work_orders').update({ 
          status: 'In Progress',
          start_time: new Date().toISOString()
      }).eq('wo_id', woId);
    } catch (e) {
      MockDb.startWorkOrder(woId);
    }
};

export const closeWorkOrder = async (woId: number) => {
    if (!isSupabaseConfigured) {
      MockDb.closeWorkOrder(woId);
      return;
    }
    try {
      await supabase.from('work_orders').update({ 
          status: 'Closed',
          close_time: new Date().toISOString()
      }).eq('wo_id', woId);
    } catch (e) {
      MockDb.closeWorkOrder(woId);
    }
};

export const submitCompletionReport = async (woId: number, details: {
    failure_cause: string,
    repair_actions: string,
    technician_signature: string,
    parts_used: { part_id: number; quantity: number }[]
}) => {
    if (!isSupabaseConfigured) {
        MockDb.closeWorkOrder(woId);
        return;
    }

    try {
        const endTime = new Date().toISOString();
        const { error: cmrError } = await supabase.from('corrective_maintenance_reports').insert({
            wo_id: woId,
            failure_cause: details.failure_cause,
            repair_actions: details.repair_actions,
            technician_signature: details.technician_signature,
            repair_end_time: endTime,
            parts_used: JSON.stringify(details.parts_used)
        });
        if (cmrError) throw cmrError;

        const { error: woError } = await supabase.from('work_orders').update({
            status: 'Awaiting Approval',
            close_time: endTime
        }).eq('wo_id', woId);

        if (woError) throw woError;

    } catch (e) {
        console.error("Submit Report Failed", e);
        MockDb.closeWorkOrder(woId);
    }
};

// Approval Workflows
export const submitManagerApproval = async (woId: number, userId: number, signature: string) => {
    if (!isSupabaseConfigured) {
        // Mock Implementation
        MockDb.getWorkOrders().forEach(w => {
            if (w.wo_id === woId) {
                w.status = 'Manager Approved';
                if (!w.approvals) w.approvals = {};
                w.approvals.manager = {
                    user_id: userId,
                    signature: signature,
                    timestamp: new Date().toISOString(),
                    approved_time: true
                };
            }
        });
        return;
    }
    // Supabase Implementation
    await supabase.from('work_orders').update({
        status: 'Manager Approved',
    }).eq('wo_id', woId);
};

export const submitSupervisorApproval = async (woId: number, userId: number, signature: string) => {
    if (!isSupabaseConfigured) {
         // Mock Implementation
         MockDb.getWorkOrders().forEach(w => {
            if (w.wo_id === woId) {
                w.status = 'Awaiting Final Acceptance';
                if (!w.approvals) w.approvals = {};
                w.approvals.supervisor = {
                    user_id: userId,
                    signature: signature,
                    timestamp: new Date().toISOString(),
                    approved_parts: true,
                    approved_technical: true
                };
            }
        });
        return;
    }
    await supabase.from('work_orders').update({
        status: 'Awaiting Final Acceptance',
    }).eq('wo_id', woId);
};

export const submitNurseVerification = async (woId: number, userId: number, signature: string) => {
    if (!isSupabaseConfigured) {
        // Mock Implementation
        MockDb.getWorkOrders().forEach(w => {
           if (w.wo_id === woId) {
               w.status = 'Closed';
               if (!w.approvals) w.approvals = {};
               w.approvals.nurse = {
                   user_id: userId,
                   signature: signature,
                   timestamp: new Date().toISOString(),
                   verified: true
               };
           }
       });
       return;
   }
   await supabase.from('work_orders').update({
       status: 'Closed',
   }).eq('wo_id', woId);
}


export const addAsset = async (asset: Asset) => {
    if (!isSupabaseConfigured) {
        MockDb.addAsset(asset);
        return;
    }
    await supabase.from('assets').insert(asset);
};

export const updateAssetStatus = async (assetId: string, status: AssetStatus) => {
    if (!isSupabaseConfigured) {
        MockDb.updateAssetStatus(assetId, status);
        return;
    }
    await supabase.from('assets').update({ status }).eq('asset_id', assetId);
}

export const restockPart = async (partId: number, qty: number) => {
    if (!isSupabaseConfigured) {
        MockDb.restockPart(partId, qty);
        return;
    }
    const { data } = await supabase.from('inventory').select('current_stock').eq('part_id', partId).single();
    if (data) {
        await supabase.from('inventory').update({ current_stock: data.current_stock + qty }).eq('part_id', partId);
    }
}

export const createWorkOrder = async (wo: WorkOrder) => {
    if (!isSupabaseConfigured) {
        MockDb.createWorkOrder(wo);
        return;
    }
    await supabase.from('work_orders').insert(wo);
}

export const updateAssetCalibration = async (assetId: string, lastCal: string, nextCal: string) => {
    if (!isSupabaseConfigured) {
        MockDb.updateAssetCalibration(assetId, lastCal, nextCal);
        return;
    }
    await supabase.from('assets').update({ last_calibration_date: lastCal, next_calibration_date: nextCal }).eq('asset_id', assetId);
}

export const assignWorkOrder = async (woId: number, userId: number) => {
    if (!isSupabaseConfigured) {
        MockDb.assignWorkOrder(woId, userId);
        return;
    }
    await supabase.from('work_orders').update({ assigned_to_id: userId, status: 'Assigned' }).eq('wo_id', woId);
}

export const updateStock = async (partId: number, quantityUsed: number) => {
    if (!isSupabaseConfigured) {
        MockDb.updateStock(partId, quantityUsed);
        return;
    }
     const { data } = await supabase.from('inventory').select('current_stock').eq('part_id', partId).single();
    if (data) {
        await supabase.from('inventory').update({ current_stock: data.current_stock - quantityUsed }).eq('part_id', partId);
    }
}

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
    if (!isSupabaseConfigured) {
        const user = MockDb.MOCK_USERS.find(u => u.email === email && u.password === password);
        return user || null;
    }
    const { data } = await supabase.from('users').select('*').eq('email', email).eq('password', password).single();
    return data || null;
}

export const addUser = async (user: User) => {
    if (!isSupabaseConfigured) {
        MockDb.addUser(user);
        return;
    }
    await supabase.from('users').insert(user);
}

export const seedDatabaseIfEmpty = async () => {
    if (!isSupabaseConfigured) return;
    
    const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    if (count === 0) {
        await supabase.from('assets').insert(MockDb.getAssets());
        await supabase.from('inventory').insert(MockDb.getInventory());
        await supabase.from('users').insert(MockDb.getUsers());
        await supabase.from('locations').insert(MockDb.getLocations());
        console.log("Database Seeded");
    }
}
