// ============================================================
// Setup.gs — ตั้งค่าครั้งแรก และ refresh ทั้งหมด
// ============================================================

function initializeV2() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'ตั้งค่า งบประมาณ v2',
    'จะสร้างชีตใหม่ 3 ชีต:\n' +
    '  • ' + ROUNDS_SHEET_NAME + '\n' +
    '  • ' + TARGETS_SHEET_NAME + '\n' +
    '  • ' + DASH_SHEET_NAME + '\n\n' +
    'ข้อมูลใน sheet เดิมจะไม่ถูกแก้ไข\nดำเนินการต่อ?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('กำลังสร้าง sheet...', 'งบประมาณ v2', 5);
    createRoundsSheet();
    createMonthlyTargetsSheet();
    createDashboardSheet();
    refreshAll_();
    SpreadsheetApp.getActiveSpreadsheet().toast('ตั้งค่าเสร็จแล้ว ✓', 'งบประมาณ v2', 4);
  } catch (e) {
    ui.alert('เกิดข้อผิดพลาด', e.message, ui.ButtonSet.OK);
  }
}

function refreshAll() {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('กำลังอัปเดตข้อมูล...', 'งบประมาณ v2', 10);
    refreshAll_();
    SpreadsheetApp.getActiveSpreadsheet().toast('อัปเดตเสร็จแล้ว ✓', 'งบประมาณ v2', 3);
  } catch (e) {
    SpreadsheetApp.getUi().alert('เกิดข้อผิดพลาด', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function refreshAll_() {
  refreshRoundsSheet();
  refreshMonthlyTargets();
  refreshDashboard();
}

// ลบ sheet ใหม่ทั้ง 3 ชีต (สำหรับ reset — รัน manual ใน Script Editor)
function resetV2Sheets() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'ยืนยันการลบ sheet',
    'จะลบ sheet: ' + ROUNDS_SHEET_NAME + ', ' + TARGETS_SHEET_NAME + ', ' + DASH_SHEET_NAME + '\nแน่ใจหรือไม่?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [ROUNDS_SHEET_NAME, TARGETS_SHEET_NAME, DASH_SHEET_NAME].forEach(function(name) {
    var s = ss.getSheetByName(name);
    if (s) ss.deleteSheet(s);
  });
  ui.alert('ลบ sheet เสร็จแล้ว สามารถรัน Setup ใหม่ได้เลย');
}
