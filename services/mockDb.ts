
import { Asset, AssetStatus, User, UserRole, WorkOrder, WorkOrderType, Priority, InventoryPart, Location, AssetDocument, MovementLog, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert } from '../types';

// Real Medical Device Images Mapping
export const DEVICE_IMAGES: Record<string, string> = {
    // Exact Models
    'Magnetom Vida': 'https://images.unsplash.com/photo-1516549655169-df83a063b36c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // MRI
    'Somatom Force': 'https://plus.unsplash.com/premium_photo-1661281350976-59b9514e5364?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // CT (Radiology)
    'Servo-U': 'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Ventilator
    'Alaris System': 'https://plus.unsplash.com/premium_photo-1661281397737-9b5d75b52beb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Pump
    'IntelliVue MX40': 'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Monitor
    'Drager Fabius': 'https://images.unsplash.com/photo-1516574187841-693083f0498c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Anesthesia
    'LifePak 15': 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Defib
    'Voluson E10': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Ultrasound
    'Mobilett Elara': 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Mobile X-Ray
    '4008S Classix': 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Dialysis
    'Isolette 8000': 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Incubator
    'MAC 2000': 'https://images.unsplash.com/photo-1584036561566-b93a901e3ae6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // ECG
    'OEC Elite': 'https://plus.unsplash.com/premium_photo-1661281350976-59b9514e5364?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // C-Arm
    'Evis X1': 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Endoscope
    'Steris AMSCO': 'https://images.unsplash.com/photo-1581093588401-fbb07366f955?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Autoclave
    'XN-1000': 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Analyzer
    'A-dec 500': 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Dental
    'Avalon FM30': 'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', // Fetal Monitor

    // Fallbacks
    'MRI': 'https://images.unsplash.com/photo-1516549655169-df83a063b36c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'Ventilator': 'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'Monitor': 'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'Generic': 'https://images.unsplash.com/photo-1584036561566-b93a901e3ae6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
};

export const getModelImage = (model: string): string => {
    if (!model) return DEVICE_IMAGES['Generic'];
    const m = model.trim();
    
    // 1. Exact Match
    if (DEVICE_IMAGES[m]) return DEVICE_IMAGES[m];

    // 2. Contains Match (Case Insensitive)
    const lowerM = m.toLowerCase();
    const keys = Object.keys(DEVICE_IMAGES);
    
    // Prioritize specific models first
    if (lowerM.includes('magnetom') || lowerM.includes('mri')) return DEVICE_IMAGES['Magnetom Vida'];
    if (lowerM.includes('somatom') || lowerM.includes('ct ')) return DEVICE_IMAGES['Somatom Force'];
    if (lowerM.includes('servo') || lowerM.includes('ventilator')) return DEVICE_IMAGES['Servo-U'];
    if (lowerM.includes('alaris') || lowerM.includes('pump')) return DEVICE_IMAGES['Alaris System'];
    if (lowerM.includes('mx40') || lowerM.includes('intellivue') || lowerM.includes('monitor')) return DEVICE_IMAGES['IntelliVue MX40'];
    if (lowerM.includes('drager') || lowerM.includes('fabius') || lowerM.includes('anesthesia')) return DEVICE_IMAGES['Drager Fabius'];
    if (lowerM.includes('lifepak') || lowerM.includes('defib')) return DEVICE_IMAGES['LifePak 15'];
    if (lowerM.includes('voluson') || lowerM.includes('ultrasound')) return DEVICE_IMAGES['Voluson E10'];
    if (lowerM.includes('mobilett') || lowerM.includes('x-ray')) return DEVICE_IMAGES['Mobilett Elara'];
    if (lowerM.includes('4008') || lowerM.includes('dialysis')) return DEVICE_IMAGES['4008S Classix'];
    if (lowerM.includes('isolette') || lowerM.includes('incubator')) return DEVICE_IMAGES['Isolette 8000'];
    if (lowerM.includes('mac 2000') || lowerM.includes('ecg')) return DEVICE_IMAGES['MAC 2000'];
    if (lowerM.includes('oec') || lowerM.includes('c-arm')) return DEVICE_IMAGES['OEC Elite'];
    if (lowerM.includes('evis') || lowerM.includes('endoscop')) return DEVICE_IMAGES['Evis X1'];
    if (lowerM.includes('steris') || lowerM.includes('autoclave')) return DEVICE_IMAGES['Steris AMSCO'];
    if (lowerM.includes('xn-1000') || lowerM.includes('hematology') || lowerM.includes('analyzer')) return DEVICE_IMAGES['XN-1000'];
    if (lowerM.includes('a-dec') || lowerM.includes('dental')) return DEVICE_IMAGES['A-dec 500'];
    
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
];

// GENERATE 45 MORE USERS (Total 50)
const extraRoles = [UserRole.NURSE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.NURSE, UserRole.NURSE];
const firstNames = ["Ahmed", "Mohamed", "Fatima", "Ali", "Sara", "Omar", "Layla", "Khalid", "Noura", "Hassan", "Aisha", "Yousef", "Mariam", "Ibrahim"];
const lastNames = ["Al-Sayed", "Khan", "Smith", "Johnson", "Al-Harbi", "Nasser", "Othman", "Kamal", "Fawzi", "Salim"];

for (let i = 6; i <= 50; i++) {
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

// GENERATE 500 ASSETS
const medicalDeviceTypes = [
    { name: 'MRI Scanner', model: 'Magnetom Vida', manufacturer: 'Siemens' },
    { name: 'CT Scanner', model: 'Somatom Force', manufacturer: 'Siemens' },
    { name: 'Ventilator', model: 'Servo-U', manufacturer: 'Getinge' },
    { name: 'Infusion Pump', model: 'Alaris System', manufacturer: 'BD' },
    { name: 'Patient Monitor', model: 'IntelliVue MX40', manufacturer: 'Philips' },
    { name: 'Anesthesia Machine', model: 'Drager Fabius', manufacturer: 'Drager' },
    { name: 'Defibrillator', model: 'LifePak 15', manufacturer: 'Stryker' },
    { name: 'Ultrasound', model: 'Voluson E10', manufacturer: 'GE Health' },
    { name: 'X-Ray Machine', model: 'Mobilett Elara', manufacturer: 'Siemens' },
    { name: 'Dialysis Machine', model: '4008S Classix', manufacturer: 'Fresenius' },
    { name: 'Incubator', model: 'Isolette 8000', manufacturer: 'Drager' },
    { name: 'ECG Machine', model: 'MAC 2000', manufacturer: 'GE Health' },
    { name: 'C-Arm', model: 'OEC Elite', manufacturer: 'GE Health' },
    { name: 'Endoscopy Tower', model: 'Evis X1', manufacturer: 'Olympus' },
    { name: 'Autoclave', model: 'Steris AMSCO', manufacturer: 'Steris' },
    { name: 'Hematology Analyzer', model: 'XN-1000', manufacturer: 'Sysmex' },
    { name: 'Dental Chair', model: 'A-dec 500', manufacturer: 'A-dec' },
    { name: 'Fetal Monitor', model: 'Avalon FM30', manufacturer: 'Philips' }
];

let assets: Asset[] = [];
// Generate 500
for (let i = 1; i <= 500; i++) {
    const type = medicalDeviceTypes[i % medicalDeviceTypes.length];
    const loc = LOCATIONS[i % LOCATIONS.length];
    const purchaseYear = 2015 + (i % 9); // 2015-2023
    
    assets.push({
        asset_id: `AST-${1000 + i}`,
        nfc_tag_id: `NFC-${1000 + i}`,
        name: type.name,
        model: type.model,
        manufacturer: type.manufacturer,
        serial_number: `SN-${10000 + i}`,
        location_id: loc.location_id,
        status: i % 20 === 0 ? AssetStatus.DOWN : (i % 15 === 0 ? AssetStatus.UNDER_MAINT : AssetStatus.RUNNING),
        purchase_date: `${purchaseYear}-01-15`,
        warranty_expiration: `${purchaseYear + 5}-01-15`,
        operating_hours: Math.floor(Math.random() * 20000),
        risk_score: Math.floor(Math.random() * 100),
        last_calibration_date: '2023-05-01',
        next_calibration_date: '2024-05-01',
        image: getModelImage(type.model),
        purchase_cost: 5000 + (Math.random() * 50000),
        accumulated_maintenance_cost: 500 + (Math.random() * 5000)
    });
}

// GENERATE INVENTORY
let inventory: InventoryPart[] = [
    { part_id: 1, part_name: 'MRI Coil', current_stock: 3, min_reorder_level: 2, cost: 5000 },
    { part_id: 2, part_name: 'Ventilator Filter', current_stock: 45, min_reorder_level: 20, cost: 25 },
    { part_id: 3, part_name: 'Infusion Set', current_stock: 12, min_reorder_level: 50, cost: 5 },
    { part_id: 4, part_name: 'ECG Leads', current_stock: 100, min_reorder_level: 30, cost: 15 },
    { part_id: 5, part_name: 'Power Supply Unit', current_stock: 2, min_reorder_level: 5, cost: 350 },
    { part_id: 6, part_name: 'Flow Sensor', current_stock: 10, min_reorder_level: 5, cost: 120 },
    { part_id: 7, part_name: 'O2 Sensor', current_stock: 15, min_reorder_level: 8, cost: 80 },
    { part_id: 8, part_name: 'SPO2 Probe', current_stock: 30, min_reorder_level: 10, cost: 45 },
    { part_id: 9, part_name: 'NIBP Cuff', current_stock: 50, min_reorder_level: 20, cost: 20 },
    { part_id: 10, part_name: 'X-Ray Tube', current_stock: 1, min_reorder_level: 1, cost: 15000 },
    { part_id: 11, part_name: 'Ultrasound Probe', current_stock: 2, min_reorder_level: 1, cost: 8000 },
    { part_id: 12, part_name: 'Defib Pads', current_stock: 200, min_reorder_level: 50, cost: 30 },
    { part_id: 13, part_name: 'Backup Battery', current_stock: 8, min_reorder_level: 5, cost: 150 },
    { part_id: 14, part_name: 'Thermal Paper', current_stock: 100, min_reorder_level: 20, cost: 5 },
    { part_id: 15, part_name: 'Autoclave Seal', current_stock: 5, min_reorder_level: 2, cost: 200 },
];
// Fill up to 100 generic parts
for (let i = 16; i <= 100; i++) {
    inventory.push({
        part_id: i,
        part_name: `Generic Spare Part #${i}`,
        current_stock: Math.floor(Math.random() * 50),
        min_reorder_level: 10,
        cost: Math.floor(Math.random() * 500)
    });
}

// GENERATE WORK ORDERS
let workOrders: WorkOrder[] = [];
// Generate 200 history WOs
for (let i = 1; i <= 200; i++) {
    const asset = assets[i % assets.length];
    const tech = MOCK_USERS.find(u => u.role === UserRole.TECHNICIAN) || MOCK_USERS[2];
    const isClosed = i > 20; // Most are closed
    const type = i % 3 === 0 ? WorkOrderType.PREVENTIVE : WorkOrderType.CORRECTIVE;
    
    workOrders.push({
        wo_id: 1000 + i,
        asset_id: asset.asset_id,
        type: type,
        priority: i % 10 === 0 ? Priority.CRITICAL : (i % 5 === 0 ? Priority.HIGH : Priority.MEDIUM),
        assigned_to_id: tech.user_id,
        description: type === WorkOrderType.PREVENTIVE ? `Scheduled PM for ${asset.name}` : `Reported fault in ${asset.name}`,
        status: isClosed ? 'Closed' : (i % 2 === 0 ? 'In Progress' : 'Open'),
        start_time: '2023-10-01T09:00:00Z',
        close_time: isClosed ? '2023-10-01T14:00:00Z' : undefined,
        created_at: '2023-09-25T08:00:00Z',
        is_first_time_fix: Math.random() > 0.3,
        nurse_rating: isClosed ? Math.floor(Math.random() * 2) + 3 : undefined // 3 to 5 stars
    });
}

// Helper Functions
export const getAssets = () => assets;
export const getInventory = () => inventory;
export const getWorkOrders = () => workOrders;
export const getLocations = () => LOCATIONS;
export const getUsers = () => MOCK_USERS;

export const getLocationName = (id: number) => {
  const loc = LOCATIONS.find(l => l.location_id === id);
  return loc ? `${loc.building} - ${loc.department} (${loc.room})` : 'Unknown';
};

export const getTechnicianWorkOrders = (userId: number) => {
  return workOrders.filter(wo => wo.assigned_to_id === userId);
};

export const getAssetDocuments = (assetId: string): AssetDocument[] => {
  return [
    { doc_id: 1, asset_id: assetId, title: 'Service Manual v2.0', type: 'Manual', url: '#', date: '2021-01-01' },
    { doc_id: 2, asset_id: assetId, title: 'Calibration Cert 2023', type: 'Certificate', url: '#', date: '2023-01-15' },
    { doc_id: 3, asset_id: assetId, title: 'Maintenance Log 2023', type: 'Report', url: '#', date: '2023-12-01' },
  ];
};

export const findRelevantDocuments = (model: string, manufacturer: string): AssetDocument[] => {
    return [
        { doc_id: 101, asset_id: '', title: `${manufacturer} ${model} User Guide`, type: 'Manual', url: '#', date: '2020-01-01' },
        { doc_id: 102, asset_id: '', title: 'Troubleshooting Guide', type: 'Manual', url: '#', date: '2021-05-01' }
    ];
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

export const getKnowledgeBaseDocs = () => [
    { id: 1, title: 'Servo-U Service Manual', category: 'Ventilators', type: 'Service Manual', updated: '2023-01-10', fileSize: '12 MB' },
    { id: 2, title: 'Magnetom Vida Troubleshooting', category: 'MRI', type: 'Guide', updated: '2022-11-05', fileSize: '4 MB' },
    { id: 3, title: 'Electrical Safety Standard IEC 60601', category: 'Compliance', type: 'Standard', updated: '2021-06-20', fileSize: '2 MB' },
    { id: 4, title: 'Infusion Pump Calibration Proc', category: 'Pumps', type: 'Procedure', updated: '2023-05-15', fileSize: '1.5 MB' },
];

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
