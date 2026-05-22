// ============================================================
// DataReader.gs — อ่านข้อมูลจาก Activity Log (ไม่แตะ sheet อื่น)
// ============================================================

// หา sheet ที่มี Activity Log โดย scan หาหัวคอลัมน์ที่กำหนดใน Config
function getActivitySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var cell = sheets[i].getRange(1, COL_DATE_RESERVE).getValue();
    if (String(cell).trim() === ACTIVITY_HEADER_MARKER) {
      return sheets[i];
    }
  }
  throw new Error(
    'ไม่พบ sheet ที่มีหัวคอลัมน์ "' + ACTIVITY_HEADER_MARKER + '" ที่คอลัมน์ A\n' +
    'กรุณาตรวจสอบชื่อหัวคอลัมน์หรือแก้ไข COL_DATE_RESERVE ใน Config.gs'
  );
}

// ดึง Activity Log ทั้งหมด คืน array of object
// ข้าม row ที่ไม่มีวันที่ (เช่น row สรุป โอนเงินรอบ)
function getActivityLog() {
  var sheet = getActivitySheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < ACTIVITY_START_ROW) return [];

  var data = sheet.getRange(ACTIVITY_START_ROW, 1, lastRow - ACTIVITY_START_ROW + 1, 15).getValues();
  var rows = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[COL_DATE_RESERVE - 1];
    // ข้าม row ที่ไม่มีวันที่จริง
    if (!dateVal || !(dateVal instanceof Date) || isNaN(dateVal.getTime())) continue;

    var amount = parseFloat(row[COL_AMOUNT - 1]) || 0;
    var status = String(row[COL_STATUS - 1]).trim();
    var budgetCode = String(row[COL_BUDGET_CODE - 1]).trim();

    var datePaid = row[COL_DATE_PAID - 1];
    if (!(datePaid instanceof Date) || isNaN(datePaid.getTime())) datePaid = null;

    rows.push({
      dateReserve: dateVal,
      datePaid: datePaid,
      responsible: String(row[COL_RESPONSIBLE - 1]).trim(),
      group: String(row[COL_GROUP - 1]).trim(),
      project: String(row[COL_PROJECT - 1]).trim(),
      amount: amount,
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
