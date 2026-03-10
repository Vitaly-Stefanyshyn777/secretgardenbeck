# Відповідність бекенду вимогам

## ✅ Підтримується

| Маршрут | NestJS | Статус |
|---------|--------|--------|
| `/api/cart` | `GET /api/cart` | ✅ |
| `/api/cart/sync` | `POST /api/cart/sync` | ✅ |
| `/api/catalog/products` | `GET /api/catalog/products` | ✅ |
| `/api/catalog/categories` | `GET /api/catalog/categories` | ✅ |
| `/api/wishlist` | `GET /api/wishlist` | ✅ |
| `/api/wishlist/sync` | `POST /api/wishlist/sync` | ✅ |
| `/api/user/me` | `GET /api/user/me` | ✅ |
| `/api/user/profile` | `PATCH /api/user/profile` | ✅ |
| `/api/user/password` | `PATCH /api/user/password` | ✅ |
| `/api/auth/login` | `POST /api/auth/login` | ✅ |
| `/api/auth/register` | `POST /api/auth/signup` | ✅ (signup = register) |
| `/api/auth/refresh` | `POST /api/auth/refresh` | ✅ |
| `/api/viewed` | `GET/POST /api/viewed`, `POST /api/viewed/sync` | ✅ |
| `/api/orders` | `POST /api/orders`, `GET /api/orders` | ✅ |

---

## Cart Sync — повна відповідність ✅

**Вимога:** `{ items, items_count, total, currency }`, item: `productId`, `product`, `quantity`, `name`, `price`, `mainImageUrl`

**Відповідь GET/POST /api/cart:**
```json
{
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "name": "CBD масло 5%",
      "price": 900,
      "mainImageUrl": null,
      "product": { "id", "name", "slug", "price", "mainImageUrl", ... }
    }
  ],
  "items_count": 1,
  "total": 1800,
  "currency": "UAH"
}
```
