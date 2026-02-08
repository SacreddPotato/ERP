"""
Build script for creating the Warehouse Stock Logging executable
Run this script to create a standalone .exe file
"""

import subprocess
import sys
import os

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
        '--collect-all=eel',
        '--noconfirm',                  # Overwrite without asking
        'app.py'
    ]
    
    try:
        subprocess.check_call(cmd)
        print("\n[3/3] Build complete!")
        print("\n" + "=" * 50)
        print("SUCCESS! Your executable is ready:")
        print("  Location: dist/WarehouseStockLogger.exe")
        print("\nData will be stored in:")
        print("  %APPDATA%/WarehouseStockLogger/")
        print("=" * 50)
    except subprocess.CalledProcessError as e:
        print(f"\nBuild failed with error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
