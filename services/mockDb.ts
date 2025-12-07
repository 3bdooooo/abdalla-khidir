
import { Asset, AssetStatus, User, UserRole, WorkOrder, WorkOrderType, Priority, InventoryPart, Location, AssetDocument, MovementLog, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, RoleDefinition, Resource, Action } from '../types';

// DEVICE IMAGES MAPPING (High Resolution, Realistic Medical Equipment)
export const DEVICE_IMAGES: Record<string, string> = {
    // MRI & Imaging
    'Magnetom Vida': 'https://images.unsplash.com/photo-1516549655169-df83a063b36c?auto=format&fit=crop&w=800&q=80', // MRI Tunnel
    'Somatom Force': 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=800&q=80', // CT Scanner
    'Mobilett Elara': 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80', // Portable X-Ray
    'OEC Elite': 'https://images.unsplash.com/photo-1612268615927-4a0fb773323a?auto=format&fit=crop&w=800&q=80', // C-Arm (Surgical)
    'Voluson E10': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', // Ultrasound Console

    // Life Support & Anesthesia
    'Servo-U': 'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?auto=format&fit=crop&w=800&q=80', // Ventilator
    'Drager Fabius': 'https://images.unsplash.com/photo-1516574187841-693083f0498c?auto=format&fit=crop&w=800&q=80', // Anesthesia Workstation
    'Isolette 8000': 'https://plus.unsplash.com/premium_photo-1661573537877-33a57df35649?auto=format&fit=crop&w=800&q=80', // Incubator

    // Monitoring & Defib
    'IntelliVue MX40': 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80', // Patient Monitor
    'LifePak 15': 'https://plus.unsplash.com/premium_photo-1681487814233-a3df46932473?auto=format&fit=crop&w=800&q=80', // Defibrillator
    'MAC 2000': 'https://images.unsplash.com/photo-1584036561566-b93a901e3ae6?auto=format&fit=crop&w=800&q=80', // ECG Machine
    'Avalon FM30': 'https://images.unsplash.com/photo-1583912268237-7756f772ba63?auto=format&fit=crop&w=800&q=80', // Fetal Monitor

    // Pumps & Dialysis
    'Alaris System': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80', // Infusion Pump Stack
    '4008S Classix': 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?auto=format&fit=crop&w=800&q=80', // Dialysis Machine

    // Lab & Sterilization
    'XN-1000': 'https://images.unsplash.com/photo-1579154204628-245fc0fb6612?auto=format&fit=crop&w=800&q=80', // Lab Analyzer
    'Steris AMSCO': 'https://images.unsplash.com/photo-1581093588401-fbb07366f955?auto=format&fit=crop&w=800&q=80', // Autoclave/Sterilizer
    
    // Other
    'A-dec 500': 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80', // Dental Chair
    'Evis X1': 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=800&q=80', // Endoscopy Tower

    // Fallbacks
    'Generic': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' // Modern Med Background
};

export const getModelImage = (model: string): string => {
    if (!model) return DEVICE_IMAGES['Generic'];
    const m = model.trim();
    if (DEVICE_IMAGES[m]) return DEVICE_IMAGES[m];
    const lowerM = m.toLowerCase();
    
    if (lowerM.includes('magnetom') || lowerM.includes('mri')) return DEVICE_IMAGES['Magnetom Vida'];
    if (lowerM.includes('somatom') || lowerM.includes('ct ')) return DEVICE_IMAGES['Somatom Force'];
    if (lowerM.includes('servo') || lowerM.includes('ventilator')) return DEVICE_IMAGES['Servo-U'];
    if (lowerM.includes('alaris') || lowerM.includes('pump') || lowerM.includes('infusion')) return DEVICE_IMAGES['Alaris System'];
    if (lowerM.includes('mx40') || lowerM.includes('intellivue') || lowerM.includes('monitor')) return DEVICE_IMAGES['IntelliVue MX40'];
    if (lowerM.includes('drager') || lowerM.includes('fabius') || lowerM.includes('anesthesia')) return DEVICE_IMAGES['Drager Fabius'];
    if (lowerM.includes('lifepak') || lowerM.includes('defib')) return DEVICE_IMAGES['LifePak 15'];
    if (lowerM.includes('voluson') || lowerM.includes('ultrasound') || lowerM.includes('echo')) return DEVICE_IMAGES['Voluson E10'];
    if (lowerM.includes('mobilett') || lowerM.includes('x-ray')) return DEVICE_IMAGES['Mobilett Elara'];
    if (lowerM.includes('4008') || lowerM.includes('dialysis')) return DEVICE_IMAGES['4008S Classix'];
    if (lowerM.includes('isolette') || lowerM.includes('incubator') || lowerM.includes('warmer')) return DEVICE_IMAGES['Isolette 8000'];
    if (lowerM.includes('mac') || lowerM.includes('ecg') || lowerM.includes('ekg')) return DEVICE_IMAGES['MAC 2000'];
    if (lowerM.includes('oec') || lowerM.includes('c-arm') || lowerM.includes('fluoroscopy')) return DEVICE_IMAGES['OEC Elite'];
    if (lowerM.includes('evis') || lowerM.includes('endoscop')) return DEVICE_IMAGES['Evis X1'];
    if (lowerM.includes('steris') || lowerM.includes('autoclave') || lowerM.includes('sterilizer')) return DEVICE_IMAGES['Steris AMSCO'];
    if (lowerM.includes('xn') || lowerM.includes('hematology') || lowerM.includes('analyzer')) return DEVICE_IMAGES['XN-1000'];
    if (lowerM.includes('dec') || lowerM.includes('dental')) return DEVICE_IMAGES['A-dec 500'];
    if (lowerM.includes('avalon') || lowerM.includes('fetal')) return DEVICE_IMAGES['Avalon FM30'];
    
    return DEVICE_IMAGES['Generic'];
};

export const LOCATIONS: Location[] = [
  { location_id: 101, name: 'ICU Bed 1', department: 'ICU', building: 'Main Wing', room: '101' },
  { location_id: 102, name: 'ICU Bed 2', department: 'ICU', building: 'Main Wing', room: '102' },
  { location_id: 201, name: 'X-Ray Room', department: 'Radiology', building: 'East Wing', room: 'R1' },
  { location_id: 202, name: 'MRI Suite', department: 'Radiology', building: 'East Wing', room: 'R2' },
  { location_id: 301, name: 'Triage 1', department: 'Emergency', building: 'Main Wing', room: 'E1' },
  { location_id: 302, name: 'Trauma Bay', department: 'Emergency', building: 'Main Wing', room: 'E2' },
  { location_id: 401, name: 'Hematology Lab', department: 'Laboratory', building: 'North Wing', room: 'L1' },
  { location_id: 402, name: 'Microbiology', department: 'Laboratory', building: 'North Wing', room: 'L2' },
  { location_id: 501, name: 'Dispensing', department: 'Pharmacy', building: 'Main Wing', room: 'P1' },
  { location_id: 601, name: 'OR 1 (General)', department: 'Surgery', building: 'West Wing', room: 'OR1' },
  { location_id: 602, name: 'OR 2 (Neuro)', department: 'Surgery', building: 'West Wing', room: 'OR2' },
  { location_id: 701, name: 'Cath Lab', department: 'Cardiology', building: 'East Wing', room: 'C1' },
  { location_id: 801, name: 'Stroke Unit', department: 'Neurology', building: 'North Wing', room: 'N1' },
  { location_id: 901, name: 'NICU A', department: 'NICU', building: 'Maternity Wing', room: 'NI1' },
  { location_id: 1001, name: 'Delivery Room', department: 'Maternity', building: 'Maternity Wing', room: 'M1' },
  { location_id: 1101, name: 'Dialysis Stn 1', department: 'Dialysis', building: 'South Wing', room: 'D1' },
  { location_id: 1201, name: 'Chemo Bay', department: 'Oncology', building: 'South Wing', room: 'O1' },
  { location_id: 1301, name: 'Pediatric Ward', department: 'Pediatrics', building: 'Main Wing', room: 'PD1' },
  { location_id: 1401, name: 'Rehab Gym', department: 'Orthopedics', building: 'East Wing', room: 'OT1' },
  { location_id: 1501, name: 'General Ward A', department: 'General Ward', building: 'Main Wing', room: 'G1' },
  { location_id: 1601, name: 'Sterile Processing', department: 'CSSD', building: 'Basement', room: 'S1' },
  { location_id: 1701, name: 'Dental Clinic', department: 'Dental', building: 'Outpatient', room: 'DC1' },
  { location_id: 1801, name: 'ENT Exam Room', department: 'ENT', building: 'Outpatient', room: 'ENT1' },
];

export const MOCK_USERS: User[] = [
  { user_id: 1, name: 'Dr. Sarah Connor', role: UserRole.ADMIN, email: 'admin@hospital.com', password: 'password', location_id: 101, department: 'Management', phone_number: '555-0001' },
  { user_id: 2, name: 'John Supervisor', role: UserRole.SUPERVISOR, email: 'supervisor@hospital.com', password: 'password', location_id: 101, department: 'Biomedical', phone_number: '555-0002' },
  { user_id: 3, name: 'Mike Tech', role: UserRole.TECHNICIAN, email: 'tech@hospital.com', password: 'password', location_id: 101, department: 'Biomedical', phone_number: '555-0003' },
  { user_id: 4, name: 'Nurse Joy', role: UserRole.NURSE, email: 'nurse@hospital.com', password: 'password', location_id: 101, department: 'ICU', phone_number: '555-0004' },
  { user_id: 5, name: 'Vendor Rep', role: UserRole.VENDOR, email: 'vendor@hospital.com', password: 'password', location_id: 101, department: 'External', phone_number: '555-0005' },
  { user_id: 6, name: 'Inspector Gadget', role: UserRole.INSPECTOR, email: 'audit@hospital.com', password: 'password', location_id: 101, department: 'Quality & Compliance', phone_number: '555-0006' },
];

// GENERATE 45 MORE USERS
const extraRoles = [UserRole.NURSE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.NURSE, UserRole.NURSE];
const firstNames = ["Ahmed", "Mohamed", "Fatima", "Ali", "Sara", "Omar", "Layla", "Khalid", "Noura", "Hassan", "Aisha", "Yousef", "Mariam", "Ibrahim"];
const lastNames = ["Al-Sayed", "Khan", "Smith", "Johnson", "Al-Harbi", "Nasser", "Othman", "Kamal", "Fawzi", "Salim"];

for (let i = 7; i <= 50; i++) {
    const role = extraRoles[i % extraRoles.length];
    const fname = firstNames[i % firstNames.length];
    const lname = lastNames[i % lastNames.length];
    const dept = LOCATIONS[i % LOCATIONS.length].department;
    
    MOCK_USERS.push({
        user_id: i,
        name: `${fname} ${lname} ${i}`,
        role: role,
        email: `${role.toLowerCase()}${i}@hospital.com`,
        password: 'password',
        location_id: 101,
        department: dept,
        phone_number: `555-0${100+i}`
    });
}

// RBAC DEFINITIONS
export const MOCK_ROLES: RoleDefinition[] = [
    {
        id: '1',
        name: 'Admin',
        description: 'Full System Access',
        is_system_role: true,
        permissions: { assets: ['view', 'create', 'edit', 'delete'], work_orders: ['view', 'create', 'edit', 'delete'], inventory: ['view', 'create', 'edit', 'delete'], reports: ['view', 'create', 'edit', 'delete'], users: ['view', 'create', 'edit', 'delete'], settings: ['view', 'create', 'edit', 'delete'] }
    },
    {
        id: '2',
        name: 'Supervisor',
        description: 'Department & Team Management',
        is_system_role: true,
        permissions: { assets: ['view', 'create', 'edit'], work_orders: ['view', 'create', 'edit', 'delete'], inventory: ['view', 'create', 'edit'], reports: ['view', 'create'], users: ['view', 'create', 'edit'], settings: ['view'] }
    },
    {
        id: '3',
        name: 'Technician',
        description: 'Assigned Task Execution',
        is_system_role: true,
        permissions: { assets: ['view'], work_orders: ['view', 'edit'], inventory: ['view'], reports: [], users: [], settings: [] }
    },
    {
        id: '4',
        name: 'Nurse',
        description: 'Fault Reporting & Verification',
        is_system_role: true,
        permissions: { assets: ['view'], work_orders: ['view', 'create'], inventory: [], reports: [], users: [], settings: [] }
    },
    {
        id: '5',
        name: 'Vendor',
        description: 'External Repair Access',
        is_system_role: true,
        permissions: { assets: ['view'], work_orders: ['view', 'edit'], inventory: [], reports: [], users: [], settings: [] }
    },
    {
        id: '6',
        name: 'Inspector',
        description: 'Compliance & History Review (Read-Only)',
        is_system_role: true,
        permissions: { assets: ['view'], work_orders: ['view'], inventory: ['view'], reports: ['view'], users: ['view'], settings: ['view'] }
    }
];

// --- VENDOR & ASSET GENERATION ---

// 1. Define Vendors with Performance Profiles
const VENDORS = [
    { name: 'GE Healthcare', reliability: 0.95, speed: 1.2 }, // Very reliable, Fast support
    { name: 'Siemens Healthineers', reliability: 0.94, speed: 1.1 },
    { name: 'Philips Medical', reliability: 0.92, speed: 1.0 },
    { name: 'Drager', reliability: 0.96, speed: 0.9 }, // High reliability, slightly slower
    { name: 'Mindray', reliability: 0.85, speed: 1.1 }, // Good speed, lower reliability
    { name: 'Getinge', reliability: 0.90, speed: 1.0 },
    { name: 'Stryker', reliability: 0.93, speed: 1.3 },
    { name: 'Olympus', reliability: 0.91, speed: 0.8 },
    { name: 'Nihon Kohden', reliability: 0.88, speed: 0.9 },
    { name: 'Baxter', reliability: 0.89, speed: 1.0 }
];

let assets: Asset[] = [];
// Generate 500 Assets
for (let i = 1; i <= 500; i++) {
    const type = Object.keys(DEVICE_IMAGES)[i % (Object.keys(DEVICE_IMAGES).length - 1)]; // Skip 'Generic'
    const model = type; 
    const loc = LOCATIONS[i % LOCATIONS.length];
    
    // Realistic Dates
    const currentYear = new Date().getFullYear();
    const manufactureYear = currentYear - (i % 10) - 1; // 1-10 years old
    const purchaseYear = manufactureYear + (Math.random() > 0.5 ? 0 : 1);
    const installYear = purchaseYear;
    
    const manufDate = `${manufactureYear}-${(i % 12) + 1}-15`;
    const purchDate = `${purchaseYear}-${(i % 12) + 1}-20`;
    const instDate = `${installYear}-${(i % 12) + 1}-25`;
    const warrantyExp = `${installYear + 3}-${(i % 12) + 1}-25`; // 3 Year Warranty default

    // Assign Vendor based on Model or Randomly distributed
    let vendor = VENDORS[i % VENDORS.length].name;
    if (model.includes('Magnetom') || model.includes('Somatom')) vendor = 'Siemens Healthineers';
    else if (model.includes('IntelliVue') || model.includes('EPIQ')) vendor = 'Philips Medical';
    else if (model.includes('Drager') || model.includes('Fabius')) vendor = 'Drager';
    else if (model.includes('GE') || model.includes('Voluson')) vendor = 'GE Healthcare';

    assets.push({
        asset_id: `AST-${1000 + i}`,
        nfc_tag_id: `NFC-${1000 + i}`,
        name: type.includes('Scanner') ? type : `${type}`,
        model: model,
        manufacturer: vendor,
        serial_number: `SN-${10000 + i}`,
        location_id: loc.location_id,
        status: i % 20 === 0 ? AssetStatus.DOWN : (i % 15 === 0 ? AssetStatus.UNDER_MAINT : AssetStatus.RUNNING),
        
        // NEW DATE FIELDS
        manufacturing_date: manufDate,
        purchase_date: purchDate,
        installation_date: instDate,
        warranty_expiration: warrantyExp,
        expected_lifespan: 10,

        operating_hours: Math.floor(Math.random() * 20000),
        risk_score: Math.floor(Math.random() * 100),
        last_calibration_date: `${currentYear}-05-01`,
        next_calibration_date: `${currentYear+1}-05-01`,
        image: getModelImage(model),
        purchase_cost: 5000 + (Math.random() * 50000),
        accumulated_maintenance_cost: 500 + (Math.random() * 5000)
    });
}

// INVENTORY GENERATION
let inventory: InventoryPart[] = [
    { part_id: 1, part_name: 'MRI Coil', current_stock: 3, min_reorder_level: 2, cost: 5000 },
    { part_id: 2, part_name: 'Ventilator Filter', current_stock: 45, min_reorder_level: 20, cost: 25 },
];
for (let i = 16; i <= 100; i++) {
    inventory.push({
        part_id: i,
        part_name: `Generic Spare Part #${i}`,
        current_stock: Math.floor(Math.random() * 50),
        min_reorder_level: 10,
        cost: Math.floor(Math.random() * 500)
    });
}

// WORK ORDER GENERATION WITH BIAS
let workOrders: WorkOrder[] = [];
for (let i = 1; i <= 200; i++) {
    const asset = assets[i % assets.length];
    const tech = MOCK_USERS.find(u => u.role === UserRole.TECHNICIAN) || MOCK_USERS[2];
    const isClosed = i > 20; 
    let type = i % 3 === 0 ? WorkOrderType.PREVENTIVE : WorkOrderType.CORRECTIVE;
    
    // VENDOR BIAS LOGIC
    const vendorProfile = VENDORS.find(v => v.name === asset.manufacturer);
    if (vendorProfile && type === WorkOrderType.CORRECTIVE) {
        if (Math.random() > vendorProfile.reliability) { 
            // Keep Corrective
        } else {
            // Flip to Preventive to simulate reliability (less breakdowns)
            if (Math.random() > 0.5) type = WorkOrderType.PREVENTIVE; 
        }
    }

    const baseDurationHours = 4;
    const speedFactor = vendorProfile ? vendorProfile.speed : 1.0;
    const actualDuration = baseDurationHours / speedFactor + (Math.random() * 2);
    
    const startTime = new Date('2023-10-01T09:00:00Z');
    const closeTime = new Date(startTime.getTime() + actualDuration * 60 * 60 * 1000);

    const rand = Math.random();
    let failureType: 'Technical' | 'UserError' | 'WearTear' = 'Technical';
    if (type === WorkOrderType.CORRECTIVE) {
        if (rand > 0.7) failureType = 'UserError';
        else if (rand > 0.5) failureType = 'WearTear';
    }

    workOrders.push({
        wo_id: 1000 + i,
        asset_id: asset.asset_id,
        type: type,
        priority: i % 10 === 0 ? Priority.CRITICAL : (i % 5 === 0 ? Priority.HIGH : Priority.MEDIUM),
        assigned_to_id: tech.user_id,
        description: type === WorkOrderType.PREVENTIVE ? `Scheduled PM for ${asset.name}` : `Reported fault in ${asset.name}`,
        status: isClosed ? 'Closed' : (i % 2 === 0 ? 'In Progress' : 'Open'),
        start_time: startTime.toISOString(),
        close_time: isClosed ? closeTime.toISOString() : undefined,
        created_at: '2023-09-25T08:00:00Z',
        is_first_time_fix: Math.random() > 0.3,
        nurse_rating: isClosed ? Math.floor(Math.random() * 2) + 3 : undefined,
        failure_type: failureType
    });
}

// --- DYNAMIC DOCUMENT GENERATION (100 DOCS) ---
let kbDocs: any[] = [];
const docTypes = ['Service Manual', 'User Guide', 'Calibration Protocol', 'Safety Datasheet'];
const docCategories = ['Imaging', 'Life Support', 'Monitoring', 'General'];

for (let i = 1; i <= 100; i++) {
    const asset = assets[i % assets.length];
    const docType = docTypes[i % docTypes.length];
    const category = docCategories[i % docCategories.length];
    
    kbDocs.push({
        id: i,
        title: `${asset.manufacturer} ${asset.model} - ${docType}`,
        category: category,
        type: docType,
        updated: `2023-${(i % 12) + 1}-15`,
        fileSize: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
        url: '#'
    });
}

// Exports
export const getAssets = () => assets;
export const getInventory = () => inventory;
export const getWorkOrders = () => workOrders;
export const getLocations = () => LOCATIONS;
export const getUsers = () => MOCK_USERS;
export const getRoles = () => MOCK_ROLES;

export const getLocationName = (id: number) => {
  const loc = LOCATIONS.find(l => l.location_id === id);
  return loc ? `${loc.building} - ${loc.department} (${loc.room})` : 'Unknown';
};

export const getTechnicianWorkOrders = (userId: number) => {
  return workOrders.filter(wo => wo.assigned_to_id === userId);
};

export const getAssetDocuments = (assetId: string): AssetDocument[] => {
  const asset = assets.find(a => a.asset_id === assetId);
  const model = asset?.model || 'Generic';
  return [
    { doc_id: 1, asset_id: assetId, title: `${model} Service Manual v2.0`, type: 'Manual', url: '#', date: '2021-01-01' },
    { doc_id: 2, asset_id: assetId, title: 'Calibration Cert 2023', type: 'Certificate', url: '#', date: '2023-01-15' },
    { doc_id: 3, asset_id: assetId, title: 'Maintenance Log 2023', type: 'Report', url: '#', date: '2023-12-01' },
  ];
};

export const findRelevantDocuments = (model: string, manufacturer: string): AssetDocument[] => {
    // Search in the large generated list
    const matches = kbDocs.filter(d => 
        d.title.toLowerCase().includes(model.toLowerCase()) || 
        d.title.toLowerCase().includes(manufacturer.toLowerCase())
    );
    
    return matches.map((d, idx) => ({
        doc_id: 1000 + idx,
        asset_id: '',
        title: d.title,
        type: 'Manual' as const,
        url: '#',
        date: d.updated
    })).slice(0, 3);
};

export const getMovementLogs = (): MovementLog[] => [
    { log_id: 1, asset_id: 'AST-1002', from_location_id: 101, to_location_id: 201, timestamp: '2023-10-25T10:00:00', user_id: 3 }
];

export const getDetailedReports = (): DetailedJobOrderReport[] => [
    {
        job_order_no: 2236,
        report_id: "RPT-2023-089",
        control_no: "CN-7782",
        priority: "High",
        risk_factor: "Critical",
        asset: {
            name: "Ventilator Servo-U",
            model: "Servo-U",
            manufacturer: "Getinge",
            serial_no: "SN-112233",
            asset_id: "AST-1002"
        },
        location: {
            site: "Main Hospital",
            building: "Main Wing",
            department: "ICU",
            room: "101"
        },
        fault_details: {
            failed_date: "2023-10-24",
            fault_description: "Unit failed self-test. Error code E045 (Flow Sensor).",
            repair_date: "2023-10-25",
            technician_name: "Mike Tech",
            remedy_work_done: "Replaced flow sensor cassette. Calibrated flow offset. Performed full functionality test."
        },
        spare_parts: [
            { part_name: "Flow Sensor Cassette", part_no: "GT-9988", quantity: 1 }
        ],
        qc_analysis: {
            need_spare_parts: "Yes",
            need_calibration: true,
            user_errors: false,
            unrepairable: false,
            agent_repair: false,
            partially_working: false,
            incident: true
        },
        approvals: {
            caller: { name: "Nurse Joy", contact: "Ext 101" },
            dept_head: { name: "Dr. House", date: "2023-10-25" },
            site_supervisor: { name: "John Supervisor", date: "2023-10-25" },
            site_admin: { name: "Sarah Connor", date: "2023-10-26" }
        }
    }
];

export const getPMReports = (): PreventiveMaintenanceReport[] => [];

export const getSystemAlerts = (): SystemAlert[] => [
    { id: 1, type: 'BOUNDARY_CROSSING', message: 'Asset AST-1002 (Ventilator) moved out of ICU without authorization.', timestamp: '2023-10-26T14:30:00Z', asset_id: 'AST-1002', severity: 'high', status: 'active' },
    { id: 2, type: 'STOCK', message: 'Low stock for "Power Supply Unit" (2 remaining).', timestamp: '2023-10-25T09:00:00Z', severity: 'medium', status: 'active' }
];

export const getKnowledgeBaseDocs = () => kbDocs;

// Mutators (Mock DB Actions)
export const startWorkOrder = (woId: number) => {
  workOrders = workOrders.map(w => w.wo_id === woId ? { ...w, status: 'In Progress', start_time: new Date().toISOString() } : w);
};

export const closeWorkOrder = (woId: number) => {
  workOrders = workOrders.map(w => w.wo_id === woId ? { ...w, status: 'Awaiting Approval', close_time: new Date().toISOString() } : w);
};

export const updateStock = (partId: number, quantityUsed: number) => {
  inventory = inventory.map(i => i.part_id === partId ? { ...i, current_stock: i.current_stock - quantityUsed } : i);
};

export const addAsset = (asset: Asset) => {
  assets.push(asset);
};

export const updateAssetStatus = (assetId: string, status: AssetStatus) => {
  assets = assets.map(a => a.asset_id === assetId ? { ...a, status } : a);
};

export const restockPart = (partId: number, qty: number) => {
  inventory = inventory.map(i => i.part_id === partId ? { ...i, current_stock: i.current_stock + qty } : i);
};

export const createWorkOrder = (wo: WorkOrder) => {
  workOrders.push(wo);
};

export const updateAssetCalibration = (assetId: string, lastCal: string, nextCal: string) => {
  assets = assets.map(a => a.asset_id === assetId ? { ...a, last_calibration_date: lastCal, next_calibration_date: nextCal } : a);
};

export const assignWorkOrder = (woId: number, userId: number) => {
  workOrders = workOrders.map(w => w.wo_id === woId ? { ...w, assigned_to_id: userId, status: 'Assigned' } : w);
};

export const addUser = (user: User) => {
  MOCK_USERS.push(user);
};

export const nurseRateWorkOrder = (woId: number, rating: number) => {
    workOrders = workOrders.map(w => w.wo_id === woId ? { ...w, nurse_rating: rating } : w);
};

// ROLE MUTATORS
export const createRole = (role: RoleDefinition) => {
    MOCK_ROLES.push(role);
};

export const updateRole = (updatedRole: RoleDefinition) => {
    const idx = MOCK_ROLES.findIndex(r => r.id === updatedRole.id);
    if (idx !== -1) {
        MOCK_ROLES[idx] = updatedRole;
    }
};
