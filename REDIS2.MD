# REDIS.md — Hướng dẫn Redis trong backend Petfood

## 1. Redis là gì trong dự án này?

Redis được dùng như một nơi lưu dữ liệu tạm thời, tốc độ cao.

Trong hệ thống Petfood, Redis dùng cho:

- Lưu OTP quên mật khẩu trong 180 giây.
- Đếm thời gian chờ gửi lại OTP trong 60 giây.
- Giới hạn số lần gửi OTP để tránh spam.
- Giới hạn số lần gọi API như login, forgot password, chatbot.
- Cache danh sách product, category, coupon để web tải nhanh hơn.
- Chuẩn bị cho BullMQ job queue sau này.

Redis không thay thế MongoDB.

MongoDB vẫn là database chính. Redis chỉ lưu dữ liệu tạm thời hoặc cache.

---

## 2. Redis khác MongoDB như thế nào?

### MongoDB

Dùng để lưu dữ liệu chính:

- user
- product
- category
- order
- payment
- coupon
- review
- reward

Dữ liệu trong MongoDB cần được giữ lâu dài.

### Redis

Dùng để lưu dữ liệu ngắn hạn:

- OTP
- cooldown
- cache
- rate limit
- counter

Dữ liệu trong Redis có thể tự hết hạn bằng TTL.

Ví dụ:

```text
OTP quên mật khẩu chỉ sống 180 giây.
Sau 180 giây Redis tự xóa OTP.
```

---

## 3. Những service đang dùng Redis

### auth-service

Dùng Redis cho:

- OTP quên mật khẩu.
- Cooldown gửi lại OTP.
- Giới hạn số lần gửi lại OTP.
- Giới hạn số lần nhập sai OTP.
- Rate limit login / forgot password / reset password.

### api-gateway

Dùng Redis để rate limit toàn bộ API.

Ví dụ:

```text
Một IP gọi API quá nhiều lần trong thời gian ngắn sẽ bị chặn tạm thời.
```

### ai-service

Dùng Redis để rate limit chatbot.

Ví dụ:

```text
Một user gửi quá nhiều câu hỏi liên tục thì hệ thống sẽ yêu cầu chờ.
```

### category-service

Dùng Redis để cache danh sách category.

### product-service

Dùng Redis để cache:

- danh sách product
- chi tiết product

### coupon-service

Dùng Redis để cache:

- public coupon
- available coupon của từng user

Lưu ý: coupon theo user phải cache theo `userId`, không được cache chung.

---

## 4. Các key Redis đang dùng

### OTP quên mật khẩu

```text
otp:reset:{email}
otp:reset:cooldown:{email}
otp:reset:resend:{email}
otp:reset:attempts:{email}
```

Ví dụ:

```text
otp:reset:test@gmail.com
otp:reset:cooldown:test@gmail.com
```

Ý nghĩa:

| Key                          | Ý nghĩa                       |
| ---------------------------- | ----------------------------- |
| `otp:reset:{email}`          | Lưu OTP đã hash               |
| `otp:reset:cooldown:{email}` | Chặn gửi lại mã trong 60 giây |
| `otp:reset:resend:{email}`   | Đếm số lần gửi lại mã         |
| `otp:reset:attempts:{email}` | Đếm số lần nhập sai OTP       |

---

### Rate limit

```text
rate:api-gateway:general:{ip}
rate:auth:login:{emailOrIp}
rate:auth:forgot-password:{emailOrIp}
rate:auth:reset-password:{emailOrIp}
rate:ai:chat:ip:{ip}
```

Ví dụ:

```text
rate:auth:login:test@gmail.com
rate:ai:chat:ip:127.0.0.1
```

---

### Cache

```text
cache:categories:list
cache:categories:menu
cache:products:list:{hashQuery}
cache:products:detail:{productId}
cache:coupons:public
cache:coupons:available:{userId}:{subtotal}:{shippingFee}
```

Ví dụ:

```text
cache:products:detail:665f123abc
cache:coupons:available:USER_ID:600000:30000
```

---

## 5. TTL là gì?

TTL là thời gian sống của key trong Redis.

Ví dụ:

```text
otp:reset:test@gmail.com
TTL = 180 giây
```

Sau 180 giây, Redis tự xóa key này.

---

## 6. TTL đang dùng trong dự án

| Dữ liệu                |      TTL |
| ---------------------- | -------: |
| OTP quên mật khẩu      | 180 giây |
| Cooldown gửi lại OTP   |  60 giây |
| Resend counter         |  15 phút |
| OTP attempts           | 180 giây |
| Category cache         |   5 phút |
| Product cache          |   3 phút |
| Public coupon cache    |   3 phút |
| Available coupon cache |  60 giây |
| API gateway rate limit |  15 phút |
| Auth rate limit        |  15 phút |
| AI chat rate limit     |  60 giây |

---

## 7. Cài Redis bằng Docker

Chạy Redis:

```bash
docker compose up -d redis
```

Hoặc nếu dùng file compose ở backend:

```bash
docker compose -f be/petfood_be/docker-compose.yml up -d redis
```

Kiểm tra container:

```bash
docker ps
```

Nếu thấy:

```text
petfood-redis
```

là Redis đã chạy.

---

## 8. Test Redis bằng CLI

Vào Redis CLI:

```bash
docker exec -it petfood-redis redis-cli
```

Test Redis:

```bash
ping
```

Nếu trả về:

```text
PONG
```

là Redis hoạt động.

Xem tất cả key:

```bash
keys *
```

Xem TTL của OTP:

```bash
ttl otp:reset:test@gmail.com
```

Xem dữ liệu cache:

```bash
get cache:categories:list
```

Thoát Redis CLI:

```bash
exit
```

---

## 9. Cấu hình env

Nếu service chạy trực tiếp trên máy:

```env
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

Nếu service chạy trong Docker cùng network với Redis:

```env
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true
```

Nếu muốn tạm tắt Redis khi debug:

```env
REDIS_ENABLED=false
```

Lưu ý:

```text
Cache có thể fallback về MongoDB nếu Redis lỗi.
Nhưng OTP nên cần Redis để TTL/cooldown/attempt chính xác.
```

---

## 10. Cách test Redis trên giao diện

### Test OTP quên mật khẩu

1. Vào trang quên mật khẩu.
2. Nhập email.
3. Bấm gửi mã.
4. Kiểm tra giao diện có countdown 180 giây.
5. Nút gửi lại mã bị khóa 60 giây.
6. Sau 60 giây bấm gửi lại mã.
7. Mã cũ phải không còn dùng được.
8. Mã mới dùng được nếu chưa hết hạn.

Kiểm tra Redis:

```bash
docker exec -it petfood-redis redis-cli
keys 'otp:*'
ttl otp:reset:your_email@gmail.com
```

---

### Test rate limit login

1. Nhập sai mật khẩu nhiều lần.
2. Sau một số lần, hệ thống phải báo thao tác quá nhiều.
3. Không được crash service.

Kiểm tra Redis:

```bash
keys 'rate:auth:login:*'
```

---

### Test cache category

1. Mở trang category.
2. Lần đầu service query MongoDB.
3. Redis lưu cache.
4. Load lại trang, service có thể lấy từ Redis.

Kiểm tra:

```bash
keys 'cache:categories:*'
get cache:categories:list
```

---

### Test cache product

1. Mở trang product list.
2. Mở chi tiết một product.
3. Redis tạo key cache.

Kiểm tra:

```bash
keys 'cache:products:*'
```

---

### Test cache coupon

1. Vào checkout.
2. Mở danh sách coupon khả dụng.
3. Redis tạo cache theo user.

Kiểm tra:

```bash
keys 'cache:coupons:*'
```

---

## 11. Xóa cache khi cần

Xóa cache category:

```bash
del cache:categories:list
```

Xóa product detail:

```bash
del cache:products:detail:PRODUCT_ID
```

Xóa toàn bộ Redis local:

```bash
flushdb
```

Cảnh báo:

```text
Không dùng FLUSHDB trên production.
```

---

## 12. Nguyên tắc đặt key Redis

Nên đặt key theo format:

```text
domain:type:identifier
```

Ví dụ:

```text
otp:reset:user@gmail.com
rate:auth:login:user@gmail.com
cache:products:detail:PRODUCT_ID
```

Nguyên tắc:

- Key phải dễ hiểu.
- Dữ liệu riêng của user phải có `userId` hoặc `email`.
- Dữ liệu cache phải có TTL.
- OTP phải hash trước khi lưu.
- Không lưu password/token nhạy cảm dạng plain text.
- Khi dữ liệu MongoDB thay đổi thì phải xóa cache liên quan.

---

## 13. Redis fallback

Với cache:

```text
Nếu Redis lỗi → query MongoDB bình thường.
```

Ví dụ product-service:

```text
Redis lỗi
→ bỏ qua cache
→ đọc product từ MongoDB
```

Với OTP:

```text
Redis lỗi
→ trả lỗi thân thiện
```

Vì OTP cần TTL/cooldown chính xác.

---

## 14. Redis dùng cho BullMQ sau này

Hiện tại chưa triển khai BullMQ.

Sau này có thể dùng Redis + BullMQ cho:

- Gửi email retry.
- Auto cancel banking order sau 24 giờ.
- Delayed notification.
- Cleanup data hết hạn.

Folder placeholder:

```text
notification-service/src/jobs/
order-service/src/jobs/
```

---

## 15. Kafka để làm gì sau này?

Kafka không thay thế Redis.

Kafka sẽ dùng cho business event giữa các microservice:

```text
payment.paid
order.completed
coupon.assigned
review.created
reward.granted
appointment.created
```

Ví dụ:

```text
payment-service publish payment.paid
order-service consume để update order
reward-service consume để cấp lượt quay
notification-service consume để gửi email
```

Redis dùng cho:

```text
cache, OTP, rate limit, TTL, queue
```

Kafka dùng cho:

```text
event bất đồng bộ giữa service
```

Không trộn logic Redis với Kafka.

---

## 16. Checklist chạy Redis thành công

1. Redis container chạy:

```bash
docker ps
```

2. Redis trả về PONG:

```bash
docker exec -it petfood-redis redis-cli ping
```

3. Service có env:

```env
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

4. Restart service:

```bash
npm run dev
```

5. Test quên mật khẩu trên giao diện.

6. Kiểm tra key OTP:

```bash
docker exec -it petfood-redis redis-cli keys 'otp:*'
```

7. Test product/category page.

8. Kiểm tra cache:

```bash
docker exec -it petfood-redis redis-cli keys 'cache:*'
```

Nếu các bước trên chạy được, Redis đã hoạt động đúng.

## Forgot-password resend policy

Forgot-password resend KHÔNG được kiểm soát bằng rate limit dài theo email.

Luồng đúng:

- `otp:reset:cooldown:{email}` kiểm soát thời gian chờ gửi lại OTP: TTL `60 giây`.
- `otp:reset:resend:{email}` kiểm soát số lần gửi OTP trong cửa sổ `15 phút`, tối đa `3` lần.
- `/auth/forgot-password` chỉ giữ IP-level anti-spam nhẹ qua `rate:auth:forgot-password-ip:{ip}` để chống spam diện rộng.
- Không dùng `rate:auth:forgot-password:{email}` để chặn resend, vì key này có thể còn TTL vài phút và làm UX sai.

Thông báo backend:

- Nếu cooldown còn hiệu lực: `Vui lòng chờ {seconds}s trước khi gửi lại mã` và trả thêm `remainingSeconds`.
- Nếu resend quá giới hạn: `Bạn đã gửi mã quá nhiều lần. Vui lòng thử lại sau 15 phút`.

Frontend phải bắt đầu countdown 60 giây sau khi gửi OTP thành công và chỉ gọi resend API khi countdown về 0. Nếu backend trả `remainingSeconds`, frontend phải đồng bộ lại countdown theo giá trị này.
