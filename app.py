"""
Warehouse Stock Logging Desktop App
Built with Eel (Python + HTML/CSS/JS)
Data stored in CSV files with transaction logging
"""

import eel
import csv
import os
import sys
from datetime import datetime
from threading import Lock

# Determine if running as frozen exe or script
def get_base_path():
    """Get the base path for resources (web folder)"""
    if getattr(sys, 'frozen', False):
        # Running as compiled exe
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def get_data_path():
    """Get the path for data storage (AppData on Windows)"""
    if sys.platform == 'win32':
        appdata = os.environ.get('APPDATA', os.path.expanduser('~'))
        data_dir = os.path.join(appdata, 'WarehouseStockLogger')
    else:
        # For other platforms, use home directory
        data_dir = os.path.join(os.path.expanduser('~'), '.warehouse_stock_logger')
    
    # Create directory if it doesn't exist
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    return data_dir

# Set up paths
BASE_PATH = get_base_path()
DATA_PATH = get_data_path()

# Initialize Eel with web folder
eel.init(os.path.join(BASE_PATH, 'web'))

# Factory-specific stock files (one per factory)
FACTORY_STOCK_FILES = {
    'bahbit': os.path.join(DATA_PATH, 'stock_bahbit.csv'),
    'old_factory': os.path.join(DATA_PATH, 'stock_old_factory.csv'),
    'station': os.path.join(DATA_PATH, 'stock_station.csv'),
    'thaabaneya': os.path.join(DATA_PATH, 'stock_thaabaneya.csv')
}

# Legacy stock file (kept for reference, no longer used)
STOCK_FILE_LEGACY = os.path.join(DATA_PATH, 'stock_data.csv')

TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'transactions_log.csv')
EXPORTS_FOLDER = os.path.join(DATA_PATH, 'exports')

# Transaction-only files (no edits/deletions - just pure operations)
STOCK_TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'stock_transactions.csv')

# Per-module transaction files (only actual operations: new entries, financial movements)
CUSTOMER_TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'customer_transactions.csv')
SUPPLIER_TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'supplier_transactions.csv')
TREASURY_TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'treasury_transactions.csv')
COVENANT_TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'covenant_transactions.csv')
ADVANCE_TRANSACTIONS_FILE = os.path.join(DATA_PATH, 'advance_transactions.csv')

# Map ledger type to its transaction file
LEDGER_TRANSACTION_FILES = {
    'customer': os.path.join(DATA_PATH, 'customer_transactions.csv'),
    'supplier': os.path.join(DATA_PATH, 'supplier_transactions.csv'),
    'treasury': os.path.join(DATA_PATH, 'treasury_transactions.csv'),
    'covenant': os.path.join(DATA_PATH, 'covenant_transactions.csv'),
    'advance': os.path.join(DATA_PATH, 'advance_transactions.csv'),
}

# Version file
VERSION_FILE = os.path.join(BASE_PATH, 'version.json')

# Current app version
APP_VERSION = "1.35"

# New ledger files
CUSTOMERS_FILE = os.path.join(DATA_PATH, 'customers_ledger.csv')
SUPPLIERS_FILE = os.path.join(DATA_PATH, 'suppliers_ledger.csv')
TREASURY_FILE = os.path.join(DATA_PATH, 'treasury_ledger.csv')
TREASURY_CONFIG_FILE = os.path.join(DATA_PATH, 'treasury_config.csv')
COVENANTS_FILE = os.path.join(DATA_PATH, 'covenants_ledger.csv')
ADVANCES_FILE = os.path.join(DATA_PATH, 'advances_ledger.csv')
LEDGER_LOG_FILE = os.path.join(DATA_PATH, 'ledger_transactions_log.csv')

# Thread lock for file operations
file_lock = Lock()

# CSV column headers
STOCK_HEADERS = ['id', 'name', 'category', 'unit', 'location', 'supplier', 'starting_balance', 'total_incoming', 'total_outgoing', 'net_stock', 'unit_price', 'min_stock', 'last_updated']
TRANSACTION_HEADERS = ['timestamp', 'transaction_date', 'item_id', 'item_name', 'transaction_type', 'quantity', 'previous_stock', 'new_stock', 'supplier', 'price', 'document_type', 'document_number', 'notes', 'factory']

# Transaction-only headers (pure operations without edits/deletions)
STOCK_TRANSACTION_HEADERS = ['timestamp', 'transaction_date', 'item_id', 'item_name', 'transaction_type', 'quantity', 'previous_stock', 'new_stock', 'supplier', 'price', 'document_type', 'document_number', 'notes', 'factory']

# Per-module ledger transaction headers (same structure, each module gets its own file)
LEDGER_TRANSACTION_HEADERS = ['timestamp', 'transaction_date', 'entity_id', 'entity_name', 'transaction_type', 'debit', 'credit', 'previous_balance', 'new_balance', 'payment_method', 'document_number', 'statement']

# Ledger headers for Customers (factories that buy from us)
CUSTOMER_HEADERS = ['id', 'name', 'phone', 'email', 'registration_date', 'document_number', 'opening_balance', 'debit', 'credit', 'balance', 'payment_method', 'statement']

# Ledger headers for Suppliers (those who supply to us)
SUPPLIER_HEADERS = ['id', 'name', 'phone', 'email', 'registration_date', 'document_number', 'opening_balance', 'debit', 'credit', 'balance', 'payment_method', 'statement']

# Treasury headers (account_number as unique identifier)
TREASURY_HEADERS = ['account_number', 'account_name', 'registration_date', 'document_number', 'opening_balance', 'debit', 'credit', 'balance', 'payment_method', 'statement']

# Treasury configuration headers (for initialization status and starting capital)
TREASURY_CONFIG_HEADERS = ['initialized', 'starting_capital', 'initialization_date', 'fiscal_year_start', 'currency', 'notes', 'last_updated']

# Covenants headers (employee name instead of ID)
COVENANT_HEADERS = ['id', 'employee_name', 'phone', 'registration_date', 'document_number', 'opening_balance', 'debit', 'credit', 'balance', 'payment_method', 'statement']

# Advances headers (employee advances)
ADVANCE_HEADERS = ['id', 'employee_name', 'phone', 'registration_date', 'document_number', 'opening_balance', 'debit', 'credit', 'balance', 'payment_method', 'statement']

# Ledger transaction log headers
LEDGER_LOG_HEADERS = ['timestamp', 'transaction_date', 'ledger_type', 'entity_id', 'entity_name', 'transaction_type', 'debit', 'credit', 'previous_balance', 'new_balance', 'payment_method', 'document_number', 'statement']

# Payment methods
PAYMENT_METHODS = ['cash', 'bank_transfer', 'digital_wallet', 'check']

# Available units for dropdown
UNITS = ['kgs', 'litres', 'pieces', 'boxes', 'metres', 'units', 'packs', 'pallets']

# Item categories
CATEGORIES = ['raw_materials', 'finished_product', 'packaging']

# Warehouse locations
LOCATIONS = ['bahbit', 'old_factory', 'station', 'thaabaneya']

# Sub-locations (same for all locations)
SUB_LOCATIONS = ['production_line_1', 'production_line_2', 'production_line_3', 'production_line_4', 'internal_transfer']

# Delete password (change this to your preferred password)
DELETE_PASSWORD = '2048'


def get_stock_file(factory):
    """Get the stock file path for a specific factory"""
    if factory and factory in FACTORY_STOCK_FILES:
        return FACTORY_STOCK_FILES[factory]
    # Default to bahbit if no factory specified
    return FACTORY_STOCK_FILES['bahbit']


def get_all_stock_files():
    """Get all factory stock file paths"""
    return FACTORY_STOCK_FILES


def ensure_csv_exists(filepath, headers):
    """Create CSV file with headers if it doesn't exist"""
    if not os.path.exists(filepath):
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()


def read_csv(filepath, headers):
    """Read all rows from a CSV file"""
    ensure_csv_exists(filepath, headers)
    with file_lock:
        with open(filepath, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            return list(reader)


def write_csv(filepath, headers, rows):
    """Write all rows to a CSV file"""
    with file_lock:
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)


def append_csv(filepath, headers, row):
    """Append a single row to a CSV file"""
    ensure_csv_exists(filepath, headers)
    with file_lock:
        with open(filepath, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writerow(row)


def migrate_csv_headers(filepath, expected_headers):
    """
    Migrate a CSV file to include new headers while preserving existing data.
    New columns will be added with empty values for existing rows.
    
    Args:
        filepath: Path to the CSV file
        expected_headers: List of expected headers (the new schema)
    
    Returns:
        bool: True if migration was performed, False if no migration needed
    """
    if not os.path.exists(filepath):
        return False
    
    with file_lock:
        # Read the current file to get existing headers
        with open(filepath, 'r', newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            try:
                current_headers = next(reader)
            except StopIteration:
                # Empty file, no migration needed
                return False
        
        # Check if migration is needed
        missing_headers = [h for h in expected_headers if h not in current_headers]
        if not missing_headers:
            return False  # No migration needed
        
        print(f"[MIGRATION] Migrating {filepath}")
        print(f"[MIGRATION] Adding missing columns: {missing_headers}")
        
        # Read all existing data
        with open(filepath, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            existing_data = list(reader)
        
        # Add missing columns with empty values to each row
        for row in existing_data:
            for header in missing_headers:
                if header not in row:
                    row[header] = ''
        
        # Write back with new headers
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=expected_headers)
            writer.writeheader()
            writer.writerows(existing_data)
        
        print(f"[MIGRATION] Successfully migrated {len(existing_data)} rows")
        return True


def run_migrations():
    """Run all CSV migrations on startup"""
    print("[MIGRATION] Checking for CSV schema migrations...")
    
    migrations_performed = 0
    
    # Migrate transactions file
    if migrate_csv_headers(TRANSACTIONS_FILE, TRANSACTION_HEADERS):
        migrations_performed += 1
    
    # Migrate stock files for each factory
    for factory, stock_file in FACTORY_STOCK_FILES.items():
        if migrate_csv_headers(stock_file, STOCK_HEADERS):
            migrations_performed += 1
    
    # Migrate ledger files
    if migrate_csv_headers(CUSTOMERS_FILE, CUSTOMER_HEADERS):
        migrations_performed += 1
    if migrate_csv_headers(SUPPLIERS_FILE, SUPPLIER_HEADERS):
        migrations_performed += 1
    if migrate_csv_headers(TREASURY_FILE, TREASURY_HEADERS):
        migrations_performed += 1
    if migrate_csv_headers(COVENANTS_FILE, COVENANT_HEADERS):
        migrations_performed += 1
    if migrate_csv_headers(ADVANCES_FILE, ADVANCE_HEADERS):
        migrations_performed += 1
    if migrate_csv_headers(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS):
        migrations_performed += 1
    
    if migrations_performed > 0:
        print(f"[MIGRATION] Completed {migrations_performed} migration(s)")
    else:
        print("[MIGRATION] No migrations needed")


def log_transaction(item_id, item_name, trans_type, quantity, prev_stock, new_stock, supplier='', price=0, document_type='', document_number='', notes='', custom_date='', factory=''):
    """Log a transaction to both the full log and transaction-only file"""
    # Always record the actual timestamp when the transaction was logged
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Store the user-specified transaction date separately (if provided)
    # This is the date the transaction actually occurred (e.g., backdated entries)
    transaction_date = custom_date if custom_date else ''
    
    transaction = {
        'timestamp': timestamp,
        'transaction_date': transaction_date,
        'item_id': item_id,
        'item_name': item_name,
        'transaction_type': trans_type,
        'quantity': quantity,
        'previous_stock': prev_stock,
        'new_stock': new_stock,
        'supplier': supplier,
        'price': price,
        'document_type': document_type,
        'document_number': document_number,
        'notes': notes,
        'factory': factory
    }
    
    # Log to full transaction log (includes edits/deletions)
    append_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, transaction)
    
    # Log to transaction-only file (only actual operations: incoming, outgoing, transfers, initial)
    if trans_type in ['وارد', 'صادر', 'رصيد افتتاحي', 'تحويل داخلي (وارد)', 'تحويل داخلي (صادر)', 'تحويل داخلي (وارد جديد)']:
        stock_transaction = {
            **transaction,
            'factory': factory
        }
        append_csv(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS, stock_transaction)


def log_ledger_transaction(ledger_type, entity_id, entity_name, trans_type, debit, credit, prev_balance, new_balance, payment_method='', document_number='', statement='', transaction_date=''):
    """Log a ledger transaction to both the full log and the per-module transaction file
    
    Args:
        ledger_type: 'customer', 'supplier', 'treasury', 'covenant', 'advance'
        transaction_date: The user-specified date for the transaction (optional)
    """
    try:
        print(f"[LOG] Attempting to log: {ledger_type} - {entity_id} - {entity_name}")
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Full log entry (includes ledger_type for the combined log)
        full_log_entry = {
            'timestamp': timestamp,
            'transaction_date': transaction_date,
            'ledger_type': ledger_type,
            'entity_id': entity_id,
            'entity_name': entity_name,
            'transaction_type': trans_type,
            'debit': debit,
            'credit': credit,
            'previous_balance': prev_balance,
            'new_balance': new_balance,
            'payment_method': payment_method,
            'document_number': document_number,
            'statement': statement
        }
        
        # Log to full combined transaction log (includes edits/deletions)
        append_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, full_log_entry)
        
        # Log to per-module transaction file (only actual operations: new entries & financial movements)
        if trans_type in ['جديد', 'تحديث'] and (float(debit or 0) != 0 or float(credit or 0) != 0 or trans_type == 'جديد'):
            module_transaction = {
                'timestamp': timestamp,
                'transaction_date': transaction_date,
                'entity_id': entity_id,
                'entity_name': entity_name,
                'transaction_type': trans_type,
                'debit': debit,
                'credit': credit,
                'previous_balance': prev_balance,
                'new_balance': new_balance,
                'payment_method': payment_method,
                'document_number': document_number,
                'statement': statement
            }
            
            transaction_file = LEDGER_TRANSACTION_FILES.get(ledger_type)
            if transaction_file:
                append_csv(transaction_file, LEDGER_TRANSACTION_HEADERS, module_transaction)
                print(f"[LOG] Logged to {ledger_type}_transactions.csv")
        
        print(f"[LOG] Successfully logged: {ledger_type} - {entity_id}")
    except Exception as e:
        import traceback
        print(f"Error logging ledger transaction: {e}")
        traceback.print_exc()


def get_current_date():
    """Get current date in dd/mm/yyyy format"""
    return datetime.now().strftime('%d/%m/%Y')


@eel.expose
def get_units():
    """Return available units for dropdown"""
    return UNITS


@eel.expose
def get_categories():
    """Return available categories for dropdown"""
    return CATEGORIES


@eel.expose
def get_locations():
    """Return available warehouse locations for dropdown"""
    return LOCATIONS


@eel.expose
def get_sub_locations():
    """Return available sub-locations for dropdown"""
    return SUB_LOCATIONS


@eel.expose
def generate_next_id(factory=None):
    """Generate the next available ID for a specific factory (IDs are local to each factory)"""
    max_num = 0
    
    # Only check the current factory's stock file
    if factory:
        stock_file = get_stock_file(factory)
        items = read_csv(stock_file, STOCK_HEADERS)
        for item in items:
            item_id = item.get('id', '')
            if item_id.startswith('ITEM-'):
                try:
                    num = int(item_id.split('-')[1])
                    max_num = max(max_num, num)
                except (ValueError, IndexError):
                    pass
    
    return f'ITEM-{str(max_num + 1).zfill(3)}'


@eel.expose
def check_item_exists(item_id, factory=None):
    """Check if an item with the given ID exists in the specified factory (items are local to each factory)"""
    if not item_id or not item_id.strip():
        return {'exists': False, 'item': None}
    
    if not factory:
        return {'exists': False, 'item': None}
    
    item_id_clean = item_id.strip().upper()
    stock_file = get_stock_file(factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    
    for item in items:
        if item['id'].strip().upper() == item_id_clean:
            return {'exists': True, 'item': item}
    
    return {'exists': False, 'item': None}


@eel.expose
def add_new_item(item_id, name, category, unit, location, supplier, starting_balance, unit_price, min_stock, balance_date=''):
    """Add a new item to the stock for a specific factory"""
    # Validation - supplier is NOT required for new items (only for imports/exports)
    if not all([item_id, name, category, unit, location]):
        return {'success': False, 'message': 'All required fields must be filled'}
    
    item_id = item_id.strip().upper()
    
    # Extract factory from location (format: "factory|sublocation" or just "factory")
    location_parts = location.strip().split('|')
    factory = location_parts[0] if location_parts else 'bahbit'
    
    # Check for duplicates within this factory
    result = check_item_exists(item_id, factory)
    if result['exists']:
        return {'success': False, 'message': f'Item with ID "{item_id}" already exists in this factory. Use "Update Stock" instead.'}
    
    # Note: Same item ID can exist in different factories (that's how transfers work)
    
    # Validate starting balance
    try:
        starting_balance = float(starting_balance)
        if starting_balance < 0:
            return {'success': False, 'message': 'Starting balance cannot be negative'}
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Starting balance must be a valid number'}
    
    # Validate unit
    if unit not in UNITS:
        return {'success': False, 'message': f'Invalid unit. Must be one of: {", ".join(UNITS)}'}
    
    # Validate category
    if category not in CATEGORIES:
        return {'success': False, 'message': f'Invalid category.'}
    
    # Validate unit price
    try:
        unit_price = float(unit_price) if unit_price else 0
        if unit_price < 0:
            return {'success': False, 'message': 'Unit price cannot be negative'}
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Unit price must be a valid number'}
    
    # Validate min stock
    try:
        min_stock = float(min_stock) if min_stock else 0
        if min_stock < 0:
            return {'success': False, 'message': 'Minimum stock cannot be negative'}
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Minimum stock must be a valid number'}
    
    # Use provided date or current date
    if balance_date:
        # Convert from yyyy-mm-dd (HTML date input) to dd/mm/yyyy
        try:
            from datetime import datetime as dt
            parsed_date = dt.strptime(balance_date, '%Y-%m-%d')
            item_date = parsed_date.strftime('%d/%m/%Y')
        except:
            item_date = get_current_date()
    else:
        item_date = get_current_date()
    
    # Create new item
    new_item = {
        'id': item_id,
        'name': name.strip(),
        'category': category,
        'unit': unit,
        'location': location.strip(),
        'supplier': supplier.strip() if supplier else '',
        'starting_balance': starting_balance,
        'total_incoming': 0,
        'total_outgoing': 0,
        'net_stock': starting_balance,
        'unit_price': unit_price,
        'min_stock': min_stock,
        'last_updated': item_date
    }
    
    # Save to factory-specific file
    stock_file = get_stock_file(factory)
    append_csv(stock_file, STOCK_HEADERS, new_item)
    
    # Log the transaction
    log_transaction(
        item_id=item_id,
        item_name=name.strip(),
        trans_type='افتتاحي',
        quantity=starting_balance,
        prev_stock=0,
        new_stock=starting_balance,
        supplier=supplier.strip() if supplier else '',
        price=unit_price,
        document_type='',
        document_number='',
        notes='تم إضافة صنف جديد للمخزون',
        custom_date=balance_date,
        factory=factory
    )
    
    return {'success': True, 'message': f'Item "{name}" added successfully with starting balance of {starting_balance} {unit}'}


@eel.expose
def update_stock(item_id, transaction_type, quantity, supplier='', price=0, document_type='', document_number='', notes='', transaction_date='', source_factory='', dest_factory=''):
    """Update stock for an existing item (incoming, outgoing, or internal transfer between factories)"""
    if not item_id:
        return {'success': False, 'message': 'Item ID is required'}
    
    item_id = item_id.strip().upper()
    
    # Validate quantity
    try:
        quantity = float(quantity)
        if quantity <= 0:
            return {'success': False, 'message': 'Quantity must be greater than 0'}
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Quantity must be a valid number'}
    
    # Validate transaction type
    if transaction_type not in ['incoming', 'outgoing', 'transfer']:
        return {'success': False, 'message': 'Transaction type must be "incoming", "outgoing", or "transfer"'}
    
    # Validate supplier for incoming transactions
    if transaction_type == 'incoming' and not supplier.strip():
        return {'success': False, 'message': 'Supplier name is required for incoming stock'}
    
    # Validate price for incoming transactions
    if transaction_type == 'incoming':
        try:
            price = float(price) if price else 0
            if price < 0:
                return {'success': False, 'message': 'Price cannot be negative'}
        except (ValueError, TypeError):
            return {'success': False, 'message': 'Price must be a valid number'}
    
    # For internal transfers, we need both source and destination factories
    if transaction_type == 'transfer':
        if not source_factory or not dest_factory:
            return {'success': False, 'message': 'Both source and destination factories are required for transfers'}
        if source_factory == dest_factory:
            return {'success': False, 'message': 'Source and destination factories must be different'}
        
        return _handle_internal_transfer(item_id, quantity, source_factory, dest_factory, notes, transaction_date)
    
    # For incoming/outgoing, we need to know which factory
    if not source_factory:
        return {'success': False, 'message': 'Factory context is required'}
    
    # Check if item exists in the source factory
    result = check_item_exists(item_id, source_factory)
    if not result['exists']:
        return {'success': False, 'message': f'Item with ID "{item_id}" does not exist in this factory. Add it as a new item first.'}
    
    # Read items from factory-specific file
    stock_file = get_stock_file(source_factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    updated = False
    
    for item in items:
        if item['id'].strip().upper() == item_id:
            prev_stock = float(item['net_stock'])
            total_incoming = float(item['total_incoming'])
            total_outgoing = float(item['total_outgoing'])
            starting_balance = float(item['starting_balance'])
            current_price = float(item.get('unit_price', 0) or 0)
            
            if transaction_type == 'incoming':
                # Calculate weighted average price
                total_value = current_price * prev_stock + price * quantity
                new_total_qty = prev_stock + quantity
                new_avg_price = total_value / new_total_qty if new_total_qty > 0 else price
                
                total_incoming += quantity
                trans_label = 'وارد'
                item['unit_price'] = round(new_avg_price, 2)
            else:  # outgoing
                # Check if outgoing would result in negative stock
                if quantity > prev_stock:
                    return {'success': False, 'message': f'Cannot remove {quantity} {item["unit"]}. Only {prev_stock} {item["unit"]} available in stock.'}
                total_outgoing += quantity
                trans_label = 'صادر'
                price = 0  # No price for outgoing
            
            new_stock = starting_balance + total_incoming - total_outgoing
            
            item['total_incoming'] = total_incoming
            item['total_outgoing'] = total_outgoing
            item['net_stock'] = new_stock
            item['last_updated'] = get_current_date()
            
            # Log the transaction (supplier only for incoming)
            trans_supplier = supplier.strip() if transaction_type == 'incoming' else ''
            log_transaction(item_id, item['name'], trans_label, quantity, prev_stock, new_stock, trans_supplier, price, document_type, document_number, notes, transaction_date, factory)
            
            updated = True
            break
    
    if updated:
        write_csv(stock_file, STOCK_HEADERS, items)
        action = 'added to' if transaction_type == 'incoming' else 'removed from'
        return {'success': True, 'message': f'{quantity} {result["item"]["unit"]} {action} stock. New balance: {new_stock} {result["item"]["unit"]}'}
    
    return {'success': False, 'message': 'Failed to update stock'}


def _handle_internal_transfer(item_id, quantity, source_factory, dest_factory, notes='', transaction_date=''):
    """Handle internal transfer between factories - creates new item in destination if needed"""
    
    # Check if item exists in source factory
    source_result = check_item_exists(item_id, source_factory)
    if not source_result['exists']:
        return {'success': False, 'message': f'Item "{item_id}" does not exist in the source factory.'}
    
    source_item = source_result['item']
    source_stock = float(source_item['net_stock'])
    
    # Check if we have enough stock in source
    if quantity > source_stock:
        return {'success': False, 'message': f'Cannot transfer {quantity} {source_item["unit"]}. Only {source_stock} {source_item["unit"]} available.'}
    
    # Get source factory file and items
    source_file = get_stock_file(source_factory)
    source_items = read_csv(source_file, STOCK_HEADERS)
    
    # Update source factory - reduce stock
    for item in source_items:
        if item['id'].strip().upper() == item_id:
            prev_stock = float(item['net_stock'])
            total_outgoing = float(item['total_outgoing'])
            starting_balance = float(item['starting_balance'])
            total_incoming = float(item['total_incoming'])
            
            total_outgoing += quantity
            new_stock = starting_balance + total_incoming - total_outgoing
            
            item['total_outgoing'] = total_outgoing
            item['net_stock'] = new_stock
            item['last_updated'] = get_current_date()
            
            # Log export transaction with marker for destination
            export_notes = f'[FROM:{source_factory}|TO:{dest_factory}] {notes}'.strip()
            log_transaction(item_id, item['name'], 'تحويل داخلي (صادر)', quantity, prev_stock, new_stock, '', 0, '', '', export_notes, transaction_date, source_factory)
            break
    
    write_csv(source_file, STOCK_HEADERS, source_items)
    
    # Check if item exists in destination factory
    dest_result = check_item_exists(item_id, dest_factory)
    dest_file = get_stock_file(dest_factory)
    
    if dest_result['exists']:
        # Item exists in destination - add to its stock
        dest_items = read_csv(dest_file, STOCK_HEADERS)
        
        for item in dest_items:
            if item['id'].strip().upper() == item_id:
                prev_stock = float(item['net_stock'])
                total_incoming = float(item['total_incoming'])
                starting_balance = float(item['starting_balance'])
                total_outgoing = float(item['total_outgoing'])
                
                total_incoming += quantity
                new_stock = starting_balance + total_incoming - total_outgoing
                
                item['total_incoming'] = total_incoming
                item['net_stock'] = new_stock
                item['last_updated'] = get_current_date()
                
                # Log import transaction
                import_notes = f'[FROM:{source_factory}|TO:{dest_factory}] {notes}'.strip()
                log_transaction(item_id, item['name'], 'تحويل داخلي (وارد)', quantity, prev_stock, new_stock, '', 0, '', '', import_notes, transaction_date, dest_factory)
                break
        
        write_csv(dest_file, STOCK_HEADERS, dest_items)
    else:
        # Item does NOT exist in destination - create new item with transferred quantity as starting balance
        # Leave non-essential fields blank for the user to fill in via Edit
        new_item = {
            'id': item_id,
            'name': source_item['name'],  # Copy name from source
            'category': source_item['category'],  # Copy category from source
            'unit': source_item['unit'],  # Copy unit from source
            'location': dest_factory,  # Set to destination factory
            'supplier': '',  # Leave blank - to be edited
            'starting_balance': quantity,  # The transferred quantity becomes the starting balance
            'total_incoming': 0,
            'total_outgoing': 0,
            'net_stock': quantity,
            'unit_price': float(source_item.get('unit_price', 0) or 0),  # Copy price from source
            'min_stock': 0,  # Leave blank - to be edited
            'last_updated': get_current_date()
        }
        
        append_csv(dest_file, STOCK_HEADERS, new_item)
        
        # Log import transaction for the new item
        import_notes = f'[FROM:{source_factory}|TO:{dest_factory}] تم إنشاء صنف جديد من التحويل - {notes}'.strip()
        log_transaction(item_id, source_item['name'], 'تحويل داخلي (وارد جديد)', quantity, 0, quantity, '', 0, '', '', import_notes, transaction_date, dest_factory)
    
    return {'success': True, 'message': f'Successfully transferred {quantity} {source_item["unit"]} from {source_factory} to {dest_factory}'}


@eel.expose
def get_all_items(filters=None):
    """Get all items for a specific factory"""
    factory = filters.get('factory') if filters else None
    
    if not factory:
        # If no factory specified, return empty - factory context is required
        return []
    
    # Read from factory-specific file
    stock_file = get_stock_file(factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    
    if filters:
        # Apply additional filters
        if filters.get('category'):
            items = [i for i in items if i.get('category', '') == filters['category']]
        
        if filters.get('supplier'):
            filter_supplier = filters['supplier'].lower().strip()
            items = [i for i in items if filter_supplier in (i.get('supplier', '') or '').lower()]
        
        if filters.get('location'):
            filter_loc = filters['location']
            items = [i for i in items if (i.get('location', '') or '').startswith(filter_loc)]
        
        if filters.get('unit'):
            items = [i for i in items if i.get('unit', '') == filters['unit']]
        
        if filters.get('search'):
            search = filters['search'].lower().strip()
            items = [i for i in items if search in (i.get('id', '') or '').lower() or search in (i.get('name', '') or '').lower()]
        
        if filters.get('low_stock'):
            try:
                threshold = float(filters['low_stock'])
                items = [i for i in items if float(i.get('net_stock', 0) or 0) <= threshold]
            except ValueError:
                pass
    
    return items


@eel.expose
def get_all_transactions(filters=None):
    """Get all transactions, optionally filtered. 
    When factory filter is provided, show transactions for that factory including inter-factory transfers."""
    transactions = read_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
    
    # If factory filter is provided, filter transactions
    factory_filter = filters.get('factory') if filters else None
    
    if factory_filter:
        # Build lookup of items by ID for backward compatibility with old entries missing factory field
        items_by_id = {}
        stock_file = get_stock_file(factory_filter)
        items = read_csv(stock_file, STOCK_HEADERS)
        for item in items:
            items_by_id[item['id'].strip().upper()] = factory_filter
        
        filtered_transactions = []
        for t in transactions:
            notes = t.get('notes', '') or ''
            trans_type = t.get('transaction_type', '') or ''
            trans_factory = (t.get('factory', '') or '').strip().lower()
            item_id = (t.get('item_id', '') or '').strip().upper()
            
            # Check if this is an inter-factory transfer by parsing notes
            # Format: [FROM:source|TO:destination]
            is_transfer = '[FROM:' in notes and '|TO:' in notes
            
            if is_transfer:
                # Extract source and destination factories
                import re
                match = re.search(r'\[FROM:([^|]+)\|TO:([^\]]+)\]', notes)
                if match:
                    source_factory = match.group(1)
                    dest_factory = match.group(2)
                    
                    # Determine if this log entry belongs to the current factory
                    # Export logs (صادر) belong to the SOURCE factory
                    # Import logs (وارد) belong to the DESTINATION factory
                    is_export_log = 'صادر' in trans_type
                    is_import_log = 'وارد' in trans_type
                    
                    should_include = False
                    if is_export_log and source_factory == factory_filter:
                        # This is an export log and we're at the source factory
                        should_include = True
                    elif is_import_log and dest_factory == factory_filter:
                        # This is an import log and we're at the destination factory
                        should_include = True
                    
                    if should_include:
                        # Create a modified transaction for display
                        modified_trans = dict(t)
                        
                        # Add factory context for display
                        if is_export_log:
                            modified_trans['factory_view'] = 'export'
                            modified_trans['transfer_partner'] = dest_factory
                        else:
                            modified_trans['factory_view'] = 'import'
                            modified_trans['transfer_partner'] = source_factory
                        
                        filtered_transactions.append(modified_trans)
            else:
                # Regular transaction - include if factory column matches
                # This ensures transactions for deleted items still appear
                if trans_factory and trans_factory == factory_filter.lower():
                    filtered_transactions.append(t)
                elif not trans_factory and item_id in items_by_id:
                    # Backward compatibility: old entries without factory field
                    filtered_transactions.append(t)
        
        transactions = filtered_transactions
    
    if filters:
        if filters.get('item_id'):
            filter_id = filters['item_id'].upper().strip()
            transactions = [t for t in transactions if filter_id in (t.get('item_id', '') or '').upper()]
        
        if filters.get('transaction_type'):
            filter_type = filters['transaction_type']
            # Map English filter values to Arabic stored values
            type_mapping = {
                'INCOMING': ['وارد', 'تحويل داخلي (وارد)', 'تحويل داخلي (وارد جديد)'],
                'OUTGOING': ['صادر', 'تحويل داخلي (صادر)'],
                'INITIAL': ['رصيد افتتاحي'],
                'DELETED': ['محذوف'],
                'EDIT': ['تعديل']
            }
            allowed_types = type_mapping.get(filter_type, [filter_type])
            transactions = [t for t in transactions if (t.get('transaction_type', '') or '') in allowed_types]
        
        if filters.get('document_type'):
            filter_doc = filters['document_type']
            transactions = [t for t in transactions if (t.get('document_type', '') or '') == filter_doc]
        
        if filters.get('document_number'):
            filter_doc_num = filters['document_number'].lower().strip()
            transactions = [t for t in transactions if filter_doc_num in (t.get('document_number', '') or '').lower()]
        
        if filters.get('date_from'):
            date_from = filters['date_from']
            transactions = [t for t in transactions if (t.get('timestamp', '') or '')[:10] >= date_from]
        
        if filters.get('date_to'):
            date_to = filters['date_to']
            transactions = [t for t in transactions if (t.get('timestamp', '') or '')[:10] <= date_to]
        
        # Filter by transaction_date (user-specified date for when the transaction occurred)
        if filters.get('trans_date_from'):
            trans_date_from = filters['trans_date_from']
            transactions = [t for t in transactions if (t.get('transaction_date', '') or '') >= trans_date_from]
        
        if filters.get('trans_date_to'):
            trans_date_to = filters['trans_date_to']
            transactions = [t for t in transactions if (t.get('transaction_date', '') or '') <= trans_date_to]
        
        # Keyword search - search across all text fields (AND logic - all keywords must match)
        if filters.get('keywords'):
            keywords = [kw.strip().lower() for kw in filters['keywords'].split(',') if kw.strip()]
            if keywords:
                def matches_keywords(trans, keywords, use_and_logic):
                    # Combine all searchable text fields
                    searchable_text = ' '.join([
                        str(trans.get('item_id', '') or ''),
                        str(trans.get('item_name', '') or ''),
                        str(trans.get('transaction_type', '') or ''),
                        str(trans.get('document_type', '') or ''),
                        str(trans.get('document_number', '') or ''),
                        str(trans.get('notes', '') or ''),
                        str(trans.get('timestamp', '') or '')
                    ]).lower()
                    # Use AND or OR logic based on parameter
                    if use_and_logic:
                        return all(kw in searchable_text for kw in keywords)
                    else:
                        return any(kw in searchable_text for kw in keywords)
                
                use_and = filters.get('keyword_logic', 'AND').upper() == 'AND'
                transactions = [t for t in transactions if matches_keywords(t, keywords, use_and)]
        
        # Local-only filter - only show transactions that originated from this factory (not inter-factory transfers involving this factory)
        if filters.get('local_only') and factory_filter:
            def is_local_transaction(trans):
                notes = trans.get('notes', '') or ''
                # If it has inter-factory markers, it's not a purely local transaction
                if '[FROM:' in notes and '|TO:' in notes:
                    return False
                return True
            transactions = [t for t in transactions if is_local_transaction(t)]
    
    return transactions


@eel.expose
def get_item_transactions(item_id, factory=None):
    """Get all transactions for a specific item (from transaction-only file)"""
    if not item_id:
        return []
    
    item_id_upper = item_id.strip().upper()
    
    # Get all transactions for this item from transaction-only file
    all_transactions = read_csv(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS)
    
    # Filter transactions for this item
    item_transactions = [
        t for t in all_transactions 
        if (t.get('item_id', '') or '').strip().upper() == item_id_upper
    ]
    
    # Sort by transaction_date (actual date) most recent first, fall back to timestamp if no transaction_date
    item_transactions.sort(key=lambda x: x.get('transaction_date', '') or x.get('timestamp', ''), reverse=True)
    
    return item_transactions


@eel.expose
def get_entity_transactions(entity_id, ledger_type):
    """Get all transactions for a specific entity (from per-module transaction file)"""
    if not entity_id or not ledger_type:
        return []
    
    entity_id_upper = entity_id.strip().upper()
    ledger_type_lower = ledger_type.lower().strip()
    
    # Get the correct per-module transaction file
    transaction_file = LEDGER_TRANSACTION_FILES.get(ledger_type_lower)
    if not transaction_file:
        print(f"[WARN] No transaction file for ledger type: {ledger_type}")
        return []
    
    # Read from per-module transaction file
    all_transactions = read_csv(transaction_file, LEDGER_TRANSACTION_HEADERS)
    
    # Filter transactions for this entity
    entity_transactions = [
        t for t in all_transactions 
        if (t.get('entity_id', '') or '').strip().upper() == entity_id_upper
    ]
    
    # Sort by transaction_date (actual date) most recent first, fall back to timestamp if no transaction_date
    entity_transactions.sort(key=lambda x: x.get('transaction_date', '') or x.get('timestamp', ''), reverse=True)
    
    return entity_transactions


@eel.expose
def get_all_stock_transactions():
    """Get all stock transactions from the transaction-only file (for Firebase sync)"""
    try:
        transactions = read_csv(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS)
        return transactions
    except Exception as e:
        print(f"[ERROR] Failed to read stock transactions: {e}")
        return []


@eel.expose
def get_all_ledger_transactions_for_sync():
    """Get all ledger transactions from all per-module transaction files (for Firebase sync)"""
    try:
        all_transactions = []
        for ledger_type, file_path in LEDGER_TRANSACTION_FILES.items():
            transactions = read_csv(file_path, LEDGER_TRANSACTION_HEADERS)
            # Add ledger_type back for sync context
            for t in transactions:
                t['ledger_type'] = ledger_type
            all_transactions.extend(transactions)
        return all_transactions
    except Exception as e:
        print(f"[ERROR] Failed to read ledger transactions: {e}")
        return []


@eel.expose
def get_all_full_transactions_log():
    """Get all entries from the full transaction log (for Firebase sync)"""
    try:
        transactions = read_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
        return transactions
    except Exception as e:
        print(f"[ERROR] Failed to read full transactions log: {e}")
        return []


@eel.expose
def get_all_ledger_log():
    """Get all entries from the combined ledger log (for Firebase sync)"""
    try:
        transactions = read_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
        return transactions
    except Exception as e:
        print(f"[ERROR] Failed to read ledger log: {e}")
        return []


@eel.expose
def import_full_transactions_log_from_cloud(transactions, skip_existing=False):
    """Import full transaction log entries from cloud"""
    try:
        existing = read_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
        existing_keys = set(f"{t['timestamp']}_{t.get('item_id','')}" for t in existing)
        imported = 0
        skipped = 0
        for t in transactions:
            key = f"{t['timestamp']}_{t.get('item_id','')}"
            if key in existing_keys:
                skipped += 1
                continue
            append_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, t)
            imported += 1
        return {'success': True, 'imported': imported, 'skipped': skipped}
    except Exception as e:
        print(f"[ERROR] Failed to import full transactions log: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def import_ledger_log_from_cloud(transactions, skip_existing=False):
    """Import combined ledger log entries from cloud"""
    try:
        existing = read_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
        existing_keys = set(f"{t['timestamp']}_{t.get('entity_id','')}" for t in existing)
        imported = 0
        skipped = 0
        for t in transactions:
            key = f"{t['timestamp']}_{t.get('entity_id','')}"
            if key in existing_keys:
                skipped += 1
                continue
            append_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, t)
            imported += 1
        return {'success': True, 'imported': imported, 'skipped': skipped}
    except Exception as e:
        print(f"[ERROR] Failed to import ledger log: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def get_module_transactions(ledger_type):
    """Get all transactions for a specific module (customer, supplier, treasury, covenant, advance)"""
    try:
        ledger_type_lower = ledger_type.lower().strip()
        transaction_file = LEDGER_TRANSACTION_FILES.get(ledger_type_lower)
        if not transaction_file:
            return []
        transactions = read_csv(transaction_file, LEDGER_TRANSACTION_HEADERS)
        return transactions
    except Exception as e:
        print(f"[ERROR] Failed to read {ledger_type} transactions: {e}")
        return []


@eel.expose
def get_all_ledger_transactions(filters=None):
    """Get all ledger transactions, optionally filtered by ledger type"""
    transactions = read_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
    
    if filters:
        if filters.get('ledger_type'):
            filter_type = filters['ledger_type'].lower().strip()
            # Map plural filter values to singular ledger_type values
            type_mapping = {
                'customers': 'customer',
                'suppliers': 'supplier',
                'covenants': 'covenant',
                'advances': 'advance',
                'treasury': 'treasury'
            }
            filter_type = type_mapping.get(filter_type, filter_type)
            transactions = [t for t in transactions if (t.get('ledger_type', '') or '').lower() == filter_type]
        
        if filters.get('entity_id'):
            filter_id = filters['entity_id'].upper().strip()
            transactions = [t for t in transactions if filter_id in (t.get('entity_id', '') or '').upper()]
        
        if filters.get('date_from'):
            date_from = filters['date_from']
            transactions = [t for t in transactions if (t.get('timestamp', '') or '')[:10] >= date_from]
        
        if filters.get('date_to'):
            date_to = filters['date_to']
            transactions = [t for t in transactions if (t.get('timestamp', '') or '')[:10] <= date_to]
        
        # Filter by transaction_date (user-specified date for when the transaction occurred)
        if filters.get('trans_date_from'):
            trans_date_from = filters['trans_date_from']
            transactions = [t for t in transactions if (t.get('transaction_date', '') or '') >= trans_date_from]
        
        if filters.get('trans_date_to'):
            trans_date_to = filters['trans_date_to']
            transactions = [t for t in transactions if (t.get('transaction_date', '') or '') <= trans_date_to]
        
        # Keyword search - search across all text fields (AND or OR logic based on parameter)
        if filters.get('keywords'):
            keywords = [kw.strip().lower() for kw in filters['keywords'].split(',') if kw.strip()]
            if keywords:
                def matches_keywords(trans, keywords, use_and_logic):
                    # Combine all searchable text fields
                    searchable_text = ' '.join([
                        str(trans.get('ledger_type', '') or ''),
                        str(trans.get('entity_id', '') or ''),
                        str(trans.get('entity_name', '') or ''),
                        str(trans.get('transaction_type', '') or ''),
                        str(trans.get('document_number', '') or ''),
                        str(trans.get('statement', '') or ''),
                        str(trans.get('timestamp', '') or '')
                    ]).lower()
                    # Use AND or OR logic based on parameter
                    if use_and_logic:
                        return all(kw in searchable_text for kw in keywords)
                    else:
                        return any(kw in searchable_text for kw in keywords)
                
                use_and = filters.get('keyword_logic', 'AND').upper() == 'AND'
                transactions = [t for t in transactions if matches_keywords(t, keywords, use_and)]
    
    return transactions


@eel.expose
def edit_transaction(timestamp, item_id, new_data):
    """Edit a transaction log entry. Uses timestamp + item_id as unique identifier."""
    try:
        transactions = read_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
        
        found = False
        for i, trans in enumerate(transactions):
            if trans.get('timestamp') == timestamp and trans.get('item_id') == item_id:
                # Update allowed fields
                if 'transaction_type' in new_data:
                    transactions[i]['transaction_type'] = new_data['transaction_type']
                if 'quantity' in new_data:
                    transactions[i]['quantity'] = new_data['quantity']
                if 'supplier' in new_data:
                    transactions[i]['supplier'] = new_data['supplier']
                if 'price' in new_data:
                    transactions[i]['price'] = new_data['price']
                if 'document_type' in new_data:
                    transactions[i]['document_type'] = new_data['document_type']
                if 'document_number' in new_data:
                    transactions[i]['document_number'] = new_data['document_number']
                if 'notes' in new_data:
                    transactions[i]['notes'] = new_data['notes']
                found = True
                break
        
        if not found:
            return {'success': False, 'message': 'Transaction not found'}
        
        write_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, transactions)
        return {'success': True, 'message': 'Transaction updated successfully'}
    except Exception as e:
        print(f"Error editing transaction: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def delete_transaction(timestamp, item_id):
    """Delete a transaction log entry. Uses timestamp + item_id as unique identifier."""
    try:
        transactions = read_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
        
        original_count = len(transactions)
        transactions = [t for t in transactions if not (t.get('timestamp') == timestamp and t.get('item_id') == item_id)]
        
        if len(transactions) == original_count:
            return {'success': False, 'message': 'Transaction not found'}
        
        write_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, transactions)
        return {'success': True, 'message': 'Transaction deleted successfully'}
    except Exception as e:
        print(f"Error deleting transaction: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def reverse_transaction(timestamp, item_id, factory=None):
    """Reverse a stock transaction by undoing its effects and removing it from the log.
    
    This restores the state as if the transaction never happened:
    - Incoming transactions: subtract the quantity from stock
    - Outgoing transactions: add the quantity back to stock
    - Deletion transactions: restore the deleted item
    - The transaction is removed from the transaction log
    """
    try:
        import json
        transactions = read_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
        
        # Find the original transaction
        original_trans = None
        original_index = -1
        for i, trans in enumerate(transactions):
            if trans.get('timestamp') == timestamp and trans.get('item_id') == item_id:
                original_trans = trans
                original_index = i
                break
        
        if not original_trans:
            return {'success': False, 'message': 'Transaction not found'}
        
        # Get current factory context
        if not factory:
            return {'success': False, 'message': 'Factory context is required'}
        
        # Get the original transaction details
        original_type = original_trans.get('transaction_type', '')
        original_quantity = float(original_trans.get('quantity', 0) or 0)
        original_notes = original_trans.get('notes', '') or ''
        
        # Handle deletion reversal (restore the item)
        if original_type == 'محذوف':
            # Try to extract the backed-up item data from notes
            import re
            match = re.search(r'\[DELETED_ITEM:(.+)\]$', original_notes)
            if match:
                try:
                    item_data = json.loads(match.group(1))
                    
                    # Check if item already exists (shouldn't, but be safe)
                    result = check_item_exists(item_id, factory)
                    if result['exists']:
                        return {'success': False, 'message': f'Cannot restore: Item "{item_id}" already exists in this factory'}
                    
                    # Restore the item to the stock file
                    stock_file = get_stock_file(factory)
                    append_csv(stock_file, STOCK_HEADERS, item_data)
                    
                    # Remove the deletion transaction from the log
                    transactions.pop(original_index)
                    write_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, transactions)
                    
                    return {
                        'success': True,
                        'message': f'Item "{item_data.get("name", item_id)}" has been restored with {item_data.get("net_stock", 0)} units'
                    }
                except json.JSONDecodeError:
                    return {'success': False, 'message': 'Cannot reverse: Item backup data is corrupted'}
            else:
                return {'success': False, 'message': 'Cannot reverse: This deletion does not contain backup data for restoration'}
        
        # Determine the stock change needed to undo the transaction
        # For Arabic transaction types
        incoming_types = ['وارد', 'تحويل داخلي (وارد)', 'تحويل داخلي (وارد جديد)', 'رصيد افتتاحي', 'INCOMING']
        outgoing_types = ['صادر', 'تحويل داخلي (صادر)', 'OUTGOING']
        
        if original_type in incoming_types:
            # Undo an incoming: subtract the quantity
            stock_change = -original_quantity
            incoming_change = -original_quantity
            outgoing_change = 0
        elif original_type in outgoing_types:
            # Undo an outgoing: add the quantity back
            stock_change = original_quantity
            incoming_change = 0
            outgoing_change = -original_quantity
        else:
            # For other types (like edits), don't allow reversal
            return {'success': False, 'message': f'Cannot reverse transaction of type: {original_type}'}
        
        result = check_item_exists(item_id, factory)
        if not result['exists']:
            return {'success': False, 'message': f'Item "{item_id}" not found in current factory'}
        
        item = result['item']
        current_stock = float(item.get('net_stock', 0) or 0)
        
        # For undoing an incoming (removing stock), check we have enough
        if stock_change < 0 and abs(stock_change) > current_stock:
            return {'success': False, 'message': f'Cannot reverse: insufficient stock. Current: {current_stock}, needed: {abs(stock_change)}'}
        
        new_stock = current_stock + stock_change
        
        # Update the item's stock
        stock_file = get_stock_file(factory)
        items = read_csv(stock_file, STOCK_HEADERS)
        
        for stock_item in items:
            if stock_item['id'].strip().upper() == item_id.upper():
                stock_item['total_incoming'] = max(0, float(stock_item.get('total_incoming', 0) or 0) + incoming_change)
                stock_item['total_outgoing'] = max(0, float(stock_item.get('total_outgoing', 0) or 0) + outgoing_change)
                stock_item['net_stock'] = new_stock
                stock_item['last_updated'] = get_current_date()
                break
        
        write_csv(stock_file, STOCK_HEADERS, items)
        
        # Remove the transaction from the log
        transactions.pop(original_index)
        write_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, transactions)
        
        action = 'added back to' if stock_change > 0 else 'removed from'
        return {
            'success': True, 
            'message': f'Transaction reversed and removed. {abs(stock_change)} {item.get("unit", "units")} {action} stock. New balance: {new_stock}'
        }
        
    except Exception as e:
        import traceback
        print(f"Error reversing transaction: {e}")
        traceback.print_exc()
        return {'success': False, 'message': str(e)}


@eel.expose
def edit_ledger_transaction(timestamp, entity_id, new_data):
    """Edit a ledger transaction log entry. Uses timestamp + entity_id as unique identifier."""
    try:
        transactions = read_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
        
        found = False
        for i, trans in enumerate(transactions):
            if trans.get('timestamp') == timestamp and trans.get('entity_id') == entity_id:
                # Update allowed fields
                if 'transaction_type' in new_data:
                    transactions[i]['transaction_type'] = new_data['transaction_type']
                if 'debit' in new_data:
                    transactions[i]['debit'] = new_data['debit']
                if 'credit' in new_data:
                    transactions[i]['credit'] = new_data['credit']
                if 'payment_method' in new_data:
                    transactions[i]['payment_method'] = new_data['payment_method']
                if 'document_number' in new_data:
                    transactions[i]['document_number'] = new_data['document_number']
                if 'statement' in new_data:
                    transactions[i]['statement'] = new_data['statement']
                found = True
                break
        
        if not found:
            return {'success': False, 'message': 'Ledger transaction not found'}
        
        write_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, transactions)
        return {'success': True, 'message': 'Ledger transaction updated successfully'}
    except Exception as e:
        print(f"Error editing ledger transaction: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def delete_ledger_transaction(timestamp, entity_id):
    """Delete a ledger transaction log entry. Uses timestamp + entity_id as unique identifier."""
    try:
        transactions = read_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
        
        original_count = len(transactions)
        transactions = [t for t in transactions if not (t.get('timestamp') == timestamp and t.get('entity_id') == entity_id)]
        
        if len(transactions) == original_count:
            return {'success': False, 'message': 'Ledger transaction not found'}
        
        write_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, transactions)
        return {'success': True, 'message': 'Ledger transaction deleted successfully'}
    except Exception as e:
        print(f"Error deleting ledger transaction: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def reverse_ledger_transaction(timestamp, entity_id):
    """Reverse a ledger transaction by undoing its effects and removing it from the log.
    
    This restores the state as if the transaction never happened:
    - Subtracts the original debit from the entity's total debit
    - Subtracts the original credit from the entity's total credit
    - Recalculates the balance
    - For deletions: restores the deleted entity
    - Removes the transaction from the log
    """
    try:
        import json
        import re
        transactions = read_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
        
        # Find the original transaction
        original_trans = None
        original_index = -1
        for i, trans in enumerate(transactions):
            if trans.get('timestamp') == timestamp and trans.get('entity_id') == entity_id:
                original_trans = trans
                original_index = i
                break
        
        if not original_trans:
            return {'success': False, 'message': 'Ledger transaction not found'}
        
        # Get the original transaction details
        ledger_type = original_trans.get('ledger_type', '')
        original_type = original_trans.get('transaction_type', '')
        original_debit = float(original_trans.get('debit', 0) or 0)
        original_credit = float(original_trans.get('credit', 0) or 0)
        original_statement = original_trans.get('statement', '') or ''
        
        # Get ledger file and headers based on type
        ledger_files = {
            'customer': (CUSTOMERS_FILE, CUSTOMER_HEADERS, 'id', 'name'),
            'supplier': (SUPPLIERS_FILE, SUPPLIER_HEADERS, 'id', 'name'),
            'treasury': (TREASURY_FILE, TREASURY_HEADERS, 'account_number', 'account_name'),
            'covenant': (COVENANTS_FILE, COVENANT_HEADERS, 'id', 'employee_name'),
            'advance': (ADVANCES_FILE, ADVANCE_HEADERS, 'id', 'employee_name')
        }
        
        if ledger_type not in ledger_files:
            return {'success': False, 'message': f'Unknown ledger type: {ledger_type}'}
        
        ledger_file, ledger_headers, id_field, name_field = ledger_files[ledger_type]
        
        # Handle deletion reversal (restore the entity)
        if original_type == 'حذف':
            # Try to extract the backed-up entity data from statement
            match = re.search(r'\[DELETED_ENTITY:(.+)\]$', original_statement)
            if match:
                try:
                    entity_data = json.loads(match.group(1))
                    
                    # Check if entity already exists (shouldn't, but be safe)
                    entities = read_csv(ledger_file, ledger_headers)
                    for e in entities:
                        if e.get(id_field, '').strip().upper() == entity_id.strip().upper():
                            return {'success': False, 'message': f'Cannot restore: Entity "{entity_id}" already exists'}
                    
                    # Restore the entity to the ledger file
                    append_csv(ledger_file, ledger_headers, entity_data)
                    
                    # Remove the deletion transaction from the log
                    transactions.pop(original_index)
                    write_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, transactions)
                    
                    entity_name = entity_data.get(name_field, entity_id)
                    return {
                        'success': True,
                        'message': f'"{entity_name}" has been restored with balance of {entity_data.get("balance", 0)}'
                    }
                except json.JSONDecodeError:
                    return {'success': False, 'message': 'Cannot reverse: Entity backup data is corrupted'}
            else:
                return {'success': False, 'message': 'Cannot reverse: This deletion does not contain backup data for restoration'}
        
        # Read the ledger entities for regular transaction reversal
        entities = read_csv(ledger_file, ledger_headers)
        
        # Find the entity
        entity = None
        entity_index = -1
        for i, e in enumerate(entities):
            if e.get(id_field, '').strip().upper() == entity_id.strip().upper():
                entity = e
                entity_index = i
                break
        
        if not entity:
            return {'success': False, 'message': f'Entity "{entity_id}" not found in {ledger_type} ledger'}
        
        # Calculate the undo: subtract original debit and credit
        current_balance = float(entity.get('balance', 0) or 0)
        # Original transaction changed balance by: +debit -credit
        # To undo: -debit +credit
        balance_change = -original_debit + original_credit
        new_balance = current_balance + balance_change
        
        # Update the entity's totals and balance
        entities[entity_index]['debit'] = max(0, float(entities[entity_index].get('debit', 0) or 0) - original_debit)
        entities[entity_index]['credit'] = max(0, float(entities[entity_index].get('credit', 0) or 0) - original_credit)
        entities[entity_index]['balance'] = new_balance
        
        write_csv(ledger_file, ledger_headers, entities)
        
        # Remove the transaction from the log
        transactions.pop(original_index)
        write_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, transactions)
        
        return {
            'success': True, 
            'message': f'Transaction reversed and removed. New balance: {new_balance}'
        }
        
    except Exception as e:
        import traceback
        print(f"Error reversing ledger transaction: {e}")
        traceback.print_exc()
        return {'success': False, 'message': str(e)}


@eel.expose
def get_low_stock_notifications(factory=None):
    """Get items that are below their minimum stock level for a specific factory"""
    if not factory:
        return []
    
    stock_file = get_stock_file(factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    
    notifications = []
    
    for item in items:
        try:
            net_stock = float(item.get('net_stock', 0) or 0)
            min_stock = float(item.get('min_stock', 0) or 0)
            
            if min_stock > 0 and net_stock < min_stock:
                notifications.append({
                    'id': item['id'],
                    'name': item['name'],
                    'category': item.get('category', ''),
                    'unit': item['unit'],
                    'net_stock': net_stock,
                    'min_stock': min_stock,
                    'shortage': min_stock - net_stock
                })
        except (ValueError, TypeError):
            continue
    
    # Sort by shortage (highest first)
    notifications.sort(key=lambda x: x['shortage'], reverse=True)
    return notifications


@eel.expose
def get_unique_suppliers(factory=None):
    """Get list of unique suppliers for filter dropdown for a specific factory"""
    if not factory:
        return []
    
    stock_file = get_stock_file(factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    suppliers = list(set(item['supplier'] for item in items if item['supplier']))
    return sorted(suppliers)


@eel.expose
def get_unique_locations():
    """Get list of unique locations - returns predefined factory locations"""
    return LOCATIONS


@eel.expose
def delete_item(item_id, password='', factory=''):
    """Delete an item from stock (with logging) - requires password and factory"""
    if not item_id:
        return {'success': False, 'message': 'Item ID is required'}
    
    if not factory:
        return {'success': False, 'message': 'Factory context is required'}
    
    # Verify password
    if password != DELETE_PASSWORD:
        return {'success': False, 'message': 'Incorrect password. Deletion not authorized.'}
    
    item_id = item_id.strip().upper()
    stock_file = get_stock_file(factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    
    item_to_delete = None
    new_items = []
    
    for item in items:
        if item['id'].strip().upper() == item_id:
            item_to_delete = item
        else:
            new_items.append(item)
    
    if item_to_delete:
        write_csv(stock_file, STOCK_HEADERS, new_items)
        # Store full item data in notes as JSON for potential reversal
        import json
        item_backup = json.dumps(item_to_delete, ensure_ascii=False)
        deletion_notes = f'تم حذف الصنف من المخزون [DELETED_ITEM:{item_backup}]'
        log_transaction(item_id, item_to_delete['name'], 'محذوف', 0, item_to_delete['net_stock'], 0, '', 0, '', '', deletion_notes, '', factory)
        return {'success': True, 'message': f'Item "{item_to_delete["name"]}" deleted successfully'}
    
    return {'success': False, 'message': f'Item with ID "{item_id}" not found'}
    
    return {'success': False, 'message': f'Item with ID "{item_id}" not found'}


@eel.expose
def edit_item(item_id, name, category, unit, location, supplier, unit_price, min_stock, factory='', starting_balance=None):
    """Edit an existing stock item's details (ID is locked)"""
    if not item_id:
        return {'success': False, 'message': 'Item ID is required'}
    
    if not factory:
        return {'success': False, 'message': 'Factory context is required'}
    
    item_id = item_id.strip().upper()
    stock_file = get_stock_file(factory)
    items = read_csv(stock_file, STOCK_HEADERS)
    
    for item in items:
        if item['id'].strip().upper() == item_id:
            old_values = {
                'name': item['name'],
                'category': item['category'],
                'unit': item['unit'],
                'location': item['location'],
                'supplier': item['supplier'],
                'unit_price': item['unit_price'],
                'min_stock': item['min_stock'],
                'starting_balance': item.get('starting_balance', '0')
            }
            
            # Update fields
            item['name'] = name.strip() if name else item['name']
            item['category'] = category if category else item['category']
            item['unit'] = unit if unit else item['unit']
            item['location'] = location.strip() if location else item['location']
            item['supplier'] = supplier.strip() if supplier else item['supplier']
            item['unit_price'] = float(unit_price) if unit_price else item['unit_price']
            item['min_stock'] = float(min_stock) if min_stock else item['min_stock']
            if starting_balance is not None and starting_balance != '':
                new_starting = float(starting_balance)
                old_starting = float(old_values['starting_balance']) if old_values['starting_balance'] else 0
                if new_starting != old_starting:
                    item['starting_balance'] = str(new_starting)
                    # Recalculate net_stock: starting_balance + total_incoming - total_outgoing
                    total_incoming = float(item.get('total_incoming', 0) or 0)
                    total_outgoing = float(item.get('total_outgoing', 0) or 0)
                    item['net_stock'] = str(new_starting + total_incoming - total_outgoing)
            item['last_updated'] = get_current_date()
            
            write_csv(stock_file, STOCK_HEADERS, items)
            
            # Build change log
            changes = []
            if old_values['name'] != item['name']:
                changes.append(f"الاسم: {old_values['name']} → {item['name']}")
            if old_values['category'] != item['category']:
                changes.append(f"التصنيف: {old_values['category']} → {item['category']}")
            if old_values['unit'] != item['unit']:
                changes.append(f"الوحدة: {old_values['unit']} → {item['unit']}")
            if old_values['location'] != item['location']:
                changes.append(f"الموقع: {old_values['location']} → {item['location']}")
            if old_values['supplier'] != item['supplier']:
                changes.append(f"المورد: {old_values['supplier']} → {item['supplier']}")
            if str(old_values['unit_price']) != str(item['unit_price']):
                changes.append(f"السعر: {old_values['unit_price']} → {item['unit_price']}")
            if str(old_values['min_stock']) != str(item['min_stock']):
                changes.append(f"الحد الأدنى: {old_values['min_stock']} → {item['min_stock']}")
            if old_values['starting_balance'] != item.get('starting_balance', '0'):
                changes.append(f"الرصيد الافتتاحي: {old_values['starting_balance']} → {item['starting_balance']}")
            
            notes = 'تعديل: ' + ', '.join(changes) if changes else 'تم تعديل البيانات'
            log_transaction(item['id'], item['name'], 'تعديل', 0, item['net_stock'], item['net_stock'], '', 0, '', '', notes, '', factory)
            
            return {'success': True, 'message': f'Item "{item["name"]}" updated successfully'}
    
    return {'success': False, 'message': f'Item with ID "{item_id}" not found'}


@eel.expose
def edit_customer(customer_id, name, phone, email, registration_date='', document_number='', opening_balance=None, payment_method='', statement=''):
    """Edit an existing customer's details"""
    if not customer_id:
        return {'success': False, 'message': 'Customer ID is required'}
    
    customer_id = customer_id.strip().upper()
    items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    
    for item in items:
        if item['id'].strip().upper() == customer_id:
            old_values = {
                'name': item['name'],
                'phone': item['phone'],
                'email': item['email'],
                'registration_date': item.get('registration_date', ''),
                'document_number': item.get('document_number', ''),
                'opening_balance': item.get('opening_balance', '0'),
                'payment_method': item.get('payment_method', ''),
                'statement': item.get('statement', '')
            }
            
            item['name'] = name.strip() if name else item['name']
            item['phone'] = phone.strip() if phone is not None else item['phone']
            item['email'] = email.strip() if email is not None else item['email']
            item['registration_date'] = registration_date if registration_date is not None else item.get('registration_date', '')
            item['document_number'] = document_number if document_number is not None else item.get('document_number', '')
            item['payment_method'] = payment_method if payment_method is not None else item.get('payment_method', '')
            item['statement'] = statement if statement is not None else item.get('statement', '')
            
            # Update opening balance and recalculate balance
            if opening_balance is not None:
                old_opening = float(item.get('opening_balance', 0) or 0)
                new_opening = float(opening_balance)
                if old_opening != new_opening:
                    item['opening_balance'] = new_opening
                    # Recalculate balance: opening + debit - credit
                    debit = float(item.get('debit', 0) or 0)
                    credit = float(item.get('credit', 0) or 0)
                    item['balance'] = new_opening + debit - credit
            
            write_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS, items)
            
            changes = []
            if old_values['name'] != item['name']:
                changes.append(f"الاسم: {old_values['name']} → {item['name']}")
            if old_values['phone'] != item['phone']:
                changes.append(f"الهاتف: {old_values['phone']} → {item['phone']}")
            if old_values['email'] != item['email']:
                changes.append(f"البريد: {old_values['email']} → {item['email']}")
            if str(old_values['opening_balance']) != str(item.get('opening_balance', '0')):
                changes.append(f"الرصيد الافتتاحي: {old_values['opening_balance']} → {item['opening_balance']}")
            
            notes = 'تعديل: ' + ', '.join(changes) if changes else 'تم تعديل البيانات'
            log_ledger_transaction('customer', customer_id, item['name'], 'تعديل', 0, 0, item['balance'], item['balance'], '', '', notes)
            
            return {'success': True, 'message': f'Customer "{item["name"]}" updated successfully'}
    
    return {'success': False, 'message': f'Customer with ID "{customer_id}" not found'}


@eel.expose
def edit_supplier(supplier_id, name, phone, email, registration_date='', document_number='', opening_balance=None, payment_method='', statement=''):
    """Edit an existing supplier's details"""
    if not supplier_id:
        return {'success': False, 'message': 'Supplier ID is required'}
    
    supplier_id = supplier_id.strip().upper()
    items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    
    for item in items:
        if item['id'].strip().upper() == supplier_id:
            old_values = {
                'name': item['name'],
                'phone': item['phone'],
                'email': item['email'],
                'registration_date': item.get('registration_date', ''),
                'document_number': item.get('document_number', ''),
                'opening_balance': item.get('opening_balance', '0'),
                'payment_method': item.get('payment_method', ''),
                'statement': item.get('statement', '')
            }
            
            item['name'] = name.strip() if name else item['name']
            item['phone'] = phone.strip() if phone is not None else item['phone']
            item['email'] = email.strip() if email is not None else item['email']
            item['registration_date'] = registration_date if registration_date is not None else item.get('registration_date', '')
            item['document_number'] = document_number if document_number is not None else item.get('document_number', '')
            item['payment_method'] = payment_method if payment_method is not None else item.get('payment_method', '')
            item['statement'] = statement if statement is not None else item.get('statement', '')
            
            # Update opening balance and recalculate balance
            if opening_balance is not None:
                old_opening = float(item.get('opening_balance', 0) or 0)
                new_opening = float(opening_balance)
                if old_opening != new_opening:
                    item['opening_balance'] = new_opening
                    debit = float(item.get('debit', 0) or 0)
                    credit = float(item.get('credit', 0) or 0)
                    item['balance'] = new_opening + debit - credit
            
            write_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS, items)
            
            changes = []
            if old_values['name'] != item['name']:
                changes.append(f"الاسم: {old_values['name']} → {item['name']}")
            if old_values['phone'] != item['phone']:
                changes.append(f"الهاتف: {old_values['phone']} → {item['phone']}")
            if old_values['email'] != item['email']:
                changes.append(f"البريد: {old_values['email']} → {item['email']}")
            if str(old_values['opening_balance']) != str(item.get('opening_balance', '0')):
                changes.append(f"الرصيد الافتتاحي: {old_values['opening_balance']} → {item['opening_balance']}")
            
            notes = 'تعديل: ' + ', '.join(changes) if changes else 'تم تعديل البيانات'
            log_ledger_transaction('supplier', supplier_id, item['name'], 'تعديل', 0, 0, item['balance'], item['balance'], '', '', notes)
            
            return {'success': True, 'message': f'Supplier "{item["name"]}" updated successfully'}
    
    return {'success': False, 'message': f'Supplier with ID "{supplier_id}" not found'}


@eel.expose
def edit_treasury(account_number, account_name, registration_date='', document_number='', opening_balance=None, payment_method='', statement=''):
    """Edit an existing treasury account's details"""
    if not account_number:
        return {'success': False, 'message': 'Account number is required'}
    
    account_number = account_number.strip()
    items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
    
    for item in items:
        if (item.get('account_number', '') or '').strip().lower() == account_number.lower():
            old_values = {
                'account_name': item['account_name'],
                'registration_date': item.get('registration_date', ''),
                'document_number': item.get('document_number', ''),
                'opening_balance': item.get('opening_balance', '0'),
                'payment_method': item.get('payment_method', ''),
                'statement': item.get('statement', '')
            }
            
            item['account_name'] = account_name.strip() if account_name else item['account_name']
            item['registration_date'] = registration_date if registration_date is not None else item.get('registration_date', '')
            item['document_number'] = document_number if document_number is not None else item.get('document_number', '')
            item['payment_method'] = payment_method if payment_method is not None else item.get('payment_method', '')
            item['statement'] = statement if statement is not None else item.get('statement', '')
            
            # Update opening balance and recalculate balance
            if opening_balance is not None:
                old_opening = float(item.get('opening_balance', 0) or 0)
                new_opening = float(opening_balance)
                if old_opening != new_opening:
                    item['opening_balance'] = new_opening
                    debit = float(item.get('debit', 0) or 0)
                    credit = float(item.get('credit', 0) or 0)
                    item['balance'] = new_opening + debit - credit
            
            write_csv(TREASURY_FILE, TREASURY_HEADERS, items)
            
            changes = []
            if old_values['account_name'] != item['account_name']:
                changes.append(f"اسم الحساب: {old_values['account_name']} → {item['account_name']}")
            if str(old_values['opening_balance']) != str(item.get('opening_balance', '0')):
                changes.append(f"الرصيد الافتتاحي: {old_values['opening_balance']} → {item['opening_balance']}")
            
            notes = 'تعديل: ' + ', '.join(changes) if changes else 'تم تعديل البيانات'
            log_ledger_transaction('treasury', account_number, item['account_name'], 'تعديل', 0, 0, item['balance'], item['balance'], '', '', notes)
            
            return {'success': True, 'message': f'Treasury account "{item["account_name"]}" updated successfully'}
    
    return {'success': False, 'message': f'Treasury account "{account_number}" not found'}


@eel.expose
def edit_covenant(covenant_id, employee_name, phone, registration_date='', document_number='', opening_balance=None, payment_method='', statement=''):
    """Edit an existing covenant's details"""
    if not covenant_id:
        return {'success': False, 'message': 'Covenant ID is required'}
    
    covenant_id = covenant_id.strip().upper()
    items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
    
    for item in items:
        if item['id'].strip().upper() == covenant_id:
            old_values = {
                'employee_name': item['employee_name'],
                'phone': item['phone'],
                'registration_date': item.get('registration_date', ''),
                'document_number': item.get('document_number', ''),
                'opening_balance': item.get('opening_balance', '0'),
                'payment_method': item.get('payment_method', ''),
                'statement': item.get('statement', '')
            }
            
            item['employee_name'] = employee_name.strip() if employee_name else item['employee_name']
            item['phone'] = phone.strip() if phone is not None else item['phone']
            item['registration_date'] = registration_date if registration_date is not None else item.get('registration_date', '')
            item['document_number'] = document_number if document_number is not None else item.get('document_number', '')
            item['payment_method'] = payment_method if payment_method is not None else item.get('payment_method', '')
            item['statement'] = statement if statement is not None else item.get('statement', '')
            
            # Update opening balance and recalculate balance
            if opening_balance is not None:
                old_opening = float(item.get('opening_balance', 0) or 0)
                new_opening = float(opening_balance)
                if old_opening != new_opening:
                    item['opening_balance'] = new_opening
                    debit = float(item.get('debit', 0) or 0)
                    credit = float(item.get('credit', 0) or 0)
                    item['balance'] = new_opening + debit - credit
            
            write_csv(COVENANTS_FILE, COVENANT_HEADERS, items)
            
            changes = []
            if old_values['employee_name'] != item['employee_name']:
                changes.append(f"الاسم: {old_values['employee_name']} → {item['employee_name']}")
            if old_values['phone'] != item['phone']:
                changes.append(f"الهاتف: {old_values['phone']} → {item['phone']}")
            if str(old_values['opening_balance']) != str(item.get('opening_balance', '0')):
                changes.append(f"الرصيد الافتتاحي: {old_values['opening_balance']} → {item['opening_balance']}")
            
            notes = 'تعديل: ' + ', '.join(changes) if changes else 'تم تعديل البيانات'
            log_ledger_transaction('covenant', covenant_id, item['employee_name'], 'تعديل', 0, 0, item['balance'], item['balance'], '', '', notes)
            
            return {'success': True, 'message': f'Covenant for "{item["employee_name"]}" updated successfully'}
    
    return {'success': False, 'message': f'Covenant with ID "{covenant_id}" not found'}


@eel.expose
def edit_advance(advance_id, employee_name, phone, registration_date='', document_number='', opening_balance=None, payment_method='', statement=''):
    """Edit an existing advance's details - ID is locked"""
    if not advance_id:
        return {'success': False, 'message': 'Advance ID is required'}
    
    advance_id = advance_id.strip().upper()
    items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
    
    for item in items:
        if item['id'].strip().upper() == advance_id:
            old_name = item['employee_name']
            old_phone = item['phone']
            old_registration_date = item.get('registration_date', '')
            old_document_number = item.get('document_number', '')
            old_opening_balance = item.get('opening_balance', '0')
            old_payment_method = item.get('payment_method', '')
            old_statement = item.get('statement', '')
            
            item['employee_name'] = employee_name.strip() if employee_name else item['employee_name']
            item['phone'] = phone.strip() if phone else item['phone']
            if registration_date:
                item['registration_date'] = registration_date.strip()
            if document_number:
                item['document_number'] = document_number.strip()
            if opening_balance is not None and opening_balance != '':
                new_opening = float(opening_balance)
                old_opening = float(old_opening_balance) if old_opening_balance else 0
                if new_opening != old_opening:
                    item['opening_balance'] = str(new_opening)
                    # Recalculate balance: opening_balance + debit - credit
                    debit = float(item.get('debit', 0) or 0)
                    credit = float(item.get('credit', 0) or 0)
                    item['balance'] = str(new_opening + debit - credit)
            if payment_method:
                item['payment_method'] = payment_method.strip()
            if statement:
                item['statement'] = statement.strip()
            
            write_csv(ADVANCES_FILE, ADVANCE_HEADERS, items)
            
            changes = []
            if old_name != item['employee_name']:
                changes.append(f"الاسم: {old_name} → {item['employee_name']}")
            if old_phone != item['phone']:
                changes.append(f"الهاتف: {old_phone} → {item['phone']}")
            if old_registration_date != item.get('registration_date', ''):
                changes.append(f"تاريخ التسجيل: {old_registration_date} → {item['registration_date']}")
            if old_document_number != item.get('document_number', ''):
                changes.append(f"رقم المستند: {old_document_number} → {item['document_number']}")
            if old_opening_balance != item.get('opening_balance', '0'):
                changes.append(f"الرصيد الافتتاحي: {old_opening_balance} → {item['opening_balance']}")
            if old_payment_method != item.get('payment_method', ''):
                changes.append(f"طريقة الدفع: {old_payment_method} → {item['payment_method']}")
            if old_statement != item.get('statement', ''):
                changes.append(f"البيان: {old_statement} → {item['statement']}")
            
            notes = 'تعديل: ' + ', '.join(changes) if changes else 'تم تعديل البيانات'
            log_ledger_transaction('advance', item['id'], item['employee_name'], 'تعديل', 0, 0, item['balance'], item['balance'], '', '', notes)
            
            return {'success': True, 'message': f'Advance for "{item["employee_name"]}" updated successfully'}
    
    return {'success': False, 'message': f'Advance with ID "{advance_id}" not found'}


@eel.expose
def delete_customer(customer_id):
    """Delete a customer from the ledger"""
    if not customer_id:
        return {'success': False, 'message': 'Customer ID is required'}
    
    customer_id = customer_id.strip().upper()
    items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    
    original_count = len(items)
    deleted_item = None
    for item in items:
        if item['id'].strip().upper() == customer_id:
            deleted_item = item
            break
    
    if not deleted_item:
        return {'success': False, 'message': f'Customer with ID "{customer_id}" not found'}
    
    items = [item for item in items if item['id'].strip().upper() != customer_id]
    write_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS, items)
    
    # Log the deletion with backup data for potential reversal
    import json
    entity_backup = json.dumps(deleted_item, ensure_ascii=False)
    deletion_statement = f'تم حذف العميل [DELETED_ENTITY:{entity_backup}]'
    log_ledger_transaction('customer', customer_id, deleted_item['name'], 'حذف', 0, 0, deleted_item.get('balance', 0), 0, '', '', deletion_statement)
    
    return {'success': True, 'message': f'Customer "{deleted_item["name"]}" deleted successfully'}


@eel.expose
def delete_supplier(supplier_id):
    """Delete a supplier from the ledger"""
    if not supplier_id:
        return {'success': False, 'message': 'Supplier ID is required'}
    
    supplier_id = supplier_id.strip().upper()
    items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    
    deleted_item = None
    for item in items:
        if item['id'].strip().upper() == supplier_id:
            deleted_item = item
            break
    
    if not deleted_item:
        return {'success': False, 'message': f'Supplier with ID "{supplier_id}" not found'}
    
    items = [item for item in items if item['id'].strip().upper() != supplier_id]
    write_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS, items)
    
    # Log the deletion with backup data for potential reversal
    import json
    entity_backup = json.dumps(deleted_item, ensure_ascii=False)
    deletion_statement = f'تم حذف المورد [DELETED_ENTITY:{entity_backup}]'
    log_ledger_transaction('supplier', supplier_id, deleted_item['name'], 'حذف', 0, 0, deleted_item.get('balance', 0), 0, '', '', deletion_statement)
    
    return {'success': True, 'message': f'Supplier "{deleted_item["name"]}" deleted successfully'}


@eel.expose
def delete_treasury(account_number):
    """Delete a treasury account from the ledger"""
    if not account_number:
        return {'success': False, 'message': 'Account number is required'}
    
    account_number = account_number.strip()
    items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
    
    deleted_item = None
    for item in items:
        if (item.get('account_number', '') or '').strip().lower() == account_number.lower():
            deleted_item = item
            break
    
    if not deleted_item:
        return {'success': False, 'message': f'Treasury account "{account_number}" not found'}
    
    items = [item for item in items if (item.get('account_number', '') or '').strip().lower() != account_number.lower()]
    write_csv(TREASURY_FILE, TREASURY_HEADERS, items)
    
    # Log the deletion with backup data for potential reversal
    import json
    entity_backup = json.dumps(deleted_item, ensure_ascii=False)
    deletion_statement = f'تم حذف حساب الخزينة [DELETED_ENTITY:{entity_backup}]'
    log_ledger_transaction('treasury', account_number, deleted_item['account_name'], 'حذف', 0, 0, deleted_item.get('balance', 0), 0, '', '', deletion_statement)
    
    return {'success': True, 'message': f'Treasury account "{deleted_item["account_name"]}" deleted successfully'}


@eel.expose
def delete_covenant(covenant_id):
    """Delete a covenant from the ledger"""
    if not covenant_id:
        return {'success': False, 'message': 'Covenant ID is required'}
    
    covenant_id = covenant_id.strip().upper()
    items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
    
    deleted_item = None
    for item in items:
        if item['id'].strip().upper() == covenant_id:
            deleted_item = item
            break
    
    if not deleted_item:
        return {'success': False, 'message': f'Covenant with ID "{covenant_id}" not found'}
    
    items = [item for item in items if item['id'].strip().upper() != covenant_id]
    write_csv(COVENANTS_FILE, COVENANT_HEADERS, items)
    
    # Log the deletion with backup data for potential reversal
    import json
    entity_backup = json.dumps(deleted_item, ensure_ascii=False)
    deletion_statement = f'تم حذف العهدة [DELETED_ENTITY:{entity_backup}]'
    log_ledger_transaction('covenant', covenant_id, deleted_item['employee_name'], 'حذف', 0, 0, deleted_item.get('balance', 0), 0, '', '', deletion_statement)
    
    return {'success': True, 'message': f'Covenant for "{deleted_item["employee_name"]}" deleted successfully'}


@eel.expose
def delete_advance(advance_id):
    """Delete an advance from the ledger"""
    if not advance_id:
        return {'success': False, 'message': 'Advance ID is required'}
    
    advance_id = advance_id.strip().upper()
    items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
    
    deleted_item = None
    for item in items:
        if item['id'].strip().upper() == advance_id:
            deleted_item = item
            break
    
    if not deleted_item:
        return {'success': False, 'message': f'Advance with ID "{advance_id}" not found'}
    
    items = [item for item in items if item['id'].strip().upper() != advance_id]
    write_csv(ADVANCES_FILE, ADVANCE_HEADERS, items)
    
    # Log the deletion with backup data for potential reversal
    import json
    entity_backup = json.dumps(deleted_item, ensure_ascii=False)
    deletion_statement = f'تم حذف السلفة [DELETED_ENTITY:{entity_backup}]'
    log_ledger_transaction('advance', advance_id, deleted_item['employee_name'], 'حذف', 0, 0, deleted_item.get('balance', 0), 0, '', '', deletion_statement)
    
    return {'success': True, 'message': f'Advance for "{deleted_item["employee_name"]}" deleted successfully'} if deleted_item else {"success": False,}


@eel.expose
def export_filtered_csv(filters=None, include_transactions=False, export_type='stock'):
    """Export filtered data as CSV content for browser download"""
    import io
    
    if export_type == 'transactions' or include_transactions:
        data = get_all_transactions(filters)
        headers = TRANSACTION_HEADERS
        filename = f'transactions_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    elif export_type == 'customers':
        data = get_all_customers(filters)
        headers = CUSTOMER_HEADERS
        filename = f'customers_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    elif export_type == 'suppliers':
        data = get_all_suppliers(filters)
        headers = SUPPLIER_HEADERS
        filename = f'suppliers_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    elif export_type == 'treasury':
        data = get_all_treasury(filters)
        headers = TREASURY_HEADERS
        filename = f'treasury_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    elif export_type == 'covenants':
        data = get_all_covenants(filters)
        headers = COVENANT_HEADERS
        filename = f'covenants_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    elif export_type == 'advances':
        data = get_all_advances(filters)
        headers = ADVANCE_HEADERS
        filename = f'advances_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    else:
        data = get_all_items(filters)
        headers = STOCK_HEADERS
        filename = f'stock_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    
    # Write CSV to string buffer
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(data)
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        'success': True, 
        'filename': filename, 
        'content': csv_content,
        'count': len(data)
    }


# ============================================
# CUSTOMERS LEDGER FUNCTIONS
# ============================================

@eel.expose
def get_payment_methods():
    """Return available payment methods for dropdown"""
    return PAYMENT_METHODS


@eel.expose
def generate_next_customer_id():
    """Generate the next available customer ID"""
    items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    if not items:
        return 'CUST-001'
    
    max_num = 0
    for item in items:
        item_id = item.get('id', '')
        if item_id.startswith('CUST-'):
            try:
                num = int(item_id.split('-')[1])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
    
    return f'CUST-{str(max_num + 1).zfill(3)}'


@eel.expose
def check_customer_exists(customer_id):
    """Check if a customer with the given ID already exists"""
    if not customer_id or not customer_id.strip():
        return {'exists': False, 'item': None}
    
    items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    customer_id_clean = customer_id.strip().upper()
    
    for item in items:
        if item['id'].strip().upper() == customer_id_clean:
            return {'exists': True, 'item': item}
    
    return {'exists': False, 'item': None}


@eel.expose
def add_or_update_customer(customer_id, name, phone, email, registration_date, document_number, opening_balance, debit, credit, payment_method, statement):
    """Add a new customer or update existing one (transaction)"""
    if not customer_id or not name:
        return {'success': False, 'message': 'Customer ID and Name are required'}
    
    customer_id = customer_id.strip().upper()
    result = check_customer_exists(customer_id)
    
    # Use current date if no registration date provided
    if not registration_date:
        registration_date = get_current_date()
    
    try:
        opening_balance = float(opening_balance) if opening_balance else 0
        debit = float(debit) if debit else 0
        credit = float(credit) if credit else 0
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Balance values must be valid numbers'}
    
    if result['exists']:
        # Update existing customer - add a new transaction
        items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
        for item in items:
            if item['id'].strip().upper() == customer_id:
                prev_balance = float(item['balance'])
                # Balance = Previous balance + Debit - Credit
                new_balance = prev_balance + debit - credit
                item['debit'] = float(item['debit']) + debit
                item['credit'] = float(item['credit']) + credit
                item['balance'] = new_balance
                item['payment_method'] = payment_method
                item['statement'] = statement
                item['document_number'] = document_number
                break
        
        write_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS, items)
        log_ledger_transaction('customer', customer_id, name.strip(), 'تحديث', debit, credit, prev_balance, new_balance, payment_method, document_number, statement, registration_date)
        return {'success': True, 'message': f'Customer "{name}" updated successfully. New balance: {new_balance}'}
    else:
        # Create new customer
        balance = opening_balance + debit - credit
        new_customer = {
            'id': customer_id,
            'name': name.strip(),
            'phone': phone.strip() if phone else '',
            'email': email.strip() if email else '',
            'registration_date': registration_date,
            'document_number': document_number.strip() if document_number else '',
            'opening_balance': opening_balance,
            'debit': debit,
            'credit': credit,
            'balance': balance,
            'payment_method': payment_method,
            'statement': statement.strip() if statement else ''
        }
        
        append_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS, new_customer)
        log_ledger_transaction('customer', customer_id, name.strip(), 'جديد', debit, credit, 0, balance, payment_method, document_number.strip() if document_number else '', statement.strip() if statement else '', registration_date)
        return {'success': True, 'message': f'Customer "{name}" added successfully with balance of {balance}'}


@eel.expose
def get_all_customers(filters=None):
    """Get all customers, optionally filtered"""
    items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    
    if filters:
        if filters.get('search'):
            search = filters['search'].lower().strip()
            items = [i for i in items if search in (i.get('id', '') or '').lower() or search in (i.get('name', '') or '').lower()]
    
    return items


@eel.expose
def get_customers_total_balance():
    """Get the total balance of all customers"""
    items = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    if not items:
        return {'total_balance': 0, 'total_debit': 0, 'total_credit': 0, 'total_opening_balance': 0, 'count': 0}
    
    total_balance = sum(float(item.get('balance', 0) or 0) for item in items)
    total_debit = sum(float(item.get('debit', 0) or 0) for item in items)
    total_credit = sum(float(item.get('credit', 0) or 0) for item in items)
    total_opening_balance = sum(float(item.get('opening_balance', 0) or 0) for item in items)
    
    return {
        'total_balance': total_balance,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'total_opening_balance': total_opening_balance,
        'count': len(items)
    }


# ============================================
# SUPPLIERS LEDGER FUNCTIONS
# ============================================

@eel.expose
def generate_next_supplier_id():
    """Generate the next available supplier ID"""
    items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    if not items:
        return 'SUPP-001'
    
    max_num = 0
    for item in items:
        item_id = item.get('id', '')
        if item_id.startswith('SUPP-'):
            try:
                num = int(item_id.split('-')[1])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
    
    return f'SUPP-{str(max_num + 1).zfill(3)}'


@eel.expose
def check_supplier_exists(supplier_id):
    """Check if a supplier with the given ID already exists"""
    if not supplier_id or not supplier_id.strip():
        return {'exists': False, 'item': None}
    
    items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    supplier_id_clean = supplier_id.strip().upper()
    
    for item in items:
        if item['id'].strip().upper() == supplier_id_clean:
            return {'exists': True, 'item': item}
    
    return {'exists': False, 'item': None}


@eel.expose
def add_or_update_supplier(supplier_id, name, phone, email, registration_date, document_number, opening_balance, debit, credit, payment_method, statement):
    """Add a new supplier or update existing one (transaction)"""
    if not supplier_id or not name:
        return {'success': False, 'message': 'Supplier ID and Name are required'}
    
    supplier_id = supplier_id.strip().upper()
    result = check_supplier_exists(supplier_id)
    
    if not registration_date:
        registration_date = get_current_date()
    
    try:
        opening_balance = float(opening_balance) if opening_balance else 0
        debit = float(debit) if debit else 0
        credit = float(credit) if credit else 0
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Balance values must be valid numbers'}
    
    if result['exists']:
        items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
        for item in items:
            if item['id'].strip().upper() == supplier_id:
                prev_balance = float(item['balance'])
                new_balance = prev_balance + debit - credit
                item['debit'] = float(item['debit']) + debit
                item['credit'] = float(item['credit']) + credit
                item['balance'] = new_balance
                item['payment_method'] = payment_method
                item['statement'] = statement
                item['document_number'] = document_number
                break
        
        write_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS, items)
        log_ledger_transaction('supplier', supplier_id, name.strip(), 'تحديث', debit, credit, prev_balance, new_balance, payment_method, document_number, statement, registration_date)
        return {'success': True, 'message': f'Supplier "{name}" updated successfully. New balance: {new_balance}'}
    else:
        balance = opening_balance + debit - credit
        new_supplier = {
            'id': supplier_id,
            'name': name.strip(),
            'phone': phone.strip() if phone else '',
            'email': email.strip() if email else '',
            'registration_date': registration_date,
            'document_number': document_number.strip() if document_number else '',
            'opening_balance': opening_balance,
            'debit': debit,
            'credit': credit,
            'balance': balance,
            'payment_method': payment_method,
            'statement': statement.strip() if statement else ''
        }
        
        append_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS, new_supplier)
        log_ledger_transaction('supplier', supplier_id, name.strip(), 'جديد', debit, credit, 0, balance, payment_method, document_number.strip() if document_number else '', statement.strip() if statement else '', registration_date)
        return {'success': True, 'message': f'Supplier "{name}" added successfully with balance of {balance}'}


@eel.expose
def get_all_suppliers(filters=None):
    """Get all suppliers, optionally filtered"""
    items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    
    if filters:
        if filters.get('search'):
            search = filters['search'].lower().strip()
            items = [i for i in items if search in (i.get('id', '') or '').lower() or search in (i.get('name', '') or '').lower()]
    
    return items


@eel.expose
def get_suppliers_total_balance():
    """Get the total balance of all suppliers"""
    items = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    if not items:
        return {'total_balance': 0, 'total_debit': 0, 'total_credit': 0, 'total_opening_balance': 0, 'count': 0}
    
    total_balance = sum(float(item.get('balance', 0) or 0) for item in items)
    total_debit = sum(float(item.get('debit', 0) or 0) for item in items)
    total_credit = sum(float(item.get('credit', 0) or 0) for item in items)
    total_opening_balance = sum(float(item.get('opening_balance', 0) or 0) for item in items)
    
    return {
        'total_balance': total_balance,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'total_opening_balance': total_opening_balance,
        'count': len(items)
    }


# ============================================
# TREASURY LEDGER FUNCTIONS (Account Name as unique identifier)
# ============================================

@eel.expose
def check_treasury_account_exists(account_number):
    """Check if a treasury account with the given number already exists"""
    if not account_number or not account_number.strip():
        return {'exists': False, 'item': None}
    
    items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
    account_number_clean = account_number.strip().lower()
    
    for item in items:
        if (item.get('account_number', '') or '').strip().lower() == account_number_clean:
            return {'exists': True, 'item': item}
    
    return {'exists': False, 'item': None}


@eel.expose
def get_treasury_total_balance():
    """Get the total balance of all treasury accounts"""
    items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
    if not items:
        return {'total_balance': 0, 'total_debit': 0, 'total_credit': 0, 'total_opening_balance': 0, 'count': 0}
    
    total_balance = sum(float(item.get('balance', 0) or 0) for item in items)
    total_debit = sum(float(item.get('debit', 0) or 0) for item in items)
    total_credit = sum(float(item.get('credit', 0) or 0) for item in items)
    total_opening_balance = sum(float(item.get('opening_balance', 0) or 0) for item in items)
    
    return {
        'total_balance': total_balance,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'total_opening_balance': total_opening_balance,
        'count': len(items)
    }


@eel.expose
def add_or_update_treasury(account_number, account_name, registration_date, document_number, opening_balance, debit, credit, payment_method, statement):
    """Add a new treasury account or update existing one (transaction)"""
    if not account_number:
        return {'success': False, 'message': 'Account Number is required'}
    
    account_number = account_number.strip()
    result = check_treasury_account_exists(account_number)
    
    if not registration_date:
        registration_date = get_current_date()
    
    try:
        opening_balance = float(opening_balance) if opening_balance else 0
        debit = float(debit) if debit else 0
        credit = float(credit) if credit else 0
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Balance values must be valid numbers'}
    
    if result['exists']:
        # Update existing account - add a new transaction
        items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
        for item in items:
            if (item.get('account_number', '') or '').strip().lower() == account_number.lower():
                prev_balance = float(item['balance'])
                new_balance = prev_balance + debit - credit
                item['debit'] = float(item['debit']) + debit
                item['credit'] = float(item['credit']) + credit
                item['balance'] = new_balance
                item['payment_method'] = payment_method
                item['statement'] = statement
                item['document_number'] = document_number
                # Update account name if provided
                if account_name and account_name.strip():
                    item['account_name'] = account_name.strip()
                break
        
        write_csv(TREASURY_FILE, TREASURY_HEADERS, items)
        log_ledger_transaction('treasury', account_number, account_name or account_number, 'تحديث', debit, credit, prev_balance, new_balance, payment_method, document_number, statement, registration_date)
        return {'success': True, 'message': f'Treasury account "{account_number}" updated. New balance: {new_balance}'}
    else:
        # Create new treasury account
        balance = opening_balance + debit - credit
        new_account = {
            'account_number': account_number,
            'account_name': account_name.strip() if account_name else '',
            'registration_date': registration_date,
            'document_number': document_number.strip() if document_number else '',
            'opening_balance': opening_balance,
            'debit': debit,
            'credit': credit,
            'balance': balance,
            'payment_method': payment_method,
            'statement': statement.strip() if statement else ''
        }
        
        append_csv(TREASURY_FILE, TREASURY_HEADERS, new_account)
        log_ledger_transaction('treasury', account_number, account_name or account_number, 'جديد', debit, credit, 0, balance, payment_method, document_number.strip() if document_number else '', statement.strip() if statement else '', registration_date)
        return {'success': True, 'message': f'Treasury account "{account_number}" added with balance of {balance}'}


@eel.expose
def get_all_treasury(filters=None):
    """Get all treasury accounts, optionally filtered"""
    items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
    
    if filters:
        # Filter by account number
        if filters.get('account_number'):
            search = filters['account_number'].lower().strip()
            items = [i for i in items if search in (i.get('account_number', '') or '').lower()]
        
        # Filter by account name
        if filters.get('account_name'):
            search = filters['account_name'].lower().strip()
            items = [i for i in items if search in (i.get('account_name', '') or '').lower()]
        
        # Filter by document number
        if filters.get('document_number'):
            search = filters['document_number'].lower().strip()
            items = [i for i in items if search in (i.get('document_number', '') or '').lower()]
        
        # Filter by payment method
        if filters.get('payment_method'):
            payment = filters['payment_method'].lower().strip()
            items = [i for i in items if (i.get('payment_method', '') or '').lower() == payment]
        
        # Filter by statement
        if filters.get('statement'):
            search = filters['statement'].lower().strip()
            items = [i for i in items if search in (i.get('statement', '') or '').lower()]
        
        # Filter by date range
        if filters.get('date_from'):
            date_from = filters['date_from']
            items = [i for i in items if (i.get('registration_date', '') or '') >= date_from]
        
        if filters.get('date_to'):
            date_to = filters['date_to']
            items = [i for i in items if (i.get('registration_date', '') or '') <= date_to]
        
        # Filter by keywords (tag search)
        keywords = filters.get('keywords', [])
        keyword_logic = filters.get('keywordLogic', 'AND')
        
        if keywords:
            def item_matches_keywords(item):
                # Create searchable text from all fields
                searchable = ' '.join([
                    str(item.get('account_number', '') or ''),
                    str(item.get('account_name', '') or ''),
                    str(item.get('document_number', '') or ''),
                    str(item.get('payment_method', '') or ''),
                    str(item.get('statement', '') or ''),
                    str(item.get('registration_date', '') or ''),
                    str(item.get('opening_balance', '') or ''),
                    str(item.get('debit', '') or ''),
                    str(item.get('credit', '') or ''),
                    str(item.get('balance', '') or '')
                ]).lower()
                
                if keyword_logic == 'AND':
                    return all(kw.lower() in searchable for kw in keywords)
                else:  # OR
                    return any(kw.lower() in searchable for kw in keywords)
            
            items = [i for i in items if item_matches_keywords(i)]
    
    return items


# ============================================
# TREASURY CONFIGURATION (INITIALIZATION)
# ============================================

@eel.expose
def get_treasury_config():
    """Get treasury configuration/initialization status"""
    if not os.path.exists(TREASURY_CONFIG_FILE):
        return {
            'initialized': False,
            'starting_capital': 0,
            'initialization_date': '',
            'fiscal_year_start': '',
            'currency': 'EGP',
            'notes': '',
            'last_updated': ''
        }
    
    config_rows = read_csv(TREASURY_CONFIG_FILE, TREASURY_CONFIG_HEADERS)
    if not config_rows:
        return {
            'initialized': False,
            'starting_capital': 0,
            'initialization_date': '',
            'fiscal_year_start': '',
            'currency': 'EGP',
            'notes': '',
            'last_updated': ''
        }
    
    # Take the first (and only) row
    config = config_rows[0]
    return {
        'initialized': config.get('initialized', '').lower() == 'true',
        'starting_capital': float(config.get('starting_capital', 0) or 0),
        'initialization_date': config.get('initialization_date', ''),
        'fiscal_year_start': config.get('fiscal_year_start', ''),
        'currency': config.get('currency', 'EGP'),
        'notes': config.get('notes', ''),
        'last_updated': config.get('last_updated', '')
    }


@eel.expose
def initialize_treasury(starting_capital, fiscal_year_start='', currency='EGP', notes=''):
    """
    Initialize the treasury with a starting capital.
    This is similar to opening a new cash book in accounting.
    The starting capital represents the initial funds available in the treasury.
    """
    if not starting_capital and starting_capital != 0:
        return {'success': False, 'message': 'Starting capital is required'}
    
    try:
        starting_capital = float(starting_capital)
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Starting capital must be a valid number'}
    
    if starting_capital < 0:
        return {'success': False, 'message': 'Starting capital cannot be negative'}
    
    # Check if already initialized
    existing_config = get_treasury_config()
    if existing_config['initialized']:
        return {'success': False, 'message': 'Treasury is already initialized. Use update function to modify.'}
    
    # Create the initialization date
    init_date = get_current_date()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Set fiscal year start to initialization date if not provided
    if not fiscal_year_start:
        fiscal_year_start = init_date
    
    config = {
        'initialized': 'true',
        'starting_capital': starting_capital,
        'initialization_date': init_date,
        'fiscal_year_start': fiscal_year_start,
        'currency': currency.upper() if currency else 'EGP',
        'notes': notes.strip() if notes else '',
        'last_updated': timestamp
    }
    
    # Write the config file
    write_csv(TREASURY_CONFIG_FILE, TREASURY_CONFIG_HEADERS, [config])
    
    # Log this as a treasury transaction
    log_ledger_transaction(
        'treasury', 
        'INIT', 
        'Treasury Initialization', 
        'تهيئة الخزينة', 
        starting_capital,  # This is a debit (money in)
        0, 
        0, 
        starting_capital, 
        'cash', 
        'INIT-001', 
        f'Treasury initialized with starting capital of {starting_capital} {currency}'
    )
    
    return {
        'success': True, 
        'message': f'Treasury initialized successfully with starting capital of {starting_capital} {currency}',
        'config': config
    }


@eel.expose
def update_treasury_config(fiscal_year_start=None, currency=None, notes=None):
    """
    Update treasury configuration settings.
    Note: Starting capital cannot be changed after initialization.
    To adjust, use debit/credit transactions.
    """
    existing_config = get_treasury_config()
    
    if not existing_config['initialized']:
        return {'success': False, 'message': 'Treasury is not initialized. Initialize first.'}
    
    # Read current config
    config_rows = read_csv(TREASURY_CONFIG_FILE, TREASURY_CONFIG_HEADERS)
    if not config_rows:
        return {'success': False, 'message': 'Treasury configuration not found'}
    
    config = config_rows[0]
    
    # Update only provided fields
    if fiscal_year_start is not None:
        config['fiscal_year_start'] = fiscal_year_start
    if currency is not None:
        config['currency'] = currency.upper()
    if notes is not None:
        config['notes'] = notes.strip()
    
    config['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Write back
    write_csv(TREASURY_CONFIG_FILE, TREASURY_CONFIG_HEADERS, [config])
    
    return {'success': True, 'message': 'Treasury configuration updated successfully'}


@eel.expose
def reset_treasury_initialization(password):
    """
    Reset treasury initialization (requires password).
    WARNING: This is a dangerous operation and should only be used for correction.
    """
    if password != DELETE_PASSWORD:
        return {'success': False, 'message': 'Incorrect password'}
    
    # Check if treasury has any accounts
    treasury_items = read_csv(TREASURY_FILE, TREASURY_HEADERS)
    if treasury_items:
        return {
            'success': False, 
            'message': f'Cannot reset treasury with {len(treasury_items)} existing accounts. Delete all accounts first.'
        }
    
    # Delete the config file
    try:
        if os.path.exists(TREASURY_CONFIG_FILE):
            os.remove(TREASURY_CONFIG_FILE)
        return {'success': True, 'message': 'Treasury initialization has been reset'}
    except Exception as e:
        return {'success': False, 'message': f'Error resetting treasury: {str(e)}'}


@eel.expose
def get_treasury_summary():
    """
    Get a comprehensive treasury summary including initialization status,
    starting capital, total transactions, and current position.
    This follows standard accounting practices for cash/treasury reporting.
    """
    config = get_treasury_config()
    balance_info = get_treasury_total_balance()
    
    # Calculate current treasury position
    if config['initialized']:
        starting_capital = config['starting_capital']
        # Current position = Starting Capital + Net Transactions
        # Net Transactions = Total Debits - Total Credits (from all accounts)
        net_transactions = balance_info['total_debit'] - balance_info['total_credit']
        current_position = starting_capital + net_transactions
    else:
        starting_capital = 0
        net_transactions = 0
        current_position = 0
    
    return {
        'initialized': config['initialized'],
        'starting_capital': starting_capital,
        'initialization_date': config.get('initialization_date', ''),
        'fiscal_year_start': config.get('fiscal_year_start', ''),
        'currency': config.get('currency', 'EGP'),
        'notes': config.get('notes', ''),
        'total_accounts': balance_info['count'],
        'total_opening_balances': balance_info['total_opening_balance'],
        'total_debit': balance_info['total_debit'],
        'total_credit': balance_info['total_credit'],
        'accounts_balance': balance_info['total_balance'],
        'net_transactions': net_transactions,
        'current_position': current_position,
        'last_updated': config.get('last_updated', '')
    }


# ============================================
# COVENANTS LEDGER FUNCTIONS
# ============================================

@eel.expose
def generate_next_covenant_id():
    """Generate the next available covenant ID"""
    items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
    if not items:
        return 'COV-001'
    
    max_num = 0
    for item in items:
        item_id = item.get('id', '')
        if item_id.startswith('COV-'):
            try:
                num = int(item_id.split('-')[1])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
    
    return f'COV-{str(max_num + 1).zfill(3)}'


@eel.expose
def check_covenant_exists(covenant_id):
    """Check if a covenant with the given ID already exists"""
    if not covenant_id or not covenant_id.strip():
        return {'exists': False, 'item': None}
    
    items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
    covenant_id_clean = covenant_id.strip().upper()
    
    for item in items:
        if item['id'].strip().upper() == covenant_id_clean:
            return {'exists': True, 'item': item}
    
    return {'exists': False, 'item': None}


@eel.expose
def add_or_update_covenant(covenant_id, employee_name, phone, registration_date, document_number, opening_balance, debit, credit, payment_method, statement):
    """Add a new covenant or update existing one"""
    if not covenant_id or not employee_name:
        return {'success': False, 'message': 'Covenant ID and Employee Name are required'}
    
    covenant_id = covenant_id.strip().upper()
    result = check_covenant_exists(covenant_id)
    
    if not registration_date:
        registration_date = get_current_date()
    
    try:
        opening_balance = float(opening_balance) if opening_balance else 0
        debit = float(debit) if debit else 0
        credit = float(credit) if credit else 0
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Balance values must be valid numbers'}
    
    if result['exists']:
        items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
        for item in items:
            if item['id'].strip().upper() == covenant_id:
                prev_balance = float(item['balance'])
                new_balance = prev_balance + debit - credit
                item['debit'] = float(item['debit']) + debit
                item['credit'] = float(item['credit']) + credit
                item['balance'] = new_balance
                item['payment_method'] = payment_method
                item['statement'] = statement
                item['document_number'] = document_number
                break
        
        write_csv(COVENANTS_FILE, COVENANT_HEADERS, items)
        log_ledger_transaction('covenant', covenant_id, employee_name.strip(), 'تحديث', debit, credit, prev_balance, new_balance, payment_method, document_number, statement, registration_date)
        return {'success': True, 'message': f'Covenant for "{employee_name}" updated. New balance: {new_balance}'}
    else:
        balance = opening_balance + debit - credit
        new_covenant = {
            'id': covenant_id,
            'employee_name': employee_name.strip(),
            'phone': phone.strip() if phone else '',
            'registration_date': registration_date,
            'document_number': document_number.strip() if document_number else '',
            'opening_balance': opening_balance,
            'debit': debit,
            'credit': credit,
            'balance': balance,
            'payment_method': payment_method,
            'statement': statement.strip() if statement else ''
        }
        
        append_csv(COVENANTS_FILE, COVENANT_HEADERS, new_covenant)
        log_ledger_transaction('covenant', covenant_id, employee_name.strip(), 'جديد', debit, credit, 0, balance, payment_method, document_number.strip() if document_number else '', statement.strip() if statement else '', registration_date)
        return {'success': True, 'message': f'Covenant for "{employee_name}" added with balance of {balance}'}


@eel.expose
def get_all_covenants(filters=None):
    """Get all covenants, optionally filtered"""
    items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
    
    if filters:
        if filters.get('search'):
            search = filters['search'].lower().strip()
            items = [i for i in items if search in (i.get('id', '') or '').lower() or search in (i.get('employee_name', '') or '').lower()]
    
    return items


@eel.expose
def get_covenants_total_balance():
    """Get the total balance of all covenants"""
    items = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
    if not items:
        return {'total_balance': 0, 'total_debit': 0, 'total_credit': 0, 'total_opening_balance': 0, 'count': 0}
    
    total_balance = sum(float(item.get('balance', 0) or 0) for item in items)
    total_debit = sum(float(item.get('debit', 0) or 0) for item in items)
    total_credit = sum(float(item.get('credit', 0) or 0) for item in items)
    total_opening_balance = sum(float(item.get('opening_balance', 0) or 0) for item in items)
    
    return {
        'total_balance': total_balance,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'total_opening_balance': total_opening_balance,
        'count': len(items)
    }


# ============================================
# ADVANCES LEDGER FUNCTIONS
# ============================================

@eel.expose
def generate_next_advance_id():
    """Generate the next available advance ID"""
    items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
    if not items:
        return 'ADV-001'
    
    max_num = 0
    for item in items:
        item_id = item.get('id', '')
        if item_id.startswith('ADV-'):
            try:
                num = int(item_id.split('-')[1])
                max_num = max(max_num, num)
            except (ValueError, IndexError):
                pass
    
    return f'ADV-{str(max_num + 1).zfill(3)}'


@eel.expose
def check_advance_exists(advance_id):
    """Check if an advance with the given ID already exists"""
    if not advance_id or not advance_id.strip():
        return {'exists': False, 'item': None}
    
    items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
    advance_id_clean = advance_id.strip().upper()
    
    for item in items:
        if item['id'].strip().upper() == advance_id_clean:
            return {'exists': True, 'item': item}
    
    return {'exists': False, 'item': None}


@eel.expose
def add_or_update_advance(advance_id, employee_name, phone, registration_date, document_number, opening_balance, debit, credit, payment_method, statement):
    """Add a new advance or update existing one"""
    if not advance_id or not employee_name:
        return {'success': False, 'message': 'Advance ID and Employee Name are required'}
    
    advance_id = advance_id.strip().upper()
    result = check_advance_exists(advance_id)
    
    if not registration_date:
        registration_date = get_current_date()
    
    try:
        opening_balance = float(opening_balance) if opening_balance else 0
        debit = float(debit) if debit else 0
        credit = float(credit) if credit else 0
    except (ValueError, TypeError):
        return {'success': False, 'message': 'Balance values must be valid numbers'}
    
    if result['exists']:
        items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
        for item in items:
            if item['id'].strip().upper() == advance_id:
                prev_balance = float(item['balance'])
                new_balance = prev_balance + debit - credit
                item['debit'] = float(item['debit']) + debit
                item['credit'] = float(item['credit']) + credit
                item['balance'] = new_balance
                item['payment_method'] = payment_method
                item['statement'] = statement
                item['document_number'] = document_number
                break
        
        write_csv(ADVANCES_FILE, ADVANCE_HEADERS, items)
        log_ledger_transaction('advance', advance_id, employee_name.strip(), 'تحديث', debit, credit, prev_balance, new_balance, payment_method, document_number, statement, registration_date)
        return {'success': True, 'message': f'Advance for "{employee_name}" updated. New balance: {new_balance}'}
    else:
        balance = opening_balance + debit - credit
        new_advance = {
            'id': advance_id,
            'employee_name': employee_name.strip(),
            'phone': phone.strip() if phone else '',
            'registration_date': registration_date,
            'document_number': document_number.strip() if document_number else '',
            'opening_balance': opening_balance,
            'debit': debit,
            'credit': credit,
            'balance': balance,
            'payment_method': payment_method,
            'statement': statement.strip() if statement else ''
        }
        
        append_csv(ADVANCES_FILE, ADVANCE_HEADERS, new_advance)
        log_ledger_transaction('advance', advance_id, employee_name.strip(), 'جديد', debit, credit, 0, balance, payment_method, document_number.strip() if document_number else '', statement.strip() if statement else '', registration_date)
        return {'success': True, 'message': f'Advance for "{employee_name}" added with balance of {balance}'}


@eel.expose
def get_all_advances(filters=None):
    """Get all advances, optionally filtered"""
    items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
    
    if filters:
        if filters.get('search'):
            search = filters['search'].lower().strip()
            items = [i for i in items if search in (i.get('id', '') or '').lower() or search in (i.get('employee_name', '') or '').lower()]
    
    return items


@eel.expose
def get_advances_total_balance():
    """Get the total balance of all advances"""
    items = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
    if not items:
        return {'total_balance': 0, 'total_debit': 0, 'total_credit': 0, 'total_opening_balance': 0, 'count': 0}
    
    total_balance = sum(float(item.get('balance', 0) or 0) for item in items)
    total_debit = sum(float(item.get('debit', 0) or 0) for item in items)
    total_credit = sum(float(item.get('credit', 0) or 0) for item in items)
    total_opening_balance = sum(float(item.get('opening_balance', 0) or 0) for item in items)
    
    return {
        'total_balance': total_balance,
        'total_debit': total_debit,
        'total_credit': total_credit,
        'total_opening_balance': total_opening_balance,
        'count': len(items)
    }


# ============================================
# Cloud Sync Import Functions
# ============================================

@eel.expose
def import_item_from_cloud(factory_key, item_data, skip_existing=False):
    """Import a stock item from cloud sync - updates if exists, adds if new
    
    Args:
        factory_key: The factory identifier
        item_data: The item data from cloud
        skip_existing: If True, skip items that already exist locally (non-destructive)
    """
    try:
        stock_file = get_stock_file(factory_key)
        items = read_csv(stock_file, STOCK_HEADERS)
        
        item_id = str(item_data.get('id', '')).strip().upper()
        
        # Find existing item
        existing_idx = None
        for idx, item in enumerate(items):
            if item.get('id', '').strip().upper() == item_id:
                existing_idx = idx
                break
        
        # Skip if item exists and skip_existing is True
        if existing_idx is not None and skip_existing:
            return {'success': True, 'skipped': True}
        
        # Prepare item data
        new_item = {
            'id': item_id,
            'name': item_data.get('name', ''),
            'category': item_data.get('category', ''),
            'unit': item_data.get('unit', ''),
            'location': item_data.get('location', ''),
            'supplier': item_data.get('supplier', ''),
            'starting_balance': item_data.get('starting_balance', 0),
            'total_incoming': item_data.get('total_incoming', 0),
            'total_outgoing': item_data.get('total_outgoing', 0),
            'net_stock': item_data.get('net_stock', 0),
            'unit_price': item_data.get('unit_price', 0),
            'min_stock': item_data.get('min_stock', 0),
            'last_updated': item_data.get('last_updated', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        }
        
        if existing_idx is not None:
            items[existing_idx] = new_item
        else:
            items.append(new_item)
        
        write_csv(stock_file, STOCK_HEADERS, items)
        return {'success': True}
    except Exception as e:
        print(f"Error importing item from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_customer_from_cloud(customer_data, skip_existing=False):
    """Import a customer from cloud sync
    
    Args:
        customer_data: The customer data from cloud
        skip_existing: If True, skip customers that already exist locally (non-destructive)
    """
    try:
        customers = read_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS)
        customer_id = str(customer_data.get('id', '')).strip()
        
        existing_idx = None
        for idx, c in enumerate(customers):
            if c.get('id', '').strip() == customer_id:
                existing_idx = idx
                break
        
        # Skip if customer exists and skip_existing is True
        if existing_idx is not None and skip_existing:
            return {'success': True, 'skipped': True}
        
        new_customer = {
            'id': customer_id,
            'name': customer_data.get('name', ''),
            'phone': customer_data.get('phone', ''),
            'email': customer_data.get('email', ''),
            'registration_date': customer_data.get('registration_date', ''),
            'document_number': customer_data.get('document_number', ''),
            'opening_balance': customer_data.get('opening_balance', 0),
            'debit': customer_data.get('debit', 0),
            'credit': customer_data.get('credit', 0),
            'balance': customer_data.get('balance', 0),
            'payment_method': customer_data.get('payment_method', ''),
            'statement': customer_data.get('statement', '')
        }
        
        if existing_idx is not None:
            customers[existing_idx] = new_customer
        else:
            customers.append(new_customer)
        
        write_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS, customers)
        return {'success': True}
    except Exception as e:
        print(f"Error importing customer from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_supplier_from_cloud(supplier_data, skip_existing=False):
    """Import a supplier from cloud sync
    
    Args:
        supplier_data: The supplier data from cloud
        skip_existing: If True, skip suppliers that already exist locally (non-destructive)
    """
    try:
        suppliers = read_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS)
        supplier_id = str(supplier_data.get('id', '')).strip()
        
        existing_idx = None
        for idx, s in enumerate(suppliers):
            if s.get('id', '').strip() == supplier_id:
                existing_idx = idx
                break
        
        # Skip if supplier exists and skip_existing is True
        if existing_idx is not None and skip_existing:
            return {'success': True, 'skipped': True}
        
        new_supplier = {
            'id': supplier_id,
            'name': supplier_data.get('name', ''),
            'phone': supplier_data.get('phone', ''),
            'email': supplier_data.get('email', ''),
            'registration_date': supplier_data.get('registration_date', ''),
            'document_number': supplier_data.get('document_number', ''),
            'opening_balance': supplier_data.get('opening_balance', 0),
            'debit': supplier_data.get('debit', 0),
            'credit': supplier_data.get('credit', 0),
            'balance': supplier_data.get('balance', 0),
            'payment_method': supplier_data.get('payment_method', ''),
            'statement': supplier_data.get('statement', '')
        }
        
        if existing_idx is not None:
            suppliers[existing_idx] = new_supplier
        else:
            suppliers.append(new_supplier)
        
        write_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS, suppliers)
        return {'success': True}
    except Exception as e:
        print(f"Error importing supplier from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_treasury_from_cloud(treasury_data, skip_existing=False):
    """Import a treasury account from cloud sync
    
    Args:
        treasury_data: The treasury account data from cloud
        skip_existing: If True, skip accounts that already exist locally (non-destructive)
    """
    try:
        treasury = read_csv(TREASURY_FILE, TREASURY_HEADERS)
        account_number = str(treasury_data.get('account_number', '')).strip()
        
        existing_idx = None
        for idx, t in enumerate(treasury):
            if t.get('account_number', '').strip() == account_number:
                existing_idx = idx
                break
        
        # Skip if account exists and skip_existing is True
        if existing_idx is not None and skip_existing:
            return {'success': True, 'skipped': True}
        
        new_account = {
            'account_number': account_number,
            'account_name': treasury_data.get('account_name', ''),
            'registration_date': treasury_data.get('registration_date', ''),
            'document_number': treasury_data.get('document_number', ''),
            'opening_balance': treasury_data.get('opening_balance', 0),
            'debit': treasury_data.get('debit', 0),
            'credit': treasury_data.get('credit', 0),
            'balance': treasury_data.get('balance', 0),
            'payment_method': treasury_data.get('payment_method', ''),
            'statement': treasury_data.get('statement', '')
        }
        
        if existing_idx is not None:
            treasury[existing_idx] = new_account
        else:
            treasury.append(new_account)
        
        write_csv(TREASURY_FILE, TREASURY_HEADERS, treasury)
        return {'success': True}
    except Exception as e:
        print(f"Error importing treasury from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_treasury_config_from_cloud(config_data, skip_existing=False):
    """Import treasury configuration from cloud sync
    
    Args:
        config_data: The treasury config data from cloud
        skip_existing: If True, skip if config already exists locally (non-destructive)
    """
    try:
        # Skip if config exists and skip_existing is True
        if skip_existing and os.path.exists(TREASURY_CONFIG_FILE):
            existing = read_csv(TREASURY_CONFIG_FILE, TREASURY_CONFIG_HEADERS)
            if existing and len(existing) > 0:
                return {'success': True, 'skipped': True}
        
        config = {
            'initialized': str(config_data.get('initialized', False)).lower(),
            'starting_capital': config_data.get('starting_capital', 0),
            'initialization_date': config_data.get('initialization_date', ''),
            'fiscal_year_start': config_data.get('fiscal_year_start', ''),
            'currency': config_data.get('currency', 'EGP'),
            'notes': config_data.get('notes', ''),
            'last_updated': config_data.get('last_updated', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        }
        
        write_csv(TREASURY_CONFIG_FILE, TREASURY_CONFIG_HEADERS, [config])
        return {'success': True}
    except Exception as e:
        print(f"Error importing treasury config from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_covenant_from_cloud(covenant_data, skip_existing=False):
    """Import a covenant from cloud sync"""
    try:
        covenants = read_csv(COVENANTS_FILE, COVENANT_HEADERS)
        covenant_id = str(covenant_data.get('id', '')).strip()
        
        existing_idx = None
        for idx, c in enumerate(covenants):
            if c.get('id', '').strip() == covenant_id:
                existing_idx = idx
                break
        
        if existing_idx is not None and skip_existing:
            return {'success': True, 'skipped': True}
        
        new_covenant = {
            'id': covenant_id,
            'employee_name': covenant_data.get('employee_name', ''),
            'phone': covenant_data.get('phone', ''),
            'registration_date': covenant_data.get('registration_date', ''),
            'document_number': covenant_data.get('document_number', ''),
            'opening_balance': covenant_data.get('opening_balance', 0),
            'debit': covenant_data.get('debit', 0),
            'credit': covenant_data.get('credit', 0),
            'balance': covenant_data.get('balance', 0),
            'payment_method': covenant_data.get('payment_method', ''),
            'statement': covenant_data.get('statement', '')
        }
        
        if existing_idx is not None:
            covenants[existing_idx] = new_covenant
        else:
            covenants.append(new_covenant)
        
        write_csv(COVENANTS_FILE, COVENANT_HEADERS, covenants)
        return {'success': True}
    except Exception as e:
        print(f"Error importing covenant from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_advance_from_cloud(advance_data, skip_existing=False):
    """Import an advance from cloud sync"""
    try:
        advances = read_csv(ADVANCES_FILE, ADVANCE_HEADERS)
        advance_id = str(advance_data.get('id', '')).strip()
        
        existing_idx = None
        for idx, a in enumerate(advances):
            if a.get('id', '').strip() == advance_id:
                existing_idx = idx
                break
        
        if existing_idx is not None and skip_existing:
            return {'success': True, 'skipped': True}
        
        new_advance = {
            'id': advance_id,
            'employee_name': advance_data.get('employee_name', ''),
            'phone': advance_data.get('phone', ''),
            'registration_date': advance_data.get('registration_date', ''),
            'document_number': advance_data.get('document_number', ''),
            'opening_balance': advance_data.get('opening_balance', 0),
            'debit': advance_data.get('debit', 0),
            'credit': advance_data.get('credit', 0),
            'balance': advance_data.get('balance', 0),
            'payment_method': advance_data.get('payment_method', ''),
            'statement': advance_data.get('statement', '')
        }
        
        if existing_idx is not None:
            advances[existing_idx] = new_advance
        else:
            advances.append(new_advance)
        
        write_csv(ADVANCES_FILE, ADVANCE_HEADERS, advances)
        return {'success': True}
    except Exception as e:
        print(f"Error importing advance from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_stock_transactions_from_cloud(transactions, skip_existing=False):
    """Import stock transactions from cloud sync (batch)
    
    Args:
        transactions: List of stock transaction dicts from cloud
        skip_existing: If True, skip transactions that already exist locally
    """
    try:
        existing = read_csv(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS)
        
        # Build a set of existing transaction keys for dedup
        existing_keys = set()
        if skip_existing:
            for t in existing:
                key = f"{t.get('timestamp', '')}_{t.get('item_id', '')}_{t.get('factory', '')}"
                existing_keys.add(key)
        
        imported = 0
        skipped = 0
        
        for t in transactions:
            key = f"{t.get('timestamp', '')}_{t.get('item_id', '')}_{t.get('factory', '')}"
            
            if skip_existing and key in existing_keys:
                skipped += 1
                continue
            
            # Also skip if already exists (dedup even when not skip_existing mode, to avoid dupes)
            if key in existing_keys:
                skipped += 1
                continue
            
            row = {
                'timestamp': t.get('timestamp', ''),
                'transaction_date': t.get('transaction_date', ''),
                'item_id': t.get('item_id', ''),
                'item_name': t.get('item_name', ''),
                'transaction_type': t.get('transaction_type', ''),
                'quantity': t.get('quantity', 0),
                'previous_stock': t.get('previous_stock', 0),
                'new_stock': t.get('new_stock', 0),
                'supplier': t.get('supplier', ''),
                'price': t.get('price', 0),
                'document_type': t.get('document_type', ''),
                'document_number': t.get('document_number', ''),
                'notes': t.get('notes', ''),
                'factory': t.get('factory', '')
            }
            append_csv(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS, row)
            existing_keys.add(key)
            imported += 1
        
        print(f"[CLOUD] Imported {imported} stock transactions, skipped {skipped}")
        return {'success': True, 'imported': imported, 'skipped': skipped}
    except Exception as e:
        print(f"Error importing stock transactions from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def import_ledger_transactions_from_cloud(ledger_type, transactions, skip_existing=False):
    """Import ledger transactions from cloud sync (batch, per module)
    
    Args:
        ledger_type: 'customer', 'supplier', 'treasury', 'covenant', 'advance'
        transactions: List of ledger transaction dicts from cloud
        skip_existing: If True, skip transactions that already exist locally
    """
    try:
        transaction_file = LEDGER_TRANSACTION_FILES.get(ledger_type)
        if not transaction_file:
            return {'success': False, 'error': f'Unknown ledger type: {ledger_type}'}
        
        existing = read_csv(transaction_file, LEDGER_TRANSACTION_HEADERS)
        
        # Build a set of existing transaction keys for dedup
        existing_keys = set()
        for t in existing:
            key = f"{t.get('timestamp', '')}_{t.get('entity_id', '')}"
            existing_keys.add(key)
        
        imported = 0
        skipped = 0
        
        for t in transactions:
            key = f"{t.get('timestamp', '')}_{t.get('entity_id', '')}"
            
            if key in existing_keys:
                skipped += 1
                continue
            
            row = {
                'timestamp': t.get('timestamp', ''),
                'transaction_date': t.get('transaction_date', ''),
                'entity_id': t.get('entity_id', ''),
                'entity_name': t.get('entity_name', ''),
                'transaction_type': t.get('transaction_type', ''),
                'debit': t.get('debit', 0),
                'credit': t.get('credit', 0),
                'previous_balance': t.get('previous_balance', 0),
                'new_balance': t.get('new_balance', 0),
                'payment_method': t.get('payment_method', ''),
                'document_number': t.get('document_number', ''),
                'statement': t.get('statement', '')
            }
            append_csv(transaction_file, LEDGER_TRANSACTION_HEADERS, row)
            existing_keys.add(key)
            imported += 1
        
        print(f"[CLOUD] Imported {imported} {ledger_type} transactions, skipped {skipped}")
        return {'success': True, 'imported': imported, 'skipped': skipped}
    except Exception as e:
        print(f"Error importing {ledger_type} transactions from cloud: {e}")
        return {'success': False, 'error': str(e)}


@eel.expose
def clear_all_local_data():
    """
    Clear all local data (for force pull operation).
    This is a dangerous operation - confirmation handled by frontend.
    """
    try:
        # Clear all stock files
        for factory, stock_file in FACTORY_STOCK_FILES.items():
            write_csv(stock_file, STOCK_HEADERS, [])
        
        # Clear ledger files
        write_csv(CUSTOMERS_FILE, CUSTOMER_HEADERS, [])
        write_csv(SUPPLIERS_FILE, SUPPLIER_HEADERS, [])
        write_csv(TREASURY_FILE, TREASURY_HEADERS, [])
        write_csv(COVENANTS_FILE, COVENANT_HEADERS, [])
        write_csv(ADVANCES_FILE, ADVANCE_HEADERS, [])
        
        # Clear treasury config
        if os.path.exists(TREASURY_CONFIG_FILE):
            os.remove(TREASURY_CONFIG_FILE)
        
        # Clear transaction files (they will be re-downloaded from cloud)
        write_csv(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS, [])
        for ledger_type, file_path in LEDGER_TRANSACTION_FILES.items():
            write_csv(file_path, LEDGER_TRANSACTION_HEADERS, [])
        
        # Clear full log files (these contain all operations including edits/deletions)
        write_csv(TRANSACTIONS_FILE, TRANSACTION_HEADERS, [])
        write_csv(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS, [])
        
        return {'success': True, 'message': 'All local data cleared'}
    except Exception as e:
        print(f"Error clearing local data: {e}")
        return {'success': False, 'message': str(e)}


@eel.expose
def get_app_version():
    """Get current app version"""
    return APP_VERSION


@eel.expose
def get_version_info():
    """Get version info from local version.json file"""
    try:
        import json
        if os.path.exists(VERSION_FILE):
            with open(VERSION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"version": APP_VERSION, "build_date": "", "changelog": []}
    except Exception as e:
        print(f"[ERROR] Failed to read version info: {e}")
        return {"version": APP_VERSION, "build_date": "", "changelog": []}


@eel.expose
def download_update(download_url, version):
    """Download a new version of the app from Google Drive"""
    import re

    if not download_url or str(download_url).strip() in ('', 'None', 'null'):
        return {
            'success': False,
            'error': 'No download URL available for this version. Please check with your administrator.'
        }

    try:
        # Get the user's Downloads folder
        downloads_folder = os.path.join(os.path.expanduser('~'), 'Downloads')
        if not os.path.exists(downloads_folder):
            os.makedirs(downloads_folder)
        
        filename = f"EnterprisFlow_v{version}.exe"
        save_path = os.path.join(downloads_folder, filename)
        
        print(f"[UPDATE] Downloading update v{version}...")
        print(f"[UPDATE] URL: {download_url}")
        print(f"[UPDATE] Save to: {save_path}")
        
        # Extract file ID from Google Drive URL
        file_id = None
        match = re.search(r'id=([a-zA-Z0-9_-]+)', download_url)
        if match:
            file_id = match.group(1)
        else:
            match = re.search(r'/d/([a-zA-Z0-9_-]+)', download_url)
            if match:
                file_id = match.group(1)
        
        if not file_id:
            raise Exception(f"Could not extract file ID from URL: {download_url}")
        
        print(f"[UPDATE] Google Drive file ID: {file_id}")

        # Remove any leftover partial file from a previous failed attempt
        if os.path.exists(save_path):
            os.remove(save_path)

        # Download using requests.
        # Google Drive switched to drive.usercontent.google.com for direct downloads.
        # Using confirm=t and authuser=0 bypasses the virus-scan warning page entirely.
        try:
            import requests
        except ImportError:
            import subprocess as sp
            sp.check_call([sys.executable, '-m', 'pip', 'install', 'requests'])
            import requests

        session = requests.Session()
        # Modern direct-download URL — bypasses HTML warning page on large files
        direct_url = (
            f"https://drive.usercontent.google.com/download"
            f"?id={file_id}&export=download&authuser=0&confirm=t"
        )

        print(f"[UPDATE] Starting download from Google Drive...")
        response = session.get(direct_url, stream=True, timeout=60)
        response.raise_for_status()

        # Sanity-check: make sure we got binary data, not an error HTML page
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' in content_type:
            snippet = response.text[:300]
            raise Exception(f"Drive returned an HTML page instead of the file. Response: {snippet}")

        # Stream to disk in 8 MB chunks
        total_written = 0
        chunk_size = 8 * 1024 * 1024
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    total_written += len(chunk)
                    print(f"[UPDATE] Downloaded {total_written / (1024*1024):.1f} MB...", end='\r')

        print()  # newline after progress line
        if total_written == 0:
            raise Exception("Downloaded file is empty — Drive may have returned an error")
        
        # Verify download
        actual_size = os.path.getsize(save_path)
        print(f"[UPDATE] Downloaded size: {actual_size / (1024*1024):.1f} MB")
        
        if actual_size < 100000:  # Less than 100KB is suspicious for an EXE
            with open(save_path, 'rb') as f:
                header = f.read(500)
            if b'<html' in header.lower() or b'<!doctype' in header.lower():
                os.remove(save_path)
                raise Exception("Download returned HTML instead of the EXE file")
        
        print(f"[UPDATE] Download complete: {save_path}")
        
        return {
            'success': True,
            'path': save_path,
            'filename': filename
        }
    except Exception as e:
        print(f"[UPDATE] Download failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@eel.expose
def open_file_location(file_path):
    """Open the folder containing the downloaded file in Explorer"""
    import subprocess as sp
    try:
        # Open Explorer with the file selected
        sp.Popen(f'explorer /select,"{file_path}"')
        return True
    except Exception as e:
        print(f"[ERROR] Failed to open file location: {e}")
        return False


# Start the application
if __name__ == '__main__':
    # Ensure data files and folders exist
    if not os.path.exists(EXPORTS_FOLDER):
        os.makedirs(EXPORTS_FOLDER)
    
    # Initialize factory-specific stock files
    for factory, stock_file in FACTORY_STOCK_FILES.items():
        ensure_csv_exists(stock_file, STOCK_HEADERS)
    
    ensure_csv_exists(TRANSACTIONS_FILE, TRANSACTION_HEADERS)
    ensure_csv_exists(CUSTOMERS_FILE, CUSTOMER_HEADERS)
    ensure_csv_exists(SUPPLIERS_FILE, SUPPLIER_HEADERS)
    ensure_csv_exists(TREASURY_FILE, TREASURY_HEADERS)
    ensure_csv_exists(COVENANTS_FILE, COVENANT_HEADERS)
    ensure_csv_exists(ADVANCES_FILE, ADVANCE_HEADERS)
    ensure_csv_exists(LEDGER_LOG_FILE, LEDGER_LOG_HEADERS)
    
    # Initialize per-module transaction files
    ensure_csv_exists(STOCK_TRANSACTIONS_FILE, STOCK_TRANSACTION_HEADERS)
    for ledger_type, file_path in LEDGER_TRANSACTION_FILES.items():
        ensure_csv_exists(file_path, LEDGER_TRANSACTION_HEADERS)
    
    # Run CSV schema migrations (adds new columns to existing files)
    run_migrations()
    
    print("Starting Warehouse Stock Logging App...")
    print(f"Data stored in: {DATA_PATH}")
    print("Opening browser window...")
    
    # Start Eel with Chrome/Edge in app mode, fallback to default browser
    try:
        eel.start('index.html', size=(1200, 800), mode='edge')
    except EnvironmentError:
        try:
            eel.start('index.html', size=(1200, 800), mode='chrome')
        except EnvironmentError:
            print("Chrome/Edge not found. Using default browser.")
            eel.start('index.html', size=(1200, 800), mode='default')