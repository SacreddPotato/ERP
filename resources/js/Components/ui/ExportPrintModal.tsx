import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ColumnDef {
    key: string;
    label: string;
    /** Format value for print display. For Excel, raw values are used. */
    render?: (value: any, row: any) => string;
    /** If true, this column will be summed in the totals row. */
    summable?: boolean;
}

export interface HeaderField {
    label: string;
    value: string;
}

interface ExportPrintModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    /** Optional subtitle displayed below the title (e.g. entity code + name). */
    subtitle?: string;
    /** Key-value details shown as a summary block above the table (e.g. parent entity info). */
    headerFields?: HeaderField[];
    columns: ColumnDef[];
    data: any[];
    filename: string;
    t: (key: string) => string;
    /** When provided, shows a "Current Page / All Pages" toggle. Callback fetches all data. */
    onFetchAll?: () => Promise<any[]>;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function ExportPrintModal({ open, onClose, title, subtitle, headerFields, columns, data, filename, t, onFetchAll }: ExportPrintModalProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [useAllPages, setUseAllPages] = useState(false);
    const [allData, setAllData] = useState<any[] | null>(null);
    const [fetchingAll, setFetchingAll] = useState(false);

    useEffect(() => {
        if (open) {
            setSelected(new Set(columns.map(c => c.key)));
            setUseAllPages(false);
            setAllData(null);
            setFetchingAll(false);
        }
    }, [open, columns]);

    const toggleColumn = (key: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(columns.map(c => c.key)));
    const deselectAll = () => setSelected(new Set());

    const getSelectedColumns = () => columns.filter(c => selected.has(c.key));

    // Effective data: either all-pages data or current page data
    const effectiveData = useAllPages && allData ? allData : data;

    const handleToggleAllPages = async (wantAll: boolean) => {
        setUseAllPages(wantAll);
        if (wantAll && !allData && onFetchAll) {
            setFetchingAll(true);
            try {
                const result = await onFetchAll();
                setAllData(result);
            } catch {
                setUseAllPages(false);
            }
            setFetchingAll(false);
        }
    };

    const getRawValue = (col: ColumnDef, row: any): string => {
        const val = row[col.key];
        if (val == null) return '';
        return String(val);
    };

    const getDisplayValue = (col: ColumnDef, row: any): string => {
        if (col.render) return col.render(row[col.key], row);
        const val = row[col.key];
        if (val == null) return '';
        return String(val);
    };

    const computeTotals = (cols: ColumnDef[], rows: any[]) => {
        if (!cols.some(c => c.summable)) return null;
        const sums: Record<string, number> = {};
        cols.forEach(c => { if (c.summable) sums[c.key] = 0; });
        rows.forEach(row => {
            cols.forEach(c => {
                if (c.summable) sums[c.key] += Number(row[c.key]) || 0;
            });
        });
        return sums;
    };

    const exportExcel = () => {
        const cols = getSelectedColumns();
        if (cols.length === 0) return;
        const rows = effectiveData;
        const sums = computeTotals(cols, rows);

        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
        html += '<head><meta charset="utf-8">';
        html += '<style>td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial;font-size:12px}th{background:#f0f0f0;font-weight:bold}.total{background:#e8e8e8;font-weight:bold}.hdr-label{background:#f0f0f0;font-weight:bold;width:160px}</style>';
        html += '</head><body>';
        if (headerFields && headerFields.length > 0) {
            html += '<table style="margin-bottom:12px">';
            headerFields.forEach(f => {
                html += `<tr><td class="hdr-label">${escapeHtml(f.label)}</td><td>${escapeHtml(f.value)}</td></tr>`;
            });
            html += '</table>';
        }
        html += '<table>';
        html += '<tr>' + cols.map(c => `<th>${escapeHtml(c.label)}</th>`).join('') + '</tr>';
        rows.forEach(row => {
            html += '<tr>';
            cols.forEach(col => {
                const raw = row[col.key];
                if (typeof raw === 'number') {
                    html += `<td style="mso-number-format:'\\#\\,\\#\\#0\\.00'">${raw}</td>`;
                } else {
                    html += `<td>${escapeHtml(getRawValue(col, row))}</td>`;
                }
            });
            html += '</tr>';
        });
        if (sums) {
            html += '<tr class="total">';
            cols.forEach((col, i) => {
                if (col.summable && sums[col.key] !== undefined) {
                    html += `<td class="total" style="mso-number-format:'\\#\\,\\#\\#0\\.00'">${sums[col.key]}</td>`;
                } else if (i === 0) {
                    html += `<td class="total">${escapeHtml(t('total_label'))}</td>`;
                } else {
                    html += '<td class="total"></td>';
                }
            });
            html += '</tr>';
        }
        html += '</table></body></html>';

        const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
    };

    const printTable = () => {
        const cols = getSelectedColumns();
        if (cols.length === 0) return;
        const rows = effectiveData;
        const sums = computeTotals(cols, rows);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        let html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
        html += `<title>${escapeHtml(title)}</title>`;
        html += '<style>';
        html += 'body{font-family:Arial,sans-serif;margin:20px;direction:ltr}';
        html += 'h2{margin-bottom:4px;font-size:18px}';
        html += '.subtitle{font-size:13px;color:#444;margin-bottom:2px}';
        html += '.meta{font-size:11px;color:#666;margin-bottom:12px}';
        html += '.header-block{margin-bottom:14px;border:1px solid #999;border-collapse:collapse}';
        html += '.header-block td{border:1px solid #ccc;padding:4px 10px;font-size:12px}';
        html += '.header-block .hl{background:#f0f0f0;font-weight:bold;width:160px;white-space:nowrap}';
        html += 'table{width:100%;border-collapse:collapse}';
        html += 'th,td{border:1px solid #333;padding:6px 10px;font-size:12px;text-align:left}';
        html += 'th{background:#f0f0f0;font-weight:bold}';
        html += 'tr:nth-child(even){background:#fafafa}';
        html += '.total-row td{background:#e8e8e8;font-weight:bold;border-top:2px solid #333}';
        html += '@media print{body{margin:10px}h2{font-size:14px}}';
        html += '</style></head><body>';
        html += `<h2>${escapeHtml(title)}</h2>`;
        if (subtitle) html += `<p class="subtitle">${escapeHtml(subtitle)}</p>`;
        if (headerFields && headerFields.length > 0) {
            html += '<table class="header-block"><tbody>';
            for (let i = 0; i < headerFields.length; i += 2) {
                html += '<tr>';
                html += `<td class="hl">${escapeHtml(headerFields[i].label)}</td><td>${escapeHtml(headerFields[i].value)}</td>`;
                if (i + 1 < headerFields.length) {
                    html += `<td class="hl">${escapeHtml(headerFields[i + 1].label)}</td><td>${escapeHtml(headerFields[i + 1].value)}</td>`;
                } else {
                    html += '<td></td><td></td>';
                }
                html += '</tr>';
            }
            html += '</tbody></table>';
        }
        html += `<p class="meta">${rows.length} rows &mdash; ${new Date().toLocaleDateString()}</p>`;
        html += '<table><thead><tr>';
        cols.forEach(c => { html += `<th>${escapeHtml(c.label)}</th>`; });
        html += '</tr></thead><tbody>';
        rows.forEach(row => {
            html += '<tr>';
            cols.forEach(c => { html += `<td>${escapeHtml(getDisplayValue(c, row))}</td>`; });
            html += '</tr>';
        });
        if (sums) {
            html += '<tr class="total-row">';
            cols.forEach((col, i) => {
                if (col.summable && sums[col.key] !== undefined) {
                    const displayVal = col.render ? col.render(sums[col.key], {}) : String(sums[col.key]);
                    html += `<td>${escapeHtml(displayVal)}</td>`;
                } else if (i === 0) {
                    html += `<td>${escapeHtml(t('total_label'))}</td>`;
                } else {
                    html += '<td></td>';
                }
            });
            html += '</tr>';
        }
        html += '</tbody></table></body></html>';

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
        onClose();
    };

    return (
        <Modal open={open} onClose={onClose} title={t('export_options')} maxWidth="lg">
            {/* Page scope toggle — only when onFetchAll is provided */}
            {onFetchAll && (
                <div className="flex items-center gap-1 mb-4 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-fit">
                    <button
                        type="button"
                        onClick={() => handleToggleAllPages(false)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            !useAllPages
                                ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        {t('print_current_page')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleToggleAllPages(true)}
                        disabled={fetchingAll}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            useAllPages
                                ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        } disabled:opacity-50`}
                    >
                        {fetchingAll ? (
                            <span className="inline-flex items-center gap-1.5">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                {t('loading_all_data')}
                            </span>
                        ) : t('print_all_pages')}
                    </button>
                </div>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('select_columns')}</p>
            <div className="flex items-center gap-2 mb-3">
                <button type="button" onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                    {t('select_all')}
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button type="button" onClick={deselectAll} className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                    {t('deselect_all')}
                </button>
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    {selected.size}/{columns.length}
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-5 max-h-[280px] overflow-y-auto p-1">
                {columns.map(col => (
                    <label
                        key={col.key}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                        <input
                            type="checkbox"
                            checked={selected.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300 select-none">{col.label}</span>
                    </label>
                ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                {onFetchAll && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                        {effectiveData.length} rows
                    </span>
                )}
                {!onFetchAll && <span />}
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose}>{t('btn_cancel')}</Button>
                    <Button variant="secondary" onClick={printTable} disabled={selected.size === 0 || fetchingAll}>
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {t('btn_print')}
                    </Button>
                    <Button onClick={exportExcel} disabled={selected.size === 0 || fetchingAll}>
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('btn_export_excel')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
