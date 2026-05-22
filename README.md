# งบประมาณ v2 — Google Apps Script

เพิ่มฟีเจอร์ Multi-round allocation และ Dashboard ให้ Google Sheet ที่โมเมใช้อยู่
โดยไม่แก้ไขข้อมูลเดิม

## ฟีเจอร์ที่เพิ่ม

- **รอบงบประมาณ** — ติดตามการจัดสรรงบ 3 รอบ (R1/R2/R3) พร้อมยอดเบิกจ่ายอัตโนมัติ
- **เป้าหมายรายเดือน** — กำหนด % เป้าหมายสะสมต่อเดือน เทียบกับเบิกจ่ายจริง
- **Dashboard** — สรุปภาพรวมงบประมาณแบบ real-time พร้อม KPI และตารางความก้าวหน้า

---

## วิธีติดตั้ง (ทำครั้งเดียว)

### ขั้นตอนที่ 1 — เปิด Script Editor

1. เปิด Google Sheet ที่โมเมใช้งาน
2. เมนูบน: **Extensions → Apps Script**
3. หน้าต่าง Script Editor จะเปิดขึ้น

### ขั้นตอนที่ 2 — เพิ่มไฟล์ Script

1. ลบไฟล์ `Code.gs` เดิมออก (คลิกขวา → Delete)
2. สร้างไฟล์ใหม่ทีละไฟล์ โดยกดปุ่ม **+** (Add a file → Script):

| ชื่อไฟล์ที่ต้องสร้าง | คัดลอก code จาก |
|---|---|
| `Config` | `src/Config.gs` |
| `DataReader` | `src/DataReader.gs` |
| `BudgetRounds` | `src/BudgetRounds.gs` |
| `MonthlyTargets` | `src/MonthlyTargets.gs` |
| `Dashboard` | `src/Dashboard.gs` |
| `Setup` | `src/Setup.gs` |
| `Menu` | `src/Menu.gs` |

3. วาง code ลงในแต่ละไฟล์ กด **Save** (Ctrl+S หรือ Cmd+S)

### ขั้นตอนที่ 3 — แก้ค่าตั้งต้น (ถ้าจำเป็น)

เปิดไฟล์ `Config.gs` ตรวจสอบ:
```javascript
var FISCAL_YEAR  = 2568;    // ปีงบประมาณ (พ.ศ.)
var TOTAL_BUDGET = 1400000; // งบรวมทั้งปี (บาท)
```

### ขั้นตอนที่ 4 — รัน Setup

1. กลับไปที่ Google Sheet (reload หน้า)
2. เมนูใหม่ **"งบประมาณ v2"** จะปรากฏขึ้น
3. คลิก **งบประมาณ v2 → ตั้งค่าครั้งแรก (Setup)**
4. อนุญาต permission ที่ Google ขอ (ครั้งแรกครั้งเดียว)
5. รอสักครู่ — sheet ใหม่ 3 ชีตจะสร้างขึ้นอัตโนมัติ

---

## วิธีใช้งาน

### รอบงบประมาณ (sheet: รอบงบประมาณ)

| คอลัมน์ | กรอกเอง? | รายละเอียด |
|---|---|---|
| วันที่เริ่ม / สิ้นสุด | ✅ กรอกเอง | ช่วงวันของแต่ละรอบ |
| งบจัดสรร (บาท) | ✅ กรอกเอง | งบที่ได้รับในรอบนั้น |
| เบิกจ่าย / คงเหลือ / % | 🔄 อัตโนมัติ | คำนวณจาก activity log |

Section ล่าง (แยกตามรหัสงบประมาณ): กรอก allocation ต่อ code ต่อรอบในคอลัมน์สีขาว

### เป้าหมายรายเดือน (sheet: เป้าหมายรายเดือน)

- คอลัมน์ **เป้าหมาย %** แก้ได้เอง (default ตามมาตรฐาน 5%→100%)
- คอลัมน์สีฟ้า (เบิกจ่ายจริง, % จริง, สถานะ) อัปเดตอัตโนมัติ
- ✓ = ผ่านเป้า, ! = ต่ำกว่าเป้า, - = เดือนยังไม่ถึง

### Dashboard

- อ่านอย่างเดียว (script เขียนทับเมื่อกด refresh)
- กด **งบประมาณ v2 → รีเฟรชทั้งหมด** เพื่ออัปเดต

---

## โครงสร้างไฟล์

```
src/
├── Config.gs         — ค่าคงที่ (column mapping, ชื่อ sheet, งบรวม, ปีงบ)
├── DataReader.gs     — อ่านข้อมูลจาก activity log
├── BudgetRounds.gs   — sheet รอบงบประมาณ
├── MonthlyTargets.gs — sheet เป้าหมายรายเดือน
├── Dashboard.gs      — sheet Dashboard
├── Setup.gs          — initializeV2() และ refreshAll()
└── Menu.gs           — เมนู "งบประมาณ v2"
```

---

## แก้ปัญหา

**เมนู "งบประมาณ v2" ไม่ขึ้น**
→ Reload หน้า Google Sheet (F5)

**ขึ้น error "ไม่พบ sheet activity log"**
→ เปิด `Config.gs` แก้ `ACTIVITY_HEADER_MARKER` ให้ตรงกับหัวคอลัมน์ A row 1 ของ sheet activity log จริง

**ยอดผิดพลาด**
→ ตรวจสอบ `COL_STATUS` ใน `Config.gs` ว่าตรงกับ column จริงใน sheet
→ ตรวจสอบ `STATUS_PAID = 'เบิกจ่ายแล้ว'` ตรงกับค่าใน sheet

**อยากล้างแล้วตั้งต่าใหม่**
→ เปิด Script Editor → รัน function `resetV2Sheets()` แล้วรัน Setup ใหม่
