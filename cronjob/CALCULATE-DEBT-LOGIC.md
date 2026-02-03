# Logic Cronjob Calculate Debt

Tài liệu giải thích chi tiết logic của file `cronjob/calculate-debt.cronjob.ts` — cronjob tính công nợ giữa các trạm theo ngày (timezone Việt Nam).

---

## 1. Tổng quan

Cronjob **Calculate Debt** chạy mỗi ngày (thường lúc **00:00 giờ VN**) để:

1. **Tính công nợ** cho ngày vừa qua (old day) và tạo dữ liệu công nợ cho **ngày mới** (new day).
2. **Sinh Debt Report** (báo cáo công nợ) tương ứng cho old day và new day.

Dữ liệu công nợ được lưu theo cặp **fromRoute → toRoute** (trạm A nợ trạm B) và theo **ngày lịch VN**, với quy ước múi giờ: **00:00 VN = 17:00 UTC ngày hôm trước**.

---

## 2. Luồng thực thi trong `calculate-debt.cronjob.ts`

### 2.1 Khởi tạo

- Load biến môi trường (`.env`, `.env.uat`, `.env.production` theo `NODE_ENV`).
- Kết nối MongoDB.
- Khởi tạo `CronjobService`, `DebtReportService`.

### 2.2 Chọn chế độ chạy (CASE 1 hoặc CASE 2)

Có **hai cách chạy** (chỉ dùng một — block còn lại để comment):

| Case | Mục đích | Key log | `useNextDay` |
|------|----------|---------|--------------|
| **CASE 1** | Production / chạy thật theo ngày hiện tại | `Calculate-debt-YYYY-MM-DD` (ngày hiện tại) | `false` |
| **CASE 2** | Test: giả lập chạy như “ngày mai VN” | Có thể dùng key ngày hiện tại hoặc ngày +1 | `true` |

- **CASE 1**: Dùng ngày hiện tại. Key = `Calculate-debt-${today}`. Nếu cron này **đã chạy thành công hôm nay** (`CronLogService.isSuccess(key)`), thì thoát luôn, không tính lại.
- **CASE 2**: Dùng `useNextDay = true` để mọi logic bên trong coi “new day” = ngày mai VN (phục vụ test).

### 2.3 Tránh chạy trùng

- Gọi `CronLogService.isSuccess(key)`.
- Nếu **đã success** cho key đó (đã chạy xong trong ngày) → log, disconnect DB, `return`.
- Chỉ tiếp tục khi chưa chạy thành công.

### 2.4 Thực thi chính (try/catch)

1. **Bắt đầu**: `CronLogService.start(key, 'Calculate debt cronjob')`.
2. **Tính công nợ**: `cronjobService.cronjobCalculateDebt(useNextDay)`.
3. **Sinh báo cáo**: `debtReportService.generateDebtReport(useNextDay)`.
4. **Đánh dấu thành công**: `CronLogService.success(key)`.
5. **Disconnect** MongoDB.

Nếu có lỗi:

- Log lỗi.
- Ghi log fail: `CronLogService.fail(key, errorMessage)`.
- Disconnect và `throw error` (process thoát với code lỗi).

---

## 3. Logic trong `CronjobService.cronjobCalculateDebt(useNextDay)`

### 3.1 Xác định “old day” và “new day” (theo lịch VN)

- **new day**: Nếu `useNextDay === true` → ngày mai VN; ngược lại → ngày hiện tại VN.
- **old day**: Ngày trước new day (ví dụ new day = 02/02 thì old day = 01/02).

Đơn vị dùng trong service: `{ year, month, date }` theo **lịch VN**.

### 3.2 Chuyển ngày VN sang giá trị lưu DB (UTC)

- **dateDebt** (dùng làm khóa ngày trong collection Debt):  
  Ngày D (VN) được lưu là **17:00:00 UTC của ngày D-1** (vì 00:00 D ở VN = 17:00 D-1 UTC).
- **Khoảng thời gian query delivery/money** (theo `createdAt`):  
  Ngày D (VN) = từ **17:00 (D-1) UTC** đến **16:59:59.999 D UTC**.

**Bảng mapping (ví dụ tháng 2/2026):** Ngày D VN → dateDebt = 17:00 UTC ngày (D-1). Ví dụ: 01-Feb VN → 2026-01-31T17:00, 02-Feb → 2026-02-01T17:00, 03-Feb → 2026-02-02T17:00, **04-Feb → 2026-02-03T17:00**. Sau **2 lần chạy cron** (02-Feb và 03-Feb VN) có 3 dateDebt: 2026-01-31, 2026-02-01, 2026-02-02. **dateDebt 2026-02-03** chỉ có sau lần chạy thứ 3 (04-Feb VN).

Như vậy toàn bộ dữ liệu giao dịch trong “ngày D VN” được ánh xạ đúng sang UTC để query.

### 3.3 Hai nhánh xử lý

- Đếm số bản ghi **Debt** có `dateDebt = oldDayDebtDate`:
  - **count === 0** → Chưa từng tính cho old day → **first run**: `cronjobFirstCalculateDebt(...)`.
  - **count > 0** → Đã có debt cho old day → **daily run**: `cronjobCalculateDebtEveryDay(...)`.

---

## 4. First run: `cronjobFirstCalculateDebt`

**Khi nào**: Lần đầu tính công nợ cho old day (chưa có bản ghi Debt cho ngày đó).

### 4.1 Chuẩn bị

- Tính **oldRange** = khoảng UTC tương ứng old day (để query Delivery, MoneyDelivery theo `createdAt`).
- Lấy danh sách tất cả **Route**.
- Tạo sẵn một **map** `debtByPair`: key = `fromRouteId_toRouteId`, value = object công nợ (IDebtRow) cho cặp (from, to). Chỉ tạo các cặp **from ≠ to**.

### 4.2 Dữ liệu đưa vào từng cặp (fromRoute → toRoute)

Với mỗi **route** (coi như “trạm đang xét”):

- **Delivery FROM route** (đơn đi từ trạm này):
  - Lọc theo `fromRoute`, `createdAt` trong oldRange.
  - Với mỗi delivery: cộng vào **row (fromRoute → toRoute)** của đơn:
    - `paymentType === 'debt'` → cộng chi phí vào `feeCODToRoute`.
    - `paymentType === 'paid'` → cộng `homeDeliveryCost` vào `homeDeliveryFromRoute`, `collectForCustomerCost` vào `surchargeFromRoute`.

- **Delivery TO route** (đơn về trạm này):
  - Lọc theo `toRoute`, `createdAt` trong oldRange.
  - Cộng vào **row ngược**: (route hiện tại → fromRoute của đơn), để một trạm chỉ mang **feeCODToRoute**, trạm kia **feeCODFromRoute** (tránh trùng).
  - Quy tắc tương tự: debt → `feeCODFromRoute`; paid → `homeDeliveryToRoute`, `surchargeToRoute`.

- **MoneyDelivery FROM route**: cộng `sendMoneyAmount` (type NORMAL) vào row (from → to) → `costFromRoute`.
- **MoneyDelivery TO route**: cộng vào row ngược (route → from) → `costToRoute`.

### 4.3 Tính totalDebt (old day) và tạo bản ghi new day

- Với mỗi row trong `debtByPair`:
  - **totalDebt** = (costFromRoute + feeCODToRoute + homeDeliveryFromRoute + surchargeFromRoute + receivable) − (costToRoute + feeCODFromRoute + homeDeliveryToRoute + surchargeToRoute + accountPayable).
  - **Insert** bản ghi Debt cho **old day** (dateDebt = oldDayDebtDate).
  - Tạo bản ghi Debt cho **new day** (dateDebt = newDayDebtDate):
    - `openingBalance` = totalDebt của old day (số dư chuyển sang).
    - Các khoản receivable/accountPayable được tính lại và có thể điều chỉnh theo openingBalance (nếu có comment trong code: dương thì cộng vào accountPayable, âm thì cộng vào receivable).
    - **Insert** bản ghi new day.

Toàn bộ insert được thực hiện trong **một transaction** (bulkWrite với session).

---

## 5. Daily run: `cronjobCalculateDebtEveryDay`

**Khi nào**: Đã tồn tại Debt cho old day (chạy cron hàng ngày).

### 5.1 Chuẩn bị

- Tính **oldRange** (giống first run).
- Load toàn bộ **Debt** có `dateDebt = oldDayDebtDate`.

### 5.2 Cập nhật từng bản ghi Debt (old day)

Với mỗi bản ghi Debt (fromRoute, toRoute):

- Reset các field cộng dồn (costFromRoute, feeCODToRoute, costToRoute, feeCODFromRoute, homeDelivery*, surcharge*).
- **Delivery from (fromRoute) to (toRoute)** trong oldRange: cộng vào feeCODFromRoute, homeDeliveryFromRoute, surchargeFromRoute (theo paymentType).
- **Delivery to (fromRoute) from (toRoute)** (chiều ngược): chỉ cộng vào row “receiver” (quy ước: `fromRoute.toString() > toRoute.toString()` là receiver) → feeCODToRoute, homeDeliveryToRoute, surchargeToRoute; đồng thời query MoneyDelivery (toRoute → fromRoute) để cộng costToRoute.
- **MoneyDelivery from (fromRoute) to (toRoute)** (type NORMAL): cộng costFromRoute.
- Tính lại **totalDebt** (công thức giống first run, cộng thêm openingBalance).
- **updateOne** bản ghi Debt old day (chỉ cập nhật các field đã tính).

### 5.3 Tạo bản ghi new day

- Với mỗi debt old day: tính `openingBalance = totalDebt` (sau khi update).
- Tính receivable / accountPayable mới (cộng dồn từ các khoản trong ngày + điều chỉnh theo openingBalance).
- Tạo bản ghi Debt **new day** với openingBalance, receivable, accountPayable, totalDebt tương ứng.
- **insertOne** từng bản ghi new day.

Toàn bộ update + insert trong **một transaction** (bulkWrite).

---

## 6. Sinh báo cáo: `DebtReportService.generateDebtReport(useNextDay)`

- Dùng cùng cách xác định **new day / old day** như cronjob (và cùng `useNextDay`).
- Kiểm tra đã có **DebtReport** cho old day chưa:
  - **Chưa có** (first run): `processDebtReportForVnDay(oldDay)`, rồi `processDebtReportForVnDay(newDay)`.
  - **Đã có** (daily run): `updateDebtReportForVnDay(oldDay)`, rồi `processDebtReportForVnDay(newDay)`.

DebtReport nhóm công nợ theo **toRoute** (và ngày), tổng hợp từ các bản ghi Debt có cùng `dateDebt` (tương ứng một ngày VN).

---

## 7. Tóm tắt luồng dữ liệu

```
Cron 00:00 VN
    ↓
Kiểm tra CronLogService.isSuccess(key) → đã chạy thì thoát
    ↓
CronLogService.start(key)
    ↓
cronjobCalculateDebt(useNextDay)
    ├─ old day = ngày trước new day (VN)
    ├─ new day = hôm nay (hoặc ngày mai nếu useNextDay)
    ├─ Đếm Debt theo dateDebt = old day
    │   ├─ count = 0 → cronjobFirstCalculateDebt (tạo old + new)
    │   └─ count > 0 → cronjobCalculateDebtEveryDay (update old, tạo new)
    └─ Transaction: Debt bulkWrite
    ↓
generateDebtReport(useNextDay)
    └─ Tạo/cập nhật DebtReport cho old day và new day
    ↓
CronLogService.success(key) → disconnect
```

---

## 8. Lưu ý khi sử dụng

- **Production**: Dùng CASE 1, cron chạy 00:00 VN; mỗi ngày chỉ chạy một lần, tránh chạy tay trùng bằng key `Calculate-debt-YYYY-MM-DD`.
- **Test “ngày mai”**: Bật CASE 2 (`useNextDay = true`) để giả lập new day = ngày mai VN; nhớ dùng đúng key nếu cần kiểm tra trùng.
- **Múi giờ**: Mọi ngày “theo VN” đều quy về UTC qua 17:00 UTC (ngày trước) và khoảng 17:00 D-1 → 16:59:59 D (UTC) cho ngày D.
- **Idempotent**: Trong cùng một ngày (cùng key), cron chỉ chạy một lần thành công; lần sau sẽ thoát sớm.

File MD này mô tả đúng logic trong `cronjob/calculate-debt.cronjob.ts` và hai hàm chính trong `CronjobService` (first run / daily run), cùng bước sinh DebtReport.
