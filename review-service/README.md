# Review Service

Owns verified-purchase product reviews.

## Key Rules
- New reviews must be created through review-service, not product-service.
- A user can review only products from their own completed + paid orders.
- Duplicate reviews are blocked per `(userId, productId, orderId)`.
- Hidden reviews are excluded from public product review lists and rating summary.

## APIs
- `GET /products/:productId/reviews`
- `POST /reviews`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`
- `PATCH /admin/reviews/:id/hide`
- `PATCH /admin/reviews/:id/show`

## Migration Note
Old product-service reviews should be treated as legacy data. Do not allow new writes there. If migrated later, legacy reviews without `orderId` should be imported with `isVerifiedPurchase=false` and reviewed by admin before being visible.
