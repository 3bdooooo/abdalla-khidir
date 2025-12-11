
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
    { location_id: 1601, name: 'Dental Chair 1', department: 'Dental', building: 'Clinic Block', room: 'DENT-01' },
    { location_id: 1701, name: 'Admin Office', department: 'Administration', building: 'Admin Block', room: 'ADM-01' },
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
    { name: 'C-Arm', model: 'OEC Elite', manufacturer: 'GE Healthcare', image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80&w=300' },
    { name: 'Dental Chair', model: 'A-dec 500', manufacturer: 'A-dec', image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=300' },
    { name: 'Endoscope', model: 'Evis Exera III', manufacturer: 'Olympus', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=300' },
];

// 20 Real Vendors with Performance Bias
export const MOCK_VENDORS = [
    { id: 'V01', name: 'Siemens Healthineers', reliability: 98, support: 4.8 },
    { id: 'V02', name: 'GE Healthcare', reliability: 97, support: 4.9 },
    { id: 'V03', name: 'Philips Healthcare', reliability: 96, support: 4.7 },
    { id: 'V04', name: 'Dräger', reliability: 99, support: 4.5 },
    { id: 'V05', name: 'Medtronic', reliability: 95, support: 4.6 },
    { id: 'V06', name: 'Stryker', reliability: 94, support: 4.8 },
    { id: 'V07', name: 'Baxter', reliability: 92, support: 4.2 },
    { id: 'V08', name: 'B. Braun', reliability: 93, support: 4.3 },
    { id: 'V09', name: 'Olympus', reliability: 96, support: 4.1 },
    { id: 'V10', name: 'Getinge', reliability: 95, support: 4.4 },
    { id: 'V11', name: 'Mindray', reliability: 89, support: 3.9 },
    { id: 'V12', name: 'Canon Medical', reliability: 94, support: 4.2 },
    { id: 'V13', name: 'Fujifilm', reliability: 91, support: 4.0 },
    { id: 'V14', name: 'Abbott', reliability: 95, support: 4.6 },
    { id: 'V15', name: 'Boston Scientific', reliability: 93, support: 4.3 },
    { id: 'V16', name: 'Johnson & Johnson', reliability: 97, support: 4.5 },
    { id: 'V17', name: 'Terumo', reliability: 92, support: 4.1 },
    { id: 'V18', name: 'ResMed', reliability: 94, support: 4.7 },
    { id: 'V19', name: 'Smith & Nephew', reliability: 91, support: 4.0 },
    { id: 'V20', name: 'Zimmer Biomet', reliability: 93, support: 4.2 }
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
    },
    { id: '3', name: 'Supervisor', description: 'Department Oversight & Reports', is_system_role: true, permissions: { assets: ['view', 'edit'], work_orders: ['view', 'create', 'edit'], inventory: ['view', 'edit'], reports: ['view', 'create'], users: ['view'], settings: [] } },
    { id: '4', name: 'Nurse', description: 'Reporting & Verification', is_system_role: true, permissions: { assets: ['view'], work_orders: ['create'], inventory: [], reports: [], users: [], settings: [] } },
    { id: '5', name: 'Vendor', description: 'External Contractor Access', is_system_role: false, permissions: { assets: ['view'], work_orders: ['view', 'edit'], inventory: [], reports: [], users: [], settings: [] } },
    { id: '6', name: 'Inspector', description: 'Read-only Audit Access', is_system_role: false, permissions: { assets: ['view'], work_orders: ['view'], inventory: ['view'], reports: ['view'], users: ['view'], settings: [] } }
];

// Mock Data Generators
const generateAssets = (): Asset[] => {
    // 1. Core fixed assets
    const coreAssets: Asset[] = [
        {
            asset_id: 'AST-1001', nfc_tag_id: 'NFC-1001', name: 'MRI Scanner', model: 'Magnetom Vida', manufacturer: 'Siemens',
            serial_number: 'SN-998877', location_id: 301, status: AssetStatus.RUNNING,
            manufacturing_date: '2020-01-01', purchase_date: '2020-06-01', installation_date: '2020-06-15', warranty_expiration: '2025-06-15',
            expected_lifespan: 10, operating_hours: 14500, risk_score: 15, purchase_cost: 1500000, accumulated_maintenance_cost: 45000,
            image: 'https://images.unsplash.com/photo-1516549655169-df83a092dd14?auto=format&fit=crop&q=80&w=300',
            control_number: 'RAD/MRI/001', classification: 'Diagnostic Imaging',
            last_calibration_date: '2023-01-15', next_calibration_date: '2024-01-15'
        },
        {
            asset_id: 'AST-1002', nfc_tag_id: 'NFC-1002', name: 'Ventilator', model: 'Servo-U', manufacturer: 'Getinge',
            serial_number: 'SN-112233', location_id: 101, status: AssetStatus.RUNNING,
            manufacturing_date: '2021-03-01', purchase_date: '2021-04-01', installation_date: '2021-04-05', warranty_expiration: '2024-04-05',
            expected_lifespan: 7, operating_hours: 8200, risk_score: 5, purchase_cost: 45000, accumulated_maintenance_cost: 2100,
            image: 'https://images.unsplash.com/photo-1584036561566-b93a9499d6d3?auto=format&fit=crop&q=80&w=300',
            control_number: 'ICU/VENT/005', classification: 'Life Support',
            last_calibration_date: '2023-06-01', next_calibration_date: '2023-12-01'
        },
        {
            asset_id: 'AST-1003', nfc_tag_id: 'NFC-1003', name: 'Infusion Pump', model: 'Alaris PC', manufacturer: 'BD',
            serial_number: 'SN-445566', location_id: 101, status: AssetStatus.DOWN,
            manufacturing_date: '2019-11-01', purchase_date: '2020-01-10', installation_date: '2020-01-15', warranty_expiration: '2023-01-15',
            expected_lifespan: 5, operating_hours: 22000, risk_score: 85, purchase_cost: 3500, accumulated_maintenance_cost: 1200,
            image: 'https://images.unsplash.com/photo-1583946099397-9954d183d237?auto=format&fit=crop&q=80&w=300',
            control_number: 'ICU/PUMP/012', classification: 'Therapeutic'
        },
         {
            asset_id: 'AST-1004', nfc_tag_id: 'NFC-1004', name: 'Patient Monitor', model: 'Intellivue MX800', manufacturer: 'Philips',
            serial_number: 'SN-778899', location_id: 102, status: AssetStatus.UNDER_MAINT,
            manufacturing_date: '2022-01-01', purchase_date: '2022-02-01', installation_date: '2022-02-05', warranty_expiration: '2025-02-05',
            expected_lifespan: 8, operating_hours: 4500, risk_score: 30, purchase_cost: 12000, accumulated_maintenance_cost: 500,
            image: 'https://plus.unsplash.com/premium_photo-1661766569022-1b7f918ac3f3?auto=format&fit=crop&q=80&w=300',
            control_number: 'ICU/MON/003', classification: 'Monitoring',
            last_calibration_date: '2022-02-05', next_calibration_date: '2023-02-05' // Overdue example
        }
    ];

    const generatedAssets: Asset[] = [];
    let idCounter = 1005;

    LOCATIONS.forEach(loc => {
        const count = 5 + Math.floor(Math.random() * 4); 
        for (let i = 0; i < count; i++) {
            const type = DEVICE_CATALOG[Math.floor(Math.random() * DEVICE_CATALOG.length)];
            const year = 2018 + Math.floor(Math.random() * 6);
            const statusRoll = Math.random();
            let status = AssetStatus.RUNNING;
            if (statusRoll > 0.92) status = AssetStatus.DOWN;
            else if (statusRoll > 0.85) status = AssetStatus.UNDER_MAINT;

            // Calibration Logic: ~20% of assets have calibration data
            let lastCal = undefined;
            let nextCal = undefined;
            if (Math.random() > 0.8) {
                const now = new Date();
                const pastDate = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * 14), 1);
                lastCal = pastDate.toISOString().split('T')[0];
                
                const nextDate = new Date(pastDate);
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                nextCal = nextDate.toISOString().split('T')[0];
            }

            generatedAssets.push({
                asset_id: `AST-${idCounter}`,
                nfc_tag_id: `NFC-${idCounter}`,
                name: type.name,
                model: type.model,
                manufacturer: type.manufacturer,
                serial_number: `SN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                location_id: loc.location_id,
                status: status,
                manufacturing_date: `${year}-01-01`,
                purchase_date: `${year}-06-01`,
                installation_date: `${year}-06-15`,
                warranty_expiration: `${year + 5}-06-15`,
                expected_lifespan: 8 + Math.floor(Math.random() * 5),
                operating_hours: Math.floor(Math.random() * 15000),
                risk_score: Math.floor(Math.random() * 100),
                purchase_cost: 5000 + Math.floor(Math.random() * 50000),
                accumulated_maintenance_cost: Math.floor(Math.random() * 5000),
                image: type.image,
                control_number: `${loc.department.substring(0,3).toUpperCase()}/${type.name.substring(0,3).toUpperCase()}/${idCounter}`,
                classification: 'General Medical',
                last_calibration_date: lastCal,
                next_calibration_date: nextCal
            });
            idCounter++;
        }
    });

    return [...coreAssets, ...generatedAssets];
};

// Generate 500 Spare Parts
const generateInventory = (): InventoryPart[] => {
    const parts: InventoryPart[] = [];
    const baseNames = ['Sensor', 'Valve', 'Filter', 'PCB Main', 'Power Supply', 'Battery', 'Cable', 'Motor', 'Pump', 'Display', 'Probe', 'Gasket', 'Fuse', 'Switch', 'Control Board'];
    const modifiers = ['Assembly', 'Module', 'Unit', 'Kit', 'Connector', 'Harness', 'Pack'];
    const types = ['Digital', 'Analog', 'High-Pressure', 'Low-Voltage', 'Optical', 'Thermal', 'Magnetic'];

    // Add core parts first
    const coreParts = [
        { part_id: 1, part_name: 'Flow Sensor', current_stock: 5, min_reorder_level: 10, cost: 150 },
        { part_id: 2, part_name: 'O2 Cell', current_stock: 20, min_reorder_level: 5, cost: 45 },
        { part_id: 3, part_name: 'Battery Pack (Li-Ion)', current_stock: 2, min_reorder_level: 3, cost: 200 },
        { part_id: 4, part_name: 'Patient Circuit', current_stock: 50, min_reorder_level: 20, cost: 15 },
        { part_id: 5, part_name: 'ECG Lead Set', current_stock: 12, min_reorder_level: 10, cost: 85 },
        { part_id: 6, part_name: 'SpO2 Sensor', current_stock: 8, min_reorder_level: 15, cost: 120 },
        { part_id: 7, part_name: 'NIBP Cuff (Adult)', current_stock: 30, min_reorder_level: 10, cost: 25 },
        { part_id: 8, part_name: 'Main Board PCB', current_stock: 1, min_reorder_level: 2, cost: 1200 },
        { part_id: 9, part_name: 'Power Supply Unit', current_stock: 3, min_reorder_level: 3, cost: 450 },
        { part_id: 10, part_name: 'Touch Screen Assembly', current_stock: 2, min_reorder_level: 2, cost: 800 },
    ];
    
    parts.push(...coreParts);

    for (let i = 11; i <= 500; i++) {
        const base = baseNames[Math.floor(Math.random() * baseNames.length)];
        const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        
        parts.push({
            part_id: i,
            part_name: `${type} ${base} ${mod}`,
            current_stock: Math.floor(Math.random() * 50),
            min_reorder_level: Math.floor(Math.random() * 10) + 1,
            cost: Math.floor(Math.random() * 500) + 10
        });
    }
    return parts;
};

// Generate 50 Randomized Work Orders
const generateWorkOrders = (): WorkOrder[] => {
    const wos: WorkOrder[] = [];
    
    // Static critical ones for demo visibility
    wos.push(
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
    );

    // Algorithm to generate 47 more
    const statuses = ['Open', 'In Progress', 'Assigned', 'Closed', 'Awaiting Approval', 'Manager Approved'];
    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
    const types = [WorkOrderType.CORRECTIVE, WorkOrderType.PREVENTIVE, WorkOrderType.CALIBRATION];
    
    const descriptions = [
        "Battery not charging", "Screen flickering", "No power on startup", "Calibration check due",
        "Leaking fluid", "Noisy operation", "Data transfer failed", "Filter replacement needed",
        "Software update required", "Physical damage to casing"
    ];

    let id = 6000;
    for (let i = 0; i < 47; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        // Ensure some are assigned to "Mike Tech" (user_id 3)
        const assignee = Math.random() > 0.5 ? 3 : 2; 
        
        // Random date in last 3 months
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 90));

        let closedData = {};
        if (status === 'Closed') {
            const start = new Date(date);
            start.setHours(start.getHours() + 1);
            const end = new Date(start);
            end.setHours(end.getHours() + Math.floor(Math.random() * 4) + 1);
            closedData = {
                start_time: start.toISOString(),
                close_time: end.toISOString(),
                parts_used: Math.random() > 0.5 ? [{ part_id: Math.floor(Math.random() * 20) + 1, quantity: 1 }] : []
            };
        }

        // Pick a random asset (using simplified logic, assume IDs exist)
        const assetId = `AST-${1005 + Math.floor(Math.random() * 50)}`; // Picking from first 50 generated

        wos.push({
            wo_id: id++,
            asset_id: assetId,
            type: type,
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            assigned_to_id: status !== 'Open' ? assignee : undefined as any,
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            status: status as any,
            created_at: date.toISOString(),
            failure_type: type === WorkOrderType.CORRECTIVE ? (Math.random() > 0.3 ? 'Technical' : 'UserError') : undefined,
            ...closedData
        });
    }

    return wos;
};

// Mutable state for mock DB
let assets = generateAssets();
let inventory = generateInventory();
let workOrders = generateWorkOrders();
let users = [...MOCK_USERS];
let roles = [...MOCK_ROLES];

// --- Exports ---

export const getAssets = () => assets;
export const getInventory = () => inventory;
export const getWorkOrders = () => workOrders;
export const getUsers = () => users;
export const getRoles = () => roles;
export const getLocations = () => LOCATIONS;

export const getLocationName = (id: number) => {
    const loc = LOCATIONS.find(l => l.location_id === id);
    return loc ? `${loc.department} - ${loc.room}` : 'Unknown';
};

export const getAssetDocuments = (assetId: string): AssetDocument[] => {
    const asset = assets.find(a => a.asset_id === assetId);
    const docs: AssetDocument[] = [
        { doc_id: 1, asset_id: assetId, title: 'Service Manual', type: 'Manual', url: '#', date: '2022-01-01' },
        { doc_id: 2, asset_id: assetId, title: 'Calibration Cert', type: 'Certificate', url: '#', date: '2023-05-01' },
    ];
    if (asset) {
        docs.push({ doc_id: 3, asset_id: assetId, title: `${asset.manufacturer} ${asset.model} User Guide`, type: 'Manual', url: '#', date: '2022-02-15' });
    }
    return docs;
};

export const findRelevantDocuments = (model: string, manufacturer: string) => {
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

// Generate 500 Knowledge Base Docs
export const getKnowledgeBaseDocs = () => {
    const docs = [];
    const docTypes = ['Service Manual', 'User Guide', 'Schematics', 'Parts List', 'Calibration Procedure'];
    
    for (let i = 0; i < 500; i++) {
        const device = DEVICE_CATALOG[i % DEVICE_CATALOG.length];
        const type = docTypes[i % docTypes.length];
        docs.push({
            id: `KB-${1000+i}`,
            title: `${device.manufacturer} ${device.model} - ${type}`,
            tags: [device.name.toLowerCase(), device.manufacturer.toLowerCase(), type.toLowerCase()]
        });
    }
    return docs;
};

export const TRAINING_SCENARIOS = [
    { department: "ICU", error: "Monitor Cable Damaged (Pulled)", count: 12, recommendation: "Cable Management Training" },
    { department: "ER", error: "Battery Drained (Not Plugged In)", count: 9, recommendation: "Power Protocol Review" },
    { department: "Surgery", error: "Fluid Spill on Console", count: 5, recommendation: "Fluid Safety Procedures" },
    { department: "Pediatrics", error: "Probe Sensor Bent", count: 4, recommendation: "Handling Delicate Sensors" },
    { department: "Radiology", error: "Coil Connector Force", count: 3, recommendation: "Connector Alignment Tips" },
    { department: "Laboratory", error: "Filter Clogged (User Maint)", count: 8, recommendation: "Daily Cleaning Checklist" },
    { department: "Oncology", error: "Infusion Door Jammed", count: 6, recommendation: "Proper Loading Technique" },
    { department: "Dialysis", error: "Screen Impact Damage", count: 2, recommendation: "Equipment Positioning" },
    { department: "Maternity", error: "Transducer Dropped", count: 7, recommendation: "Secure Storage Habits" },
    { department: "Outpatient", error: "Printer Paper Jam (Force)", count: 15, recommendation: "Consumable Replacement Guide" }
];

// Reports Generators
export const getPMReports = (): PreventiveMaintenanceReport[] => {
    const reports: PreventiveMaintenanceReport[] = [];
    // Generate 5 PM Reports
    for (let i=0; i<5; i++) {
        const asset = assets[i] || assets[0];
        reports.push({
            pm_id: `PM-${5000+i}`,
            wo_id: 5000+i,
            scheduled_date: "2023-11-01",
            completion_date: "2023-11-01T14:30:00",
            technician_name: "Mike Tech",
            asset: {
                name: asset.name,
                model: asset.model,
                serial_no: asset.serial_number || 'N/A',
                asset_id: asset.asset_id,
                location: getLocationName(asset.location_id)
            },
            checklist: [
                { id: 1, task: "Check Physical Condition", status: "Pass" },
                { id: 2, task: "Electrical Safety Test", status: "Pass" },
                { id: 3, task: "Performance Verification", status: "Pass" }
            ],
            vital_data: { operating_hours: asset.operating_hours, last_calibration: asset.last_calibration_date || "N/A", electrical_safety_pass: true },
            calibration_results: { required: false, status: "N/A" },
            next_due_date: "2024-05-01",
            approvals: { technician_sign: "Digitally Signed: Mike Tech", supervisor_sign: "Digitally Signed: John Supervisor", date: "2023-11-02" }
        });
    }
    return reports;
};

export const getDetailedReports = (): DetailedJobOrderReport[] => {
    const reports: DetailedJobOrderReport[] = [];
    const closedCMs = workOrders.filter(w => w.status === 'Closed' && w.type === 'Corrective');
    
    // Generate 5 CM Reports based on closed WOs
    closedCMs.slice(0, 5).forEach((wo, idx) => {
        const asset = assets.find(a => a.asset_id === wo.asset_id) || assets[0];
        reports.push({
            job_order_no: wo.wo_id,
            report_id: `RPT-2023-0${80+idx}`,
            control_no: asset.control_number || `CN-${wo.wo_id}`,
            priority: wo.priority,
            risk_factor: "Medium",
            asset: { name: asset.name, model: asset.model, manufacturer: asset.manufacturer || 'Generic', serial_no: asset.serial_number || 'N/A', asset_id: asset.asset_id },
            location: { site: "Main Hospital", building: "Main Wing", department: "ICU", room: "101" }, // Simplified
            fault_details: { 
                failed_date: wo.created_at.split('T')[0], 
                fault_description: wo.description, 
                repair_date: wo.close_time?.split('T')[0] || new Date().toISOString().split('T')[0], 
                technician_name: "Mike Tech", 
                remedy_work_done: "Replaced faulty component and tested." 
            },
            spare_parts: wo.parts_used ? wo.parts_used.map(p => ({ part_name: "Spare Part", part_no: `P-${p.part_id}`, quantity: p.quantity })) : [],
            qc_analysis: { need_spare_parts: wo.parts_used?.length ? "Yes" : "No", need_calibration: false, user_errors: wo.failure_type === 'UserError', unrepairable: false, agent_repair: false, partially_working: false, incident: false },
            approvals: { caller: { name: "Nurse Joy", contact: "Ext 101" }, dept_head: { name: "Dr. House", date: "2023-10-25" }, site_supervisor: { name: "John Supervisor", date: "2023-10-25" }, site_admin: { name: "Sarah Connor", date: "2023-10-26" } }
        });
    });
    
    // Fallback if no closed WOs
    if (reports.length === 0) {
        reports.push({
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
        });
    }

    return reports;
};

// Setters (for Mock API)
export const addAsset = (asset: Asset) => { assets.push(asset); };
export const addUser = (user: User) => { users.push(user); };
export const createWorkOrder = (wo: WorkOrder) => { workOrders.push(wo); };
