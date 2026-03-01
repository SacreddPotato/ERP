/**
 * Internationalization (i18n) Module
 * Supports English and Arabic with RTL layout
 */

const translations = {
    en: {
        // App Header
        app_title: "💼 EnterprisFlow",
        app_subtitle: "Stock, Ledgers, Treasury & Operations Management",
        footer_contact: "Need more features? Contact: 01157019062",
        
        // Cloud Sync & Auth
        btn_signin: "Sign In",
        btn_signup: "Create Account",
        btn_signout: "Sign Out",
        email: "Email",
        password: "Password",
        confirm_password: "Confirm Password",
        company_name: "Company Name",
        forgot_password: "Forgot password?",
        create_account: "Create account",
        have_account: "Already have an account? Sign in",
        reset_info: "Enter your email and we'll send you a reset link.",
        btn_reset: "Send Reset Link",
        back_to_signin: "← Back to sign in",
        sync_local: "☁️ Local Only",
        sync_synced: "☁️ Synced",
        sync_syncing: "🔄 Syncing...",
        sync_offline: "📴 Offline",
        btn_pull: "📥 Pull",
        btn_push: "📤 Push",
        btn_force_pull: "⚠️ Force Pull",
        title_pull: "Download from cloud",
        title_push: "Upload to cloud (overwrites!)",
        title_force_pull: "Delete local data and replace with cloud (DANGEROUS!)",
        
        // Navigation Tabs
        tab_add_item: "Add/Update Item",
        tab_view_stock: "View Stock",
        tab_transactions: "Transaction Log",
        
        // Add Item Section
        item_entry: "Item Entry",
        item_id: "Item ID",
        btn_check_id: "Check ID",
        btn_generate_id: "Generate ID",
        hint_id_auto: "ID will be auto-suggested. You can edit it.",
        
        // New Item Form
        new_item_details: "➕ New Item Details",
        item_name: "Item Name *",
        item_category: "Category *",
        select_category: "Select category...",
        item_unit: "Unit *",
        select_unit: "Select unit...",
        item_location: "Warehouse Location *",
        select_location: "Select location...",
        item_sub_location: "Sub-Location *",
        select_sub_location: "Select sub-location...",
        item_supplier: "Supplier Name *",
        starting_balance: "Starting Balance *",
        unit_price: "Unit Price *",
        min_stock: "Minimum Stock Level",
        hint_starting_balance: "This value cannot be changed after item is added.",
        btn_add_item: "Add New Item",
        
        // Categories
        cat_raw_materials: "Raw Materials",
        cat_finished_product: "Finished Product",
        cat_packaging: "Packaging",
        
        // Locations
        loc_bahbit: "Bahbit",
        loc_old_factory: "Old Factory",
        loc_station: "Station",
        loc_thaabaneya: "Thaabaneya",
        
        // Factory Selector
        current_factory_label: "🏭 Current Factory:",
        factory_context_info: "Viewing stock for this factory only",
        transfer_from_factory: "Transfer from",
        transfer_to_factory: "Transfer to",
        
        // Sub-Locations (Production Lines)
        subloc_production_line_1: "Production Line 1",
        subloc_production_line_2: "Production Line 2",
        subloc_production_line_3: "Production Line 3",
        subloc_production_line_4: "Production Line 4",
        
        // Internal Transfer
        internal_transfer_to: "Internal Transfer To",
        select_no_transfer: "No internal transfer",
        hint_internal_transfer: "⚠️ If internal transfer is selected, supplier cannot be entered and vice versa.",
        
        // Starting Balance Date
        starting_balance_date: "Balance Date (Optional)",
        hint_balance_date: "Leave empty for today's date, or enter a past date for old imports.",
        
        // Outgoing Production Line
        outgoing_production_line: "Transfer to Production Line *",
        select_production_line: "Select production line...",
        outgoing_internal_transfer: "Internal Transfer To",
        hint_production_or_transfer: "⚠️ Either production line or internal transfer must be selected (not both).",
        
        // Document Type and Number
        document_info: "Document Information",
        select_document_type: "Select document type...",
        doc_purchase_invoice: "Purchase Invoice",
        doc_sales_invoice: "Sales Invoice",
        doc_raw_materials_order: "Raw Materials Disbursement",
        doc_finished_product_receipt: "Finished Product Receipt",
        doc_internal_transfer: "Internal Transfer",
        placeholder_document_number: "Document number...",
        
        // Update Stock Form
        update_stock: "📊 Update Stock",
        info_name: "Name:",
        info_category: "Category:",
        info_current_stock: "Current Stock:",
        info_location: "Location:",
        info_supplier: "Supplier:",
        info_price: "Avg Price:",
        info_min_stock: "Min Stock:",
        transaction_type: "Transaction Type *",
        select_type: "Select type...",
        type_incoming: "📥 Incoming (Add Stock)",
        type_outgoing: "📤 Outgoing (Remove Stock)",
        type_transfer: "🔄 Internal Transfer",
        transfer_locations: "Transfer Locations *",
        transfer_from: "From Location *",
        transfer_to: "To Location *",
        quantity: "Quantity *",
        incoming_supplier: "Supplier for this Shipment *",
        incoming_internal_transfer: "Internal Transfer From",
        hint_supplier_or_transfer: "⚠️ Either supplier or internal transfer must be selected (not both).",
        shipment_price: "Unit Price for this Shipment *",
        hint_price_average: "Price will be averaged with existing stock.",
        transaction_date: "Transaction Date",
        hint_transaction_date: "Leave empty for today's date, or select a past date for older transactions.",
        btn_update_stock: "Update Stock",
        
        // Low Stock Notifications
        low_stock_alerts: "Low Stock Alerts",
        btn_dismiss: "Dismiss",
        notification_low_stock: "is below minimum level",
        notification_current: "Current:",
        notification_min: "Min:",
        notification_shortage: "Shortage:",
        
        // View Stock Section
        current_stock: "📋 Current Stock",
        btn_refresh: "🔄 Refresh",
        btn_export: "📁 Export CSV",
        btn_print: "🖨️ Print",
        filters: "🔍 Filters",
        filter_search: "Search",
        filter_category: "Category",
        filter_supplier: "Supplier",
        filter_location: "Location",
        filter_unit: "Unit",
        filter_low_stock: "Low Stock ≤",
        all_suppliers: "All Suppliers",
        all_locations: "All Locations",
        all_units: "All Units",
        btn_apply: "Apply",
        btn_clear: "Clear",
        filter_local_only: "Local transactions only",
        keyword_and: "AND",
        keyword_or: "OR",
        
        all_categories: "All Categories",
        all_document_types: "All Document Types",
        all_payment_methods: "All Payment Methods",
        filter_document_type: "Document Type",
        filter_document_number: "Document Number",
        filter_account_number: "Account Number",
        filter_account_name: "Account Name",
        filter_payment_method: "Payment Method",
        filter_statement: "Statement",
        placeholder_search_doc_number: "Search by doc number...",
        placeholder_search_account: "Search by account #...",
        placeholder_search_name: "Search by name...",
        placeholder_search_statement: "Search statement...",
        
        // Stock Table Headers
        th_id: "ID",
        th_name: "Name",
        th_category: "Category",
        th_unit: "Unit",
        th_location: "Location",
        th_supplier: "Supplier",
        th_starting: "Starting",
        th_in: "In",
        th_out: "Out",
        th_net_stock: "Net Stock",
        th_price: "Unit Price",
        th_total_price: "Total Value",
        th_min_stock: "Min",
        th_last_updated: "Updated",
        th_actions: "Actions",
        th_document_type: "Document Type",
        th_document_number: "Doc #",
        no_items: "No items found. Add your first item!",
        showing_items: "Showing 0 items",
        
        // Export Modal
        export_options: "Export Options",
        select_columns: "Select columns to export:",
        select_all: "Select All",
        deselect_all: "Deselect All",
        btn_export_selected: "Export Selected",
        btn_cancel: "Cancel",
        
        // Transaction Log Section
        transaction_log: "📜 Transaction Log",
        filter_log_source: "Log Source",
        log_source_stock: "Stock Transactions",
        log_source_all_ledger: "All Ledger Transactions",
        filter_keyword: "Search Keywords",
        placeholder_keyword_search: "Type & press Enter...",
        filter_item_id: "Item ID",
        filter_type: "Type",
        filter_date_from: "Logged From",
        filter_date_to: "Logged To",
        filter_trans_date_from: "Transaction Date From",
        filter_trans_date_to: "Transaction Date To",
        all_types: "All Types",
        type_initial: "Initial",
        type_incoming_filter: "Incoming",
        type_outgoing_filter: "Outgoing",
        type_deleted: "Deleted",
        
        // Transaction Table Headers
        th_timestamp: "Timestamp",
        th_logged_at: "Logged At",
        th_trans_date: "Trans. Date",
        th_item_id: "Item ID",
        th_item_name: "Item Name",
        th_type: "Type",
        th_quantity: "Quantity",
        th_prev_stock: "Previous Stock",
        th_new_stock: "New Stock",
        th_notes: "Notes",
        no_transactions: "No transactions recorded yet.",
        showing_transactions: "Showing 0 transactions",
        
        // Placeholders
        placeholder_item_id: "e.g., ITEM-001",
        placeholder_item_name: "Enter item name",
        placeholder_location: "e.g., Aisle 5, Rack B",
        placeholder_supplier: "Enter supplier name",
        placeholder_starting_balance: "Enter initial stock quantity",
        placeholder_quantity: "Enter quantity",
        placeholder_incoming_supplier: "Enter supplier name for this incoming stock",
        placeholder_notes: "Add any notes about this transaction...",
        placeholder_search: "ID or name...",
        placeholder_threshold: "Threshold",
        placeholder_search_id: "Search by ID...",
        placeholder_price: "Enter unit price",
        placeholder_min_stock: "Alert when stock falls below",
        placeholder_shipment_price: "Enter unit price for this shipment",
        
        // Action Buttons
        btn_update: "Update",
        btn_delete: "Delete",
        btn_reverse: "Reverse",
        
        // Reverse Transaction
        confirm_reverse_title: "Confirm Reversal",
        confirm_reverse_message: "Are you sure you want to reverse this transaction?",
        confirm_reverse_warning: "This will create an opposite transaction to negate the original.",
        reverse_success: "Transaction reversed successfully",
        reverse_failed: "Failed to reverse transaction",
        already_reversed: "This transaction has already been reversed",
        
        // Messages
        msg_item_found: "found. You can update its stock below.",
        msg_new_item: "New item! Fill in the details below to add it.",
        msg_fill_all: "Please fill in all required fields",
        msg_negative_balance: "Starting balance cannot be negative",
        msg_select_transaction: "Please select a transaction type",
        msg_valid_quantity: "Please enter a valid quantity greater than 0",
        msg_enter_supplier: "Please enter the supplier name for incoming stock",
        msg_confirm_delete: "Are you sure you want to delete item",
        msg_cannot_undo: "This action cannot be undone.",
        msg_exported: "Exported",
        msg_items_to: "items to",
        msg_transactions_to: "transactions to",
        
        // Units
        unit_kgs: "kgs",
        unit_litres: "litres",
        unit_pieces: "pieces",
        unit_boxes: "boxes",
        unit_metres: "rolls",
        unit_units: "units",
        unit_pallets: "pallets",
        
        // New Tabs
        tab_customers: "Customers",
        tab_suppliers: "Suppliers",
        tab_treasury: "Treasury",
        tab_covenants: "Covenants",
        tab_advances: "Advances",
        
        // Customers Module
        customer_entry: "👥 Customer Entry",
        customer_id: "Customer ID",
        new_customer_details: "➕ New Customer Details",
        customer_name: "Customer Name *",
        customer_phone: "Phone Number",
        customer_email: "Email",
        customers_list: "📋 Customers List",
        btn_save_customer: "Save Customer",
        no_customers: "No customers found. Add your first customer!",
        showing_customers: "Showing 0 customers",
        placeholder_customer_id: "e.g., CUST-001",
        placeholder_customer_name: "Enter customer name",
        
        // Suppliers Module
        supplier_entry: "🏭 Supplier Entry",
        supplier_id: "Supplier ID",
        new_supplier_details: "➕ New Supplier Details",
        supplier_name: "Supplier Name *",
        supplier_phone: "Phone Number",
        supplier_email: "Email",
        suppliers_list: "📋 Suppliers List",
        btn_save_supplier: "Save Supplier",
        no_suppliers: "No suppliers found. Add your first supplier!",
        showing_suppliers: "Showing 0 suppliers",
        placeholder_supplier_id: "e.g., SUPP-001",
        placeholder_supplier_name: "Enter supplier name",
        
        // Balance Card Labels
        total_customers_balance: "Total Balance:",
        total_suppliers_balance: "Total Balance:",
        total_covenants_balance: "Total Balance:",
        total_advances_balance: "Total Balance:",
        total_opening_balance: "Total Opening Balance:",
        total_debit: "Total Debit:",
        total_credit: "Total Credit:",
        total_count: "Count:",
        
        // Treasury Module
        treasury_entry: "💰 Treasury Entry",
        total_treasury_balance: "Total Balance:",
        new_treasury_account: "➕ New Treasury Account",
        update_treasury_account: "✏️ Update Treasury Account",
        treasury_list: "📋 Treasury Accounts",
        btn_save_treasury: "Save Treasury Account",
        btn_check_account: "Check Account",
        current_treasury_balance: "Current Balance:",
        new_treasury_transaction: "➕ New Treasury Transaction",
        treasury_log: "📋 Treasury Log",
        btn_add_transaction: "Add Transaction",
        no_treasury: "No treasury accounts found.",
        showing_treasury: "Showing 0 accounts",
        account_number: "Account Number",
        th_account_number: "Account #",
        placeholder_account_number: "Enter account number...",
        enter_account_number: "Enter Account Number",
        account_name: "Account Name",
        th_account_name: "Account Name",
        placeholder_account_name: "Enter account name...",
        account_exists: "Account found - Update mode",
        account_new: "New account - Add mode",
        
        // Treasury Initialization
        treasury_not_initialized: "Treasury Not Initialized",
        treasury_init_description: "The treasury has not been initialized with a starting capital. Initialize the treasury to start tracking your cash flow properly.",
        btn_initialize_treasury: "Initialize Treasury",
        initialize_treasury_title: "🏦 Initialize Treasury",
        init_treasury_help: "Set the starting capital for your treasury. This represents the initial cash available and cannot be changed after initialization (adjustments can be made via transactions).",
        starting_capital: "Starting Capital *",
        placeholder_starting_capital: "Enter starting capital...",
        currency: "Currency",
        fiscal_year_start: "Fiscal Year Start",
        initialization_notes: "Notes",
        placeholder_init_notes: "Optional notes...",
        btn_confirm_initialize: "Confirm Initialization",
        treasury_initialized: "✅ Treasury Initialized",
        current_treasury_position: "Current Position",
        net_change: "Net Change",
        accounts_summary: "📊 Accounts Summary",
        
        // Covenants Module
        covenant_entry: "📝 Covenant Entry",
        covenant_id: "Covenant ID",
        new_covenant_details: "➕ New Covenant Details",
        employee_name: "Employee Name *",
        employee_phone: "Phone Number",
        covenants_list: "📋 Covenants List",
        btn_save_covenant: "Save Covenant",
        no_covenants: "No covenants found. Add your first covenant!",
        showing_covenants: "Showing 0 covenants",
        placeholder_covenant_id: "e.g., COV-001",
        placeholder_employee_name: "Enter employee name",
        
        // Advances Module
        advance_entry: "💵 Advance Entry",
        advance_id: "Advance ID",
        new_advance_details: "➕ New Advance Details",
        advances_list: "📋 Advances List",
        btn_save_advance: "Save Advance",
        no_advances: "No advances found. Add your first advance!",
        showing_advances: "Showing 0 advances",
        placeholder_advance_id: "e.g., ADV-001",
        
        // Common Ledger Fields
        registration_date: "Registration Date",
        document_number: "Document Number",
        opening_balance: "Opening Balance",
        debit: "Debit",
        credit: "Credit",
        balance: "Balance",
        payment_method: "Payment Method",
        statement: "Statement (Details)",
        select_payment_method: "Select payment method...",
        payment_cash: "Cash",
        payment_bank_transfer: "Bank Transfer",
        payment_digital_wallet: "Digital Wallet",
        payment_check: "Check",
        placeholder_phone: "Enter phone number",
        placeholder_email: "Enter email",
        placeholder_opening_balance: "Enter opening balance",
        placeholder_debit: "Enter debit amount",
        placeholder_credit: "Enter credit amount",
        placeholder_statement: "Enter statement details",
        
        // Table Headers for new modules
        th_phone: "Phone",
        th_email: "Email",
        th_reg_date: "Reg. Date",
        th_doc_number: "Doc #",
        th_opening_balance: "Opening",
        th_debit: "Debit",
        th_credit: "Credit",
        th_balance: "Balance",
        th_payment_method: "Payment",
        th_employee_name: "Employee Name",
        th_date: "Date",
        th_statement: "Statement",

        // Auto-Update
        update_badge: "🔔 Update Available",
        update_title: "🎉 New Update Available",
        update_new_version_available: "A new version of the app is available!",
        update_current_version: "Current version",
        update_new_version: "New version",
        update_download: "⬇️ Download Update",
        update_downloading: "⏳ Downloading...",
        update_later: "Later",
        update_open_location: "📂 Open Location",
        update_downloaded: "✅ Downloaded",
        update_download_failed: "❌ Download failed",
        update_retry: "🔄 Retry",
        update_downloading_update: "Downloading update...",
        update_downloaded_to_downloads: "✅ Update downloaded to Downloads folder",
        update_checking: "Checking for updates...",
        update_up_to_date: "✅ App is up to date"
    },
    ar: {
        // App Header
        app_title: "💼 EnterprisFlow",
        app_subtitle: "إدارة المخزون والحسابات والخزينة والعمليات",
        footer_contact: "هل تحتاج ميزات إضافية؟ تواصل معنا: 01157019062",
        
        // Cloud Sync & Auth
        btn_signin: "تسجيل الدخول",
        btn_signup: "إنشاء حساب",
        btn_signout: "تسجيل خروج",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        confirm_password: "تأكيد كلمة المرور",
        company_name: "اسم الشركة",
        forgot_password: "نسيت كلمة المرور؟",
        create_account: "إنشاء حساب",
        have_account: "لديك حساب بالفعل؟ تسجيل الدخول",
        reset_info: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.",
        btn_reset: "إرسال رابط إعادة التعيين",
        back_to_signin: "← العودة لتسجيل الدخول",
        sync_local: "☁️ محلي فقط",
        sync_synced: "☁️ متزامن",
        sync_syncing: "🔄 جاري المزامنة...",
        sync_offline: "📴 غير متصل",
        btn_pull: "📥 تحميل",
        btn_push: "📤 رفع",
        btn_force_pull: "⚠️ استبدال إجباري",
        title_pull: "تحميل من السحابة",
        title_push: "رفع إلى السحابة (يستبدل البيانات!)",
        title_force_pull: "حذف البيانات المحلية واستبدالها من السحابة (خطير!)",
        
        // Navigation Tabs
        tab_add_item: "إضافة/تحديث صنف",
        tab_view_stock: "عرض المخزون",
        tab_transactions: "سجل المعاملات",
        tab_customers: "العملاء",
        tab_suppliers: "الموردين",
        tab_treasury: "الخزينة",
        tab_covenants: "العهد",
        tab_advances: "السلف",
        
        // Add Item Section
        item_entry: "إدخال صنف",
        item_id: "رقم الصنف",
        btn_check_id: "تحقق من الرقم",
        btn_generate_id: "إنشاء رقم",
        hint_id_auto: "سيتم اقتراح الرقم تلقائياً. يمكنك تعديله.",
        
        // New Item Form
        new_item_details: "➕ تفاصيل صنف جديد",
        item_name: "اسم الصنف *",
        item_category: "التصنيف *",
        select_category: "اختر التصنيف...",
        item_unit: "الوحدة *",
        select_unit: "اختر الوحدة...",
        item_location: "موقع المستودع *",
        select_location: "اختر الموقع...",
        item_sub_location: "الموقع الفرعي *",
        select_sub_location: "اختر الموقع الفرعي...",
        item_supplier: "اسم المورد *",
        starting_balance: "الرصيد الافتتاحي *",
        unit_price: "سعر الوحدة *",
        min_stock: "الحد الأدنى للمخزون",
        hint_starting_balance: "لا يمكن تغيير هذه القيمة بعد إضافة الصنف.",
        btn_add_item: "إضافة صنف جديد",
        
        // Categories
        cat_raw_materials: "خامات",
        cat_finished_product: "منتج تام",
        cat_packaging: "تعبئة وتغليف",
        
        // Locations
        loc_bahbit: "بهبيت",
        loc_old_factory: "مصنع 1 - القديم",
        loc_station: "المحطة",
        loc_thaabaneya: "مصنع سناكس",
        
        // Factory Selector
        current_factory_label: "🏭 المصنع الحالي:",
        factory_context_info: "عرض مخزون هذا المصنع فقط",
        transfer_from_factory: "تحويل من",
        transfer_to_factory: "تحويل إلى",
        
        // Sub-Locations (Production Lines)
        subloc_production_line_1: "خط انتاج 1",
        subloc_production_line_2: "خط انتاج 2",
        subloc_production_line_3: "خط انتاج 3",
        subloc_production_line_4: "خط انتاج 4",
        
        // Internal Transfer
        internal_transfer_to: "تحويل داخلي إلى",
        select_no_transfer: "بدون تحويل داخلي",
        hint_internal_transfer: "⚠️ إذا تم اختيار تحويل داخلي، لا يمكن إدخال مورد والعكس صحيح.",
        
        // Starting Balance Date
        starting_balance_date: "تاريخ الرصيد (اختياري)",
        hint_balance_date: "اتركه فارغاً لتاريخ اليوم، أو أدخل تاريخاً سابقاً للاستيراد القديم.",
        
        // Outgoing Production Line
        outgoing_production_line: "التحويل إلى خط الإنتاج *",
        select_production_line: "اختر خط الإنتاج...",
        outgoing_internal_transfer: "تحويل داخلي إلى",
        hint_production_or_transfer: "⚠️ يجب اختيار خط الإنتاج أو تحويل داخلي (ليس كلاهما).",
        
        // Document Type and Number
        document_info: "بيانات المستند",
        select_document_type: "اختر نوع المستند...",
        doc_purchase_invoice: "فاتورة مشتريات",
        doc_sales_invoice: "فاتورة مبيعات",
        doc_raw_materials_order: "اذن صرف - خامات",
        doc_finished_product_receipt: "اذن استلام - منتج تام",
        doc_internal_transfer: "تحويل داخلي",
        placeholder_document_number: "رقم المستند...",
        
        // Update Stock Form
        update_stock: "📊 تحديث المخزون",
        info_name: "الاسم:",
        info_category: "التصنيف:",
        info_current_stock: "المخزون الحالي:",
        info_location: "الموقع:",
        info_supplier: "المورد:",
        info_price: "متوسط السعر:",
        info_min_stock: "الحد الأدنى:",
        transaction_type: "نوع المعاملة *",
        select_type: "اختر النوع...",
        type_incoming: "📥 وارد (إضافة مخزون)",
        type_outgoing: "📤 صادر (سحب مخزون)",
        type_transfer: "🔄 تحويل داخلي",
        transfer_locations: "مواقع التحويل *",
        transfer_from: "من موقع *",
        transfer_to: "إلى موقع *",
        quantity: "الكمية *",
        incoming_supplier: "مورد هذه الشحنة *",
        incoming_internal_transfer: "تحويل داخلي من",
        hint_supplier_or_transfer: "⚠️ يجب إدخال المورد أو اختيار تحويل داخلي (ليس كلاهما).",
        shipment_price: "سعر الوحدة لهذه الشحنة *",
        hint_price_average: "سيتم حساب متوسط السعر مع المخزون الحالي.",
        transaction_date: "تاريخ العملية",
        hint_transaction_date: "اترك فارغاً لتاريخ اليوم، أو حدد تاريخاً سابقاً للعمليات القديمة.",
        btn_update_stock: "تحديث المخزون",
        
        // Low Stock Notifications
        low_stock_alerts: "تنبيهات نقص المخزون",
        btn_dismiss: "إخفاء",
        notification_low_stock: "أقل من الحد الأدنى",
        notification_current: "الحالي:",
        notification_min: "الأدنى:",
        notification_shortage: "النقص:",
        
        // View Stock Section
        current_stock: "📋 المخزون الحالي",
        btn_refresh: "🔄 تحديث",
        btn_export: "📁 تصدير CSV",
        btn_print: "🖨️ طباعة",
        filters: "🔍 تصفية",
        filter_search: "بحث",
        filter_category: "التصنيف",
        filter_supplier: "المورد",
        filter_location: "الموقع",
        filter_unit: "الوحدة",
        filter_low_stock: "مخزون منخفض ≥",
        all_suppliers: "جميع الموردين",
        all_locations: "جميع المواقع",
        all_units: "جميع الوحدات",
        all_categories: "جميع التصنيفات",
        all_document_types: "جميع أنواع المستندات",
        all_payment_methods: "جميع طرق الدفع",
        filter_document_type: "نوع المستند",
        filter_document_number: "رقم المستند",
        filter_account_number: "رقم الحساب",
        filter_account_name: "اسم الحساب",
        filter_payment_method: "طريقة الدفع",
        filter_statement: "البيان",
        placeholder_search_account: "بحث برقم الحساب...",
        placeholder_search_name: "بحث بالاسم...",
        placeholder_search_statement: "بحث في البيان...",
        filter_local_only: "المعاملات المحلية فقط",
        keyword_and: "و",
        keyword_or: "أو",
        placeholder_search_doc_number: "بحث برقم المستند...",
        btn_apply: "تطبيق",
        btn_clear: "مسح",
        
        // Stock Table Headers
        th_id: "الرقم",
        th_name: "الاسم",
        th_category: "التصنيف",
        th_unit: "الوحدة",
        th_location: "الموقع",
        th_supplier: "المورد",
        th_starting: "الافتتاحي",
        th_in: "وارد",
        th_out: "صادر",
        th_net_stock: "صافي المخزون",
        th_price: "سعر الوحدة",
        th_total_price: "القيمة الإجمالية",
        th_min_stock: "الأدنى",
        th_last_updated: "آخر تحديث",
        th_actions: "إجراءات",
        th_document_type: "نوع المستند",
        th_document_number: "رقم المستند",
        no_items: "لا توجد أصناف. أضف أول صنف!",
        showing_items: "عرض 0 صنف",
        
        // Export Modal
        export_options: "خيارات التصدير",
        select_columns: "اختر الأعمدة للتصدير:",
        select_all: "تحديد الكل",
        deselect_all: "إلغاء تحديد الكل",
        btn_export_selected: "تصدير المحدد",
        btn_cancel: "إلغاء",
        
        // Transaction Log Section
        transaction_log: "📜 سجل المعاملات",
        filter_log_source: "مصدر السجل",
        log_source_stock: "معاملات المخزون",
        log_source_all_ledger: "جميع معاملات الدفاتر",
        filter_keyword: "بحث بالكلمات المفتاحية",
        placeholder_keyword_search: "اكتب واضغط Enter...",
        filter_item_id: "رقم الصنف",
        filter_type: "النوع",
        filter_date_from: "تاريخ التسجيل من",
        filter_date_to: "تاريخ التسجيل إلى",
        filter_trans_date_from: "تاريخ العملية من",
        filter_trans_date_to: "تاريخ العملية إلى",
        all_types: "جميع الأنواع",
        type_initial: "افتتاحي",
        type_incoming_filter: "وارد",
        type_outgoing_filter: "صادر",
        type_deleted: "محذوف",
        
        // Transaction Table Headers
        th_timestamp: "التاريخ والوقت",
        th_logged_at: "وقت التسجيل",
        th_trans_date: "تاريخ العملية",
        th_item_id: "رقم الصنف",
        th_item_name: "اسم الصنف",
        th_type: "النوع",
        th_quantity: "الكمية",
        th_prev_stock: "المخزون السابق",
        th_new_stock: "المخزون الجديد",
        th_notes: "ملاحظات",
        no_transactions: "لا توجد معاملات مسجلة بعد.",
        showing_transactions: "عرض 0 معاملة",
        
        // Placeholders
        placeholder_item_id: "مثال: ITEM-001",
        placeholder_item_name: "أدخل اسم الصنف",
        placeholder_location: "مثال: الممر 5، الرف ب",
        placeholder_supplier: "أدخل اسم المورد",
        placeholder_starting_balance: "أدخل كمية المخزون الأولية",
        placeholder_quantity: "أدخل الكمية",
        placeholder_incoming_supplier: "أدخل اسم مورد هذه الشحنة",
        placeholder_notes: "أضف أي ملاحظات عن هذه المعاملة...",
        placeholder_search: "الرقم أو الاسم...",
        placeholder_threshold: "الحد الأدنى",
        placeholder_search_id: "بحث بالرقم...",
        placeholder_price: "أدخل سعر الوحدة",
        placeholder_min_stock: "تنبيه عند انخفاض المخزون عن",
        placeholder_shipment_price: "أدخل سعر الوحدة لهذه الشحنة",
        
        // Action Buttons
        btn_update: "تحديث",
        btn_delete: "حذف",
        btn_reverse: "عكس",
        
        // Reverse Transaction
        confirm_reverse_title: "تأكيد العكس",
        confirm_reverse_message: "هل أنت متأكد من عكس هذه المعاملة؟",
        confirm_reverse_warning: "سيتم إنشاء معاملة معاكسة لإلغاء المعاملة الأصلية.",
        reverse_success: "تم عكس المعاملة بنجاح",
        reverse_failed: "فشل في عكس المعاملة",
        already_reversed: "تم عكس هذه المعاملة بالفعل",
        
        // Messages
        msg_item_found: "تم العثور عليه. يمكنك تحديث مخزونه أدناه.",
        msg_new_item: "صنف جديد! املأ التفاصيل أدناه لإضافته.",
        msg_fill_all: "يرجى ملء جميع الحقول المطلوبة",
        msg_negative_balance: "لا يمكن أن يكون الرصيد الافتتاحي سالباً",
        msg_select_transaction: "يرجى اختيار نوع المعاملة",
        msg_valid_quantity: "يرجى إدخال كمية صالحة أكبر من 0",
        msg_enter_supplier: "يرجى إدخال اسم المورد للمخزون الوارد",
        msg_confirm_delete: "هل أنت متأكد من حذف الصنف",
        msg_cannot_undo: "لا يمكن التراجع عن هذا الإجراء.",
        msg_exported: "تم تصدير",
        msg_items_to: "صنف إلى",
        msg_transactions_to: "معاملة إلى",
        
        // Units
        unit_kgs: "كجم",
        unit_litres: "لتر",
        unit_pieces: "علبة",
        unit_boxes: "كرتون",
        unit_metres: "رول",
        unit_units: "وحدة",
        unit_packs: "حزمة",
        
        // Customers Module
        customer_entry: "👥 إدخال عميل",
        customer_id: "رقم العميل",
        new_customer_details: "➕ بيانات عميل جديد",
        customer_name: "اسم العميل *",
        customer_phone: "رقم الهاتف",
        customer_email: "البريد الإلكتروني",
        customers_list: "📋 قائمة العملاء",
        btn_save_customer: "حفظ العميل",
        no_customers: "لا يوجد عملاء. أضف أول عميل!",
        showing_customers: "عرض 0 عميل",
        placeholder_customer_id: "مثال: CUST-001",
        placeholder_customer_name: "أدخل اسم العميل",
        
        // Suppliers Module
        supplier_entry: "🏭 إدخال مورد",
        supplier_id: "رقم المورد",
        new_supplier_details: "➕ بيانات مورد جديد",
        supplier_name: "اسم المورد *",
        supplier_phone: "رقم الهاتف",
        supplier_email: "البريد الإلكتروني",
        suppliers_list: "📋 قائمة الموردين",
        btn_save_supplier: "حفظ المورد",
        no_suppliers: "لا يوجد موردين. أضف أول مورد!",
        showing_suppliers: "عرض 0 مورد",
        placeholder_supplier_id: "مثال: SUPP-001",
        placeholder_supplier_name: "أدخل اسم المورد",
        
        // Balance Card Labels
        total_customers_balance: "إجمالي الرصيد:",
        total_suppliers_balance: "إجمالي الرصيد:",
        total_covenants_balance: "إجمالي الرصيد:",
        total_advances_balance: "إجمالي الرصيد:",
        total_opening_balance: "إجمالي الرصيد الافتتاحي:",
        total_debit: "إجمالي المدين:",
        total_credit: "إجمالي الدائن:",
        total_count: "العدد:",
        
        // Treasury Module
        treasury_entry: "💰 إدخال خزينة",
        total_treasury_balance: "إجمالي الرصيد:",
        new_treasury_account: "➕ حساب خزينة جديد",
        update_treasury_account: "✏️ تحديث حساب الخزينة",
        treasury_list: "📋 حسابات الخزينة",
        btn_save_treasury: "حفظ حساب الخزينة",
        btn_check_account: "فحص الحساب",
        current_treasury_balance: "الرصيد الحالي:",
        new_treasury_transaction: "➕ معاملة خزينة جديدة",
        treasury_log: "📋 سجل الخزينة",
        btn_add_transaction: "إضافة معاملة",
        no_treasury: "لا توجد حسابات خزينة.",
        showing_treasury: "عرض 0 حساب",
        account_number: "رقم الحساب",
        th_account_number: "رقم الحساب",
        placeholder_account_number: "أدخل رقم الحساب...",
        enter_account_number: "أدخل رقم الحساب",
        account_name: "اسم الحساب",
        th_account_name: "اسم الحساب",
        placeholder_account_name: "أدخل اسم الحساب...",
        account_exists: "الحساب موجود - وضع التحديث",
        account_new: "حساب جديد - وضع الإضافة",
        
        // Treasury Initialization
        treasury_not_initialized: "الخزينة غير مهيأة",
        treasury_init_description: "لم يتم تهيئة الخزينة برأس مال مبدئي. قم بتهيئة الخزينة لبدء تتبع التدفق النقدي بشكل صحيح.",
        btn_initialize_treasury: "تهيئة الخزينة",
        initialize_treasury_title: "🏦 تهيئة الخزينة",
        init_treasury_help: "حدد رأس المال المبدئي للخزينة. يمثل هذا النقد المتاح الأولي ولا يمكن تغييره بعد التهيئة (يمكن إجراء التعديلات عبر المعاملات).",
        starting_capital: "رأس المال المبدئي *",
        placeholder_starting_capital: "أدخل رأس المال المبدئي...",
        currency: "العملة",
        fiscal_year_start: "بداية السنة المالية",
        initialization_notes: "ملاحظات",
        placeholder_init_notes: "ملاحظات اختيارية...",
        btn_confirm_initialize: "تأكيد التهيئة",
        treasury_initialized: "✅ الخزينة مهيأة",
        current_treasury_position: "الوضع الحالي",
        net_change: "صافي التغيير",
        accounts_summary: "📊 ملخص الحسابات",
        
        // Covenants Module
        covenant_entry: "📝 إدخال عهدة",
        covenant_id: "رقم العهدة",
        new_covenant_details: "➕ بيانات عهدة جديدة",
        employee_name: "اسم الموظف *",
        employee_phone: "رقم الهاتف",
        covenants_list: "📋 قائمة العهد",
        btn_save_covenant: "حفظ العهدة",
        no_covenants: "لا توجد عهد. أضف أول عهدة!",
        showing_covenants: "عرض 0 عهدة",
        placeholder_covenant_id: "مثال: COV-001",
        placeholder_employee_name: "أدخل اسم الموظف",
        
        // Advances Module
        advance_entry: "💵 إدخال سلفة",
        advance_id: "رقم السلفة",
        new_advance_details: "➕ بيانات سلفة جديدة",
        advances_list: "📋 قائمة السلف",
        btn_save_advance: "حفظ السلفة",
        no_advances: "لا توجد سلف. أضف أول سلفة!",
        showing_advances: "عرض 0 سلفة",
        placeholder_advance_id: "مثال: ADV-001",
        
        // Common Ledger Fields
        registration_date: "تاريخ التسجيل",
        document_number: "رقم المستند",
        opening_balance: "الرصيد الافتتاحي",
        debit: "مدين",
        credit: "دائن",
        balance: "الرصيد",
        payment_method: "طريقة الدفع",
        statement: "البيان (التفاصيل)",
        select_payment_method: "اختر طريقة الدفع...",
        payment_cash: "نقدي",
        payment_bank_transfer: "تحويل بنكي",
        payment_digital_wallet: "محفظة إلكترونية",
        payment_check: "شيك",
        placeholder_phone: "أدخل رقم الهاتف",
        placeholder_email: "أدخل البريد الإلكتروني",
        placeholder_opening_balance: "أدخل الرصيد الافتتاحي",
        placeholder_debit: "أدخل المبلغ المدين",
        placeholder_credit: "أدخل المبلغ الدائن",
        placeholder_statement: "أدخل تفاصيل البيان",
        
        // Table Headers for new modules
        th_phone: "الهاتف",
        th_email: "البريد",
        th_reg_date: "تاريخ التسجيل",
        th_doc_number: "رقم المستند",
        th_opening_balance: "الافتتاحي",
        th_debit: "مدين",
        th_credit: "دائن",
        th_balance: "الرصيد",
        th_payment_method: "الدفع",
        th_employee_name: "اسم الموظف",
        th_date: "التاريخ",
        th_statement: "البيان",

        // Auto-Update
        update_badge: "🔔 تحديث متاح",
        update_title: "🎉 تحديث جديد متاح",
        update_new_version_available: "يتوفر إصدار جديد من التطبيق!",
        update_current_version: "الإصدار الحالي",
        update_new_version: "الإصدار الجديد",
        update_download: "⬇️ تحميل التحديث",
        update_downloading: "⏳ جاري التحميل...",
        update_later: "لاحقاً",
        update_open_location: "📂 فتح الموقع",
        update_downloaded: "✅ تم التحميل",
        update_download_failed: "❌ فشل التحميل",
        update_retry: "🔄 إعادة المحاولة",
        update_downloading_update: "جاري تحميل التحديث...",
        update_downloaded_to_downloads: "✅ تم تحميل التحديث إلى مجلد التنزيلات",
        update_checking: "جاري البحث عن تحديثات...",
        update_up_to_date: "✅ التطبيق محدّث"
    }
};

// Current language (default to Arabic)
let currentLang = localStorage.getItem('warehouseLang') || 'ar';

/**
 * Get translation for a key
 */
function t(key) {
    return translations[currentLang][key] || translations['en'][key] || key;
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.placeholder = translations[currentLang][key];
        }
    });
    
    // Translate title attributes (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[currentLang][key]) {
            el.title = translations[currentLang][key];
        }
    });
    
    // Update document direction
    const html = document.documentElement;
    if (currentLang === 'ar') {
        html.setAttribute('dir', 'rtl');
        html.setAttribute('lang', 'ar');
    } else {
        html.setAttribute('dir', 'ltr');
        html.setAttribute('lang', 'en');
    }
    
    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`lang-${currentLang}`)?.classList.add('active');
}

/**
 * Switch language
 */
function switchLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('warehouseLang', lang);
    applyTranslations();
    
    // Refresh dynamic content
    if (typeof loadStockData === 'function') {
        loadStockData();
    }
    if (typeof loadTransactionData === 'function') {
        loadTransactionData();
    }
}

/**
 * Get unit translation
 */
function getUnitTranslation(unit) {
    const unitKey = `unit_${unit}`;
    return translations[currentLang][unitKey] || unit;
}

/**
 * Get category translation
 */
function getCategoryTranslation(category) {
    const catKey = `cat_${category}`;
    return translations[currentLang][catKey] || category;
}

/**
 * Get location translation
 */
function getLocationTranslation(location) {
    const locKey = `loc_${location}`;
    return translations[currentLang][locKey] || location;
}

/**
 * Get sub-location translation
 */
function getSubLocationTranslation(subLocation) {
    const subLocKey = `subloc_${subLocation}`;
    return translations[currentLang][subLocKey] || subLocation;
}

/**
 * Initialize language on page load
 */
function initializeLanguage() {
    // Set up language toggle buttons
    document.getElementById('lang-en')?.addEventListener('click', () => switchLanguage('en'));
    document.getElementById('lang-ar')?.addEventListener('click', () => switchLanguage('ar'));
    
    // Apply saved language
    applyTranslations();
}

// Export for use in other scripts
window.i18n = {
    t,
    currentLang: () => currentLang,
    switchLanguage,
    applyTranslations,
    getUnitTranslation,
    getCategoryTranslation,
    getLocationTranslation,
    getSubLocationTranslation,
    initializeLanguage
};
