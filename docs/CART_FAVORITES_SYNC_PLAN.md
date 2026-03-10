# План синхронізації корзини та улюбленого

## Логіка

- **Авторизований користувач**: зберігаємо на бекенді
- **Неавторизований**: зберігаємо в localStorage
- **Batch-синхронізація**: один запит з усім станом при закритті модалки / beforeunload / visibilitychange (не по одному товару)

---

## Бекенд (API)

### Корзина

| Метод | Шлях | Опис |
|------|------|-----|
| GET | /api/cart | Отримати кошик (потрібен JWT) |
| POST | /api/cart/sync | Batch sync — замінити весь кошик (потрібен JWT) |

**POST /api/cart/sync** — тіло:
```json
{
  "items": [
    { "productId": "clx...", "quantity": 2 },
    { "productId": "cly...", "quantity": 1 }
  ]
}
```

**Відповідь:**
```json
{
  "items": [
    {
      "productId": "clx...",
      "quantity": 2,
      "product": { "id": "...", "name": "...", "price": "...", ... }
    }
  ]
}
```

### Улюблене

| Метод | Шлях | Опис |
|------|------|-----|
| GET | /api/wishlist | Отримати wishlist (потрібен JWT) |
| POST | /api/wishlist/sync | Batch sync — замінити весь wishlist (потрібен JWT) |

**POST /api/wishlist/sync** — тіло:
```json
{
  "productIds": ["clx...", "cly...", "clz..."]
}
```

**Відповідь:**
```json
{
  "items": [{ "productId": "...", "product": {...} }],
  "productIds": ["clx...", "cly..."]
}
```

---

## Фронтенд (приклад)

### Структура стейту

**Корзина** — об’єкт `Record<productId, quantity>` або масив `{ productId, quantity }[]`

**Улюблене** — масив `productId[]`

### Store (Zustand / Pinia / Redux)

```typescript
// src/store/cart.ts (Zustand)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncCartToApi } from '@/lib/api';

interface CartItem {
  productId: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  pendingSync: boolean;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  clear: () => void;
  syncCartToApi: () => Promise<void>;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      pendingSync: false,

      addItem: (productId, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          const items = existing
            ? state.items.map((i) =>
                i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i,
              )
            : [...state.items, { productId, quantity }];
          return { items, pendingSync: true };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
          pendingSync: true,
        }));
      },

      increment: (productId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
          pendingSync: true,
        }));
      },

      decrement: (productId) => {
        set((state) => {
          const items = state.items
            .map((i) =>
              i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i,
            )
            .filter((i) => i.quantity > 0);
          return { items, pendingSync: true };
        });
      },

      clear: () => set({ items: [], pendingSync: true }),

      syncCartToApi: async () => {
        const { items, pendingSync } = get();
        if (!pendingSync || items.length === 0) return;
        try {
          const res = await syncCartToApi(items);
          set({ items: res.items, pendingSync: false });
        } catch {
          // залишаємо pendingSync true для повторної спроби
        }
      },

      setItems: (items) => set({ items, pendingSync: false }),
    }),
    { name: 'cart', partialize: (s) => ({ items: s.items }) },
  ),
);
```

```typescript
// src/store/favorites.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncWishlistToApi } from '@/lib/api';

interface FavoritesStore {
  productIds: string[];
  pendingSync: boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  removeAll: () => void;
  syncFavoritesToApi: () => Promise<void>;
  setProductIds: (ids: string[]) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      productIds: [],
      pendingSync: false,

      toggle: (productId) => {
        set((state) => {
          const has = state.productIds.includes(productId);
          const productIds = has
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId];
          return { productIds, pendingSync: true };
        });
      },

      remove: (productId) => {
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
          pendingSync: true,
        }));
      },

      removeAll: () => set({ productIds: [], pendingSync: true }),

      syncFavoritesToApi: async () => {
        const { productIds, pendingSync } = get();
        if (!pendingSync) return;
        try {
          const res = await syncWishlistToApi(productIds);
          set({ productIds: res.productIds, pendingSync: false });
        } catch {
          // залишаємо pendingSync
        }
      },

      setProductIds: (ids) => set({ productIds: ids, pendingSync: false }),
    }),
    { name: 'favorites', partialize: (s) => ({ productIds: s.productIds }) },
  ),
);
```

### API клієнт

```typescript
// src/lib/api.ts
const API = '/api';

export async function syncCartToApi(items: { productId: string; quantity: number }[]) {
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  const res = await fetch(`${API}/cart/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export async function syncWishlistToApi(productIds: string[]) {
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  const res = await fetch(`${API}/wishlist/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productIds }),
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}
```

### Хук закриття модалки / beforeunload

```typescript
// У модалці корзини
const close = () => {
  useCartStore.getState().syncCartToApi();
  onClose();
};

// Глобально
useEffect(() => {
  const fn = () => {
    useCartStore.getState().syncCartToApi();
    useFavoritesStore.getState().syncFavoritesToApi();
  };
  window.addEventListener('beforeunload', fn);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') fn();
  });
  return () => window.removeEventListener('beforeunload', fn);
}, []);
```

### При логіні — підтягнути з бекенду і злити

```typescript
// Після успішного логіну
const cartRes = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
const wishRes = await fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } });

if (cartRes.ok) {
  const { items } = await cartRes.json();
  useCartStore.getState().setItems(items);
}
if (wishRes.ok) {
  const { productIds } = await wishRes.json();
  useFavoritesStore.getState().setProductIds(productIds);
}
```

Можна також зробити merge: локальні + серверні, і одразу відправити sync з об’єднаним станом.
