import ExcelJS from 'exceljs';

const EXPORT_PASSWORD = 'ZeenabHR-Locked-2026';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface LockedExportOptions {
  filename: string; // without extension
  sheetName?: string;
  title?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  meta?: Record<string, string | number>;
}

/**
 * Export data as a password-protected XLSX file with an integrity sheet
 * containing a SHA-256 hash of the exported data. Any tampering invalidates
 * the hash.
 */
export async function exportLockedXlsx(opts: LockedExportOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Zeenab HR';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(opts.sheetName || 'Report');

  let currentRow = 1;
  if (opts.title) {
    const titleRow = sheet.getRow(currentRow++);
    titleRow.getCell(1).value = opts.title;
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFEF4723' } };
    sheet.mergeCells(currentRow - 1, 1, currentRow - 1, Math.max(1, opts.headers.length));
    currentRow++; // blank line
  }

  const headerRow = sheet.getRow(currentRow++);
  opts.headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4723' } };
  });

  for (const row of opts.rows) {
    const r = sheet.getRow(currentRow++);
    row.forEach((val, i) => {
      r.getCell(i + 1).value = (val ?? '') as string | number;
    });
  }

  // Auto column widths
  opts.headers.forEach((h, i) => {
    let max = h.length;
    for (const row of opts.rows) {
      const v = row[i];
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    sheet.getColumn(i + 1).width = Math.min(Math.max(max + 2, 10), 40);
  });

  // Protect the data sheet
  await sheet.protect(EXPORT_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertRows: false,
    insertColumns: false,
    insertHyperlinks: false,
    deleteRows: false,
    deleteColumns: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });

  // Integrity sheet
  const serialized = JSON.stringify({ headers: opts.headers, rows: opts.rows });
  const hash = await sha256Hex(serialized);
  const integrity = workbook.addWorksheet('Integrity');
  integrity.getColumn(1).width = 24;
  integrity.getColumn(2).width = 80;
  const info: [string, string | number][] = [
    ['Generated At', new Date().toISOString()],
    ['Record Count', opts.rows.length],
    ['SHA-256 Hash', hash],
    ['Notice', 'This file is locked. Any modification invalidates the hash above.'],
  ];
  if (opts.meta) {
    for (const [k, v] of Object.entries(opts.meta)) info.push([k, v]);
  }
  info.forEach(([k, v], idx) => {
    const r = integrity.getRow(idx + 1);
    r.getCell(1).value = k;
    r.getCell(1).font = { bold: true };
    r.getCell(2).value = v;
  });
  await integrity.protect(EXPORT_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    insertRows: false,
    deleteRows: false,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const LOCKED_EXPORT_PASSWORD = EXPORT_PASSWORD;