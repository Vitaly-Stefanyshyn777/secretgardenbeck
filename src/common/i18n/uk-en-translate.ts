/** UK→EN для динамічного контенту, коли *En поле порожнє */
const PHRASES: Array<[string, string]> = [
  // --- довгі фрази спочатку ---
  ['Перший кофешоп у Дніпрі', 'The first coffeeshop in Dnipro'],
  ['Ми створили простір для тих, хто цінує якість, атмосферу та правильний сервіс. Сучасний підхід і перевірений продукт — усе в одному місці', 'We created a space for those who value quality, atmosphere, and proper service. A modern approach and a proven product — all in one place'],
  ['Якість, якій довіряють', 'Quality you can trust'],
  ['Ми ретельно відбираємо продукцію та співпрацюємо лише з перевіреними постачальниками, щоб ви отримували стабільний результат і впевненість у кожному замовленні', 'We carefully select products and work only with trusted suppliers so you get a consistent result and confidence in every order'],
  ['Швидко та зручно', 'Fast and convenient'],
  ['Оформлюйте замовлення онлайн за кілька хвилин. Зрозумілий процес, швидке підтвердження та оперативна доставка — без зайвих кроків.', 'Place an order online in a few minutes. A clear process, quick confirmation, and prompt delivery — without extra steps.'],
  ['Кількість капсул в упаковці', 'Quantity of capsules in package'],
  ['Вага однієї капсули', 'Weight of one capsule'],
  ['Грам мухомору в одній капсулі', 'Grams of fly agaric in one capsule'],
  ['Біологічно активні сполуки', 'Bioactive compounds'],
  ['Умови зберігання', 'Storage conditions'],
  ['Важливі застереження', 'Important precautions'],
  ['не є лікарським засобом', 'is not a medicinal product'],
  ['зберігати в сухому, недоступному для дітей місці', 'store in a dry place out of reach of children'],
  ['100% порошок сушеного червоного мухомору (Amanita muscaria)', '100% dried red fly agaric powder (Amanita muscaria)'],
  ['мусцимол, іботенова кислота (природні компоненти червоного мухомора)', 'muscimol, ibotenic acid (natural components of red fly agaric)'],
  ['Мінімалістичний склад', 'Minimalist composition'],
  ['Натуральна сировина', 'Natural raw materials'],
  ['Без ароматизаторів та барвників', 'No flavors or colorants'],
  ['Естетичний формат зберігання', 'Aesthetic storage format'],
  ['Це не про поспіх. Це про спокій, уважність і вибір якості.', 'This is not about haste. It is about calm, mindfulness, and choosing quality.'],
  ['Характеристика та особливості', 'Characteristics and features'],
  ['Короткий опис товару у два рядки.', 'A short product description in two lines.'],
  ['Мікродозинг 100 капсул Червоний мухомор', 'Microdosing 100 capsules Red fly agaric'],
  ['Червоний мухомор', 'Red fly agaric'],
  ['червоного мухомору', 'red fly agaric'],
  ['червоного мухомора', 'red fly agaric'],
  ['Капсули з порошком червоного мухомора', 'Capsules with red fly agaric powder'],
  ['Ми завжди на зв\'язку', 'We are always in touch'],
  ['Графік роботи', 'Working hours'],
  ['Без вихідних', 'Open daily'],
  ['В святкові дні години роботи можуть змінюватися', 'Working hours may change on holidays'],
  ['м. Дніпро, Проспект Дмитра Яворницького 57', 'Dnipro, Dmytra Yavornytskoho Ave, 57'],
  ['Україна, Дніпро, просп. Дмитра Яворницького, 57', 'Ukraine, Dnipro, Dmytra Yavornytskoho Ave, 57'],
  ['Категорії та фільтри', 'Categories and filters'],
  ['Всі товари', 'All products'],
  ['В наявності', 'In stock'],
  ['Немає в наявності', 'Out of stock'],
  ['Додати в кошик', 'Add to cart'],
  ['У кошику', 'In cart'],
  ['Питання та відповіді', 'Questions and answers'],
  ['Наша політика', 'Our policy'],
  ['Підтримка та вдячність', 'Support and gratitude'],
  ['Переглянути сертифікати', 'View certificates'],
  ['Підтримати збір', 'Support the fundraiser'],
  ['Інші послуги', 'Other services'],
  // --- коротші токени ---
  ['Мікродозинг', 'Microdosing'],
  ['мухоморів', 'fly agarics'],
  ['мухомору', 'fly agaric'],
  ['мухомора', 'fly agaric'],
  ['Мухомори', 'Fly agarics'],
  ['Гриби', 'Mushrooms'],
  ['гриби', 'mushrooms'],
  ['капсули', 'capsules'],
  ['Капсули', 'Capsules'],
  ['капсули', 'capsules'],
  ['капсула', 'capsule'],
  ['капсулу', 'capsule'],
  ['капсулі', 'capsule'],
  ['капсул', 'capsules'],
  ['упаковці', 'package'],
  ['упаковки', 'package'],
  ['Масло', 'Oil'],
  ['масло', 'oil'],
  ['Склад', 'Composition'],
  ['Опис', 'Description'],
  ['Вага', 'Weight'],
  ['Кількість', 'Quantity'],
  ['кількість', 'quantity'],
  ['Виробник', 'Manufacturer'],
  ['Матеріал', 'Material'],
  ['Тип', 'Type'],
  ['Каннабіноїд', 'Cannabinoid'],
  ['Категорії', 'Categories'],
  ['Пошук', 'Search'],
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Заміна з урахуванням меж слів для коротких токенів (щоб не було capsulesи) */
export function translateUkToEn(input: string): string {
  if (!input?.trim()) return input;
  let out = input;
  const sorted = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [uk, en] of sorted) {
    if (!uk) continue;
    if (uk.length <= 12 && !uk.includes(' ')) {
      const re = new RegExp(`(?<!\\p{L})${escapeRegExp(uk)}(?!\\p{L})`, 'gu');
      out = out.replace(re, en);
    } else {
      out = out.split(uk).join(en);
    }
  }
  return out;
}
