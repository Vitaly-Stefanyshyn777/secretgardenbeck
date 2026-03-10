# Оновлення токена (Refresh Flow)

## Конфігурація

| Токен       | Час життя |
|------------|-----------|
| Access     | 15 хвилин |
| Refresh    | 7 днів    |

## Як працювати, коли access token протух

Користувач залишається в сесії — треба автоматично оновити токен і повторити запит.

### Потік

1. API повертає **401 Unauthorized**
2. Фронт ловить 401 → викликає `POST /api/auth/refresh` з `refreshToken`
3. Отримує нові `accessToken` та `refreshToken`
4. Зберігає їх
5. Повторює оригінальний запит з новим `accessToken`

### Приклад axios interceptor

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => (token ? prom.resolve(token) : prom.reject(error)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Якщо вже йде refresh — чекаємо на результат
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // Користувача розлогінити
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', { token: refreshToken });
        const { accessToken, refreshToken: newRefresh } = data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  },
);

// При логіні зберігаємо токени і встановлюємо header
export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}
```

### POST /api/auth/refresh

**Body:**
```json
{
  "token": "<refreshToken>"
}
```

**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

## Важливо

- Зберігай **обидва** токени: access і refresh
- При 401 спочатку пробуй refresh; якщо refresh теж повертає 401 — розлогінь користувача
- Шлях REST: `POST /api/auth/refresh` (auth контролер під префіксом `/api`)
