import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ─── STORE ──────────────────────────────────────────────────────────────
  const store = await prisma.store.upsert({
    where: { slug: 'pizzeria-central' },
    update: {},
    create: {
      name: 'Pizzería Central',
      slug: 'pizzeria-central',
      phone: '+34600000000',
      waNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? 'TEST_NUMBER_ID',
      address: 'Calle Mayor 1, Madrid',
      isActive: true,
      botEnabled: true,
    },
  });
  console.log(`✅ Store: ${store.name} (${store.id})`);

  // ─── CATEGORIES ─────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { id: 'cat-pizzas' },
      update: {},
      create: { id: 'cat-pizzas', name: 'Pizzas', emoji: '🍕', sortOrder: 1 },
    }),
    prisma.productCategory.upsert({
      where: { id: 'cat-entrantes' },
      update: {},
      create: { id: 'cat-entrantes', name: 'Entrantes', emoji: '🥗', sortOrder: 2 },
    }),
    prisma.productCategory.upsert({
      where: { id: 'cat-bebidas' },
      update: {},
      create: { id: 'cat-bebidas', name: 'Bebidas', emoji: '🥤', sortOrder: 3 },
    }),
    prisma.productCategory.upsert({
      where: { id: 'cat-postres' },
      update: {},
      create: { id: 'cat-postres', name: 'Postres', emoji: '🍮', sortOrder: 4 },
    }),
  ]);
  console.log(`✅ ${categories.length} categories seeded`);

  // ─── PIZZAS ─────────────────────────────────────────────────────────────
  const pizzaVariants = [
    { name: 'Pequeña (26cm)', priceAdjust: -3, sortOrder: 1 },
    { name: 'Mediana (33cm)', priceAdjust: 0, sortOrder: 2 },
    { name: 'Familiar (40cm)', priceAdjust: 4, sortOrder: 3 },
  ];

  const pizzas = [
    { id: 'prod-margherita', name: 'Margherita', description: 'Tomate, mozzarella, albahaca fresca', basePrice: 12.5 },
    { id: 'prod-pepperoni', name: 'Pepperoni', description: 'Tomate, mozzarella, pepperoni', basePrice: 14.0 },
    { id: 'prod-4quesos', name: 'Cuatro Quesos', description: 'Mozzarella, gorgonzola, parmesano, brie', basePrice: 15.5 },
    { id: 'prod-barbacoa', name: 'Barbacoa', description: 'Salsa barbacoa, pollo, cebolla caramelizada, mozzarella', basePrice: 15.0 },
    { id: 'prod-vegana', name: 'Vegana', description: 'Tomate, verduras de temporada, queso vegano', basePrice: 13.5 },
  ];

  for (const pizza of pizzas) {
    await prisma.product.upsert({
      where: { id: pizza.id },
      update: {},
      create: {
        ...pizza,
        categoryId: 'cat-pizzas',
        isActive: true,
        variants: {
          create: pizzaVariants.map((v) => ({ ...v, isActive: true })),
        },
      },
    });
  }
  console.log(`✅ ${pizzas.length} pizzas seeded`);

  // ─── ENTRANTES ───────────────────────────────────────────────────────────
  const entrantes = [
    { id: 'prod-alitas', name: 'Alitas de Pollo', description: '8 alitas con salsa a elegir', basePrice: 8.5 },
    { id: 'prod-pan-ajo', name: 'Pan de Ajo', description: 'Pan artesano con mantequilla de ajo y perejil', basePrice: 4.5 },
    { id: 'prod-ensalada', name: 'Ensalada César', description: 'Lechuga, pollo, parmesano, crutones', basePrice: 9.0 },
  ];

  for (const item of entrantes) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, categoryId: 'cat-entrantes', isActive: true },
    });
  }
  console.log(`✅ ${entrantes.length} entrantes seeded`);

  // ─── BEBIDAS ─────────────────────────────────────────────────────────────
  const bebidas = [
    { id: 'prod-cola', name: 'Coca-Cola', description: 'Lata 33cl', basePrice: 2.5 },
    { id: 'prod-agua', name: 'Agua Mineral', description: 'Botella 50cl', basePrice: 1.5 },
    { id: 'prod-cerveza', name: 'Cerveza', description: 'Lata 33cl', basePrice: 2.8 },
    { id: 'prod-zumo', name: 'Zumo Natural', description: 'Naranja o limón', basePrice: 3.0 },
  ];

  for (const item of bebidas) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, categoryId: 'cat-bebidas', isActive: true },
    });
  }
  console.log(`✅ ${bebidas.length} bebidas seeded`);

  // ─── POSTRES ─────────────────────────────────────────────────────────────
  const postres = [
    { id: 'prod-tiramisu', name: 'Tiramisú', description: 'Tiramisú casero', basePrice: 5.5 },
    { id: 'prod-brownie', name: 'Brownie con Helado', description: 'Brownie de chocolate con bola de vainilla', basePrice: 6.0 },
  ];

  for (const item of postres) {
    await prisma.product.upsert({
      where: { id: item.id },
      update: {},
      create: { ...item, categoryId: 'cat-postres', isActive: true },
    });
  }
  console.log(`✅ ${postres.length} postres seeded`);

  // ─── ORDER SEQUENCE ──────────────────────────────────────────────────────
  await prisma.orderSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, year: new Date().getFullYear(), lastSeq: 0 },
  });
  console.log('✅ Order sequence initialized');

  console.log('\n🎉 Seed complete!');
  console.log(`\n👉 Set your DEFAULT_STORE_ID in .env to: ${store.id}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
