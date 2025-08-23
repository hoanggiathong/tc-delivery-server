# Sơ Đồ Mối Quan Hệ Thực Thể

## Sơ Đồ Cơ Sở Dữ Liệu TC Delivery Server

```mermaid
erDiagram
    USERS ||--o{ DELIVERIES : "tạo"
    USERS ||--o{ MONEY_DELIVERIES : "tạo"
    USERS ||--o{ DRAFT_DELIVERIES : "tạo bản nháp"
    USERS ||--o{ USER_ROUTES : "được phân công"
    USERS ||--o{ USER_ROUTES : "phân công (assignedBy)"
    USERS }o--|| ROUTES : "có tuyến đường đã chọn"
    ROUTES ||--o{ USER_ROUTES : "chứa"
    ROUTES ||--o{ DELIVERIES : "từ tuyến"
    ROUTES ||--o{ DELIVERIES : "đến tuyến"
    ROUTES ||--o{ MONEY_DELIVERIES : "từ tuyến"
    ROUTES ||--o{ MONEY_DELIVERIES : "đến tuyến"
    ROUTES ||--o{ DRAFT_DELIVERIES : "từ tuyến"
    ROUTES ||--o{ DRAFT_DELIVERIES : "đến tuyến"
    CUSTOMERS ||--o{ DELIVERIES : "người gửi"
    CUSTOMERS ||--o{ DELIVERIES : "người nhận"
    CUSTOMERS ||--o{ MONEY_DELIVERIES : "người gửi"
    CUSTOMERS ||--o{ MONEY_DELIVERIES : "người nhận"

    USERS {
        ObjectId _id PK
        string username UK "duy nhất, 3-50 ký tự, chữ cái số + dấu gạch dưới"
        string password "mã hóa bcrypt, tối thiểu 6 ký tự, select:false"
        enum role "superadmin|admin|manager|user, mặc định:user"
        ObjectId selectedRouteId FK "tham chiếu: ROUTES, tùy chọn, mặc định:null"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }

    ROUTES {
        ObjectId _id PK
        string code UK "duy nhất, định dạng: [A-Z][0-9]+, chữ hoa, trim"
        string name "bắt buộc, tối đa 100 ký tự, trim"
        string address "tùy chọn, tối đa 200 ký tự, trim"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }

    USER_ROUTES {
        ObjectId _id PK
        ObjectId userId FK "tham chiếu: USERS, bắt buộc"
        ObjectId routeId FK "tham chiếu: ROUTES, bắt buộc"
        ObjectId assignedBy FK "tham chiếu: USERS, bắt buộc, manager+"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }

    CUSTOMERS {
        ObjectId _id PK
        string name "bắt buộc, tối đa 100 ký tự, trim"
        string phone "bắt buộc, định dạng quốc tế, trim"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }

    DELIVERIES {
        ObjectId _id PK
        string code "10 chữ số: YYMMDD+random sequence(0001-9999)"
        string fullCode UK "duy nhất: code+fromRouteCode+toRouteCode"
        string subCode "timestamp/1000+sequence"
        ObjectId sender FK "tham chiếu: CUSTOMERS, bắt buộc"
        ObjectId receiver FK "tham chiếu: CUSTOMERS, bắt buộc"
        ObjectId fromRoute FK "tham chiếu: ROUTES, bắt buộc (từ user.selectedRouteId)"
        ObjectId toRoute FK "tham chiếu: ROUTES, bắt buộc"
        string name "tên hàng hóa, bắt buộc, trim"
        number quantity "số lượng hàng hóa, bắt buộc, tối thiểu 1, mặc định 1"
        number cost "phí vận chuyển, bắt buộc, tối thiểu 0"
        string homeDelivery "địa chỉ giao hàng, tùy chọn, trim"
        number homeDeliveryCost "bắt buộc, tối thiểu 0, mặc định 0"
        number itemValue "giá trị hàng hóa, bắt buộc, tối thiểu 0"
        number itemCost "phí trị giá, bắt buộc, tối thiểu 0"
        number collectCost "phí thu hộ, bắt buộc, tối thiểu 0"
        number collectForCustomer "thu dùm khách hàng, bắt buộc, tối thiểu 0, mặc định 0"
        number collectForCustomerCost "phí phụ thu, bắt buộc, tối thiểu 0"
        number totalCost "tính toán: cost+itemCost(phí trị giá)+collectForCustomerCost"
        string collectForCustomerNote "tùy chọn, trim"
        object details "thông tin chi tiết hàng hóa, tùy chọn"
        number details.weight "khối lượng (kg), tùy chọn, tối thiểu 0"
        number details.length "chiều dài (cm), tùy chọn, tối thiểu 0"
        number details.width "chiều rộng (cm), tùy chọn, tối thiểu 0"
        number details.height "chiều cao (cm), tùy chọn, tối thiểu 0"
        boolean details.isOverweight "quá tải, mặc định false"
        number details.convertedWeight "khối lượng quy đổi, tùy chọn, tối thiểu 0"
        string notes "tùy chọn, trim"
        enum paymentType "paid|debt|free, mặc định paid, loại thanh toán"
        ObjectId createdByUser FK "tham chiếu: USERS, bắt buộc"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }

    MONEY_DELIVERIES {
        ObjectId _id PK
        string code "10 chữ số: YYMMDD+random sequence(0001-9999)"
        string fullCode UK "duy nhất: code+fromRouteCode+toRouteCode"
        string subCode "timestamp/1000+sequence"
        ObjectId sender FK "tham chiếu: CUSTOMERS, bắt buộc"
        ObjectId receiver FK "tham chiếu: CUSTOMERS, bắt buộc"
        ObjectId fromRoute FK "tham chiếu: ROUTES, bắt buộc (từ user.selectedRouteId)"
        ObjectId toRoute FK "tham chiếu: ROUTES, bắt buộc"
        number sendMoneyAmount "số tiền gửi, bắt buộc, tối thiểu 0"
        number sendCost "phí dịch vụ, bắt buộc, tối thiểu 0"
        number sendFee "phí giao dịch, tính theo shipping rates, mặc định 0"
        enum transferType "regular|express|free, mặc định regular"
        number totalCost "tính toán: sendCost (free thì = 0)"
        string notes "tùy chọn, trim"
        ObjectId createdByUser FK "tham chiếu: USERS, bắt buộc"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }


    DRAFT_DELIVERIES {
        ObjectId _id PK
        string senderName "bắt buộc, tối đa 100 ký tự, trim"
        string senderPhone "bắt buộc, định dạng quốc tế, trim"
        string receiverName "bắt buộc, tối đa 100 ký tự, trim"
        string receiverPhone "bắt buộc, định dạng quốc tế, trim"
        ObjectId fromRoute FK "tham chiếu: ROUTES, bắt buộc, khớp selectedRoute của user"
        ObjectId toRoute FK "tham chiếu: ROUTES, bắt buộc"
        string name "tên hàng hóa, bắt buộc, trim"
        number quantity "số lượng hàng hóa, bắt buộc, tối thiểu 1, mặc định 1"
        number cost "phí vận chuyển, bắt buộc, tối thiểu 0"
        string homeDelivery "địa chỉ giao hàng, tùy chọn, trim"
        number homeDeliveryCost "bắt buộc, tối thiểu 0, mặc định 0"
        number itemValue "giá trị hàng hóa, bắt buộc, tối thiểu 0"
        number itemCost "phí trị giá, bắt buộc, tối thiểu 0"
        number collectCost "phí thu hộ, bắt buộc, tối thiểu 0"
        number collectForCustomer "thu dùm khách hàng, bắt buộc, tối thiểu 0, mặc định 0"
        number collectForCustomerCost "phí phụ thu, bắt buộc, tối thiểu 0"
        number totalCost "tính toán: cost+itemCost+collectForCustomerCost"
        string collectForCustomerNote "tùy chọn, trim"
        object details "thông tin chi tiết hàng hóa, tùy chọn"
        number details.weight "khối lượng (kg), tùy chọn, tối thiểu 0"
        number details.length "chiều dài (cm), tùy chọn, tối thiểu 0"
        number details.width "chiều rộng (cm), tùy chọn, tối thiểu 0"
        number details.height "chiều cao (cm), tùy chọn, tối thiểu 0"
        boolean details.isOverweight "quá tải, mặc định false"
        number details.convertedWeight "khối lượng quy đổi, tùy chọn, tối thiểu 0"
        string notes "tùy chọn, trim"
        enum paymentType "paid|debt|free, mặc định paid"
        ObjectId createdByUser FK "tham chiếu: USERS, bắt buộc"
        datetime createdAt "tự động tạo, TTL 90 ngày"
        datetime updatedAt "tự động cập nhật"
    }

    SETTINGS {
        ObjectId _id PK
        string name UK "shipping_rates|product_list, duy nhất"
        mixed metadata "flexible metadata: ShippingRateConfig[]|ProductConfig[]|Record<string,unknown>"
        string description "mô tả tùy chọn, trim"
        boolean isActive "trạng thái hoạt động, mặc định true"
        datetime createdAt "tự động tạo"
        datetime updatedAt "tự động cập nhật"
    }

    SHIPPING_RATE_CONFIG {
        number fromAmount "số tiền bắt đầu, tối thiểu 0"
        number toAmount "số tiền kết thúc, > fromAmount"
        number regularShippingFee "phí gửi thường, tối thiểu 0"
        number expressShippingFee "phí gửi nhanh, tối thiểu 0"
        enum fromAmountUnit "VND|USD|%, mặc định VND"
        enum toAmountUnit "VND|USD|%, mặc định VND"
        enum regularShippingFeeUnit "VND|USD|%, mặc định VND"
        enum expressShippingFeeUnit "VND|USD|%, mặc định VND"
    }

    PRODUCT_CONFIG {
        string name "tên hàng hóa, bắt buộc, trim"
        number cost "chi phí hàng hóa, tối thiểu 0"
    }
```

## Chi Tiết Sơ Đồ và Quy Tắc Nghiệp Vụ

### Tên Các Collection
- `users` - Tài khoản người dùng và xác thực
- `customers` - Cơ sở dữ liệu thông tin khách hàng
- `routes` - Cấu hình tuyến đường vận chuyển
- `userRoutes` - Mối quan hệ nhiều-nhiều giữa người dùng và tuyến đường
- `deliveries` - Giao dịch vận chuyển thông thường
- `moneydeliveries` - Giao dịch chuyển tiền
- `draftdeliveries` - Bản nháp delivery (lưu tạm thông tin chưa hoàn tất)
- `settings` - Cấu hình hệ thống linh hoạt (shipping rates, product list, custom configs)

### Ràng Buộc và Xác Thực Chính

#### Bảng USERS
- **Tên đăng nhập**: Phải duy nhất, 3-50 ký tự, chỉ chữ cái số và dấu gạch dưới
- **Mật khẩu**: Tối thiểu 6 ký tự, mã hóa bằng bcrypt (salt rounds: 12)
- **Phân cấp vai trò**: user(1) → manager(2) → admin(3) → superadmin(4)
- **Tuyến đường đã chọn**: Tham chiếu tùy chọn đến tuyến đường ưa thích của người dùng

#### Bảng CUSTOMERS
- **Ràng buộc duy nhất**: Tổ hợp name + phone phải duy nhất
- **Định dạng số điện thoại**: Định dạng quốc tế với regex `/^\+?[1-9]\d{1,14}$/`
- **Index hiệu suất**: Text search trên name, exact match trên phone
- **Index quan trọng**: `{phone: 1}` cho phone search, `{name: "text"}` cho text search

#### Bảng ROUTES
- **Định dạng mã**: Phải khớp với pattern `[A-Z]\d+` (ví dụ: T1, T2, A1)
- **Tự động chuyển đổi**: Mã được tự động chuyển thành chữ hoa
- **Địa chỉ**: Trường tùy chọn, tối đa 200 ký tự, lưu thông tin địa chỉ tuyến đường

#### Bảng USER_ROUTES
- **Ràng buộc duy nhất**: Mỗi người dùng chỉ có thể được phân công vào một tuyến đường một lần (userId + routeId)
- **Quyền phân công**: Chỉ có manager trở lên mới có thể phân công tuyến đường
- **Index hiệu suất**: Index riêng biệt trên userId và routeId để tối ưu truy vấn

#### Bảng DELIVERIES
- **Định dạng mã mới**: 
  - `code`: 10 chữ số YYMMDD + random sequence (0001-9999)
  - `fullCode`: code + fromRouteCode + toRouteCode (duy nhất trong toàn hệ thống)
  - `subCode`: timestamp/1000 + sequence
- **Code Generation Logic**:
  - Random sequence thay vì sequential để tránh collision
  - fullCode uniqueness check across cả delivery và money-delivery collections
  - fromRoute lấy từ user's selectedRouteId thay vì truyền từ client
- **Quy tắc nghiệp vụ**:
  - Người gửi và người nhận không thể là cùng một khách hàng
  - Tuyến đi và tuyến đến không thể giống nhau
  - Tổng chi phí được tính tự động qua middleware
  - Số lượng phải tối thiểu 1
- **Tính toán chi phí**: `totalCost = cost + itemCost(phí trị giá) + collectForCustomerCost`
- **Thông tin chi tiết hàng hóa (details)**:
  - `weight`: Khối lượng thực tế của hàng hóa (kg)
  - `length`, `width`, `height`: Kích thước hàng hóa (cm)
  - `isOverweight`: Đánh dấu hàng hóa quá tải
  - `convertedWeight`: Khối lượng quy đổi dựa trên kích thước
- **Loại thanh toán**:
  - `paid` (mặc định): Thanh toán bình thường, khách hàng đã thanh toán
  - `debt`: Khách hàng nợ tiền, sẽ thanh toán sau
  - `free`: Giao hàng miễn phí, không cần thanh toán
- **Index hiệu suất**: Được tối ưu cho 10M+ records với compound indexes
- **Index quan trọng**:
  - `{sender: 1, receiver: 1, toRoute: 1}` - Index chính cho frequent customers
  - `{receiver: 1, toRoute: 1}` - Index hỗ trợ cho receiver lookups
  - `{code: 1, fromRoute: 1, toRoute: 1}` - Index cho code + route lookup

#### Bảng MONEY_DELIVERIES
- **Định dạng mã mới**: Cùng logic với deliveries:
  - `code`: YYMMDD + random sequence (0001-9999)
  - `fullCode`: code + fromRouteCode + toRouteCode (duy nhất)
  - `subCode`: timestamp/1000 + sequence
- **Shared uniqueness**: fullCode phải unique across cả delivery và money-delivery
- **Quy tắc nghiệp vụ**: Cùng các ràng buộc người gửi/nhận và tuyến đường như deliveries
- **Hình thức chuyển tiền (transferType)**:
  - `regular` (mặc định): Chuyển tiền thường, sendFee tính theo regularShippingFee
  - `express`: Chuyển tiền nhanh, sendFee tính theo expressShippingFee
  - `free`: Miễn phí, sendFee = 0 và totalCost = 0
- **Tính phí giao dịch (sendFee)**:
  - Tính dựa trên sendMoneyAmount và shipping rates configuration
  - Hỗ trợ phí cố định (VND/USD) hoặc phần trăm (%)
  - Tự động cập nhật khi thay đổi transferType hoặc sendMoneyAmount
- **Chi phí tổng**: 
  - `totalCost = sendCost` cho regular và express
  - `totalCost = 0` cho free
- **Index hiệu suất**: Cùng pattern tối ưu như deliveries


#### Bảng DRAFT_DELIVERIES

- **Mục đích**: Lưu tạm thông tin delivery chưa hoàn tất (không có code)
- **Quy tắc**:
  - `fromRoute` phải khớp với `selectedRouteId` của user hiện tại
  - Chỉ owner mới có thể xem/sửa/xóa draft
  - Tự động xóa sau 90 ngày (TTL index)
  - Số lượng phải tối thiểu 1
  - Hỗ trợ thông tin chi tiết hàng hóa (weight, dimensions, overweight status)
- **Chuyển đổi**: Có thể convert draft thành delivery chính thức với code và customer records
- **Index Strategy**:
  - `{fromRoute: 1, createdByUser: 1, createdAt: -1}` - Query chính
  - `{createdByUser: 1, createdAt: -1}` - User's drafts
  - `{fromRoute: 1, createdAt: -1}` - Route-based queries
  - TTL index: `{createdAt: 1}` với expiration 90 ngày

#### Bảng SETTINGS
- **Tên cấu hình**: Phải duy nhất, enum values: `shipping_rates`, `product_list`
- **Metadata structure**: Union type hỗ trợ nhiều loại cấu hình:
  - **ShippingRateConfig[]**: Array shipping rates với unit fields
    - `fromAmount`, `toAmount`: Khoảng số tiền (≥ 0)
    - `regularShippingFee`, `expressShippingFee`: Phí vận chuyển (≥ 0)
    - `fromAmountUnit`, `toAmountUnit`, `regularShippingFeeUnit`, `expressShippingFeeUnit`: Đơn vị tiền tệ (VND|USD|%, mặc định VND)
  - **ProductConfig[]**: Array danh sách hàng hóa
    - `name`: Tên hàng hóa (bắt buộc, trim)
    - `cost`: Chi phí hàng hóa (≥ 0)
  - **Record<string, unknown>**: Custom settings cho tương lai
- **Quy tắc nghiệp vụ**:
  - **Shipping Rates**: Các khoảng giá phải liên tục và không chồng lấp
  - Rate tiếp theo phải có fromAmount = rate trước.toAmount + 1
  - **Product List**: Mỗi product phải có tên và cost hợp lệ
  - Dynamic validation dựa trên setting name
- **Default Unit Handling**: Tất cả unit fields mặc định là VND
- **Quyền truy cập**:
  - Tạo/Sửa: Admin và Superadmin only
  - Xóa: Superadmin only
  - Đọc: Tất cả authenticated users
- **API Endpoints**:
  - `POST /api/settings` - Tạo settings mới với metadata linh hoạt
  - `GET /api/settings` - Lấy tất cả settings (Admin/Superadmin)
  - `GET /api/settings/:name` - Lấy settings theo tên
  - `PUT /api/settings/:name` - Cập nhật settings
  - `DELETE /api/settings/:name` - Xóa settings (Superadmin)
  - `POST /api/settings/calculate-shipping-fee` - Tính phí vận chuyển
  - `GET /api/settings/shipping-rates` - Lấy shipping rates
  - `PUT /api/settings/shipping-rates` - Cập nhật shipping rates với default VND
  - `GET /api/settings/products` - Lấy danh sách hàng hóa
  - `PUT /api/settings/products` - Cập nhật danh sách hàng hóa
- **Index hiệu suất**: Unique index trên trường `name`

### Tối Ưu Hóa Hiệu Suất

#### Chiến Lược Index Database
1. **Khóa Chính**: ObjectId indexes trên tất cả các trường `_id`
2. **Index Duy Nhất**: Trên các trường code cho deliveries và money deliveries
3. **Index Khóa Ngoại**: Trên tất cả các trường tham chiếu để tối ưu join performance
4. **Index Hỗn Hợp**: Cho các pattern query phổ biến
   - `{fromRoute: 1, toRoute: 1, createdAt: -1}` - Phân tích tuyến đường
   - `{sender: 1, createdAt: -1}` - Lịch sử khách hàng gửi
   - `{userId: 1, routeId: 1}` - Phân công tuyến đường cho user
5. **Index Hiệu Suất Quan Trọng**: Cho tối ưu frequent customers (40-60% faster)
   - `{sender: 1, receiver: 1, toRoute: 1}` - Index chính cho frequent customers aggregation
   - `{receiver: 1, toRoute: 1}` - Index hỗ trợ cho receiver lookups
   - `{phone: 1}` - Index cho exact phone search trong customers
   - `{name: "text"}` - Text search index cho tìm kiếm tên khách hàng
   - `{fullCode: 1}` - Unique index cho new code system (deliveries & money-deliveries)
   - `{subCode: 1}` - Index cho tracking và debug purposes
6. **Settings Index**: `{name: 1}` - Unique index cho settings name lookup
7. **Settings Performance**: `{isActive: 1}` - Index cho active settings filter

#### Tính Năng Tối Ưu Truy Vấn
- **Lean Queries**: Cho các thao tác chỉ đọc để giảm sử dụng bộ nhớ
- **Field Projection**: Giới hạn các trường trả về để giảm truyền tải mạng
- **Text Search**: Khả năng tìm kiếm toàn văn trên tên khách hàng
- **Date Sorting**: Tối ưu các truy vấn gần nhất trước với descending createdAt indexes

### Quy Tắc Chuyển Đổi Dữ Liệu

#### Định Dạng Phản Hồi
- Tất cả trường `_id` của MongoDB được chuyển thành `id` trong API responses
- Trường password được loại trừ khỏi tất cả responses (`select: false`)
- Trường `__v` version được xóa khỏi JSON output
- Trường date duy trì định dạng ISO string trong responses

#### Xử Lý Middleware
- **Pre-save**: Tính toán chi phí tự động và xác thực quy tắc nghiệp vụ
- **Pre-update**: Duy trì tính toán chi phí trong quá trình cập nhật
- **Password Hashing**: Mã hóa bcrypt tự động khi thay đổi mật khẩu

### Ghi Chú Tích Hợp API

#### Luồng Xác Thực
- JWT tokens chứa: `userId`, `username`, `role`
- Thời gian hết hạn token có thể cấu hình qua biến môi trường `JWT_EXPIRES_IN`
- Kiểm soát truy cập dựa trên vai trò được thực thi ở mức middleware

#### Tạo Mã Mới (Code Generation)
- **Endpoint Mã Tiếp Theo**: 
  - `GET /api/delivery/next-code?toRouteId={ObjectId}` - Chỉ cần toRouteId
  - `GET /api/money-deliveries/next-code?toRouteId={ObjectId}` - fromRouteId lấy từ user.selectedRouteId
- **Random Sequence Generation**: 
  - Không còn sử dụng sequential counter
  - Random sequence (0001-9999) để tránh collision và tang bảo mật
  - Format mới: YYMMDD + random sequence
- **FullCode Uniqueness**: 
  - fullCode = code + fromRouteCode + toRouteCode
  - Unique constraint across cả delivery và money-delivery collections
  - Retry mechanism (max 50 attempts) khi gặp collision
- **SubCode Tracking**: timestamp/1000 + sequence cho tracking và debug
- **Performance**: Parallel existence checks với Promise.all, optimized route fetching

#### Money Delivery APIs
- **Create Money Delivery**: `POST /api/money-deliveries`
  - Request body bao gồm `transferType` (optional): 'regular', 'express', 'free'
  - Tự động tính `sendFee` dựa trên `sendMoneyAmount` và `transferType`
  - `totalCost` = 0 khi `transferType` = 'free'
- **Update Money Delivery**: `PUT /api/money-deliveries/:id`
  - Có thể cập nhật `transferType`
  - Tự động tính lại `sendFee` khi thay đổi `transferType` hoặc `sendMoneyAmount`
- **Response Format**: Bao gồm `sendFee` và `transferType` trong tất cả responses

#### Tính Phí Vận Chuyển
- **API Endpoint**: `POST /api/settings/calculate-shipping-fee`
- **Input**: `{amount: number, isExpress?: boolean}`
- **Logic**: Tìm shipping rate phù hợp dựa trên amount và unit, trả về phí tương ứng
- **Unit Support**: Hỗ trợ tính toán với nhiều đơn vị tiền tệ (VND, USD, %)
- **Real-time Calculation**: Không cache, luôn tính toán real-time từ settings
- **Error Handling**: Trả về 404 nếu không tìm thấy rate phù hợp cho amount

#### Quản Lý Hàng Hóa

- **API Endpoints**:
  - `GET /api/settings/products` - Lấy danh sách hàng hóa
  - `PUT /api/settings/products` - Cập nhật danh sách hàng hóa
- **Input**: `{products: [{name: string, cost: number}]}`
- **Validation**: Tên hàng hóa bắt buộc, chi phí ≥ 0
- **Use Case**: Quản lý danh mục hàng hóa với giá cố định

#### Draft Delivery APIs

- **API Endpoints**:
  - `POST /api/draft-deliveries` - Tạo draft mới
  - `GET /api/draft-deliveries` - Lấy tất cả drafts của user (theo selectedRoute)
  - `GET /api/draft-deliveries/:id` - Lấy chi tiết draft
  - `PUT /api/draft-deliveries/:id` - Cập nhật draft
  - `DELETE /api/draft-deliveries/:id` - Xóa draft
  - `POST /api/draft-deliveries/:id/convert` - Convert draft thành delivery chính thức
  - `DELETE /api/draft-deliveries/all` - Xóa tất cả drafts của user
- **Business Rules**:
  - Draft không có code (chỉ có khi convert thành delivery)
  - fromRoute phải match với selectedRouteId của user
  - Chỉ owner mới có thể thao tác draft
  - Tự động xóa sau 30 ngày

### Cập Nhật Gần Đây Quan Trọng

#### Phiên Bản Mới Nhất

- **New Table: DRAFT_DELIVERIES**: Thêm bảng lưu tạm delivery
  - Lưu tạm thông tin delivery chưa hoàn tất (không có code)
  - Auto TTL cleanup sau 90 ngày
  - Chỉ owner mới có thể thao tác
  - Có thể convert thành delivery chính thức
  - Hỗ trợ quantity và details fields như delivery chính thức
- **Removed Table: DELIVERY_COUNTERS**: Xóa bảng atomic counter (không còn cần thiết)
  - Thay thế bằng random sequence generation
  - Giảm phức tạp database schema
  - Tăng hiệu suất với ít database operations hơn
- **Enhanced Table: SETTINGS**: Nâng cấp bảng cấu hình với flexible metadata
  - **Flexible Metadata**: Hỗ trợ nhiều loại settings (shipping_rates, product_list)
  - **Unit Support**: Thêm unit fields cho shipping rates (VND, USD, %)
  - **Default Unit**: Tất cả unit fields mặc định là VND theo yêu cầu
  - **Product Management**: Quản lý danh sách hàng hóa với tên và chi phí
  - **Type Safety**: Union types với dynamic validation theo setting name
  - **Enhanced APIs**: Specialized endpoints cho từng loại setting
  - Role-based access control (Admin/Superadmin only)
  - Validation rules đảm bảo tính toàn vẹn dữ liệu
- **Completely New Code Generation**: Hoàn toàn mới CodeGeneratorService
  - **Random Sequence**: Thay thế sequential bằng random (0001-9999)
  - **FullCode System**: code + fromRouteCode + toRouteCode cho uniqueness
  - **SubCode Tracking**: timestamp + sequence cho debug và tracking
  - **Cross-Collection Uniqueness**: Kiểm tra fullCode trên cả 2 collections
  - **User Route Integration**: fromRoute lấy từ user.selectedRouteId tự động
  - **Format Change**: DDMMYY → YYMMDD cho chuẩn hóa
  - **Retry Logic**: Lên tới 50 attempts để tránh collision
- **Enhanced DELIVERIES & DRAFT_DELIVERIES**: Thêm quantity và details fields
  - **Quantity field**: Số lượng hàng hóa (bắt buộc, tối thiểu 1, mặc định 1)
  - **Details object**: Thông tin chi tiết hàng hóa (tùy chọn)
    - `weight`: Khối lượng (kg)
    - `length`, `width`, `height`: Kích thước (cm)
    - `isOverweight`: Đánh dấu quá tải (boolean)
    - `convertedWeight`: Khối lượng quy đổi
  - Cả DELIVERIES và DRAFT_DELIVERIES đều có cấu trúc fields giống nhau
- **Field PaymentType**: Trường `paymentType` trong bảng DELIVERIES với 3 giá trị:
  - `paid` (mặc định): Thanh toán bình thường, khách hàng đã thanh toán
  - `debt`: Thanh toán nợ (khách hàng sẽ trả sau)
  - `free`: Giao hàng miễn phí
- **Cập Nhật Công Thức TotalCost**: Loại bỏ `homeDeliveryCost` khỏi tính toán tổng chi phí
  - Công thức cũ: `totalCost = cost + homeDeliveryCost + itemCost(phí trị giá) + collectForCustomerCost`
  - Công thức mới: `totalCost = cost + itemCost(phí trị giá) + collectForCustomerCost`
- **Money Delivery Transfer Types**: Thêm hình thức chuyển tiền cho MONEY_DELIVERIES
  - Thêm field `transferType`: regular (mặc định), express, free
  - Thêm field `sendFee`: Phí giao dịch tính theo shipping rates
  - Tự động tính sendFee dựa trên sendMoneyAmount và transferType
  - Free transfer: sendFee = 0, totalCost = 0
  - Regular: Sử dụng regularShippingFee từ settings
  - Express: Sử dụng expressShippingFee từ settings

### Cân Nhắc Migration và Mở Rộng

#### Migration Cần Thiết Cho Code Generation Mới
- **Database Migration**: Cần thêm `fullCode` và `subCode` cho tất cả delivery và money-delivery hiện tại
- **Index Updates**: 
  - Thêm unique index trên `fullCode` field
  - Thêm index trên `subCode` field cho tracking
  - Xóa các index liên quan đến delivery-counter
- **API Breaking Changes**:
  - `GET /api/delivery/next-code` response bây giờ bao gồm `fullCode`, `subCode`, `fromRoute`
  - `GET /api/money-deliveries/next-code` tương tự
  - Tất cả delivery/money-delivery responses có thêm 2 fields mới
- **User Requirements**: User phải có `selectedRouteId` để tạo deliveries
- **Data Integrity**: Cần script để generate `fullCode` cho records cũ dựa trên existing code + route codes

#### Mục Tiêu Quy Mô Hiện Tại
- Thiết kế cho 10M+ bản ghi delivery
- Tối ưu các pattern truy vấn cho các thao tác quy mô lớn
- Pipeline aggregation hiệu quả bộ nhớ cho báo cáo

#### Cải Tiến Tương Lai
- Chuẩn bị cho mở rộng ngang với indexing phù hợp
- Thiết kế stateless cho phép cân bằng tải
- Chiến lược caching sẵn sàng để triển khai ở lớp dịch vụ