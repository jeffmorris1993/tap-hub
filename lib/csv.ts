/**
 * Minimal RFC 4180 CSV writer for admin exports.
 *
 * Beyond quoting, this prefixes any value starting with = + - @ with a single
 * quote. Spreadsheets treat those as formulas, so a pasted-in cell could
 * otherwise execute when leadership opens an export in Excel or Sheets.
 */

const NEEDS_QUOTING = /[",\r\n]/;
const FORMULA_LEAD = /^[=+\-@\t\r]/;

function escapeCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  let s = String(value);
  if (FORMULA_LEAD.test(s)) s = `'${s}`;
  if (NEEDS_QUOTING.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // Leading BOM so Excel on Windows reads the file as UTF-8.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
