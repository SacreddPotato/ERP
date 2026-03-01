# Auto-Update System Setup Guide

## Overview
Your ERP system now has an auto-update feature that checks Firebase for new versions and notifies users automatically.

## How It Works

### 1. Version Checking
- On app startup, it checks Firebase for the latest version
- Checks every 30 minutes while the app is running
- If a new version is available, shows a notification badge

### 2. Publishing Updates

#### Option A: Full EXE Update (Recommended for backend changes)
When you need to update the Python backend or add new features:

1. **Update version in app.py**:
   - Change `APP_VERSION = "1.31"` to the new version (e.g., "1.32")

2. **Update version.json**:
   ```json
   {
       "version": "1.32",
       "build_date": "2026-02-16",
       "changelog": [
           "Added new feature X",
           "Fixed bug Y",
           "Improved performance Z"
       ]
   }
   ```

3. **Build new EXE**:
   ```bash
   python build_exe.py
   ```

4. **Upload version info to Firebase**:
   - Go to Firebase Console → Firestore
   - Create/Update collection: `app_config`
   - Document ID: `version`
   - Fields:
     ```
     version: "1.32"
     build_date: "2026-02-16"
     changelog: ["Added new feature X", "Fixed bug Y"]
     download_url: "https://your-storage-url/EnterprisFlow.exe" (optional)
     ```

5. **Distribute new EXE** to users (via shared drive, email, etc.)

#### Option B: UI-Only Updates (No EXE redistribution needed)
For HTML/CSS/JS updates without Python backend changes:

**Future Enhancement**: We can implement loading web files from Firebase Storage so users get UI updates automatically without downloading a new EXE.

### 3. What Users See

When an update is available:
- **Update Badge**: Small badge appears in the header saying "🔔 Update Available"
- **Click the badge** to see update details including changelog
- **Manual Check**: Users can manually check for updates (we can add a button in settings)

## Firebase Setup

### Create version document in Firestore:

1. Firebase Console → Firestore Database
2. Create collection: `app_config`
3. Create document: `version`
4. Add fields:
   ```
   version: "1.31"
   build_date: "2026-02-15"
   changelog: [
       "Added transaction history dropdowns",
       "Added progress bar for Firebase sync",
       "Fixed opening balance editability"
   ]
   ```

## Testing

1. Set Firebase version to "1.32"
2. Your app is currently "1.31"
3. Start the app → Update notification should appear

## Publishing Workflow

```bash
# 1. Make your changes to code

# 2. Update version
# Edit app.py: APP_VERSION = "1.32"
# Edit version.json: "version": "1.32"

# 3. Build EXE
python build_exe.py

# 4. Update Firebase
# Go to Firestore → app_config/version
# Update: version = "1.32"

# 5. Distribute EXE to users
# Upload to shared drive / send via email
```

## Future Enhancements

1. **Auto-download**: Automatically download and install updates
2. **Hot-reload web files**: Load HTML/CSS/JS from Firebase (no EXE redistribution for UI changes)
3. **Rollback feature**: Revert to previous version if issues occur
4. **Update scheduling**: Schedule updates for specific times
5. **Incremental updates**: Only download changed files instead of full EXE

## Benefits

✅ Users are notified when updates are available
✅ Centralized version control via Firebase
✅ Changelog visible to users
✅ No need to manually notify each user
✅ Reduced support calls about "which version do I have?"

## Notes

- The auto-update check runs **silently** - users won't be interrupted unless an update is available
- Users can dismiss the notification and continue using the current version
- The system is **non-intrusive** - it only notifies, doesn't force updates
