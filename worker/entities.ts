import { IndexedEntity } from "./core-utils";
import type { Supplier, InventoryLedgerEntry, Transaction, User, Session } from "@shared/types";
import { MOCK_SUPPLIERS, MOCK_INVENTORY_LEDGER, MOCK_TRANSACTIONS, MOCK_USERS } from "@shared/mock-data";
// SESSION ENTITY
export class SessionEntity extends IndexedEntity<Session> {
  static readonly entityName = "session";
  static readonly indexName = "sessions";
  static readonly initialState: Session = {
    id: "",
    userId: "",
    createdAt: 0,
  };
}
// SUPPLIER ENTITY
export class SupplierEntity extends IndexedEntity<Supplier> {
  static readonly entityName = "supplier";
  static readonly indexName = "suppliers";
  static readonly initialState: Supplier = {
    id: "",
    name: "",
    is_weee_compliant: false,
    created_at: 0,
    updated_at: 0,
  };
  static seedData = MOCK_SUPPLIERS;
}
// INVENTORY LEDGER ENTITY
export class InventoryLedgerEntity extends IndexedEntity<InventoryLedgerEntry> {
  static readonly entityName = "inventory_ledger";
  static readonly indexName = "inventory_ledger_entries";
  static readonly initialState: InventoryLedgerEntry = {
    id: "",
    supplier_id: "",
    material_type: "",
    weight_kg: 0,
    capture_timestamp: 0,
    is_synced: false,
    created_at: 0,
  };
  static seedData = MOCK_INVENTORY_LEDGER;
}
// TRANSACTION ENTITY
export class TransactionEntity extends IndexedEntity<Transaction> {
  static readonly entityName = "transaction";
  static readonly indexName = "transactions";
  static readonly initialState: Transaction = {
    id: "",
    ledger_entry_id: "",
    amount: 0,
    currency: "ZAR",
    transaction_timestamp: 0,
    epr_fee: 0,
    is_synced: false,
    created_at: 0,
  };
  static seedData = MOCK_TRANSACTIONS;
}
// USER ENTITY
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = {
    id: "",
    username: "",
    password_hash: "",
    role: "operator",
    active: false,
    features: [],
    created_at: 0,
  };
  static seedData = MOCK_USERS;
}