# Kafka trong backend Petfood

## 1. Kafka dùng để làm gì?

Kafka được dùng cho các business event bất đồng bộ giữa microservice. Ví dụ: payment đã paid, order completed, coupon assigned, review created, reward granted, appointment created.

Kafka không nằm trong request/response trực tiếp từ frontend. REST API vẫn là luồng chính để người dùng thao tác.

## 2. Kafka khác Redis như thế nào?

- Redis: cache, OTP TTL, rate limit, cooldown, dữ liệu tạm thời.
- Kafka: event stream bất đồng bộ, publish/subscribe giữa service.

Không dùng Kafka để thay Redis. Không dùng Redis để thay Kafka event.

## 3. Kafka không thay thế REST API

Các luồng như login, CRUD product/category/coupon, checkout, upload image vẫn dùng REST.

Kafka chỉ dùng để service phát tín hiệu sau khi nghiệp vụ đã thành công. Ví dụ admin approve payment xong thì payment-service publish `payment.paid`.

## 4. Kafka chỉ dùng cho event bất đồng bộ

Nếu Kafka tắt bằng:

```env
KAFKA_ENABLED=false
```

service vẫn phải chạy được. Các flow REST hiện tại vẫn hoạt động.

## 5. Danh sách topic

- `payment.paid`
- `payment.failed`
- `order.completed`
- `order.cancelled`
- `coupon.assigned`
- `review.created`
- `reward.granted`
- `appointment.created`
- `ai.chat.created`
- `user.registered` chuẩn bị cho tương lai

## 6. Producer và consumer

`payment.paid`

- Producer: `payment-service`
- Consumer: `order-service`, `reward-service`, `notification-service`

`payment.failed`

- Producer: `payment-service`
- Consumer: chuẩn bị cho notification/statistics sau này

`order.completed`

- Producer: `order-service`
- Consumer: `reward-service`, `notification-service`

`order.cancelled`

- Producer: `order-service`
- Consumer: chuẩn bị cho notification/statistics sau này

`coupon.assigned`

- Producer: `coupon-service`
- Consumer: `notification-service`

`review.created`

- Producer: `review-service`
- Consumer: `product-service`, `notification-service`

`reward.granted`

- Producer: `reward-service`
- Consumer: `notification-service`

`appointment.created`

- Producer: `appointment-service`
- Consumer: `notification-service`

`ai.chat.created`

- Producer: `ai-service`
- Consumer: chuẩn bị cho analytics/logging sau này

## 7. Event envelope chuẩn

Mọi event publish qua helper `events/kafkaProducer.js` có format:

```json
{
  "eventId": "uuid",
  "eventType": "payment.paid",
  "occurredAt": "2026-05-27T10:00:00.000Z",
  "producer": "petfood-payment-service",
  "version": 1,
  "data": {}
}
```

## 8. Chạy Kafka bằng Docker

Chạy tại backend root:

```bash
cd be/petfood_be
docker compose up -d kafka
```

Kafka đang dùng KRaft mode qua image `bitnami/kafka:3.7`.

Local host dùng:

```env
KAFKA_BROKERS=localhost:9092
```

Service chạy trong Docker network dùng:

```env
KAFKA_BROKERS=kafka:9092
```

## 9. Bật/tắt Kafka bằng env

```env
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=petfood-payment-service
```

Tắt Kafka:

```env
KAFKA_ENABLED=false
```

Khi broker không chạy trong development, producer/consumer log warning và service vẫn tiếp tục chạy.

## 10. Test event `payment.paid`

1. Bật Kafka:

```bash
docker compose up -d kafka
```

2. Start `payment-service`, `order-service`, `reward-service`, `notification-service`.

3. Admin approve banking payment qua REST:

```http
PATCH /api/payments/admin/payments/:id/approve
```

4. Kỳ vọng:

- `payment-service` publish `payment.paid`.
- `order-service` consume và set `order.paymentStatus = paid`.
- `reward-service` consume và grant spin idempotent theo `userId + orderId`.
- `notification-service` log/send email admin thông báo payment paid.

## 11. Debug consumer log

Tìm log:

```text
[petfood-order-service] Kafka consumer started
[petfood-reward-service] Kafka consumer started
[petfood-product-service] Kafka consumer started
```

Nếu broker chưa chạy:

```text
Kafka consumer unavailable
Kafka producer unavailable
```

Đây là warning non-fatal trong development.

## 12. Flow đã triển khai

- `payment-service` publish `payment.paid` khi admin approve banking payment.
- `payment-service` publish `payment.failed` khi admin reject banking payment.
- `order-service` consume `payment.paid` và cập nhật payment status idempotent.
- `reward-service` consume `payment.paid` và `order.completed`, grant spin idempotent.
- `order-service` publish `order.completed` khi admin mark completed.
- `coupon-service` publish `coupon.assigned` khi assign coupon.
- `review-service` publish `review.created` khi tạo review visible.
- `product-service` consume `review.created` và sync rating summary từ event summary.
- `reward-service` publish `reward.granted` khi grant spin/win reward/exchange reward.
- `appointment-service` publish `appointment.created` khi tạo lịch hẹn.
- `ai-service` publish `ai.chat.created` sau khi AI trả lời, không chặn response cho frontend.

## 13. Flow chuẩn bị tương lai

- `user.registered`
- notification retry bằng BullMQ
- analytics-service riêng
- event-driven statistics
- push notification / SMS

## 14. Ghi chú ai-service Request-Reply Kafka

`ai-service` đã có Kafka Request-Reply riêng cho product search/inventory:

- `product.search.request`
- `product.search.response`
- `product.inventory.request`
- `product.inventory.response`

Đây là pattern request-reply nội bộ có HTTP fallback trong `productClient.js`. Không nhầm lẫn nó với business event async ở trên.

Nếu Kafka tắt hoặc broker lỗi, AI vẫn fallback sang HTTP để search product/check inventory.

## Kafka debug log

Bật log payload đầy đủ khi cần debug:

`env
KAFKA_DEBUG_LOG=true
` 

Khi bật, consumer log topic, partition, offset và payload JSON. Mặc định nên để KAFKA_DEBUG_LOG=false để log gọn, dễ demo business flow.

KafkaJS partitioner warning được silence bằng KAFKAJS_NO_PARTITIONER_WARNING=1 trong config Kafka của service.

## Automatic topic bootstrap

Mỗi service có Kafka dùng `events/kafkaAdmin.js` để tự đảm bảo topic tồn tại trước khi consumer subscribe hoặc producer publish.

Cấu hình topic local development:

- `partitions: 1`
- `replicationFactor: 1`

Startup log mong đợi:

```text
[reward-service] Ensuring Kafka topics...
[reward-service] Kafka topics ready
[reward-service] Starting Kafka consumer...
[reward-service] Kafka consumer started: reward-service-business-events
```

Nếu Kafka metadata tạm thời chưa sẵn sàng, consumer sẽ log warning và tự retry nền sau `KAFKA_CONSUMER_RETRY_DELAY_MS` milliseconds, mặc định `5000`.

```env
KAFKA_CONSUMER_RETRY_DELAY_MS=5000
```

Sau khi `docker compose down` hoặc xóa Kafka volume, chỉ cần bật Kafka và restart service. Topics sẽ được tạo lại tự động, không cần chạy lệnh tạo topic thủ công.
