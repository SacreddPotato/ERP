/**
 * Warehouse Stock Logging - Frontend JavaScript
 * Handles UI interactions and Eel backend communication
 */

// ============================================
// Global State
// ============================================
let currentItem = null;
let stockFilters = {};
let transactionFilters = {};
let treasuryKeywords = [];
let currentFactory = localStorage.getItem('currentFactory') || 'bahbit'; // Default factory context

// Delete password (must match backend)
const DELETE_PASSWORD = '2048';

// ============================================
// Number Formatting Utilities
// ============================================
/**
 * Format a number with thousand's separators and decimal places
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
function formatNumber(value, decimals = 2) {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Format a number with thousand's separators, adding + or - prefix
 * @param {number|string} value - The number to format
 * @param {boolean} showSign - Whether to show + for positive numbers
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string with sign
 */
function formatNumberWithSign(value, showSign = true, decimals = 2) {
    const num = parseFloat(value) || 0;
    const formatted = Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
    
    // Always put sign on the left since numbers are read LTR even in Arabic
    if (num > 0 && showSign) return '+' + formatted;
    if (num < 0) return '-' + formatted;
    return formatted;
}

/**
 * Format a number with + or - for display in tables
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number with sign always on the left
 */
function formatSignedNumber(value, decimals = 2) {
    const num = parseFloat(value) || 0;
    const formatted = formatNumber(Math.abs(num), decimals);
    
    // Always put sign on the left since numbers are read LTR even in Arabic
    if (num >= 0) {
        return '+' + formatted;
    } else {
        return '-' + formatted;
    }
}

// ============================================
// Factory Context Management
// ============================================
function initializeFactorySelector() {
    const selector = document.getElementById('current-factory');
    if (selector) {
        // Set initial value from localStorage
        selector.value = currentFactory;
        
        // Listen for changes
        selector.addEventListener('change', handleFactoryChange);
    }
}

function handleFactoryChange() {
    const selector = document.getElementById('current-factory');
    currentFactory = selector.value;
    localStorage.setItem('currentFactory', currentFactory);
    
    // Refresh data with new factory context
    loadStockData();
    loadTransactionData();
    loadNotifications();
    
    // If currently editing an item, reset the form
    hideAllForms();
    hideIdStatus();
    document.getElementById('item-id').value = '';
    
    // Repopulate transfer dropdowns to exclude new current factory
    populateInternalTransferDropdown();
    populateIncomingTransferDropdown();
    populateOutgoingTransferDropdown();
    
    showToast(window.i18n?.currentLang() === 'ar' 
        ? `تم التحويل إلى ${getFactoryDisplayName(currentFactory)}`
        : `Switched to ${getFactoryDisplayName(currentFactory)}`, 'success');
}

function getFactoryDisplayName(factoryKey) {
    const translations = {
        'bahbit': window.i18n?.currentLang() === 'ar' ? 'بهبيت' : 'Bahbit',
        'old_factory': window.i18n?.currentLang() === 'ar' ? 'مصنع 1 - القديم' : 'Old Factory',
        'station': window.i18n?.currentLang() === 'ar' ? 'المحطة' : 'Station',
        'thaabaneya': window.i18n?.currentLang() === 'ar' ? 'مصنع سناكس' : 'Thaabaneya'
    };
    return translations[factoryKey] || factoryKey;
}

function getCurrentFactory() {
    return currentFactory;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Debounce function - delays function execution until after wait milliseconds
 * have elapsed since the last time it was invoked
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        // Initialize language support
        if (window.i18n) {
            window.i18n.initializeLanguage();
        }
        
        // Initialize Firebase sync (if configured)
        if (window.initFirebaseSync) {
            window.initFirebaseSync();
        }
        
        // Initialize auto-update checker
        if (window.initAutoUpdate) {
            window.initAutoUpdate();
        }
        
        // Initialize factory selector
        initializeFactorySelector();
        
        // Load units for dropdown
        await populateUnits();
        
        // Load categories for dropdown
        await populateCategories();
        
        // Load locations for dropdown
        await populateLocations();
        
        // Generate initial ID suggestion
        await generateNewId();
        
        // Load filter dropdowns
        await loadFilterOptions();
        
        // Load initial data for tables
        await loadStockData();
        await loadTransactionData();
        
        // Load low stock notifications
        await loadNotifications();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to initialize app', 'error');
    }
}

// ============================================
// Event Listeners Setup
// ============================================
function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ID Input & Buttons
    document.getElementById('item-id').addEventListener('blur', handleIdBlur);
    document.getElementById('check-id-btn').addEventListener('click', checkItemId);
    document.getElementById('generate-id-btn').addEventListener('click', generateNewId);

    // Form Submissions
    document.getElementById('add-item-btn').addEventListener('click', addNewItem);
    document.getElementById('update-stock-btn').addEventListener('click', updateStock);

    // Transaction Type Change - Show/hide supplier field
    document.getElementById('transaction-type').addEventListener('change', handleTransactionTypeChange);
    
    // Category Change - Show/hide fields based on category
    document.getElementById('item-category').addEventListener('change', handleCategoryChange);
    
    // Internal Transfer Change - Disable supplier if selected
    document.getElementById('item-internal-transfer').addEventListener('change', handleInternalTransferChange);
    
    // Supplier Change - Disable internal transfer if entered
    document.getElementById('item-supplier').addEventListener('input', handleSupplierInput);
    
    // Incoming Internal Transfer Change - Disable supplier if selected
    document.getElementById('incoming-internal-transfer').addEventListener('change', handleIncomingTransferChange);
    
    // Incoming Supplier Change - Disable internal transfer if entered
    document.getElementById('incoming-supplier').addEventListener('input', handleIncomingSupplierInput);
    
    // Outgoing Internal Transfer Change - Disable production line if selected
    document.getElementById('outgoing-internal-transfer').addEventListener('change', handleOutgoingTransferChange);
    
    // Outgoing Production Line Change - Disable internal transfer if selected
    document.getElementById('outgoing-production-line').addEventListener('change', handleOutgoingProductionLineChange);

    // Stock Tab Actions
    document.getElementById('refresh-stock-btn').addEventListener('click', loadStockData);
    document.getElementById('export-stock-btn').addEventListener('click', exportStock);
    document.getElementById('print-stock-btn').addEventListener('click', () => printTable('view-stock'));
    document.getElementById('apply-filters-btn').addEventListener('click', applyStockFilters);
    document.getElementById('clear-filters-btn').addEventListener('click', clearStockFilters);

    // Transaction Tab Actions
    document.getElementById('refresh-trans-btn').addEventListener('click', loadTransactionData);
    document.getElementById('export-trans-btn').addEventListener('click', exportTransactions);
    document.getElementById('print-trans-btn').addEventListener('click', () => printTable('transactions'));
    document.getElementById('apply-trans-filters-btn').addEventListener('click', applyTransactionFilters);
    document.getElementById('clear-trans-filters-btn').addEventListener('click', clearTransactionFilters);
    document.getElementById('trans-filter-source').addEventListener('change', handleLogSourceChange);
    document.getElementById('trans-filter-local-only').addEventListener('change', loadTransactionData);
    document.getElementById('keyword-logic').addEventListener('change', loadTransactionData);
    
    // Keyword tag-based search
    initKeywordTagSearch();

    // Customers Tab Actions
    document.getElementById('check-customer-id-btn').addEventListener('click', checkCustomerId);
    document.getElementById('generate-customer-id-btn').addEventListener('click', generateCustomerId);
    document.getElementById('save-customer-btn').addEventListener('click', saveCustomer);
    document.getElementById('refresh-customers-btn').addEventListener('click', loadCustomersData);
    document.getElementById('export-customers-btn').addEventListener('click', exportCustomers);
    document.getElementById('print-customers-btn').addEventListener('click', () => printTable('customers'));
    document.getElementById('customers-search').addEventListener('input', debounce(loadCustomersData, 300));

    // Suppliers Tab Actions
    document.getElementById('check-supplier-id-btn').addEventListener('click', checkSupplierId);
    document.getElementById('generate-supplier-id-btn').addEventListener('click', generateSupplierId);
    document.getElementById('save-supplier-btn').addEventListener('click', saveSupplier);
    document.getElementById('refresh-suppliers-btn').addEventListener('click', loadSuppliersData);
    document.getElementById('export-suppliers-btn').addEventListener('click', exportSuppliers);
    document.getElementById('print-suppliers-btn').addEventListener('click', () => printTable('suppliers-ledger'));
    document.getElementById('suppliers-search').addEventListener('input', debounce(loadSuppliersData, 300));

    // Treasury Tab Actions
    document.getElementById('check-treasury-account-btn').addEventListener('click', checkTreasuryAccount);
    document.getElementById('save-treasury-btn').addEventListener('click', saveTreasury);
    document.getElementById('refresh-treasury-btn').addEventListener('click', loadTreasuryData);
    document.getElementById('export-treasury-btn').addEventListener('click', exportTreasury);
    document.getElementById('print-treasury-btn').addEventListener('click', () => printTable('treasury'));
    
    // Treasury Initialization Actions
    document.getElementById('show-init-form-btn').addEventListener('click', showTreasuryInitForm);
    document.getElementById('confirm-init-treasury-btn').addEventListener('click', initializeTreasury);
    document.getElementById('cancel-init-treasury-btn').addEventListener('click', hideTreasuryInitForm);
    
    // Treasury Filter Actions
    document.getElementById('apply-treasury-filters-btn').addEventListener('click', loadTreasuryData);
    document.getElementById('clear-treasury-filters-btn').addEventListener('click', clearTreasuryFilters);
    document.getElementById('treasury-filter-keyword').addEventListener('keydown', handleTreasuryKeywordInput);
    document.getElementById('treasury-keyword-logic').addEventListener('change', loadTreasuryData);

    // Covenants Tab Actions
    document.getElementById('check-covenant-id-btn').addEventListener('click', checkCovenantId);
    document.getElementById('generate-covenant-id-btn').addEventListener('click', generateCovenantId);
    document.getElementById('save-covenant-btn').addEventListener('click', saveCovenant);
    document.getElementById('refresh-covenants-btn').addEventListener('click', loadCovenantsData);
    document.getElementById('export-covenants-btn').addEventListener('click', exportCovenants);
    document.getElementById('print-covenants-btn').addEventListener('click', () => printTable('covenants'));
    document.getElementById('covenants-search').addEventListener('input', debounce(loadCovenantsData, 300));

    // Advances Tab Actions
    document.getElementById('check-advance-id-btn').addEventListener('click', checkAdvanceId);
    document.getElementById('generate-advance-id-btn').addEventListener('click', generateAdvanceId);
    document.getElementById('save-advance-btn').addEventListener('click', saveAdvance);
    document.getElementById('refresh-advances-btn').addEventListener('click', loadAdvancesData);
    document.getElementById('export-advances-btn').addEventListener('click', exportAdvances);
    document.getElementById('print-advances-btn').addEventListener('click', () => printTable('advances'));
    document.getElementById('advances-search').addEventListener('input', debounce(loadAdvancesData, 300));

    // Notifications
    document.getElementById('bell-trigger').addEventListener('click', toggleNotificationsDropdown);
    document.getElementById('dismiss-notifications').addEventListener('click', dismissNotifications);
    
    // Export modal buttons
    document.getElementById('close-export-modal').addEventListener('click', hideExportModal);
    document.getElementById('cancel-export-btn').addEventListener('click', hideExportModal);
    document.getElementById('confirm-export-btn').addEventListener('click', performExport);
    document.getElementById('select-all-cols').addEventListener('click', selectAllColumns);
    document.getElementById('deselect-all-cols').addEventListener('click', deselectAllColumns);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const bell = document.getElementById('notification-bell');
        if (bell && !bell.contains(e.target)) {
            closeNotificationsDropdown();
        }
    });
}

// ============================================
// Tab Navigation
// ============================================
function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === tabId);
    });

    // Refresh data when switching tabs
    if (tabId === 'view-stock') {
        loadStockData();
        loadFilterOptions();
    } else if (tabId === 'transactions') {
        loadTransactionData();
    } else if (tabId === 'customers') {
        loadCustomersData();
    } else if (tabId === 'suppliers-ledger') {
        loadSuppliersData();
    } else if (tabId === 'treasury') {
        loadTreasurySummary();
        loadTreasuryData();
        loadTreasuryBalance();
    } else if (tabId === 'covenants') {
        loadCovenantsData();
    } else if (tabId === 'advances') {
        loadAdvancesData();
    }
}

// ============================================
// ID Management
// ============================================
async function generateNewId() {
    try {
        const newId = await eel.generate_next_id(currentFactory)();
        document.getElementById('item-id').value = newId;
        hideIdStatus();
        hideAllForms();
    } catch (error) {
        console.error('Error generating ID:', error);
    }
}

async function handleIdBlur() {
    const itemId = document.getElementById('item-id').value.trim();
    if (itemId) {
        await checkItemId();
    }
}

async function checkItemId() {
    const itemId = document.getElementById('item-id').value.trim();
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!itemId) {
        const msg = lang === 'ar' ? 'يرجى إدخال رقم الصنف' : 'Please enter an Item ID';
        showIdStatus(msg, 'warning');
        hideAllForms();
        return;
    }

    try {
        // Check if item exists in the current factory only
        const result = await eel.check_item_exists(itemId, currentFactory)();
        
        if (result.exists) {
            currentItem = result.item;
            const msg = lang === 'ar' 
                ? `الصنف "${result.item.name}" موجود. يمكنك تحديث مخزونه أدناه.`
                : `Item "${result.item.name}" found. You can update its stock below.`;
            showIdStatus(msg, 'info');
            showUpdateStockForm(result.item);
        } else {
            // Item doesn't exist locally - check if it exists in any other factory for potential transfer
            let foundInOtherFactory = null;
            const locations = await eel.get_locations()();
            for (const loc of locations) {
                if (loc !== currentFactory) {
                    const otherResult = await eel.check_item_exists(itemId, loc)();
                    if (otherResult.exists) {
                        foundInOtherFactory = { factory: loc, item: otherResult.item };
                        break;
                    }
                }
            }
            
            if (foundInOtherFactory) {
                // Item exists in another factory - allow incoming transfer
                currentItem = foundInOtherFactory.item;
                currentItem._sourceFactory = foundInOtherFactory.factory; // Mark source factory
                const factoryName = getFactoryDisplayName(foundInOtherFactory.factory);
                const msg = lang === 'ar' 
                    ? `الصنف "${foundInOtherFactory.item.name}" موجود في ${factoryName}. يمكنك استقباله عبر تحويل داخلي.`
                    : `Item "${foundInOtherFactory.item.name}" found in ${factoryName}. You can receive it via internal transfer.`;
                showIdStatus(msg, 'info');
                showUpdateStockForm(foundInOtherFactory.item, true); // true = incoming transfer mode
            } else {
                currentItem = null;
                const msg = lang === 'ar' ? 'صنف جديد! املأ التفاصيل أدناه لإضافته.' : 'New item! Fill in the details below to add it.';
                showIdStatus(msg, 'success');
                showNewItemForm();
            }
        }
    } catch (error) {
        console.error('Error checking ID:', error);
        const msg = lang === 'ar' ? 'خطأ في التحقق من رقم الصنف' : 'Error checking item ID';
        showIdStatus(msg, 'error');
    }
}

// ============================================
// Form Display Management
// ============================================
function hideAllForms() {
    document.getElementById('new-item-form').classList.add('hidden');
    document.getElementById('update-stock-form').classList.add('hidden');
}

function showNewItemForm() {
    hideAllForms();
    document.getElementById('new-item-form').classList.remove('hidden');
    // Clear form fields
    document.getElementById('item-name').value = '';
    document.getElementById('item-category').selectedIndex = 0;
    document.getElementById('item-unit').selectedIndex = 0;
    
    // Set location to current factory context and disable it (items belong to current factory)
    const locationSelect = document.getElementById('item-location');
    locationSelect.value = currentFactory;
    // Don't disable - user might want to see/confirm the location
    
    document.getElementById('item-supplier').value = '';
    document.getElementById('item-supplier').disabled = false;
    document.getElementById('starting-balance').value = '';
    document.getElementById('starting-balance-date').value = '';
    document.getElementById('item-price').value = '';
    document.getElementById('item-min-stock').value = '';
    document.getElementById('item-internal-transfer').selectedIndex = 0;
    document.getElementById('item-internal-transfer').disabled = false;
    
    // Hide category-dependent sections initially
    document.getElementById('supplier-group').classList.add('hidden');
    document.getElementById('internal-transfer-group').classList.add('hidden');
    document.getElementById('price-minstock-group').classList.add('hidden');
}

function showUpdateStockForm(item, incomingTransferMode = false) {
    hideAllForms();
    document.getElementById('update-stock-form').classList.remove('hidden');
    
    // Store current item category for transaction handling
    currentItem = item;
    
    // Populate item info
    const unitDisplay = window.i18n ? window.i18n.getUnitTranslation(item.unit) : item.unit;
    const categoryDisplay = window.i18n ? window.i18n.getCategoryTranslation(item.category) : item.category;
    
    // Parse location (format: "location|internalTransfer" or just "location")
    const locationParts = (item.location || '').split('|');
    const locationDisplay = locationParts[0] ? (window.i18n ? window.i18n.getLocationTranslation(locationParts[0]) : locationParts[0]) : '';
    const internalTransferDisplay = locationParts[1] ? (window.i18n ? window.i18n.getLocationTranslation(locationParts[1]) : locationParts[1]) : '';
    const fullLocationDisplay = internalTransferDisplay ? `${locationDisplay} → ${internalTransferDisplay}` : locationDisplay;
    
    document.getElementById('info-name').textContent = item.name;
    document.getElementById('info-category').textContent = categoryDisplay;
    
    // If incoming transfer mode, show stock as "N/A" since it doesn't exist locally yet
    if (incomingTransferMode) {
        const lang = window.i18n?.currentLang() || 'en';
        const naText = lang === 'ar' ? 'غير موجود محلياً' : 'Not in local stock';
        document.getElementById('info-stock').textContent = naText;
    } else {
        document.getElementById('info-stock').textContent = `${formatNumber(item.net_stock)} ${unitDisplay}`;
    }
    document.getElementById('info-location').textContent = fullLocationDisplay;
    document.getElementById('info-supplier').textContent = item.supplier || '-';
    document.getElementById('info-price').textContent = formatNumber(item.unit_price || 0);
    document.getElementById('info-min-stock').textContent = `${formatNumber(item.min_stock || 0)} ${unitDisplay}`;
    
    // Clear transaction fields
    document.getElementById('transaction-type').selectedIndex = 0;
    document.getElementById('quantity').value = '';
    document.getElementById('incoming-supplier').value = '';
    document.getElementById('incoming-supplier').disabled = false;
    document.getElementById('incoming-internal-transfer').selectedIndex = 0;
    document.getElementById('incoming-internal-transfer').disabled = false;
    document.getElementById('incoming-price').value = '';
    document.getElementById('document-type').selectedIndex = 0;
    document.getElementById('document-number').value = '';
    document.getElementById('outgoing-production-line').selectedIndex = 0;
    document.getElementById('outgoing-production-line').disabled = false;
    document.getElementById('outgoing-internal-transfer').selectedIndex = 0;
    document.getElementById('outgoing-internal-transfer').disabled = false;
    document.getElementById('transaction-date').value = '';
    
    // Hide all transaction-dependent fields initially
    document.getElementById('incoming-supplier-group').classList.add('hidden');
    document.getElementById('incoming-transfer-group').classList.add('hidden');
    document.getElementById('incoming-price-group').classList.add('hidden');
    document.getElementById('outgoing-production-line-group').classList.add('hidden');
    document.getElementById('outgoing-transfer-group').classList.add('hidden');
    document.getElementById('transaction-date-group').classList.add('hidden');
    
    // If incoming transfer mode, pre-select incoming and the source factory
    if (incomingTransferMode && item._sourceFactory) {
        // Set transaction type to incoming
        document.getElementById('transaction-type').value = 'incoming';
        
        // Trigger the transaction type change to show the right fields
        handleTransactionTypeChange();
        
        // After fields are shown, populate and pre-select the source factory
        setTimeout(async () => {
            await populateIncomingTransferDropdown();
            document.getElementById('incoming-internal-transfer').value = item._sourceFactory;
            // Disable supplier since we're doing internal transfer
            document.getElementById('incoming-supplier').disabled = true;
            const lang = window.i18n?.currentLang() || 'en';
            document.getElementById('incoming-supplier').placeholder = lang === 'ar' ? 'غير متاح - تحويل داخلي' : 'N/A - Internal transfer';
        }, 100);
    }
}

// ============================================
// Transaction Type Handler
// ============================================
function handleTransactionTypeChange() {
    const transactionType = document.getElementById('transaction-type').value;
    const supplierGroup = document.getElementById('incoming-supplier-group');
    const incomingTransferGroup = document.getElementById('incoming-transfer-group');
    const priceGroup = document.getElementById('incoming-price-group');
    const productionLineGroup = document.getElementById('outgoing-production-line-group');
    const outgoingTransferGroup = document.getElementById('outgoing-transfer-group');
    const transferLocationsGroup = document.getElementById('transfer-locations-group');
    const dateGroup = document.getElementById('transaction-date-group');
    
    // Hide all first
    supplierGroup.classList.add('hidden');
    incomingTransferGroup.classList.add('hidden');
    priceGroup.classList.add('hidden');
    productionLineGroup.classList.add('hidden');
    outgoingTransferGroup.classList.add('hidden');
    transferLocationsGroup.classList.add('hidden');
    dateGroup.classList.add('hidden');
    
    // Reset incoming fields
    document.getElementById('incoming-supplier').value = '';
    document.getElementById('incoming-supplier').disabled = false;
    document.getElementById('incoming-internal-transfer').selectedIndex = 0;
    document.getElementById('incoming-internal-transfer').disabled = false;
    
    // Reset outgoing fields
    document.getElementById('outgoing-production-line').selectedIndex = 0;
    document.getElementById('outgoing-production-line').disabled = false;
    document.getElementById('outgoing-internal-transfer').selectedIndex = 0;
    document.getElementById('outgoing-internal-transfer').disabled = false;
    
    // Reset transfer fields
    document.getElementById('transfer-from').selectedIndex = 0;
    document.getElementById('transfer-to').selectedIndex = 0;
    
    document.getElementById('transaction-date').value = '';
    
    if (transactionType === 'incoming') {
        // Show different fields based on category
        if (currentItem && currentItem.category === 'finished_product') {
            // Finished product comes from production lines
            productionLineGroup.classList.remove('hidden');
        } else {
            // Other categories come from suppliers or internal transfer
            supplierGroup.classList.remove('hidden');
            incomingTransferGroup.classList.remove('hidden');
            populateIncomingTransferDropdown();
        }
        priceGroup.classList.remove('hidden');
        dateGroup.classList.remove('hidden');
    } else if (transactionType === 'outgoing') {
        // Show production line and internal transfer for outgoing
        productionLineGroup.classList.remove('hidden');
        outgoingTransferGroup.classList.remove('hidden');
        populateOutgoingTransferDropdown();
        dateGroup.classList.remove('hidden');
        document.getElementById('incoming-supplier').value = '';
        document.getElementById('incoming-price').value = '';
    } else if (transactionType === 'transfer') {
        // Show transfer from/to locations
        transferLocationsGroup.classList.remove('hidden');
        populateTransferDropdowns();
        dateGroup.classList.remove('hidden');
    } else {
        document.getElementById('incoming-supplier').value = '';
        document.getElementById('incoming-price').value = '';
    }
}

// ============================================
// Category Change Handler
// ============================================
function handleCategoryChange() {
    const category = document.getElementById('item-category').value;
    const supplierGroup = document.getElementById('supplier-group');
    const internalTransferGroup = document.getElementById('internal-transfer-group');
    const priceMinStockGroup = document.getElementById('price-minstock-group');
    
    // Reset fields
    document.getElementById('item-supplier').value = '';
    document.getElementById('item-supplier').disabled = false;
    document.getElementById('item-internal-transfer').selectedIndex = 0;
    document.getElementById('item-internal-transfer').disabled = false;
    
    if (!category) {
        // No category selected - hide all
        supplierGroup.classList.add('hidden');
        internalTransferGroup.classList.add('hidden');
        priceMinStockGroup.classList.add('hidden');
        return;
    }
    
    // Show price and min stock for all categories
    priceMinStockGroup.classList.remove('hidden');
    
    if (category === 'finished_product') {
        // Finished product: No supplier, no internal transfer
        supplierGroup.classList.add('hidden');
        internalTransferGroup.classList.add('hidden');
    } else {
        // Raw materials or Packaging: Show supplier and internal transfer
        supplierGroup.classList.remove('hidden');
        internalTransferGroup.classList.remove('hidden');
        
        // Populate internal transfer dropdown with locations
        populateInternalTransferDropdown();
    }
}

// ============================================
// Internal Transfer Dropdown Population
// ============================================
async function populateInternalTransferDropdown() {
    try {
        const locations = await eel.get_locations()();
        const select = document.getElementById('item-internal-transfer');
        const lang = window.i18n?.currentLang() || 'en';
        
        // Reset with default option
        const noTransferText = lang === 'ar' ? 'بدون تحويل داخلي' : 'No internal transfer';
        select.innerHTML = `<option value="">${noTransferText}</option>`;
        
        // Filter out current factory - can't transfer to self
        locations.filter(loc => loc !== currentFactory).forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading internal transfer locations:', error);
    }
}

// ============================================
// Internal Transfer Change Handler
// ============================================
function handleInternalTransferChange() {
    const internalTransfer = document.getElementById('item-internal-transfer').value;
    const supplierInput = document.getElementById('item-supplier');
    const lang = window.i18n?.currentLang() || 'en';
    
    if (internalTransfer) {
        // Internal transfer selected - disable and clear supplier
        supplierInput.value = '';
        supplierInput.disabled = true;
        supplierInput.placeholder = lang === 'ar' ? 'غير متاح - تم اختيار تحويل داخلي' : 'N/A - Internal transfer selected';
    } else {
        // No internal transfer - enable supplier
        supplierInput.disabled = false;
        supplierInput.placeholder = lang === 'ar' ? 'أدخل اسم المورد' : 'Enter supplier name';
    }
}

// ============================================
// Supplier Input Handler
// ============================================
function handleSupplierInput() {
    const supplier = document.getElementById('item-supplier').value.trim();
    const internalTransferSelect = document.getElementById('item-internal-transfer');
    const lang = window.i18n?.currentLang() || 'en';
    
    if (supplier) {
        // Supplier entered - disable internal transfer
        internalTransferSelect.value = '';
        internalTransferSelect.disabled = true;
    } else {
        // No supplier - enable internal transfer
        internalTransferSelect.disabled = false;
    }
}

// ============================================
// Incoming Internal Transfer Dropdown Population
// ============================================
async function populateIncomingTransferDropdown() {
    try {
        const locations = await eel.get_locations()();
        const select = document.getElementById('incoming-internal-transfer');
        const lang = window.i18n?.currentLang() || 'en';
        
        // Reset with default option
        const noTransferText = lang === 'ar' ? 'بدون تحويل داخلي' : 'No internal transfer';
        select.innerHTML = `<option value="">${noTransferText}</option>`;
        
        // Filter out current factory - can't transfer from self
        locations.filter(loc => loc !== currentFactory).forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading incoming transfer locations:', error);
    }
}

// ============================================
// Incoming Internal Transfer Change Handler
// ============================================
function handleIncomingTransferChange() {
    const internalTransfer = document.getElementById('incoming-internal-transfer').value;
    const supplierInput = document.getElementById('incoming-supplier');
    const lang = window.i18n?.currentLang() || 'en';
    
    if (internalTransfer) {
        // Internal transfer selected - disable and clear supplier
        supplierInput.value = '';
        supplierInput.disabled = true;
        supplierInput.placeholder = lang === 'ar' ? 'غير متاح - تم اختيار تحويل داخلي' : 'N/A - Internal transfer selected';
    } else {
        // No internal transfer - enable supplier
        supplierInput.disabled = false;
        supplierInput.placeholder = lang === 'ar' ? 'أدخل اسم المورد لهذه الشحنة' : 'Enter supplier name for this incoming stock';
    }
}

// ============================================
// Incoming Supplier Input Handler
// ============================================
function handleIncomingSupplierInput() {
    const supplier = document.getElementById('incoming-supplier').value.trim();
    const internalTransferSelect = document.getElementById('incoming-internal-transfer');
    
    if (supplier) {
        // Supplier entered - disable internal transfer
        internalTransferSelect.value = '';
        internalTransferSelect.disabled = true;
    } else {
        // No supplier - enable internal transfer
        internalTransferSelect.disabled = false;
    }
}

// ============================================
// Outgoing Internal Transfer Dropdown Population
// ============================================
async function populateOutgoingTransferDropdown() {
    try {
        const locations = await eel.get_locations()();
        const select = document.getElementById('outgoing-internal-transfer');
        const lang = window.i18n?.currentLang() || 'en';
        
        // Reset with default option
        const noTransferText = lang === 'ar' ? 'بدون تحويل داخلي' : 'No internal transfer';
        select.innerHTML = `<option value="">${noTransferText}</option>`;
        
        // Filter out current factory - can't transfer to self
        locations.filter(loc => loc !== currentFactory).forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading outgoing transfer locations:', error);
    }
}

// ============================================
// Outgoing Internal Transfer Change Handler
// ============================================
function handleOutgoingTransferChange() {
    const internalTransfer = document.getElementById('outgoing-internal-transfer').value;
    const productionLineSelect = document.getElementById('outgoing-production-line');
    const lang = window.i18n?.currentLang() || 'en';
    
    if (internalTransfer) {
        // Internal transfer selected - disable and clear production line
        productionLineSelect.value = '';
        productionLineSelect.disabled = true;
    } else {
        // No internal transfer - enable production line
        productionLineSelect.disabled = false;
    }
}

// ============================================
// Outgoing Production Line Change Handler
// ============================================
function handleOutgoingProductionLineChange() {
    const productionLine = document.getElementById('outgoing-production-line').value;
    const internalTransferSelect = document.getElementById('outgoing-internal-transfer');
    
    if (productionLine) {
        // Production line selected - disable internal transfer
        internalTransferSelect.value = '';
        internalTransferSelect.disabled = true;
    } else {
        // No production line - enable internal transfer
        internalTransferSelect.disabled = false;
    }
}

// ============================================
// Transfer Dropdowns Population (for transfer type)
// ============================================
async function populateTransferDropdowns() {
    try {
        const locations = await eel.get_locations()();
        const fromSelect = document.getElementById('transfer-from');
        const toSelect = document.getElementById('transfer-to');
        const lang = window.i18n?.currentLang() || 'en';
        
        // Reset with default option
        const selectLocationText = lang === 'ar' ? 'اختر الموقع...' : 'Select location...';
        fromSelect.innerHTML = `<option value="">${selectLocationText}</option>`;
        toSelect.innerHTML = `<option value="">${selectLocationText}</option>`;
        
        locations.forEach(location => {
            const optionFrom = document.createElement('option');
            optionFrom.value = location;
            optionFrom.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            fromSelect.appendChild(optionFrom);
            
            const optionTo = document.createElement('option');
            optionTo.value = location;
            optionTo.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            toSelect.appendChild(optionTo);
        });
    } catch (error) {
        console.error('Error loading transfer locations:', error);
    }
}

// ============================================
// Status Messages
// ============================================
function showIdStatus(message, type) {
    const status = document.getElementById('id-status');
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.classList.remove('hidden');
}

function hideIdStatus() {
    document.getElementById('id-status').classList.add('hidden');
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// ============================================
// Unit Dropdown Population
// ============================================
async function populateUnits() {
    try {
        const units = await eel.get_units()();
        const select = document.getElementById('item-unit');
        const filterSelect = document.getElementById('filter-unit');
        
        units.forEach(unit => {
            // Main form - show translated unit
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = window.i18n ? window.i18n.getUnitTranslation(unit) : unit;
            select.appendChild(option);
            
            // Filter dropdown
            const filterOption = document.createElement('option');
            filterOption.value = unit;
            filterOption.textContent = window.i18n ? window.i18n.getUnitTranslation(unit) : unit;
            filterSelect.appendChild(filterOption);
        });
    } catch (error) {
        console.error('Error loading units:', error);
    }
}

// ============================================
// Category Dropdown Population
// ============================================
async function populateCategories() {
    try {
        const categories = await eel.get_categories()();
        const select = document.getElementById('item-category');
        const filterSelect = document.getElementById('filter-category');
        
        categories.forEach(category => {
            // Main form - show translated category
            const option = document.createElement('option');
            option.value = category;
            option.textContent = window.i18n ? window.i18n.getCategoryTranslation(category) : category;
            select.appendChild(option);
            
            // Filter dropdown
            const filterOption = document.createElement('option');
            filterOption.value = category;
            filterOption.textContent = window.i18n ? window.i18n.getCategoryTranslation(category) : category;
            filterSelect.appendChild(filterOption);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// ============================================
// Location Dropdown Population
// ============================================
async function populateLocations() {
    try {
        const locations = await eel.get_locations()();
        const select = document.getElementById('item-location');
        const filterSelect = document.getElementById('filter-location');
        const lang = window.i18n?.currentLang() || 'en';
        
        // Add "All Locations" option for filter dropdown
        const allLocationsText = lang === 'ar' ? 'جميع المواقع' : 'All Locations';
        filterSelect.innerHTML = `<option value="">${allLocationsText}</option>`;
        
        locations.forEach(location => {
            // Main form
            const option = document.createElement('option');
            option.value = location;
            option.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            select.appendChild(option);
            
            // Filter dropdown
            const filterOption = document.createElement('option');
            filterOption.value = location;
            filterOption.textContent = window.i18n ? window.i18n.getLocationTranslation(location) : location;
            filterSelect.appendChild(filterOption);
        });
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// ============================================
// Add New Item
// ============================================
async function addNewItem() {
    const itemId = document.getElementById('item-id').value.trim();
    const name = document.getElementById('item-name').value.trim();
    const category = document.getElementById('item-category').value;
    const unit = document.getElementById('item-unit').value;
    const locationMain = document.getElementById('item-location').value;
    const internalTransfer = document.getElementById('item-internal-transfer').value;
    const location = internalTransfer ? `${locationMain}|${internalTransfer}` : locationMain;
    const supplier = document.getElementById('item-supplier').value.trim();
    const startingBalance = document.getElementById('starting-balance').value;
    const startingBalanceDate = document.getElementById('starting-balance-date').value;
    const unitPrice = document.getElementById('item-price').value;
    const minStock = document.getElementById('item-min-stock').value;
    const lang = window.i18n?.currentLang() || 'en';

    // Client-side validation - varies by category
    if (!itemId || !name || !category || !unit || !locationMain || startingBalance === '' || unitPrice === '') {
        const msg = lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields';
        showToast(msg, 'error');
        return;
    }
    
    // Supplier is optional for new items - will be required for imports/exports

    if (parseFloat(startingBalance) < 0) {
        const msg = lang === 'ar' ? 'لا يمكن أن يكون الرصيد الافتتاحي سالباً' : 'Starting balance cannot be negative';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.add_new_item(itemId, name, category, unit, location, supplier, startingBalance, unitPrice, minStock || 0, startingBalanceDate)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync to Firebase if enabled
            if (window.onStockItemUpdated) {
                window.onStockItemUpdated(currentFactory, {
                    id: itemId,
                    name: name,
                    category: category,
                    unit: unit,
                    location: location,
                    supplier: supplier,
                    starting_balance: parseFloat(startingBalance),
                    total_incoming: 0,
                    total_outgoing: 0,
                    net_stock: parseFloat(startingBalance),
                    unit_price: parseFloat(unitPrice),
                    min_stock: parseFloat(minStock || 0)
                });
            }
            
            // Reset form
            await generateNewId();
            hideAllForms();
            hideIdStatus();
            // Refresh filter options and notifications
            await loadFilterOptions();
            await loadNotifications();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        const msg = lang === 'ar' ? 'فشل في إضافة الصنف' : 'Failed to add item';
        showToast(msg, 'error');
    }
}

// ============================================
// Update Stock
// ============================================
async function updateStock() {
    const itemId = document.getElementById('item-id').value.trim();
    const transactionType = document.getElementById('transaction-type').value;
    const quantity = document.getElementById('quantity').value;
    const supplier = document.getElementById('incoming-supplier').value.trim();
    const incomingTransfer = document.getElementById('incoming-internal-transfer').value;
    const outgoingTransfer = document.getElementById('outgoing-internal-transfer').value;
    const transferFrom = document.getElementById('transfer-from').value;
    const transferTo = document.getElementById('transfer-to').value;
    const price = document.getElementById('incoming-price').value;
    const productionLine = document.getElementById('outgoing-production-line').value;
    const documentType = document.getElementById('document-type').value;
    const documentNumber = document.getElementById('document-number').value.trim();
    const transactionDate = document.getElementById('transaction-date').value;
    const lang = window.i18n?.currentLang() || 'en';
    
    // Build notes for production line info or internal transfer
    let notes = '';

    // Client-side validation
    if (!transactionType) {
        const msg = lang === 'ar' ? 'يرجى اختيار نوع المعاملة' : 'Please select a transaction type';
        showToast(msg, 'error');
        return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
        const msg = lang === 'ar' ? 'يرجى إدخال كمية صالحة أكبر من 0' : 'Please enter a valid quantity greater than 0';
        showToast(msg, 'error');
        return;
    }

    // Validate supplier OR internal transfer for incoming transactions (not for finished_product)
    if (transactionType === 'incoming' && currentItem && currentItem.category !== 'finished_product') {
        if (!supplier && !incomingTransfer) {
            const msg = lang === 'ar' ? 'يرجى إدخال اسم المورد أو اختيار تحويل داخلي' : 'Please enter supplier name or select internal transfer';
            showToast(msg, 'error');
            return;
        }
    }
    
    // Validate production line for finished_product incoming
    if (transactionType === 'incoming' && currentItem && currentItem.category === 'finished_product') {
        if (!productionLine) {
            const msg = lang === 'ar' ? 'يرجى اختيار خط الإنتاج' : 'Please select a production line';
            showToast(msg, 'error');
            return;
        }
    }

    if (transactionType === 'incoming' && (!price || parseFloat(price) < 0)) {
        const msg = lang === 'ar' ? 'يرجى إدخال سعر صالح' : 'Please enter a valid price';
        showToast(msg, 'error');
        return;
    }
    
    // Validate production line OR internal transfer for outgoing transactions
    if (transactionType === 'outgoing' && !productionLine && !outgoingTransfer) {
        const msg = lang === 'ar' ? 'يرجى اختيار خط الإنتاج أو تحويل داخلي' : 'Please select a production line or internal transfer';
        showToast(msg, 'error');
        return;
    }
    
    // Validate transfer from and to for transfer transactions
    if (transactionType === 'transfer') {
        if (!transferFrom || !transferTo) {
            const msg = lang === 'ar' ? 'يرجى اختيار موقع المصدر والوجهة' : 'Please select both source and destination locations';
            showToast(msg, 'error');
            return;
        }
        if (transferFrom === transferTo) {
            const msg = lang === 'ar' ? 'لا يمكن أن يكون المصدر والوجهة نفس الموقع' : 'Source and destination cannot be the same location';
            showToast(msg, 'error');
            return;
        }
    }
    
    // Add production line to notes for outgoing
    if (transactionType === 'outgoing' && productionLine) {
        const lineDisplay = window.i18n ? window.i18n.getSubLocationTranslation(productionLine) : productionLine;
        const toText = lang === 'ar' ? 'إلى' : 'To';
        notes = `${toText}: ${lineDisplay}`;
    }
    
    // Add internal transfer to notes for outgoing - this will be a proper inter-factory transfer
    let isInternalTransfer = false;
    let destFactory = '';
    let sourceFactory = '';
    if (transactionType === 'outgoing' && outgoingTransfer) {
        isInternalTransfer = true;
        destFactory = outgoingTransfer;
        sourceFactory = currentFactory;
        const transferDisplay = window.i18n ? window.i18n.getLocationTranslation(outgoingTransfer) : outgoingTransfer;
        const toText = lang === 'ar' ? 'تحويل داخلي إلى' : 'Internal transfer to';
        notes = `${toText}: ${transferDisplay}`;
    }
    
    // Add internal transfer to notes for incoming - this is a REVERSE transfer (source sends to current factory)
    // We treat this as a transfer FROM the selected factory TO the current factory
    if (transactionType === 'incoming' && incomingTransfer) {
        isInternalTransfer = true;
        sourceFactory = incomingTransfer;  // The factory sending the stock
        destFactory = currentFactory;       // Current factory is receiving
        const transferDisplay = window.i18n ? window.i18n.getLocationTranslation(incomingTransfer) : incomingTransfer;
        const fromText = lang === 'ar' ? 'تحويل داخلي من' : 'Internal transfer from';
        notes = `${fromText}: ${transferDisplay}`;
    }
    
    // Add production line to notes for finished product incoming
    if (transactionType === 'incoming' && currentItem && currentItem.category === 'finished_product' && productionLine) {
        const lineDisplay = window.i18n ? window.i18n.getSubLocationTranslation(productionLine) : productionLine;
        const fromText = lang === 'ar' ? 'من خط الإنتاج' : 'From production line';
        notes = `${fromText}: ${lineDisplay}`;
    }
    
    // Add transfer from/to to notes for transfer transactions
    if (transactionType === 'transfer') {
        const fromDisplay = window.i18n ? window.i18n.getLocationTranslation(transferFrom) : transferFrom;
        const toDisplay = window.i18n ? window.i18n.getLocationTranslation(transferTo) : transferTo;
        const fromText = lang === 'ar' ? 'من' : 'From';
        const toText = lang === 'ar' ? 'إلى' : 'To';
        notes = `${fromText}: ${fromDisplay} → ${toText}: ${toDisplay}`;
    }
    
    // Use internal transfer location as supplier if no supplier entered
    // For finished_product, use production line as supplier
    let finalSupplier = supplier;
    if (!finalSupplier && incomingTransfer && !isInternalTransfer) {
        // Only set supplier from transfer if it's NOT a proper internal transfer
        finalSupplier = window.i18n ? window.i18n.getLocationTranslation(incomingTransfer) : incomingTransfer;
    }
    if (!finalSupplier && currentItem && currentItem.category === 'finished_product' && productionLine) {
        finalSupplier = window.i18n ? window.i18n.getSubLocationTranslation(productionLine) : productionLine;
    }

    try {
        let result;
        
        // If this is an internal transfer (both outgoing to another factory OR incoming from another factory), use transfer mode
        if (isInternalTransfer && sourceFactory && destFactory) {
            result = await eel.update_stock(itemId, 'transfer', quantity, '', 0, documentType, documentNumber, notes, transactionDate, sourceFactory, destFactory)();
        } else {
            // Regular incoming/outgoing transaction
            result = await eel.update_stock(itemId, transactionType, quantity, finalSupplier || '', price || 0, documentType, documentNumber, notes, transactionDate, currentFactory, '')();
        }
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync transaction to Firebase if enabled
            if (window.onTransactionRecorded) {
                window.onTransactionRecorded({
                    timestamp: transactionDate || new Date().toISOString(),
                    factory: currentFactory,
                    item_id: itemId,
                    item_name: currentItem?.name || '',
                    transaction_type: isInternalTransfer ? 'transfer' : transactionType,
                    quantity: parseFloat(quantity),
                    supplier: finalSupplier || '',
                    price: parseFloat(price || 0),
                    document_type: documentType,
                    document_number: documentNumber,
                    notes: notes
                });
            }
            
            // Refresh the item info and notifications
            await checkItemId();
            await loadNotifications();
            await loadStockData(); // Also refresh stock table to show updated quantities
            // Clear document fields
            document.getElementById('document-type').selectedIndex = 0;
            document.getElementById('document-number').value = '';
            document.getElementById('transaction-date').value = '';
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showToast('Failed to update stock', 'error');
    }
}

// ============================================
// Load Stock Data
// ============================================
async function loadStockData() {
    try {
        // Add current factory to filters
        const filtersWithFactory = { ...stockFilters, factory: currentFactory };
        const items = await eel.get_all_items(filtersWithFactory)();
        renderStockTable(items);
        const lang = window.i18n?.currentLang() || 'en';
        const itemWord = lang === 'ar' ? 'صنف' : (items.length !== 1 ? 'items' : 'item');
        const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
        const factoryName = getFactoryDisplayName(currentFactory);
        document.getElementById('stock-count').textContent = `${showingWord} ${items.length} ${itemWord} (${factoryName})`;
    } catch (error) {
        console.error('Error loading stock data:', error);
        showToast('Failed to load stock data', 'error');
    }
}

function renderStockTable(items) {
    const tbody = document.getElementById('stock-table-body');
    const lang = window.i18n?.currentLang() || 'en';
    const noItemsMsg = lang === 'ar' ? 'لا توجد أصناف. أضف أول صنف!' : 'No items found. Add your first item!';
    const updateBtn = lang === 'ar' ? 'تحديث' : 'Update';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="15">${noItemsMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const netStock = parseFloat(item.net_stock);
        const minStock = parseFloat(item.min_stock || 0);
        const unitPrice = parseFloat(item.unit_price || 0);
        const totalPrice = netStock * unitPrice;
        // Check if stock is below minimum threshold
        const isBelowMin = minStock > 0 && netStock < minStock;
        const stockClass = isBelowMin ? 'stock-low' : netStock <= 10 ? 'stock-low' : netStock <= 50 ? 'stock-medium' : 'stock-good';
        const categoryDisplay = window.i18n ? window.i18n.getCategoryTranslation(item.category) : item.category;
        const unitDisplay = window.i18n ? window.i18n.getUnitTranslation(item.unit) : item.unit;
        
        // Parse location (format: "location|internalTransfer" or just "location")
        const locationParts = (item.location || '').split('|');
        const locationDisplay = locationParts[0] ? (window.i18n ? window.i18n.getLocationTranslation(locationParts[0]) : locationParts[0]) : '';
        const internalTransferDisplay = locationParts[1] ? (window.i18n ? window.i18n.getLocationTranslation(locationParts[1]) : locationParts[1]) : '';
        const fullLocationDisplay = internalTransferDisplay ? `${locationDisplay} → ${internalTransferDisplay}` : locationDisplay;
        
        const editBtn = lang === 'ar' ? 'تعديل' : 'Edit';
        
        return `
            <tr class="${isBelowMin ? 'row-warning' : ''}" data-item-id="${escapeHtml(item.id)}">
                <td>
                    <span class="expand-arrow" onclick="toggleItemHistory('${escapeHtml(item.id)}')" title="${lang === 'ar' ? 'إظهار السجل' : 'Show history'}">▶</span>
                    <strong>${escapeHtml(item.id)}</strong>
                </td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(categoryDisplay)}</td>
                <td>${escapeHtml(unitDisplay)}</td>
                <td>${escapeHtml(fullLocationDisplay)}</td>
                <td>${escapeHtml(item.supplier || '-')}</td>
                <td>${formatNumber(item.starting_balance)}</td>
                <td style="color: #16a34a;">${formatSignedNumber(item.total_incoming)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-item.total_outgoing)}</td>
                <td class="${stockClass}">${formatNumber(netStock)}</td>
                <td>${formatNumber(unitPrice)}</td>
                <td style="font-weight: 600; color: #2563eb;">${formatNumber(totalPrice)}</td>
                <td>${formatNumber(minStock)}</td>
                <td>${escapeHtml(item.last_updated || '-')}</td></td>
                <td class="no-print">
                    <button class="btn btn-small btn-outline" onclick="selectItemForUpdate('${escapeHtml(item.id)}')">${updateBtn}</button>
                    <button class="btn btn-small btn-secondary" onclick="editItem('${escapeHtml(item.id)}')">${editBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="deleteItem('${escapeHtml(item.id)}')">${deleteBtn}</button>
                </td>
            </tr>
            <tr class="item-history-row hidden" id="history-row-${escapeHtml(item.id)}">
                <td colspan="15" class="history-cell">
                    <div class="history-container">
                        <div class="history-header">
                            <h4>${lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h4>
                            <input type="text" class="history-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" 
                                   onkeyup="filterItemHistory('${escapeHtml(item.id)}', this.value)">
                        </div>
                        <div class="history-content" id="history-content-${escapeHtml(item.id)}">
                            <div class="loading">${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// Item Transaction History
// ============================================
let loadedHistories = {}; // Cache loaded transaction histories

async function toggleItemHistory(itemId) {
    const historyRow = document.getElementById(`history-row-${itemId}`);
    const lang = window.i18n?.currentLang() || 'en';
    const arrow = document.querySelector(`[onclick="toggleItemHistory('${itemId}')"]`);
    
    if (!historyRow) return;
    
    // Toggle visibility
    const isHidden = historyRow.classList.contains('hidden');
    
    if (isHidden) {
        // Show and load if not already loaded
        historyRow.classList.remove('hidden');
        if (arrow) arrow.classList.add('expanded');
        
        if (!loadedHistories[itemId]) {
            // Load transaction history
            try {
                const transactions = await eel.get_item_transactions(itemId, currentFactory)();
                loadedHistories[itemId] = transactions;
                renderItemHistory(itemId, transactions);
            } catch (error) {
                console.error('Error loading item history:', error);
                const contentDiv = document.getElementById(`history-content-${itemId}`);
                contentDiv.innerHTML = `<div class="error-msg">${lang === 'ar' ? 'فشل في تحميل السجل' : 'Failed to load history'}</div>`;
            }
        } else {
            // Already loaded, just display
            renderItemHistory(itemId, loadedHistories[itemId]);
        }
    } else {
        // Hide
        historyRow.classList.add('hidden');
        if (arrow) arrow.classList.remove('expanded');
    }
}

function renderItemHistory(itemId, transactions) {
    const contentDiv = document.getElementById(`history-content-${itemId}`);
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!contentDiv) return;
    
    if (transactions.length === 0) {
        contentDiv.innerHTML = `<div class="no-history">${lang === 'ar' ? 'لا توجد معاملات' : 'No transactions found'}</div>`;
        return;
    }
    
    // Transaction type translations
    const transTypeTranslations = {
        'INCOMING': lang === 'ar' ? 'وارد' : 'INCOMING',
        'OUTGOING': lang === 'ar' ? 'صادر' : 'OUTGOING',
        'INITIAL': lang === 'ar' ? 'افتتاحي' : 'INITIAL',
        'DELETED': lang === 'ar' ? 'محذوف' : 'DELETED',
        'وارد': 'وارد',
        'صادر': 'صادر',
        'افتتاحي': 'افتتاحي',
        'محذوف': 'محذوف',
        'تحويل داخلي': 'تحويل داخلي'
    };
    
    const docTypeTranslations = {
        'purchase_invoice': lang === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice',
        'sales_invoice': lang === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice',
        'raw_materials_order': lang === 'ar' ? 'اذن صرف - خامات' : 'Raw Materials Disbursement',
        'finished_product_receipt': lang === 'ar' ? 'اذن استلام - منتج تام' : 'Finished Product Receipt'
    };
    
    const html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>${lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th>${lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th>${lang === 'ar' ? 'الكمية' : 'Quantity'}</th>
                    <th>${lang === 'ar' ? 'الرصيد السابق' : 'Previous'}</th>
                    <th>${lang === 'ar' ? 'الرصيد الجديد' : 'New'}</th>
                    <th>${lang === 'ar' ? 'المورد' : 'Supplier'}</th>
                    <th>${lang === 'ar' ? 'نوع المستند' : 'Doc Type'}</th>
                    <th>${lang === 'ar' ? 'رقم المستند' : 'Doc #'}</th>
                    <th>${lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(trans => {
                    const transType = transTypeTranslations[trans.transaction_type] || trans.transaction_type;
                    const docType = docTypeTranslations[trans.document_type] || trans.document_type || '-';
                    const badgeClass = `badge-${trans.transaction_type.toLowerCase()}`;
                    
                    return `
                        <tr>
                            <td>${escapeHtml(trans.timestamp || trans.transaction_date || '-')}</td>
                            <td><span class="badge ${badgeClass}">${escapeHtml(transType)}</span></td>
                            <td>${formatNumberWithSign(trans.quantity, true)}</td>
                            <td>${formatNumber(trans.previous_stock)}</td>
                            <td>${formatNumber(trans.new_stock)}</td>
                            <td>${escapeHtml(trans.supplier || '-')}</td>
                            <td>${escapeHtml(docType)}</td>
                            <td>${escapeHtml(trans.document_number || '-')}</td>
                            <td>${escapeHtml(trans.notes || '-')}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    contentDiv.innerHTML = html;
}

function filterItemHistory(itemId, searchTerm) {
    const contentDiv = document.getElementById(`history-content-${itemId}`);
    if (!contentDiv || !loadedHistories[itemId]) return;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    if (!searchLower) {
        // Show all
        renderItemHistory(itemId, loadedHistories[itemId]);
        return;
    }
    
    // Filter transactions
    const filtered = loadedHistories[itemId].filter(trans => {
        const searchableText = [
            trans.timestamp,
            trans.transaction_date,
            trans.transaction_type,
            trans.supplier,
            trans.document_type,
            trans.document_number,
            trans.notes
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchLower);
    });
    
    renderItemHistory(itemId, filtered);
}

// ============================================
// Entity Transaction History (for Ledgers)
// ============================================
let loadedEntityHistories = {}; // Cache loaded entity transaction histories

async function toggleEntityHistory(entityId, ledgerType) {
    const historyRow = document.getElementById(`history-row-${entityId}`);
    const lang = window.i18n?.currentLang() || 'en';
    const arrow = document.querySelector(`[onclick*="toggleEntityHistory('${entityId}'"]`);

    if (!historyRow) return;

    // Toggle visibility
    const isHidden = historyRow.classList.contains('hidden');

    if (isHidden) {
        // Show and load if not already loaded
        historyRow.classList.remove('hidden');
        if (arrow) arrow.classList.add('expanded');

        const cacheKey = `${ledgerType}-${entityId}`;
        if (!loadedEntityHistories[cacheKey]) {
            // Load transaction history
            try {
                const transactions = await eel.get_entity_transactions(entityId, ledgerType)();
                loadedEntityHistories[cacheKey] = transactions;
                renderEntityHistory(entityId, transactions);
            } catch (error) {
                console.error('Error loading entity history:', error);
                const contentDiv = document.getElementById(`history-content-${entityId}`);
                contentDiv.innerHTML = `<div class="error-msg">${lang === 'ar' ? 'فشل في تحميل السجل' : 'Failed to load history'}</div>`;
            }
        } else {
            // Already loaded, just display
            renderEntityHistory(entityId, loadedEntityHistories[cacheKey]);
        }

        // Pre-fill history search when this row was matched via transaction search
        const entityRow = historyRow.previousElementSibling;
        if (entityRow && entityRow.classList.contains('transaction-match-row')) {
            const moduleSearchIds = {
                customer: 'customers-search',
                supplier: 'suppliers-search',
                treasury: 'treasury-search',
                covenant: 'covenants-search',
                advance: 'advances-search'
            };
            const moduleSearchId = moduleSearchIds[ledgerType];
            const moduleTerm = moduleSearchId
                ? (document.getElementById(moduleSearchId)?.value || '').trim()
                : '';
            if (moduleTerm) {
                const historySearchInput = historyRow.querySelector('.history-search');
                if (historySearchInput && !historySearchInput.value) {
                    historySearchInput.value = moduleTerm;
                    filterEntityHistory(entityId, moduleTerm);
                }
            }
        }
    } else {
        // Hide
        historyRow.classList.add('hidden');
        if (arrow) arrow.classList.remove('expanded');
    }
}

function renderEntityHistory(entityId, transactions) {
    const contentDiv = document.getElementById(`history-content-${entityId}`);
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!contentDiv) return;
    
    if (transactions.length === 0) {
        contentDiv.innerHTML = `<div class="no-history">${lang === 'ar' ? 'لا توجد معاملات' : 'No transactions found'}</div>`;
        return;
    }
    
    // Payment method translations
    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };
    
    const html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>${lang === 'ar' ? 'وقت التسجيل' : 'Logged At'}</th>
                    <th>${lang === 'ar' ? 'تاريخ العملية' : 'Trans. Date'}</th>
                    <th>${lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th>${lang === 'ar' ? 'مدين' : 'Debit'}</th>
                    <th>${lang === 'ar' ? 'دائن' : 'Credit'}</th>
                    <th>${lang === 'ar' ? 'الرصيد السابق' : 'Previous'}</th>
                    <th>${lang === 'ar' ? 'الرصيد الجديد' : 'New'}</th>
                    <th>${lang === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                    <th>${lang === 'ar' ? 'رقم المستند' : 'Doc #'}</th>
                    <th>${lang === 'ar' ? 'البيان' : 'Statement'}</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(trans => {
                    const paymentDisplay = paymentTranslations[trans.payment_method] || trans.payment_method || '-';
                    const debit = parseFloat(trans.debit || 0);
                    const credit = parseFloat(trans.credit || 0);
                    
                    return `
                        <tr>
                            <td>${escapeHtml(trans.timestamp || '-')}</td>
                            <td>${escapeHtml(trans.transaction_date || '-')}</td>
                            <td><span class="badge">${escapeHtml(trans.transaction_type || '-')}</span></td>
                            <td style="color: #16a34a;">${formatSignedNumber(debit)}</td>
                            <td style="color: #dc2626;">${formatSignedNumber(-credit)}</td>
                            <td>${formatNumber(trans.previous_balance || 0)}</td>
                            <td>${formatNumber(trans.new_balance || 0)}</td>
                            <td>${escapeHtml(paymentDisplay)}</td>
                            <td>${escapeHtml(trans.document_number || '-')}</td>
                            <td>${escapeHtml(trans.statement || '-')}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    contentDiv.innerHTML = html;
}

function filterEntityHistory(entityId, searchTerm) {
    const contentDiv = document.getElementById(`history-content-${entityId}`);
    
    // Find the cache key that contains this entityId
    const cacheKey = Object.keys(loadedEntityHistories).find(key => key.endsWith(`-${entityId}`));
    
    if (!contentDiv || !cacheKey || !loadedEntityHistories[cacheKey]) return;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    if (!searchLower) {
        // Show all
        renderEntityHistory(entityId, loadedEntityHistories[cacheKey]);
        return;
    }
    
    // Filter transactions
    const filtered = loadedEntityHistories[cacheKey].filter(trans => {
        const searchableText = [
            trans.timestamp,
            trans.transaction_date,
            trans.transaction_type,
            trans.payment_method,
            trans.document_number,
            trans.statement
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchLower);
    });
    
    renderEntityHistory(entityId, filtered);
}

function getModuleEntityId(item, ledgerType) {
    if (ledgerType === 'treasury') {
        return (item.account_number || '').toString();
    }
    return (item.id || '').toString();
}

function normalizeEntityId(id) {
    return (id || '').toString().trim().toUpperCase();
}

// Only search meaningful text fields — intentionally excluding debit/credit/balance
// to avoid matching numbers like "37" inside "1,437,000".
function buildTransactionSearchText(trans) {
    return [
        trans.timestamp,
        trans.transaction_date,
        trans.entity_id,
        trans.entity_name,
        trans.transaction_type,
        trans.payment_method,
        trans.document_number,
        trans.statement
    ].join(' ').toLowerCase();
}

/**
 * Fetch all transactions for a module and return which entities match the search term.
 * Returns: { matchedIds: Set<normalizedId>, countByEntityId: Map<normalizedId, number> }
 */
async function getModuleTransactionMatches(ledgerType, searchTerms, logic = 'OR') {
    const terms = (Array.isArray(searchTerms) ? searchTerms : [searchTerms])
        .map(t => (t || '').toString().trim().toLowerCase())
        .filter(Boolean);

    if (terms.length === 0) {
        return { matchedIds: new Set(), countByEntityId: new Map() };
    }

    try {
        const transactions = await eel.get_module_transactions(ledgerType)();
        const matchedIds = new Set();
        const countByEntityId = new Map();
        const useAnd = (logic || 'OR').toUpperCase() === 'AND';

        for (const trans of transactions) {
            const searchableText = buildTransactionSearchText(trans);
            const matches = useAnd
                ? terms.every(term => searchableText.includes(term))
                : terms.some(term => searchableText.includes(term));

            if (matches) {
                const normalizedId = normalizeEntityId(trans.entity_id);
                matchedIds.add(normalizedId);
                countByEntityId.set(normalizedId, (countByEntityId.get(normalizedId) || 0) + 1);
            }
        }

        return { matchedIds, countByEntityId };
    } catch (error) {
        console.error(`Error loading ${ledgerType} transactions for search:`, error);
        return { matchedIds: new Set(), countByEntityId: new Map() };
    }
}

function mergeItemsByEntityId(baseItems, additionalItems, ledgerType) {
    const merged = [...baseItems];
    const existing = new Set(baseItems.map(item => normalizeEntityId(getModuleEntityId(item, ledgerType))));

    for (const item of additionalItems) {
        const normalizedId = normalizeEntityId(getModuleEntityId(item, ledgerType));
        if (!normalizedId || existing.has(normalizedId)) continue;
        merged.push(item);
        existing.add(normalizedId);
    }

    return merged;
}

/**
 * Add a visual "📋 N" pill badge to rows that appeared because of transaction matches,
 * and a left-border accent to distinguish them from direct entity matches.
 */
function markTransactionMatchedRows(ledgerType, transactionMatchedIds, entityMatchedIds, countByEntityId) {
    if (!transactionMatchedIds || transactionMatchedIds.size === 0) return;
    const lang = window.i18n?.currentLang() || 'en';

    transactionMatchedIds.forEach(normalizedId => {
        // Locate the row by data-entity-id (case-insensitive search)
        const rows = document.querySelectorAll('tr[data-entity-id]');
        let targetRow = null;
        for (const r of rows) {
            if (normalizeEntityId(r.getAttribute('data-entity-id')) === normalizedId) {
                targetRow = r;
                break;
            }
        }
        if (!targetRow) return;

        const isEntityMatch = entityMatchedIds && entityMatchedIds.has(normalizedId);
        const count = countByEntityId ? (countByEntityId.get(normalizedId) || 0) : 0;
        const label = lang === 'ar' ? `${count} معاملة` : `${count} txn${count !== 1 ? 's' : ''}`;
        const title = lang === 'ar' ? 'ظهر هذا السجل بسبب تطابق في المعاملات' : 'Appeared due to matching transactions';

        // Add amber left-border accent
        targetRow.classList.add('transaction-match-row');

        // Add a pill badge in the ID cell (first td), only if not already present
        const firstCell = targetRow.querySelector('td:first-child');
        if (firstCell && !firstCell.querySelector('.trans-match-pill')) {
            const pill = document.createElement('span');
            pill.className = 'trans-match-pill';
            pill.title = title;
            pill.textContent = `📋 ${label}`;
            firstCell.appendChild(pill);
        }
    });
}

// ============================================
// Load Transaction Data
// ============================================
let currentLogSource = 'all_ledger';
let keywordTags = []; // Store keyword tags

// Initialize keyword tag-based search
function initKeywordTagSearch() {
    const keywordInput = document.getElementById('trans-filter-keyword');
    const tagsContainer = document.getElementById('keyword-tags');
    
    if (!keywordInput || !tagsContainer) return;
    
    // Handle Enter key to add tag
    keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = keywordInput.value.trim();
            if (value && !keywordTags.includes(value.toLowerCase())) {
                keywordTags.push(value.toLowerCase());
                renderKeywordTags();
                keywordInput.value = '';
                loadTransactionData();
            }
        }
    });
    
    // Handle backspace to remove last tag when input is empty
    keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && keywordInput.value === '' && keywordTags.length > 0) {
            keywordTags.pop();
            renderKeywordTags();
            loadTransactionData();
        }
    });
}

function renderKeywordTags() {
    const tagsContainer = document.getElementById('keyword-tags');
    if (!tagsContainer) return;
    
    tagsContainer.innerHTML = keywordTags.map((tag, index) => `
        <span class="keyword-tag">
            ${escapeHtml(tag)}
            <button type="button" class="keyword-tag-remove" onclick="removeKeywordTag(${index})" title="Remove">&times;</button>
        </span>
    `).join('');
}

function removeKeywordTag(index) {
    keywordTags.splice(index, 1);
    renderKeywordTags();
    loadTransactionData();
}

function clearKeywordTags() {
    keywordTags = [];
    renderKeywordTags();
    const keywordInput = document.getElementById('trans-filter-keyword');
    if (keywordInput) keywordInput.value = '';
}

function getKeywordsString() {
    return keywordTags.join(',');
}

function getKeywordLogic() {
    const select = document.getElementById('keyword-logic');
    return select ? select.value : 'AND';
}

function handleLogSourceChange() {
    currentLogSource = document.getElementById('trans-filter-source').value;
    
    // Show/hide stock-specific filters based on log source
    const stockFilterGroup = document.getElementById('stock-filter-group');
    const localOnlyFilterGroup = document.getElementById('local-only-filter-group');
    const typeFilter = document.getElementById('trans-filter-type').closest('.filter-group');
    const docTypeFilter = document.getElementById('trans-filter-doc-type').closest('.filter-group');
    const docNumberFilter = document.getElementById('trans-filter-doc-number').closest('.filter-group');
    
    if (currentLogSource === 'stock') {
        stockFilterGroup.style.display = '';
        localOnlyFilterGroup.style.display = '';
        typeFilter.style.display = '';
        docTypeFilter.style.display = '';
        docNumberFilter.style.display = '';
        // Restore stock transaction headers
        restoreStockTransactionHeaders();
    } else {
        stockFilterGroup.style.display = 'none';
        localOnlyFilterGroup.style.display = 'none';
        typeFilter.style.display = 'none';
        docTypeFilter.style.display = 'none';
        docNumberFilter.style.display = 'none';
    }
    
    // Clear filter values and reload
    document.getElementById('trans-filter-id').value = '';
    document.getElementById('trans-filter-type').selectedIndex = 0;
    document.getElementById('trans-filter-doc-type').selectedIndex = 0;
    document.getElementById('trans-filter-doc-number').value = '';
    document.getElementById('trans-filter-from').value = '';
    document.getElementById('trans-filter-to').value = '';
    document.getElementById('trans-filter-trans-date-from').value = '';
    document.getElementById('trans-filter-trans-date-to').value = '';
    transactionFilters = {};
    loadTransactionData();
}

async function loadTransactionData() {
    try {
        // Get keywords from tags
        const keywords = getKeywordsString();
        const keywordLogic = getKeywordLogic();
        
        if (currentLogSource === 'stock') {
            // Add keywords and factory filter to stock filters
            const filters = { ...transactionFilters, factory: currentFactory };
            if (keywords) {
                filters.keywords = keywords;
                filters.keyword_logic = keywordLogic;
            }
            // Add local_only filter (checked by default)
            const localOnlyCheckbox = document.getElementById('trans-filter-local-only');
            if (localOnlyCheckbox && localOnlyCheckbox.checked) {
                filters.local_only = true;
            }
            const transactions = await eel.get_all_transactions(filters)();
            renderTransactionTable(transactions);
            const lang = window.i18n?.currentLang() || 'en';
            const transWord = lang === 'ar' ? 'معاملة' : (transactions.length !== 1 ? 'transactions' : 'transaction');
            const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
            const factoryName = getFactoryDisplayName(currentFactory);
            document.getElementById('trans-count').textContent = `${showingWord} ${transactions.length} ${transWord} (${factoryName})`;
        } else {
            // Load ledger transactions
            const filters = {
                date_from: document.getElementById('trans-filter-from').value,
                date_to: document.getElementById('trans-filter-to').value,
                trans_date_from: document.getElementById('trans-filter-trans-date-from').value,
                trans_date_to: document.getElementById('trans-filter-trans-date-to').value
            };
            // Only add ledger_type filter if not 'all_ledger'
            if (currentLogSource !== 'all_ledger') {
                filters.ledger_type = currentLogSource;
            }
            // Add keyword filter
            if (keywords) {
                filters.keywords = keywords;
                filters.keyword_logic = keywordLogic;
            }
            // Remove empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });
            
            const transactions = await eel.get_all_ledger_transactions(filters)();
            renderLedgerTransactionTable(transactions);
            const lang = window.i18n?.currentLang() || 'en';
            const transWord = lang === 'ar' ? 'معاملة' : (transactions.length !== 1 ? 'transactions' : 'transaction');
            const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
            document.getElementById('trans-count').textContent = `${showingWord} ${transactions.length} ${transWord}`;
        }
    } catch (error) {
        console.error('Error loading transaction data:', error);
        showToast('Failed to load transaction data', 'error');
    }
}

function renderTransactionTable(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    const thead = document.querySelector('#transactions-table thead tr');
    const lang = window.i18n?.currentLang() || 'en';
    const noTransMsg = lang === 'ar' ? 'لا توجد معاملات مسجلة بعد.' : 'No transactions recorded yet.';
    
    // Restore stock transaction headers (in case ledger view changed them)
    thead.innerHTML = `
        <th>${lang === 'ar' ? 'وقت التسجيل' : 'Logged At'}</th>
        <th>${lang === 'ar' ? 'تاريخ العملية' : 'Trans. Date'}</th>
        <th>${lang === 'ar' ? 'كود الصنف' : 'Item ID'}</th>
        <th>${lang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
        <th>${lang === 'ar' ? 'النوع' : 'Type'}</th>
        <th>${lang === 'ar' ? 'الكمية' : 'Quantity'}</th>
        <th>${lang === 'ar' ? 'المخزون السابق' : 'Previous Stock'}</th>
        <th>${lang === 'ar' ? 'المخزون الجديد' : 'New Stock'}</th>
        <th>${lang === 'ar' ? 'المورد' : 'Supplier'}</th>
        <th>${lang === 'ar' ? 'نوع المستند' : 'Document Type'}</th>
        <th>${lang === 'ar' ? 'رقم المستند' : 'Doc #'}</th>
        <th>${lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
        <th>${lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
    `;
    
    if (transactions.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="13">${noTransMsg}</td></tr>`;
        return;
    }

    // Document type translations for display
    const docTypeTranslations = {
        'purchase_invoice': lang === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice',
        'sales_invoice': lang === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice',
        'raw_materials_order': lang === 'ar' ? 'اذن صرف - خامات' : 'Raw Materials Disbursement',
        'finished_product_receipt': lang === 'ar' ? 'اذن استلام - منتج تام' : 'Finished Product Receipt'
    };
    
    // Transaction type translations
    const transTypeTranslations = {
        'INCOMING': lang === 'ar' ? 'وارد' : 'INCOMING',
        'OUTGOING': lang === 'ar' ? 'صادر' : 'OUTGOING',
        'INITIAL': lang === 'ar' ? 'افتتاحي' : 'INITIAL',
        'DELETED': lang === 'ar' ? 'محذوف' : 'DELETED',
        'وارد': 'وارد',
        'صادر': 'صادر',
        'افتتاحي': 'افتتاحي',
        'محذوف': 'محذوف',
        'تحويل داخلي': 'تحويل داخلي'
    };

    const reverseBtn = lang === 'ar' ? 'عكس' : 'Reverse';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    // Sort by transaction_date (actual date) most recent first, fall back to timestamp
    const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = a.transaction_date || a.timestamp || '';
        const dateB = b.transaction_date || b.timestamp || '';
        return dateB.localeCompare(dateA);
    });

    tbody.innerHTML = sortedTransactions.map(trans => {
        let transTypeDisplay = transTypeTranslations[trans.transaction_type] || trans.transaction_type;
        let badgeClass = `badge-${trans.transaction_type.toLowerCase()}`;
        
        // Check for inter-factory transfer view
        if (trans.factory_view) {
            const partnerFactory = getFactoryDisplayName(trans.transfer_partner);
            if (trans.factory_view === 'export') {
                transTypeDisplay = lang === 'ar' ? `تصدير إلى ${partnerFactory}` : `Export to ${partnerFactory}`;
                badgeClass = 'badge-صادر';
            } else if (trans.factory_view === 'import') {
                transTypeDisplay = lang === 'ar' ? `استيراد من ${partnerFactory}` : `Import from ${partnerFactory}`;
                badgeClass = 'badge-وارد';
            }
        }
        
        const docTypeDisplay = trans.document_type ? (docTypeTranslations[trans.document_type] || trans.document_type) : '-';
        
        // Clean up notes - remove internal markers for display
        let notesDisplay = trans.notes || '-';
        notesDisplay = notesDisplay.replace(/\s*\[FROM:[^\]]+\]/g, '');
        notesDisplay = notesDisplay.replace(/\s*\[DELETED_ITEM:\{.*\}\]/g, '');  // Hide backup data
        if (!notesDisplay.trim()) notesDisplay = '-';
        
        // Escape timestamp for use in onclick - replace special characters
        const escapedTimestamp = escapeHtml(trans.timestamp).replace(/'/g, "\\'");
        const escapedItemId = escapeHtml(trans.item_id).replace(/'/g, "\\'");
        
        return `
            <tr>
                <td>${escapeHtml(trans.timestamp)}</td>
                <td>${escapeHtml(trans.transaction_date || '-')}</td>
                <td><strong>${escapeHtml(trans.item_id)}</strong></td>
                <td>${escapeHtml(trans.item_name)}</td>
                <td><span class="badge ${badgeClass}">${escapeHtml(transTypeDisplay)}</span></td>
                <td>${formatNumber(trans.quantity)}</td>
                <td>${formatNumber(trans.previous_stock)}</td>
                <td>${formatNumber(trans.new_stock)}</td>
                <td>${escapeHtml(trans.supplier || '-')}</td>
                <td>${escapeHtml(docTypeDisplay)}</td>
                <td>${escapeHtml(trans.document_number || '-')}</td>
                <td>${escapeHtml(notesDisplay)}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="confirmReverseTransaction('${escapedTimestamp}', '${escapedItemId}')">${reverseBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteTransaction('${escapedTimestamp}', '${escapedItemId}')">${deleteBtn}</button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderLedgerTransactionTable(transactions) {
    const tbody = document.getElementById('transactions-table-body');
    const thead = document.querySelector('#transactions-table thead tr');
    const lang = window.i18n?.currentLang() || 'en';
    const noTransMsg = lang === 'ar' ? 'لا توجد معاملات مسجلة بعد.' : 'No transactions recorded yet.';
    
    // Update table headers for ledger transactions (with Actions column)
    thead.innerHTML = `
        <th>${lang === 'ar' ? 'وقت التسجيل' : 'Logged At'}</th>
        <th>${lang === 'ar' ? 'تاريخ العملية' : 'Trans. Date'}</th>
        <th>${lang === 'ar' ? 'الرقم' : 'ID'}</th>
        <th>${lang === 'ar' ? 'الاسم' : 'Name'}</th>
        <th>${lang === 'ar' ? 'النوع' : 'Type'}</th>
        <th>${lang === 'ar' ? 'مدين' : 'Debit'}</th>
        <th>${lang === 'ar' ? 'دائن' : 'Credit'}</th>
        <th>${lang === 'ar' ? 'الرصيد السابق' : 'Previous Balance'}</th>
        <th>${lang === 'ar' ? 'الرصيد الجديد' : 'New Balance'}</th>
        <th>${lang === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
        <th>${lang === 'ar' ? 'رقم المستند' : 'Doc #'}</th>
        <th>${lang === 'ar' ? 'البيان' : 'Statement'}</th>
        <th>${lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
    `;
    
    if (transactions.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="13">${noTransMsg}</td></tr>`;
        return;
    }

    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };

    const reverseBtn = lang === 'ar' ? 'عكس' : 'Reverse';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';

    // Sort by transaction_date (actual date) most recent first, fall back to timestamp
    const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = a.transaction_date || a.timestamp || '';
        const dateB = b.transaction_date || b.timestamp || '';
        return dateB.localeCompare(dateA);
    });

    tbody.innerHTML = sortedTransactions.map(trans => {
        const paymentDisplay = paymentTranslations[trans.payment_method] || trans.payment_method || '-';
        const debit = parseFloat(trans.debit || 0);
        const credit = parseFloat(trans.credit || 0);
        
        // Statement for display - remove backup data markers
        let statementDisplay = trans.statement || '-';
        statementDisplay = statementDisplay.replace(/\s*\[DELETED_ENTITY:\{.*\}\]/g, '');  // Hide backup data
        if (!statementDisplay.trim()) statementDisplay = '-';
        
        // Escape for onclick
        const escapedTimestamp = escapeHtml(trans.timestamp).replace(/'/g, "\\'");
        const escapedEntityId = escapeHtml(trans.entity_id).replace(/'/g, "\\'");
        
        return `
            <tr>
                <td>${escapeHtml(trans.timestamp)}</td>
                <td>${escapeHtml(trans.transaction_date || '-')}</td>
                <td><strong>${escapeHtml(trans.entity_id)}</strong></td>
                <td>${escapeHtml(trans.entity_name)}</td>
                <td><span class="badge">${escapeHtml(trans.transaction_type)}</span></td>
                <td style="color: #16a34a;">${formatSignedNumber(debit)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-credit)}</td>
                <td>${formatNumber(trans.previous_balance || 0)}</td>
                <td>${formatNumber(trans.new_balance || 0)}</td>
                <td>${escapeHtml(paymentDisplay)}</td>
                <td>${escapeHtml(trans.document_number || '-')}</td>
                <td>${escapeHtml(statementDisplay)}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="confirmReverseLedgerTransaction('${escapedTimestamp}', '${escapedEntityId}')">${reverseBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteLedgerTransaction('${escapedTimestamp}', '${escapedEntityId}')">${deleteBtn}</button>
                </td>
            </tr>
        `;
    }).join('');
}

function restoreStockTransactionHeaders() {
    const thead = document.querySelector('#transactions-table thead tr');
    const lang = window.i18n?.currentLang() || 'en';
    
    thead.innerHTML = `
        <th>${lang === 'ar' ? 'وقت التسجيل' : 'Logged At'}</th>
        <th>${lang === 'ar' ? 'تاريخ العملية' : 'Trans. Date'}</th>
        <th data-i18n="th_item_id">${lang === 'ar' ? 'رقم الصنف' : 'Item ID'}</th>
        <th data-i18n="th_item_name">${lang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
        <th data-i18n="th_type">${lang === 'ar' ? 'النوع' : 'Type'}</th>
        <th data-i18n="th_quantity">${lang === 'ar' ? 'الكمية' : 'Quantity'}</th>
        <th data-i18n="th_prev_stock">${lang === 'ar' ? 'المخزون السابق' : 'Previous Stock'}</th>
        <th data-i18n="th_new_stock">${lang === 'ar' ? 'المخزون الجديد' : 'New Stock'}</th>
        <th data-i18n="th_supplier">${lang === 'ar' ? 'المورد' : 'Supplier'}</th>
        <th data-i18n="th_document_type">${lang === 'ar' ? 'نوع المستند' : 'Document Type'}</th>
        <th data-i18n="th_document_number">${lang === 'ar' ? 'رقم المستند' : 'Document #'}</th>
        <th data-i18n="th_notes">${lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
        <th>${lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
    `;
}

// ============================================
// Filter Functions
// ============================================
async function loadFilterOptions() {
    try {
        // Load suppliers (dynamically from data) - pass current factory
        const suppliers = await eel.get_unique_suppliers(currentFactory)();
        const supplierSelect = document.getElementById('filter-supplier');
        const allSuppliersText = window.i18n?.currentLang() === 'ar' ? 'جميع الموردين' : 'All Suppliers';
        supplierSelect.innerHTML = `<option value="">${allSuppliersText}</option>`;
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier;
            option.textContent = supplier;
            supplierSelect.appendChild(option);
        });
        
        // Note: Locations are now predefined and loaded via populateLocations()
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

function applyStockFilters() {
    stockFilters = {
        search: document.getElementById('filter-search').value.trim(),
        category: document.getElementById('filter-category').value,
        supplier: document.getElementById('filter-supplier').value,
        location: document.getElementById('filter-location').value,
        unit: document.getElementById('filter-unit').value,
        low_stock: document.getElementById('filter-low-stock').value
    };
    
    // Remove empty filters
    Object.keys(stockFilters).forEach(key => {
        if (!stockFilters[key]) delete stockFilters[key];
    });
    
    loadStockData();
}

function clearStockFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-category').selectedIndex = 0;
    document.getElementById('filter-supplier').selectedIndex = 0;
    document.getElementById('filter-location').selectedIndex = 0;
    document.getElementById('filter-unit').selectedIndex = 0;
    document.getElementById('filter-low-stock').value = '';
    stockFilters = {};
    loadStockData();
}

function applyTransactionFilters() {
    transactionFilters = {
        item_id: document.getElementById('trans-filter-id').value.trim(),
        transaction_type: document.getElementById('trans-filter-type').value,
        document_type: document.getElementById('trans-filter-doc-type').value,
        document_number: document.getElementById('trans-filter-doc-number').value.trim(),
        date_from: document.getElementById('trans-filter-from').value,
        date_to: document.getElementById('trans-filter-to').value,
        trans_date_from: document.getElementById('trans-filter-trans-date-from').value,
        trans_date_to: document.getElementById('trans-filter-trans-date-to').value
    };
    
    // Remove empty filters
    Object.keys(transactionFilters).forEach(key => {
        if (!transactionFilters[key]) delete transactionFilters[key];
    });
    
    loadTransactionData();
}

function clearTransactionFilters() {
    document.getElementById('trans-filter-id').value = '';
    document.getElementById('trans-filter-type').selectedIndex = 0;
    document.getElementById('trans-filter-doc-type').selectedIndex = 0;
    document.getElementById('trans-filter-doc-number').value = '';
    document.getElementById('trans-filter-from').value = '';
    document.getElementById('trans-filter-to').value = '';
    document.getElementById('trans-filter-trans-date-from').value = '';
    document.getElementById('trans-filter-trans-date-to').value = '';
    // Reset local-only checkbox to checked (default)
    document.getElementById('trans-filter-local-only').checked = true;
    // Clear keyword tags
    clearKeywordTags();
    transactionFilters = {};
    loadTransactionData();
}

// ============================================
// Export Functions
// ============================================

// Column definitions for export
const stockExportColumns = [
    { key: 'id', en: 'ID', ar: 'الرقم' },
    { key: 'name', en: 'Name', ar: 'الاسم' },
    { key: 'category', en: 'Category', ar: 'التصنيف' },
    { key: 'unit', en: 'Unit', ar: 'الوحدة' },
    { key: 'location', en: 'Location', ar: 'الموقع' },
    { key: 'supplier', en: 'Supplier', ar: 'المورد' },
    { key: 'starting_balance', en: 'Starting Balance', ar: 'الرصيد الافتتاحي' },
    { key: 'total_incoming', en: 'Total Incoming', ar: 'إجمالي الوارد' },
    { key: 'total_outgoing', en: 'Total Outgoing', ar: 'إجمالي الصادر' },
    { key: 'net_stock', en: 'Net Stock', ar: 'صافي المخزون' },
    { key: 'unit_price', en: 'Unit Price', ar: 'سعر الوحدة' },
    { key: 'total_price', en: 'Total Value', ar: 'القيمة الإجمالية', calculated: true },
    { key: 'min_stock', en: 'Min Stock', ar: 'الحد الأدنى' },
    { key: 'last_updated', en: 'Last Updated', ar: 'آخر تحديث' }
];

const transactionExportColumns = [
    { key: 'timestamp', en: 'Logged At', ar: 'وقت التسجيل' },
    { key: 'transaction_date', en: 'Transaction Date', ar: 'تاريخ العملية' },
    { key: 'item_id', en: 'Item ID', ar: 'رقم الصنف' },
    { key: 'item_name', en: 'Item Name', ar: 'اسم الصنف' },
    { key: 'transaction_type', en: 'Type', ar: 'النوع' },
    { key: 'quantity', en: 'Quantity', ar: 'الكمية' },
    { key: 'previous_stock', en: 'Previous Stock', ar: 'المخزون السابق' },
    { key: 'new_stock', en: 'New Stock', ar: 'المخزون الجديد' },
    { key: 'supplier', en: 'Supplier', ar: 'المورد' },
    { key: 'price', en: 'Price', ar: 'السعر' },
    { key: 'document_type', en: 'Document Type', ar: 'نوع المستند' },
    { key: 'document_number', en: 'Document Number', ar: 'رقم المستند' },
    { key: 'notes', en: 'Notes', ar: 'ملاحظات' }
];

let currentExportType = 'stock';
let selectedExportColumns = [];

function getExportColumns(type) {
    switch (type) {
        case 'stock': return stockExportColumns;
        case 'transactions': return transactionExportColumns;
        case 'customers': return customerExportColumns;
        case 'suppliers': return supplierExportColumns;
        case 'treasury': return treasuryExportColumns;
        case 'covenants': return covenantExportColumns;
        case 'advances': return advanceExportColumns;
        default: return stockExportColumns;
    }
}

function showExportModal(type) {
    currentExportType = type;
    const columns = getExportColumns(type);
    const lang = window.i18n?.currentLang() || 'ar';
    
    const listEl = document.getElementById('export-columns-list');
    listEl.innerHTML = columns.map(col => `
        <div class="checkbox-item">
            <input type="checkbox" id="export-col-${col.key}" value="${col.key}" checked>
            <label for="export-col-${col.key}">${lang === 'ar' ? col.ar : col.en}</label>
        </div>
    `).join('');
    
    document.getElementById('export-modal').classList.remove('hidden');
}

function hideExportModal() {
    document.getElementById('export-modal').classList.add('hidden');
}

function selectAllColumns() {
    document.querySelectorAll('#export-columns-list input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function deselectAllColumns() {
    document.querySelectorAll('#export-columns-list input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function getSelectedColumns() {
    const selected = [];
    document.querySelectorAll('#export-columns-list input[type="checkbox"]:checked').forEach(cb => {
        selected.push(cb.value);
    });
    return selected;
}

async function exportStock() {
    showExportModal('stock');
}

async function exportTransactions() {
    showExportModal('transactions');
}

async function performExport() {
    const lang = window.i18n?.currentLang() || 'ar';
    const selectedCols = getSelectedColumns();
    
    if (selectedCols.length === 0) {
        const msg = lang === 'ar' ? 'يرجى اختيار عمود واحد على الأقل' : 'Please select at least one column';
        showToast(msg, 'error');
        return;
    }
    
    try {
        // Determine export type and get appropriate filters based on current search/filter values
        let filters = {};
        switch (currentExportType) {
            case 'stock':
                filters = stockFilters;
                break;
            case 'transactions':
                filters = transactionFilters;
                break;
            case 'customers':
                const customerSearch = document.getElementById('customers-search')?.value || '';
                if (customerSearch) filters.search = customerSearch;
                break;
            case 'suppliers':
                const supplierSearch = document.getElementById('suppliers-search')?.value || '';
                if (supplierSearch) filters.search = supplierSearch;
                break;
            case 'treasury':
                const treasurySearch = document.getElementById('treasury-search')?.value || '';
                if (treasurySearch) filters.search = treasurySearch;
                break;
            case 'covenants':
                const covenantSearch = document.getElementById('covenants-search')?.value || '';
                if (covenantSearch) filters.search = covenantSearch;
                break;
            case 'advances':
                const advanceSearch = document.getElementById('advances-search')?.value || '';
                if (advanceSearch) filters.search = advanceSearch;
                break;
        }
        
        const result = await eel.export_filtered_csv(filters, false, currentExportType)();
        
        if (result.success) {
            // Process the data with selected columns and Arabic headers
            const columns = getExportColumns(currentExportType);
            const csvContent = generateCustomCSV(result.content, columns, selectedCols, lang);
            
            // Trigger browser download
            downloadCSV(csvContent, result.filename);
            
            // Get appropriate message
            let typeWord = '';
            switch (currentExportType) {
                case 'stock': typeWord = lang === 'ar' ? 'صنف' : 'items'; break;
                case 'transactions': typeWord = lang === 'ar' ? 'معاملة' : 'transactions'; break;
                case 'customers': typeWord = lang === 'ar' ? 'عميل' : 'customers'; break;
                case 'suppliers': typeWord = lang === 'ar' ? 'مورد' : 'suppliers'; break;
                case 'treasury': typeWord = lang === 'ar' ? 'معاملة' : 'transactions'; break;
                case 'covenants': typeWord = lang === 'ar' ? 'عهدة' : 'covenants'; break;
                case 'advances': typeWord = lang === 'ar' ? 'سلفة' : 'advances'; break;
            }
            
            const msg = lang === 'ar' 
                ? `تم تصدير ${result.count} ${typeWord}`
                : `Exported ${result.count} ${typeWord}`;
            showToast(msg, 'success');
            hideExportModal();
        }
    } catch (error) {
        console.error('Error exporting:', error);
        const msg = lang === 'ar' ? 'فشل في التصدير' : 'Failed to export';
        showToast(msg, 'error');
    }
}

function generateCustomCSV(originalContent, columnDefs, selectedCols, lang) {
    // Parse original CSV
    const lines = originalContent.split('\n');
    if (lines.length === 0) return '';
    
    const originalHeaders = lines[0].split(',');
    const headerIndexMap = {};
    originalHeaders.forEach((h, i) => headerIndexMap[h.trim()] = i);
    
    // Build new headers based on selection
    const newHeaders = [];
    const colIndices = [];
    const calculatedCols = [];
    
    selectedCols.forEach(colKey => {
        const colDef = columnDefs.find(c => c.key === colKey);
        if (colDef) {
            newHeaders.push(lang === 'ar' ? colDef.ar : colDef.en);
            if (colDef.calculated) {
                calculatedCols.push({ key: colKey, index: newHeaders.length - 1 });
                colIndices.push(null); // Placeholder for calculated column
            } else {
                colIndices.push(headerIndexMap[colKey] !== undefined ? headerIndexMap[colKey] : -1);
            }
        }
    });
    
    // For Arabic, reverse the column order so it displays correctly RTL in Excel
    const finalHeaders = lang === 'ar' ? [...newHeaders].reverse() : newHeaders;
    const finalColIndices = lang === 'ar' ? [...colIndices].reverse() : colIndices;
    const finalCalculatedCols = lang === 'ar' 
        ? calculatedCols.map(c => ({ ...c, index: newHeaders.length - 1 - c.index }))
        : calculatedCols;
    
    // Build output
    const outputLines = [finalHeaders.join(',')];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line properly (handle commas in quoted strings)
        const values = parseCSVLine(line);
        const newValues = [];
        
        finalColIndices.forEach((idx, j) => {
            if (idx === null) {
                // Calculated column - find which one
                const calcCol = finalCalculatedCols.find(c => c.index === j);
                if (calcCol && calcCol.key === 'total_price') {
                    const netStockIdx = headerIndexMap['net_stock'];
                    const priceIdx = headerIndexMap['unit_price'];
                    const netStock = parseFloat(values[netStockIdx] || 0);
                    const price = parseFloat(values[priceIdx] || 0);
                    newValues.push((netStock * price).toFixed(2));
                } else {
                    newValues.push('');
                }
            } else if (idx >= 0 && idx < values.length) {
                newValues.push(values[idx]);
            } else {
                newValues.push('');
            }
        });
        
        outputLines.push(newValues.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
    }
    
    return outputLines.join('\n');
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    
    return values;
}

// ============================================
// CSV Download Helper
// ============================================
function downloadCSV(content, filename) {
    // Add BOM for Excel UTF-8 compatibility (especially for Arabic)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
}

// ============================================
// Print Function
// ============================================
function printTable(tabId) {
    // Mark the target tab for print CSS
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('print-target');
    });
    document.getElementById(tabId).classList.add('print-target');
    
    window.print();
}

// ============================================
// Item Actions
// ============================================
async function selectItemForUpdate(itemId) {
    // Switch to add/update tab
    switchTab('add-item');
    
    // Set the item ID and trigger check
    document.getElementById('item-id').value = itemId;
    await checkItemId();
}

async function deleteItem(itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    const confirmMsg = lang === 'ar' 
        ? `هل أنت متأكد من حذف الصنف "${itemId}"؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Are you sure you want to delete item "${itemId}"? This action cannot be undone.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // Prompt for password
    const passwordPrompt = lang === 'ar' ? 'أدخل كلمة المرور للحذف:' : 'Enter deletion password:';
    const password = prompt(passwordPrompt);
    
    if (password === null) {
        return; // User cancelled
    }
    
    if (!password.trim()) {
        const msg = lang === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.delete_item(itemId, password, currentFactory)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync deletion to Firebase if enabled
            if (window.onStockItemDeleted) {
                window.onStockItemDeleted(currentFactory, itemId);
            }
            
            await loadStockData();
            await loadFilterOptions();
            await loadNotifications();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        const msg = lang === 'ar' ? 'فشل في حذف الصنف' : 'Failed to delete item';
        showToast(msg, 'error');
    }
}

// ============================================
// Dialog Helper Functions
// ============================================
function createDialog(id, options = {}) {
    // Remove existing dialog if any
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    
    // Create dialog element
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = 'app-dialog' + (options.variant ? ` dialog-${options.variant}` : '');
    
    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.close();
        }
    });
    
    // Close on Escape key
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dialog.close();
        }
    });
    
    // Cleanup on close
    dialog.addEventListener('close', () => {
        dialog.remove();
        if (options.onClose) options.onClose();
    });
    
    document.body.appendChild(dialog);
    return dialog;
}

function showDialog(dialog) {
    dialog.showModal();
}

function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog) dialog.close();
}

// Edit Item Function
async function editItem(itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        // Fetch item data
        const items = await eel.get_all_items(currentFactory)();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            const msg = lang === 'ar' ? 'الصنف غير موجود' : 'Item not found';
            showToast(msg, 'error');
            return;
        }
        
        // Create dialog
        const dialog = createDialog('editItemDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل الصنف' : 'Edit Item'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'الكود:' : 'ID:'} ${escapeHtml(itemId)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label>${lang === 'ar' ? 'كود الصنف' : 'Item ID'} <span class="field-icon">🔒</span></label>
                    <div class="field-readonly">${escapeHtml(itemId)}</div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'اسم الصنف' : 'Item Name'} <span class="required">*</span></label>
                    <input type="text" id="editItemName" value="${escapeHtml(item.name || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الفئة' : 'Category'}</label>
                        <select id="editItemCategory">
                            <option value="electronics" ${item.category === 'electronics' ? 'selected' : ''}>${lang === 'ar' ? 'إلكترونيات' : 'Electronics'}</option>
                            <option value="mechanical" ${item.category === 'mechanical' ? 'selected' : ''}>${lang === 'ar' ? 'ميكانيكي' : 'Mechanical'}</option>
                            <option value="electrical" ${item.category === 'electrical' ? 'selected' : ''}>${lang === 'ar' ? 'كهربائي' : 'Electrical'}</option>
                            <option value="consumables" ${item.category === 'consumables' ? 'selected' : ''}>${lang === 'ar' ? 'مستهلكات' : 'Consumables'}</option>
                            <option value="tools" ${item.category === 'tools' ? 'selected' : ''}>${lang === 'ar' ? 'أدوات' : 'Tools'}</option>
                            <option value="safety" ${item.category === 'safety' ? 'selected' : ''}>${lang === 'ar' ? 'سلامة' : 'Safety'}</option>
                            <option value="other" ${item.category === 'other' ? 'selected' : ''}>${lang === 'ar' ? 'أخرى' : 'Other'}</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                        <select id="editItemUnit">
                            <option value="piece" ${item.unit === 'piece' ? 'selected' : ''}>${lang === 'ar' ? 'قطعة' : 'Piece'}</option>
                            <option value="kg" ${item.unit === 'kg' ? 'selected' : ''}>${lang === 'ar' ? 'كيلوغرام' : 'Kilogram'}</option>
                            <option value="meter" ${item.unit === 'meter' ? 'selected' : ''}>${lang === 'ar' ? 'متر' : 'Meter'}</option>
                            <option value="liter" ${item.unit === 'liter' ? 'selected' : ''}>${lang === 'ar' ? 'لتر' : 'Liter'}</option>
                            <option value="box" ${item.unit === 'box' ? 'selected' : ''}>${lang === 'ar' ? 'صندوق' : 'Box'}</option>
                            <option value="set" ${item.unit === 'set' ? 'selected' : ''}>${lang === 'ar' ? 'طقم' : 'Set'}</option>
                            <option value="roll" ${item.unit === 'roll' ? 'selected' : ''}>${lang === 'ar' ? 'لفة' : 'Roll'}</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'الموقع' : 'Location'}</label>
                    <select id="editItemLocation">
                        <option value="bahbit" ${(item.location || '').split('|')[0] === 'bahbit' ? 'selected' : ''}>${lang === 'ar' ? 'بهبيط' : 'Bahbit'}</option>
                        <option value="old_factory" ${(item.location || '').split('|')[0] === 'old_factory' ? 'selected' : ''}>${lang === 'ar' ? 'المصنع القديم' : 'Old Factory'}</option>
                        <option value="station" ${(item.location || '').split('|')[0] === 'station' ? 'selected' : ''}>${lang === 'ar' ? 'المحطة' : 'Station'}</option>
                        <option value="thaabaneya" ${(item.location || '').split('|')[0] === 'thaabaneya' ? 'selected' : ''}>${lang === 'ar' ? 'الظبعانية' : 'Thaabaneya'}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'المورد' : 'Supplier'}</label>
                    <input type="text" id="editItemSupplier" value="${escapeHtml(item.supplier || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                        <input type="number" id="editItemUnitPrice" value="${parseFloat(item.unit_price || 0)}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الحد الأدنى للمخزون' : 'Minimum Stock'}</label>
                        <input type="number" id="editItemMinStock" value="${parseFloat(item.min_stock || 0)}" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'الرصيد الافتتاحي' : 'Starting Balance'}</label>
                    ${parseFloat(item.starting_balance || 0) === 0 
                        ? `<input type="number" id="editItemStartingBalance" value="${parseFloat(item.starting_balance || 0)}" step="0.01">`
                        : `<div class="field-readonly" title="${lang === 'ar' ? 'لا يمكن تعديل الرصيد الافتتاحي إلا إذا كان صفر' : 'Starting balance can only be edited if it is 0'}">${formatNumber(item.starting_balance || 0)} <span class="field-icon">🔒</span></div>
                           <input type="hidden" id="editItemStartingBalance" value="${parseFloat(item.starting_balance || 0)}">`
                    }
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditItem">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditItem">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        // Add event listeners
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditItem').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditItem').addEventListener('click', () => saveItemEdit(itemId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading item for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات الصنف' : 'Failed to load item data';
        showToast(msg, 'error');
    }
}

function closeEditItemModal() {
    closeDialog('editItemDialog');
}

async function saveItemEdit(itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const name = document.getElementById('editItemName').value.trim();
    const category = document.getElementById('editItemCategory').value;
    const unit = document.getElementById('editItemUnit').value;
    const location = document.getElementById('editItemLocation').value;
    const supplier = document.getElementById('editItemSupplier').value.trim();
    const unit_price = parseFloat(document.getElementById('editItemUnitPrice').value) || 0;
    const min_stock = parseFloat(document.getElementById('editItemMinStock').value) || 0;
    const starting_balance = document.getElementById('editItemStartingBalance').value.trim();
    
    if (!name) {
        const msg = lang === 'ar' ? 'اسم الصنف مطلوب' : 'Item name is required';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.edit_item(itemId, name, category, unit, location, supplier, unit_price, min_stock, currentFactory, starting_balance)();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeEditItemModal();
            await loadStockData();
            await loadFilterOptions();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving item edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// ============================================
// Transaction Log Editing
// ============================================
async function openEditTransactionDialog(timestamp, itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        // Fetch the transaction data
        const filters = { factory: currentFactory };
        const transactions = await eel.get_all_transactions(filters)();
        const trans = transactions.find(t => t.timestamp === timestamp && t.item_id === itemId);
        
        if (!trans) {
            const msg = lang === 'ar' ? 'المعاملة غير موجودة' : 'Transaction not found';
            showToast(msg, 'error');
            return;
        }
        
        // Document type options
        const docTypeOptions = `
            <option value="" ${!trans.document_type ? 'selected' : ''}>${lang === 'ar' ? '-- اختر --' : '-- Select --'}</option>
            <option value="purchase_invoice" ${trans.document_type === 'purchase_invoice' ? 'selected' : ''}>${lang === 'ar' ? 'فاتورة مشتريات' : 'Purchase Invoice'}</option>
            <option value="sales_invoice" ${trans.document_type === 'sales_invoice' ? 'selected' : ''}>${lang === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice'}</option>
            <option value="raw_materials_order" ${trans.document_type === 'raw_materials_order' ? 'selected' : ''}>${lang === 'ar' ? 'اذن صرف - خامات' : 'Raw Materials Disbursement'}</option>
            <option value="finished_product_receipt" ${trans.document_type === 'finished_product_receipt' ? 'selected' : ''}>${lang === 'ar' ? 'اذن استلام - منتج تام' : 'Finished Product Receipt'}</option>
        `;
        
        // Transaction type options
        const transTypeOptions = `
            <option value="INCOMING" ${trans.transaction_type === 'INCOMING' || trans.transaction_type === 'وارد' ? 'selected' : ''}>${lang === 'ar' ? 'وارد' : 'INCOMING'}</option>
            <option value="OUTGOING" ${trans.transaction_type === 'OUTGOING' || trans.transaction_type === 'صادر' ? 'selected' : ''}>${lang === 'ar' ? 'صادر' : 'OUTGOING'}</option>
        `;
        
        // Clean up notes for display (remove factory markers)
        let notesValue = trans.notes || '';
        const factoryMarkerMatch = notesValue.match(/\s*\[FROM:[^\]]+\]/);
        const factoryMarker = factoryMarkerMatch ? factoryMarkerMatch[0] : '';
        notesValue = notesValue.replace(/\s*\[FROM:[^\]]+\]/g, '');
        
        // Create dialog
        const dialog = createDialog('editTransactionDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل المعاملة' : 'Edit Transaction'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'الصنف:' : 'Item:'} ${escapeHtml(trans.item_name)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</label>
                        <div class="field-readonly">
                            <span class="field-icon">🔒</span>
                            <span>${escapeHtml(trans.timestamp)}</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'كود الصنف' : 'Item ID'}</label>
                        <div class="field-readonly">
                            <span class="field-icon">🔒</span>
                            <span>${escapeHtml(trans.item_id)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'نوع المعاملة' : 'Transaction Type'}</label>
                        <select id="editTransType">
                            ${transTypeOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الكمية' : 'Quantity'} <span class="required">*</span></label>
                        <input type="number" id="editTransQuantity" value="${parseFloat(trans.quantity)}" step="0.01">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'المورد / خط الإنتاج' : 'Supplier / Production Line'}</label>
                    <input type="text" id="editTransSupplier" value="${escapeHtml(trans.supplier || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'السعر' : 'Price'}</label>
                        <input type="number" id="editTransPrice" value="${parseFloat(trans.price || 0)}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'نوع المستند' : 'Document Type'}</label>
                        <select id="editTransDocType">
                            ${docTypeOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                    <input type="text" id="editTransDocNumber" value="${escapeHtml(trans.document_number || '')}">
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                    <textarea id="editTransNotes" rows="2">${escapeHtml(notesValue)}</textarea>
                </div>
                <input type="hidden" id="editTransFactoryMarker" value="${escapeHtml(factoryMarker)}">
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditTrans">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditTrans">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        // Add event listeners
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditTrans').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditTrans').addEventListener('click', () => saveTransactionEdit(timestamp, itemId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading transaction for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات المعاملة' : 'Failed to load transaction data';
        showToast(msg, 'error');
    }
}

function closeEditTransactionModal() {
    closeDialog('editTransactionDialog');
}

async function saveTransactionEdit(timestamp, itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const transaction_type = document.getElementById('editTransType').value;
    const quantity = parseFloat(document.getElementById('editTransQuantity').value) || 0;
    const supplier = document.getElementById('editTransSupplier').value.trim();
    const price = parseFloat(document.getElementById('editTransPrice').value) || 0;
    const document_type = document.getElementById('editTransDocType').value;
    const document_number = document.getElementById('editTransDocNumber').value.trim();
    let notes = document.getElementById('editTransNotes').value.trim();
    const factoryMarker = document.getElementById('editTransFactoryMarker').value;
    
    // Re-append factory marker to notes if it existed
    if (factoryMarker) {
        notes = notes + factoryMarker;
    }
    
    if (quantity <= 0) {
        const msg = lang === 'ar' ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than zero';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const newData = {
            transaction_type,
            quantity,
            supplier,
            price,
            document_type,
            document_number,
            notes
        };
        
        const result = await eel.edit_transaction(timestamp, itemId, newData)();
        
        if (result.success) {
            const msg = lang === 'ar' ? 'تم تعديل المعاملة بنجاح' : 'Transaction updated successfully';
            showToast(msg, 'success');
            closeEditTransactionModal();
            await loadTransactionData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving transaction edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// ============================================
// Ledger Transaction Log Editing
// ============================================
async function openEditLedgerTransactionDialog(timestamp, entityId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        // Fetch the ledger transaction data
        const transactions = await eel.get_all_ledger_transactions({})();
        const trans = transactions.find(t => t.timestamp === timestamp && t.entity_id === entityId);
        
        if (!trans) {
            const msg = lang === 'ar' ? 'المعاملة غير موجودة' : 'Transaction not found';
            showToast(msg, 'error');
            return;
        }
        
        // Payment method options
        const paymentOptions = `
            <option value="" ${!trans.payment_method ? 'selected' : ''}>${lang === 'ar' ? '-- اختر --' : '-- Select --'}</option>
            <option value="cash" ${trans.payment_method === 'cash' ? 'selected' : ''}>${lang === 'ar' ? 'نقداً' : 'Cash'}</option>
            <option value="bank_transfer" ${trans.payment_method === 'bank_transfer' ? 'selected' : ''}>${lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
            <option value="digital_wallet" ${trans.payment_method === 'digital_wallet' ? 'selected' : ''}>${lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet'}</option>
            <option value="check" ${trans.payment_method === 'check' ? 'selected' : ''}>${lang === 'ar' ? 'شيك' : 'Check'}</option>
        `;
        
        // Create dialog
        const dialog = createDialog('editLedgerTransactionDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل معاملة الدفتر' : 'Edit Ledger Transaction'}</h3>
                    <div class="dialog-subtitle">${escapeHtml(trans.entity_name)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</label>
                        <div class="field-readonly">
                            <span class="field-icon">🔒</span>
                            <span>${escapeHtml(trans.timestamp)}</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الرقم' : 'ID'}</label>
                        <div class="field-readonly">
                            <span class="field-icon">🔒</span>
                            <span>${escapeHtml(trans.entity_id)}</span>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'نوع المعاملة' : 'Transaction Type'}</label>
                    <input type="text" id="editLedgerTransType" value="${escapeHtml(trans.transaction_type || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'مدين' : 'Debit'}</label>
                        <input type="number" id="editLedgerTransDebit" value="${parseFloat(trans.debit || 0)}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'دائن' : 'Credit'}</label>
                        <input type="number" id="editLedgerTransCredit" value="${parseFloat(trans.credit || 0)}" step="0.01">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <select id="editLedgerTransPayment">
                            ${paymentOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                        <input type="text" id="editLedgerTransDocNumber" value="${escapeHtml(trans.document_number || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'البيان' : 'Statement'}</label>
                    <textarea id="editLedgerTransStatement" rows="2">${escapeHtml(trans.statement || '')}</textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditLedgerTrans">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditLedgerTrans">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        // Add event listeners
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditLedgerTrans').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditLedgerTrans').addEventListener('click', () => saveLedgerTransactionEdit(timestamp, entityId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading ledger transaction for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات المعاملة' : 'Failed to load transaction data';
        showToast(msg, 'error');
    }
}

function closeEditLedgerTransactionModal() {
    closeDialog('editLedgerTransactionDialog');
}

async function saveLedgerTransactionEdit(timestamp, entityId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const transaction_type = document.getElementById('editLedgerTransType').value.trim();
    const debit = parseFloat(document.getElementById('editLedgerTransDebit').value) || 0;
    const credit = parseFloat(document.getElementById('editLedgerTransCredit').value) || 0;
    const payment_method = document.getElementById('editLedgerTransPayment').value;
    const document_number = document.getElementById('editLedgerTransDocNumber').value.trim();
    const statement = document.getElementById('editLedgerTransStatement').value.trim();
    
    try {
        const newData = {
            transaction_type,
            debit,
            credit,
            payment_method,
            document_number,
            statement
        };
        
        const result = await eel.edit_ledger_transaction(timestamp, entityId, newData)();
        
        if (result.success) {
            const msg = lang === 'ar' ? 'تم تعديل المعاملة بنجاح' : 'Transaction updated successfully';
            showToast(msg, 'success');
            closeEditLedgerTransactionModal();
            await loadTransactionData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving ledger transaction edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// ============================================
// Transaction Delete Confirmation
// ============================================
async function confirmDeleteTransaction(timestamp, itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteTransactionDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف هذه المعاملة؟' : 'Are you sure you want to delete this transaction?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'الصنف:' : 'Item:'}</strong> ${escapeHtml(itemId)}<br>
                <strong>${lang === 'ar' ? 'الوقت:' : 'Time:'}</strong> ${escapeHtml(timestamp)}
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteTrans">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteTrans">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteTrans').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteTrans').addEventListener('click', () => executeDeleteTransaction(timestamp, itemId));
    
    showDialog(dialog);
}

function closeDeleteTransactionModal() {
    closeDialog('deleteTransactionDialog');
}

async function executeDeleteTransaction(timestamp, itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const result = await eel.delete_transaction(timestamp, itemId)();
        
        if (result.success) {
            const msg = lang === 'ar' ? 'تم حذف المعاملة بنجاح' : 'Transaction deleted successfully';
            showToast(msg, 'success');
            closeDeleteTransactionModal();
            await loadTransactionData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        const msg = lang === 'ar' ? 'فشل في حذف المعاملة' : 'Failed to delete transaction';
        showToast(msg, 'error');
    }
}

// ============================================
// Transaction Reversal
// ============================================
async function confirmReverseTransaction(timestamp, itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('reverseTransactionDialog', { variant: 'warning' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد العكس' : 'Confirm Reversal'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">↩️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من عكس هذه المعاملة؟' : 'Are you sure you want to reverse this transaction?'}
            </div>
            <div class="delete-details" style="color: #b45309;">
                ${lang === 'ar' ? 'سيتم إنشاء معاملة معاكسة لإلغاء المعاملة الأصلية.' : 'This will create an opposite transaction to negate the original.'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'الصنف:' : 'Item:'}</strong> ${escapeHtml(itemId)}<br>
                <strong>${lang === 'ar' ? 'الوقت:' : 'Time:'}</strong> ${escapeHtml(timestamp)}
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelReverseTrans">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-warning" type="button" id="confirmReverseTrans">${lang === 'ar' ? 'عكس المعاملة' : 'Reverse Transaction'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelReverseTrans').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmReverseTrans').addEventListener('click', () => executeReverseTransaction(timestamp, itemId));
    
    showDialog(dialog);
}

function closeReverseTransactionModal() {
    closeDialog('reverseTransactionDialog');
}

async function executeReverseTransaction(timestamp, itemId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const result = await eel.reverse_transaction(timestamp, itemId, currentFactory)();
        
        if (result.success) {
            const msg = lang === 'ar' ? 'تم عكس المعاملة بنجاح' : 'Transaction reversed successfully';
            showToast(msg, 'success');
            closeReverseTransactionModal();
            await loadTransactionData();
            // Also refresh stock data in case user goes back to stock view
            await loadData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error reversing transaction:', error);
        const msg = lang === 'ar' ? 'فشل في عكس المعاملة' : 'Failed to reverse transaction';
        showToast(msg, 'error');
    }
}

// ============================================
// Ledger Transaction Reversal
// ============================================
async function confirmReverseLedgerTransaction(timestamp, entityId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('reverseLedgerTransactionDialog', { variant: 'warning' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد العكس' : 'Confirm Reversal'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">↩️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من عكس هذه المعاملة؟' : 'Are you sure you want to reverse this transaction?'}
            </div>
            <div class="delete-details" style="color: #b45309;">
                ${lang === 'ar' ? 'سيتم إنشاء معاملة معاكسة لإلغاء المعاملة الأصلية.' : 'This will create an opposite transaction to negate the original.'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'الرقم:' : 'ID:'}</strong> ${escapeHtml(entityId)}<br>
                <strong>${lang === 'ar' ? 'الوقت:' : 'Time:'}</strong> ${escapeHtml(timestamp)}
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelReverseLedgerTrans">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-warning" type="button" id="confirmReverseLedgerTrans">${lang === 'ar' ? 'عكس المعاملة' : 'Reverse Transaction'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelReverseLedgerTrans').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmReverseLedgerTrans').addEventListener('click', () => executeReverseLedgerTransaction(timestamp, entityId));
    
    showDialog(dialog);
}

function closeReverseLedgerTransactionModal() {
    closeDialog('reverseLedgerTransactionDialog');
}

async function executeReverseLedgerTransaction(timestamp, entityId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const result = await eel.reverse_ledger_transaction(timestamp, entityId)();
        
        if (result.success) {
            const msg = lang === 'ar' ? 'تم عكس المعاملة بنجاح' : 'Transaction reversed successfully';
            showToast(msg, 'success');
            closeReverseLedgerTransactionModal();
            await loadTransactionData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error reversing ledger transaction:', error);
        const msg = lang === 'ar' ? 'فشل في عكس المعاملة' : 'Failed to reverse transaction';
        showToast(msg, 'error');
    }
}

async function confirmDeleteLedgerTransaction(timestamp, entityId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteLedgerTransactionDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف هذه المعاملة؟' : 'Are you sure you want to delete this ledger transaction?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'الرقم:' : 'ID:'}</strong> ${escapeHtml(entityId)}<br>
                <strong>${lang === 'ar' ? 'الوقت:' : 'Time:'}</strong> ${escapeHtml(timestamp)}
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteLedgerTrans">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteLedgerTrans">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteLedgerTrans').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteLedgerTrans').addEventListener('click', () => executeDeleteLedgerTransaction(timestamp, entityId));
    
    showDialog(dialog);
}

function closeDeleteLedgerTransactionModal() {
    closeDialog('deleteLedgerTransactionDialog');
}

async function executeDeleteLedgerTransaction(timestamp, entityId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const result = await eel.delete_ledger_transaction(timestamp, entityId)();
        
        if (result.success) {
            const msg = lang === 'ar' ? 'تم حذف المعاملة بنجاح' : 'Transaction deleted successfully';
            showToast(msg, 'success');
            closeDeleteLedgerTransactionModal();
            await loadTransactionData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting ledger transaction:', error);
        const msg = lang === 'ar' ? 'فشل في حذف المعاملة' : 'Failed to delete transaction';
        showToast(msg, 'error');
    }
}

// ============================================
// Ledger Entity Delete Functions
// ============================================
async function confirmDeleteCustomer(customerId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteCustomerDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this customer?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'العميل:' : 'Customer:'}</strong> ${escapeHtml(customerId)}
            </div>
            <div class="form-group password-group">
                <label>${lang === 'ar' ? 'كلمة المرور للحذف' : 'Delete Password'} <span class="required">*</span></label>
                <input type="password" id="deleteCustomerPassword" class="input-field" placeholder="${lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}">
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteCustomer">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteCustomer">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteCustomer').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteCustomer').addEventListener('click', async () => {
        const password = dialog.querySelector('#deleteCustomerPassword').value;
        if (password !== DELETE_PASSWORD) {
            showToast(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password', 'error');
            return;
        }
        try {
            const result = await eel.delete_customer(customerId)();
            if (result.success) {
                showToast(result.message, 'success');
                dialog.close();
                await loadCustomersData();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            const msg = lang === 'ar' ? 'فشل في حذف العميل' : 'Failed to delete customer';
            showToast(msg, 'error');
        }
    });
    
    showDialog(dialog);
}

async function confirmDeleteSupplier(supplierId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteSupplierDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this supplier?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'المورد:' : 'Supplier:'}</strong> ${escapeHtml(supplierId)}
            </div>
            <div class="form-group password-group">
                <label>${lang === 'ar' ? 'كلمة المرور للحذف' : 'Delete Password'} <span class="required">*</span></label>
                <input type="password" id="deleteSupplierPassword" class="input-field" placeholder="${lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}">
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteSupplier">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteSupplier">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteSupplier').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteSupplier').addEventListener('click', async () => {
        const password = dialog.querySelector('#deleteSupplierPassword').value;
        if (password !== DELETE_PASSWORD) {
            showToast(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password', 'error');
            return;
        }
        try {
            const result = await eel.delete_supplier(supplierId)();
            if (result.success) {
                showToast(result.message, 'success');
                dialog.close();
                await loadSuppliersData();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting supplier:', error);
            const msg = lang === 'ar' ? 'فشل في حذف المورد' : 'Failed to delete supplier';
            showToast(msg, 'error');
        }
    });
    
    showDialog(dialog);
}

async function confirmDeleteTreasury(accountNumber) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteTreasuryDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف حساب الخزينة هذا؟' : 'Are you sure you want to delete this treasury account?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'رقم الحساب:' : 'Account:'}</strong> ${escapeHtml(accountNumber)}
            </div>
            <div class="form-group password-group">
                <label>${lang === 'ar' ? 'كلمة المرور للحذف' : 'Delete Password'} <span class="required">*</span></label>
                <input type="password" id="deleteTreasuryPassword" class="input-field" placeholder="${lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}">
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteTreasury">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteTreasury">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteTreasury').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteTreasury').addEventListener('click', async () => {
        const password = dialog.querySelector('#deleteTreasuryPassword').value;
        if (password !== DELETE_PASSWORD) {
            showToast(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password', 'error');
            return;
        }
        try {
            const result = await eel.delete_treasury(accountNumber)();
            if (result.success) {
                showToast(result.message, 'success');
                dialog.close();
                await loadTreasuryData();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting treasury account:', error);
            const msg = lang === 'ar' ? 'فشل في حذف حساب الخزينة' : 'Failed to delete treasury account';
            showToast(msg, 'error');
        }
    });
    
    showDialog(dialog);
}

async function confirmDeleteCovenant(covenantId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteCovenantDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف هذه العهدة؟' : 'Are you sure you want to delete this covenant?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'العهدة:' : 'Covenant:'}</strong> ${escapeHtml(covenantId)}
            </div>
            <div class="form-group password-group">
                <label>${lang === 'ar' ? 'كلمة المرور للحذف' : 'Delete Password'} <span class="required">*</span></label>
                <input type="password" id="deleteCovenantPassword" class="input-field" placeholder="${lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}">
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteCovenant">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteCovenant">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteCovenant').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteCovenant').addEventListener('click', async () => {
        const password = dialog.querySelector('#deleteCovenantPassword').value;
        if (password !== DELETE_PASSWORD) {
            showToast(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password', 'error');
            return;
        }
        try {
            const result = await eel.delete_covenant(covenantId)();
            if (result.success) {
                showToast(result.message, 'success');
                dialog.close();
                await loadCovenantsData();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting covenant:', error);
            const msg = lang === 'ar' ? 'فشل في حذف العهدة' : 'Failed to delete covenant';
            showToast(msg, 'error');
        }
    });
    
    showDialog(dialog);
}

async function confirmDeleteAdvance(advanceId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const dialog = createDialog('deleteAdvanceDialog', { variant: 'delete' });
    
    dialog.innerHTML = `
        <div class="dialog-header">
            <h3>${lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
            <button class="dialog-close" type="button">&times;</button>
        </div>
        <div class="dialog-body">
            <div class="delete-icon">🗑️</div>
            <div class="delete-message">
                ${lang === 'ar' ? 'هل أنت متأكد من حذف هذه السلفة؟' : 'Are you sure you want to delete this advance?'}
            </div>
            <div class="delete-details">
                <strong>${lang === 'ar' ? 'السلفة:' : 'Advance:'}</strong> ${escapeHtml(advanceId)}
            </div>
            <div class="form-group password-group">
                <label>${lang === 'ar' ? 'كلمة المرور للحذف' : 'Delete Password'} <span class="required">*</span></label>
                <input type="password" id="deleteAdvancePassword" class="input-field" placeholder="${lang === 'ar' ? 'أدخل كلمة المرور...' : 'Enter password...'}">
            </div>
        </div>
        <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" id="cancelDeleteAdvance">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
            <button class="btn btn-danger" type="button" id="confirmDeleteAdvance">${lang === 'ar' ? 'حذف' : 'Delete'}</button>
        </div>
    `;
    
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.querySelector('#cancelDeleteAdvance').addEventListener('click', () => dialog.close());
    dialog.querySelector('#confirmDeleteAdvance').addEventListener('click', async () => {
        const password = dialog.querySelector('#deleteAdvancePassword').value;
        if (password !== DELETE_PASSWORD) {
            showToast(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password', 'error');
            return;
        }
        try {
            const result = await eel.delete_advance(advanceId)();
            if (result.success) {
                showToast(result.message, 'success');
                dialog.close();
                await loadAdvancesData();
            } else {
                showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting advance:', error);
            const msg = lang === 'ar' ? 'فشل في حذف السلفة' : 'Failed to delete advance';
            showToast(msg, 'error');
        }
    });
    
    showDialog(dialog);
}

// ============================================
// Low Stock Notifications
// ============================================
async function loadNotifications() {
    try {
        // Pass current factory to filter notifications
        const notifications = await eel.get_low_stock_notifications(currentFactory)();
        const bell = document.getElementById('notification-bell');
        const bellTrigger = document.getElementById('bell-trigger');
        const countBadge = document.getElementById('notification-count');
        const list = document.getElementById('notifications-list');
        const lang = window.i18n?.currentLang() || 'en';
        
        if (notifications.length === 0) {
            bell.classList.add('hidden');
            bellTrigger.classList.remove('has-notifications');
            return;
        }
        
        // Update count badge
        countBadge.textContent = notifications.length > 99 ? '99+' : notifications.length;
        bellTrigger.classList.add('has-notifications');
        
        const currentLabel = lang === 'ar' ? 'الحالي:' : 'Current:';
        const minLabel = lang === 'ar' ? 'الأدنى:' : 'Min:';
        const shortageLabel = lang === 'ar' ? 'النقص:' : 'Shortage:';
        const belowMinMsg = lang === 'ar' ? 'أقل من الحد الأدنى' : 'below minimum';
        
        list.innerHTML = notifications.map(item => {
            const unitDisplay = window.i18n ? window.i18n.getUnitTranslation(item.unit) : item.unit;
            return `
                <li class="notification-item" onclick="selectItemForUpdate('${escapeHtml(item.id)}'); closeNotificationsDropdown();">
                    <span class="notification-icon">⚠️</span>
                    <div class="notification-content">
                        <strong>${escapeHtml(item.name)} (${escapeHtml(item.id)})</strong>
                        <div class="notification-details">
                            ${currentLabel} ${formatNumber(item.net_stock)} ${unitDisplay}<br>
                            ${minLabel} ${formatNumber(item.min_stock)} ${unitDisplay}<br>
                            ${shortageLabel} <span style="color: #dc2626; font-weight: 600;">${formatNumber(item.shortage)} ${unitDisplay}</span>
                        </div>
                    </div>
                </li>
            `;
        }).join('');
        
        bell.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function toggleNotificationsDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.remove('hidden');
    dropdown.classList.toggle('show');
}

function closeNotificationsDropdown() {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.remove('show');
}

function dismissNotifications() {
    document.getElementById('notification-bell').classList.add('hidden');
    closeNotificationsDropdown();
}

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// ============================================
// CUSTOMERS MODULE
// ============================================
let currentCustomer = null;

async function generateCustomerId() {
    try {
        const newId = await eel.generate_next_customer_id()();
        document.getElementById('customer-id').value = newId;
        hideCustomerStatus();
        showCustomerForm(false);
    } catch (error) {
        console.error('Error generating customer ID:', error);
    }
}

async function checkCustomerId() {
    const customerId = document.getElementById('customer-id').value.trim();
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!customerId) {
        const msg = lang === 'ar' ? 'يرجى إدخال رقم العميل' : 'Please enter a Customer ID';
        showCustomerStatus(msg, 'warning');
        hideCustomerForm();
        return;
    }

    try {
        const result = await eel.check_customer_exists(customerId)();
        
        if (result.exists) {
            currentCustomer = result.item;
            const msg = lang === 'ar' 
                ? `العميل "${result.item.name}" موجود. يمكنك إضافة معاملة جديدة.`
                : `Customer "${result.item.name}" found. You can add a new transaction.`;
            showCustomerStatus(msg, 'info');
            showCustomerForm(true, result.item);
        } else {
            currentCustomer = null;
            const msg = lang === 'ar' ? 'عميل جديد! املأ التفاصيل أدناه لإضافته.' : 'New customer! Fill in the details below to add it.';
            showCustomerStatus(msg, 'success');
            showCustomerForm(false);
        }
    } catch (error) {
        console.error('Error checking customer ID:', error);
        const msg = lang === 'ar' ? 'خطأ في التحقق من رقم العميل' : 'Error checking customer ID';
        showCustomerStatus(msg, 'error');
    }
}

function showCustomerStatus(message, type) {
    const status = document.getElementById('customer-id-status');
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.classList.remove('hidden');
}

function hideCustomerStatus() {
    document.getElementById('customer-id-status').classList.add('hidden');
}

function showCustomerForm(isExisting, customer = null) {
    const form = document.getElementById('customer-form');
    const lang = window.i18n?.currentLang() || 'en';
    form.classList.remove('hidden');
    
    if (isExisting && customer) {
        document.getElementById('customer-form-title').textContent = lang === 'ar' ? '📊 تحديث العميل' : '📊 Update Customer';
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-phone').disabled = true;
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-email').disabled = true;
        document.getElementById('customer-opening-balance').value = customer.opening_balance || '';
        // Opening balance is editable only if it's currently 0
        const currentOpeningBalance = parseFloat(customer.opening_balance || 0);
        document.getElementById('customer-opening-balance').disabled = currentOpeningBalance !== 0;
        document.getElementById('customer-debit').value = '';
        document.getElementById('customer-credit').value = '';
    } else {
        document.getElementById('customer-form-title').textContent = lang === 'ar' ? '➕ تفاصيل عميل جديد' : '➕ New Customer Details';
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-phone').value = '';
        document.getElementById('customer-phone').disabled = false;
        document.getElementById('customer-email').value = '';
        document.getElementById('customer-email').disabled = false;
        document.getElementById('customer-opening-balance').value = '';
        document.getElementById('customer-opening-balance').disabled = false;
        document.getElementById('customer-debit').value = '';
        document.getElementById('customer-credit').value = '';
    }
    
    document.getElementById('customer-reg-date').value = '';
    document.getElementById('customer-doc-number').value = '';
    document.getElementById('customer-payment-method').selectedIndex = 0;
    document.getElementById('customer-statement').value = '';
}

function hideCustomerForm() {
    document.getElementById('customer-form').classList.add('hidden');
}

async function saveCustomer() {
    const customerId = document.getElementById('customer-id').value.trim();
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const regDate = document.getElementById('customer-reg-date').value;
    const docNumber = document.getElementById('customer-doc-number').value.trim();
    const openingBalance = document.getElementById('customer-opening-balance').value;
    const debit = document.getElementById('customer-debit').value;
    const credit = document.getElementById('customer-credit').value;
    const paymentMethod = document.getElementById('customer-payment-method').value;
    const statement = document.getElementById('customer-statement').value.trim();
    const lang = window.i18n?.currentLang() || 'en';

    if (!customerId || !name) {
        const msg = lang === 'ar' ? 'يرجى ملء رقم العميل والاسم' : 'Please fill in Customer ID and Name';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.add_or_update_customer(customerId, name, phone, email, regDate, docNumber, openingBalance, debit, credit, paymentMethod, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync to Firebase if enabled
            if (window.onLedgerEntityUpdated) {
                window.onLedgerEntityUpdated('customers', {
                    id: customerId,
                    name: name,
                    phone: phone,
                    email: email,
                    opening_balance: parseFloat(openingBalance || 0),
                    debit: parseFloat(debit || 0),
                    credit: parseFloat(credit || 0),
                    payment_method: paymentMethod,
                    statement: statement
                });
            }
            
            await generateCustomerId();
            hideCustomerForm();
            hideCustomerStatus();
            await loadCustomersData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving customer:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ العميل' : 'Failed to save customer';
        showToast(msg, 'error');
    }
}

async function loadCustomersData() {
    try {
        const search = document.getElementById('customers-search')?.value || '';
        const searchLower = search.toLowerCase().trim();

        const allItems = await eel.get_all_customers({})();
        let items = allItems;
        let transactionMatchedIds = new Set();
        let countByEntityId = new Map();
        const entityMatchedIds = new Set();

        if (searchLower) {
            const transMatches = await getModuleTransactionMatches('customer', searchLower);
            transactionMatchedIds = transMatches.matchedIds;
            countByEntityId = transMatches.countByEntityId;

            items = allItems.filter(item => {
                const idMatch = (item.id || '').toLowerCase().includes(searchLower);
                const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
                if (idMatch || nameMatch) entityMatchedIds.add(normalizeEntityId(item.id));
                return idMatch || nameMatch || transactionMatchedIds.has(normalizeEntityId(item.id));
            });
        }

        renderCustomersTable(items);
        if (searchLower) markTransactionMatchedRows('customer', transactionMatchedIds, entityMatchedIds, countByEntityId);
        const lang = window.i18n?.currentLang() || 'en';
        const itemWord = lang === 'ar' ? 'عميل' : (items.length !== 1 ? 'customers' : 'customer');
        const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
        document.getElementById('customers-count').textContent = `${showingWord} ${items.length} ${itemWord}`;
        
        // Load customers total balance
        await loadCustomersTotalBalance();
    } catch (error) {
        console.error('Error loading customers data:', error);
        showToast('Failed to load customers data', 'error');
    }
}

async function loadCustomersTotalBalance() {
    try {
        const data = await eel.get_customers_total_balance()();
        document.getElementById('customers-total-balance').textContent = formatNumber(data.total_balance || 0);
        document.getElementById('customers-total-opening').textContent = formatNumber(data.total_opening_balance || 0);
        document.getElementById('customers-total-debit').textContent = formatNumber(data.total_debit || 0);
        document.getElementById('customers-total-credit').textContent = formatNumber(data.total_credit || 0);
        document.getElementById('customers-balance-count').textContent = data.count || 0;
    } catch (error) {
        console.error('Error loading customers total balance:', error);
    }
}

function renderCustomersTable(items) {
    const tbody = document.getElementById('customers-table-body');
    const lang = window.i18n?.currentLang() || 'en';
    const noItemsMsg = lang === 'ar' ? 'لا يوجد عملاء. أضف أول عميل!' : 'No customers found. Add your first customer!';
    const updateBtn = lang === 'ar' ? 'تحديث' : 'Update';
    const editBtn = lang === 'ar' ? 'تعديل' : 'Edit';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    
    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="13">${noItemsMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const balance = parseFloat(item.balance || 0);
        const balanceClass = balance < 0 ? 'stock-low' : 'stock-good';
        const paymentDisplay = paymentTranslations[item.payment_method] || item.payment_method || '-';
        const escapedId = escapeHtml(item.id).replace(/'/g, "\\'");
        
        return `
            <tr data-entity-id="${escapeHtml(item.id)}">
                <td>
                    <span class="expand-arrow" onclick="toggleEntityHistory('${escapedId}', 'customer')" title="${lang === 'ar' ? 'إظهار السجل' : 'Show history'}">▶</span>
                    <strong>${escapeHtml(item.id)}</strong>
                </td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.phone || '-')}</td>
                <td>${escapeHtml(item.email || '-')}</td>
                <td>${escapeHtml(item.registration_date || '-')}</td>
                <td>${escapeHtml(item.document_number || '-')}</td>
                <td>${formatNumber(item.opening_balance || 0)}</td>
                <td style="color: #16a34a;">${formatSignedNumber(item.debit || 0)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-(item.credit || 0))}</td>
                <td class="${balanceClass}">${formatNumber(balance)}</td>
                <td>${escapeHtml(paymentDisplay)}</td>
                <td>${escapeHtml(item.statement || '-')}</td>
                <td class="no-print">
                    <button class="btn btn-small btn-outline" onclick="selectCustomerForUpdate('${escapedId}')">${updateBtn}</button>
                    <button class="btn btn-small btn-secondary" onclick="editCustomer('${escapedId}')">${editBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteCustomer('${escapedId}')">${deleteBtn}</button>
                </td>
            </tr>
            <tr class="item-history-row hidden" id="history-row-${escapeHtml(item.id)}">
                <td colspan="13" class="history-cell">
                    <div class="history-container">
                        <div class="history-header">
                            <h4>${lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h4>
                            <input type="text" class="history-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" 
                                   onkeyup="filterEntityHistory('${escapeHtml(item.id)}', this.value)">
                        </div>
                        <div class="history-content" id="history-content-${escapeHtml(item.id)}">
                            <div class="loading">${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function selectCustomerForUpdate(customerId) {
    document.getElementById('customer-id').value = customerId;
    await checkCustomerId();
}

// ============================================
// SUPPLIERS LEDGER MODULE
// ============================================
let currentSupplierLedger = null;

async function generateSupplierId() {
    try {
        const newId = await eel.generate_next_supplier_id()();
        document.getElementById('supplier-id').value = newId;
        hideSupplierStatus();
        showSupplierForm(false);
    } catch (error) {
        console.error('Error generating supplier ID:', error);
    }
}

async function checkSupplierId() {
    const supplierId = document.getElementById('supplier-id').value.trim();
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!supplierId) {
        const msg = lang === 'ar' ? 'يرجى إدخال رقم المورد' : 'Please enter a Supplier ID';
        showSupplierStatus(msg, 'warning');
        hideSupplierForm();
        return;
    }

    try {
        const result = await eel.check_supplier_exists(supplierId)();
        
        if (result.exists) {
            currentSupplierLedger = result.item;
            const msg = lang === 'ar' 
                ? `المورد "${result.item.name}" موجود. يمكنك إضافة معاملة جديدة.`
                : `Supplier "${result.item.name}" found. You can add a new transaction.`;
            showSupplierStatus(msg, 'info');
            showSupplierForm(true, result.item);
        } else {
            currentSupplierLedger = null;
            const msg = lang === 'ar' ? 'مورد جديد! املأ التفاصيل أدناه لإضافته.' : 'New supplier! Fill in the details below to add it.';
            showSupplierStatus(msg, 'success');
            showSupplierForm(false);
        }
    } catch (error) {
        console.error('Error checking supplier ID:', error);
        const msg = lang === 'ar' ? 'خطأ في التحقق من رقم المورد' : 'Error checking supplier ID';
        showSupplierStatus(msg, 'error');
    }
}

function showSupplierStatus(message, type) {
    const status = document.getElementById('supplier-id-status');
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.classList.remove('hidden');
}

function hideSupplierStatus() {
    document.getElementById('supplier-id-status').classList.add('hidden');
}

function showSupplierForm(isExisting, supplier = null) {
    const form = document.getElementById('supplier-form');
    const lang = window.i18n?.currentLang() || 'en';
    form.classList.remove('hidden');
    
    if (isExisting && supplier) {
        document.getElementById('supplier-form-title').textContent = lang === 'ar' ? '📊 تحديث المورد' : '📊 Update Supplier';
        document.getElementById('supplier-name').value = supplier.name;
        document.getElementById('supplier-phone').value = supplier.phone || '';
        document.getElementById('supplier-phone').disabled = true;
        document.getElementById('supplier-email').value = supplier.email || '';
        document.getElementById('supplier-email').disabled = true;
        document.getElementById('supplier-opening-balance').value = supplier.opening_balance || '';
        // Opening balance is editable only if it's currently 0
        const currentOpeningBalance = parseFloat(supplier.opening_balance || 0);
        document.getElementById('supplier-opening-balance').disabled = currentOpeningBalance !== 0;
        document.getElementById('supplier-debit').value = '';
        document.getElementById('supplier-credit').value = '';
    } else {
        document.getElementById('supplier-form-title').textContent = lang === 'ar' ? '➕ تفاصيل مورد جديد' : '➕ New Supplier Details';
        document.getElementById('supplier-name').value = '';
        document.getElementById('supplier-phone').value = '';
        document.getElementById('supplier-phone').disabled = false;
        document.getElementById('supplier-email').value = '';
        document.getElementById('supplier-email').disabled = false;
        document.getElementById('supplier-opening-balance').value = '';
        document.getElementById('supplier-opening-balance').disabled = false;
        document.getElementById('supplier-debit').value = '';
        document.getElementById('supplier-credit').value = '';
    }
    
    document.getElementById('supplier-reg-date').value = '';
    document.getElementById('supplier-doc-number').value = '';
    document.getElementById('supplier-payment-method').selectedIndex = 0;
    document.getElementById('supplier-statement').value = '';
}

function hideSupplierForm() {
    document.getElementById('supplier-form').classList.add('hidden');
}

async function saveSupplier() {
    const supplierId = document.getElementById('supplier-id').value.trim();
    const name = document.getElementById('supplier-name').value.trim();
    const phone = document.getElementById('supplier-phone').value.trim();
    const email = document.getElementById('supplier-email').value.trim();
    const regDate = document.getElementById('supplier-reg-date').value;
    const docNumber = document.getElementById('supplier-doc-number').value.trim();
    const openingBalance = document.getElementById('supplier-opening-balance').value;
    const debit = document.getElementById('supplier-debit').value;
    const credit = document.getElementById('supplier-credit').value;
    const paymentMethod = document.getElementById('supplier-payment-method').value;
    const statement = document.getElementById('supplier-statement').value.trim();
    const lang = window.i18n?.currentLang() || 'en';

    if (!supplierId || !name) {
        const msg = lang === 'ar' ? 'يرجى ملء رقم المورد والاسم' : 'Please fill in Supplier ID and Name';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.add_or_update_supplier(supplierId, name, phone, email, regDate, docNumber, openingBalance, debit, credit, paymentMethod, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync to Firebase if enabled
            if (window.onLedgerEntityUpdated) {
                window.onLedgerEntityUpdated('suppliers', {
                    id: supplierId,
                    name: name,
                    phone: phone,
                    email: email,
                    opening_balance: parseFloat(openingBalance || 0),
                    debit: parseFloat(debit || 0),
                    credit: parseFloat(credit || 0),
                    payment_method: paymentMethod,
                    statement: statement
                });
            }
            
            await generateSupplierId();
            hideSupplierForm();
            hideSupplierStatus();
            await loadSuppliersData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving supplier:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ المورد' : 'Failed to save supplier';
        showToast(msg, 'error');
    }
}

async function loadSuppliersData() {
    try {
        const search = document.getElementById('suppliers-search')?.value || '';
        const searchLower = search.toLowerCase().trim();

        const allItems = await eel.get_all_suppliers({})();
        let items = allItems;
        let transactionMatchedIds = new Set();
        let countByEntityId = new Map();
        const entityMatchedIds = new Set();

        if (searchLower) {
            const transMatches = await getModuleTransactionMatches('supplier', searchLower);
            transactionMatchedIds = transMatches.matchedIds;
            countByEntityId = transMatches.countByEntityId;

            items = allItems.filter(item => {
                const idMatch = (item.id || '').toLowerCase().includes(searchLower);
                const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
                if (idMatch || nameMatch) entityMatchedIds.add(normalizeEntityId(item.id));
                return idMatch || nameMatch || transactionMatchedIds.has(normalizeEntityId(item.id));
            });
        }

        renderSuppliersTable(items);
        if (searchLower) markTransactionMatchedRows('supplier', transactionMatchedIds, entityMatchedIds, countByEntityId);
        const lang = window.i18n?.currentLang() || 'en';
        const itemWord = lang === 'ar' ? 'مورد' : (items.length !== 1 ? 'suppliers' : 'supplier');
        const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
        document.getElementById('suppliers-count').textContent = `${showingWord} ${items.length} ${itemWord}`;
        
        // Load suppliers total balance
        await loadSuppliersTotalBalance();
    } catch (error) {
        console.error('Error loading suppliers data:', error);
        showToast('Failed to load suppliers data', 'error');
    }
}

async function loadSuppliersTotalBalance() {
    try {
        const data = await eel.get_suppliers_total_balance()();
        document.getElementById('suppliers-total-balance').textContent = formatNumber(data.total_balance || 0);
        document.getElementById('suppliers-total-opening').textContent = formatNumber(data.total_opening_balance || 0);
        document.getElementById('suppliers-total-debit').textContent = formatNumber(data.total_debit || 0);
        document.getElementById('suppliers-total-credit').textContent = formatNumber(data.total_credit || 0);
        document.getElementById('suppliers-balance-count').textContent = data.count || 0;
    } catch (error) {
        console.error('Error loading suppliers total balance:', error);
    }
}

function renderSuppliersTable(items) {
    const tbody = document.getElementById('suppliers-table-body');
    const lang = window.i18n?.currentLang() || 'en';
    const noItemsMsg = lang === 'ar' ? 'لا يوجد موردين. أضف أول مورد!' : 'No suppliers found. Add your first supplier!';
    const updateBtn = lang === 'ar' ? 'تحديث' : 'Update';
    const editBtn = lang === 'ar' ? 'تعديل' : 'Edit';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    
    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="13">${noItemsMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const balance = parseFloat(item.balance || 0);
        const balanceClass = balance < 0 ? 'stock-low' : 'stock-good';
        const paymentDisplay = paymentTranslations[item.payment_method] || item.payment_method || '-';
        const escapedId = escapeHtml(item.id).replace(/'/g, "\\'");
        
        return `
            <tr data-entity-id="${escapeHtml(item.id)}">
                <td>
                    <span class="expand-arrow" onclick="toggleEntityHistory('${escapedId}', 'supplier')" title="${lang === 'ar' ? 'إظهار السجل' : 'Show history'}">▶</span>
                    <strong>${escapeHtml(item.id)}</strong>
                </td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.phone || '-')}</td>
                <td>${escapeHtml(item.email || '-')}</td>
                <td>${escapeHtml(item.registration_date || '-')}</td>
                <td>${escapeHtml(item.document_number || '-')}</td>
                <td>${formatNumber(item.opening_balance || 0)}</td>
                <td style="color: #16a34a;">${formatSignedNumber(item.debit || 0)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-(item.credit || 0))}</td>
                <td class="${balanceClass}">${formatNumber(balance)}</td>
                <td>${escapeHtml(paymentDisplay)}</td>
                <td>${escapeHtml(item.statement || '-')}</td>
                <td class="no-print">
                    <button class="btn btn-small btn-outline" onclick="selectSupplierForUpdate('${escapedId}')">${updateBtn}</button>
                    <button class="btn btn-small btn-secondary" onclick="editSupplier('${escapedId}')">${editBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteSupplier('${escapedId}')">${deleteBtn}</button>
                </td>
            </tr>
            <tr class="item-history-row hidden" id="history-row-${escapeHtml(item.id)}">
                <td colspan="13" class="history-cell">
                    <div class="history-container">
                        <div class="history-header">
                            <h4>${lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h4>
                            <input type="text" class="history-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" 
                                   onkeyup="filterEntityHistory('${escapeHtml(item.id)}', this.value)">
                        </div>
                        <div class="history-content" id="history-content-${escapeHtml(item.id)}">
                            <div class="loading">${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function selectSupplierForUpdate(supplierId) {
    document.getElementById('supplier-id').value = supplierId;
    await checkSupplierId();
}

// ============================================
// TREASURY MODULE
// ============================================
let currentTreasury = null;

async function checkTreasuryAccount() {
    const accountNumber = document.getElementById('treasury-account-number').value.trim();
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!accountNumber) {
        const msg = lang === 'ar' ? 'يرجى إدخال رقم الحساب' : 'Please enter an Account Number';
        showTreasuryStatus(msg, 'warning');
        hideTreasuryForm();
        return;
    }

    try {
        const result = await eel.check_treasury_account_exists(accountNumber)();
        
        if (result.exists) {
            currentTreasury = result.item;
            const msg = lang === 'ar' 
                ? `الحساب "${result.item.account_number}" موجود. يمكنك إضافة معاملة جديدة.`
                : `Account "${result.item.account_number}" found. You can add a new transaction.`;
            showTreasuryStatus(msg, 'info');
            showTreasuryForm(true, result.item);
        } else {
            currentTreasury = null;
            const msg = lang === 'ar' ? 'حساب جديد! املأ التفاصيل أدناه لإضافته.' : 'New account! Fill in the details below to add it.';
            showTreasuryStatus(msg, 'success');
            showTreasuryForm(false);
        }
    } catch (error) {
        console.error('Error checking treasury account:', error);
        const msg = lang === 'ar' ? 'خطأ في التحقق من الحساب' : 'Error checking account';
        showTreasuryStatus(msg, 'error');
    }
}

function showTreasuryStatus(message, type) {
    const statusDiv = document.getElementById('treasury-account-status');
    statusDiv.textContent = message;
    statusDiv.className = `status-message status-${type}`;
    statusDiv.classList.remove('hidden');
}

function hideTreasuryStatus() {
    document.getElementById('treasury-account-status').classList.add('hidden');
}

function showTreasuryForm(isExisting, item = null) {
    const form = document.getElementById('treasury-form');
    const title = document.getElementById('treasury-form-title');
    const openingGroup = document.getElementById('treasury-opening-group');
    const accountNameInput = document.getElementById('treasury-account-name');
    const lang = window.i18n?.currentLang() || 'en';
    
    form.classList.remove('hidden');
    
    if (isExisting && item) {
        title.textContent = lang === 'ar' ? '📊 إضافة معاملة' : '📊 Add Transaction';
        openingGroup.classList.add('hidden');
        // Lock account name and show existing value
        accountNameInput.value = item.account_name || '';
        accountNameInput.disabled = true;
        accountNameInput.classList.add('disabled-field');
    } else {
        title.textContent = lang === 'ar' ? '➕ بيانات حساب جديد' : '➕ New Account Details';
        openingGroup.classList.remove('hidden');
        // Unlock account name for new accounts
        accountNameInput.value = '';
        accountNameInput.disabled = false;
        accountNameInput.classList.remove('disabled-field');
    }
    
    // Clear transaction fields
    document.getElementById('treasury-reg-date').value = '';
    document.getElementById('treasury-doc-number').value = '';
    document.getElementById('treasury-opening-balance').value = '';
    document.getElementById('treasury-debit').value = '';
    document.getElementById('treasury-credit').value = '';
    document.getElementById('treasury-payment-method').selectedIndex = 0;
    document.getElementById('treasury-statement').value = '';
}

function hideTreasuryForm() {
    document.getElementById('treasury-form').classList.add('hidden');
    // Reset account name field state
    const accountNameInput = document.getElementById('treasury-account-name');
    accountNameInput.disabled = false;
    accountNameInput.classList.remove('disabled-field');
    accountNameInput.value = '';
}

async function saveTreasury() {
    const accountNumber = document.getElementById('treasury-account-number').value.trim();
    const accountName = document.getElementById('treasury-account-name').value.trim();
    const regDate = document.getElementById('treasury-reg-date').value;
    const docNumber = document.getElementById('treasury-doc-number').value.trim();
    const openingBalance = document.getElementById('treasury-opening-balance').value;
    const debit = document.getElementById('treasury-debit').value;
    const credit = document.getElementById('treasury-credit').value;
    const paymentMethod = document.getElementById('treasury-payment-method').value;
    const statement = document.getElementById('treasury-statement').value.trim();
    const lang = window.i18n?.currentLang() || 'en';

    if (!accountNumber) {
        const msg = lang === 'ar' ? 'رقم الحساب مطلوب' : 'Account Number is required';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.add_or_update_treasury(accountNumber, accountName, regDate, docNumber, openingBalance, debit, credit, paymentMethod, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync to Firebase if enabled
            if (window.onLedgerEntityUpdated) {
                window.onLedgerEntityUpdated('treasury', {
                    account_number: accountNumber,
                    account_name: accountName,
                    opening_balance: parseFloat(openingBalance || 0),
                    debit: parseFloat(debit || 0),
                    credit: parseFloat(credit || 0),
                    payment_method: paymentMethod,
                    statement: statement
                });
            }
            
            // Clear form
            document.getElementById('treasury-account-number').value = '';
            document.getElementById('treasury-account-name').value = '';
            document.getElementById('treasury-reg-date').value = '';
            document.getElementById('treasury-doc-number').value = '';
            document.getElementById('treasury-opening-balance').value = '';
            document.getElementById('treasury-debit').value = '';
            document.getElementById('treasury-credit').value = '';
            document.getElementById('treasury-payment-method').selectedIndex = 0;
            document.getElementById('treasury-statement').value = '';
            hideTreasuryForm();
            hideTreasuryStatus();
            currentTreasury = null;
            await loadTreasuryTotalBalance();
            await loadTreasuryData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving treasury:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ الحساب' : 'Failed to save account';
        showToast(msg, 'error');
    }
}

async function loadTreasuryBalance() {
    await loadTreasuryTotalBalance();
}

async function loadTreasuryTotalBalance() {
    try {
        const data = await eel.get_treasury_total_balance()();
        document.getElementById('treasury-total-balance').textContent = formatNumber(data.total_balance || 0);
        document.getElementById('treasury-total-opening').textContent = formatNumber(data.total_opening_balance || 0);
        document.getElementById('treasury-total-debit').textContent = formatNumber(data.total_debit || 0);
        document.getElementById('treasury-total-credit').textContent = formatNumber(data.total_credit || 0);
        document.getElementById('treasury-balance-count').textContent = data.count || 0;
    } catch (error) {
        console.error('Error loading treasury total balance:', error);
    }
}

// Treasury Initialization Functions
async function loadTreasurySummary() {
    try {
        const summary = await eel.get_treasury_summary()();
        const lang = window.i18n?.currentLang() || 'en';
        
        const warningCard = document.getElementById('treasury-init-warning');
        const summaryCard = document.getElementById('treasury-summary-card');
        const entrySection = document.getElementById('treasury-entry-section');
        
        if (summary.initialized) {
            // Treasury is initialized - show summary card
            warningCard.classList.add('hidden');
            summaryCard.classList.remove('hidden');
            entrySection.classList.remove('hidden');
            
            // Update summary values
            const currency = summary.currency || 'EGP';
            document.getElementById('treasury-starting-capital').textContent = 
                formatNumber(summary.starting_capital || 0) + ' ' + currency;
            document.getElementById('treasury-current-position').textContent = 
                formatNumber(summary.current_position || 0) + ' ' + currency;
            document.getElementById('treasury-net-change').textContent = 
                formatNumber(summary.net_transactions || 0) + ' ' + currency;
            document.getElementById('treasury-currency').textContent = currency;
            
            // Format initialization date
            if (summary.initialization_date) {
                const initDateLabel = lang === 'ar' ? 'تاريخ التهيئة:' : 'Initialized:';
                document.getElementById('treasury-init-date').textContent = 
                    initDateLabel + ' ' + summary.initialization_date;
            }
            
            // Style the net change based on positive/negative
            const netChangeEl = document.getElementById('treasury-net-change');
            const netValue = parseFloat(summary.net_transactions || 0);
            if (netValue > 0) {
                netChangeEl.style.color = '#059669'; // Green for positive
                netChangeEl.textContent = '+' + netChangeEl.textContent;
            } else if (netValue < 0) {
                netChangeEl.style.color = '#dc2626'; // Red for negative
            } else {
                netChangeEl.style.color = '#6b7280'; // Gray for zero
            }
        } else {
            // Treasury not initialized - show warning
            warningCard.classList.remove('hidden');
            summaryCard.classList.add('hidden');
            // Still allow entry section to be visible but encourage initialization
        }
    } catch (error) {
        console.error('Error loading treasury summary:', error);
    }
}

function showTreasuryInitForm() {
    const initForm = document.getElementById('treasury-init-form');
    const warningCard = document.getElementById('treasury-init-warning');
    
    initForm.classList.remove('hidden');
    warningCard.classList.add('hidden');
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('init-fiscal-year').value = today;
}

function hideTreasuryInitForm() {
    const initForm = document.getElementById('treasury-init-form');
    const warningCard = document.getElementById('treasury-init-warning');
    
    initForm.classList.add('hidden');
    warningCard.classList.remove('hidden');
    
    // Clear form
    document.getElementById('init-starting-capital').value = '';
    document.getElementById('init-currency').value = 'EGP';
    document.getElementById('init-fiscal-year').value = '';
    document.getElementById('init-notes').value = '';
}

async function initializeTreasury() {
    const startingCapital = document.getElementById('init-starting-capital').value;
    const currency = document.getElementById('init-currency').value;
    const fiscalYearStart = document.getElementById('init-fiscal-year').value;
    const notes = document.getElementById('init-notes').value;
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!startingCapital && startingCapital !== '0') {
        const msg = lang === 'ar' ? 'رأس المال المبدئي مطلوب' : 'Starting capital is required';
        showToast(msg, 'error');
        return;
    }
    
    const capital = parseFloat(startingCapital);
    if (isNaN(capital) || capital < 0) {
        const msg = lang === 'ar' ? 'رأس المال المبدئي يجب أن يكون رقماً صحيحاً' : 'Starting capital must be a valid non-negative number';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.initialize_treasury(startingCapital, fiscalYearStart, currency, notes)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Hide init form and refresh display
            document.getElementById('treasury-init-form').classList.add('hidden');
            await loadTreasurySummary();
            await loadTreasuryTotalBalance();
            await loadTreasuryData();
            
            // Sync treasury config to Firebase if enabled
            if (window.syncTreasuryConfig) {
                const config = await eel.get_treasury_config()();
                await window.syncTreasuryConfig(config);
            }
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error initializing treasury:', error);
        const msg = lang === 'ar' ? 'فشل في تهيئة الخزينة' : 'Failed to initialize treasury';
        showToast(msg, 'error');
    }
}

async function loadTreasuryData() {
    try {
        // Gather all filter values
        const filters = {
            keywords: treasuryKeywords,
            keywordLogic: document.getElementById('treasury-keyword-logic')?.value || 'AND',
            account_number: document.getElementById('treasury-filter-account')?.value || '',
            account_name: document.getElementById('treasury-filter-name')?.value || '',
            document_number: document.getElementById('treasury-filter-doc')?.value || '',
            payment_method: document.getElementById('treasury-filter-payment')?.value || '',
            date_from: document.getElementById('treasury-filter-date-from')?.value || '',
            date_to: document.getElementById('treasury-filter-date-to')?.value || '',
            statement: document.getElementById('treasury-filter-statement')?.value || ''
        };
        
        let items = await eel.get_all_treasury(filters)();

        const transactionSearchTerms = [
            filters.account_number,
            filters.account_name,
            filters.document_number,
            filters.statement,
            ...(filters.keywords || [])
        ].map(v => (v || '').toString().trim()).filter(Boolean);

        let treasuryTransactionMatchedIds = new Set();
        let treasuryCountByEntityId = new Map();
        let treasuryEntityMatchedIds = new Set(items.map(i => normalizeEntityId(i.account_number)));

        if (transactionSearchTerms.length > 0) {
            const transMatches = await getModuleTransactionMatches('treasury', transactionSearchTerms, filters.keywordLogic || 'AND');
            treasuryTransactionMatchedIds = transMatches.matchedIds;
            treasuryCountByEntityId = transMatches.countByEntityId;
            if (treasuryTransactionMatchedIds.size > 0) {
                const allTreasuryItems = await eel.get_all_treasury({})();
                const extraItems = allTreasuryItems.filter(item => treasuryTransactionMatchedIds.has(normalizeEntityId(item.account_number)));
                items = mergeItemsByEntityId(items, extraItems, 'treasury');
            }
        }

        renderTreasuryTable(items);
        if (transactionSearchTerms.length > 0) markTransactionMatchedRows('treasury', treasuryTransactionMatchedIds, treasuryEntityMatchedIds, treasuryCountByEntityId);
        await loadTreasuryTotalBalance();
        const lang = window.i18n?.currentLang() || 'en';
        const itemWord = lang === 'ar' ? 'حساب' : (items.length !== 1 ? 'accounts' : 'account');
        const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
        document.getElementById('treasury-count').textContent = `${showingWord} ${items.length} ${itemWord}`;
    } catch (error) {
        console.error('Error loading treasury data:', error);
        showToast('Failed to load treasury data', 'error');
    }
}

// Treasury keyword tag handling
function handleTreasuryKeywordInput(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const input = e.target;
        const keyword = input.value.trim();
        
        if (keyword && !treasuryKeywords.includes(keyword)) {
            treasuryKeywords.push(keyword);
            renderTreasuryKeywordTags();
            loadTreasuryData();
        }
        input.value = '';
    }
}

function renderTreasuryKeywordTags() {
    const container = document.getElementById('treasury-keyword-tags');
    if (!container) return;
    
    container.innerHTML = treasuryKeywords.map((kw, idx) => `
        <span class="keyword-tag">
            ${escapeHtml(kw)}
            <button type="button" class="remove-tag" onclick="removeTreasuryKeyword(${idx})">&times;</button>
        </span>
    `).join('');
}

function removeTreasuryKeyword(index) {
    treasuryKeywords.splice(index, 1);
    renderTreasuryKeywordTags();
    loadTreasuryData();
}
// Make removeTreasuryKeyword globally accessible for onclick handlers
window.removeTreasuryKeyword = removeTreasuryKeyword;

function clearTreasuryFilters() {
    treasuryKeywords = [];
    renderTreasuryKeywordTags();
    document.getElementById('treasury-filter-account').value = '';
    document.getElementById('treasury-filter-name').value = '';
    document.getElementById('treasury-filter-doc').value = '';
    document.getElementById('treasury-filter-payment').value = '';
    document.getElementById('treasury-filter-date-from').value = '';
    document.getElementById('treasury-filter-date-to').value = '';
    document.getElementById('treasury-filter-statement').value = '';
    document.getElementById('treasury-keyword-logic').value = 'AND';
    loadTreasuryData();
}

function renderTreasuryTable(items) {
    const tbody = document.getElementById('treasury-table-body');
    const lang = window.i18n?.currentLang() || 'en';
    const noItemsMsg = lang === 'ar' ? 'لا توجد حسابات خزينة.' : 'No treasury accounts found.';
    const updateBtn = lang === 'ar' ? 'تحديث' : 'Update';
    const editBtn = lang === 'ar' ? 'تعديل' : 'Edit';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    
    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${noItemsMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const balance = parseFloat(item.balance || 0);
        const balanceClass = balance < 0 ? 'stock-low' : 'stock-good';
        const paymentDisplay = paymentTranslations[item.payment_method] || item.payment_method || '-';
        const escapedAccountNumber = escapeHtml(item.account_number || '').replace(/'/g, "\\'");
        
        return `
            <tr data-entity-id="${escapeHtml(item.account_number || '')}">
                <td>
                    <span class="expand-arrow" onclick="toggleEntityHistory('${escapedAccountNumber}', 'treasury')" title="${lang === 'ar' ? 'إظهار السجل' : 'Show history'}">▶</span>
                    <strong>${escapeHtml(item.account_number || '-')}</strong>
                </td>
                <td>${escapeHtml(item.account_name || '-')}</td>
                <td>${escapeHtml(item.registration_date || '-')}</td>
                <td>${escapeHtml(item.document_number || '-')}</td>
                <td>${formatNumber(item.opening_balance || 0)}</td>
                <td style="color: #16a34a;">${formatSignedNumber(item.debit || 0)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-(item.credit || 0))}</td>
                <td class="${balanceClass}">${formatNumber(balance)}</td>
                <td>${escapeHtml(paymentDisplay)}</td>
                <td>${escapeHtml(item.statement || '-')}</td>
                <td class="no-print">
                    <button class="btn btn-small btn-outline" onclick="selectTreasuryForUpdate('${escapedAccountNumber}')">${updateBtn}</button>
                    <button class="btn btn-small btn-secondary" onclick="editTreasury('${escapedAccountNumber}')">${editBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteTreasury('${escapedAccountNumber}')">${deleteBtn}</button>
                </td>
            </tr>
            <tr class="item-history-row hidden" id="history-row-${escapeHtml(item.account_number || '')}">
                <td colspan="11" class="history-cell">
                    <div class="history-container">
                        <div class="history-header">
                            <h4>${lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h4>
                            <input type="text" class="history-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" 
                                   onkeyup="filterEntityHistory('${escapeHtml(item.account_number || '')}', this.value)">
                        </div>
                        <div class="history-content" id="history-content-${escapeHtml(item.account_number || '')}">
                            <div class="loading">${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function selectTreasuryForUpdate(accountNumber) {
    document.getElementById('treasury-account-number').value = accountNumber;
    await checkTreasuryAccount();
}

// ============================================
// COVENANTS MODULE
// ============================================
let currentCovenant = null;

async function generateCovenantId() {
    try {
        const newId = await eel.generate_next_covenant_id()();
        document.getElementById('covenant-id').value = newId;
        hideCovenantStatus();
        showCovenantForm(false);
    } catch (error) {
        console.error('Error generating covenant ID:', error);
    }
}

async function checkCovenantId() {
    const covenantId = document.getElementById('covenant-id').value.trim();
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!covenantId) {
        const msg = lang === 'ar' ? 'يرجى إدخال رقم العهدة' : 'Please enter a Covenant ID';
        showCovenantStatus(msg, 'warning');
        hideCovenantForm();
        return;
    }

    try {
        const result = await eel.check_covenant_exists(covenantId)();
        
        if (result.exists) {
            currentCovenant = result.item;
            const msg = lang === 'ar' 
                ? `العهدة "${result.item.employee_name}" موجودة. يمكنك إضافة معاملة جديدة.`
                : `Covenant for "${result.item.employee_name}" found. You can add a new transaction.`;
            showCovenantStatus(msg, 'info');
            showCovenantForm(true, result.item);
        } else {
            currentCovenant = null;
            const msg = lang === 'ar' ? 'عهدة جديدة! املأ التفاصيل أدناه لإضافتها.' : 'New covenant! Fill in the details below to add it.';
            showCovenantStatus(msg, 'success');
            showCovenantForm(false);
        }
    } catch (error) {
        console.error('Error checking covenant ID:', error);
        const msg = lang === 'ar' ? 'خطأ في التحقق من رقم العهدة' : 'Error checking covenant ID';
        showCovenantStatus(msg, 'error');
    }
}

function showCovenantStatus(message, type) {
    const status = document.getElementById('covenant-id-status');
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.classList.remove('hidden');
}

function hideCovenantStatus() {
    document.getElementById('covenant-id-status').classList.add('hidden');
}

function showCovenantForm(isExisting, covenant = null) {
    const form = document.getElementById('covenant-form');
    const lang = window.i18n?.currentLang() || 'en';
    form.classList.remove('hidden');
    
    if (isExisting && covenant) {
        document.getElementById('covenant-form-title').textContent = lang === 'ar' ? '📊 تحديث العهدة' : '📊 Update Covenant';
        document.getElementById('covenant-employee-name').value = covenant.employee_name;
        document.getElementById('covenant-phone').value = covenant.phone || '';
        document.getElementById('covenant-phone').disabled = true;
        document.getElementById('covenant-opening-balance').value = covenant.opening_balance || '';
        // Opening balance is editable only if it's currently 0
        const currentOpeningBalance = parseFloat(covenant.opening_balance || 0);
        document.getElementById('covenant-opening-balance').disabled = currentOpeningBalance !== 0;
        document.getElementById('covenant-debit').value = '';
        document.getElementById('covenant-credit').value = '';
    } else {
        document.getElementById('covenant-form-title').textContent = lang === 'ar' ? '➕ تفاصيل عهدة جديدة' : '➕ New Covenant Details';
        document.getElementById('covenant-employee-name').value = '';
        document.getElementById('covenant-phone').value = '';
        document.getElementById('covenant-phone').disabled = false;
        document.getElementById('covenant-opening-balance').value = '';
        document.getElementById('covenant-opening-balance').disabled = false;
        document.getElementById('covenant-debit').value = '';
        document.getElementById('covenant-credit').value = '';
    }
    
    document.getElementById('covenant-reg-date').value = '';
    document.getElementById('covenant-doc-number').value = '';
    document.getElementById('covenant-payment-method').selectedIndex = 0;
    document.getElementById('covenant-statement').value = '';
}

function hideCovenantForm() {
    document.getElementById('covenant-form').classList.add('hidden');
}

async function saveCovenant() {
    const covenantId = document.getElementById('covenant-id').value.trim();
    const employeeName = document.getElementById('covenant-employee-name').value.trim();
    const phone = document.getElementById('covenant-phone').value.trim();
    const regDate = document.getElementById('covenant-reg-date').value;
    const docNumber = document.getElementById('covenant-doc-number').value.trim();
    const openingBalance = document.getElementById('covenant-opening-balance').value;
    const debit = document.getElementById('covenant-debit').value;
    const credit = document.getElementById('covenant-credit').value;
    const paymentMethod = document.getElementById('covenant-payment-method').value;
    const statement = document.getElementById('covenant-statement').value.trim();
    const lang = window.i18n?.currentLang() || 'en';

    if (!covenantId || !employeeName) {
        const msg = lang === 'ar' ? 'يرجى ملء رقم العهدة واسم الموظف' : 'Please fill in Covenant ID and Employee Name';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.add_or_update_covenant(covenantId, employeeName, phone, regDate, docNumber, openingBalance, debit, credit, paymentMethod, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync to Firebase if enabled
            if (window.onLedgerEntityUpdated) {
                window.onLedgerEntityUpdated('covenants', {
                    id: covenantId,
                    employee_name: employeeName,
                    phone: phone,
                    opening_balance: parseFloat(openingBalance || 0),
                    debit: parseFloat(debit || 0),
                    credit: parseFloat(credit || 0),
                    payment_method: paymentMethod,
                    statement: statement
                });
            }
            
            await generateCovenantId();
            hideCovenantForm();
            hideCovenantStatus();
            await loadCovenantsData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving covenant:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ العهدة' : 'Failed to save covenant';
        showToast(msg, 'error');
    }
}

async function loadCovenantsData() {
    try {
        const search = document.getElementById('covenants-search')?.value || '';
        const searchLower = search.toLowerCase().trim();

        const allItems = await eel.get_all_covenants({})();
        let items = allItems;
        let transactionMatchedIds = new Set();
        let countByEntityId = new Map();
        const entityMatchedIds = new Set();

        if (searchLower) {
            const transMatches = await getModuleTransactionMatches('covenant', searchLower);
            transactionMatchedIds = transMatches.matchedIds;
            countByEntityId = transMatches.countByEntityId;

            items = allItems.filter(item => {
                const idMatch = (item.id || '').toLowerCase().includes(searchLower);
                const nameMatch = (item.employee_name || '').toLowerCase().includes(searchLower);
                if (idMatch || nameMatch) entityMatchedIds.add(normalizeEntityId(item.id));
                return idMatch || nameMatch || transactionMatchedIds.has(normalizeEntityId(item.id));
            });
        }

        
        renderCovenantsTable(items);
        if (searchLower) markTransactionMatchedRows('covenant', transactionMatchedIds, entityMatchedIds, countByEntityId);
        const lang = window.i18n?.currentLang() || 'en';
        const itemWord = lang === 'ar' ? 'عهدة' : (items.length !== 1 ? 'covenants' : 'covenant');
        const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
        document.getElementById('covenants-count').textContent = `${showingWord} ${items.length} ${itemWord}`;
        
        // Load covenants total balance
        await loadCovenantsTotalBalance();
    } catch (error) {
        console.error('Error loading covenants data:', error);
        showToast('Failed to load covenants data', 'error');
    }
}

async function loadCovenantsTotalBalance() {
    try {
        const data = await eel.get_covenants_total_balance()();
        document.getElementById('covenants-total-balance').textContent = formatNumber(data.total_balance || 0);
        document.getElementById('covenants-total-opening').textContent = formatNumber(data.total_opening_balance || 0);
        document.getElementById('covenants-total-debit').textContent = formatNumber(data.total_debit || 0);
        document.getElementById('covenants-total-credit').textContent = formatNumber(data.total_credit || 0);
        document.getElementById('covenants-balance-count').textContent = data.count || 0;
    } catch (error) {
        console.error('Error loading covenants total balance:', error);
    }
}

function renderCovenantsTable(items) {
    const tbody = document.getElementById('covenants-table-body');
    const lang = window.i18n?.currentLang() || 'en';
    const noItemsMsg = lang === 'ar' ? 'لا توجد عهد. أضف أول عهدة!' : 'No covenants found. Add your first covenant!';
    const updateBtn = lang === 'ar' ? 'تحديث' : 'Update';
    const editBtn = lang === 'ar' ? 'تعديل' : 'Edit';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    
    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="12">${noItemsMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const balance = parseFloat(item.balance || 0);
        const balanceClass = balance < 0 ? 'stock-low' : 'stock-good';
        const paymentDisplay = paymentTranslations[item.payment_method] || item.payment_method || '-';
        const escapedId = escapeHtml(item.id).replace(/'/g, "\\'");
        
        return `
            <tr data-entity-id="${escapeHtml(item.id)}">
                <td>
                    <span class="expand-arrow" onclick="toggleEntityHistory('${escapedId}', 'covenant')" title="${lang === 'ar' ? 'إظهار السجل' : 'Show history'}">▶</span>
                    <strong>${escapeHtml(item.id)}</strong>
                </td>
                <td>${escapeHtml(item.employee_name)}</td>
                <td>${escapeHtml(item.phone || '-')}</td>
                <td>${escapeHtml(item.registration_date || '-')}</td>
                <td>${escapeHtml(item.document_number || '-')}</td>
                <td>${formatNumber(item.opening_balance || 0)}</td>
                <td style="color: #16a34a;">${formatSignedNumber(item.debit || 0)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-(item.credit || 0))}</td>
                <td class="${balanceClass}">${formatNumber(balance)}</td>
                <td>${escapeHtml(paymentDisplay)}</td>
                <td>${escapeHtml(item.statement || '-')}</td>
                <td class="no-print">
                    <button class="btn btn-small btn-outline" onclick="selectCovenantForUpdate('${escapedId}')">${updateBtn}</button>
                    <button class="btn btn-small btn-secondary" onclick="editCovenant('${escapedId}')">${editBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteCovenant('${escapedId}')">${deleteBtn}</button>
                </td>
            </tr>
            <tr class="item-history-row hidden" id="history-row-${escapeHtml(item.id)}">
                <td colspan="12" class="history-cell">
                    <div class="history-container">
                        <div class="history-header">
                            <h4>${lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h4>
                            <input type="text" class="history-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" 
                                   onkeyup="filterEntityHistory('${escapeHtml(item.id)}', this.value)">
                        </div>
                        <div class="history-content" id="history-content-${escapeHtml(item.id)}">
                            <div class="loading">${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function selectCovenantForUpdate(covenantId) {
    document.getElementById('covenant-id').value = covenantId;
    await checkCovenantId();
}

// ============================================
// ADVANCES MODULE
// ============================================
let currentAdvance = null;

async function generateAdvanceId() {
    try {
        const newId = await eel.generate_next_advance_id()();
        document.getElementById('advance-id').value = newId;
        hideAdvanceStatus();
        showAdvanceForm(false);
    } catch (error) {
        console.error('Error generating advance ID:', error);
    }
}

async function checkAdvanceId() {
    const advanceId = document.getElementById('advance-id').value.trim();
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!advanceId) {
        const msg = lang === 'ar' ? 'يرجى إدخال رقم السلفة' : 'Please enter an Advance ID';
        showAdvanceStatus(msg, 'warning');
        hideAdvanceForm();
        return;
    }

    try {
        const result = await eel.check_advance_exists(advanceId)();
        
        if (result.exists) {
            currentAdvance = result.item;
            const msg = lang === 'ar' 
                ? `السلفة "${result.item.employee_name}" موجودة. يمكنك إضافة معاملة جديدة.`
                : `Advance for "${result.item.employee_name}" found. You can add a new transaction.`;
            showAdvanceStatus(msg, 'info');
            showAdvanceForm(true, result.item);
        } else {
            currentAdvance = null;
            const msg = lang === 'ar' ? 'سلفة جديدة! املأ التفاصيل أدناه لإضافتها.' : 'New advance! Fill in the details below to add it.';
            showAdvanceStatus(msg, 'success');
            showAdvanceForm(false);
        }
    } catch (error) {
        console.error('Error checking advance ID:', error);
        const msg = lang === 'ar' ? 'خطأ في التحقق من رقم السلفة' : 'Error checking advance ID';
        showAdvanceStatus(msg, 'error');
    }
}

function showAdvanceStatus(message, type) {
    const status = document.getElementById('advance-id-status');
    status.textContent = message;
    status.className = `status-message ${type}`;
    status.classList.remove('hidden');
}

function hideAdvanceStatus() {
    document.getElementById('advance-id-status').classList.add('hidden');
}

function showAdvanceForm(isExisting, advance = null) {
    const form = document.getElementById('advance-form');
    const lang = window.i18n?.currentLang() || 'en';
    form.classList.remove('hidden');
    
    if (isExisting && advance) {
        document.getElementById('advance-form-title').textContent = lang === 'ar' ? '📊 تحديث السلفة' : '📊 Update Advance';
        document.getElementById('advance-employee-name').value = advance.employee_name;
        document.getElementById('advance-phone').value = advance.phone || '';
        document.getElementById('advance-phone').disabled = true;
        document.getElementById('advance-opening-balance').value = advance.opening_balance || '';
        // Opening balance is editable only if it's currently 0
        const currentOpeningBalance = parseFloat(advance.opening_balance || 0);
        document.getElementById('advance-opening-balance').disabled = currentOpeningBalance !== 0;
        document.getElementById('advance-debit').value = '';
        document.getElementById('advance-credit').value = '';
    } else {
        document.getElementById('advance-form-title').textContent = lang === 'ar' ? '➕ تفاصيل سلفة جديدة' : '➕ New Advance Details';
        document.getElementById('advance-employee-name').value = '';
        document.getElementById('advance-phone').value = '';
        document.getElementById('advance-phone').disabled = false;
        document.getElementById('advance-opening-balance').value = '';
        document.getElementById('advance-opening-balance').disabled = false;
        document.getElementById('advance-debit').value = '';
        document.getElementById('advance-credit').value = '';
    }
    
    document.getElementById('advance-reg-date').value = '';
    document.getElementById('advance-doc-number').value = '';
    document.getElementById('advance-payment-method').selectedIndex = 0;
    document.getElementById('advance-statement').value = '';
}

function hideAdvanceForm() {
    document.getElementById('advance-form').classList.add('hidden');
}

async function saveAdvance() {
    const advanceId = document.getElementById('advance-id').value.trim();
    const employeeName = document.getElementById('advance-employee-name').value.trim();
    const phone = document.getElementById('advance-phone').value.trim();
    const regDate = document.getElementById('advance-reg-date').value;
    const docNumber = document.getElementById('advance-doc-number').value.trim();
    const openingBalance = document.getElementById('advance-opening-balance').value;
    const debit = document.getElementById('advance-debit').value;
    const credit = document.getElementById('advance-credit').value;
    const paymentMethod = document.getElementById('advance-payment-method').value;
    const statement = document.getElementById('advance-statement').value.trim();
    const lang = window.i18n?.currentLang() || 'en';

    if (!advanceId || !employeeName) {
        const msg = lang === 'ar' ? 'يرجى ملء رقم السلفة واسم الموظف' : 'Please fill in Advance ID and Employee Name';
        showToast(msg, 'error');
        return;
    }

    try {
        const result = await eel.add_or_update_advance(advanceId, employeeName, phone, regDate, docNumber, openingBalance, debit, credit, paymentMethod, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            
            // Sync to Firebase if enabled
            if (window.onLedgerEntityUpdated) {
                window.onLedgerEntityUpdated('advances', {
                    id: advanceId,
                    employee_name: employeeName,
                    phone: phone,
                    opening_balance: parseFloat(openingBalance || 0),
                    debit: parseFloat(debit || 0),
                    credit: parseFloat(credit || 0),
                    payment_method: paymentMethod,
                    statement: statement
                });
            }
            
            await generateAdvanceId();
            hideAdvanceForm();
            hideAdvanceStatus();
            await loadAdvancesData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving advance:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ السلفة' : 'Failed to save advance';
        showToast(msg, 'error');
    }
}

async function loadAdvancesData() {
    try {
        const search = document.getElementById('advances-search')?.value || '';
        const searchLower = search.toLowerCase().trim();

        const allItems = await eel.get_all_advances({})();
        let items = allItems;
        let transactionMatchedIds = new Set();
        let countByEntityId = new Map();
        const entityMatchedIds = new Set();

        if (searchLower) {
            const transMatches = await getModuleTransactionMatches('advance', searchLower);
            transactionMatchedIds = transMatches.matchedIds;
            countByEntityId = transMatches.countByEntityId;

            items = allItems.filter(item => {
                const idMatch = (item.id || '').toLowerCase().includes(searchLower);
                const nameMatch = (item.employee_name || '').toLowerCase().includes(searchLower);
                if (idMatch || nameMatch) entityMatchedIds.add(normalizeEntityId(item.id));
                return idMatch || nameMatch || transactionMatchedIds.has(normalizeEntityId(item.id));
            });
        }

        renderAdvancesTable(items);
        if (searchLower) markTransactionMatchedRows('advance', transactionMatchedIds, entityMatchedIds, countByEntityId);
        const lang = window.i18n?.currentLang() || 'en';
        const itemWord = lang === 'ar' ? 'سلفة' : (items.length !== 1 ? 'advances' : 'advance');
        const showingWord = lang === 'ar' ? 'عرض' : 'Showing';
        document.getElementById('advances-count').textContent = `${showingWord} ${items.length} ${itemWord}`;
        
        // Load advances total balance
        await loadAdvancesTotalBalance();
    } catch (error) {
        console.error('Error loading advances data:', error);
        showToast('Failed to load advances data', 'error');
    }
}

async function loadAdvancesTotalBalance() {
    try {
        const data = await eel.get_advances_total_balance()();
        document.getElementById('advances-total-balance').textContent = formatNumber(data.total_balance || 0);
        document.getElementById('advances-total-opening').textContent = formatNumber(data.total_opening_balance || 0);
        document.getElementById('advances-total-debit').textContent = formatNumber(data.total_debit || 0);
        document.getElementById('advances-total-credit').textContent = formatNumber(data.total_credit || 0);
        document.getElementById('advances-balance-count').textContent = data.count || 0;
    } catch (error) {
        console.error('Error loading advances total balance:', error);
    }
}

function renderAdvancesTable(items) {
    const tbody = document.getElementById('advances-table-body');
    const lang = window.i18n?.currentLang() || 'en';
    const noItemsMsg = lang === 'ar' ? 'لا توجد سلف. أضف أول سلفة!' : 'No advances found. Add your first advance!';
    const updateBtn = lang === 'ar' ? 'تحديث' : 'Update';
    const editBtn = lang === 'ar' ? 'تعديل' : 'Edit';
    const deleteBtn = lang === 'ar' ? 'حذف' : 'Delete';
    
    const paymentTranslations = {
        'cash': lang === 'ar' ? 'نقداً' : 'Cash',
        'bank_transfer': lang === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
        'digital_wallet': lang === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet',
        'check': lang === 'ar' ? 'شيك' : 'Check'
    };
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="12">${noItemsMsg}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => {
        const balance = parseFloat(item.balance || 0);
        const balanceClass = balance < 0 ? 'stock-low' : 'stock-good';
        const paymentDisplay = paymentTranslations[item.payment_method] || item.payment_method || '-';
        const escapedId = escapeHtml(item.id).replace(/'/g, "\\'");
        
        return `
            <tr data-entity-id="${escapeHtml(item.id)}">
                <td>
                    <span class="expand-arrow" onclick="toggleEntityHistory('${escapedId}', 'advance')" title="${lang === 'ar' ? 'إظهار السجل' : 'Show history'}">▶</span>
                    <strong>${escapeHtml(item.id)}</strong>
                </td>
                <td>${escapeHtml(item.employee_name)}</td>
                <td>${escapeHtml(item.phone || '-')}</td>
                <td>${escapeHtml(item.registration_date || '-')}</td>
                <td>${escapeHtml(item.document_number || '-')}</td>
                <td>${formatNumber(item.opening_balance || 0)}</td>
                <td style="color: #16a34a;">${formatSignedNumber(item.debit || 0)}</td>
                <td style="color: #dc2626;">${formatSignedNumber(-(item.credit || 0))}</td>
                <td class="${balanceClass}">${formatNumber(balance)}</td>
                <td>${escapeHtml(paymentDisplay)}</td>
                <td>${escapeHtml(item.statement || '-')}</td>
                <td class="no-print">
                    <button class="btn btn-small btn-outline" onclick="selectAdvanceForUpdate('${escapedId}')">${updateBtn}</button>
                    <button class="btn btn-small btn-secondary" onclick="editAdvance('${escapedId}')">${editBtn}</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteAdvance('${escapedId}')">${deleteBtn}</button>
                </td>
            </tr>
            <tr class="item-history-row hidden" id="history-row-${escapeHtml(item.id)}">
                <td colspan="12" class="history-cell">
                    <div class="history-container">
                        <div class="history-header">
                            <h4>${lang === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</h4>
                            <input type="text" class="history-search" placeholder="${lang === 'ar' ? 'بحث...' : 'Search...'}" 
                                   onkeyup="filterEntityHistory('${escapeHtml(item.id)}', this.value)">
                        </div>
                        <div class="history-content" id="history-content-${escapeHtml(item.id)}">
                            <div class="loading">${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function selectAdvanceForUpdate(advanceId) {
    document.getElementById('advance-id').value = advanceId;
    await checkAdvanceId();
}

// ============================================
// EXPORT FUNCTIONS FOR NEW MODULES
// ============================================

const customerExportColumns = [
    { key: 'id', en: 'ID', ar: 'الرقم' },
    { key: 'name', en: 'Name', ar: 'الاسم' },
    { key: 'phone', en: 'Phone', ar: 'الهاتف' },
    { key: 'email', en: 'Email', ar: 'البريد الإلكتروني' },
    { key: 'registration_date', en: 'Registration Date', ar: 'تاريخ التسجيل' },
    { key: 'document_number', en: 'Document Number', ar: 'رقم المستند' },
    { key: 'opening_balance', en: 'Opening Balance', ar: 'الرصيد الافتتاحي' },
    { key: 'debit', en: 'Debit', ar: 'مدين' },
    { key: 'credit', en: 'Credit', ar: 'دائن' },
    { key: 'balance', en: 'Balance', ar: 'الرصيد' },
    { key: 'payment_method', en: 'Payment Method', ar: 'طريقة الدفع' },
    { key: 'statement', en: 'Statement', ar: 'البيان' }
];

const supplierExportColumns = customerExportColumns; // Same structure

const treasuryExportColumns = [
    { key: 'account_number', en: 'Account Number', ar: 'رقم الحساب' },
    { key: 'account_name', en: 'Account Name', ar: 'اسم الحساب' },
    { key: 'registration_date', en: 'Registration Date', ar: 'تاريخ التسجيل' },
    { key: 'document_number', en: 'Document Number', ar: 'رقم المستند' },
    { key: 'opening_balance', en: 'Opening Balance', ar: 'الرصيد الافتتاحي' },
    { key: 'debit', en: 'Debit', ar: 'مدين' },
    { key: 'credit', en: 'Credit', ar: 'دائن' },
    { key: 'balance', en: 'Balance', ar: 'الرصيد' },
    { key: 'payment_method', en: 'Payment Method', ar: 'طريقة الدفع' },
    { key: 'statement', en: 'Statement', ar: 'البيان' }
];

const covenantExportColumns = [
    { key: 'id', en: 'ID', ar: 'الرقم' },
    { key: 'employee_name', en: 'Employee Name', ar: 'اسم الموظف' },
    { key: 'phone', en: 'Phone', ar: 'الهاتف' },
    { key: 'registration_date', en: 'Registration Date', ar: 'تاريخ التسجيل' },
    { key: 'document_number', en: 'Document Number', ar: 'رقم المستند' },
    { key: 'opening_balance', en: 'Opening Balance', ar: 'الرصيد الافتتاحي' },
    { key: 'debit', en: 'Debit', ar: 'مدين' },
    { key: 'credit', en: 'Credit', ar: 'دائن' },
    { key: 'balance', en: 'Balance', ar: 'الرصيد' },
    { key: 'payment_method', en: 'Payment Method', ar: 'طريقة الدفع' },
    { key: 'statement', en: 'Statement', ar: 'البيان' }
];

const advanceExportColumns = covenantExportColumns; // Same structure

async function exportCustomers() {
    currentExportType = 'customers';
    showExportModal('customers');
}

async function exportSuppliers() {
    currentExportType = 'suppliers';
    showExportModal('suppliers');
}

async function exportTreasury() {
    currentExportType = 'treasury';
    showExportModal('treasury');
}

async function exportCovenants() {
    currentExportType = 'covenants';
    showExportModal('covenants');
}

async function exportAdvances() {
    currentExportType = 'advances';
    showExportModal('advances');
}

// ============================================
// EDIT FUNCTIONS FOR LEDGER MODULES
// ============================================

// Edit Customer
async function editCustomer(customerId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const items = await eel.get_all_customers()();
        const customer = items.find(i => i.id === customerId);
        
        if (!customer) {
            const msg = lang === 'ar' ? 'العميل غير موجود' : 'Customer not found';
            showToast(msg, 'error');
            return;
        }
        
        // Create dialog
        const dialog = createDialog('editCustomerDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل العميل' : 'Edit Customer'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'الكود:' : 'ID:'} ${escapeHtml(customerId)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label>${lang === 'ar' ? 'رقم العميل' : 'Customer ID'} <span class="field-icon">🔒</span></label>
                    <div class="field-readonly">${escapeHtml(customerId)}</div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'اسم العميل' : 'Customer Name'} <span class="required">*</span></label>
                    <input type="text" id="editCustomerName" value="${escapeHtml(customer.name || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
                        <input type="text" id="editCustomerPhone" value="${escapeHtml(customer.phone || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                        <input type="email" id="editCustomerEmail" value="${escapeHtml(customer.email || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}</label>
                        <input type="date" id="editCustomerRegDate" value="${escapeHtml(customer.registration_date || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                        <input type="text" id="editCustomerDocNum" value="${escapeHtml(customer.document_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</label>
                        <input type="number" step="0.01" id="editCustomerOpeningBalance" value="${escapeHtml(customer.opening_balance || '0')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <input type="text" id="editCustomerPaymentMethod" value="${escapeHtml(customer.payment_method || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'البيان' : 'Statement'}</label>
                    <textarea id="editCustomerStatement" rows="2">${escapeHtml(customer.statement || '')}</textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditCustomer">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditCustomer">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditCustomer').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditCustomer').addEventListener('click', () => saveCustomerEdit(customerId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading customer for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات العميل' : 'Failed to load customer data';
        showToast(msg, 'error');
    }
}

function closeEditCustomerModal() {
    closeDialog('editCustomerDialog');
}

async function saveCustomerEdit(customerId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const name = document.getElementById('editCustomerName').value.trim();
    const phone = document.getElementById('editCustomerPhone').value.trim();
    const email = document.getElementById('editCustomerEmail').value.trim();
    const registration_date = document.getElementById('editCustomerRegDate').value.trim();
    const document_number = document.getElementById('editCustomerDocNum').value.trim();
    const opening_balance = document.getElementById('editCustomerOpeningBalance').value.trim();
    const payment_method = document.getElementById('editCustomerPaymentMethod').value.trim();
    const statement = document.getElementById('editCustomerStatement').value.trim();
    
    if (!name) {
        const msg = lang === 'ar' ? 'اسم العميل مطلوب' : 'Customer name is required';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.edit_customer(customerId, name, phone, email, registration_date, document_number, opening_balance, payment_method, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeEditCustomerModal();
            await loadCustomersData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving customer edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// Edit Supplier
async function editSupplier(supplierId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const items = await eel.get_all_suppliers()();
        const supplier = items.find(i => i.id === supplierId);
        
        if (!supplier) {
            const msg = lang === 'ar' ? 'المورد غير موجود' : 'Supplier not found';
            showToast(msg, 'error');
            return;
        }
        
        // Create dialog
        const dialog = createDialog('editSupplierDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل المورد' : 'Edit Supplier'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'الكود:' : 'ID:'} ${escapeHtml(supplierId)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label>${lang === 'ar' ? 'رقم المورد' : 'Supplier ID'} <span class="field-icon">🔒</span></label>
                    <div class="field-readonly">${escapeHtml(supplierId)}</div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'اسم المورد' : 'Supplier Name'} <span class="required">*</span></label>
                    <input type="text" id="editSupplierName" value="${escapeHtml(supplier.name || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
                        <input type="text" id="editSupplierPhone" value="${escapeHtml(supplier.phone || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                        <input type="email" id="editSupplierEmail" value="${escapeHtml(supplier.email || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}</label>
                        <input type="date" id="editSupplierRegDate" value="${escapeHtml(supplier.registration_date || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                        <input type="text" id="editSupplierDocNum" value="${escapeHtml(supplier.document_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</label>
                        <input type="number" step="0.01" id="editSupplierOpeningBalance" value="${escapeHtml(supplier.opening_balance || '0')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <input type="text" id="editSupplierPaymentMethod" value="${escapeHtml(supplier.payment_method || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'البيان' : 'Statement'}</label>
                    <textarea id="editSupplierStatement" rows="2">${escapeHtml(supplier.statement || '')}</textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditSupplier">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditSupplier">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditSupplier').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditSupplier').addEventListener('click', () => saveSupplierEdit(supplierId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading supplier for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات المورد' : 'Failed to load supplier data';
        showToast(msg, 'error');
    }
}

function closeEditSupplierModal() {
    closeDialog('editSupplierDialog');
}

async function saveSupplierEdit(supplierId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const name = document.getElementById('editSupplierName').value.trim();
    const phone = document.getElementById('editSupplierPhone').value.trim();
    const email = document.getElementById('editSupplierEmail').value.trim();
    const registration_date = document.getElementById('editSupplierRegDate').value.trim();
    const document_number = document.getElementById('editSupplierDocNum').value.trim();
    const opening_balance = document.getElementById('editSupplierOpeningBalance').value.trim();
    const payment_method = document.getElementById('editSupplierPaymentMethod').value.trim();
    const statement = document.getElementById('editSupplierStatement').value.trim();
    
    if (!name) {
        const msg = lang === 'ar' ? 'اسم المورد مطلوب' : 'Supplier name is required';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.edit_supplier(supplierId, name, phone, email, registration_date, document_number, opening_balance, payment_method, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeEditSupplierModal();
            await loadSuppliersData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving supplier edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// Edit Treasury
async function editTreasury(accountNumber) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const items = await eel.get_all_treasury()();
        const treasury = items.find(i => i.account_number === accountNumber);
        
        if (!treasury) {
            const msg = lang === 'ar' ? 'حساب الخزينة غير موجود' : 'Treasury account not found';
            showToast(msg, 'error');
            return;
        }
        
        // Create dialog
        const dialog = createDialog('editTreasuryDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل حساب الخزينة' : 'Edit Treasury Account'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'رقم الحساب:' : 'Account:'} ${escapeHtml(accountNumber)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label>${lang === 'ar' ? 'رقم الحساب' : 'Account Number'} <span class="field-icon">🔒</span></label>
                    <div class="field-readonly">${escapeHtml(accountNumber)}</div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'اسم الحساب' : 'Account Name'} <span class="required">*</span></label>
                    <input type="text" id="editTreasuryAccountName" value="${escapeHtml(treasury.account_name || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}</label>
                        <input type="date" id="editTreasuryRegDate" value="${escapeHtml(treasury.registration_date || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                        <input type="text" id="editTreasuryDocNum" value="${escapeHtml(treasury.document_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</label>
                        <input type="number" step="0.01" id="editTreasuryOpeningBalance" value="${escapeHtml(treasury.opening_balance || '0')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <input type="text" id="editTreasuryPaymentMethod" value="${escapeHtml(treasury.payment_method || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'البيان' : 'Statement'}</label>
                    <textarea id="editTreasuryStatement" rows="2">${escapeHtml(treasury.statement || '')}</textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditTreasury">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditTreasury">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditTreasury').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditTreasury').addEventListener('click', () => saveTreasuryEdit(accountNumber));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading treasury for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات الخزينة' : 'Failed to load treasury data';
        showToast(msg, 'error');
    }
}

function closeEditTreasuryModal() {
    closeDialog('editTreasuryDialog');
}

async function saveTreasuryEdit(accountNumber) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const account_name = document.getElementById('editTreasuryAccountName').value.trim();
    const registration_date = document.getElementById('editTreasuryRegDate').value.trim();
    const document_number = document.getElementById('editTreasuryDocNum').value.trim();
    const opening_balance = document.getElementById('editTreasuryOpeningBalance').value.trim();
    const payment_method = document.getElementById('editTreasuryPaymentMethod').value.trim();
    const statement = document.getElementById('editTreasuryStatement').value.trim();
    
    if (!account_name) {
        const msg = lang === 'ar' ? 'اسم الحساب مطلوب' : 'Account name is required';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.edit_treasury(accountNumber, account_name, registration_date, document_number, opening_balance, payment_method, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeEditTreasuryModal();
            await loadTreasuryData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving treasury edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// Edit Covenant
async function editCovenant(covenantId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const items = await eel.get_all_covenants()();
        const covenant = items.find(i => i.id === covenantId);
        
        if (!covenant) {
            const msg = lang === 'ar' ? 'العهدة غير موجودة' : 'Covenant not found';
            showToast(msg, 'error');
            return;
        }
        
        // Create dialog
        const dialog = createDialog('editCovenantDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل العهدة' : 'Edit Covenant'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'الكود:' : 'ID:'} ${escapeHtml(covenantId)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label>${lang === 'ar' ? 'رقم العهدة' : 'Covenant ID'} <span class="field-icon">🔒</span></label>
                    <div class="field-readonly">${escapeHtml(covenantId)}</div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'اسم الموظف' : 'Employee Name'} <span class="required">*</span></label>
                    <input type="text" id="editCovenantEmployeeName" value="${escapeHtml(covenant.employee_name || '')}">
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
                    <input type="text" id="editCovenantPhone" value="${escapeHtml(covenant.phone || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}</label>
                        <input type="date" id="editCovenantRegDate" value="${escapeHtml(covenant.registration_date || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                        <input type="text" id="editCovenantDocNum" value="${escapeHtml(covenant.document_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</label>
                        <input type="number" step="0.01" id="editCovenantOpeningBalance" value="${escapeHtml(covenant.opening_balance || '0')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <input type="text" id="editCovenantPaymentMethod" value="${escapeHtml(covenant.payment_method || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'البيان' : 'Statement'}</label>
                    <textarea id="editCovenantStatement" rows="2">${escapeHtml(covenant.statement || '')}</textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditCovenant">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditCovenant">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditCovenant').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditCovenant').addEventListener('click', () => saveCovenantEdit(covenantId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading covenant for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات العهدة' : 'Failed to load covenant data';
        showToast(msg, 'error');
    }
}

function closeEditCovenantModal() {
    closeDialog('editCovenantDialog');
}

async function saveCovenantEdit(covenantId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const employee_name = document.getElementById('editCovenantEmployeeName').value.trim();
    const phone = document.getElementById('editCovenantPhone').value.trim();
    const registration_date = document.getElementById('editCovenantRegDate').value.trim();
    const document_number = document.getElementById('editCovenantDocNum').value.trim();
    const opening_balance = document.getElementById('editCovenantOpeningBalance').value.trim();
    const payment_method = document.getElementById('editCovenantPaymentMethod').value.trim();
    const statement = document.getElementById('editCovenantStatement').value.trim();
    
    if (!employee_name) {
        const msg = lang === 'ar' ? 'اسم الموظف مطلوب' : 'Employee name is required';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.edit_covenant(covenantId, employee_name, phone, registration_date, document_number, opening_balance, payment_method, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeEditCovenantModal();
            await loadCovenantsData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving covenant edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}

// Edit Advance
async function editAdvance(advanceId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const items = await eel.get_all_advances()();
        const advance = items.find(i => i.id === advanceId);
        
        if (!advance) {
            const msg = lang === 'ar' ? 'السلفة غير موجودة' : 'Advance not found';
            showToast(msg, 'error');
            return;
        }
        
        // Create dialog
        const dialog = createDialog('editAdvanceDialog');
        
        dialog.innerHTML = `
            <div class="dialog-header">
                <div>
                    <h3>${lang === 'ar' ? 'تعديل السلفة' : 'Edit Advance'}</h3>
                    <div class="dialog-subtitle">${lang === 'ar' ? 'الكود:' : 'ID:'} ${escapeHtml(advanceId)}</div>
                </div>
                <button class="dialog-close" type="button">&times;</button>
            </div>
            <div class="dialog-body">
                <div class="form-group">
                    <label>${lang === 'ar' ? 'رقم السلفة' : 'Advance ID'} <span class="field-icon">🔒</span></label>
                    <div class="field-readonly">${escapeHtml(advanceId)}</div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'اسم الموظف' : 'Employee Name'} <span class="required">*</span></label>
                    <input type="text" id="editAdvanceEmployeeName" value="${escapeHtml(advance.employee_name || '')}">
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'الهاتف' : 'Phone'}</label>
                    <input type="text" id="editAdvancePhone" value="${escapeHtml(advance.phone || '')}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'تاريخ التسجيل' : 'Registration Date'}</label>
                        <input type="date" id="editAdvanceRegDate" value="${escapeHtml(advance.registration_date || '')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'رقم المستند' : 'Document Number'}</label>
                        <input type="text" id="editAdvanceDocNum" value="${escapeHtml(advance.document_number || '')}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}</label>
                        <input type="number" step="0.01" id="editAdvanceOpeningBalance" value="${escapeHtml(advance.opening_balance || '0')}">
                    </div>
                    <div class="form-group">
                        <label>${lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                        <input type="text" id="editAdvancePaymentMethod" value="${escapeHtml(advance.payment_method || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${lang === 'ar' ? 'البيان' : 'Statement'}</label>
                    <textarea id="editAdvanceStatement" rows="2">${escapeHtml(advance.statement || '')}</textarea>
                </div>
            </div>
            <div class="dialog-footer">
                <button class="btn btn-secondary" type="button" id="cancelEditAdvance">${lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                <button class="btn btn-primary" type="button" id="saveEditAdvance">${lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
            </div>
        `;
        
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
        dialog.querySelector('#cancelEditAdvance').addEventListener('click', () => dialog.close());
        dialog.querySelector('#saveEditAdvance').addEventListener('click', () => saveAdvanceEdit(advanceId));
        
        showDialog(dialog);
        
    } catch (error) {
        console.error('Error loading advance for edit:', error);
        const msg = lang === 'ar' ? 'فشل في تحميل بيانات السلفة' : 'Failed to load advance data';
        showToast(msg, 'error');
    }
}

function closeEditAdvanceModal() {
    closeDialog('editAdvanceDialog');
}

async function saveAdvanceEdit(advanceId) {
    const lang = window.i18n?.currentLang() || 'en';
    
    const employee_name = document.getElementById('editAdvanceEmployeeName').value.trim();
    const phone = document.getElementById('editAdvancePhone').value.trim();
    const registration_date = document.getElementById('editAdvanceRegDate').value.trim();
    const document_number = document.getElementById('editAdvanceDocNum').value.trim();
    const opening_balance = document.getElementById('editAdvanceOpeningBalance').value.trim();
    const payment_method = document.getElementById('editAdvancePaymentMethod').value.trim();
    const statement = document.getElementById('editAdvanceStatement').value.trim();
    
    if (!employee_name) {
        const msg = lang === 'ar' ? 'اسم الموظف مطلوب' : 'Employee name is required';
        showToast(msg, 'error');
        return;
    }
    
    try {
        const result = await eel.edit_advance(advanceId, employee_name, phone, registration_date, document_number, opening_balance, payment_method, statement)();
        
        if (result.success) {
            showToast(result.message, 'success');
            closeEditAdvanceModal();
            await loadAdvancesData();
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving advance edit:', error);
        const msg = lang === 'ar' ? 'فشل في حفظ التعديلات' : 'Failed to save changes';
        showToast(msg, 'error');
    }
}
