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

| Method | Endpoint                 | Quyền       | Mô tả                                |
| ------ | ------------------------ | ----------- | ------------------------------------ |
| POST   | `/api/orders`            | User        | Tạo đơn hàng                         |
| GET    | `/api/orders/me`         | User        | Lấy đơn hàng của user hiện tại       |
| GET    | `/api/orders/:id`        | Owner/Admin | Xem chi tiết đơn hàng                |
| GET    | `/api/orders`            | Admin       | Lấy danh sách đơn hàng               |
| PATCH  | `/api/orders/:id/status` | Admin       | Cập nhật trạng thái đơn hàng/payment |

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
