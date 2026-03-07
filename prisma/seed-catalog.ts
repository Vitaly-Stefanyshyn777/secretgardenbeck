import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding basic catalog data...');

  // Root categories
  const allProducts = await prisma.category.upsert({
    where: { slug: 'all-products' },
    update: {},
    create: {
      name: 'Всі товари',
      slug: 'all-products',
    },
  });

  const cbdOil = await prisma.category.upsert({
    where: { slug: 'cbd-oil' },
    update: {},
    create: {
      name: 'CBD масло',
      slug: 'cbd-oil',
    },
  });

  // Subcategories under CBD oil (5 items)
  const cbdOilCbd = await prisma.category.upsert({
    where: { slug: 'cbd-oil-cbd' },
    update: {
      parent: { connect: { id: cbdOil.id } },
    },
    create: {
      name: 'CBD',
      slug: 'cbd-oil-cbd',
      parent: { connect: { id: cbdOil.id } },
    },
  });
  const cbdOilCbg = await prisma.category.upsert({
    where: { slug: 'cbd-oil-cbg' },
    update: {
      parent: { connect: { id: cbdOil.id } },
    },
    create: {
      name: 'CBG',
      slug: 'cbd-oil-cbg',
      parent: { connect: { id: cbdOil.id } },
    },
  });
  const cbdOilCbn = await prisma.category.upsert({
    where: { slug: 'cbd-oil-cbn' },
    update: {
      parent: { connect: { id: cbdOil.id } },
    },
    create: {
      name: 'CBN',
      slug: 'cbd-oil-cbn',
      parent: { connect: { id: cbdOil.id } },
    },
  });
  const cbdOilCbga = await prisma.category.upsert({
    where: { slug: 'cbd-oil-cbga' },
    update: {
      parent: { connect: { id: cbdOil.id } },
    },
    create: {
      name: 'CBGA',
      slug: 'cbd-oil-cbga',
      parent: { connect: { id: cbdOil.id } },
    },
  });
  const cbdOilH4cbd = await prisma.category.upsert({
    where: { slug: 'cbd-oil-h4cbd' },
    update: {
      parent: { connect: { id: cbdOil.id } },
    },
    create: {
      name: 'H4CBD',
      slug: 'cbd-oil-h4cbd',
      parent: { connect: { id: cbdOil.id } },
    },
  });

  const cbdWax = await prisma.category.upsert({
    where: { slug: 'cbd-wax' },
    update: {},
    create: {
      name: 'CBD WAX',
      slug: 'cbd-wax',
    },
  });

  const mushrooms = await prisma.category.upsert({
    where: { slug: 'mushrooms' },
    update: {},
    create: {
      name: 'Гриби',
      slug: 'mushrooms',
    },
  });

  const microdosing = await prisma.category.upsert({
    where: { slug: 'microdosing' },
    update: {},
    create: {
      name: 'Мікродозинг',
      slug: 'microdosing',
      parent: {
        connect: { id: mushrooms.id },
      },
    },
  });

  // Helper to create product and link to categories
  const createProduct = async (data: {
    slug: string;
    name: string;
    label?: string;
    price: number;
    description: string;
    shortDescription?: string;
    mainImageUrl?: string;
    categoryIds: string[];
  }) => {
    const categoryCreates = data.categoryIds.map((categoryId) => ({
      category: { connect: { id: categoryId } },
    }));

    const product = await prisma.product.upsert({
      where: { slug: data.slug },
      update: {
        name: data.name,
        price: data.price,
        shortDescription:
          data.shortDescription ?? 'Короткий опис товару у два рядки.',
        description: data.description,
        label: data.label,
        mainImageUrl: data.mainImageUrl,
        categories: {
          deleteMany: {},
          create: categoryCreates,
        },
      },
      create: {
        name: data.name,
        slug: data.slug,
        price: data.price,
        shortDescription:
          data.shortDescription ?? 'Короткий опис товару у два рядки.',
        description: data.description,
        label: data.label,
        mainImageUrl: data.mainImageUrl,
        categories: {
          create: categoryCreates,
        },
      },
    });

    return product;
  };

  const loremDescription =
    'Капсули з порошком червоного мухомора — вибір для тих, хто цінує натуральне походження та мінімалістичний склад. Продукт створений на основі ретельно підготовленої сировини без домішок та синтетичних добавок.';

  const mikrodosingDescription =
    'Капсули з порошком червоного мухомора — це вибір для тих, хто цінує натуральне походження, мінімалістичний склад і естетику усвідомленого підходу 🌿 Продукт створений на основі ретельно підготовленої сировини без домішок і синтетичних добавок. Делікатна обробка дозволяє зберегти природний склад гриба та його автентичні властивості в первинному вигляді. Формат капсул — це чистота, зручність і акуратність. Нічого зайвого: лише порошок природного походження в охайному, продуманому виконанні. Такий продукт органічно вписується у філософію релаксу, балансу та поваги до природних джерел 🍄 ✨ Мінімалістичний склад ✨ Натуральна сировина ✨ Без ароматизаторів та барвників ✨ Естетичний формат зберігання Це не про поспіх. Це про спокій, уважність і вибір якості.';

  // 1. Мікродозинг 100 капсул Червоний мухомор
  const mikrodosingProduct = await createProduct({
    slug: 'mikrodosing-100-kapsul-chervonyi-mukhomor',
    name: 'Мікродозинг 100 капсул Червоний мухомор',
    label: 'Мікродозинг Червоний мухомор',
    price: 1500,
    description: mikrodosingDescription,
    categoryIds: [allProducts.id, mushrooms.id, microdosing.id],
  });

  // Характеристики для цього товару (адмінка буде їх редагувати)
  await prisma.productCharacteristic.deleteMany({
    where: { productId: mikrodosingProduct.id },
  });
  await prisma.productCharacteristic.createMany({
    data: [
      { productId: mikrodosingProduct.id, name: 'Кількість капсул в упаковці', value: '60 капсул', order: 1 },
      { productId: mikrodosingProduct.id, name: 'Вага однієї капсули', value: '0.7г', order: 2 },
      { productId: mikrodosingProduct.id, name: 'Грам мухомору в одній капсулі', value: '0.5г', order: 3 },
      { productId: mikrodosingProduct.id, name: 'Склад', value: '100% порошок сушеного червоного мухомору (Amanita muscaria)', order: 4 },
      { productId: mikrodosingProduct.id, name: 'Біологічно активні сполуки', value: 'мусцимол, іботенова кислота (природні компоненти червоного мухомора)', order: 5 },
      { productId: mikrodosingProduct.id, name: 'Умови зберігання', value: 'зберігати в сухому, недоступному для дітей місці', order: 6 },
      { productId: mikrodosingProduct.id, name: 'Важливі застереження', value: 'не є лікарським засобом', order: 7 },
    ],
  });

  // Тестові відгуки для цього товару
  const reviewText =
    'Lorem ipsum dolor sit amet consectetur. Sapien gravida posuere rhoncus duis amet sed in massa. Tempus at tellus fusce facilisis tellus et ac. Dolor eget proin aenean vitae. Proin senectus neque pellentesque ipsum venenatis.';
  await prisma.review.deleteMany({ where: { productId: mikrodosingProduct.id } });
  await prisma.review.createMany({
    data: [
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
      { productId: mikrodosingProduct.id, rating: 5, authorName: 'Гончаренко Катерина', text: reviewText },
    ],
  });
  const agg = await prisma.review.aggregate({
    where: { productId: mikrodosingProduct.id },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.product.update({
    where: { id: mikrodosingProduct.id },
    data: {
      ratingAverage: agg._avg.rating ?? 0,
      ratingCount: agg._count.rating,
    },
  });

  // 2. CBD масло 5%
  await createProduct({
    slug: 'cbd-oil-5',
    name: 'CBD масло 5%',
    label: 'CBD масло',
    price: 900,
    description: loremDescription,
    categoryIds: [allProducts.id, cbdOil.id, cbdOilCbd.id],
  });

  // 3. CBD масло 10%
  await createProduct({
    slug: 'cbd-oil-10',
    name: 'CBD масло 10%',
    label: 'CBD масло',
    price: 1200,
    description: loremDescription,
    categoryIds: [allProducts.id, cbdOil.id, cbdOilCbd.id],
  });

  // Add more products under CBD oil subcategories (2/3/5/9)
  const mkOil = (slug: string, name: string, price: number, categoryId: string) =>
    createProduct({
      slug,
      name,
      label: 'CBD масло',
      price,
      description: loremDescription,
      categoryIds: [allProducts.id, cbdOil.id, categoryId],
    });

  // CBG: +2 products
  await mkOil('cbd-oil-cbg-5', 'CBG масло 5%', 950, cbdOilCbg.id);
  await mkOil('cbd-oil-cbg-10', 'CBG масло 10%', 1250, cbdOilCbg.id);

  // CBN: +3 products
  await mkOil('cbd-oil-cbn-5', 'CBN масло 5%', 990, cbdOilCbn.id);
  await mkOil('cbd-oil-cbn-10', 'CBN масло 10%', 1290, cbdOilCbn.id);
  await mkOil('cbd-oil-cbn-15', 'CBN масло 15%', 1590, cbdOilCbn.id);

  // CBGA: +5 products
  await mkOil('cbd-oil-cbga-3', 'CBGA масло 3%', 790, cbdOilCbga.id);
  await mkOil('cbd-oil-cbga-5', 'CBGA масло 5%', 990, cbdOilCbga.id);
  await mkOil('cbd-oil-cbga-7', 'CBGA масло 7%', 1150, cbdOilCbga.id);
  await mkOil('cbd-oil-cbga-10', 'CBGA масло 10%', 1390, cbdOilCbga.id);
  await mkOil('cbd-oil-cbga-12', 'CBGA масло 12%', 1550, cbdOilCbga.id);

  // H4CBD: +9 products
  await mkOil('cbd-oil-h4cbd-2', 'H4CBD масло 2%', 850, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-3', 'H4CBD масло 3%', 950, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-4', 'H4CBD масло 4%', 1050, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-5', 'H4CBD масло 5%', 1150, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-6', 'H4CBD масло 6%', 1250, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-7', 'H4CBD масло 7%', 1350, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-8', 'H4CBD масло 8%', 1450, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-9', 'H4CBD масло 9%', 1550, cbdOilH4cbd.id);
  await mkOil('cbd-oil-h4cbd-10', 'H4CBD масло 10%', 1650, cbdOilH4cbd.id);

  // 4. CBD WAX 1 г
  await createProduct({
    slug: 'cbd-wax-1g',
    name: 'CBD WAX 1 г',
    label: 'CBD WAX',
    price: 900,
    description: loremDescription,
    categoryIds: [allProducts.id, cbdWax.id],
  });

  // 5. CBD WAX 2 г
  await createProduct({
    slug: 'cbd-wax-2g',
    name: 'CBD WAX 2 г',
    label: 'CBD WAX',
    price: 1600,
    description: loremDescription,
    categoryIds: [allProducts.id, cbdWax.id],
  });

  console.log('Catalog seeding done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

