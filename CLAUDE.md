# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EnterprisFlow** is a warehouse stock and financial ledger management desktop app built with **Eel** (Python backend + HTML/CSS/JS frontend). It runs as a local desktop app using Edge/Chrome in app mode. Data is stored in CSV files locally (`%APPDATA%/WarehouseStockLogger/`) with optional Firebase Firestore cloud sync.

## Running the App

```bash
python app.py
```

Launches the Eel server and opens a browser window (Edge → Chrome → default fallback).

## Building the Executable

```bash
python build_exe.py
```

Uses PyInstaller to create `dist/EnterprisFlow.exe`. The build script also uploads to Google Drive and updates Firebase version info. Dependencies: `pyinstaller`, `pillow`, `pydrive2`, `firebase-admin`.

## Version Bumping

When releasing a new version, update **both**:
1. `APP_VERSION` in `app.py` (line ~81)
2. `version` field in `version.json`

## Architecture

### Backend (`app.py` — single ~3800-line file)
- All business logic lives in one file
- Functions decorated with `@eel.expose` are callable from the JS frontend via `eel.function_name()()`
- CSV read/write operations use a thread `Lock` (`file_lock`) for concurrency safety
- Helper functions: `read_csv()`, `write_csv()`, `append_csv()`, `ensure_csv_exists()`, `migrate_csv_headers()`
- On startup, `run_migrations()` adds new columns to existing CSV files without data loss

### Frontend (`web/`)
- `web/index.html` — Single-page app with tab-based navigation
- `web/js/app.js` (~6300 lines) — All UI logic, calls Python backend via `eel.function_name()()`
- `web/js/firebase-sync.js` — Push/pull/force-pull sync with Firestore (no auth, shared database)
- `web/js/firebase-config.js` — Firebase project configuration
- `web/js/auto-update.js` — Version checking against Firebase, update notifications
- `web/js/i18n.js` — Bilingual support (English/Arabic) with RTL layout switching
- `web/css/styles.css` — All styling

### Data Model
All data stored as CSV files in `%APPDATA%/WarehouseStockLogger/`:

- **Stock**: Per-factory CSV files (`stock_bahbit.csv`, `stock_old_factory.csv`, `stock_station.csv`, `stock_thaabaneya.csv`)
- **Ledgers**: `customers_ledger.csv`, `suppliers_ledger.csv`, `treasury_ledger.csv`, `covenants_ledger.csv`, `advances_ledger.csv`
- **Transaction logs**: `transactions_log.csv` (full log with edits/deletes), `stock_transactions.csv` (operations only), plus per-module transaction files (`customer_transactions.csv`, etc.)
- **Ledger log**: `ledger_transactions_log.csv` — combined log across all ledger modules

### Modules (tabs in the UI)
- **Stock Management** — Add/update items, incoming/outgoing transactions, internal transfers between factories
- **Customers** — Customer ledger with debit/credit tracking
- **Suppliers** — Supplier ledger with debit/credit tracking
- **Treasury** — Account management with initialization, starting capital, debit/credit
- **Covenants** — Employee covenant tracking
- **Advances** — Employee advance tracking
- **Transaction Log** — Combined view of stock and ledger transaction histories

### Key Patterns
- Factory context: The app operates in a selected factory context (`currentFactory`). Stock operations are scoped to the active factory.
- Transaction types use Arabic strings (e.g., `'وارد'` for incoming, `'صادر'` for outgoing)
- Delete operations require password authentication (`DELETE_PASSWORD` in `app.py`)
- Firebase sync is manual (push/pull buttons), not automatic, to reduce Firestore reads
- The `i18n.js` module uses `data-i18n` attributes on HTML elements for translation
