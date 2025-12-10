
import { Asset, AssetStatus, User, UserRole, WorkOrder, WorkOrderType, Priority, InventoryPart, Location, AssetDocument, MovementLog, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert, RoleDefinition, Resource, Action } from '../types';

// Constants
export const LOCATIONS: Location[] = [
    { location_id: 101, name: 'ICU Bed 1', department: 'ICU', building: 'Main Wing', room: '101' },
    { location_id: 102, name: 'ICU Bed 2', department: 'ICU', building: 'Main Wing', room: '102' },
    { location_id: 201, name: 'ER Triage', department: 'Emergency', building: 'Main Wing', room: 'ER-1' },
    { location_id: 202, name: 'ER Trauma', department: 'Emergency', building: 'Main Wing', room: 'ER-2' },
    { location_id: 301, name: 'MRI Suite', department: 'Radiology', building: 'East Wing', room: 'RAD-01' },
    { location_id: 302, name: 'CT Scan', department: 'Radiology', building: 'East Wing', room: 'RAD-02' },
    { location_id: 401, name: 'Lab Processing', department: 'Laboratory', building: 'East Wing', room: 'LAB-05' },
    { location_id: 501, name: 'OR 1', department: 'Surgery', building: 'Main Wing', room: 'OR-01' },
    { location_id: 502, name: 'OR 2', department: 'Surgery', building: 'Main Wing', room: 'OR-02' },
    { location_id: 601, name: 'Cath Lab', department: 'Cardiology', building: 'West Wing', room: 'CARD-01' },
    { location_id: 701, name: 'Nursery', department: 'Pediatrics', building: 'North Wing', room: 'PED-01' },
    { location_id: 702, name: 'NICU', department: 'Pediatrics', building: 'North Wing', room: 'NICU-01' },
    { location_id: 801, name: 'Chemo Bay', department: 'Oncology', building: 'West Wing', room: 'ONC-01' },
    { location_id: 901, name: 'Dialysis Unit', department: 'Nephrology', building: 'South Wing', room: 'NEPH-01' },
    { location_id: 1001, name: 'Delivery Room', department: 'Maternity', building: 'North Wing', room: 'MAT-01' },
    { location_id: 1101, name: 'Exam Room 1', department: 'Outpatient', building: 'Clinic Block', room: 'OPD-01' },
    { location_id: 1201, name: 'Dispensing', department: 'Pharmacy', building: 'Central', room: 'PHARM-01' },
    { location_id: 1301, name: 'Sterilization', department: 'CSSD', building: 'Basement', room: 'CSSD-01' },
    { location_id: 1401, name: 'Rehab Gym', department: 'Physical Therapy', building: 'South Wing', room: 'PT-01' },
    { location_id: 1501, name: 'Ent Suite', department: 'ENT', building: 'Clinic Block', room: 'ENT-01' },
];

export const DEVICE_CATALOG = [
    { name: 'MRI Scanner', model: 'Magnetom Vida', manufacturer: 'Siemens', image: 'https://images.unsplash.com/photo-1516549655169-df83a092dd14?auto=format&fit=crop&q=80&w=300' },
    { name: 'CT Scanner', model: 'Revolution Apex', manufacturer: 'GE Healthcare', image: 'https://plus.unsplash.com/premium_photo-1682126112993-9b6330452304?auto=format&fit=crop&q=80&w=300' },
    { name: 'Ventilator', model: 'Servo-U', manufacturer: 'Getinge', image: 'https://images.unsplash.com/photo-1584036561566-b93a9499d6d3?auto=format&fit=crop&q=80&w=300' },
    { name: 'Infusion Pump', model: 'Alaris PC', manufacturer: 'BD', image: 'https://images.unsplash.com/photo-1583946099397-9954d183d237?auto=format&fit=crop&q=80&w=300' },
    { name: 'Patient Monitor', model: 'Intellivue MX800', manufacturer: 'Philips', image: 'https://plus.unsplash.com/premium_photo-1661766569022-1b7f918ac3f3?auto=format&fit=crop&q=80&w=300' },
    { name: 'Anesthesia Machine', model: 'Aisys CS2', manufacturer: 'GE Healthcare', image: 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?auto=format&fit=crop&q=80&w=300' },
    { name: 'Ultrasound', model: 'Voluson E10', manufacturer: 'GE Healthcare', image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=300' },
    { name: 'Defibrillator', model: 'LifePak 15', manufacturer: 'Stryker', image: 'https://images.unsplash.com/photo-1584362917165-52e812c2085e?auto=format&fit=crop&q=80&w=300' },
    { name: 'Incubator', model: 'Isolette 8000', manufacturer: 'Drager', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=300' },
    { name: 'ECG Machine', model: 'MAC 5500', manufacturer: 'GE Healthcare', image: 'https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?auto=format&fit=crop&q=80&w=300' },
];

export const MOCK_USERS: User[] = [
    { user_id: 1, name: 'Dr. Sarah Admin', email: 'admin@hospital.com', role: UserRole.ADMIN, location_id: 101, department: 'Management' },
    { user_id: 2, name: 'John Supervisor', email: 'super@hospital.com', role: UserRole.SUPERVISOR, location_id: 101, department: 'Maintenance' },
    { user_id: 3, name: 'Mike Tech', email: 'tech@hospital.com', role: UserRole.TECHNICIAN, location_id: 101, department: 'Biomedical' },
    { user_id: 4, name: 'Nurse Joy', email: 'nurse@hospital.com', role: UserRole.NURSE, location_id: 101, department: 'ICU' },
    { user_id: 5, name: 'Vendor Rep', email: 'vendor@company.com', role: UserRole.VENDOR, location_id: 101, department: 'External' },
    { user_id: 6, name: 'Inspector Gadget', email: 'audit@gov.sa', role: UserRole.INSPECTOR, location_id: 101, department: 'Compliance' },
];

export const MOCK_ROLES: RoleDefinition[] = [
    {
        id: '1', name: 'Administrator', description: 'Full System Access', is_system_role: true,
        permissions: { assets: ['view', 'create', 'edit', 'delete'], work_orders: ['view', 'create', 'edit', 'delete'], inventory: ['view', 'create', 'edit', 'delete'], reports: ['view', 'create', 'edit', 'delete'], users: ['view', 'create', 'edit', 'delete'], settings: ['view', 'create', 'edit', 'delete'] }
    },
    {
        id: '2', name: 'Technician', description: 'Field Maintenance Access', is_system_role: true,
        permissions: { assets: ['view', 'edit'], work_orders: ['view', 'edit'], inventory: ['view'], reports: ['create'], users: [], settings: [] }
    }
];

// Mock Data Generators
const generateAssets = (): Asset[] => [
    {
        asset_id: 'AST-1001', nfc_tag_id: 'NFC-1001', name: 'MRI Scanner', model: 'Magnetom Vida', manufacturer: 'Siemens',
        serial_number: 'SN-998877', location_id: 301, status: AssetStatus.RUNNING,
        manufacturing_date: '2020-01-01', purchase_date: '2020-06-01', installation_date: '2020-06-15', warranty_expiration: '2025-06-15',
        expected_lifespan: 10, operating_hours: 14500, risk_score: 15, purchase_cost: 1500000, accumulated_maintenance_cost: 45000,
        image: 'https://images.unsplash.com/photo-1516549655169-df83a092dd14?auto=format&fit=crop&q=80&w=300'
    },
    {
        asset_id: 'AST-1002', nfc_tag_id: 'NFC-1002', name: 'Ventilator', model: 'Servo-U', manufacturer: 'Getinge',
        serial_number: 'SN-112233', location_id: 101, status: AssetStatus.RUNNING,
        manufacturing_date: '2021-03-01', purchase_date: '2021-04-01', installation_date: '2021-04-05', warranty_expiration: '2024-04-05',
        expected_lifespan: 7, operating_hours: 8200, risk_score: 5, purchase_cost: 45000, accumulated_maintenance_cost: 2100,
        image: 'https://images.unsplash.com/photo-1584036561566-b93a9499d6d3?auto=format&fit=crop&q=80&w=300'
    },
    {
        asset_id: 'AST-1003', nfc_tag_id: 'NFC-1003', name: 'Infusion Pump', model: 'Alaris PC', manufacturer: 'BD',
        serial_number: 'SN-445566', location_id: 101, status: AssetStatus.DOWN,
        manufacturing_date: '2019-11-01', purchase_date: '2020-01-10', installation_date: '2020-01-15', warranty_expiration: '2023-01-15',
        expected_lifespan: 5, operating_hours: 22000, risk_score: 85, purchase_cost: 3500, accumulated_maintenance_cost: 1200,
        image: 'https://images.unsplash.com/photo-1583946099397-9954d183d237?auto=format&fit=crop&q=80&w=300'
    },
     {
        asset_id: 'AST-1004', nfc_tag_id: 'NFC-1004', name: 'Patient Monitor', model: 'Intellivue MX800', manufacturer: 'Philips',
        serial_number: 'SN-778899', location_id: 102, status: AssetStatus.UNDER_MAINT,
        manufacturing_date: '2022-01-01', purchase_date: '2022-02-01', installation_date: '2022-02-05', warranty_expiration: '2025-02-05',
        expected_lifespan: 8, operating_hours: 4500, risk_score: 30, purchase_cost: 12000, accumulated_maintenance_cost: 500,
        image: 'https://plus.unsplash.com/premium_photo-1661766569022-1b7f918ac3f3?auto=format&fit=crop&q=80&w=300'
    }
];

const generateInventory = (): InventoryPart[] => [
    { part_id: 1, part_name: 'Flow Sensor', current_stock: 5, min_reorder_level: 10, cost: 150 },
    { part_id: 2, part_name: 'O2 Cell', current_stock: 20, min_reorder_level: 5, cost: 45 },
    { part_id: 3, part_name: 'Battery Pack (Li-Ion)', current_stock: 2, min_reorder_level: 3, cost: 200 },
    { part_id: 4, part_name: 'Patient Circuit', current_stock: 50, min_reorder_level: 20, cost: 15 },
    { part_id: 5, part_name: 'ECG Lead Set', current_stock: 12, min_reorder_level: 10, cost: 85 },
];

const generateWorkOrders = (): WorkOrder[] => [
    {
        wo_id: 2236, asset_id: 'AST-1002', type: WorkOrderType.CORRECTIVE, priority: Priority.HIGH, assigned_to_id: 3,
        description: 'Ventilator failing self-test (Code E045)', status: 'Closed',
        created_at: '2023-10-24T09:00:00', start_time: '2023-10-24T10:00:00', close_time: '2023-10-25T14:00:00',
        failure_type: 'Technical', parts_used: [{ part_id: 1, quantity: 1 }]
    },
    {
        wo_id: 5002, asset_id: 'AST-1001', type: WorkOrderType.PREVENTIVE, priority: Priority.MEDIUM, assigned_to_id: 3,
        description: 'Quarterly PM Inspection', status: 'Open',
        created_at: new Date().toISOString()
    },
    {
        wo_id: 5003, asset_id: 'AST-1004', type: WorkOrderType.CORRECTIVE, priority: Priority.CRITICAL, assigned_to_id: 3,
        description: 'SpO2 sensor not reading', status: 'Assigned',
        created_at: new Date().toISOString()
    }
];

// Mutable state for mock DB
let assets = generateAssets();
let inventory = generateInventory();
let workOrders = generateWorkOrders();
let users = [...MOCK_USERS];
let roles = [...MOCK_ROLES];

// --- Exports ---

// Getters
export const getAssets = () => assets;
export const getInventory = () => inventory;
export const getWorkOrders = () => workOrders;
export const getUsers = () => users;
export const getRoles = () => roles;
export const getLocations = () => LOCATIONS;

// Helpers
export const getLocationName = (id: number) => {
    const loc = LOCATIONS.find(l => l.location_id === id);
    return loc ? `${loc.department} - ${loc.room}` : 'Unknown';
};

export const getAssetDocuments = (assetId: string): AssetDocument[] => {
    return [
        { doc_id: 1, asset_id: assetId, title: 'Service Manual', type: 'Manual', url: '#', date: '2022-01-01' },
        { doc_id: 2, asset_id: assetId, title: 'Calibration Cert', type: 'Certificate', url: '#', date: '2023-05-01' },
        { doc_id: 3, asset_id: assetId, title: 'User Guide', type: 'Manual', url: '#', date: '2022-02-15' }
    ];
};

export const findRelevantDocuments = (model: string, manufacturer: string) => {
    // Mock logic to "search" docs
    return [
        { doc_id: 101, asset_id: 'generic', title: `${manufacturer} ${model} Service Manual`, type: 'Manual', url: '#', date: '2022-01-01' } as AssetDocument
    ];
};

export const getMovementLogs = (): MovementLog[] => [
    { log_id: 1, asset_id: 'AST-1003', from_location_id: 101, to_location_id: 201, timestamp: '2023-11-01T10:00:00', user_id: 4 },
    { log_id: 2, asset_id: 'AST-1004', from_location_id: 102, to_location_id: 301, timestamp: '2023-11-02T14:30:00', user_id: 3 }
];

export const getSystemAlerts = (): SystemAlert[] => [
    { id: 1, type: 'STOCK', message: 'Low stock: Flow Sensor', timestamp: new Date().toISOString(), severity: 'medium', status: 'active' },
    { id: 2, type: 'BOUNDARY_CROSSING', message: 'Infusion Pump AST-1003 left ICU', timestamp: new Date(Date.now() - 3600000).toISOString(), severity: 'high', status: 'active' }
];

export const getKnowledgeBaseDocs = () => [
    { id: 'KB-001', title: 'Servo-U Service Manual', tags: ['ventilator', 'getinge'] },
    { id: 'KB-002', title: 'Magnetom Vida Troubleshooting', tags: ['mri', 'siemens'] },
    { id: 'KB-003', title: 'Alaris PC Pump Maintenance', tags: ['pump', 'bd'] },
    { id: 'KB-004', title: 'Intellivue MX800 Config Guide', tags: ['monitor', 'philips'] }
];

// Reports
export const getPMReports = (): PreventiveMaintenanceReport[] => [
     {
        pm_id: "PM-5002",
        wo_id: 5002,
        scheduled_date: "2023-11-01",
        completion_date: "2023-11-01T14:30:00",
        technician_name: "Mike Tech",
        asset: {
            name: "MRI Scanner Magnetom Vida",
            model: "Magnetom Vida",
            serial_no: "SN-998877",
            asset_id: "AST-1001",
            location: "Radiology - MRI Suite"
        },
        checklist: [
            { id: 1, task: "Check Cryogen Level", status: "Pass" },
            { id: 2, task: "Clean Filters", status: "Pass" }
        ],
        vital_data: { operating_hours: 14500, last_calibration: "2023-05-01", electrical_safety_pass: true },
        calibration_results: { required: false, status: "N/A" },
        next_due_date: "2024-05-01",
        approvals: { technician_sign: "Digitally Signed: Mike Tech", supervisor_sign: "Digitally Signed: John Supervisor", date: "2023-11-02" }
    }
];

export const getDetailedReports = (): DetailedJobOrderReport[] => [
    {
        job_order_no: 2236,
        report_id: "RPT-2023-089",
        control_no: "CN-7782",
        priority: "High",
        risk_factor: "Critical",
        asset: { name: "Ventilator Servo-U", model: "Servo-U", manufacturer: "Getinge", serial_no: "SN-112233", asset_id: "AST-1002" },
        location: { site: "Main Hospital", building: "Main Wing", department: "ICU", room: "101" },
        fault_details: { failed_date: "2023-10-24", fault_description: "Unit failed self-test.", repair_date: "2023-10-25", technician_name: "Mike Tech", remedy_work_done: "Replaced flow sensor." },
        spare_parts: [{ part_name: "Flow Sensor", part_no: "GT-9988", quantity: 1 }],
        qc_analysis: { need_spare_parts: "Yes", need_calibration: true, user_errors: false, unrepairable: false, agent_repair: false, partially_working: false, incident: true },
        approvals: { caller: { name: "Nurse Joy", contact: "Ext 101" }, dept_head: { name: "Dr. House", date: "2023-10-25" }, site_supervisor: { name: "John Supervisor", date: "2023-10-25" }, site_admin: { name: "Sarah Connor", date: "2023-10-26" } }
    }
];

// Setters (for Mock API)
export const addAsset = (asset: Asset) => { assets.push(asset); };
export const addUser = (user: User) => { users.push(user); };
export const createWorkOrder = (wo: WorkOrder) => { workOrders.push(wo); };
