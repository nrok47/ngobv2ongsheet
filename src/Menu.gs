// ============================================================
// Menu.gs — เมนูที่ปรากฏบน Google Sheet
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('งบประมาณ v2')
    .addItem('รีเฟรชทั้งหมด', 'refreshAll')
    .addItem('รีเฟรชแดชบอร์ดอย่างเดียว', 'refreshDashboard')
    .addItem('รีเฟรชเป้าหมายรายเดือน', 'refreshMonthlyTargets')
    .addItem('รีเฟรชรอบงบประมาณ', 'refreshRoundsSheet')
    .addSeparator()
    .addItem('ตั้งค่าครั้งแรก (Setup)', 'initializeV2')
    .addSeparator()
    .addItem('เกี่ยวกับ', 'showAbout')
    .addToUi();
}

function showAbout() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var totalSpent = 0;
  try { totalSpent = getTotalSpent(); } catch(e) {}

  SpreadsheetApp.getUi().alert(
    'งบประมาณ v2 — เกี่ยวกับ',
    'เวอร์ชัน: 1.0\n' +
    'ปีงบประมาณ: ' + FISCAL_YEAR + '\n' +
    'งบประมาณรวม: ' + TOTAL_BUDGET.toLocaleString() + ' บาท\n' +
    'เบิกจ่ายแล้ว: ' + totalSpent.toLocaleString('th', {minimumFractionDigits: 2}) + ' บาท\n\n' +
    'วิธีใช้:\n' +
    '1. เปิด sheet "' + ROUNDS_SHEET_NAME + '" กรอกวันที่และงบแต่ละรอบ\n' +
    '2. เปิด sheet "' + TARGETS_SHEET_NAME + '" ปรับ % เป้าหมายรายเดือน\n' +
    '3. กด "รีเฟรชทั้งหมด" เพื่ออัปเดต Dashboard\n\n' +
    'source code: github.com/nrok47/ngobv2ongsheet',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
