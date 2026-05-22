// ============================================================
// MonthlyTargets.gs — จัดการ sheet "เป้าหมายรายเดือน"
// ============================================================

// เป้าหมายสะสม % ต่อเดือน (default) — แก้ได้ใน sheet โดยตรงหลัง setup
var DEFAULT_TARGETS_PCT = [0.05, 0.10, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.72, 0.80, 0.88, 1.00];

var THAI_FISCAL_MONTHS = [
  'ต.ค.', 'พ.ย.', 'ธ.ค.',
  'ม.ค.', 'ก.พ.', 'มี.ค.',
  'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.'
];

function createMonthlyTargetsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName(TARGETS_SHEET_NAME);
  if (existing) return existing;

  var sheet = ss.insertSheet(TARGETS_SHEET_NAME);

  // Header
  var header = [['เดือน (ปีงบ)', 'เดือนปฏิทิน', 'เป้าหมาย %', 'เป้าหมาย (บาท)', 'เบิกจ่ายจริง (บาท)', '% จริง', 'สถานะ']];
  sheet.getRange('A1:G1').setValues(header)
    .setBackground('#1565C0').setFontColor('#FFFFFF').setFontWeight('bold');

  // กรอก 12 เดือน
  var gregYear = FISCAL_YEAR - 543;
  var rows = [];
  for (var m = 1; m <= 12; m++) {
    var thaiLabel = getThaiMonthLabel_(m);
    var calLabel  = getCalMonthLabel_(m, gregYear);
    var targetPct = DEFAULT_TARGETS_PCT[m - 1];
    rows.push([thaiLabel, calLabel, targetPct, targetPct * TOTAL_BUDGET, 0, 0, '-']);
  }
  sheet.getRange(2, 1, 12, 7).setValues(rows);

  // Format
  sheet.getRange('C2:C13').setNumberFormat('0%');
  sheet.getRange('D2:E13').setNumberFormat('#,##0.00');
  sheet.getRange('F2:F13').setNumberFormat('0.00%');

  // หมายเหตุ
  sheet.getRange('A15').setValue('* คอลัมน์ C (เป้าหมาย %): แก้ได้เอง | คอลัมน์ E, F, G: อัปเดตอัตโนมัติ')
    .setFontColor('#666666').setFontStyle('italic');

  // Highlight header row สีสลับ
  for (var i = 0; i < 12; i++) {
    var bg = i % 2 === 0 ? '#FFFFFF' : '#F0F8FF';
    sheet.getRange(i + 2, 1, 1, 7).setBackground(bg);
  }

  // ปรับความกว้าง
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 90);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 70);

  return sheet;
}

function refreshMonthlyTargets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TARGETS_SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบ sheet "' + TARGETS_SHEET_NAME + '" — กรุณารัน Setup ก่อน');

  var spentByMonth = getSpentByMonth();
  var today = new Date();
  var currentFiscalMonth = getCurrentFiscalMonth_(today);

  for (var m = 1; m <= 12; m++) {
    var key = 'FY' + FISCAL_YEAR + '-M' + (m < 10 ? '0' : '') + m;
    var spent = spentByMonth[key] || 0;
    var targetPct = parseFloat(sheet.getRange(m + 1, 3).getValue()) || 0;
    var targetBaht = targetPct * TOTAL_BUDGET;
    var actualPct = TOTAL_BUDGET > 0 ? spent / TOTAL_BUDGET : 0;

    // อัปเดต target THB (คำนวณจาก % ที่อาจแก้ไข)
    sheet.getRange(m + 1, 4).setValue(targetBaht).setNumberFormat('#,##0.00');
    // actual
    sheet.getRange(m + 1, 5).setValue(spent).setNumberFormat('#,##0.00');
    sheet.getRange(m + 1, 6).setValue(actualPct).setNumberFormat('0.00%');

    // สถานะ
    var status;
    if (m > currentFiscalMonth) {
      status = '-';
    } else if (actualPct >= targetPct) {
      status = '✓';
    } else {
      status = '!';
    }
    sheet.getRange(m + 1, 7).setValue(status);

    // สี background ตามสถานะ
    var rowRange = sheet.getRange(m + 1, 1, 1, 7);
    if (m === currentFiscalMonth) {
      rowRange.setBackground('#FFF9C4'); // เหลือง — เดือนปัจจุบัน
    } else if (status === '✓') {
      rowRange.setBackground('#E8F5E9'); // เขียวอ่อน — ผ่านเป้า
    } else if (status === '!') {
      rowRange.setBackground('#FFEBEE'); // แดงอ่อน — ต่ำกว่าเป้า
    } else {
      var bg = m % 2 === 0 ? '#F0F8FF' : '#FFFFFF';
      rowRange.setBackground(bg);
    }
  }
}

// Fiscal month index ของวันนี้ (1 = ต.ค., 12 = ก.ย.)
function getCurrentFiscalMonth_(date) {
  var m = date.getMonth() + 1; // 1-12
  return m >= 10 ? m - 9 : m + 3;
}

// ชื่อเดือนไทย + ปี พ.ศ. (ย่อ) เช่น "ต.ค. 67"
function getThaiMonthLabel_(fiscalMonth) {
  var gregYear = FISCAL_YEAR - 543;
  var thYear;
  var name = THAI_FISCAL_MONTHS[fiscalMonth - 1];
  // fiscal M1-M3 = ต.ค.-ธ.ค. ปีก่อน (พ.ศ. FISCAL_YEAR-1)
  if (fiscalMonth <= 3) {
    thYear = (FISCAL_YEAR - 1) % 100; // เช่น 67
  } else {
    thYear = FISCAL_YEAR % 100; // เช่น 68
  }
  return name + ' ' + thYear;
}

// ชื่อเดือน Gregorian เช่น "Oct 2024"
function getCalMonthLabel_(fiscalMonth, gregYear) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var calMonth, calYear;
  if (fiscalMonth <= 3) {
    calMonth = fiscalMonth + 8; // 1→9(Oct index), 2→10(Nov), 3→11(Dec)
    calYear = gregYear - 1;
  } else {
    calMonth = fiscalMonth - 4; // 4→0(Jan), ..., 12→8(Sep)
    calYear = gregYear;
  }
  return months[calMonth] + ' ' + calYear;
}
