// ============================================================
// Dashboard.gs — จัดการ sheet "Dashboard"
// ============================================================

var DASH_TITLE_BG   = '#1565C0';
var DASH_KPI_BG     = '#E3F2FD';
var DASH_SECTION_BG = '#1565C0';
var DASH_ALT_BG     = '#F5F5F5';

function createDashboardSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName(DASH_SHEET_NAME);
  if (existing) {
    // ย้ายไปซ้ายสุด
    ss.setActiveSheet(existing);
    ss.moveActiveSheet(1);
    existing.setTabColor('#1565C0');
    return existing;
  }

  var sheet = ss.insertSheet(DASH_SHEET_NAME, 0);
  sheet.setTabColor('#1565C0');
  return sheet;
}

function refreshDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DASH_SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบ sheet "' + DASH_SHEET_NAME + '" — กรุณารัน Setup ก่อน');

  sheet.clearContents();
  sheet.clearFormats();

  writeDashboardHeader_(sheet);
  writeKPIBlock_(sheet);
  writeMonthlyProgressBlock_(sheet);
  writeRoundsSummaryBlock_(sheet);
  writeBudgetCodeBlock_(sheet);
}

// ─── Header ───────────────────────────────────────────────
function writeDashboardHeader_(sheet) {
  var gregYear = FISCAL_YEAR - 543;
  sheet.getRange('A1:H1').merge()
    .setValue('แดชบอร์ดงบประมาณ ปีงบประมาณ ' + FISCAL_YEAR + ' (FY' + gregYear + ')')
    .setBackground(DASH_TITLE_BG).setFontColor('#FFFFFF')
    .setFontSize(16).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  var now = new Date();
  sheet.getRange('A2:H2').merge()
    .setValue('อัปเดตล่าสุด: ' + Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + ' น.')
    .setFontColor('#666666').setFontStyle('italic')
    .setHorizontalAlignment('center');
}

// ─── KPI Block ────────────────────────────────────────────
function writeKPIBlock_(sheet) {
  var totalSpent    = getTotalSpent();
  var totalReserved = getReservedAmount();
  var remaining     = TOTAL_BUDGET - totalSpent - totalReserved;
  var pctSpent      = TOTAL_BUDGET > 0 ? totalSpent / TOTAL_BUDGET : 0;

  var labels = ['งบประมาณทั้งหมด', 'เบิกจ่ายแล้ว', 'กันเงิน', 'คงเหลือสุทธิ', '% เบิกจ่าย'];
  var values = [TOTAL_BUDGET, totalSpent, totalReserved, remaining, pctSpent];
  var formats = ['#,##0', '#,##0.00', '#,##0.00', '#,##0.00', '0.00%'];
  var bgs = ['#E3F2FD', '#E8F5E9', '#FFF9C4', '#FCE4EC', '#F3E5F5'];

  sheet.getRange('A4:H4').merge().setValue('สรุปภาพรวมงบประมาณ')
    .setBackground(DASH_SECTION_BG).setFontColor('#FFFFFF')
    .setFontWeight('bold').setHorizontalAlignment('center');

  for (var i = 0; i < 5; i++) {
    // ชื่อ KPI
    var labelCell = sheet.getRange(5, i * 1 + 1);
    // ใช้ 2 col ต่อ KPI: cols A-B, C-D, E-F, G-H, I-J → ต้องใช้ 10 cols
    // simplify: ใส่ทั้ง 5 KPI แบบ 2 cols ต่ออัน
    var startCol = i * 2 + 1;
    sheet.getRange(5, startCol, 1, 2).merge()
      .setValue(labels[i])
      .setBackground(bgs[i]).setFontWeight('bold')
      .setHorizontalAlignment('center').setFontSize(9);
    sheet.getRange(6, startCol, 1, 2).merge()
      .setValue(values[i])
      .setBackground(bgs[i])
      .setNumberFormat(formats[i])
      .setFontSize(14).setFontWeight('bold')
      .setHorizontalAlignment('center');
    sheet.setRowHeight(6, 35);
  }
}

// ─── Monthly Progress ─────────────────────────────────────
function writeMonthlyProgressBlock_(sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetsSheet = ss.getSheetByName(TARGETS_SHEET_NAME);

  var startRow = 9;
  sheet.getRange(startRow, 1, 1, 10).merge()
    .setValue('ความก้าวหน้ารายเดือน')
    .setBackground(DASH_SECTION_BG).setFontColor('#FFFFFF')
    .setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  var colHeaders = ['เดือน', 'เดือนปฏิทิน', 'เป้าหมาย %', 'เป้าหมาย (บาท)', 'เบิกจ่ายจริง (บาท)', '% จริง', 'ผลต่าง %', 'สถานะ'];
  sheet.getRange(startRow, 1, 1, 8).setValues([colHeaders])
    .setBackground('#546E7A').setFontColor('#FFFFFF').setFontWeight('bold');
  startRow++;

  if (!targetsSheet) {
    sheet.getRange(startRow, 1).setValue('ยังไม่มีข้อมูล เป้าหมายรายเดือน');
    return;
  }

  var today = new Date();
  var currentFiscalMonth = getCurrentFiscalMonth_(today);

  for (var m = 1; m <= 12; m++) {
    var srcRow = m + 1;
    var thaiMonth = targetsSheet.getRange(srcRow, 1).getValue();
    var calMonth  = targetsSheet.getRange(srcRow, 2).getValue();
    var targetPct = parseFloat(targetsSheet.getRange(srcRow, 3).getValue()) || 0;
    var targetBaht= parseFloat(targetsSheet.getRange(srcRow, 4).getValue()) || 0;
    var actualBaht= parseFloat(targetsSheet.getRange(srcRow, 5).getValue()) || 0;
    var actualPct = parseFloat(targetsSheet.getRange(srcRow, 6).getValue()) || 0;
    var statusVal = targetsSheet.getRange(srcRow, 7).getValue();

    var diff = m <= currentFiscalMonth ? actualPct - targetPct : 0;
    var rowData = [thaiMonth, calMonth, targetPct, targetBaht, actualBaht, actualPct, m <= currentFiscalMonth ? diff : '', statusVal];
    var dataRange = sheet.getRange(startRow, 1, 1, 8);
    dataRange.setValues([rowData]);
    dataRange.getCell(1, 3).setNumberFormat('0%');
    dataRange.getCell(1, 4).setNumberFormat('#,##0.00');
    dataRange.getCell(1, 5).setNumberFormat('#,##0.00');
    dataRange.getCell(1, 6).setNumberFormat('0.00%');
    if (m <= currentFiscalMonth) dataRange.getCell(1, 7).setNumberFormat('+0.00%;-0.00%');

    // สี
    var bg;
    if (m === currentFiscalMonth) {
      bg = '#FFF9C4'; // เดือนปัจจุบัน — เหลือง
    } else if (m < currentFiscalMonth) {
      bg = statusVal === '✓' ? '#E8F5E9' : '#FFEBEE';
    } else {
      bg = m % 2 === 0 ? DASH_ALT_BG : '#FFFFFF';
    }
    dataRange.setBackground(bg);

    startRow++;
  }
  sheet.setCurrentCell(sheet.getRange('A1'));
}

// ─── Rounds Summary ───────────────────────────────────────
function writeRoundsSummaryBlock_(sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var roundsSheet = ss.getSheetByName(ROUNDS_SHEET_NAME);

  var startRow = 23;
  sheet.getRange(startRow, 1, 1, 10).merge()
    .setValue('สรุปตามรอบงบประมาณ')
    .setBackground(DASH_SECTION_BG).setFontColor('#FFFFFF')
    .setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  var colHeaders = ['รอบที่', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'งบจัดสรร (บาท)', 'เบิกจ่าย (บาท)', 'คงเหลือ (บาท)', '% เบิกจ่าย'];
  sheet.getRange(startRow, 1, 1, 7).setValues([colHeaders])
    .setBackground('#546E7A').setFontColor('#FFFFFF').setFontWeight('bold');
  startRow++;

  if (!roundsSheet) {
    sheet.getRange(startRow, 1).setValue('ยังไม่มีข้อมูลรอบงบประมาณ');
    return;
  }

  for (var r = 0; r < 3; r++) {
    var srcRow = r + 2;
    var rowVals = roundsSheet.getRange(srcRow, 1, 1, 7).getValues()[0];
    sheet.getRange(startRow, 1, 1, 7).setValues([rowVals]);
    sheet.getRange(startRow, 2, 1, 2).setNumberFormat('d/m/yyyy');
    sheet.getRange(startRow, 4, 1, 3).setNumberFormat('#,##0.00');
    sheet.getRange(startRow, 7).setNumberFormat('0.00%');
    sheet.getRange(startRow, 1, 1, 7).setBackground(r % 2 === 0 ? '#FFFFFF' : DASH_ALT_BG);
    startRow++;
  }

  // แถวรวม
  var totalVals = roundsSheet.getRange(5, 1, 1, 7).getValues()[0];
  sheet.getRange(startRow, 1, 1, 7).setValues([totalVals])
    .setBackground(ROUNDS_TOTAL_BG || '#BDD7EE').setFontWeight('bold');
  sheet.getRange(startRow, 4, 1, 3).setNumberFormat('#,##0.00');
}

// ─── Budget Category Breakdown (4 หมวดหลัก + sub-detail) ──
var CAT_COLORS = {
  'คชจ.ขับเคลื่อน':  '#E8F5E9',  // เขียวอ่อน
  'คชจ.พื้นฐาน':     '#E3F2FD',  // ฟ้าอ่อน
  'คชจ.ตามสิทธิ์':   '#FFF9C4',  // เหลืองอ่อน
  'เงินนอกงบประมาณ': '#FCE4EC',  // ชมพูอ่อน
  'อื่นๆ':            '#F5F5F5'
};
var CAT_HEADER_COLORS = {
  'คชจ.ขับเคลื่อน':  '#388E3C',
  'คชจ.พื้นฐาน':     '#1565C0',
  'คชจ.ตามสิทธิ์':   '#F57F17',
  'เงินนอกงบประมาณ': '#C62828',
  'อื่นๆ':            '#546E7A'
};

function writeBudgetCodeBlock_(sheet) {
  var startRow = 30;

  // ─── Header section ───
  sheet.getRange(startRow, 1, 1, 5).merge()
    .setValue('สรุปเบิกจ่ายตามประเภทงบประมาณ')
    .setBackground(DASH_SECTION_BG).setFontColor('#FFFFFF')
    .setFontWeight('bold').setHorizontalAlignment('center');
  startRow++;

  // ─── แถว header คอลัมน์ ───
  sheet.getRange(startRow, 1, 1, 4)
    .setValues([['ประเภทงบประมาณ', 'เบิกจ่าย (บาท)', '% ของงบรวม', 'กันเงินรอเบิก (บาท)']])
    .setBackground('#546E7A').setFontColor('#FFFFFF').setFontWeight('bold');
  startRow++;

  var byCat  = getSpentByCategory();
  var totalSpent = getTotalSpent();

  // ─── แถวรวมทุกหมวด ───
  var overallPct = TOTAL_BUDGET > 0 ? totalSpent / TOTAL_BUDGET : 0;
  var totalReserved = getReservedAmount();
  sheet.getRange(startRow, 1, 1, 4)
    .setValues([['รวมทั้งหมด', totalSpent, overallPct, totalReserved]])
    .setBackground('#BDD7EE').setFontWeight('bold');
  sheet.getRange(startRow, 2).setNumberFormat('#,##0.00');
  sheet.getRange(startRow, 3).setNumberFormat('0.00%');
  sheet.getRange(startRow, 4).setNumberFormat('#,##0.00');
  startRow++;

  // ─── แต่ละหมวดหลัก + sub-detail ───
  CAT_ORDER.forEach(function(cat) {
    var catSpent = byCat[cat] || 0;
    if (catSpent === 0) return; // ข้ามหมวดที่ไม่มีข้อมูล

    var catPct = TOTAL_BUDGET > 0 ? catSpent / TOTAL_BUDGET : 0;
    var headerColor = CAT_HEADER_COLORS[cat] || '#546E7A';
    var rowColor    = CAT_COLORS[cat] || '#F5F5F5';

    // แถว header หมวด
    sheet.getRange(startRow, 1, 1, 4)
      .setValues([[cat, catSpent, catPct, '']])
      .setBackground(headerColor).setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.getRange(startRow, 2).setNumberFormat('#,##0.00');
    sheet.getRange(startRow, 3).setNumberFormat('0.00%');
    startRow++;

    // แถว sub-detail
    var subItems = getSpentByTypeInCategory(cat);
    subItems.forEach(function(item, idx) {
      var subPct = TOTAL_BUDGET > 0 ? item.amount / TOTAL_BUDGET : 0;
      var bg = idx % 2 === 0 ? rowColor : '#FFFFFF';
      sheet.getRange(startRow, 1, 1, 4)
        .setValues([['  ' + item.type, item.amount, subPct, '']])
        .setBackground(bg);
      sheet.getRange(startRow, 2).setNumberFormat('#,##0.00');
      sheet.getRange(startRow, 3).setNumberFormat('0.00%');
      startRow++;
    });
  });

  // ─── ปรับความกว้าง columns ───
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 160);
}
