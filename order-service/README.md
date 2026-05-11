# Order Service

Service riêng cho nghiệp vụ đặt hàng của PetFood.

## Chức năng

- Tạo đơn hàng từ danh sách sản phẩm frontend gửi lên.
- Xem danh sách đơn hàng của user đang đăng nhập.
- Xem chi tiết đơn hàng, chỉ chủ đơn hàng hoặc admin được xem.
- Admin có thể xem danh sách đơn hàng và cập nhật trạng thái đơn/payment.

## ENV

```env
NODE_ENV=development
ORDER_PORT=3008
ORDER_CORS_ORIGIN=*
ORDER_MONGODB_URI=mongodb://localhost:27017/petfood_order
JWT_SECRET=change_me
```

## API

Tất cả endpoint cần `Bearer token`.

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/orders` | User | Tạo đơn hàng |
| GET | `/api/orders/me` | User | Lấy đơn hàng của user hiện tại |
| GET | `/api/orders/:id` | Owner/Admin | Xem chi tiết đơn hàng |
| GET | `/api/orders` | Admin | Lấy danh sách đơn hàng |
| PATCH | `/api/orders/:id/status` | Admin | Cập nhật trạng thái đơn hàng/payment |
| GET | `/api/orders/admin/waiting-processing` | Admin | Lấy đơn đã thanh toán, chờ xử lý |
| PATCH | `/api/orders/admin/:id/delivery-time` | Admin | Thiết lập thời gian giao dự kiến |
| PATCH | `/api/orders/admin/:id/status` | Admin | Cập nhật trạng thái xử lý/giao hàng |
| PATCH | `/api/orders/:id/delivery-popup-seen` | User | Đánh dấu đã xem popup giao hàng |
| POST | `/api/orders/events/payment-succeeded` | Admin/Internal | Giả lập/consume PaymentSucceeded |

Qua API gateway, admin routes cũng dùng được ở:

```txt
GET /api/admin/orders/waiting-processing
PATCH /api/admin/orders/:id/delivery-time
PATCH /api/admin/orders/:id/status
```

## Create order body

```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "name": "Dog food",
      "price": 120000,
      "quantity": 2,
      "imageUrl": "https://example.com/dog-food.jpg"
    }
  ],
  "shippingAddress": {
    "fullName": "Nguyen Van A",
    "phone": "0900000000",
    "address": "123 Nguyen Trai",
    "city": "Ho Chi Minh",
    "note": "Call before delivery"
  },
  "paymentMethod": "cod"
}
```

## Chạy service

```bash
npm install
npm run dev
```

## Order lifecycle

Order mới tạo có:

```txt
paymentStatus=PENDING
orderStatus=PENDING_PAYMENT
```

Khi payment-service phát `PaymentSucceeded`, order-service cập nhật:

```txt
paymentStatus=PAID
orderStatus=WAITING_FOR_PROCESSING
```

Admin xử lý tiếp theo thứ tự:

```txt
WAITING_FOR_PROCESSING -> PROCESSING -> WAITING_FOR_DELIVERY -> DELIVERING -> DELIVERED
```

Khi order sang `DELIVERED`, service set `deliveredAt` và `deliveryPopupSeen=false`.
Customer gọi `PATCH /api/orders/:id/delivery-popup-seen` sau khi đã thấy thông báo giao hàng.
