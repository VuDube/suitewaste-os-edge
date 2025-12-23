-- SuiteWaste OS :: D1 Database Schema
-- Version: 1.0
-- Description: Initial schema for suppliers, inventory, and transactions.
-- Enforce foreign key constraints, crucial for data integrity in SQLite.
PRAGMA foreign_keys = ON;
-- --------------------------------------------------------------------------------
-- Table: suppliers
-- Description: Stores information about individuals or companies supplying waste materials.
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    epr_number TEXT,                      -- Extended Producer Responsibility number, for compliance.
    is_weee_compliant BOOLEAN DEFAULT 0,  -- WEEE (Waste Electrical and Electronic Equipment) compliance status.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Trigger to automatically update the 'updated_at' timestamp when a supplier record is modified.
CREATE TRIGGER IF NOT EXISTS update_suppliers_updated_at
AFTER UPDATE ON suppliers
FOR EACH ROW
BEGIN
    UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
-- --------------------------------------------------------------------------------
-- Table: inventory_ledger
-- Description: An immutable log of all materials received, forming the core of the audit trail.
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    material_type TEXT NOT NULL,          -- e.g., 'Copper', 'Aluminum', 'PET Plastic'
    weight_kg REAL NOT NULL,
    capture_timestamp TIMESTAMP NOT NULL, -- The exact moment the weight was captured.
    operator_id TEXT,                     -- ID of the person operating the scale.
    device_id TEXT,                       -- ID of the scale/device used for the measurement.
    photo_attachment_key TEXT,            -- Key for an associated image stored in R2.
    is_synced BOOLEAN DEFAULT 0,          -- Flag for offline-first synchronization status.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);
-- --------------------------------------------------------------------------------
-- Table: transactions
-- Description: Records financial transactions related to inventory ledger entries.
-- --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    ledger_entry_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    payment_method TEXT,                  -- e.g., 'Cash', 'EFT'
    transaction_timestamp TIMESTAMP NOT NULL,
    receipt_key TEXT,                     -- Key for a receipt image/document in R2.
    epr_fee REAL DEFAULT 0.0,             -- Any associated EPR fees for the transaction.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_entry_id) REFERENCES inventory_ledger(id) ON DELETE CASCADE
);
-- --------------------------------------------------------------------------------
-- Indexes for Performance
-- Description: Speeds up common queries on foreign keys and frequently filtered columns.
-- --------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory_ledger(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_material_type ON inventory_ledger(material_type);
CREATE INDEX IF NOT EXISTS idx_transactions_ledger_entry_id ON transactions(ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
-- End of Schema