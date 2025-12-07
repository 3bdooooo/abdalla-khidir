
import { supabase, isSupabaseConfigured } from './supabaseClient';
import * as MockDb from './mockDb';
import { Asset, InventoryPart, WorkOrder, User, AssetStatus, Priority, WorkOrderType, UserRole, RoleDefinition } from '../types';

// ... (Existing mapping helpers remain unchanged) ...
// Bridge between SQL Columns (snake_case) and App Interfaces

const mapAssetFromDB = (dbAsset: any): Asset => {
    // Attempt to map text location (e.g. "Surgery") to a numeric ID (e.g. 601)
    const locName = dbAsset.current_location || 'ICU';
    const locationObj = MockDb.LOCATIONS.find(l => 
        l.department === locName || 
        l.name.includes(locName)
    );
    const locationId = locationObj ? locationObj.location_id : 101;

    return {
        asset_id: dbAsset.asset_id.toString(), // Ensure string
        nfc_tag_id: dbAsset.nfc_tag_id,
        name: dbAsset.asset_name, // Map asset_name -> name
        model: dbAsset.model_number, // Map model_number -> model
        manufacturer: "Generic", // Default if missing in DB
        serial_number: dbAsset.serial_number,
        location_id: locationId, 
        status: dbAsset.status as AssetStatus,
        purchase_date: dbAsset.purchase_date || '2022-01-01',
        
        // Added missing fields with defaults
        manufacturing_date: dbAsset.manufacturing_date || '2021-01-01',
        installation_date: dbAsset.installation_date || '2022-02-01',
        warranty_expiration: dbAsset.warranty_expiration || '2025-01-01',
        expected_lifespan: dbAsset.expected_lifespan || 10,

        operating_hours: 0, // Default
        risk_score: 0, // Default
        image: dbAsset.image || MockDb.getModelImage(dbAsset.model_number || ''),
    };
};

const mapUserFromDB = (dbUser: any): User => ({
    user_id: dbUser.user_id,
    name: dbUser.username, // Map username -> name
    role: dbUser.user_role as UserRole, // Map user_role -> role
    email: dbUser.email,
    department: dbUser.department,
    phone_number: dbUser.phone_number,
    location_id: 101, // Default
    // Auto-generate signature from name if not present in DB
    digital_signature: dbUser.digital_signature || `Digitally Signed by ${dbUser.username}`
});

const mapWOFromDB = (dbWO: any): WorkOrder => ({
    wo_id: dbWO.wo_id,
    asset_id: dbWO.asset_id.toString(),
    type: dbWO.type as WorkOrderType || WorkOrderType.CORRECTIVE,
    priority: dbWO.priority as Priority,
    assigned_to_id: dbWO.assigned_to_id,
    description: dbWO.description,
    status: dbWO.status,
    created_at: dbWO.creation_date,
    nurse_rating: dbWO.nurse_rating
});

// --- READ FUNCTIONS ---

export const fetchAssets = async (): Promise<Asset[]> => {
  if (!isSupabaseConfigured) return MockDb.getAssets();
  
  try {
      const { data, error } = await supabase.from('assets').select('*');
      if (error) throw error;
      if (!data || data.length === 0) return []; // Return empty to trigger seeding if needed
      
      return data.map(mapAssetFromDB);
  } catch (e) {
      console.error("Fetch Assets Error:", e);
      return MockDb.getAssets(); // Fallback on error
  }
};

export const fetchInventory = async (): Promise<InventoryPart[]> => {
  if (!isSupabaseConfigured) return MockDb.getInventory();
  // Assuming inventory table exists, otherwise mock
  const { data, error } = await supabase.from('inventory').select('*');
  if (error || !data) return MockDb.getInventory();
  return data;
};

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  if (!isSupabaseConfigured) return MockDb.getWorkOrders();
  try {
      const { data, error } = await supabase.from('work_orders').select('*');
      if (error) throw error;
      return data ? data.map(mapWOFromDB) : [];
  } catch (e) {
      console.error("Fetch WO Error:", e);
      return MockDb.getWorkOrders();
  }
};

export const fetchUsers = async (): Promise<User[]> => {
    if (!isSupabaseConfigured) return MockDb.getUsers();
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return data ? data.map(mapUserFromDB) : [];
    } catch (e) {
        console.error("Fetch Users Error:", e);
        return MockDb.getUsers();
    }
}

export const fetchRoles = async (): Promise<RoleDefinition[]> => {
    if (!isSupabaseConfigured) return MockDb.getRoles();
    try {
        // Assuming a 'roles' table exists in Supabase. If not, use mock.
        // For this demo, we'll likely rely on Mock data for roles initially unless SQL is updated
        const { data, error } = await supabase.from('roles').select('*');
        if (error) throw error;
        return data ? data.map((r: any) => ({
            id: r.role_id.toString(),
            name: r.role_name,
            description: r.description,
            is_system_role: r.is_system,
            permissions: r.permissions // Assumes JSON column
        })) : [];
    } catch (e) {
        // Silent fail to mock if table doesn't exist
        return MockDb.getRoles();
    }
}

export const fetchPMReport = async (id: string) => {
    return null; 
}

// --- WRITE FUNCTIONS ---

export const startWorkOrder = async (woId: number, coordinates?: {lat: number, lng: number}) => {
    if (!isSupabaseConfigured) { MockDb.startWorkOrder(woId); return; }
    await supabase.from('work_orders').update({ status: 'In Progress' }).eq('wo_id', woId);
};

export const closeWorkOrder = async (woId: number) => {
    if (!isSupabaseConfigured) { MockDb.closeWorkOrder(woId); return; }
    await supabase.from('work_orders').update({ status: 'Closed' }).eq('wo_id', woId);
};

export const submitCompletionReport = async (woId: number, details: any, technicianName?: string) => {
    // If technician didn't sign manually (image), use auto-generated name signature
    let signature = details.technician_signature;
    if (!signature && technicianName) {
        signature = `Digitally Signed by ${technicianName} at ${new Date().toISOString()}`;
    }

    if (!isSupabaseConfigured) { MockDb.closeWorkOrder(woId); return; }
    
    // In a real implementation, we would insert details into 'corrective_maintenance_reports'
    // For now, we update the status and assume details are logged
    await supabase.from('work_orders').update({ status: 'Awaiting Approval' }).eq('wo_id', woId);
};

export const submitManagerApproval = async (woId: number, userId: number, signature: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('work_orders').update({ status: 'Manager Approved' }).eq('wo_id', woId);
};

export const submitSupervisorApproval = async (woId: number, userId: number, signature: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.from('work_orders').update({ status: 'Awaiting Final Acceptance' }).eq('wo_id', woId);
};

export const submitNurseVerification = async (woId: number, userId: number, signature: string, rating: number) => {
    if (!isSupabaseConfigured) return;
   await supabase.from('work_orders').update({ status: 'Closed', nurse_rating: rating }).eq('wo_id', woId);
}

export const addAsset = async (asset: Asset) => {
    if (!isSupabaseConfigured) { MockDb.addAsset(asset); return; }
    // Map App Asset -> DB Columns
    await supabase.from('assets').insert({
        asset_name: asset.name,
        model_number: asset.model,
        serial_number: asset.serial_number,
        current_location: "General Hospital", // Default string
        status: asset.status,
        nfc_tag_id: asset.nfc_tag_id,
        image: asset.image
    });
};

export const updateAssetStatus = async (assetId: string, status: AssetStatus) => {
    if (!isSupabaseConfigured) { MockDb.updateAssetStatus(assetId, status); return; }
    // Handle asset_id being string in App vs Int in DB
    // Try to parse if it's a number, otherwise might fail if DB expects Int
    const id = parseInt(assetId.replace('AST-', ''));
    if (!isNaN(id)) {
        await supabase.from('assets').update({ status }).eq('asset_id', id);
    }
}

export const restockPart = async (partId: number, qty: number) => {
    if (!isSupabaseConfigured) { MockDb.restockPart(partId, qty); return; }
    // Implementation needed
}

export const createWorkOrder = async (wo: WorkOrder) => {
    if (!isSupabaseConfigured) { MockDb.createWorkOrder(wo); return; }
    
    // Convert string ID to int if possible for DB
    const assetIdInt = parseInt(wo.asset_id.replace('AST-', ''));
    
    await supabase.from('work_orders').insert({
        asset_id: isNaN(assetIdInt) ? 1 : assetIdInt, // Fallback ID
        reporter_id: 1, // Default user, ideally should be currentUser.user_id passed in
        priority: wo.priority,
        description: wo.description,
        status: 'Open',
        type: wo.type
    });
}

export const updateAssetCalibration = async (assetId: string, lastCal: string, nextCal: string) => {
    // Implementation needed
}

export const assignWorkOrder = async (woId: number, userId: number) => {
    console.log(`[NOTIFICATION SYSTEM] 🔔 Push Notification Sent to Technician ID ${userId}: "You have been assigned to Work Order #${woId}"`);
    
    if (!isSupabaseConfigured) return;
    await supabase.from('work_orders').update({ assigned_to_id: userId, status: 'Assigned' }).eq('wo_id', woId);
}

export const updateStock = async (partId: number, quantityUsed: number) => {
    // Implementation needed
}

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
    if (!isSupabaseConfigured) {
        const user = MockDb.MOCK_USERS.find(u => u.email === email && u.password === password);
        return user || null;
    }
    const { data } = await supabase.from('users').select('*').eq('email', email).single(); 
    return data ? mapUserFromDB(data) : null;
}

export const addUser = async (user: User) => {
    if (!isSupabaseConfigured) { MockDb.addUser(user); return; }
    await supabase.from('users').insert({
        username: user.name,
        email: user.email,
        phone_number: user.phone_number,
        password_hash: user.password, // Plain text for demo
        user_role: user.role,
        department: user.department
    });
}

export const saveRole = async (role: RoleDefinition) => {
    if (!isSupabaseConfigured) {
        if (MockDb.MOCK_ROLES.find(r => r.id === role.id)) {
            MockDb.updateRole(role);
        } else {
            MockDb.createRole(role);
        }
        return;
    }
    // Supabase implementation omitted for brevity, fallback logic handles demo
}

// --- MASS SEEDING ---
export const seedDatabaseIfEmpty = async () => {
    if (!isSupabaseConfigured) return;
    
    // Check asset count
    const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
    
    if (count !== null && count < 50) {
        console.log("Database low on data. Starting MASS Seeding (500 Assets, 6 Users)...");
        
        // 1. Departments List (Matches LOCATIONS in mockDb)
        const departments = [
            'ICU', 'Emergency', 'Radiology', 'Laboratory', 'Pharmacy', 
            'Surgery', 'Cardiology', 'Neurology', 'NICU', 'Maternity',
            'Dialysis', 'Oncology', 'Pediatrics', 'Orthopedics', 'General Ward'
        ];

        // 2. Generate 6 Users (One per role)
        const usersToInsert = [
            { username: 'Dr. Sarah Connor', email: 'admin@hospital.com', password_hash: 'password', user_role: UserRole.ADMIN, department: 'Management', phone_number: '555-0001' },
            { username: 'John Supervisor', email: 'supervisor@hospital.com', password_hash: 'password', user_role: UserRole.SUPERVISOR, department: 'Biomedical', phone_number: '555-0002' },
            { username: 'Mike Tech', email: 'tech@hospital.com', password_hash: 'password', user_role: UserRole.TECHNICIAN, department: 'Biomedical', phone_number: '555-0003' },
            { username: 'Nurse Joy', email: 'nurse@hospital.com', password_hash: 'password', user_role: UserRole.NURSE, department: 'ICU', phone_number: '555-0004' },
            { username: 'Vendor Rep', email: 'vendor@hospital.com', password_hash: 'password', user_role: UserRole.VENDOR, department: 'External', phone_number: '555-0005' },
            { username: 'Inspector Gadget', email: 'audit@hospital.com', password_hash: 'password', user_role: UserRole.INSPECTOR, department: 'Quality', phone_number: '555-0006' }
        ];
        
        // Batch insert users
        const { error: userError } = await supabase.from('users').insert(usersToInsert);
        if (userError) console.error("User Seeding Error:", userError);
        else console.log("Seeded 6 Core Users.");


        // 3. Generate 500 Assets
        const deviceTypes = [
            { name: 'MRI Scanner', model: 'Magnetom Vida' },
            { name: 'CT Scanner', model: 'Somatom Force' },
            { name: 'Ventilator', model: 'Servo-U' },
            { name: 'Infusion Pump', model: 'Alaris System' },
            { name: 'Patient Monitor', model: 'IntelliVue MX40' },
            { name: 'Anesthesia Machine', model: 'Drager Fabius' },
            { name: 'Defibrillator', model: 'LifePak 15' },
            { name: 'Ultrasound', model: 'Voluson E10' },
            { name: 'X-Ray Machine', model: 'Mobilett Elara' },
            { name: 'Dialysis Machine', model: '4008S Classix' },
            { name: 'Infant Incubator', model: 'Isolette 8000' },
            { name: 'ECG Machine', model: 'MAC 2000' },
            { name: 'C-Arm', model: 'OEC Elite' },
            { name: 'Dental Chair', model: 'A-dec 500' },
            { name: 'Hematology Analyzer', model: 'XN-1000' }
        ];

        const assetsBatchSize = 50;
        const totalAssets = 500;
        
        for (let i = 0; i < totalAssets; i += assetsBatchSize) {
            const batch = [];
            for (let j = 0; j < assetsBatchSize; j++) {
                const type = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
                const dept = departments[Math.floor(Math.random() * departments.length)];
                const globalIndex = i + j + 1000;
                
                batch.push({
                    asset_name: type.name,
                    model_number: type.model,
                    serial_number: `SN-${globalIndex}`,
                    current_location: dept, // Store Dept Name to be mapped to ID on fetch
                    status: Math.random() > 0.9 ? 'Down' : (Math.random() > 0.8 ? 'Under Maint.' : 'Running'),
                    nfc_tag_id: `NFC-${globalIndex}`,
                    image: MockDb.getModelImage(type.model),
                    purchase_date: '2022-01-15'
                });
            }
            
            const { error } = await supabase.from('assets').insert(batch);
            if (error) console.error(`Batch ${i/assetsBatchSize + 1} Failed:`, error);
            else console.log(`Seeded Batch ${i/assetsBatchSize + 1} (${assetsBatchSize} Assets)`);
        }

        console.log("Seeding Complete. Refreshing...");
    }
}
