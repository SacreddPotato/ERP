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
    lastSyncTimestamp: null // For incremental sync - only pull items modified after this
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
    console.log('✅ Firebase sync enabled (optimized - no real-time listeners)');
    
    // Set up button listeners
    setupSyncButtons();
    
    // Load last sync timestamp from localStorage
    const savedTimestamp = localStorage.getItem('firebase_last_sync_timestamp');
    if (savedTimestamp) {
        FirebaseSync.lastSyncTimestamp = new Date(savedTimestamp);
    }
    
    // Show connected status
    showSyncStatus('synced');
    
    // TO-DO
    // Perform initial pull from cloud on startup
    // performInitialPull();
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

// Auto-pull removed to reduce Firebase reads
// Users should manually pull when needed

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
 * Batch sync stock transactions (transaction-only file)
 */
async function syncAllStockTransactions(transactions) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return 0;
    if (!transactions || transactions.length === 0) return 0;
    
    try {
        const BATCH_SIZE = 500;
        let totalSynced = 0;
        
        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = transactions.slice(i, i + BATCH_SIZE);
            
            chunk.forEach(transaction => {
                const docId = `${transaction.timestamp}_${transaction.item_id}_${transaction.factory}`.replace(/[\/\s:]/g, '_');
                const docRef = db.collection('stock_transactions').doc(docId);
                batch.set(docRef, {
                    ...transaction,
                    syncedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            
            await batch.commit();
            totalSynced += chunk.length;
        }
        
        console.log(`✅ Batch synced ${totalSynced} stock transactions to Firebase`);
        return totalSynced;
    } catch (error) {
        console.error('Failed to batch sync stock transactions:', error);
        return 0;
    }
}

/**
 * Batch sync ledger transactions (per-module transaction files)
 */
async function syncAllLedgerTransactions(transactions) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return 0;
    if (!transactions || transactions.length === 0) return 0;
    
    try {
        const BATCH_SIZE = 500;
        let totalSynced = 0;
        
        for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = transactions.slice(i, i + BATCH_SIZE);
            
            chunk.forEach(transaction => {
                const ledgerType = transaction.ledger_type || 'unknown';
                const docId = `${transaction.timestamp}_${transaction.entity_id}`.replace(/[\/\s:]/g, '_');
                const docRef = db.collection(`${ledgerType}_transactions`).doc(docId);
                batch.set(docRef, {
                    ...transaction,
                    syncedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            
            await batch.commit();
            totalSynced += chunk.length;
        }
        
        console.log(`✅ Batch synced ${totalSynced} ledger transactions to Firebase`);
        return totalSynced;
    } catch (error) {
        console.error('Failed to batch sync ledger transactions:', error);
        return 0;
    }
}

/**
 * Sync ledger entity (customer, supplier, etc.) - single item
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
 * Batch sync multiple ledger entities (customers, suppliers, treasury)
 * Much more efficient than individual writes
 */
async function syncAllLedgerEntities(ledgerType, entities) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || !db) return 0;
    if (!entities || entities.length === 0) return 0;
    
    try {
        // Firestore batch limit is 500 operations
        const BATCH_SIZE = 500;
        let totalSynced = 0;
        
        for (let i = 0; i < entities.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = entities.slice(i, i + BATCH_SIZE);
            
            chunk.forEach(entity => {
                const entityId = entity.id || entity.account_number;
                const docRef = db.collection('ledgers').doc(ledgerType).collection('entries').doc(entityId);
                batch.set(docRef, {
                    ...entity,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            
            await batch.commit();
            totalSynced += chunk.length;
        }
        
        console.log(`✅ Batch synced ${totalSynced} ${ledgerType} to Firebase`);
        return totalSynced;
    } catch (error) {
        console.error(`Failed to batch sync ${ledgerType}:`, error);
        return 0;
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
// Real-time Listeners (DISABLED FOR EFFICIENCY)
// ============================================
// Real-time listeners have been removed to reduce Firebase reads.
// The app now uses manual push/pull which is much more cost-effective.
// Each onSnapshot listener was reading ALL documents on every page load.

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
        
        // Calculate total steps for progress tracking
        let totalSteps = 0;
        let completedSteps = 0;
        
        // Count steps: 4 factories + 5 ledger types + treasury config + 2 transaction types
        totalSteps = factories.length + 5 + 1 + 2; // 12 steps total
        
        const updateProgress = () => {
            const percentage = (completedSteps / totalSteps) * 100;
            updateSyncProgress(percentage);
        };
        
        updateProgress();
        
        // Push stock for each factory
        for (const factory of factories) {
            try {
                const items = await eel.get_all_items({ factory: factory })();
                if (items && items.length > 0) {
                    await syncAllStockItems(factory, items);
                    totalSynced += items.length;
                }
                completedSteps++;
                updateProgress();
            } catch (error) {
                console.error(`Failed to push ${factory}:`, error);
                completedSteps++;
                updateProgress();
            }
        }
        
        // Push customers (batch)
        try {
            const customers = await eel.get_all_customers({})();
            if (customers && customers.length > 0) {
                const synced = await syncAllLedgerEntities('customers', customers);
                totalSynced += synced;
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push customers:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push suppliers (batch)
        try {
            const suppliers = await eel.get_all_suppliers({})();
            if (suppliers && suppliers.length > 0) {
                const synced = await syncAllLedgerEntities('suppliers', suppliers);
                totalSynced += synced;
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push suppliers:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push treasury (batch)
        try {
            const treasury = await eel.get_all_treasury({})();
            if (treasury && treasury.length > 0) {
                const synced = await syncAllLedgerEntities('treasury', treasury);
                totalSynced += synced;
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push treasury:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push covenants (batch)
        try {
            const covenants = await eel.get_all_covenants({})();
            if (covenants && covenants.length > 0) {
                const synced = await syncAllLedgerEntities('covenants', covenants);
                totalSynced += synced;
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push covenants:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push advances (batch)
        try {
            const advances = await eel.get_all_advances({})();
            if (advances && advances.length > 0) {
                const synced = await syncAllLedgerEntities('advances', advances);
                totalSynced += synced;
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push advances:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push treasury config (initialization settings)
        try {
            const treasuryConfig = await eel.get_treasury_config()();
            if (treasuryConfig) {
                await syncTreasuryConfig(treasuryConfig);
                console.log('✅ Synced treasury config to Firebase');
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push treasury config:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push stock transactions (transaction-only file)
        try {
            const stockTransactions = await eel.get_all_stock_transactions()();
            if (stockTransactions && stockTransactions.length > 0) {
                const synced = await syncAllStockTransactions(stockTransactions);
                totalSynced += synced;
                console.log(`✅ Synced ${synced} stock transactions`);
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push stock transactions:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Push ledger transactions (transaction-only file)
        try {
            const ledgerTransactions = await eel.get_all_ledger_transactions_for_sync()();
            if (ledgerTransactions && ledgerTransactions.length > 0) {
                const synced = await syncAllLedgerTransactions(ledgerTransactions);
                totalSynced += synced;
                console.log(`✅ Synced ${synced} ledger transactions`);
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to push ledger transactions:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Complete
        updateSyncProgress(100);
        
        FirebaseSync.lastSyncTime = new Date();
        FirebaseSync.lastSyncTimestamp = new Date();
        localStorage.setItem('firebase_last_sync_timestamp', FirebaseSync.lastSyncTimestamp.toISOString());
        showSyncStatus('synced');
        
        console.log(`✅ Push completed: ${totalSynced} items pushed to cloud (using batch writes)`);
        
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
 * @param {boolean} silent - If true, don't show toast notifications
 * @param {boolean} skipExisting - If true, skip items that already exist locally (non-destructive)
 */
async function performPullFromCloud(silent = false, skipExisting = false) {
    const { db, isConfigured } = window.firebaseConfig;
    
    if (!isConfigured() || !FirebaseSync.isEnabled || FirebaseSync.syncInProgress || !db) {
        console.log('Pull aborted: configured=' + isConfigured() + ', enabled=' + FirebaseSync.isEnabled + ', inProgress=' + FirebaseSync.syncInProgress);
        return;
    }
    
    FirebaseSync.syncInProgress = true;
    showSyncStatus('syncing');
    
    let totalPulled = 0;
    let totalSkipped = 0;
    const lang = window.i18n?.currentLang() || 'en';
    
    try {
        const factories = ['bahbit', 'old_factory', 'station', 'thaabaneya'];
        
        // Calculate total steps for progress tracking
        // 4 factories + 5 ledger types + treasury config + stock txns + 5 ledger txn types
        const totalSteps = factories.length + 5 + 1 + 1 + 5; // 16 steps total
        let completedSteps = 0;
        
        const updateProgress = () => {
            const percentage = (completedSteps / totalSteps) * 100;
            updateSyncProgress(percentage);
        };
        
        updateProgress();
        
        // Pull stock for each factory (with incremental sync if available)
        const useIncremental = !skipExisting && FirebaseSync.lastSyncTimestamp;
        
        for (const factory of factories) {
            try {
                console.log(`📥 Pulling from stock/${factory}/items...${useIncremental ? ' (incremental)' : ' (full)'}`);
                
                let query = db.collection('stock').doc(factory).collection('items');
                
                // Only fetch items modified since last sync (reduces reads significantly)
                if (useIncremental) {
                    query = query.where('lastUpdated', '>', FirebaseSync.lastSyncTimestamp);
                }
                
                const snapshot = await query.get();
                
                console.log(`📦 ${factory}: Found ${snapshot.size} items in cloud`);
                
                if (!snapshot.empty) {
                    for (const doc of snapshot.docs) {
                        const item = { id: doc.id, ...doc.data() };
                        delete item.lastUpdated;
                        
                        console.log(`  - Importing: ${item.id} (${item.name})`);
                        
                        try {
                            const result = await eel.import_item_from_cloud(factory, item, skipExisting)();
                            console.log(`  - Result:`, result);
                            if (result && result.success) {
                                if (result.skipped) {
                                    totalSkipped++;
                                } else {
                                    totalPulled++;
                                }
                            }
                        } catch (err) {
                            console.error(`Failed to import item ${item.id}:`, err);
                        }
                    }
                }
                completedSteps++;
                updateProgress();
            } catch (error) {
                console.error(`Failed to pull ${factory}:`, error);
                completedSteps++;
                updateProgress();
            }
        }
        
        // Pull customers (with incremental sync if available)
        try {
            let query = db.collection('ledgers').doc('customers').collection('entries');
            
            if (useIncremental) {
                query = query.where('lastUpdated', '>', FirebaseSync.lastSyncTimestamp);
            }
            
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const customer = { id: doc.id, ...doc.data() };
                    delete customer.lastUpdated;
                    const result = await eel.import_customer_from_cloud(customer, skipExisting)();
                    if (result && result.success) {
                        if (result.skipped) {
                            totalSkipped++;
                        } else {
                            totalPulled++;
                        }
                    }
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull customers:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Pull suppliers (with incremental sync if available)
        try {
            let query = db.collection('ledgers').doc('suppliers').collection('entries');
            
            if (useIncremental) {
                query = query.where('lastUpdated', '>', FirebaseSync.lastSyncTimestamp);
            }
            
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const supplier = { id: doc.id, ...doc.data() };
                    delete supplier.lastUpdated;
                    const result = await eel.import_supplier_from_cloud(supplier, skipExisting)();
                    if (result && result.success) {
                        if (result.skipped) {
                            totalSkipped++;
                        } else {
                            totalPulled++;
                        }
                    }
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull suppliers:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Pull treasury (with incremental sync if available)
        try {
            let query = db.collection('ledgers').doc('treasury').collection('entries');
            
            if (useIncremental) {
                query = query.where('lastUpdated', '>', FirebaseSync.lastSyncTimestamp);
            }
            
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const account = { account_number: doc.id, ...doc.data() };
                    delete account.lastUpdated;
                    const result = await eel.import_treasury_from_cloud(account, skipExisting)();
                    if (result && result.success) {
                        if (result.skipped) {
                            totalSkipped++;
                        } else {
                            totalPulled++;
                        }
                    }
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull treasury:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Pull covenants (with incremental sync if available)
        try {
            let query = db.collection('ledgers').doc('covenants').collection('entries');
            
            if (useIncremental) {
                query = query.where('lastUpdated', '>', FirebaseSync.lastSyncTimestamp);
            }
            
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const covenant = { id: doc.id, ...doc.data() };
                    delete covenant.lastUpdated;
                    const result = await eel.import_covenant_from_cloud(covenant, skipExisting)();
                    if (result && result.success) {
                        if (result.skipped) {
                            totalSkipped++;
                        } else {
                            totalPulled++;
                        }
                    }
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull covenants:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Pull advances (with incremental sync if available)
        try {
            let query = db.collection('ledgers').doc('advances').collection('entries');
            
            if (useIncremental) {
                query = query.where('lastUpdated', '>', FirebaseSync.lastSyncTimestamp);
            }
            
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    const advance = { id: doc.id, ...doc.data() };
                    delete advance.lastUpdated;
                    const result = await eel.import_advance_from_cloud(advance, skipExisting)();
                    if (result && result.success) {
                        if (result.skipped) {
                            totalSkipped++;
                        } else {
                            totalPulled++;
                        }
                    }
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull advances:', error);
            completedSteps++;
            updateProgress();
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
                const result = await eel.import_treasury_config_from_cloud(config, skipExisting)();
                if (result && result.success && !result.skipped) {
                    console.log('✅ Pulled treasury config from Firebase');
                } else if (result && result.skipped) {
                    console.log('⏭️ Skipped treasury config (already exists locally)');
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull treasury config:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Pull stock transactions
        try {
            console.log('📥 Pulling stock transactions from cloud...');
            const snapshot = await db.collection('stock_transactions').get();
            console.log(`📦 Found ${snapshot.size} stock transactions in cloud`);
            
            if (!snapshot.empty) {
                const transactions = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    delete data.syncedAt;
                    transactions.push(data);
                });
                
                const result = await eel.import_stock_transactions_from_cloud(transactions, skipExisting)();
                if (result && result.success) {
                    totalPulled += result.imported || 0;
                    totalSkipped += result.skipped || 0;
                    console.log(`✅ Imported ${result.imported} stock transactions, skipped ${result.skipped}`);
                }
            }
            completedSteps++;
            updateProgress();
        } catch (error) {
            console.error('Failed to pull stock transactions:', error);
            completedSteps++;
            updateProgress();
        }
        
        // Pull ledger transactions (per-module: customer, supplier, treasury, covenant, advance)
        const ledgerTypes = ['customer', 'supplier', 'treasury', 'covenant', 'advance'];
        for (const ledgerType of ledgerTypes) {
            try {
                console.log(`📥 Pulling ${ledgerType} transactions from cloud...`);
                const snapshot = await db.collection(`${ledgerType}_transactions`).get();
                console.log(`📦 Found ${snapshot.size} ${ledgerType} transactions in cloud`);
                
                if (!snapshot.empty) {
                    const transactions = [];
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        delete data.syncedAt;
                        delete data.ledger_type; // Remove sync metadata, backend knows from ledgerType param
                        transactions.push(data);
                    });
                    
                    const result = await eel.import_ledger_transactions_from_cloud(ledgerType, transactions, skipExisting)();
                    if (result && result.success) {
                        totalPulled += result.imported || 0;
                        totalSkipped += result.skipped || 0;
                        console.log(`✅ Imported ${result.imported} ${ledgerType} transactions, skipped ${result.skipped}`);
                    }
                }
                completedSteps++;
                updateProgress();
            } catch (error) {
                console.error(`Failed to pull ${ledgerType} transactions:`, error);
                completedSteps++;
                updateProgress();
            }
        }
        
        // Complete
        updateSyncProgress(100);
        
        FirebaseSync.lastPullTime = new Date();
        FirebaseSync.lastSyncTimestamp = new Date();
        localStorage.setItem('firebase_last_sync_timestamp', FirebaseSync.lastSyncTimestamp.toISOString());
        showSyncStatus('synced');
        
        console.log(`✅ Pull completed: ${totalPulled} new, ${totalSkipped} skipped (incremental sync enabled)`);
        
        // Refresh UI if items were pulled
        if (totalPulled > 0) {
            if (typeof loadStockData === 'function') loadStockData();
            if (typeof loadTransactionData === 'function') loadTransactionData();
            if (typeof loadCustomersData === 'function') loadCustomersData();
            if (typeof loadSuppliersData === 'function') loadSuppliersData();
            if (typeof loadTreasuryData === 'function') loadTreasuryData();
            if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
            if (typeof loadCovenantsData === 'function') loadCovenantsData();
            if (typeof loadAdvancesData === 'function') loadAdvancesData();
            
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
    
    // Perform silent, non-destructive pull (skip existing local data)
    await performPullFromCloud(true, true);
    
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
            hideSyncProgress();
            break;
        case 'syncing':
            indicator.textContent = '☁️ ⟳';
            indicator.className = 'sync-indicator syncing';
            indicator.title = lang === 'ar' ? 'جاري المزامنة...' : 'Syncing...';
            showSyncProgress();
            break;
        case 'error':
            indicator.textContent = '☁️ ✗';
            indicator.className = 'sync-indicator error';
            indicator.title = lang === 'ar' ? 'خطأ في المزامنة' : 'Sync error';
            hideSyncProgress();
            break;
        case 'offline':
        default:
            indicator.textContent = '☁️ ✗';
            indicator.className = 'sync-indicator offline';
            indicator.title = lang === 'ar' ? 'غير متصل' : 'Not configured';
            hideSyncProgress();
            break;
    }
}

/**
 * Show sync progress bar
 */
function showSyncProgress() {
    const container = document.getElementById('sync-progress-container');
    if (container) {
        container.classList.remove('hidden');
        updateSyncProgress(0);
    }
}

/**
 * Hide sync progress bar
 */
function hideSyncProgress() {
    const container = document.getElementById('sync-progress-container');
    if (container) {
        container.classList.add('hidden');
    }
}

/**
 * Update sync progress
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} label - Optional label to show instead of percentage
 */
function updateSyncProgress(percentage, label = null) {
    const fill = document.getElementById('sync-progress-fill');
    const text = document.getElementById('sync-progress-text');
    
    if (fill) {
        fill.style.width = `${percentage}%`;
    }
    
    if (text) {
        text.textContent = label || `${Math.round(percentage)}%`;
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
