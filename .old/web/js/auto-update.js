/**
 * Auto-Update System for EnterprisFlow
 * =====================================
 * Checks Firebase for new versions and notifies users
 * Two update modes:
 * 1. Full EXE update (requires manual download/install)
 * 2. Hot-reload web files (automatic UI updates without EXE redistribution)
 */

const AutoUpdate = {
    currentVersion: null,
    latestVersion: null,
    updateAvailable: false,
    checkInterval: null,
    downloadUrl: null,
    isDownloading: false
};

/**
 * Initialize auto-update on app start
 */
async function initAutoUpdate() {
    try {
        // Get current version from Python backend
        AutoUpdate.currentVersion = await eel.get_app_version()();
        console.log(`📦 Current version: ${AutoUpdate.currentVersion}`);
        
        // Check for updates
        await checkForUpdates();
        
        // Check for updates every 30 minutes
        AutoUpdate.checkInterval = setInterval(checkForUpdates, 30 * 60 * 1000);
    } catch (error) {
        console.error('Failed to initialize auto-update:', error);
    }
}

/**
 * Check Firebase for new version
 */
async function checkForUpdates(silent = true) {
    console.log('🔄 [AUTO-UPDATE] Starting update check...');
    console.log(`📦 [AUTO-UPDATE] Current version: ${AutoUpdate.currentVersion}`);
    
    const { db, isConfigured } = window.firebaseConfig || {};
    
    if (!isConfigured || !isConfigured() || !db) {
        console.log('⚠️ [AUTO-UPDATE] Firebase not configured - auto-update disabled');
        return;
    }
    
    try {
        console.log('🌐 [AUTO-UPDATE] Fetching version info from Firebase: app_config/version');
        
        // Get version info from Firebase
        const versionDoc = await db.collection('app_config').doc('version').get();
        
        if (!versionDoc.exists) {
            console.log('❌ [AUTO-UPDATE] No version document found in Firebase');
            console.log('💡 [AUTO-UPDATE] Create document at: app_config/version');
            return;
        }
        
        const versionInfo = versionDoc.data();
        console.log('✅ [AUTO-UPDATE] Version document retrieved:', versionInfo);
        
        AutoUpdate.latestVersion = versionInfo.version;
        AutoUpdate.downloadUrl = versionInfo.download_url || null;
        
        console.log(`🔍 [AUTO-UPDATE] Version comparison:`);
        console.log(`   Current: ${AutoUpdate.currentVersion}`);
        console.log(`   Latest:  ${AutoUpdate.latestVersion}`);
        console.log(`   Download URL: ${AutoUpdate.downloadUrl || 'not set'}`);
        
        // Compare versions
        if (isNewerVersion(AutoUpdate.latestVersion, AutoUpdate.currentVersion)) {
            console.log('🎉 [AUTO-UPDATE] Update available!');
            console.log('📝 [AUTO-UPDATE] Changelog:', versionInfo.changelog);
            
            AutoUpdate.updateAvailable = true;
            
            if (!silent) {
                console.log('🔔 [AUTO-UPDATE] Showing update notification to user');
                showUpdateNotification(versionInfo);
            } else {
                console.log('🔕 [AUTO-UPDATE] Silent mode - showing badge only');
                showUpdateBadge();
            }
        } else {
            console.log('✅ [AUTO-UPDATE] App is up to date - no action needed');
            AutoUpdate.updateAvailable = false;
            hideUpdateBadge();
        }
    } catch (error) {
        console.error('❌ [AUTO-UPDATE] Failed to check for updates:', error);
        console.error('📍 [AUTO-UPDATE] Error details:', error.message);
    }
    
    console.log('🏁 [AUTO-UPDATE] Update check completed\n');
}

/**
 * Compare version strings (e.g., "1.31" vs "1.32")
 */
function isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const latestPart = latestParts[i] || 0;
        const currentPart = currentParts[i] || 0;
        
        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }
    
    return false;
}

/**
 * Show update notification modal with download button
 */
function showUpdateNotification(versionInfo) {
    const lang = window.i18n?.currentLang() || 'en';
    const tt = (key) => window.i18n?.t(key) || key;
    const hasDownload = !!versionInfo.download_url;
    const isRTL = lang === 'ar';
    
    const title = `${tt('update_title')}: ${versionInfo.version}`;
    
    const changelogHTML = versionInfo.changelog 
        ? `<ul style="text-align: ${isRTL ? 'right' : 'left'}; margin: 10px 0;">${versionInfo.changelog.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';

    // Remove existing notification if any
    dismissUpdateNotification();

    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-notification-content" ${isRTL ? 'style="direction: rtl; text-align: right;"' : ''}>
            <h3>${title}</h3>
            <p>${tt('update_new_version_available')}</p>
            ${changelogHTML}
            <p><strong>${tt('update_current_version')}:</strong> ${AutoUpdate.currentVersion}</p>
            <p><strong>${tt('update_new_version')}:</strong> ${versionInfo.version}</p>
            <div id="download-progress-container" style="display: none; margin: 15px 0;">
                <div class="download-progress-bar">
                    <div class="download-progress-fill" id="download-progress-fill"></div>
                </div>
                <p id="download-status-text" style="font-size: 13px; color: #888; margin-top: 5px;"></p>
            </div>
            <div class="update-notification-buttons">
                ${hasDownload ? `<button id="download-update-btn" onclick="startDownloadUpdate('${versionInfo.download_url}', '${versionInfo.version}')" class="btn btn-success">${tt('update_download')}</button>` : ''}
                <button onclick="dismissUpdateNotification()" class="btn btn-secondary">${tt('update_later')}</button>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
}

/**
 * Start downloading the update
 */
async function startDownloadUpdate(downloadUrl, version) {
    if (AutoUpdate.isDownloading) return;
    if (!downloadUrl || downloadUrl === 'null' || downloadUrl === 'undefined') {
        const tt = (key) => window.i18n?.t(key) || key;
        showToast(tt('update_download_failed') + ': No download URL available', 'error');
        return;
    }
    AutoUpdate.isDownloading = true;
    
    const tt = (key) => window.i18n?.t(key) || key;
    const btn = document.getElementById('download-update-btn');
    const progressContainer = document.getElementById('download-progress-container');
    const progressFill = document.getElementById('download-progress-fill');
    const statusText = document.getElementById('download-status-text');
    
    // Update UI
    if (btn) {
        btn.disabled = true;
        btn.textContent = tt('update_downloading');
        btn.classList.remove('btn-success');
        btn.classList.add('btn-disabled');
    }
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    if (progressFill) {
        progressFill.style.width = '10%';
    }
    if (statusText) {
        statusText.textContent = tt('update_downloading_update');
    }
    
    console.log(`⬇️ [AUTO-UPDATE] Starting download: ${downloadUrl}`);
    
    try {
        // Animate progress bar while downloading
        let fakeProgress = 10;
        const progressInterval = setInterval(() => {
            if (fakeProgress < 85) {
                fakeProgress += Math.random() * 5;
                if (progressFill) progressFill.style.width = fakeProgress + '%';
            }
        }, 500);
        
        // Call Python backend to download
        const result = await eel.download_update(downloadUrl, version)();
        
        clearInterval(progressInterval);
        
        if (result.success) {
            console.log(`✅ [AUTO-UPDATE] Download complete: ${result.path}`);
            
            if (progressFill) progressFill.style.width = '100%';
            if (progressFill) progressFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
            if (statusText) {
                statusText.textContent = `${tt('update_downloaded')}: ${result.filename}`;
            }
            
            if (btn) {
                btn.textContent = tt('update_open_location');
                btn.classList.remove('btn-disabled');
                btn.classList.add('btn-success');
                btn.disabled = false;
                btn.onclick = () => openDownloadedFile(result.path);
            }
            
            if (typeof showToast === 'function') {
                showToast(tt('update_downloaded_to_downloads'), 'success');
            }
        } else {
            throw new Error(result.error || 'Download failed');
        }
    } catch (error) {
        console.error(`❌ [AUTO-UPDATE] Download failed:`, error);
        
        if (progressFill) {
            progressFill.style.width = '100%';
            progressFill.style.background = '#e74c3c';
        }
        if (statusText) {
            statusText.textContent = `${tt('update_download_failed')}: ${error.message}`;
        }
        if (btn) {
            btn.textContent = tt('update_retry');
            btn.classList.remove('btn-disabled');
            btn.classList.add('btn-success');
            btn.disabled = false;
            btn.onclick = () => {
                AutoUpdate.isDownloading = false;
                startDownloadUpdate(downloadUrl, version);
            };
        }
    }
    
    AutoUpdate.isDownloading = false;
}

/**
 * Open the folder containing the downloaded file
 */
async function openDownloadedFile(filePath) {
    try {
        await eel.open_file_location(filePath)();
    } catch (error) {
        console.error('Failed to open file location:', error);
    }
}

/**
 * Dismiss update notification
 */
function dismissUpdateNotification() {
    const notification = document.querySelector('.update-notification');
    if (notification) {
        notification.remove();
    }
}

/**
 * Show subtle update badge in header
 */
function showUpdateBadge() {
    let badge = document.getElementById('update-badge');
    
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'update-badge';
        badge.className = 'update-badge';
        badge.innerHTML = (window.i18n?.t('update_badge')) || '🔔 Update Available';
        badge.onclick = () => checkForUpdates(false);
        
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(badge);
        }
    }
    
    badge.style.display = 'block';
}

/**
 * Hide update badge
 */
function hideUpdateBadge() {
    const badge = document.getElementById('update-badge');
    if (badge) {
        badge.style.display = 'none';
    }
}

/**
 * Manual update check (called by user)
 */
async function manualUpdateCheck() {
    const tt = (key) => window.i18n?.t(key) || key;
    
    if (typeof showToast === 'function') {
        showToast(tt('update_checking'), 'info');
    }
    
    await checkForUpdates(false);
    
    if (!AutoUpdate.updateAvailable) {
        if (typeof showToast === 'function') {
            showToast(tt('update_up_to_date'), 'success');
        }
    }
}

// Export functions
window.AutoUpdate = AutoUpdate;
window.initAutoUpdate = initAutoUpdate;
window.checkForUpdates = checkForUpdates;
window.manualUpdateCheck = manualUpdateCheck;
window.dismissUpdateNotification = dismissUpdateNotification;
window.startDownloadUpdate = startDownloadUpdate;
window.openDownloadedFile = openDownloadedFile;
