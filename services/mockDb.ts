
import { Asset, AssetStatus, InventoryPart, Location, Priority, User, UserRole, WorkOrder, WorkOrderType, AssetDocument, MovementLog, DetailedJobOrderReport, Incident, SystemAlert } from '../types';

// Expanded Hospital Locations / Departments
export const LOCATIONS: Location[] = [
  { location_id: 101, name: 'Radio-1', department: 'Radiology', city: 'Tabuk', building: 'Main', room: 'R-101' },
  { location_id: 102, name: 'ICU-4', department: 'Intensive Care', city: 'Tabuk', building: 'Main', room: 'ICU-4' },
  { location_id: 103, name: 'ER-2', department: 'Emergency', city: 'Tabuk', building: 'Main', room: 'ER-Tri' },
  { location_id: 104, name: 'ICU-1', department: 'Intensive Care', city: 'Tabuk', building: 'Main', room: 'ICU-1' },
  { location_id: 105, name: 'Ward-302', department: 'General Ward', city: 'Tabuk', building: 'West Wing', room: '302' },
  { location_id: 106, name: 'OT-A', department: 'Surgery', city: 'Tabuk', building: 'Main', room: 'OT-A' },
  { location_id: 107, name: 'OT-B', department: 'Surgery', city: 'Tabuk', building: 'Main', room: 'OT-B' },
  { location_id: 108, name: 'Lab-Biochem', department: 'Laboratory', city: 'Tabuk', building: 'East Wing', room: 'L-01' },
  { location_id: 109, name: 'Cardio-Echo', department: 'Cardiology', city: 'Tabuk', building: 'Main', room: 'C-10' },
  { location_id: 110, name: 'Neuro-EEG', department: 'Neurology', city: 'Tabuk', building: 'Main', room: 'N-05' },
  { location_id: 111, name: 'NICU-Main', department: 'Neonatal ICU', city: 'Tabuk', building: 'Main', room: 'NICU' },
  { location_id: 112, name: 'Mat-Delivery', department: 'Maternity', city: 'Tabuk', building: 'West Wing', room: 'D-01' },
  { location_id: 113, name: 'Dia-Unit', department: 'Dialysis', city: 'Tabuk', building: 'Annex', room: 'D-Hall' },
  { location_id: 114, name: 'CSSD-Clean', department: 'Sterilization', city: 'Tabuk', building: 'Basement', room: 'B-05' },
  { location_id: 115, name: 'Pharm-Disp', department: 'Pharmacy', city: 'Tabuk', building: 'Main', room: 'Lobby' },
  { location_id: 116, name: 'Ped-Ward', department: 'Pediatrics', city: 'Tabuk', building: 'West Wing', room: '401' },
  { location_id: 117, name: 'Onco-Chemo', department: 'Oncology', city: 'Tabuk', building: 'East Wing', room: 'ONC-1' },
  { location_id: 118, name: 'PT-Gym', department: 'Physical Therapy', city: 'Tabuk', building: 'Annex', room: 'Gym' },
  { location_id: 119, name: 'Maint-Shop', department: 'Maintenance', city: 'Tabuk', building: 'Engineering', room: 'M-Shop' },
  { location_id: 120, name: 'Server-Room', department: 'IT', city: 'Tabuk', building: 'Admin', room: 'IT-01' },
  // Specific for Report
  { location_id: 121, name: 'OPD', department: 'OPD', city: 'Amlaj', building: 'Main Building', room: 'OPD' },
];

export let MOCK_USERS: User[] = [
  { user_id: 1, name: 'Dr. Sarah Smith', role: UserRole.SUPERVISOR, email: 'sarah@hospital.com', location_id: 101, phone_number: '0501234567', department: 'Radiology', password: '123' },
  { user_id: 2, name: 'Abdalla Yasir', role: UserRole.TECHNICIAN, email: 'abdalla@fgc.com', phone_number: '0509876543', department: 'Maintenance', password: '123' },
  { user_id: 3, name: 'Nurse Jackie', role: UserRole.NURSE, email: 'jackie@hospital.com', location_id: 105, phone_number: '0555555555', department: 'General Ward', password: '123' },
  { user_id: 4, name: 'Eng. Mike Ross', role: UserRole.ENGINEER, email: 'mike@hospital.com', phone_number: '0566666666', department: 'Biomedical', password: '123' },
  { user_id: 5, name: 'Admin Head', role: UserRole.ADMIN, email: 'admin@hospital.com', phone_number: '0599999999', department: 'Administration', password: 'admin' },
  { user_id: 6, name: 'Vendor Steve', role: UserRole.VENDOR, email: 'steve@vendor.com', phone_number: '0588888888', department: 'External', password: '123' },
];

// Initial Assets
export let assets: Asset[] = [
  { 
    asset_id: 'NFC-1001', nfc_tag_id: 'NFC-1001', name: 'MRI Scanner', model: 'Siemens Magnetom', location_id: 101, 
    status: AssetStatus.RUNNING, purchase_date: '2019-05-15', warranty_expiration: '2024-05-15', operating_hours: 12000, risk_score: 45, 
    last_calibration_date: '2022-10-26', next_calibration_date: '2023-10-26', 
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0833860?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  },
  { 
    asset_id: 'NFC-1002', nfc_tag_id: 'NFC-1002', name: 'Infusion Pump', model: 'Baxter Sigma', location_id: 102, 
    status: AssetStatus.DOWN, purchase_date: '2021-08-10', warranty_expiration: '2023-08-10', operating_hours: 450, risk_score: 85, 
    last_calibration_date: '2023-01-15', next_calibration_date: '2024-01-15', 
    image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?q=80&w=800&auto=format&fit=crop'
  },
  { 
    asset_id: 'NFC-1003', nfc_tag_id: 'NFC-1003', name: 'X-Ray Machine', model: 'Philips Digital', location_id: 103, 
    status: AssetStatus.RUNNING, purchase_date: '2018-03-22', warranty_expiration: '2023-03-22', operating_hours: 3400, risk_score: 20, 
    last_calibration_date: '2023-03-20', next_calibration_date: '2024-03-20', 
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  },
  { 
    asset_id: 'NFC-1004', nfc_tag_id: 'NFC-1004', name: 'Ventilator', model: 'Hamilton G5', location_id: 104, 
    status: AssetStatus.UNDER_MAINT, purchase_date: '2020-01-10', warranty_expiration: '2022-01-10', operating_hours: 2100, risk_score: 70, 
    last_calibration_date: '2023-06-01', next_calibration_date: '2023-12-01', 
    image: 'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  },
  { 
    asset_id: '17678', nfc_tag_id: '17678', name: 'Vital Signs Monitors', model: 'V100', manufacturer: 'GE', serial_number: 'SH614030057SA', 
    location_id: 121, status: AssetStatus.RUNNING, purchase_date: '2020-01-01', warranty_expiration: '2022-01-01', operating_hours: 1500, risk_score: 10,
    last_calibration_date: '2023-01-01', next_calibration_date: '2024-01-01',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80'
  },
  { asset_id: 'NFC-1005', name: 'Anesthesia Machine', model: 'Drager Fabius', location_id: 106, status: AssetStatus.RUNNING, purchase_date: '2020-05-12', warranty_expiration: '2023-05-12', operating_hours: 1500, risk_score: 10, last_calibration_date: '2023-05-01', next_calibration_date: '2024-05-01', image: 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1006', name: 'Surgical Light', model: 'Maquet Volista', location_id: 106, status: AssetStatus.RUNNING, purchase_date: '2019-11-20', warranty_expiration: '2024-11-20', operating_hours: 2200, risk_score: 5, last_calibration_date: '2023-01-10', next_calibration_date: '2024-01-10', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1007', name: 'Electrosurgical Unit', model: 'Valleylab FT10', location_id: 106, status: AssetStatus.RUNNING, purchase_date: '2021-02-15', warranty_expiration: '2024-02-15', operating_hours: 800, risk_score: 15, last_calibration_date: '2023-08-15', next_calibration_date: '2024-08-15', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1008', name: 'C-Arm', model: 'GE OEC 9900', location_id: 107, status: AssetStatus.UNDER_MAINT, purchase_date: '2018-06-30', warranty_expiration: '2021-06-30', operating_hours: 3100, risk_score: 65, last_calibration_date: '2023-06-01', next_calibration_date: '2023-12-01', image: 'https://images.unsplash.com/photo-1516549655169-df83a0833860?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1009', name: 'Surgical Table', model: 'Steris 5085', location_id: 107, status: AssetStatus.RUNNING, purchase_date: '2019-09-05', warranty_expiration: '2022-09-05', operating_hours: 1800, risk_score: 8, last_calibration_date: '2022-12-12', next_calibration_date: '2023-12-12', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1010', name: 'Patient Monitor', model: 'Philips IntelliVue MX800', location_id: 102, status: AssetStatus.RUNNING, purchase_date: '2022-01-10', warranty_expiration: '2025-01-10', operating_hours: 8500, risk_score: 12, last_calibration_date: '2023-02-01', next_calibration_date: '2024-02-01', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1011', name: 'Defibrillator', model: 'Zoll R Series', location_id: 102, status: AssetStatus.RUNNING, purchase_date: '2020-03-20', warranty_expiration: '2025-03-20', operating_hours: 120, risk_score: 2, last_calibration_date: '2023-09-10', next_calibration_date: '2024-09-10', image: 'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1012', name: 'Syringe Pump', model: 'Alaris GH', location_id: 104, status: AssetStatus.RUNNING, purchase_date: '2021-07-01', warranty_expiration: '2024-07-01', operating_hours: 4500, risk_score: 25, last_calibration_date: '2023-07-01', next_calibration_date: '2024-07-01', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1013', name: 'Ventilator', model: 'Hamilton C1', location_id: 104, status: AssetStatus.DOWN, purchase_date: '2019-04-15', warranty_expiration: '2022-04-15', operating_hours: 15000, risk_score: 88, last_calibration_date: '2023-04-15', next_calibration_date: '2023-10-15', image: 'https://images.unsplash.com/photo-1616391182219-e080b4d1043a?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1014', name: 'Patient Monitor', model: 'GE Carescape B650', location_id: 104, status: AssetStatus.RUNNING, purchase_date: '2022-05-20', warranty_expiration: '2025-05-20', operating_hours: 7200, risk_score: 10, last_calibration_date: '2023-05-20', next_calibration_date: '2024-05-20', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1015', name: 'Hematology Analyzer', model: 'Sysmex XN-1000', location_id: 108, status: AssetStatus.RUNNING, purchase_date: '2018-11-11', warranty_expiration: '2021-11-11', operating_hours: 9000, risk_score: 30, last_calibration_date: '2023-11-01', next_calibration_date: '2024-05-01', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1016', name: 'Chemistry Analyzer', model: 'Roche Cobas 6000', location_id: 108, status: AssetStatus.UNDER_MAINT, purchase_date: '2017-08-22', warranty_expiration: '2020-08-22', operating_hours: 14000, risk_score: 60, last_calibration_date: '2023-08-20', next_calibration_date: '2024-02-20', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1017', name: 'Centrifuge', model: 'Eppendorf 5810', location_id: 108, status: AssetStatus.RUNNING, purchase_date: '2020-02-14', warranty_expiration: '2022-02-14', operating_hours: 1200, risk_score: 5, last_calibration_date: '2023-02-14', next_calibration_date: '2024-02-14', image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1018', name: 'Microscope', model: 'Olympus CX23', location_id: 108, status: AssetStatus.RUNNING, purchase_date: '2021-09-09', warranty_expiration: '2026-09-09', operating_hours: 500, risk_score: 2, last_calibration_date: '2023-09-01', next_calibration_date: '2024-09-01', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1019', name: 'Ultrasound', model: 'Philips EPIQ 7', location_id: 109, status: AssetStatus.RUNNING, purchase_date: '2019-12-01', warranty_expiration: '2022-12-01', operating_hours: 2500, risk_score: 15, last_calibration_date: '2023-12-01', next_calibration_date: '2024-12-01', image: 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1020', name: 'ECG Machine', model: 'GE MAC 2000', location_id: 109, status: AssetStatus.RUNNING, purchase_date: '2021-03-15', warranty_expiration: '2024-03-15', operating_hours: 600, risk_score: 5, last_calibration_date: '2023-03-15', next_calibration_date: '2024-03-15', image: 'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1021', name: 'Stress Test System', model: 'Quinton Q-Stress', location_id: 109, status: AssetStatus.DOWN, purchase_date: '2016-05-05', warranty_expiration: '2019-05-05', operating_hours: 4000, risk_score: 75, last_calibration_date: '2023-05-05', next_calibration_date: '2023-11-05', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1022', name: 'EEG Machine', model: 'Nihon Kohden', location_id: 110, status: AssetStatus.RUNNING, purchase_date: '2020-10-10', warranty_expiration: '2023-10-10', operating_hours: 1100, risk_score: 10, last_calibration_date: '2023-10-10', next_calibration_date: '2024-10-10', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1023', name: 'Infant Incubator', model: 'Drager Isolette 8000', location_id: 111, status: AssetStatus.RUNNING, purchase_date: '2022-06-01', warranty_expiration: '2024-06-01', operating_hours: 8760, risk_score: 5, last_calibration_date: '2023-06-01', next_calibration_date: '2023-12-01', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1024', name: 'Phototherapy Unit', model: 'Natus neoBlue', location_id: 111, status: AssetStatus.RUNNING, purchase_date: '2021-04-20', warranty_expiration: '2023-04-20', operating_hours: 3000, risk_score: 2, last_calibration_date: '2023-04-20', next_calibration_date: '2024-04-20', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1025', name: 'Infant Warmer', model: 'GE Panda', location_id: 111, status: AssetStatus.RUNNING, purchase_date: '2020-08-15', warranty_expiration: '2022-08-15', operating_hours: 5000, risk_score: 12, last_calibration_date: '2023-08-15', next_calibration_date: '2024-02-15', image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1026', name: 'Fetal Monitor', model: 'GE Corometrics 250', location_id: 112, status: AssetStatus.RUNNING, purchase_date: '2019-02-28', warranty_expiration: '2022-02-28', operating_hours: 6000, risk_score: 18, last_calibration_date: '2023-02-28', next_calibration_date: '2024-02-28', image: 'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1027', name: 'Hemodialysis Machine', model: 'Fresenius 5008S', location_id: 113, status: AssetStatus.RUNNING, purchase_date: '2021-01-05', warranty_expiration: '2023-01-05', operating_hours: 7000, risk_score: 40, last_calibration_date: '2023-07-05', next_calibration_date: '2024-01-05', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1028', name: 'Hemodialysis Machine', model: 'Fresenius 5008S', location_id: 113, status: AssetStatus.UNDER_MAINT, purchase_date: '2021-01-05', warranty_expiration: '2023-01-05', operating_hours: 6950, risk_score: 45, last_calibration_date: '2023-01-05', next_calibration_date: '2023-07-05', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1029', name: 'RO Water System', model: 'Gambro WRO', location_id: 113, status: AssetStatus.RUNNING, purchase_date: '2020-03-10', warranty_expiration: '2022-03-10', operating_hours: 20000, risk_score: 30, last_calibration_date: '2023-03-10', next_calibration_date: '2023-09-10', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1030', name: 'Steam Sterilizer', model: 'Getinge GSS67', location_id: 114, status: AssetStatus.RUNNING, purchase_date: '2018-07-20', warranty_expiration: '2021-07-20', operating_hours: 5000, risk_score: 20, last_calibration_date: '2023-07-20', next_calibration_date: '2024-07-20', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1031', name: 'Plasma Sterilizer', model: 'Sterrad 100NX', location_id: 114, status: AssetStatus.DOWN, purchase_date: '2019-11-11', warranty_expiration: '2021-11-11', operating_hours: 3000, risk_score: 80, last_calibration_date: '2023-05-11', next_calibration_date: '2023-11-11', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1032', name: 'Portable X-Ray', model: 'GE AMX 4', location_id: 103, status: AssetStatus.RUNNING, purchase_date: '2017-04-04', warranty_expiration: '2020-04-04', operating_hours: 1500, risk_score: 35, last_calibration_date: '2023-04-04', next_calibration_date: '2024-04-04', image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1033', name: 'Defibrillator', model: 'Zoll R Series', location_id: 103, status: AssetStatus.RUNNING, purchase_date: '2021-09-15', warranty_expiration: '2024-09-15', operating_hours: 80, risk_score: 1, last_calibration_date: '2023-09-15', next_calibration_date: '2024-09-15', image: 'https://images.unsplash.com/photo-1584555613497-9ecf9dd06f68?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1034', name: 'Patient Monitor', model: 'Philips IntelliVue', location_id: 103, status: AssetStatus.RUNNING, purchase_date: '2022-02-20', warranty_expiration: '2025-02-20', operating_hours: 6000, risk_score: 10, last_calibration_date: '2023-02-20', next_calibration_date: '2024-02-20', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1035', name: 'Suction Pump', model: 'Laerdal LSU', location_id: 103, status: AssetStatus.RUNNING, purchase_date: '2020-10-05', warranty_expiration: '2022-10-05', operating_hours: 200, risk_score: 5, last_calibration_date: '2023-10-05', next_calibration_date: '2024-10-05', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1036', name: 'Hospital Bed', model: 'Hillrom Progressa', location_id: 105, status: AssetStatus.RUNNING, purchase_date: '2018-05-15', warranty_expiration: '2021-05-15', operating_hours: 0, risk_score: 5, last_calibration_date: '2023-05-15', next_calibration_date: '2025-05-15', image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1037', name: 'Hospital Bed', model: 'Hillrom Progressa', location_id: 105, status: AssetStatus.RUNNING, purchase_date: '2018-05-15', warranty_expiration: '2021-05-15', operating_hours: 0, risk_score: 5, last_calibration_date: '2023-05-15', next_calibration_date: '2025-05-15', image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1038', name: 'Vital Signs Monitor', model: 'Welch Allyn Connex', location_id: 105, status: AssetStatus.RUNNING, purchase_date: '2021-12-01', warranty_expiration: '2024-12-01', operating_hours: 3000, risk_score: 8, last_calibration_date: '2023-12-01', next_calibration_date: '2024-12-01', image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1039', name: 'Infusion Pump', model: 'Baxter Sigma', location_id: 105, status: AssetStatus.RUNNING, purchase_date: '2021-08-10', warranty_expiration: '2024-08-10', operating_hours: 200, risk_score: 15, last_calibration_date: '2023-08-10', next_calibration_date: '2024-08-10', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1040', name: 'Wheelchair', model: 'Invacare Tracer', location_id: 105, status: AssetStatus.SCRAPPED, purchase_date: '2015-01-01', warranty_expiration: '2016-01-01', operating_hours: 0, risk_score: 0, last_calibration_date: '2020-01-01', next_calibration_date: '2021-01-01', image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1041', name: 'Pediatric Bed', model: 'Stryker Cub', location_id: 116, status: AssetStatus.RUNNING, purchase_date: '2019-07-07', warranty_expiration: '2022-07-07', operating_hours: 0, risk_score: 5, last_calibration_date: '2023-07-07', next_calibration_date: '2025-07-07', image: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1042', name: 'Infusion Pump', model: 'Braun Space', location_id: 116, status: AssetStatus.RUNNING, purchase_date: '2020-09-09', warranty_expiration: '2023-09-09', operating_hours: 4000, risk_score: 20, last_calibration_date: '2023-09-09', next_calibration_date: '2024-09-09', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1043', name: 'Infusion Pump', model: 'Braun Space', location_id: 117, status: AssetStatus.RUNNING, purchase_date: '2020-09-09', warranty_expiration: '2023-09-09', operating_hours: 3800, risk_score: 22, last_calibration_date: '2023-09-09', next_calibration_date: '2024-09-09', image: 'https://plus.unsplash.com/premium_photo-1661333543679-72b21e7f5987?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1044', name: 'Biosafety Cabinet', model: 'Thermo Herasafe', location_id: 117, status: AssetStatus.RUNNING, purchase_date: '2018-03-03', warranty_expiration: '2021-03-03', operating_hours: 12000, risk_score: 40, last_calibration_date: '2023-03-03', next_calibration_date: '2023-09-03', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1045', name: 'Ultrasound Therapy', model: 'Chattanooga Intelect', location_id: 118, status: AssetStatus.RUNNING, purchase_date: '2021-05-05', warranty_expiration: '2024-05-05', operating_hours: 400, risk_score: 5, last_calibration_date: '2023-05-05', next_calibration_date: '2024-05-05', image: 'https://images.unsplash.com/photo-1579684385180-1ea90f842331?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1046', name: 'Treadmill', model: 'Woodway', location_id: 118, status: AssetStatus.RUNNING, purchase_date: '2019-10-10', warranty_expiration: '2022-10-10', operating_hours: 3000, risk_score: 10, last_calibration_date: '2023-10-10', next_calibration_date: '2024-10-10', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1047', name: 'Automated Dispenser', model: 'Omnicell', location_id: 115, status: AssetStatus.RUNNING, purchase_date: '2022-01-01', warranty_expiration: '2025-01-01', operating_hours: 8760, risk_score: 35, last_calibration_date: '2023-01-01', next_calibration_date: '2024-01-01', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1048', name: 'Medication Fridge', model: 'Helmer i.Series', location_id: 115, status: AssetStatus.RUNNING, purchase_date: '2020-06-06', warranty_expiration: '2023-06-06', operating_hours: 25000, risk_score: 25, last_calibration_date: '2023-06-06', next_calibration_date: '2024-06-06', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1049', name: 'PACS Server', model: 'Dell PowerEdge', location_id: 120, status: AssetStatus.RUNNING, purchase_date: '2019-01-01', warranty_expiration: '2022-01-01', operating_hours: 35000, risk_score: 15, last_calibration_date: '2023-01-01', next_calibration_date: '2024-01-01', image: 'https://images.unsplash.com/photo-1558494949-ef526b0042a0?auto=format&fit=crop&w=800&q=80' },
  { asset_id: 'NFC-1050', name: 'Electrical Safety Analyzer', model: 'Fluke ESA615', location_id: 119, status: AssetStatus.RUNNING, purchase_date: '2021-03-03', warranty_expiration: '2024-03-03', operating_hours: 200, risk_score: 0, last_calibration_date: '2023-03-03', next_calibration_date: '2024-03-03', image: 'https://images.unsplash.com/photo-1581092921461-eab62e47a71e?auto=format&fit=crop&w=800&q=80' },
];

export let inventory: InventoryPart[] = [
  { part_id: 1, part_name: 'MRI Coil Connector', current_stock: 2, min_reorder_level: 3, cost: 500 },
  { part_id: 2, part_name: 'Infusion Battery Pack', current_stock: 15, min_reorder_level: 10, cost: 45 },
  { part_id: 3, part_name: 'X-Ray Tube Fuse', current_stock: 5, min_reorder_level: 5, cost: 12 },
  { part_id: 4, part_name: 'Ventilator Filter', current_stock: 0, min_reorder_level: 20, cost: 8 },
];

// GENERATE 500 ADDITIONAL SPARE PARTS
const partTypes = ['Sensor', 'Cable', 'Battery', 'Filter', 'PCB', 'Valve', 'Motor', 'Display', 'Probe', 'Seal', 'Gasket', 'Tubing', 'Power Supply', 'Switch', 'Relay', 'Fan', 'Keyboard', 'Caster', 'Monitor arm', 'Bulb'];
const modifiers = ['Main', 'Auxiliary', 'High Voltage', 'Low Noise', 'Digital', 'Analog', 'Optical', 'Thermal', 'Hydraulic', 'Pneumatic', 'Backup', 'Control', 'Interface'];
const units = ['Assembly', 'Module', 'Kit', 'Unit', 'Board', 'Pack'];

for (let i = 5; i <= 505; i++) {
    const type = partTypes[Math.floor(Math.random() * partTypes.length)];
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    const unit = units[Math.floor(Math.random() * units.length)];
    
    inventory.push({
        part_id: i,
        part_name: `${mod} ${type} ${unit}`,
        current_stock: Math.floor(Math.random() * 50),
        min_reorder_level: Math.floor(Math.random() * 10) + 2,
        cost: Math.floor(Math.random() * 2000) + 5
    });
}

// Initial Incidents (New Table)
export let incidents: Incident[] = [
  {
    incident_id: 1001,
    timestamp: '2023-10-25T08:30:00',
    asset_id: 'NFC-1002',
    reported_by_user_id: 3,
    report_type: 'Corrective',
    description: 'Pump not holding charge',
    status: 'Converted'
  }
];

export let workOrders: WorkOrder[] = [
  { 
    wo_id: 5001, 
    incident_id: 1001,
    asset_id: 'NFC-1002', 
    type: WorkOrderType.CORRECTIVE, 
    priority: Priority.CRITICAL, 
    assigned_to_id: 2, 
    description: 'Pump not holding charge', 
    status: 'Open', 
    created_at: '2023-10-25' 
  },
  { 
    wo_id: 5002, 
    asset_id: 'NFC-1001', 
    type: WorkOrderType.PREVENTIVE, 
    priority: Priority.MEDIUM, 
    assigned_to_id: 2, 
    description: 'Annual calibration', 
    status: 'In Progress', 
    start_time: '2023-10-26T09:00:00',
    created_at: '2023-10-26' 
  },
  { wo_id: 5003, asset_id: 'NFC-1004', type: WorkOrderType.CORRECTIVE, priority: Priority.HIGH, assigned_to_id: 2, description: 'Ventilator screen flickering', status: 'Closed', start_time: '2023-10-20T10:00:00', close_time: '2023-10-20T14:00:00', created_at: '2023-10-20' },
  { wo_id: 5004, asset_id: 'NFC-1011', type: WorkOrderType.PREVENTIVE, priority: Priority.LOW, assigned_to_id: 2, description: 'Routine Inspection', status: 'Closed', start_time: '2023-10-22T08:00:00', close_time: '2023-10-22T09:30:00', created_at: '2023-10-21' },
  { wo_id: 5005, asset_id: 'NFC-1015', type: WorkOrderType.CALIBRATION, priority: Priority.HIGH, assigned_to_id: 4, description: 'Calibration due', status: 'Open', created_at: '2023-10-27' },
  // Specific WO for Report
  { wo_id: 2236, asset_id: '17678', type: WorkOrderType.CORRECTIVE, priority: Priority.HIGH, assigned_to_id: 2, description: 'Not Working', status: 'Closed', created_at: '2025-11-09', close_time: '2025-11-12' },
  // Specific WO for Vendor
  { wo_id: 5099, asset_id: 'NFC-1005', type: WorkOrderType.CORRECTIVE, priority: Priority.MEDIUM, assigned_to_id: 6, description: 'Anesthesia Gas Mixer Repair', status: 'Open', created_at: '2023-11-01' },
];

export const MOCK_DETAILED_REPORTS: DetailedJobOrderReport[] = [
  {
    job_order_no: 2236,
    report_id: 'RPT-2025-001',
    control_no: 'Amlaj/OPD/2236',
    priority: 'High',
    risk_factor: 'High',
    asset: {
      name: 'Vital Signs Monitors',
      model: 'V100',
      manufacturer: 'GE',
      serial_no: 'SH614030057SA',
      asset_id: '17678'
    },
    location: {
      site: 'Amlaj General Hospital',
      building: 'Main Building',
      department: 'OPD',
      room: 'OPD'
    },
    fault_details: {
      failed_date: '09-11-2025',
      fault_description: 'Not Working',
      repair_date: '12-11-2025',
      technician_name: 'Abdalla Yasir',
      remedy_work_done: 'Necessary work was done, the fault was repaired, and the device is working well.'
    },
    qc_analysis: {
      need_spare_parts: 'No Spare Parts Yet',
      need_calibration: false,
      user_errors: false,
      unrepairable: false,
      agent_repair: false,
      partially_working: false,
      incident: false
    },
    approvals: {
      caller: { name: 'Weed Ali Al sidalani', contact: '(053)108-2236' },
      dept_head: { name: 'Weed Ali Al sidalani', date: '12-11-2025 15:30' },
      site_supervisor: { name: 'Eng. Ahmed Najah El Sharef', date: '12-11-2025 15:32' },
      site_admin: { name: 'Eng. Mohamed Salah Al Mailbi', date: '18-11-2025 15:42' }
    }
  }
];

export const MOCK_DOCUMENTS: AssetDocument[] = [
  { doc_id: 1, asset_id: 'NFC-1001', title: 'Siemens Magnetom Service Manual v2.4', type: 'Manual', date: '2019-05-15', url: '#' },
  { doc_id: 2, asset_id: 'NFC-1001', title: 'Calibration Certificate 2022', type: 'Certificate', date: '2022-10-26', url: '#' },
  { doc_id: 3, asset_id: 'NFC-1002', title: 'Baxter Sigma User Guide', type: 'Manual', date: '2021-08-10', url: '#' },
  { doc_id: 4, asset_id: 'NFC-1004', title: 'Hamilton G5 Maint. Log', type: 'Report', date: '2023-06-01', url: '#' },
];

export const MOCK_MOVEMENT_LOGS: MovementLog[] = [
    { log_id: 1, asset_id: 'NFC-1002', from_location_id: 101, to_location_id: 102, timestamp: '2023-10-24T08:30:00', user_id: 2 },
    { log_id: 2, asset_id: 'NFC-1004', from_location_id: 102, to_location_id: 104, timestamp: '2023-10-20T14:15:00', user_id: 3 },
];

export const MOCK_ALERTS: SystemAlert[] = [
  { 
    id: 1, 
    type: 'BOUNDARY_CROSSING', 
    message: 'Infusion Pump (NFC-1002) crossed from ICU to General Ward without authorization.', 
    timestamp: new Date().toISOString(), 
    asset_id: 'NFC-1002', 
    severity: 'high', 
    status: 'active' 
  },
  { 
    id: 2, 
    type: 'STOCK', 
    message: 'Critical low stock: MRI Coil Connectors (2 remaining)', 
    timestamp: new Date().toISOString(), 
    severity: 'medium', 
    status: 'active' 
  },
  {
    id: 3,
    type: 'COMPLIANCE',
    message: 'Calibration overdue for Ventilator (NFC-1013) in ICU-1',
    timestamp: new Date().toISOString(),
    asset_id: 'NFC-1013',
    severity: 'high',
    status: 'active'
  }
];

// Helpers
export const getAssets = () => assets;
export const getInventory = () => inventory;
export const getWorkOrders = () => workOrders;
export const getLocations = () => LOCATIONS;
export const getUsers = () => MOCK_USERS;
export const getLocationName = (id: number) => LOCATIONS.find(l => l.location_id === id)?.name || 'Unknown';
export const getAssetDocuments = (assetId?: string) => assetId ? MOCK_DOCUMENTS.filter(d => d.asset_id === assetId) : MOCK_DOCUMENTS;
export const getMovementLogs = () => MOCK_MOVEMENT_LOGS;
export const getDetailedReports = () => MOCK_DETAILED_REPORTS; // New Helper
export const getSystemAlerts = () => MOCK_ALERTS;

export const getTechnicianWorkOrders = (techId: number) => workOrders.filter(wo => wo.assigned_to_id === techId);

export const updateAssetStatus = (id: string, status: AssetStatus) => {
  assets = assets.map(a => a.asset_id === id ? { ...a, status } : a);
};

export const createWorkOrder = (wo: WorkOrder) => {
  // Database Logic: Create Incident First
  const newIncident: Incident = {
      incident_id: Math.floor(Math.random() * 10000),
      timestamp: new Date().toISOString(),
      asset_id: wo.asset_id,
      reported_by_user_id: 3, // Assuming Nurse 3 for demo
      report_type: wo.type === WorkOrderType.PREVENTIVE ? 'Preventive' : 'Corrective',
      description: wo.description,
      status: 'Converted' // Immediately converting to WO for demo purposes
  };
  incidents = [...incidents, newIncident];

  // Database Logic: Create WO linked to Incident
  const linkedWO = { ...wo, incident_id: newIncident.incident_id };
  workOrders = [...workOrders, linkedWO];
  
  // Logic: Update asset status if critical
  if (wo.priority === Priority.CRITICAL || wo.priority === Priority.HIGH) {
      updateAssetStatus(wo.asset_id, AssetStatus.DOWN);
  }
};

export const startWorkOrder = (woId: number) => {
  workOrders = workOrders.map(w => w.wo_id === woId ? { ...w, status: 'In Progress', start_time: new Date().toISOString() } : w);
};

export const closeWorkOrder = (woId: number) => {
  workOrders = workOrders.map(w => w.wo_id === woId ? { ...w, status: 'Closed', close_time: new Date().toISOString() } : w);
};

export const updateStock = (partId: number, quantityUsed: number) => {
  inventory = inventory.map(i => i.part_id === partId ? { ...i, current_stock: i.current_stock - quantityUsed } : i);
};

export const restockPart = (partId: number, quantityAdded: number) => {
  inventory = inventory.map(i => i.part_id === partId ? { ...i, current_stock: i.current_stock + quantityAdded } : i);
};

export const addAsset = (asset: Asset) => {
  assets = [...assets, asset];
}

export const addUser = (user: User) => {
  MOCK_USERS = [...MOCK_USERS, user];
}
