# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EnterprisFlow** is a warehouse stock, financial ledger, and treasury management desktop app built with **Laravel 12** (PHP 8.3+), **React 19** (TypeScript, Inertia.js), **Tailwind CSS v4**, and **NativePHP Electron** for desktop distribution. Data is stored in **SQLite** with optional **Firebase Firestore** cloud sync.

## Running the App

```bash
# Development (Laravel + Vite)
php artisan serve &
npm run dev

# Desktop mode (NativePHP Electron)
php artisan native:serve
```

## Building

```bash
# Build frontend assets
npm run build

# Build Windows .exe via NativePHP
php artisan native:build win
# Output: dist/win-unpacked/laravel.exe

# Type check
npx tsc --noEmit
```

## CI/CD

- **`.github/workflows/ci.yml`** — Runs `php artisan test` + `npx tsc --noEmit` on push/PR
- **`.github/workflows/tests.yml`** — PHP 8.3/8.4 test matrix
- **`.github/workflows/build.yml`** — Builds Windows .exe on version tags (`v*`), creates GitHub Release with artifacts

### Releasing a New Version

```bash
git tag v1.x.x
git push origin v1.x.x
```

GitHub Actions builds the `.exe` and creates a release automatically.

## Architecture

### Backend (Laravel)

```
app/
├── Http/Controllers/Api/   # REST API controllers
│   ├── StockController.php
│   ├── LedgerController.php
│   ├── TreasuryController.php
│   ├── TransactionLogController.php
│   ├── SyncController.php
│   └── SettingsController.php
├── Services/               # Business logic layer
│   ├── StockService.php
│   ├── LedgerService.php
│   ├── TreasuryService.php
│   ├── FirebaseSyncService.php
│   └── TransactionLogger.php
├── Models/                 # Eloquent models (SQLite)
│   ├── StockItem.php, StockTransaction.php
│   ├── Customer.php, Supplier.php, Covenant.php, Advance.php
│   ├── TreasuryAccount.php, TreasuryConfig.php
│   ├── TransactionLog.php, LedgerLog.php, LedgerTransaction.php
│   └── ...
├── Enums/                  # Category, Factory, Unit, TransactionType, etc.
└── Providers/
    └── NativeAppServiceProvider.php  # NativePHP config
```

API routes are defined in `routes/web.php` under `/api/*` prefix.

### Frontend (React + Inertia.js)

```
resources/js/
├── Pages/Dashboard.tsx          # Main 8-tab dashboard (entry point)
├── Components/
│   ├── ui/                      # Design system (Card, Button, Input, Modal, Badge, Toast, StatCard, Select, Textarea)
│   ├── stock/
│   │   ├── StockManager.tsx     # Add/update items, transactions form
│   │   └── StockTable.tsx       # Stock inventory table with sortable columns
│   ├── ledger/
│   │   └── LedgerPage.tsx       # Shared component for Customer/Supplier/Covenant/Advance ledgers
│   ├── treasury/
│   │   └── TreasuryPage.tsx     # Treasury init, accounts, transactions
│   ├── transactions/
│   │   └── TransactionLogPage.tsx  # Combined stock + ledger transaction log viewer
│   └── sync/
│       └── FirebaseSyncPanel.tsx   # Firebase push/pull/force-pull
├── Layouts/
│   └── AppLayout.tsx            # Global header, factory selector, locale toggle, footer
├── contexts/
│   └── AppContext.tsx            # Global state: locale, factory, translations, RTL
├── i18n/
│   └── index.ts                 # i18next setup
├── lib/
│   └── api.ts                   # Axios instance with CSRF
└── types/
    └── index.ts                 # TypeScript interfaces (StockItem, LedgerEntity, TransactionLog, LedgerLog, etc.)
```

### Translations

Translations live in `lang/en.json` and `lang/ar.json`. They are key-value JSON files loaded server-side and passed to the frontend via Inertia page props. The `t()` function from `AppContext` does simple key lookup with `:param` interpolation.

### Database

SQLite via Eloquent. Migrations are in `database/migrations/`. Key tables:
- `stock_items`, `stock_transactions` — inventory per factory
- `customers`, `suppliers`, `covenants`, `advances` — ledger entities
- `transaction_logs` — stock operation history
- `ledger_logs`, `ledger_transactions` — ledger operation history
- `treasury_accounts`, `treasury_configs` — treasury management

## Key Patterns

### Factory Context
The app operates in a selected factory context (bahbit, old_factory, station, thaabaneya). Stock operations are scoped to the active factory. The factory selector is in `AppLayout.tsx` header.

### Sortable Tables
Tables use a `SortHeader` component pattern with `sortBy`/`sortDir` state. Click a column header to sort; click again to toggle direction. Default sort for transaction tables is `logged_at` descending (newest first). This pattern exists in:
- `StockTable.tsx` — main stock table
- `TransactionLogPage.tsx` — stock and ledger transaction log tables (separate sort state for each)
- `LedgerPage.tsx` — expandable transaction sub-tables
- `TreasuryPage.tsx` — expandable transaction sub-tables

### Multi-Tag Search (TransactionLogPage)
The transaction log has a tag-based search system: type a keyword, press Enter to add it as a chip. Multiple tags can be active. An AND/OR toggle controls whether all tags must match (AND) or any tag matches (OR). Tags filter client-side across all text fields in each row.

### Expandable Transaction Rows
In LedgerPage and TreasuryPage, each entity row has a "Transactions" button that expands an inline sub-table showing that entity's transaction history. The sub-table has its own independent sort state (default: `logged_at` desc).

### Bilingual (EN/AR)
Full English and Arabic support with automatic RTL layout switching. Toggle in the header. Translation keys are in `lang/en.json` and `lang/ar.json`.

### Firebase Cloud Sync
Manual push/pull/force-pull synchronization with Firestore. No automatic sync. Config via `.env` (`FIREBASE_CREDENTIALS`, `FIREBASE_PROJECT_ID`).

### Delete Password
Delete operations require password authentication defined in backend configuration.

### NativePHP Auto-Updater
Desktop app auto-updates from GitHub Releases. Config in `.env` (`NATIVEPHP_UPDATER_ENABLED`, `GITHUB_REPO`, `GITHUB_OWNER`).

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.3+ |
| Frontend | React 19, TypeScript, Inertia.js |
| Styling | Tailwind CSS v4 |
| Desktop | NativePHP Electron |
| Database | SQLite |
| Cloud Sync | Firebase Firestore |
| Build/CI | GitHub Actions |
| i18n | i18next (EN/AR) |

## Important Notes

- The `tsconfig.json` has `"types": ["vite/client"]` to support `import.meta.glob`
- Path alias: `@/*` maps to `resources/js/*`
- Tests use `$this->withoutVite()` to avoid requiring Vite manifest in CI
- The `.env.example` has Firebase and NativePHP vars commented out
- The `config/nativephp.php` configures the desktop app (app_id: `com.enterprisflow.app`)
