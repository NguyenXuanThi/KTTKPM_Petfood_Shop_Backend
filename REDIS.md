# Redis trong backend Petfood

## 1. Redis dùng để làm gì?

Redis được dùng cho dữ liệu ngắn hạn và có TTL:

- OTP đặt lại mật khẩu.
- Cooldown gửi lại OTP.
- Bộ đếm rate limit.
- Cache danh sách category, product và coupon.
- Short-lived lock/counter trong tương lai.
- Nền tảng chuẩn bị cho BullMQ job queues sau này.

## 2. Redis không thay thế MongoDB

MongoDB vẫn là nguồn dữ liệu chính của hệ thống. Redis chỉ lưu dữ liệu tạm thời, cache hoặc counter. Nếu cache Redis bị mất, service phải có thể đọc lại từ MongoDB.

## 3. Service đang dùng Redis

- `auth-service`: OTP, OTP cooldown, resend counter, verify attempts, rate limit login/forgot/reset.
- `api-gateway`: rate limit tổng cho `/api`.
- `ai-service`: rate limit chat HTTP/socket.
- `category-service`: cache category list và menu.
- `product-service`: cache product list và product detail.
- `coupon-service`: cache public coupon và available coupon theo user.

## 4. Key pattern đang dùng

OTP:

- `otp:reset:{email}`
- `otp:reset:cooldown:{email}`
- `otp:reset:resend:{email}`
- `otp:reset:attempts:{email}`

Rate limit:

- `rate:api-gateway:general:{ip}`
- `rate:auth:login:{emailOrIp}`
- `rate:auth:forgot-password:{emailOrIp}`
- `rate:auth:reset-password:{emailOrIp}`
- `rate:ai:chat:ip:{ip}`

Cache:

- `cache:categories:list`
- `cache:categories:list:{hashQuery}`
- `cache:categories:menu`
- `cache:products:list:{hashQuery}`
- `cache:products:detail:{productId}`
- `cache:coupons:public:{userId}:{orderAmount}:{shippingFee}`
- `cache:coupons:available:{userId}:{subtotal}:{shippingFee}`

## 5. TTL

- OTP đặt lại mật khẩu: `180 giây`.
- Cooldown gửi lại OTP: `60 giây`.
- Resend counter: `15 phút`.
- OTP attempts: `180 giây`.
- Category cache: `5 phút`.
- Product cache: `3 phút`.
- Public coupon cache: `3 phút`.
- Available coupon cache: `60 giây`.
- API gateway rate limit: theo `API_GATEWAY_RATE_LIMIT_WINDOW_MS`, mặc định `15 phút`.
- Auth rate limit: `15 phút`.
- AI chat rate limit: `60 giây`.

## 6. Cài Redis local

Cách nhanh nhất là dùng Docker:

```bash
docker compose -f be/petfood_be/docker-compose.yml up -d redis
```

Hoặc nếu đã cài Redis local:

```bash
redis-server
```

## 7. Chạy bằng Docker

File compose đã có service:

```yaml
redis:
  image: redis:7-alpine
  container_name: petfood-redis
  ports:
    - "6379:6379"
  command: ["redis-server", "--appendonly", "yes"]
  volumes:
    - redis_data:/data
```

Nếu service backend chạy trong Docker network, dùng:

```env
REDIS_URL=redis://redis:6379
```

Nếu chạy service trực tiếp trên máy host, dùng:

```env
REDIS_URL=redis://localhost:6379
```

## 8. Cấu hình env

Thêm vào service dùng Redis:

```env
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
```

Tắt Redis tạm thời khi debug cache:

```env
REDIS_ENABLED=false
```

Lưu ý: cache có thể fallback về MongoDB khi Redis lỗi, nhưng OTP Redis là bắt buộc để đảm bảo TTL/cooldown/attempt chính xác.

## 9. Test bằng Redis CLI

```bash
redis-cli keys '*'
redis-cli get cache:categories:list
redis-cli ttl otp:reset:user@gmail.com
redis-cli ttl otp:reset:cooldown:user@gmail.com
redis-cli get rate:auth:login:email:user@gmail.com
```

## 10. Clear cache

Xóa cache category:

```bash
redis-cli keys 'cache:categories:*'
redis-cli del cache:categories:list
```

Xóa cache product detail:

```bash
redis-cli del cache:products:detail:PRODUCT_ID
```

Xóa toàn bộ database Redis local:

```bash
redis-cli flushdb
```

Cảnh báo: không dùng `FLUSHDB` trên production.

## 11. Nguyên tắc đặt key

- Dùng prefix rõ domain: `otp`, `rate`, `cache`.
- Luôn include userId/email nếu dữ liệu riêng tư theo user.
- Không cache available coupon nếu thiếu `userId`.
- Dữ liệu nhạy cảm như OTP phải hash trước khi lưu.
- Key cache cần có TTL.
- Invalidate cache khi dữ liệu gốc thay đổi.

## 12. Redis sẽ dùng sau này

- BullMQ gửi email retry.
- BullMQ auto cancel unpaid banking order sau 24 giờ.
- Delayed notification.
- Cleanup dữ liệu hết hạn.
- Distributed lock cho các thao tác nhạy cảm nếu cần.

Hiện tại chỉ tạo folder placeholder:

- `notification-service/src/jobs/`
- `order-service/src/jobs/`

## 13. Kafka sẽ làm gì sau này?

Kafka chưa được implement trong phase này.

Kafka sẽ phù hợp cho event bất đồng bộ giữa microservice:

- `payment.paid`
- `order.completed`
- `coupon.assigned`
- `review.created`
- `reward.granted`
- `appointment.created`

Không trộn logic Redis cache/rate limit với Kafka event. Redis xử lý dữ liệu tạm thời; Kafka xử lý business event.

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
