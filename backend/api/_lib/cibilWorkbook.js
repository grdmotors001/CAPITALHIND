// api/_lib/cibilWorkbook.js
//
// Renders the CIBIL TUDF "Data Submission Form" sheet layout with ExcelJS:
// title band, Header Segment (TUDF), the 6 segment-group labels, the 70
// column headers, and one data row per person (see api/_lib/cibilExport.js
// for how those rows are built).

import ExcelJS from 'exceljs';
import { REPORTING_MEMBER, TUDF_COLUMNS } from './cibilExport.js';

export function buildCibilWorkbook({ rows, asOnDateDDMMYYYY }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data Submission Form');

  const titleFont = { name: 'Arial', size: 11, bold: true };
  const labelFont = { name: 'Arial', size: 10, bold: true };
  const dataFont = { name: 'Arial', size: 10 };

  ws.getCell('C2').value =
    'DATA SUBMISSION FORM\nCIBIL INTELLECTUAL PROTERTY\nCREDIT INFORMATION BUREAU (INDIA) LIMITED';
  ws.getCell('C2').font = titleFont;
  ws.getCell('C2').alignment = { wrapText: true };
  ws.getCell('E3').value = 'ALL RIGHTS RESERVED';
  ws.getCell('E3').font = dataFont;

  ws.getCell('A4').value = 'Header Segment (TUDF)';
  ws.getCell('A4').font = labelFont;

  const headerLabels = [
    'Reporting Member ID', 'Short Name', 'Cycle Identification', 'Date Reported',
    'Reporting Password', 'Authentication Method', 'Future Use', 'Member Data',
  ];
  headerLabels.forEach((label, i) => {
    const cell = ws.getCell(5, 1 + i);
    cell.value = label;
    cell.font = labelFont;
  });

  ws.getCell('A6').value = REPORTING_MEMBER.memberId;
  ws.getCell('B6').value = REPORTING_MEMBER.shortName;
  ws.getCell('C6').value = REPORTING_MEMBER.cycleId;
  ws.getCell('D6').value = asOnDateDDMMYYYY;
  ws.getCell('F6').value = REPORTING_MEMBER.authenticationMethod;
  ws.getCell('G6').value = '00000';
  [1, 2, 3, 4, 6, 7].forEach((c) => { ws.getCell(6, c).font = dataFont; });

  ws.getCell('A8').value = 'Note: Check Mandatory Fields has data before submission';
  ws.getCell('A8').font = { name: 'Arial', size: 9, italic: true };

  // Segment-group labels (row 9) — best-effort placement matching the
  // reference file's column starts (A, D, P, V, X, AH).
  const groupStarts = [1, 4, 16, 22, 24, 34]; // A, D, P, V, X, AH (1-indexed columns)
  const groupLabels = [
    'Name Segment (PN)', 'Identification Segment (ID)', 'Telephone Segment (PT)',
    'Email Contact Segment (EC)', 'Address Segment (PA)', 'Account Segment (TL)',
  ];
  groupLabels.forEach((label, i) => {
    const cell = ws.getCell(9, groupStarts[i]);
    cell.value = label;
    cell.font = labelFont;
  });

  // Column headers (row 10)
  TUDF_COLUMNS.forEach((label, i) => {
    const cell = ws.getCell(10, i + 1);
    cell.value = label;
    cell.font = labelFont;
    cell.alignment = { wrapText: true, vertical: 'bottom' };
  });
  ws.getRow(10).height = 28;

  // Data rows, starting row 11
  rows.forEach((row, i) => {
    const excelRow = 11 + i;
    TUDF_COLUMNS.forEach((label, colIdx) => {
      const cell = ws.getCell(excelRow, colIdx + 1);
      const value = row[label];
      cell.value = value === undefined || value === null ? '' : value;
      cell.font = dataFont;
    });
  });

  // Reasonable column widths so the file is legible when opened, without
  // touching the actual data — matches "quick look" usability, not the
  // upload format itself (CIBIL parses by column position, not width).
  ws.columns.forEach((col) => { col.width = 16; });
  ws.getColumn(1).width = 22; // Consumer Name
  ws.getColumn(24).width = 30; // Address Line 1

  return wb;
}
