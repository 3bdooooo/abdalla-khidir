import { Asset, AssetStatus, User, UserRole, WorkOrder, WorkOrderType, Priority, InventoryPart, Location, AssetDocument, MovementLog, DetailedJobOrderReport, PreventiveMaintenanceReport, SystemAlert } from '../types';

// Mock Data
export const LOCATIONS: Location[] = [
  { location_id: 101, name: 'ICU Room 1', department: 'ICU', building: 'Main Wing', room: '101' },
  { location_id: 102, name: 'ICU Room 2', department: 'ICU', building: 'Main Wing', room: '102' },
  { location_id: 201, name: 'Radiology X-Ray 1', department: 'Radiology', building: 'East Wing', room: 'R1' },
  { location_id: 301, name: 'ER Triage', department: 'Emergency', building: 'Main Wing', room: 'E1' },
  { location_id: 401, name: 'Lab Hematology', department: 'Laboratory', building: 'North Wing', room: 'L1' },
];

export const MOCK_USERS: User[] = [
  { user_id: 1, name: 'Dr. Sarah Connor', role: UserRole.ADMIN, email: 'admin@hospital.com', password: 'password', location_id: 101, department: 'Management' },
  { user_id: 2, name: 'John Supervisor', role: UserRole.SUPERVISOR, email: 'supervisor@hospital.com', password: 'password', location_id: 101, department: 'Biomedical' },
  { user_id: 3, name: 'Mike Tech', role: UserRole.TECHNICIAN, email: 'tech@hospital.com', password: 'password', location_id: 101, department: 'Biomedical', phone_number: '555-0101' },
  { user_id: 4, name: 'Nurse Joy', role: UserRole.NURSE, email: 'nurse@hospital.com', password: 'password', location_id: 101, department: 'ICU' },
  { user_id: 5, name: 'Vendor Rep', role: UserRole.VENDOR, email: 'vendor@hospital.com', password: 'password', location_id: 101, department: 'External' },
];

let assets: Asset[] = [
  { asset_id: 'AST-001', nfc_tag_id: 'NFC-001', name: 'MRI Scanner', model: 'Magnetom Vida', manufacturer: 'Siemens', serial_number: 'SN-998877', location_id: 201, status: AssetStatus.RUNNING, purchase_date: '2020-01-15', operating_hours: 12500, risk_score: 15, last_calibration_date: '2023-11-01', next_calibration_date: '2024-11-01', image: 'https://images.unsplash.com/photo-1516549655169-df83a063b36c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'AST-002', nfc_tag_id: 'NFC-002', name: 'Ventilator', model: 'Servo-U', manufacturer: 'Getinge', serial_number: 'SN-112233', location_id: 101, status: AssetStatus.RUNNING, purchase_date: '2021-05-20', operating_hours: 5400, risk_score: 85, last_calibration_date: '2023-12-10', next_calibration_date: '2024-06-10', image: 'https://images.unsplash.com/photo-1584036561566-b93a901e3ae6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'AST-003', nfc_tag_id: 'NFC-003', name: 'Infusion Pump', model: 'Alaris System', manufacturer: 'BD', serial_number: 'SN-445566', location_id: 102, status: AssetStatus.DOWN, purchase_date: '2019-08-10', operating_hours: 8900, risk_score: 60, last_calibration_date: '2023-01-15', next_calibration_date: '2024-01-15', image: 'https://images.unsplash.com/photo-1583946912508-63a96f9a7657?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'AST-004', nfc_tag_id: 'NFC-004', name: 'Patient Monitor', model: 'IntelliVue MX40', manufacturer: 'Philips', serial_number: 'SN-778899', location_id: 101, status: AssetStatus.UNDER_MAINT, purchase_date: '2022-03-01', operating_hours: 3200, risk_score: 45, last_calibration_date: '2023-09-20', next_calibration_date: '2024-09-20', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
];

let inventory: InventoryPart[] = [
  { part_id: 1, part_name: 'MRI Coil', current_stock: 3, min_reorder_level: 2, cost: 5000 },
  { part_id: 2, part_name: 'Ventilator Filter', current_stock: 45, min_reorder_level: 20, cost: 25 },
  { part_id: 3, part_name: 'Infusion Set', current_stock: 12, min_reorder_level: 50, cost: 5 },
  { part_id: 4, part_name: 'ECG Leads', current_stock: 100, min_reorder_level: 30, cost: 15 },
  { part_id: 5, part_name: 'Power Supply Unit', current_stock: 2, min_reorder_level: 5, cost: 350 },
];

let workOrders: WorkOrder[] = [
  { wo_id: 1001, asset_id: 'AST-003', type: WorkOrderType.CORRECTIVE, priority: Priority.HIGH, assigned_to_id: 3, description: 'Pump showing occlusion error continuously.', status: 'Open', created_at: '2023-10-25T09:00:00Z' },
  { wo_id: 1002, asset_id: 'AST-001', type: WorkOrderType.PREVENTIVE, priority: Priority.MEDIUM, assigned_to_id: 3, description: 'Quarterly PM check for MRI.', status: 'In Progress', start_time: '2023-10-26T08:30:00Z', created_at: '2023-10-20T09:00:00Z' },
  { wo_id: 1003, asset_id: 'AST-002', type: WorkOrderType.CALIBRATION, priority: Priority.HIGH, assigned_to_id: 3, description: 'Annual Calibration Due.', status: 'Assigned', created_at: '2023-10-24T14:00:00Z' },
  { wo_id: 9001, asset_id: 'AST-004', type: WorkOrderType.CORRECTIVE, priority: Priority.LOW, assigned_to_id: 3, description: 'Screen flickering occasionally.', status: 'Closed', start_time: '2023-09-15T10:00:00Z', close_time: '2023-09-15T14:00:00Z', created_at: '2023-09-15T08:00:00Z' },
];

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
    { log_id: 1, asset_id: 'AST-002', from_location_id: 101, to_location_id: 201, timestamp: '2023-10-25T10:00:00', user_id: 3 }
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
            asset_id: "AST-002"
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
    { id: 1, type: 'BOUNDARY_CROSSING', message: 'Asset AST-002 (Ventilator) moved out of ICU without authorization.', timestamp: '2023-10-26T14:30:00Z', asset_id: 'AST-002', severity: 'high', status: 'active' },
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
