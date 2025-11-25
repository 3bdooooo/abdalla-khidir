
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Asset, InventoryPart, WorkOrder, AssetStatus, User, UserRole, Priority, WorkOrderType } from '../types';
import * as MockDb from './mockDb';

// --- DATA MAPPERS (Bridge App <-> DB) ---

const mapDbUserToApp = (dbUser: any): User => ({
    user_id: dbUser.user_id,
    name: dbUser.username,
    role: dbUser.user_role as UserRole,
    email: dbUser.email || '',
    phone_number: dbUser.phone_number,
    department: dbUser.department,
    password: dbUser.password_hash || '***', 
    digital_signature: dbUser.digital_signature,
    location_id: 101 // Default fallback
});

const mapAppUserToDb = (user: User) => ({
    username: user.name,
    password_hash: user.password || '123456', 
    phone_number: user.phone_number,
    email: user.email,
    department: user.department || 'General',
    user_role: user.role,
    digital_signature: user.digital_signature
});

const mapDbAssetToApp = (dbAsset: any): Asset => ({
    asset_id: dbAsset.nfc_tag_id || dbAsset.serial_number || `DB-${dbAsset.asset_id}`,
    nfc_tag_id: dbAsset.nfc_tag_id,
    name: dbAsset.asset_name,
    model: dbAsset.model_number,
    manufacturer: 'Generic', 
    serial_number: dbAsset.serial_number,
    location_id: parseInt(dbAsset.current_location) || 101, 
    status: dbAsset.status as AssetStatus,
    purchase_date: dbAsset.purchase_date || new Date().toISOString(),
    operating_hours: 0, 
    risk_score: 0, 
    image: dbAsset.image,
    last_calibration_date: dbAsset.last_calibration_date, // Ensure these are mapped
    next_calibration_date: dbAsset.next_calibration_date
});

const mapAppAssetToDb = (asset: Asset) => ({
    asset_name: asset.name,
    model_number: asset.model,
    serial_number: asset.serial_number || asset.asset_id,
    current_location: asset.location_id.toString(),
    status: asset.status,
    nfc_tag_id: asset.nfc_tag_id || asset.asset_id,
    purchase_date: asset.purchase_date,
    image: asset.image
});

const mapDbWOToApp = (dbWO: any): WorkOrder => ({
    wo_id: dbWO.wo_id,
    asset_id: dbWO.assets?.nfc_tag_id || 'Unknown', 
    type: (dbWO.priority === 'Preventive' ? WorkOrderType.PREVENTIVE : WorkOrderType.CORRECTIVE), 
    priority: dbWO.priority as Priority,
    assigned_to_id: dbWO.assigned_to_id,
    description: dbWO.description,
    status: dbWO.status,
    created_at: dbWO.creation_date,
    start_time: dbWO.creation_date 
});

// --- MASS SEEDING HELPERS ---

const generateRandomUsers = (count: number) => {
    const roles = [UserRole.NURSE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ENGINEER];
    const depts = ['ICU', 'Radiology', 'Surgery', 'ER', 'Biomedical Engineering'];
    const users = [];
    
    for (let i = 0; i < count; i++) {
        const role = roles[Math.floor(Math.random() * roles.length)];
        const dept = depts[Math.floor(Math.random() * depts.length)];
        const firstName = ['John', 'Sarah', 'Ahmed', 'Mohamed', 'Lisa', 'Mike', 'Fatima', 'Ali'][Math.floor(Math.random() * 8)];
        const lastName = ['Smith', 'Johnson', 'Al-Sayed', 'Khan', 'Brown', 'Davis'][Math.floor(Math.random() * 6)];
        
        users.push({
            name: `${firstName} ${lastName} ${i+1}`,
            email: `user${Date.now()}_${i}@hospital.com`,
            role: role,
            phone_number: `05${Math.floor(Math.random() * 90000000 + 10000000)}`,
            department: dept,
            password: '123',
            user_id: 0, // Placeholder
            location_id: 101 // Placeholder
        });
    }
    return users;
};

const generateRandomAssets = (count: number) => {
    const types = [
        { name: 'Vital Signs Monitor', model: 'GE Carescape' },
        { name: 'Infusion Pump', model: 'Baxter Sigma' },
        { name: 'Ventilator', model: 'Hamilton G5' },
        { name: 'Defibrillator', model: 'Zoll R Series' },
        { name: 'X-Ray Machine', model: 'Philips Digital' },
        { name: 'Ultrasound', model: 'GE Logiq' },
        { name: 'Hospital Bed', model: 'Hillrom' },
        { name: 'ECG Machine', model: 'Mac 2000' }
    ];
    
    const assets = [];
    
    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const locId = 100 + Math.floor(Math.random() * 20); // Random Loc ID 100-120
        const statusRandom = Math.random();
        let status = AssetStatus.RUNNING;
        if (statusRandom > 0.85) status = AssetStatus.DOWN;
        else if (statusRandom > 0.75) status = AssetStatus.UNDER_MAINT;

        // Calibration dates logic
        const lastCal = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
        const nextCal = new Date(lastCal);
        nextCal.setFullYear(nextCal.getFullYear() + 1);

        assets.push({
            asset_id: `NFC-${10000 + i}`,
            nfc_tag_id: `NFC-${10000 + i}`,
            name: type.name,
            model: `${type.model} v${Math.floor(Math.random() * 5)}`,
            manufacturer: type.name.split(' ')[0], // Crude approximation
            serial_number: `SN-${Date.now()}-${i}`,
            location_id: locId,
            status: status,
            purchase_date: new Date(Date.now() - Math.floor(Math.random() * 100000000000)).toISOString().split('T')[0],
            operating_hours: Math.floor(Math.random() * 5000),
            risk_score: Math.floor(Math.random() * 100),
            image: `https://source.unsplash.com/random/800x600/?medical,technology&sig=${i}`,
            last_calibration_date: lastCal.toISOString().split('T')[0],
            next_calibration_date: nextCal.toISOString().split('T')[0]
        });
    }
    return assets;
};

// --- SEEDING LOGIC ---
export const seedDatabaseIfEmpty = async () => {
  if (!isSupabaseConfigured) return;

  try {
    // Check if we need to seed
    const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    
    // If less than 50 assets, assume it's "empty" enough to need a mass seed
    if (count !== null && count < 50) {
      console.log("Database nearly empty. Starting MASS SEEDING...");
      
      // 1. Seed 30 Users
      console.log("Seeding 30 Users...");
      const mockUsers = generateRandomUsers(30);
      // Insert users and get IDs back for WOs
      const { data: createdUsers, error: uErr } = await supabase.from('users').insert(mockUsers.map(mapAppUserToDb)).select();
      if(uErr) console.error("User Seed Error", uErr);
      
      // 2. Seed 1000 Assets (Batched)
      console.log("Seeding 1000 Assets...");
      const mockAssets = generateRandomAssets(1000);
      const dbAssets = mockAssets.map(mapAppAssetToDb);
      
      const batchSize = 50;
      let createdAssetIds: number[] = [];

      for (let i = 0; i < dbAssets.length; i += batchSize) {
          const batch = dbAssets.slice(i, i + batchSize);
          console.log(`Inserting Asset Batch ${i/batchSize + 1}...`);
          const { data: batchResult, error: aErr } = await supabase.from('assets').insert(batch).select('asset_id');
          if(aErr) console.error("Asset Batch Error", aErr);
          if(batchResult) createdAssetIds = [...createdAssetIds, ...batchResult.map(a => a.asset_id)];
      }

      // 3. Seed 100 Work Orders (Reports)
      console.log("Seeding 100 Reports...");
      if (createdUsers && createdUsers.length > 0 && createdAssetIds.length > 0) {
          const reports = [];
          for(let i=0; i<100; i++) {
              const randomAssetId = createdAssetIds[Math.floor(Math.random() * createdAssetIds.length)];
              const randomReporter = createdUsers[Math.floor(Math.random() * createdUsers.length)].user_id;
              
              reports.push({
                  asset_id: randomAssetId,
                  reporter_id: randomReporter,
                  priority: ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
                  description: `Generated Report #${i+1}: Device malfunction reported during rounds.`,
                  status: ['New', 'Assigned', 'In_Progress', 'Closed'][Math.floor(Math.random() * 4)],
                  type: Math.random() > 0.5 ? 'Corrective' : 'Preventive',
                  creation_date: new Date(Date.now() - Math.floor(Math.random() * 5000000000)).toISOString()
              });
          }
          const { error: woErr } = await supabase.from('work_orders').insert(reports);
          if(woErr) console.error("WO Seed Error", woErr);
      }
      
      console.log("Mass Seeding Complete!");
    }
  } catch (err) {
    console.warn("Seeding failed or interrupted.", err);
  }
};

// --- AUTH FUNCTIONS ---

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  if (!isSupabaseConfigured) {
    const user = MockDb.MOCK_USERS.find(u => u.email === email && u.password === password);
    return user || null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return null;

    if (data.password_hash === password) {
        return mapDbUserToApp(data);
    }
    
    return null;

  } catch (e) {
    console.error("Auth Error", e);
    return null;
  }
};

// --- READ FUNCTIONS ---

export const fetchAssets = async (): Promise<Asset[]> => {
  if (!isSupabaseConfigured) return MockDb.getAssets();

  try {
    // Limit to 200 for UI performance initially
    const { data, error } = await supabase.from('assets').select('*').limit(200);
    if (error) throw error;
    return data.map(mapDbAssetToApp);
  } catch (e) {
    console.warn("Supabase fetch failed, using mock assets.", e);
    return MockDb.getAssets();
  }
};

export const fetchInventory = async (): Promise<InventoryPart[]> => {
    return MockDb.getInventory();
};

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  if (!isSupabaseConfigured) return MockDb.getWorkOrders();

  try {
    const { data, error } = await supabase.from('work_orders').select(`
      *,
      assets (nfc_tag_id)
    `).limit(200);
    
    if (error) throw error;
    
    return data.map(wo => ({
        ...mapDbWOToApp(wo),
        asset_id: wo.assets?.nfc_tag_id || 'Unknown'
    }));
  } catch (e) {
    console.warn("Supabase fetch failed, using mock work orders.", e);
    return MockDb.getWorkOrders();
  }
};

export const fetchUsers = async (): Promise<User[]> => {
  if (!isSupabaseConfigured) return MockDb.getUsers();

  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data.map(mapDbUserToApp);
  } catch (e) {
    return MockDb.getUsers();
  }
};

export const fetchPMReport = async (woId: string) => {
    // Mock fetch for PM reports since we are using detailed mock templates
    return MockDb.getPMReports().find(r => r.wo_id.toString() === woId) || MockDb.getPMReports()[0];
}

// --- WRITE FUNCTIONS ---

export const createWorkOrder = async (wo: WorkOrder) => {
  if (!isSupabaseConfigured) {
    MockDb.createWorkOrder(wo);
    return;
  }

  try {
    // Lookup by NFC Tag
    const { data: assetData } = await supabase.from('assets').select('asset_id').eq('nfc_tag_id', wo.asset_id).single();
    
    if (!assetData) throw new Error("Asset not found in DB");

    const dbWo = {
        asset_id: assetData.asset_id,
        reporter_id: wo.assigned_to_id || 3, // Use assigned or default to a nurse
        priority: wo.priority,
        description: wo.description,
        status: wo.status,
        assigned_to_id: wo.assigned_to_id,
        type: wo.type === WorkOrderType.PREVENTIVE ? 'Preventive' : 'Corrective',
        creation_date: wo.created_at
    };

    const { error } = await supabase.from('work_orders').insert(dbWo);
    if (error) throw error;

    if (wo.priority === 'Critical' || wo.priority === 'High') {
        await updateAssetStatus(wo.asset_id, AssetStatus.DOWN);
    }
  } catch (e) {
    console.warn("Supabase create failed, using mock.", e);
    MockDb.createWorkOrder(wo);
  }
};

export const updateAssetStatus = async (assetId: string, status: AssetStatus) => {
  if (!isSupabaseConfigured) {
    MockDb.updateAssetStatus(assetId, status);
    return;
  }

  try {
    await supabase.from('assets').update({ status }).eq('nfc_tag_id', assetId);
  } catch (e) {
    MockDb.updateAssetStatus(assetId, status);
  }
};

export const updateAssetCalibration = async (assetId: string, lastDate: string, nextDate: string) => {
    if (!isSupabaseConfigured) {
        // Mock update if needed (mockDb logic doesn't deeply simulate this, but avoids crash)
        return;
    }
    try {
        const { error } = await supabase
            .from('assets')
            .update({ 
                last_calibration_date: lastDate,
                next_calibration_date: nextDate
            })
            .eq('nfc_tag_id', assetId);
            
        if (error) throw error;
    } catch (e) {
        console.error("Calibration update failed", e);
    }
};

export const updateStock = async (partId: number, qtyUsed: number) => {
    MockDb.updateStock(partId, qtyUsed);
};

export const restockPart = async (partId: number, qtyAdded: number) => {
    MockDb.restockPart(partId, qtyAdded);
};

export const startWorkOrder = async (woId: number) => {
    if (!isSupabaseConfigured) {
      MockDb.startWorkOrder(woId);
      return;
    }
    try {
      await supabase.from('work_orders').update({ 
          status: 'In Progress'
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
          status: 'Closed'
      }).eq('wo_id', woId);
    } catch (e) {
      MockDb.closeWorkOrder(woId);
    }
};

export const addAsset = async (asset: Asset) => {
    if (!isSupabaseConfigured) {
      MockDb.addAsset(asset);
      return; 
    }

    try {
      await supabase.from('assets').insert(mapAppAssetToDb(asset));
    } catch (e) {
      console.error("Failed to add asset", e);
      MockDb.addAsset(asset);
    }
}

export const addUser = async (user: User) => {
  if (!isSupabaseConfigured) {
    MockDb.addUser(user);
    return;
  }

  try {
    await supabase.from('users').insert(mapAppUserToDb(user));
  } catch (e) {
    console.error("Failed to add user", e);
    MockDb.addUser(user);
  }
}
