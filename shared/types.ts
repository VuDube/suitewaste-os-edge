export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// --- SuiteWaste OS Core Types ---
export interface User {
  id: string;
  username: string;
  email?: string;
  password_hash: string;
  role: 'operator' | 'manager' | 'admin' | 'auditor';
  active: boolean;
  features?: string[];
  created_at: number; // epoch millis
}
export interface Session {
  id: string;
  userId: string;
  createdAt: number;
}
export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  epr_number?: string;
  is_weee_compliant: boolean;
  created_at: number; // epoch millis
  updated_at: number; // epoch millis
}
export interface InventoryLedgerEntry {
  id: string;
  supplier_id: string;
  material_type: string;
  weight_kg: number;
  capture_timestamp: number; // epoch millis
  operator_id?: string;
  device_id?: string;
  photo_attachment_key?: string;
  notes?: string;
  is_synced: boolean;
  created_at: number; // epoch millis
}
export interface Transaction {
  id: string;
  ledger_entry_id: string;
  amount: number;
  currency: string;
  payment_method?: string;
  transaction_timestamp: number; // epoch millis
  receipt_key?: string;
  epr_fee: number;
  is_synced: boolean;
  created_at: number; // epoch millis
}
// --- Admin & Reporting Types ---
export interface EPRStreamData {
  weight: number;
  fees: number;
}
export interface EPRReport {
  compliance_pct: number;
  total_fees: number;
  pro_xml_mock_hash?: string; // Mock R2 key for a PRO XML certificate
  streams: {
    [stream: string]: EPRStreamData;
  };
}
export type ConfigUserUpdate = Pick<User, 'id' | 'role' | 'active' | 'features'>;