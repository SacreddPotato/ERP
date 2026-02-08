/**
 * Firebase Sync Layer (No Authentication)
 * =======================================
 * Simple shared database - everyone pushes/pulls to the same central data
 */

// ============================================
// Sync State
// ============================================
const FirebaseSync = {
    isEnabled: false,
    syncInProgress: false,
    lastSyncTime: null,
    lastPullTime: null,
    autoPullInterval: null,
    listeners: [],
    AUTO_PULL_INTERVAL_MS: 60000 // Pull every 60 seconds
};

// ============================================
// Initialization
// ============================================

/**
 * Initialize Firebase sync on page load
 */
function initFirebaseSync() {
    const { isConfigured } = window.firebaseConfig || {};
    
    if (!isConfigured || !isConfigured()) {
        console.log('⚠️ Firebase not configured - sync disabled');
        showSyncStatus('offline');
        return;
    }
    
    FirebaseSync.isEnabled = true;
    console.log('✅ Firebase sync enabled');
    
    // Set up button listeners
    setupSyncButtons();
    
    // Start real-time listeners
    startRealtimeListeners();
    
    // Show connected status
    showSyncStatus('synced');
    
    // Perform initial pull from cloud on startup
    performInitialPull();
}

/**
 * Set up push/pull button event listeners
 */
function setupSyncButtons() {
    const pushBtn = document.getElementById('push-to-cloud-btn');
    const pullBtn = document.getElementById('pull-from-cloud-btn');
    const forcePullBtn = document.getElementById('force-pull-from-cloud-btn');
    
    if (pushBtn) {
        pushBtn.addEventListener('click', performPushToCloud);
    }
    
    if (pullBtn) {
        pullBtn.addEventListener('click', () => performPullFromCloud(false));
    }
    
    if (forcePullBtn) {
        forcePullBtn.addEventListener('click', performForcePullFromCloud);
    }
}

/**
 * Start automatic pull from cloud at regular intervals
 */
function startAutoPull() {
    stopAutoPull();
    
    FirebaseSync.autoPullInterval = setInterval(() => {
        if (FirebaseSync.isEnabled && !FirebaseSync.syncInProgress) {
            performPullFromCloud(true); // Silent pull
        }
    }, FirebaseSync.AUTO_PULL_INTERVAL_MS);
    
    console.log('🔄 Auto-pull started (every 60 seconds)');
}

/**
 * Stop automatic pull
 */
function stopAutoPull() {
    if (FirebaseSync.autoPullInterval) {
        clearInterval(FirebaseSync.autoPullInterval);
        FirebaseSync.autoPullInterval = null;
    }
}

// ============================================
// Firestore Data Operations
// ============================================

/**
 * Sync stock item to Firestore
 */
async function syncStockItem(factory, item) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    try {
        await db
            .collection('stock')
            .doc(factory)
            .collection('items')
            .doc(item.id)
            .set({
                ...item,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        
        console.log(`✅ Synced item ${item.id} to Firebase`);
    } catch (error) {
        console.error('Failed to sync stock item:', error);
    }
}

/**
 * Sync all stock items for a factory to Firestore
 */
async function syncAllStockItems(factory, items) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    try {
        const batch = db.batch();
        const collectionRef = db.collection('stock').doc(factory).collection('items');
        
        items.forEach(item => {
            const docRef = collectionRef.doc(item.id);
            batch.set(docRef, {
                ...item,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });
        
        await batch.commit();
        console.log(`✅ Synced ${items.length} items for ${factory} to Firebase`);
    } catch (error) {
        console.error('Failed to sync all stock items:', error);
    }
}

/**
 * Delete stock item from Firestore
 */
async function deleteStockItemFromFirebase(factory, itemId) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    try {
        await db
            .collection('stock')
            .doc(factory)
            .collection('items')
            .doc(itemId)
            .delete();
        
        console.log(`✅ Deleted item ${itemId} from Firebase`);
    } catch (error) {
        console.error('Failed to delete stock item from Firebase:', error);
    }
}

/**
 * Sync transaction to Firestore
 */
async function syncTransaction(transaction) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    try {
        const docId = `${transaction.timestamp}_${transaction.item_id}`.replace(/[\/\s:]/g, '_');
        
        await db
            .collection('transactions')
            .doc(docId)
            .set({
                ...transaction,
                syncedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log(`✅ Synced transaction to Firebase`);
    } catch (error) {
        console.error('Failed to sync transaction:', error);
    }
}

/**
 * Sync ledger entity (customer, supplier, etc.)
 */
async function syncLedgerEntity(ledgerType, entity) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    const entityId = entity.id || entity.account_number;
    
    try {
        await db
            .collection('ledgers')
            .doc(ledgerType)
            .collection('entries')
            .doc(entityId)
            .set({
                ...entity,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        
        console.log(`✅ Synced ${ledgerType} entity ${entityId} to Firebase`);
    } catch (error) {
        console.error(`Failed to sync ${ledgerType} entity:`, error);
    }
}

/**
 * Sync treasury configuration (initialization settings)
 */
async function syncTreasuryConfig(config) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    try {
        await db
            .collection('settings')
            .doc('treasury_config')
            .set({
                ...config,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        console.log(`✅ Synced treasury config to Firebase`);
    } catch (error) {
        console.error('Failed to sync treasury config:', error);
    }
}

// ============================================
// Real-time Listeners
// ============================================

/**
 * Start listening for real-time updates from Firestore
 */
function startRealtimeListeners() {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return;
    
    stopRealtimeListeners();
    
    const factories = ['bahbit', 'old_factory', 'station', 'thaabaneya'];
    
    factories.forEach(factory => {
        const unsubscribe = db
            .collection('stock')
            .doc(factory)
            .collection('items')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.doc.metadata.hasPendingWrites) return;
                    
                    const item = { id: change.doc.id, ...change.doc.data() };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        handleRemoteStockUpdate(factory, item);
                    } else if (change.type === 'removed') {
                        handleRemoteStockDelete(factory, item.id);
                    }
                });
            }, (error) => {
                console.error(`Error listening to ${factory} stock:`, error);
            });
        
        FirebaseSync.listeners.push(unsubscribe);
    });
    
    console.log('✅ Real-time listeners started');
}

/**
 * Stop all real-time listeners
 */
function stopRealtimeListeners() {
    FirebaseSync.listeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
    });
    FirebaseSync.listeners = [];
}

/**
 * Handle remote stock update
 */
function handleRemoteStockUpdate(factory, item) {
    console.log(`📥 Remote update for ${factory}: ${item.id}`);
    
    if (typeof getCurrentFactory === 'function' && getCurrentFactory() === factory) {
        if (typeof loadStockData === 'function') loadStockData();
    }
}

/**
 * Handle remote stock deletion
 */
function handleRemoteStockDelete(factory, itemId) {
    console.log(`📥 Remote delete for ${factory}: ${itemId}`);
    
    if (typeof getCurrentFactory === 'function' && getCurrentFactory() === factory) {
        if (typeof loadStockData === 'function') loadStockData();
    }
}

// ============================================
// PUSH - Upload local data to cloud
// ============================================

/**
 * Push local data to cloud (with warning)
 */
async function performPushToCloud() {
    const lang = window.i18n?.currentLang() || 'en';
    
    // First warning
    const warning1 = lang === 'ar'
        ? '⚠️ تحذير: رفع البيانات للسحابة\n\nهذا سيرفع جميع البيانات المحلية إلى السحابة وقد يستبدل البيانات الموجودة هناك.\n\nهل أنت متأكد؟'
        : '⚠️ WARNING: Push to Cloud\n\nThis will upload ALL local data to the cloud and may overwrite existing cloud data.\n\nAre you sure?';
    
    if (!confirm(warning1)) return;
    
    // Second warning
    const warning2 = lang === 'ar'
        ? '⚠️ تأكيد نهائي\n\nهل أنت متأكد تماماً؟ لا يمكن التراجع عن هذا الإجراء!\n\nاضغط OK للمتابعة أو Cancel للإلغاء.'
        : '⚠️ FINAL CONFIRMATION\n\nAre you absolutely sure? This action cannot be undone!\n\nClick OK to proceed or Cancel to abort.';
    
    if (!confirm(warning2)) return;
    
    await executePushToCloud();
}

/**
 * Execute the actual push operation
 */
async function executePushToCloud() {
    if (!FirebaseSync.isEnabled || FirebaseSync.syncInProgress) return;
    
    FirebaseSync.syncInProgress = true;
    showSyncStatus('syncing');
    
    let totalSynced = 0;
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const factories = ['bahbit', 'old_factory', 'station', 'thaabaneya'];
        
        // Push stock for each factory
        for (const factory of factories) {
            try {
                const items = await eel.get_all_items({ factory: factory })();
                if (items && items.length > 0) {
                    await syncAllStockItems(factory, items);
                    totalSynced += items.length;
                }
            } catch (error) {
                console.error(`Failed to push ${factory}:`, error);
            }
        }
        
        // Push customers
        try {
            const customers = await eel.get_all_customers({})();
            for (const customer of (customers || [])) {
                await syncLedgerEntity('customers', customer);
                totalSynced++;
            }
        } catch (error) {
            console.error('Failed to push customers:', error);
        }
        
        // Push suppliers
        try {
            const suppliers = await eel.get_all_suppliers({})();
            for (const supplier of (suppliers || [])) {
                await syncLedgerEntity('suppliers', supplier);
                totalSynced++;
            }
        } catch (error) {
            console.error('Failed to push suppliers:', error);
        }
        
        // Push treasury
        try {
            const treasury = await eel.get_all_treasury({})();
            for (const account of (treasury || [])) {
                await syncLedgerEntity('treasury', account);
                totalSynced++;
            }
        } catch (error) {
            console.error('Failed to push treasury:', error);
        }
        
        // Push treasury config (initialization settings)
        try {
            const treasuryConfig = await eel.get_treasury_config()();
            if (treasuryConfig) {
                await syncTreasuryConfig(treasuryConfig);
                console.log('✅ Synced treasury config to Firebase');
            }
        } catch (error) {
            console.error('Failed to push treasury config:', error);
        }
        
        FirebaseSync.lastSyncTime = new Date();
        showSyncStatus('synced');
        
        console.log(`✅ Push completed: ${totalSynced} items pushed to cloud`);
        
        if (typeof showToast === 'function') {
            showToast(lang === 'ar' 
                ? `تم الرفع: ${totalSynced} عنصر إلى السحابة` 
                : `Pushed ${totalSynced} items to cloud`, 'success');
        }
        
    } catch (error) {
        console.error('Push failed:', error);
        showSyncStatus('error');
        if (typeof showToast === 'function') {
            showToast(lang === 'ar' ? 'فشل الرفع' : 'Push failed', 'error');
        }
    } finally {
        FirebaseSync.syncInProgress = false;
    }
}

// ============================================
// PULL - Download cloud data to local
// ============================================

/**
 * Pull data from cloud to local
 */
async function performPullFromCloud(silent = false) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || FirebaseSync.syncInProgress || !db) {
        console.log('Pull aborted: configured=' + isConfigured() + ', enabled=' + FirebaseSync.isEnabled + ', inProgress=' + FirebaseSync.syncInProgress);
        return;
    }
    
    FirebaseSync.syncInProgress = true;
    showSyncStatus('syncing');
    
    let totalPulled = 0;
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const factories = ['bahbit', 'old_factory', 'station', 'thaabaneya'];
        
        // Pull stock for each factory
        for (const factory of factories) {
            try {
                console.log(`📥 Pulling from stock/${factory}/items...`);
                
                const snapshot = await db
                    .collection('stock')
                    .doc(factory)
                    .collection('items')
                    .get();
                
                console.log(`📦 ${factory}: Found ${snapshot.size} items in cloud`);
                
                if (!snapshot.empty) {
                    for (const doc of snapshot.docs) {
                        const item = { id: doc.id, ...doc.data() };
                        delete item.lastUpdated;
                        
                        console.log(`  - Importing: ${item.id} (${item.name})`);
                        
                        try {
                            const result = await eel.import_item_from_cloud(factory, item)();
                            console.log(`  - Result:`, result);
                            if (result && result.success) {
                                totalPulled++;
                            }
                        } catch (err) {
                            console.error(`Failed to import item ${item.id}:`, err);
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to pull ${factory}:`, error);
            }
        }
        
        // Pull customers
        try {
            const snapshot = await db
                .collection('ledgers')
                .doc('customers')
                .collection('entries')
                .get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const customer = { id: doc.id, ...doc.data() };
                    delete customer.lastUpdated;
                    await eel.import_customer_from_cloud(customer)();
                    totalPulled++;
                }
            }
        } catch (error) {
            console.error('Failed to pull customers:', error);
        }
        
        // Pull suppliers
        try {
            const snapshot = await db
                .collection('ledgers')
                .doc('suppliers')
                .collection('entries')
                .get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const supplier = { id: doc.id, ...doc.data() };
                    delete supplier.lastUpdated;
                    await eel.import_supplier_from_cloud(supplier)();
                    totalPulled++;
                }
            }
        } catch (error) {
            console.error('Failed to pull suppliers:', error);
        }
        
        // Pull treasury
        try {
            const snapshot = await db
                .collection('ledgers')
                .doc('treasury')
                .collection('entries')
                .get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const account = { account_number: doc.id, ...doc.data() };
                    delete account.lastUpdated;
                    await eel.import_treasury_from_cloud(account)();
                    totalPulled++;
                }
            }
        } catch (error) {
            console.error('Failed to pull treasury:', error);
        }
        
        // Pull treasury config (initialization settings)
        try {
            const configDoc = await db
                .collection('settings')
                .doc('treasury_config')
                .get();
            
            if (configDoc.exists) {
                const config = configDoc.data();
                delete config.lastUpdated;
                await eel.import_treasury_config_from_cloud(config)();
                console.log('✅ Pulled treasury config from Firebase');
            }
        } catch (error) {
            console.error('Failed to pull treasury config:', error);
        }
        
        FirebaseSync.lastPullTime = new Date();
        showSyncStatus('synced');
        
        // Refresh UI if items were pulled
        if (totalPulled > 0) {
            if (typeof loadStockData === 'function') loadStockData();
            if (typeof loadCustomersData === 'function') loadCustomersData();
            if (typeof loadSuppliersData === 'function') loadSuppliersData();
            if (typeof loadTreasuryData === 'function') loadTreasuryData();
            if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
            
            if (!silent && typeof showToast === 'function') {
                showToast(lang === 'ar' 
                    ? `تم التحميل: ${totalPulled} عنصر من السحابة` 
                    : `Pulled ${totalPulled} items from cloud`, 'success');
            }
        } else {
            // Still refresh treasury summary even if no items pulled (config might have changed)
            if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
            
            if (!silent && typeof showToast === 'function') {
                showToast(lang === 'ar' 
                    ? 'لا توجد بيانات جديدة في السحابة' 
                    : 'No new data in cloud', 'info');
            }
        }
        
    } catch (error) {
        console.error('Pull failed:', error);
        showSyncStatus('error');
        if (!silent && typeof showToast === 'function') {
            showToast(lang === 'ar' ? 'فشل التحميل' : 'Pull failed', 'error');
        }
    } finally {
        FirebaseSync.syncInProgress = false;
    }
}

// ============================================
// FORCE PULL - Clear local and download from cloud
// ============================================

/**
 * Force pull from cloud (clears all local data first)
 * This operation has multiple warning layers to prevent accidents
 */
async function performForcePullFromCloud() {
    const lang = window.i18n?.currentLang() || 'en';
    
    // Warning 1 - Initial warning
    const warning1 = lang === 'ar'
        ? '⚠️ تحذير خطير: استبدال البيانات المحلية\n\n' +
          'هذا الإجراء سيحذف جميع البيانات المحلية بالكامل ويستبدلها ببيانات السحابة.\n\n' +
          'سيتم حذف:\n' +
          '• جميع المخزون\n' +
          '• جميع العملاء والموردين\n' +
          '• جميع حسابات الخزينة\n' +
          '• إعدادات تهيئة الخزينة\n\n' +
          'هل أنت متأكد أنك تريد المتابعة؟'
        : '⚠️ DANGEROUS OPERATION: Replace Local Data\n\n' +
          'This action will COMPLETELY DELETE all local data and replace it with cloud data.\n\n' +
          'The following will be deleted:\n' +
          '• All stock items\n' +
          '• All customers and suppliers\n' +
          '• All treasury accounts\n' +
          '• Treasury initialization settings\n\n' +
          'Are you sure you want to proceed?';
    
    if (!confirm(warning1)) return;
    
    // Warning 2 - Type confirmation
    const confirmText = lang === 'ar' ? 'احذف بياناتي' : 'DELETE MY DATA';
    const warning2 = lang === 'ar'
        ? `⚠️ تأكيد إضافي\n\nلتأكيد هذا الإجراء، اكتب:\n"${confirmText}"\n\n(بالضبط كما هو مكتوب)`
        : `⚠️ ADDITIONAL CONFIRMATION\n\nTo confirm this action, type:\n"${confirmText}"\n\n(exactly as shown)`;
    
    const userInput = prompt(warning2);
    if (userInput !== confirmText) {
        showToast(lang === 'ar' ? 'تم إلغاء العملية' : 'Operation cancelled', 'info');
        return;
    }
    
    // Warning 3 - Final confirmation
    const warning3 = lang === 'ar'
        ? '🚨 تحذير نهائي 🚨\n\n' +
          'أنت على وشك حذف جميع البيانات المحلية نهائياً.\n' +
          'لا يمكن التراجع عن هذا الإجراء!\n\n' +
          'هل تريد المتابعة؟'
        : '🚨 FINAL WARNING 🚨\n\n' +
          'You are about to PERMANENTLY DELETE all local data.\n' +
          'THIS ACTION CANNOT BE UNDONE!\n\n' +
          'Do you want to proceed?';
    
    if (!confirm(warning3)) return;
    
    // Execute force pull
    await executeForcePullFromCloud();
}

/**
 * Execute the force pull operation
 */
async function executeForcePullFromCloud() {
    const { db, isConfigured } = window.firebaseConfig;
    const lang = window.i18n?.currentLang() || 'en';
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) {
        showToast(lang === 'ar' ? 'السحابة غير متصلة' : 'Cloud not connected', 'error');
        return;
    }
    
    if (FirebaseSync.syncInProgress) {
        showToast(lang === 'ar' ? 'المزامنة جارية بالفعل' : 'Sync already in progress', 'warning');
        return;
    }
    
    FirebaseSync.syncInProgress = true;
    showSyncStatus('syncing');
    
    try {
        // First, clear all local data
        const clearResult = await eel.clear_all_local_data()();
        
        if (!clearResult.success) {
            showToast(clearResult.message || (lang === 'ar' ? 'فشل في حذف البيانات' : 'Failed to clear data'), 'error');
            FirebaseSync.syncInProgress = false;
            showSyncStatus('error');
            return;
        }
        
        console.log('✅ Local data cleared, now pulling from cloud...');
        showToast(lang === 'ar' ? 'تم حذف البيانات المحلية، جاري التحميل من السحابة...' : 'Local data cleared, pulling from cloud...', 'info');
        
        // Now perform the regular pull
        FirebaseSync.syncInProgress = false; // Reset so performPullFromCloud can run
        await performPullFromCloud(false);
        
        // Refresh treasury summary
        if (typeof loadTreasurySummary === 'function') {
            await loadTreasurySummary();
        }
        
        showToast(lang === 'ar' ? 'تم استبدال البيانات بنجاح من السحابة' : 'Data successfully replaced from cloud', 'success');
        
    } catch (error) {
        console.error('Force pull failed:', error);
        showSyncStatus('error');
        showToast(lang === 'ar' ? 'فشل في استبدال البيانات' : 'Failed to replace data', 'error');
    } finally {
        FirebaseSync.syncInProgress = false;
    }
}

/**
 * Perform initial pull on app startup
 */
async function performInitialPull() {
    const { isConfigured } = window.firebaseConfig || {};
    
    if (!isConfigured || !isConfigured()) {
        console.log('⚠️ Firebase not configured - skipping initial pull');
        return;
    }
    
    console.log('🔄 Performing initial pull from cloud...');
    
    // Small delay to ensure app is fully loaded
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Perform silent pull
    await performPullFromCloud(true);
    
    console.log('✅ Initial pull completed');
}

// ============================================
// UI Functions
// ============================================

/**
 * Show sync status indicator
 */
function showSyncStatus(status) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    
    const lang = window.i18n?.currentLang() || 'en';
    
    switch (status) {
        case 'synced':
            indicator.textContent = '☁️ ✓';
            indicator.className = 'sync-indicator synced';
            indicator.title = lang === 'ar' ? 'متصل بالسحابة' : 'Connected to cloud';
            break;
        case 'syncing':
            indicator.textContent = '☁️ ⟳';
            indicator.className = 'sync-indicator syncing';
            indicator.title = lang === 'ar' ? 'جاري المزامنة...' : 'Syncing...';
            break;
        case 'error':
            indicator.textContent = '☁️ ✗';
            indicator.className = 'sync-indicator error';
            indicator.title = lang === 'ar' ? 'خطأ في المزامنة' : 'Sync error';
            break;
        case 'offline':
        default:
            indicator.textContent = '☁️ ✗';
            indicator.className = 'sync-indicator offline';
            indicator.title = lang === 'ar' ? 'غير متصل' : 'Not configured';
            break;
    }
}

// ============================================
// Exports
// ============================================

window.initFirebaseSync = initFirebaseSync;
window.performPushToCloud = performPushToCloud;
window.performPullFromCloud = performPullFromCloud;
window.performForcePullFromCloud = performForcePullFromCloud;
window.performInitialPull = performInitialPull;
window.syncStockItem = syncStockItem;
window.syncTransaction = syncTransaction;
window.syncLedgerEntity = syncLedgerEntity;
window.syncTreasuryConfig = syncTreasuryConfig;
window.deleteStockItemFromFirebase = deleteStockItemFromFirebase;
