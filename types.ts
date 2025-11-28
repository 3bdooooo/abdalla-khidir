
export enum UserRole {
  ADMIN = 'Admin',
  SUPERVISOR = 'Supervisor',
  ENGINEER = 'Engineer',
  TECHNICIAN = 'Technician',
  NURSE = 'Nurse',
  VENDOR = 'Vendor',
}

export enum AssetStatus {
  RUNNING = 'Running',
  DOWN = 'Down',
  UNDER_MAINT = 'Under Maint.',
  SCRAPPED = 'Scrapped',
}

export enum WorkOrderType {
  CORRECTIVE = 'Corrective',
  PREVENTIVE = 'Preventive',
  CALIBRATION = 'Calibration',
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

// Location/Department Table
export interface Location {
  location_id: number;
  name: string;
  department: string;
  city?: string;
  building?: string;
  room?: string;
}

// User/Role Table
export interface User {
  user_id: number;
  name: string;
  role: UserRole;
  email: string;
  location_id?: number; 
  // New Fields for User Management
  phone_number?: string;
  password?: string; // Stored plainly for mock/demo purposes
  digital_signature?: string; // Base64 string
  department?: string;
}

// Asset Inventory Table
export interface Asset {
  asset_id: string; // Internal ID
  nfc_tag_id?: string; // Physical Tag ID (often same as asset_id)
  rfid_tag_id?: string; // NEW: RFID EPC Code
  name: string;
  model: string;
  manufacturer?: string;
  serial_number?: string;
  location_id: number; // FK to Location
  status: AssetStatus;
  purchase_date: string; // Date string YYYY-MM-DD
  warranty_expiration?: string; // Added field
  operating_hours: number;
  risk_score: number; // 0-100
  last_calibration_date?: string;
  next_calibration_date?: string;
  image?: string;
  
  // New Financial Fields for TCO
  purchase_cost?: number;
  accumulated_maintenance_cost?: number; // Sum of parts + labor over time
}

// Incident/Trouble Ticket Table
export interface Incident {
  incident_id: number;
  timestamp: string;
  asset_id: string; // FK to Asset
  reported_by_user_id: number; // FK to User
  report_type: 'Corrective' | 'Preventive';
  description: string;
  status: 'Pending' | 'Converted' | 'Closed';
}

// Work Order Table
export interface WorkOrder {
  wo_id: number;
  incident_id?: number; // FK to Incident (Optional, if generated from one)
  asset_id: string; // FK to Asset
  type: WorkOrderType;
  priority: Priority;
  assigned_to_id: number; // FK to User (Technician/Engineer)
  description: string;
  status: 'Open' | 'Assigned' | 'In Progress' | 'Awaiting Approval' | 'Manager Approved' | 'Awaiting Final Acceptance' | 'Closed';
  start_time?: string; // Timestamp
  close_time?: string; // Timestamp
  parts_used?: { part_id: number; quantity: number }[]; // Tracked in WO table
  created_at: string;
  
  // Performance Metrics
  nurse_rating?: number; // 1-5 Star Rating
  is_first_time_fix?: boolean; // Did it get resolved without reopening?

  // Approval Tracking
  approvals?: {
    manager?: {
      user_id: number;
      signature: string;
      timestamp: string;
      approved_time: boolean;
    };
    supervisor?: {
      user_id: number;
      signature: string;
      timestamp: string;
      approved_parts: boolean;
      approved_technical: boolean;
    };
    nurse?: {
      user_id: number;
      signature: string;
      timestamp: string;
      verified: boolean;
    };
  };
}

export interface InventoryPart {
  part_id: number;
  part_name: string;
  current_stock: number;
  min_reorder_level: number;
  cost: number;
}

export interface AssetDocument {
  doc_id: number;
  asset_id: string;
  title: string;
  type: 'Manual' | 'Certificate' | 'Report';
  url: string;
  date: string;
}

export interface MovementLog {
  log_id: number;
  asset_id: string;
  from_location_id: number;
  to_location_id: number;
  timestamp: string;
  user_id: number;
}

// NEW: RFID Gate Log (Auto-Entry/Exit)
export interface RfidGateLog {
  id: number;
  rfid_tag: string;
  asset_id: string;
  gate_location_id: number; // Which department door
  direction: 'ENTER' | 'EXIT';
  timestamp: string;
}

// NEW: Audit Session
export interface AuditSession {
  id: number;
  date: string;
  department: string;
  total_expected: number;
  total_scanned: number;
  missing_assets: string[]; // IDs
  found_assets: string[]; // IDs
  status: 'In Progress' | 'Completed';
}

export interface ClosureReport {
  report_id?: number;
  wo_id: number;
  symptoms: string;
  root_cause: string;
  solution_used: string;
  parts_used: { part_id: number; quantity: number }[];
  technician_signature: string; // Base64 or Text representation
  final_comments: string;
}

// Detailed CM Report
export interface DetailedJobOrderReport {
  job_order_no: number;
  report_id: string;
  control_no: string;
  priority: string;
  risk_factor: string;
  asset: {
    name: string;
    model: string;
    manufacturer: string;
    serial_no: string;
    asset_id: string;
  };
  location: {
    site: string;
    building: string;
    department: string;
    room: string;
  };
  fault_details: {
    failed_date: string;
    fault_description: string;
    repair_date: string;
    technician_name: string;
    remedy_work_done: string;
  };
  spare_parts: {
    part_name: string;
    part_no: string;
    quantity: number;
  }[];
  qc_analysis: {
    need_spare_parts: string;
    need_calibration: boolean;
    user_errors: boolean;
    unrepairable: boolean;
    agent_repair: boolean;
    partially_working: boolean;
    incident: boolean;
  };
  approvals: {
    caller: { name: string; contact: string };
    dept_head: { name: string; date: string };
    site_supervisor: { name: string; date: string };
    site_admin: { name: string; date: string };
  };
}

// Detailed PM Report
export interface PreventiveMaintenanceReport {
  pm_id: string;
  wo_id: number;
  scheduled_date: string;
  completion_date: string;
  technician_name: string;
  asset: {
    name: string;
    model: string;
    serial_no: string;
    asset_id: string;
    location: string;
  };
  checklist: {
    id: number;
    task: string;
    status: 'Pass' | 'Fail' | 'N/A';
    notes?: string;
  }[];
  vital_data: {
    operating_hours: number;
    last_calibration: string;
    electrical_safety_pass: boolean;
  };
  calibration_results: {
    required: boolean;
    status: 'Pass' | 'Fail' | 'N/A';
    certificate_no?: string;
  };
  next_due_date: string;
  approvals: {
    technician_sign: string;
    supervisor_sign: string;
    date: string;
  };
}

export interface SystemAlert {
  id: number;
  type: 'BOUNDARY_CROSSING' | 'COMPLIANCE' | 'STOCK';
  message: string;
  timestamp: string;
  asset_id?: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'resolved';
}
