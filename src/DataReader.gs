// ============================================================
// DataReader.gs — อ่านข้อมูลจาก Activity Log (ไม่แตะ sheet อื่น)
// ============================================================

// หา sheet และ header row ของ Activity Log
// รองรับกรณีที่ header ไม่ได้อยู่ row 1 (เช่น อยู่กลาง sheet)
function findActivityLocation_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var newSheets = [ROUNDS_SHEET_NAME, TARGETS_SHEET_NAME, DASH_SHEET_NAME];
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    if (newSheets.indexOf(sheet.getName()) !== -1) continue; // ข้าม sheet ที่เราสร้างเอง

    var lastRow = sheet.getLastRow();
    if (lastRow === 0) continue;

    // Scan column A ทุก row หา header marker
    var scanRows = Math.min(lastRow, 300);
    var colA = sheet.getRange(1, COL_DATE_RESERVE, scanRows, 1).getValues();
    for (var r = 0; r < colA.length; r++) {
      if (String(colA[r][0]).trim() === ACTIVITY_HEADER_MARKER) {
        return { sheet: sheet, headerRow: r + 1 };
      }
    }
  }
  throw new Error(
    'ไม่พบหัวคอลัมน์ "' + ACTIVITY_HEADER_MARKER + '" ในทุก sheet (scan 300 rows แรก)\n' +
    'กรุณาตรวจสอบว่า column แรกของ activity log ชื่อ "' + ACTIVITY_HEADER_MARKER + '" จริง\n' +
    'หรือแก้ ACTIVITY_HEADER_MARKER ใน Config.gs ให้ตรงกับหัวคอลัมน์จริง'
  );
}

// ดึง Activity Log ทั้งหมด คืน array of object
// ข้าม row ที่ไม่มีวันที่ (เช่น row สรุป โอนเงินรอบ)
function getActivityLog() {
  var loc = findActivityLocation_();
  var sheet = loc.sheet;
  var dataStartRow = loc.headerRow + 1; // row ถัดจาก header

  var lastRow = sheet.getLastRow();
  if (lastRow < dataStartRow) return [];

  var data = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, 15).getValues();
  var rows = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[COL_DATE_RESERVE - 1];
    // ข้าม row ที่ไม่มีวันที่จริง
    if (!dateVal || !(dateVal instanceof Date) || isNaN(dateVal.getTime())) continue;

    var status = String(row[COL_STATUS - 1]).trim();
    var budgetCode = String(row[COL_BUDGET_CODE - 1]).trim();

    // COL_PO (H) = ยอดเบิกจ่าย/กันเงินจริง — ใช้สำหรับคำนวณการเงิน
    // COL_AMOUNT (F) = งบประมาณที่ตั้งไว้ (แผน) — เก็บไว้อ้างอิง
    var amount    = parseFloat(row[COL_PO - 1])     || 0;  // ยอดจริง (col H)
    var budgeted  = parseFloat(row[COL_AMOUNT - 1]) || 0;  // ยอดแผน (col F)

    var datePaid = row[COL_DATE_PAID - 1];
    if (!(datePaid instanceof Date) || isNaN(datePaid.getTime())) datePaid = null;

    rows.push({
      dateReserve: dateVal,
      datePaid: datePaid,
      responsible: String(row[COL_RESPONSIBLE - 1]).trim(),
      group: String(row[COL_GROUP - 1]).trim(),
      project: String(row[COL_PROJECT - 1]).trim(),
      amount: amount,      // ยอดจริง (col H) — ใช้คำนวณ KPI ทั้งหมด
      budgeted: budgeted,  // ยอดแผน (col F)
      budgetCode: budgetCode,
      status: status,
      adminLine: String(row[COL_ADMIN_LINE - 1]).trim()
    });
  }
  return rows;
}

// ยอดเบิกจ่ายจริง (สถานะ = เบิกจ่ายแล้ว)
function getTotalSpent() {
  return getActivityLog()
    .filter(function(r) { return r.status === STATUS_PAID; })
    .reduce(function(sum, r) { return sum + r.amount; }, 0);
}

// ยอดกันเงิน (สถานะ = กันเงิน)
function getReservedAmount() {
  return getActivityLog()
    .filter(function(r) { return r.status === STATUS_RESERVED; })
    .reduce(function(sum, r) { return sum + r.amount; }, 0);
}

// เบิกจ่ายแยกตามเดือนงบประมาณ → { 'FY2568-M01': 50000, ... }
// ใช้วันที่เบิกจ่าย (datePaid) ถ้ามี ไม่งั้นใช้ dateReserve
function getSpentByMonth() {
  var map = {};
  getActivityLog()
    .filter(function(r) { return r.status === STATUS_PAID; })
    .forEach(function(r) {
      var d = r.datePaid || r.dateReserve;
      var key = fiscalMonthKey_(d);
      map[key] = (map[key] || 0) + r.amount;
    });
  return map;
}

// เบิกจ่ายแยกตามรหัสงบประมาณ → { 'P1200...': 80000, ... }
function getSpentByBudgetCode() {
  var map = {};
  getActivityLog()
    .filter(function(r) { return r.status === STATUS_PAID; })
    .forEach(function(r) {
      var code = r.budgetCode || '(ไม่ระบุ)';
      map[code] = (map[code] || 0) + r.amount;
    });
  return map;
}

// เบิกจ่ายภายในช่วงวันที่ startDate–endDate (inclusive)
function getSpentInDateRange(rows, startDate, endDate) {
  return rows
    .filter(function(r) {
      if (r.status !== STATUS_PAID) return false;
      var d = r.datePaid || r.dateReserve;
      return d >= startDate && d <= endDate;
    })
    .reduce(function(sum, r) { return sum + r.amount; }, 0);
}

// แปลงวันที่ → key เดือนงบประมาณ 'FY2568-M01' … 'FY2568-M12'
// เดือนตุลาคม = M01, กันยายน = M12
function fiscalMonthKey_(date) {
  var m = date.getMonth() + 1; // 1-12
  var fiscalMonth = m >= 10 ? m - 9 : m + 3; // Oct=1, Nov=2, ..., Sep=12
  var pad = fiscalMonth < 10 ? '0' : '';
  return 'FY' + FISCAL_YEAR + '-M' + pad + fiscalMonth;
}

// แปลง fiscal month index (1-12) → วันที่เริ่มต้นและสิ้นสุดของเดือนนั้น
function fiscalMonthDateRange_(fiscalMonth) {
  // fiscalMonth 1 = ตุลาคม ปีก่อน (พ.ศ. FISCAL_YEAR - 1 → ค.ศ. FISCAL_YEAR - 544 - 1)
  var gregYear = FISCAL_YEAR - 543;
  var calMonth; // 0-based month สำหรับ JS Date
  if (fiscalMonth <= 3) {
    calMonth = fiscalMonth + 8; // 1→9(Oct), 2→10(Nov), 3→11(Dec)
    gregYear = gregYear - 1;
  } else {
    calMonth = fiscalMonth - 4; // 4→0(Jan), 5→1(Feb), ... 12→8(Sep)
  }
  var start = new Date(gregYear, calMonth, 1);
  var end = new Date(gregYear, calMonth + 1, 0); // วันสุดท้ายของเดือน
  return { start: start, end: end };
}
