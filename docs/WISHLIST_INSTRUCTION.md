# Інструкція: Улюблене (Wishlist)

## Логіка

- **Авторизований користувач** — зберігаємо на бекенді
- **Неавторизований** — зберігаємо в localStorage
- **Batch-синхронізація** — один запит з усім списком (при закритті модалки, beforeunload, visibilitychange)

---

## API

### GET /api/wishlist

Отримати список улюблених товарів.

**Headers:** `Authorization: Bearer <accessToken>`

**Відповідь:**
```json
{
  "items": [
    {
      "productId": "clx...",
      "product": { "id": "...", "name": "...", "slug": "cbd-oil-5", "price": "...", ... }
    }
  ],
  "productIds": ["clx...", "cly..."]
}
```

---

### POST /api/wishlist/sync

Замінити весь wishlist одним запитом.

**Headers:** `Authorization: Bearer <accessToken>`

**Тіло:**
```json
{
  "items": [
    { "productId": "clx..." },
    { "slug": "cbd-oil-5" }
  ]
}
```

**Поля item:**
- `productId` (string) — ID товару. Завжди рядок: CUID (`clx...`) або WooCommerce id (`"123"`)
- `slug` (string) — fallback, якщо productId немає з каталогу

**Відповідь:** така ж як GET /api/wishlist

---

## Фронтенд — покрокова інструкція

### 1. Стейт (store)

```typescript
interface FavoritesStore {
  productIds: string[];
  slugs: string[];        // fallback для товарів без productId
  pendingSync: boolean;
  toggle: (productId?: string, slug?: string) => void;
  remove: (productId?: string, slug?: string) => void;
  removeAll: () => void;
  syncFavoritesToApi: () => Promise<void>;
  setFromApi: (items: { productId: string; product?: { slug: string } }[]) => void;
}
```

Або простіше — зберігати масив `{ productId?, slug? }[]`.

### 2. Формування items для sync

```typescript
const syncItems = favorites
  .filter((f) => f.productId || f.slug)
  .map((f) => ({
    productId: f.productId != null ? String(f.productId).trim() : undefined,
    slug: f.slug ?? f.product?.slug,
  }))
  .filter((i) => i.productId || i.slug);
```

### 3. API-виклик

```typescript
async function syncWishlistToApi(items: { productId?: string; slug?: string }[]) {
  const token = localStorage.getItem('accessToken');
  if (!token) return;
  const res = await fetch('/api/wishlist/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Wishlist sync failed');
  return res.json();
}
```

### 4. Коли викликати sync

- При закритті модалки улюблених
- При `beforeunload` (закриття вкладки)
- При `visibilitychange` (document.visibilityState === 'hidden')

```typescript
useEffect(() => {
  const fn = () => useFavoritesStore.getState().syncFavoritesToApi();
  window.addEventListener('beforeunload', fn);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') fn();
  });
  return () => {
    window.removeEventListener('beforeunload', fn);
  };
}, []);
```

### 5. При логіні — підтягнути з бекенду

```typescript
const res = await fetch('/api/wishlist', {
  headers: { Authorization: `Bearer ${token}` },
});
if (res.ok) {
  const { items, productIds } = await res.json();
  useFavoritesStore.getState().setFromApi(items);
}
```

---

## Контракт productId

- **Завжди string** — `String(productId)` перед відправкою
- CUID: `"cmmejq6hs000vr870v7dt47nq"`
- WooCommerce: `"123"`
- Якщо немає productId — використовувати slug

---

## Checklist для фронтенду

- [ ] Store з productIds / slugs і pendingSync
- [ ] toggle, remove, removeAll оновлюють стейт (без API)
- [ ] syncFavoritesToApi() відправляє один POST /api/wishlist/sync з items
- [ ] productId завжди перетворюється на String()
- [ ] sync викликається при закритті модалки, beforeunload, visibilitychange
- [ ] При логіні — GET /api/wishlist і оновлення стейту
- [ ] localStorage для неавторизованих (persist)
