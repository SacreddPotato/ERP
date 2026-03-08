"""
Build script for creating the Warehouse Stock Logging executable
Run this script to create a standalone .exe file
"""

import subprocess
import sys
import os
import json
from datetime import datetime

# ============================================
# Google Drive Upload Configuration
# ============================================
# Replace this with your Google Drive folder link after first run
GOOGLE_DRIVE_FOLDER_ID = "1-EuwGrjEfsT9JWOt8W8eOA7xSsqh29jf" 
ENABLE_AUTO_UPLOAD = True  # Set to False to disable auto-upload

def ensure_firebase_deps():
    """Ensure firebase-admin is installed."""
    try:
        import firebase_admin
        print("firebase-admin is already installed.")
    except ImportError:
        print("Installing firebase-admin (for Firebase version push)...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'firebase-admin'])


def main():
    print("=" * 50)
    print("Building Warehouse Stock Logging Executable")
    print("=" * 50)
    
    # Install required packages
    print("\n[1/3] Checking dependencies...")
    
    try:
        import PyInstaller
        print("PyInstaller is already installed.")
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyinstaller'])
    
    try:
        from PIL import Image
        print("Pillow is already installed.")
    except ImportError:
        print("Installing Pillow (for icon conversion)...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pillow'])
    
    # Install Google Drive uploader if enabled
    if ENABLE_AUTO_UPLOAD:
        try:
            from pydrive2.auth import GoogleAuth
            from pydrive2.drive import GoogleDrive
            print("PyDrive2 is already installed.")
        except ImportError:
            print("Installing PyDrive2 (for Google Drive upload)...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pydrive2'])

    # Always ensure firebase-admin is available (needed for version push)
    ensure_firebase_deps()
    
    # Build command
    print("\n[2/3] Building executable...")
    
    # Check if icon exists
    icon_arg = []
    if os.path.exists('web/images.png'):
        icon_arg = ['--icon=web/images.png']
        print("Using web/images.png as app icon")
    
    cmd = [
        sys.executable, '-m', 'PyInstaller',
        '--name=EnterprisFlow',
        '--onefile',                    # Single exe file
        '--windowed',                   # No console window
        *icon_arg,                      # App icon (if exists)
        '--add-data=web;web',           # Include web folder
        '--hidden-import=bottle_websocket',
        '--hidden-import=eel',
        '--hidden-import=gdown',
        '--collect-all=eel',
        '--noconfirm',                  # Overwrite without asking
        'app.py'
    ]
    
    try:
        subprocess.check_call(cmd)
        print("\n[3/3] Build complete!")
        print("\n" + "=" * 50)
        print("SUCCESS! Your executable is ready:")
        print("  Location: dist/EnterprisFlow.exe")
        print("\nData will be stored in:")
        print("  %APPDATA%/WarehouseStockLogger/")
        print("=" * 50)
        
        # Always push version info to Firebase after a successful build
        download_url = None
        print("\n[4/5] Uploading to Google Drive...")
        if ENABLE_AUTO_UPLOAD and GOOGLE_DRIVE_FOLDER_ID != "YOUR_FOLDER_ID_HERE":
            try:
                download_url = upload_to_drive()
                print("  [OK] Upload complete!")
            except Exception as e:
                print(f"  [WARNING] Drive upload failed: {e}")
                print("  Firebase will still be updated without a download URL.")
        elif ENABLE_AUTO_UPLOAD:
            print("  [WARNING] GOOGLE_DRIVE_FOLDER_ID not set — skipping Drive upload.")
        else:
            print("  Drive upload disabled — skipping.")

        print("\n[5/5] Updating Firebase version info...")
        try:
            ensure_firebase_deps()
            update_firebase_version(download_url)
            print("  [OK] Firebase version updated!")
        except Exception as e:
            print(f"  [WARNING] Firebase update failed: {e}")
            print("  You can manually update Firestore → app_config/version")
        
    except subprocess.CalledProcessError as e:
        print(f"\nBuild failed with error: {e}")
        sys.exit(1)


def upload_to_drive():
    """Upload the built executable to Google Drive"""
    from pydrive2.auth import GoogleAuth
    from pydrive2.drive import GoogleDrive

    # Authenticate with Google Drive
    print("  -> Authenticating with Google Drive...")

    # Force offline access so we always get a refresh_token
    settings = {
        "client_config_backend": "file",
        "client_config_file": "client_secrets.json",
        "oauth_scope": ["https://www.googleapis.com/auth/drive"],
        "get_refresh_token": True,
        "save_credentials": True,
        "save_credentials_backend": "file",
        "save_credentials_file": "mycreds.txt",
    }
    gauth = GoogleAuth(settings=settings)

    # Try to load saved credentials
    gauth.LoadCredentialsFile("mycreds.txt")

    def _fresh_auth():
        """Delete stale credentials and perform a fresh browser login."""
        if os.path.exists("mycreds.txt"):
            os.remove("mycreds.txt")
        gauth.credentials = None
        print("  -> Please authorize in your browser...")
        gauth.LocalWebserverAuth()

    if gauth.credentials is None:
        # No saved creds — full browser auth
        print("  -> First time setup: Please authorize in your browser...")
        gauth.LocalWebserverAuth()
    elif gauth.access_token_expired:
        if gauth.credentials.refresh_token:
            try:
                print("  -> Refreshing expired credentials...")
                gauth.Refresh()
            except Exception as refresh_err:
                # invalid_grant or any other refresh failure — force re-auth
                print(f"  -> Token refresh failed ({refresh_err}), re-authenticating...")
                _fresh_auth()
        else:
            # Stale creds with no refresh token — re-auth
            print("  -> Credentials missing refresh token, re-authenticating...")
            _fresh_auth()
    else:
        gauth.Authorize()

    # Save the current credentials to a file
    gauth.SaveCredentialsFile("mycreds.txt")

    drive = GoogleDrive(gauth)
    
    # Read version from version.json
    version = "unknown"
    try:
        with open("version.json", 'r', encoding='utf-8') as f:
            version_data = json.load(f)
            version = version_data.get('version', 'unknown')
    except:
        pass
    
    # Generate filename with version and timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"EnterprisFlow_v{version}_{timestamp}.exe"
    
    print(f"  -> Uploading as: {filename}")
    
    # Check if file exists in the folder and delete old versions
    file_list = drive.ListFile({
        'q': f"'{GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false"
    }).GetList()
    
    # Delete old executables (keep only latest 3 versions)
    exe_files = [f for f in file_list if f['title'].startswith('EnterprisFlow_v') and f['title'].endswith('.exe')]
    exe_files.sort(key=lambda x: x['title'], reverse=True)
    
    if len(exe_files) >= 3:
        print(f"  -> Removing old versions (keeping latest 3)...")
        for old_file in exe_files[2:]:  # Keep latest 2, delete rest
            print(f"    - Deleting: {old_file['title']}")
            old_file.Delete()
    
    # Upload new file
    file_drive = drive.CreateFile({
        'title': filename,
        'parents': [{'id': GOOGLE_DRIVE_FOLDER_ID}]
    })
    
    file_drive.SetContentFile('dist/EnterprisFlow.exe')
    file_drive.Upload()
    
    # Make it shareable (anyone with link can download)
    file_drive.InsertPermission({
        'type': 'anyone',
        'value': 'anyone',
        'role': 'reader'
    })
    
    download_url = f"https://drive.google.com/uc?export=download&id={file_drive['id']}"
    alt_url = file_drive['alternateLink']
    print(f"  -> View URL: {alt_url}")
    print(f"  -> Direct Download URL: {download_url}")
    
    # Save download URL to a file for reference
    with open('latest_download_url.txt', 'w') as f:
        f.write(f"Version: {version}\n")
        f.write(f"Built: {timestamp}\n")
        f.write(f"View: {alt_url}\n")
        f.write(f"Download: {download_url}\n")
    
    print("  -> Download URL saved to: latest_download_url.txt")
    
    return download_url


def update_firebase_version(download_url):
    """Update Firebase app_config/version with latest version info and download URL"""
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    # Read version info from version.json
    version_data = {}
    try:
        with open('version.json', 'r', encoding='utf-8') as f:
            version_data = json.load(f)
    except:
        print("  [WARNING] Could not read version.json")
        return
    
    # Initialize Firebase Admin SDK
    # Uses service account key file (download from Firebase Console → Project Settings → Service Accounts)
    SERVICE_ACCOUNT_FILE = 'firebase-service-account.json'
    
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"  [WARNING] {SERVICE_ACCOUNT_FILE} not found!")
        print("  To set up:")
        print("  1. Go to Firebase Console → Project Settings → Service Accounts")
        print("  2. Click 'Generate new private key'")
        print("  3. Save the file as 'firebase-service-account.json' in the ERP folder")
        return
    
    # Initialize if not already initialized
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # Update the version document
    doc_data = {
        'version': version_data.get('version', '0.0'),
        'build_date': version_data.get('build_date', datetime.now().strftime('%Y-%m-%d')),
        'changelog': version_data.get('changelog', []),
        'download_url': download_url,
        'updated_at': firestore.SERVER_TIMESTAMP
    }
    
    db.collection('app_config').document('version').set(doc_data)
    print(f"  -> Firebase updated: version={doc_data['version']}, download_url set")


if __name__ == '__main__':
    main()
