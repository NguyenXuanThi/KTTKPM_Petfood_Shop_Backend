# Appointment Service

Tài liệu ngắn về những thay đổi và hành vi hiện tại của `appointment-service`.

## Tổng quan

Service quản lý đặt lịch hẹn cho dịch vụ thú cưng. Thiết kế hiện tại dùng mô hình "fixed-slot": lưu `appointmentDate` (YYYY-MM-DD) và `appointmentSlot` (HH:mm) thay vì thời gian tự do.

## Những thay đổi chính (đã triển khai)

- Mô hình slot cố định:
	- `appointmentDate`: chuỗi theo định dạng `YYYY-MM-DD`.
	- `appointmentSlot`: chuỗi theo định dạng `HH:mm` (ví dụ `08:00`, `08:30`).
	- Các slot sinh tự động: buổi sáng 08:00..12:00, buổi chiều 13:00..17:00, bước nhảy 30 phút.
- Giới hạn sức chứa cố định: mỗi slot có sức chứa tối đa 3 lượt (`MAX_CONCURRENT = 3`).
- Schema Mongoose cập nhật với index: `AppointmentSchema.index({ appointmentDate: 1, appointmentSlot: 1 })` để truy vấn nhanh.

- API endpoints:
	- `GET /api/appointments/slots?date=YYYY-MM-DD` — trả về danh sách slot trong ngày với `currentBookings`, `remaining`, `isFull`.
	- `POST /api/appointments` — tạo appointment mới.

- Validation phía server (rất nghiêm ngặt):
	- `customerName`: chuỗi, 2..50 ký tự, chỉ cho phép chữ Unicode, dấu, khoảng trắng, dấu chấm, gạch nối, dấu nháy.
	- `customerPhone`: chuẩn Việt Nam, bắt đầu bằng 03/05/07/08/09 và đủ 10 chữ số.
	- `petName`: 1..40 ký tự, cho phép chữ và số.
	- `appointmentDate`: định dạng `YYYY-MM-DD`, không cho phép đặt quá khứ.
	- `appointmentSlot`: định dạng `HH:mm` và phải là một trong các slot hợp lệ (30-phút step, trong khung giờ làm việc).

- Hành vi khi tạo appointment:
	- Đếm số booking hiện có cho cùng `appointmentDate` + `appointmentSlot` và từ chối nếu đã đạt `MAX_CONCURRENT`.
	- Hỗ trợ nhận `appointmentSlot` (ưu tiên) hoặc legacy `appointmentTime` từ frontend.

## Model (tóm tắt)

- File: `src/models/Appointment.js`
- Các trường quan trọng: `customerId`, `supportId`, `customerName`, `customerPhone`, `petName`, `petType`, `serviceType`, `appointmentDate`, `appointmentSlot`, `note`, `status`.

## Ví dụ

- Lấy slot cho ngày:

	GET /api/appointments/slots?date=2026-05-22

	Response (mẫu):

	{
		"success": true,
		"date": "2026-05-22",
		"capacity": 3,
		"slots": [
			{ "slot": "08:00", "currentBookings": 1, "remaining": 2, "isFull": false },
			...
		]
	}

- Tạo appointment:

	POST /api/appointments
	Content-Type: application/json

	{
		"customerId": "user_123",
		"customerName": "Nguyễn Văn A",
		"customerPhone": "0912345678",
		"petName": "Bim",
		"petType": "dog",
		"serviceType": "Tắm rửa",
		"appointmentDate": "2026-05-25",
		"appointmentSlot": "09:30",
		"note": "Lưu ý: ..."
	}

	Response thành công: `201` với object appointment trả về.

## Cách chạy (local)

- Cần môi trường: `APPOINTMENT_MONGODB_URI` (connection string MongoDB). Tùy chọn `APPOINTMENT_PORT` (mặc định `3013`) và `APPOINTMENT_CORS_ORIGIN`.

1. Cài dependency:

```bash
npm install
```

2. Chạy dev:

```bash
npm run dev
```

## Ghi chú kỹ thuật

- Service dùng `dayjs` để kiểm tra thời gian và tránh đặt lịch quá khứ.
- Validation chủ yếu thực hiện ở `src/controllers/appointmentController.js` và trả về thông báo lỗi rõ ràng (tiếng Việt khi có thể).
- Route chính được mount tại `app.use('/api/appointments', appointmentsRoute)`.

---
Updated: những thay đổi về mô hình slot cố định, validation, endpoint `slots` và cơ chế chống overbook đã được triển khai.

