/**
 * Format a number with thousands separators and fixed decimal places.
 * e.g. fmtNum(12345.6) => "12,345.60"
 */
export function fmtNum(value: number | string, decimals = 2): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.' + '0'.repeat(decimals);
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Format an integer with thousands separators, no decimals.
 * e.g. fmtInt(12345) => "12,345"
 */
export function fmtInt(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US');
}

/**
 * Format a date string to date-only (strip time portion).
 * e.g. "2024-01-15 00:00:00" => "2024-01-15"
 */
export function fmtDate(value: string | null | undefined): string {
    if (!value) return '-';
    return value.slice(0, 10);
}

/**
 * Format a datetime string to readable format (no seconds).
 * e.g. "2024-01-15T14:30:00" => "2024-01-15 14:30"
 */
export function fmtDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    return value.replace('T', ' ').slice(0, 16);
}

/**
 * Escape HTML special characters for safe injection into HTML strings.
 */
export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
