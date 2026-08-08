# Що змінити перед викладенням на продакшн

## 1. JWT — час життя токенів

**Файл:** `src/common/configs/config.ts`

Зараз (для тестування):
```typescript
security: {
  expiresIn: '30d',  // access token — НЕ протухає під час тесту
  refreshIn: '90d',  // refresh token
```

**Змінити на прод:**
```typescript
security: {
  expiresIn: '15m',  // access token — 15 хвилин
  refreshIn: '7d',   // refresh token — 7 днів
```

---

## 2. Секрети (env)

Переконайся, що в прод використовується `.env` з **унікальними** значеннями:

- `JWT_ACCESS_SECRET` — мінімум 32 символи, випадковий рядок
- `JWT_REFRESH_SECRET` — інший рядок, мінімум 32 символи

Не використовуй значення з `.env.example` у продакшні.

### WayForPay на Render (Environment)

```env
WAYFORPAY_MERCHANT_ACCOUNT=test_merch_n1
WAYFORPAY_SECRET_KEY=flk3409refn54t54t*FNJRET
WAYFORPAY_DOMAIN=secretgardenfront.vercel.app
WAYFORPAY_RETURN_URL=https://<front>/order-success
WAYFORPAY_SERVICE_URL=https://secretgardenbeck.onrender.com/api/wayforpay/callback
```

Для бою підстав свій `WAYFORPAY_MERCHANT_ACCOUNT` і `WAYFORPAY_SECRET_KEY` з кабінету WayForPay.

---

## 3. Refresh flow на фронті

Перед прод переконайся, що фронтенд реалізує оновлення токена при 401:

- Axios/fetch interceptor
- При 401 → `POST /api/auth/refresh` з refreshToken
- Повтор запиту з новим accessToken

Детальніше: `docs/TOKEN_REFRESH_FLOW.md`.

---

## 4. Інші перевірки

- [ ] CORS — дозволені лише домени продакшну
- [ ] Rate limiting — обмеження на auth-ендпоїнти
- [ ] HTTPS
- [ ] Логування без паролів і токенів
