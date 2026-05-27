# Petfood Backend API Reference

Tai lieu nay tong hop tat ca API hien dang co trong codebase (`be/petfood_be`) va cach dung nhanh.

## 1) Ports va Base URLs (dev)

- API Gateway: `http://localhost:3000`
- Auth Service: `http://localhost:3001`
- User Service: `http://localhost:3002`
- Product Service: `http://localhost:3003`
- Category Service: `http://localhost:3005`
- Upload Service: `http://localhost:3006`
- Cart Service: `http://localhost:3007`

## 2) Gateway routes hien co

Gateway hien dang proxy:

- `/api/auth/*` -> auth-service
- `/api/products/*` -> product-service
- `/api/cart/*` -> cart-service

Gateway health:

- `GET /health`
- `GET /api/health`

Luu y: `user-service`, `category-service`, `upload-service` hien chua duoc proxy qua gateway, can goi truc tiep service URL.

## 3) Auth Service (`http://localhost:3001`)

Base path:

- `/auth/*`
- `/api/auth/*` (alias)

Endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /health`

### 3.1 Register

`POST /auth/register`

Body JSON:

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "12345678"
}
```

Ket qua:

- Tra `accessToken`
- Set cookie HttpOnly `refreshToken`

### 3.2 Login

`POST /auth/login`

Body JSON:

```json
{
  "email": "a@example.com",
  "password": "12345678"
}
```

### 3.3 Me

`GET /auth/me`

Header:

```text
Authorization: Bearer <accessToken>
```

### 3.4 Refresh

`POST /auth/refresh`

- Doc `refreshToken` tu cookie
- Tra `accessToken` moi va xoay vong refresh token

### 3.5 Logout

`POST /auth/logout`

- Xoa session refresh token
- Clear cookie

## 4) User Service (`http://localhost:3002`)

Base path:

- `/users/*`
- `/api/users/*` (alias)

### 4.1 User self-service (can Bearer token)

- `GET /users/me`
- `PATCH /users/me`
- `PATCH /users/me/password`

`PATCH /users/me` body JSON (avatar la URL string, khong upload file):

```json
{
  "fullName": "Nguyen Van A Updated",
  "avatarUrl": "https://cdn.example.com/avatar-a.jpg"
}
```

`PATCH /users/me/password` body JSON:

```json
{
  "oldPassword": "12345678",
  "newPassword": "87654321"
}
```

### 4.2 Admin APIs (can Bearer token role=admin)

- `GET /users?page=1&limit=20&email=`
- `PATCH /users/:id/role`
- `PATCH /users/:id/restore`

`PATCH /users/:id/role` body:

```json
{
  "role": "admin"
}
```

### 4.3 Internal APIs (cho auth-service)

- `POST /users` (tao user + hash password)
- `GET /users/email/:email` (tra user co password hash cho login)
- `GET /users/:id` (tra profile theo id)

## 5) Product Service (`http://localhost:3003`)

Base path: `/api/products`

Endpoints:

- `GET /api/products`
- `GET /api/products/search`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /health`

List query:

- `keyword`
- `categoryId`
- `page`, `limit`
- `sortBy=createdAt|updatedAt|name|price`
- `sortOrder=asc|desc`

Create/Update dung `multipart/form-data`, file field: `image`.

Luu y:

- Product-service khong upload truc tiep S3/Cloudinary
- Product-service goi `upload-service` qua HTTP
- Validate category qua `category-service`

## 6) Category Service (`http://localhost:3005`)

Base path: `/api/categories`

Endpoints:

- `GET /api/categories`
- `GET /api/categories/menu`
- `GET /api/categories/tree`
- `GET /api/categories/slug/:slug`
- `GET /api/categories/:id`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id` (soft delete)
- `GET /health`

## 7) Cart Service (`http://localhost:3007`)

Base path: `/api/cart`

Endpoints:

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:productId`
- `DELETE /api/cart/items/:productId`
- `DELETE /api/cart`
- `POST /api/cart/validate`
- `POST /api/cart/merge`
- `GET /health`

Dinh danh cart:

- User: `Authorization: Bearer <accessToken>`
- Guest: `x-cart-token: <guest-token>`

## 8) Upload Service (`http://localhost:3006`)

Base path:

- `/upload/*`
- `/api/upload/*` (alias)

Endpoints:

- `POST /upload`
- `POST /upload/presigned`
- `DELETE /upload`
- `GET /health`

### 8.1 Upload file

`POST /upload`

Multipart form-data:

- `file` (required)
- `type` (required): `avatar | product | chat`

Response mau:

```json
{
  "url": "https://cdn.app.com/file.jpg",
  "provider": "s3",
  "key": "products/file-uuid.jpg",
  "metadata": {
    "type": "product",
    "size": 12345,
    "mimeType": "image/jpeg",
    "originalName": "cat-food.jpg"
  }
}
```

### 8.2 Presigned URL (bonus)

`POST /upload/presigned`

Body JSON:

```json
{
  "type": "product",
  "fileName": "cat-food.jpg",
  "mimeType": "image/jpeg",
  "expiresInSec": 600
}
```

### 8.3 Delete file (bonus)

`DELETE /upload`

Body JSON:

```json
{
  "provider": "s3",
  "key": "products/file-uuid.jpg"
}
```

## 9) Curl nhanh theo luong

### 9.1 Register -> Login -> Me

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Demo","email":"demo@example.com","password":"12345678"}'

curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"12345678"}'

curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### 9.2 User self-service

```bash
curl http://localhost:3002/users/me \
  -H "Authorization: Bearer <accessToken>"

curl -X PATCH http://localhost:3002/users/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Demo Updated","avatarUrl":"https://cdn.example.com/a.jpg"}'
```

### 9.3 Upload product image qua upload-service

```bash
curl -X POST http://localhost:3006/upload \
  -F "type=product" \
  -F "file=@./sample.jpg"
```

## 10) Ghi chu quan trong

- User-service khong upload file truc tiep; chi nhan `avatarUrl` string.
- Product-service va user-service deu goi upload-service qua Axios.
- Gateway hien chua mo route cho user/category/upload service.
- Neu frontend can 1 base URL duy nhat, can bo sung proxy routes vao gateway.
