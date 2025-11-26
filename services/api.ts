
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as MockDb from './mockDb';
import { Asset, InventoryPart, WorkOrder, User, AssetStatus, Priority, WorkOrderType } from '../types';

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

export const submitNurseVerification = async (woId: number, userId: number, signature: string, rating: number) => {
    if (!isSupabaseConfigured) {
        // Mock Implementation
        MockDb.getWorkOrders().forEach(w => {
           if (w.wo_id === woId) {
               w.status = 'Closed';
               w.nurse_rating = rating;
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
       nurse_rating: rating 
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

// MASS SEEDING WITH REALISTIC IMAGES
export const seedDatabaseIfEmpty = async () => {
    if (!isSupabaseConfigured) return;
    
    // Check if assets exist
    const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    
    if (count !== null && count < 50) {
        console.log("Database empty or low. Starting Mass Seeding...");
        
        // 1. Seed Locations & Inventory (Standard Mock Data)
        await supabase.from('locations').insert(MockDb.getLocations());
        await supabase.from('inventory').insert(MockDb.getInventory());

        // 2. Generate 1000 Assets with Real Images
        const generatedAssets: Asset[] = [];
        const deviceTypes = [
            { name: 'MRI Scanner', model: 'Magnetom Vida', manufacturer: 'Siemens' },
            { name: 'Ventilator', model: 'Servo-U', manufacturer: 'Getinge' },
            { name: 'Infusion Pump', model: 'Alaris System', manufacturer: 'BD' },
            { name: 'Patient Monitor', model: 'IntelliVue MX40', manufacturer: 'Philips' },
            { name: 'Anesthesia Machine', model: 'Drager Fabius', manufacturer: 'Drager' },
            { name: 'Defibrillator', model: 'LifePak 15', manufacturer: 'Stryker' },
            { name: 'Infant Incubator', model: 'Isolette 8000', manufacturer: 'Drager' },
            { name: 'Ultrasound System', model: 'Voluson E10', manufacturer: 'GE Healthcare' }
        ];
        
        const locIds = MockDb.LOCATIONS.map(l => l.location_id);

        for (let i = 0; i < 1000; i++) {
            const type = deviceTypes[i % deviceTypes.length];
            const locId = locIds[i % locIds.length];
            
            generatedAssets.push({
                asset_id: `AST-${1000 + i}`,
                nfc_tag_id: `NFC-${1000 + i}`,
                name: type.name,
                model: type.model,
                manufacturer: type.manufacturer,
                serial_number: `SN-${Math.floor(Math.random() * 1000000)}`,
                location_id: locId,
                status: Math.random() > 0.9 ? AssetStatus.DOWN : (Math.random() > 0.8 ? AssetStatus.UNDER_MAINT : AssetStatus.RUNNING),
                purchase_date: '2022-01-01',
                operating_hours: Math.floor(Math.random() * 5000),
                risk_score: Math.floor(Math.random() * 100),
                // USE REAL IMAGE HELPER
                image: MockDb.getModelImage(type.model),
                purchase_cost: 5000 + Math.floor(Math.random() * 50000),
                accumulated_maintenance_cost: Math.floor(Math.random() * 5000)
            });
        }

        // Insert Assets in Batches
        const batchSize = 50;
        for (let i = 0; i < generatedAssets.length; i += batchSize) {
            const batch = generatedAssets.slice(i, i + batchSize);
            console.log(`Seeding Assets Batch ${i/batchSize + 1}...`);
            await supabase.from('assets').insert(batch);
        }

        // 3. Seed Users
        await supabase.from('users').insert(MockDb.getUsers());
        
        // 4. Generate & Seed Work Orders
        const generatedWOs: WorkOrder[] = [];
        for (let i = 0; i < 100; i++) {
            generatedWOs.push({
                wo_id: 5000 + i,
                asset_id: `AST-${1000 + (i % 50)}`, // Link to first 50 generated assets
                type: i % 3 === 0 ? WorkOrderType.PREVENTIVE : WorkOrderType.CORRECTIVE,
                priority: i % 5 === 0 ? Priority.CRITICAL : Priority.MEDIUM,
                assigned_to_id: 3, // Mock Tech
                description: `Auto-generated test task #${i}`,
                status: 'Open',
                created_at: new Date().toISOString()
            });
        }
        await supabase.from('work_orders').insert(generatedWOs);
        
        console.log("Mass Seeding Complete!");
    }
}
