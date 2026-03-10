# API оформлення замовлення

## POST /api/orders

Створити замовлення. Потрібен JWT.

**Тіло:**
```json
{
  "firstName": "Іван",
  "lastName": "Петренко",
  "phone": "+380501234567",
  "email": "ivan@example.com",
  "deliveryToAnother": false,
  "recipientFirstName": "Марія",
  "recipientLastName": "Петренко",
  "recipientPhone": "+380671234567",
  "deliveryMethod": "nova_poshta",
  "deliveryCity": "Київ",
  "deliveryAddress": "Відділення №1, вул. Хрещатик 1",
  "comment": "Передзвоніть за годину",
  "newsletterConsent": true,
  "termsAccepted": true,
  "discountAmount": 0,
  "deliveryCost": 80,
  "items": [
    { "productId": "clx...", "quantity": 2 }
  ]
}
```

**Поля:**
| Поле | Обов'язкове | Опис |
|------|-------------|------|
| firstName, lastName, phone, email | ✅ | Особисті дані |
| deliveryToAnother | ❌ | Отримувати буде інша людина |
| recipientFirstName, recipientLastName, recipientPhone | ❌ | Дані отримувача (якщо deliveryToAnother) |
| deliveryMethod | ❌ | Спосіб доставки (nova_poshta, ukr_poshta, …) |
| deliveryCity, deliveryAddress | ❌ | Місто, адреса доставки |
| comment | ❌ | Коментар до замовлення |
| newsletterConsent | ❌ | Підписка на e-mail розсилку |
| termsAccepted | ✅ | Прийняття умов оферти |
| discountAmount | ❌ | Сума знижки (грн) |
| deliveryCost | ❌ | Вартість доставки (грн) |
| items | ❌ | Товари. Якщо не передано — беруться з кошика |

**Відповідь:**
```json
{
  "id": "clx...",
  "status": "NEW",
  "total": 1880,
  "subtotal": 1800,
  "discountAmount": 0,
  "deliveryCost": 80,
  "items": [
    { "productId": "...", "quantity": 2, "price": 900, "product": {...} }
  ]
}
```

Після створення замовлення кошик очищається. Відповідь містить усі поля для order-success.

---

## GET /api/orders/:id

Деталі замовлення для сторінки підтвердження (order-success). Потрібен JWT.

**Відповідь:**
```json
{
  "id": "clx...",
  "createdAt": "2026-03-10T12:00:00.000Z",
  "status": "NEW",
  "firstName": "Іван",
  "lastName": "Петренко",
  "phone": "+380501234567",
  "email": "ivan@example.com",
  "recipient": "Марія Петренко",
  "recipientPhone": "+380671234567",
  "deliveryAddress": "Київ, Відділення №1",
  "deliveryCity": "Київ",
  "paymentLabel": "За тарифами \"Нової Пошти\"",
  "subtotal": 1800,
  "discountAmount": 0,
  "deliveryCost": 80,
  "total": 1880,
  "items": [...]
}
```

**Підставки для UI:**
- `createdAt` — дата замовлення
- `deliveryAddress` — "Відділення не вказано" якщо порожньо
- `paymentLabel` — спосіб оплати
- `recipient` — "Одержувач не вказаний" якщо порожньо
- `phone` — контактний номер

---

## GET /api/orders

Список замовлень поточного користувача. Потрібен JWT.
