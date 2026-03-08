export interface StockItem {
    id: number;
    item_code: string;
    name: string;
    category: string;
    unit: string;
    factory: string;
    supplier: string | null;
    starting_balance: number;
    total_incoming: number;
    total_outgoing: number;
    net_stock: number;
    unit_price: number;
    min_stock: number;
    last_updated: string;
}

export interface LedgerEntity {
    id: number;
    [key: string]: any;
    name?: string;
    employee_name?: string;
    account_name?: string;
    phone?: string;
    email?: string;
    registration_date: string;
    document_number: string | null;
    opening_balance: number;
    debit: number;
    credit: number;
    balance: number;
    payment_method: string | null;
    statement: string | null;
}

export interface LedgerTotals {
    total_balance: number;
    total_opening: number;
    total_debit: number;
    total_credit: number;
    count: number;
}

export interface TransactionLog {
    id: number;
    logged_at: string;
    transaction_date: string | null;
    item_code: string;
    item_name: string;
    transaction_type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    supplier: string | null;
    price: number;
    document_type: string | null;
    document_number: string | null;
    notes: string | null;
    factory: string;
}

export interface LedgerLog {
    id: number;
    logged_at: string;
    transaction_date: string | null;
    ledger_type: string;
    entity_code: string;
    entity_name: string;
    transaction_type: string;
    debit: number;
    credit: number;
    previous_balance: number;
    new_balance: number;
    payment_method: string | null;
    document_number: string | null;
    statement: string | null;
}

export interface TreasurySummary {
    config: {
        initialized: boolean;
        starting_capital: number;
        initialization_date: string | null;
        fiscal_year_start: string | null;
        currency: string;
        notes: string | null;
    };
    starting_capital: number;
    total_accounts: number;
    total_opening: number;
    total_debit: number;
    total_credit: number;
    total_balance: number;
    net_change: number;
    current_position: number;
}

export interface SyncResult {
    pushed?: number;
    pulled?: number;
    skipped?: number;
    errors: string[];
}

export const CATEGORIES = [
    { value: 'raw_materials', labelKey: 'cat_raw_materials' },
    { value: 'finished_product', labelKey: 'cat_finished_product' },
    { value: 'packaging', labelKey: 'cat_packaging' },
] as const;

export const UNITS = [
    { value: 'kgs', labelKey: 'unit_kgs' },
    { value: 'litres', labelKey: 'unit_litres' },
    { value: 'pieces', labelKey: 'unit_pieces' },
    { value: 'boxes', labelKey: 'unit_boxes' },
    { value: 'metres', labelKey: 'unit_metres' },
    { value: 'units', labelKey: 'unit_units' },
    { value: 'packs', labelKey: 'unit_packs' },
    { value: 'pallets', labelKey: 'unit_pallets' },
] as const;

export const FACTORIES = [
    { value: 'bahbit', labelKey: 'loc_bahbit' },
    { value: 'old_factory', labelKey: 'loc_old_factory' },
    { value: 'station', labelKey: 'loc_station' },
    { value: 'thaabaneya', labelKey: 'loc_thaabaneya' },
] as const;

export const PAYMENT_METHODS = [
    { value: 'cash', labelKey: 'payment_cash' },
    { value: 'bank_transfer', labelKey: 'payment_bank_transfer' },
    { value: 'digital_wallet', labelKey: 'payment_digital_wallet' },
    { value: 'check', labelKey: 'payment_check' },
] as const;

export const DOCUMENT_TYPES = [
    { value: 'purchase_invoice', labelKey: 'doc_purchase_invoice' },
    { value: 'sales_invoice', labelKey: 'doc_sales_invoice' },
    { value: 'raw_materials_order', labelKey: 'doc_raw_materials_order' },
    { value: 'finished_product_receipt', labelKey: 'doc_finished_product_receipt' },
    { value: 'internal_transfer', labelKey: 'doc_internal_transfer' },
] as const;
