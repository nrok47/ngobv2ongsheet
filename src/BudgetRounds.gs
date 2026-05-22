// ============================================================
// BudgetRounds.gs — จัดการ sheet "รอบงบประมาณ"
// ============================================================

var ROUNDS_HEADER_BG   = '#D0E4F7';  // ฟ้าอ่อน
var ROUNDS_SECTION_BG  = '#EBF5FB';
var ROUNDS_TOTAL_BG    = '#BDD7EE';

function createRoundsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName(ROUNDS_SHEET_NAME);
  if (existing) return existing;

  var sheet = ss.insertSheet(ROUNDS_SHEET_NAME);

  // ─── Section A: สรุปรอบงบประมาณ ───
  var headers = [
    ['รอบที่', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'งบจัดสรร (บาท)', 'เบิกจ่าย (บาท)', 'คงเหลือ (บาท)', '% เบิกจ่าย']
  ];

  // ค่า default ของ 3 รอบ (Gregorian dates ปี 2024-2025)
  var gregYear = FISCAL_YEAR - 543;
  var defaultRounds = [
    ['รอบ 1', new Date(gregYear - 1, 9, 1),  new Date(gregYear - 1, 11, 31), 500000, '', '', ''],
    ['รอบ 2', new Date(gregYear, 0, 1),       new Date(gregYear, 3, 30),      500000, '', '', ''],
    ['รอบ 3', new Date(gregYear, 4, 1),       new Date(gregYear, 8, 30),      400000, '', '', '']
  ];
  var totalRow = [['รวม', '', '', '=SUM(D2:D4)', '', '', '']];

  sheet.getRange('A1:G1').setValues(headers)
    .setBackground(ROUNDS_HEADER_BG)
    .setFontWeight('bold');
  sheet.getRange('A2:G4').setValues(defaultRounds);
  sheet.getRange('A5:G5').setValues(totalRow)
    .setBackground(ROUNDS_TOTAL_BG)
    .setFontWeight('bold');

  // Format วันที่
  sheet.getRange('B2:C4').setNumberFormat('d/m/yyyy');
  // Format ตัวเงิน
  sheet.getRange('D2:G5').setNumberFormat('#,##0.00');

  // หมายเหตุ
  sheet.getRange('A7').setValue('* คอลัมน์สีขาว (B, C, D): กรอกข้อมูลเอง | คอลัมน์สีฟ้า (E, F, G): อัปเดตอัตโนมัติเมื่อกด รีเฟรช')
    .setFontColor('#666666').setFontStyle('italic');

  // ─── Section B: แยกตามรหัสงบประมาณ ───
  var secBHeader = [
    ['รหัสงบประมาณ',
     'รอบ 1 (จัดสรร)', 'รอบ 1 (เบิก)',
     'รอบ 2 (จัดสรร)', 'รอบ 2 (เบิก)',
     'รอบ 3 (จัดสรร)', 'รอบ 3 (เบิก)',
     'รวมจัดสรร', 'รวมเบิก']
  ];
  sheet.getRange('A9:I9').setValues(secBHeader)
    .setBackground(ROUNDS_HEADER_BG)
    .setFontWeight('bold');
  sheet.getRange('A8').setValue('รายละเอียดตามรหัสงบประมาณ')
    .setFontWeight('bold').setFontSize(11);

  // ระบายสีคอลัมน์ที่ script เขียน
  sheet.getRange('C9:C').setBackground('#EBF5FB');
  sheet.getRange('E9:E').setBackground('#EBF5FB');
  sheet.getRange('G9:G').setBackground('#EBF5FB');
  sheet.getRange('I9:I').setBackground('#EBF5FB');

  // ปรับความกว้างคอลัมน์
  sheet.setColumnWidth(1, 160);
  for (var c = 2; c <= 9; c++) sheet.setColumnWidth(c, 120);

  return sheet;
}

function refreshRoundsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ROUNDS_SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบ sheet "' + ROUNDS_SHEET_NAME + '" — กรุณารัน Setup ก่อน');

  var rows = getActivityLog();

  // ── Section A: คำนวณยอดเบิกจ่ายต่อรอบ ──
  for (var r = 0; r < 3; r++) {
    var sheetRow = r + 2; // rows 2-4
    var startDate = sheet.getRange(sheetRow, 2).getValue();
    var endDate   = sheet.getRange(sheetRow, 3).getValue();
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) continue;

    var spent = getSpentInDateRange(rows, startDate, endDate);
    var alloc = parseFloat(sheet.getRange(sheetRow, 4).getValue()) || 0;
    var remaining = alloc - spent;
    var pct = alloc > 0 ? spent / alloc : 0;

    sheet.getRange(sheetRow, 5).setValue(spent);
    sheet.getRange(sheetRow, 6).setValue(remaining);
    sheet.getRange(sheetRow, 7).setValue(pct).setNumberFormat('0.00%');
  }

  // ─── Section B: แยกตามรหัสงบประมาณ ───
  // อ่าน date ranges ของทั้ง 3 รอบ
  var roundRanges = [];
  for (var i = 0; i < 3; i++) {
    roundRanges.push({
      start: sheet.getRange(i + 2, 2).getValue(),
      end:   sheet.getRange(i + 2, 3).getValue()
    });
  }

  // รวม spent ต่อ code ต่อ round
  var codeRoundSpent = {}; // { code: [spent_r1, spent_r2, spent_r3] }
  rows.filter(function(r) { return r.status === STATUS_PAID; })
    .forEach(function(r) {
      var code = r.budgetCode || '(ไม่ระบุ)';
      if (!codeRoundSpent[code]) codeRoundSpent[code] = [0, 0, 0];
      var d = r.datePaid || r.dateReserve;
      for (var ri = 0; ri < 3; ri++) {
        var rng = roundRanges[ri];
        if (rng.start instanceof Date && rng.end instanceof Date &&
            d >= rng.start && d <= rng.end) {
          codeRoundSpent[code][ri] += r.amount;
        }
      }
    });

  var codes = Object.keys(codeRoundSpent).sort();

  // อ่านข้อมูล allocation ที่ Mome กรอกไว้แล้ว (col B, D, F ใน Section B)
  var lastSecBRow = sheet.getLastRow();
  var existingAlloc = {}; // { code: [alloc_r1, alloc_r2, alloc_r3] }
  if (lastSecBRow >= 10) {
    var secBData = sheet.getRange(10, 1, lastSecBRow - 9, 7).getValues();
    secBData.forEach(function(row) {
      var code = String(row[0]).trim();
      if (code) {
        existingAlloc[code] = [
          parseFloat(row[1]) || 0,
          parseFloat(row[3]) || 0,
          parseFloat(row[5]) || 0
        ];
      }
    });
  }

  // รวม codes จากทั้ง 2 แหล่ง
  var allCodes = {};
  codes.forEach(function(c) { allCodes[c] = true; });
  Object.keys(existingAlloc).forEach(function(c) { allCodes[c] = true; });
  var sortedCodes = Object.keys(allCodes).sort();

  if (sortedCodes.length === 0) return;

  // Clear Section B data rows
  if (lastSecBRow >= 10) sheet.getRange(10, 1, Math.max(lastSecBRow - 9, 1), 9).clearContent();

  var secBRows = sortedCodes.map(function(code) {
    var alloc = existingAlloc[code] || [0, 0, 0];
    var spent = codeRoundSpent[code] || [0, 0, 0];
    return [
      code,
      alloc[0], spent[0],
      alloc[1], spent[1],
      alloc[2], spent[2],
      alloc[0] + alloc[1] + alloc[2],
      spent[0] + spent[1] + spent[2]
    ];
  });

  sheet.getRange(10, 1, secBRows.length, 9).setValues(secBRows)
    .setNumberFormat('#,##0.00');
  // รหัสงบประมาณ column ไม่ต้องใช้ format ตัวเงิน
  sheet.getRange(10, 1, secBRows.length, 1).setNumberFormat('@');

  // สีคอลัมน์ที่ script เขียน
  sheet.getRange(10, 3, secBRows.length, 1).setBackground('#EBF5FB');
  sheet.getRange(10, 5, secBRows.length, 1).setBackground('#EBF5FB');
  sheet.getRange(10, 7, secBRows.length, 1).setBackground('#EBF5FB');
  sheet.getRange(10, 9, secBRows.length, 1).setBackground('#EBF5FB');
}
