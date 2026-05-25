// ============================================================
// Config.gs — ค่าคงที่ทั้งหมด แก้ที่นี่ที่เดียวถ้า column หรือชื่อ sheet เปลี่ยน
// ============================================================

// ชื่อ sheet ที่จะสร้างใหม่
var ROUNDS_SHEET_NAME  = 'รอบงบประมาณ';
var TARGETS_SHEET_NAME = 'เป้าหมายรายเดือน';
var DASH_SHEET_NAME    = 'Dashboard';

// ปีงบประมาณ (พ.ศ.)
var FISCAL_YEAR = 2568;

// งบประมาณรวมทั้งปี (บาท) — แก้ตรงนี้ถ้างบเปลี่ยน
var TOTAL_BUDGET = 1400000;

// Column index ใน Activity Log (นับจาก 1)
// หัวคอลัมน์: วันที่กันเงิน | ผู้รับผิดชอบ | กลุ่มงาน | โครงการ | แผนงาน/กิจกรรม | งบประมาณ | ระยะเวลา | po | รหัสงบประมาณ | วันที่เบิกจ่าย | สถานะเงิน | ประเภทงบ | สายรองฯ | กันเงินมาแล้ว | ใช้รถ
var COL_DATE_RESERVE = 1;   // วันที่กันเงิน
var COL_RESPONSIBLE  = 2;   // ผู้รับผิดชอบ
var COL_GROUP        = 3;   // กลุ่มงาน
var COL_PROJECT      = 4;   // โครงการ
var COL_ACTIVITY     = 5;   // แผนงาน/กิจกรรม
var COL_AMOUNT       = 6;   // งบประมาณ (บาท)
var COL_DURATION     = 7;   // ระยะเวลา
var COL_PO           = 8;   // po/กันเงิน/เบิกจ่าย
var COL_BUDGET_CODE  = 9;   // รหัสงบประมาณ
var COL_DATE_PAID    = 10;  // วันที่เบิกจ่าย
var COL_STATUS       = 11;  // สถานะเงิน
var COL_BUDGET_TYPE  = 12;  // ประเภทงบประมาณ
var COL_ADMIN_LINE   = 13;  // สายรองฯ

// ค่า status ใน COL_STATUS
var STATUS_PAID      = 'เบิกจ่ายแล้ว';
var STATUS_RESERVED  = 'กันเงิน';
var STATUS_TRAVEL    = 'ไปราชการ ไม่ใช้เงิน';

// Row เริ่มต้นของ Activity Log (row 1 = header)
var ACTIVITY_START_ROW = 2;

// ชื่อหัวคอลัมน์ที่ใช้ตรวจหา sheet activity log อัตโนมัติ
var ACTIVITY_HEADER_MARKER = 'วันที่กันเงิน';

// ============================================================
// การจัดหมวดประเภทงบ (col L) → 4 หมวดหลัก
// ชื่อหมวดหลักที่แสดงใน Dashboard
var CAT_KHUEB   = 'คชจ.ขับเคลื่อน';   // 1.x และ 2.x
var CAT_PHEUN   = 'คชจ.พื้นฐาน';      // 3.x
var CAT_TAM     = 'คชจ.ตามสิทธิ์';    // งบบุคลากร + งบลงทุน
var CAT_NORK    = 'เงินนอกงบประมาณ';  // เงินนอก...
var CAT_OTHER   = 'อื่นๆ';

// ลำดับที่แสดงใน Dashboard
var CAT_ORDER = [CAT_KHUEB, CAT_PHEUN, CAT_TAM, CAT_NORK, CAT_OTHER];
