const https = require('https');
const token = 'sbp_4552b6fbc9b93b8fab6c7a8aad25c744fd40869e';
const ref = 'ugsuwjlovcdblrfagewp';

const now = new Date().toISOString();

const sql = `
-- Seed: Store
INSERT INTO stores (id, name, slug, phone, address, "isActive", "botEnabled", "createdAt", "updatedAt")
VALUES (
  'clpizzeria0001',
  'Pizzería WhatsApp',
  'centro',
  '+34600000000',
  'Calle Mayor 1, Madrid',
  true,
  true,
  '${now}',
  '${now}'
) ON CONFLICT (id) DO NOTHING;

-- Seed: Categories
INSERT INTO product_categories (id, name, emoji, description, "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
  ('cat-pizzas',    'Pizzas',    '🍕', 'Nuestras pizzas artesanales',    1, true, '${now}', '${now}'),
  ('cat-entrantes', 'Entrantes', '🥗', 'Para abrir el apetito',          2, true, '${now}', '${now}'),
  ('cat-bebidas',   'Bebidas',   '🥤', 'Refrescos y cervezas',           3, true, '${now}', '${now}'),
  ('cat-postres',   'Postres',   '🍰', 'El toque dulce final',           4, true, '${now}', '${now}')
ON CONFLICT (id) DO NOTHING;

-- Seed: Products
INSERT INTO products (id, "categoryId", name, description, "basePrice", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  ('prod-margherita',  'cat-pizzas',    'Margherita',       'Tomate, mozzarella, albahaca fresca',                       8.50, true, 1, '${now}', '${now}'),
  ('prod-pepperoni',   'cat-pizzas',    'Pepperoni',        'Tomate, mozzarella, pepperoni',                            10.50, true, 2, '${now}', '${now}'),
  ('prod-4quesos',     'cat-pizzas',    'Cuatro Quesos',    'Mozzarella, gorgonzola, parmesano, brie',                  11.00, true, 3, '${now}', '${now}'),
  ('prod-bbqchicken',  'cat-pizzas',    'BBQ Chicken',      'Salsa BBQ, pollo, cebolla caramelizada, mozzarella',       12.00, true, 4, '${now}', '${now}'),
  ('prod-veggie',      'cat-pizzas',    'Veggie',           'Tomate, mozzarella, verduras de temporada',                10.00, true, 5, '${now}', '${now}'),
  ('prod-alitas',      'cat-entrantes', 'Alitas de pollo',  '6 alitas con salsa BBQ',                                    6.50, true, 1, '${now}', '${now}'),
  ('prod-patatas',     'cat-entrantes', 'Patatas bravas',   'Patatas con salsa brava y alioli',                          4.50, true, 2, '${now}', '${now}'),
  ('prod-ensalada',    'cat-entrantes', 'Ensalada César',   'Lechuga romana, pollo, parmesano, croutons',                7.00, true, 3, '${now}', '${now}'),
  ('prod-coca-cola',   'cat-bebidas',   'Coca-Cola',        'Lata 33cl',                                                 2.00, true, 1, '${now}', '${now}'),
  ('prod-agua',        'cat-bebidas',   'Agua mineral',     'Botella 50cl',                                              1.50, true, 2, '${now}', '${now}'),
  ('prod-cerveza',     'cat-bebidas',   'Cerveza',          'Botella Estrella Damm 33cl',                                2.50, true, 3, '${now}', '${now}'),
  ('prod-tiramisu',    'cat-postres',   'Tiramisú',         'Tiramisú casero',                                           4.50, true, 1, '${now}', '${now}'),
  ('prod-brownies',    'cat-postres',   'Brownies',         '2 brownies de chocolate con helado de vainilla',            4.00, true, 2, '${now}', '${now}')
ON CONFLICT (id) DO NOTHING;

-- Seed: Variants (only for pizzas — Pequeña/Mediana/Familiar)
INSERT INTO product_variants (id, "productId", name, "priceAdjust", "isActive", "sortOrder") VALUES
  ('var-marg-p',   'prod-margherita', 'Pequeña (25cm)',   0.00, true, 1),
  ('var-marg-m',   'prod-margherita', 'Mediana (30cm)',   2.50, true, 2),
  ('var-marg-f',   'prod-margherita', 'Familiar (40cm)', 5.50, true, 3),
  ('var-pepp-p',   'prod-pepperoni',  'Pequeña (25cm)',   0.00, true, 1),
  ('var-pepp-m',   'prod-pepperoni',  'Mediana (30cm)',   2.50, true, 2),
  ('var-pepp-f',   'prod-pepperoni',  'Familiar (40cm)', 5.50, true, 3),
  ('var-4q-p',     'prod-4quesos',    'Pequeña (25cm)',   0.00, true, 1),
  ('var-4q-m',     'prod-4quesos',    'Mediana (30cm)',   2.50, true, 2),
  ('var-4q-f',     'prod-4quesos',    'Familiar (40cm)', 5.50, true, 3),
  ('var-bbq-p',    'prod-bbqchicken', 'Pequeña (25cm)',   0.00, true, 1),
  ('var-bbq-m',    'prod-bbqchicken', 'Mediana (30cm)',   2.50, true, 2),
  ('var-bbq-f',    'prod-bbqchicken', 'Familiar (40cm)', 5.50, true, 3),
  ('var-veg-p',    'prod-veggie',     'Pequeña (25cm)',   0.00, true, 1),
  ('var-veg-m',    'prod-veggie',     'Mediana (30cm)',   2.50, true, 2),
  ('var-veg-f',    'prod-veggie',     'Familiar (40cm)', 5.50, true, 3)
ON CONFLICT (id) DO NOTHING;

-- Seed: OrderSequence
INSERT INTO order_sequences (id, year, "lastSeq")
VALUES (1, EXTRACT(YEAR FROM now())::INT, 0)
ON CONFLICT (id) DO NOTHING;
`;

const body = JSON.stringify({ query: sql });
const options = {
  hostname: 'api.supabase.com',
  path: '/v1/projects/' + ref + '/database/query',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 500));
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
