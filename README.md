# Pizzeria WhatsApp — MVP

Sistema de pedidos por WhatsApp para pizzeria, con panel de administracion y bot conversacional guiado.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS**
- **WhatsApp Cloud API** (Meta)
- **ngrok** para webhooks en local

---

## Requisitos previos

- Node.js 18+
- PostgreSQL corriendo en local (o usa Prisma Postgres con `npx prisma dev`)
- Cuenta de Meta Developer con app de WhatsApp configurada
- ngrok instalado (`npm install -g ngrok` o desde ngrok.com)

---

## Arranque rapido

### 1. Clonar e instalar dependencias

```bash
cd pizzeria-whatsapp
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y rellena al menos:

```bash
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/pizzeria_whatsapp"
WHATSAPP_VERIFY_TOKEN="pon-aqui-un-token-secreto"  # Lo mismo que pongas en Meta
```

El resto puede quedarse vacio para arrancar en modo mock.

### 3. Crear la base de datos y migrar

```bash
# Crear la base de datos en PostgreSQL primero:
createdb pizzeria_whatsapp

# Migrar el schema:
npm run db:migrate
```

> Si usas Prisma Postgres local: `npx prisma dev` (no necesitas PostgreSQL instalado)

### 4. Sembrar datos de prueba

```bash
npm run db:seed
```

Esto crea:
- 1 tienda: "Pizzeria Central"
- 4 categorias: Pizzas, Entrantes, Bebidas, Postres
- 14 productos con variantes de tamano para las pizzas

**Importante:** Copia el ID de tienda que imprime el seed y ponlo en `.env`:
```bash
DEFAULT_STORE_ID="clxxxxxxxxxxxxxxx"
```

### 5. Arrancar el servidor de desarrollo

```bash
npm run dev
```

Panel disponible en: http://localhost:3000

---

## Configurar WhatsApp

### 1. Exponer el servidor local con ngrok

```bash
ngrok http 3000
```

Copia la URL HTTPS (ej: `https://abc123.ngrok-free.app`) y ponla en `.env`:
```bash
NGROK_URL="https://abc123.ngrok-free.app"
```

### 2. Configurar el Webhook en Meta Developer Console

1. Ve a developers.facebook.com > Tu App > WhatsApp > Configuracion
2. En "Webhook URL" pon: `https://abc123.ngrok-free.app/api/webhook`
3. En "Verify Token" pon el mismo valor que tienes en `WHATSAPP_VERIFY_TOKEN`
4. Suscribete al campo `messages`
5. Copia el **Phone Number ID** y el **Access Token** y ponlos en `.env`:

```bash
WHATSAPP_PHONE_NUMBER_ID="tu_phone_number_id"
WHATSAPP_ACCESS_TOKEN="tu_access_token"
WHATSAPP_APP_SECRET="tu_app_secret"  # En App Settings > Basic
```

### 3. Probar el bot

Envia un mensaje de WhatsApp al numero configurado.
El bot respondera con el saludo de bienvenida.

---

## Flujo conversacional del bot

```
Cliente: Hola
Bot: Hola! Soy el asistente de pedidos de Pizzeria Central.
     Te ayudo a hacer tu pedido para recoger.
     [Hacer un pedido]

Cliente: [Hacer un pedido]
Bot: Elige una categoria:
     [Pizzas] [Entrantes] [Bebidas] [Postres]

Cliente: [Pizzas]
Bot: Selecciona un producto:
     - Margherita — 12.50 EUR
     - Pepperoni — 14.00 EUR
     - ...

Cliente: [Pepperoni]
Bot: Elige el tamano:
     - Pequena (26cm) — 11.00 EUR
     - Mediana (33cm) — 14.00 EUR
     - Familiar (40cm) — 18.00 EUR

Cliente: [Mediana]
Bot: Quieres anadir alguna nota? (ej: sin cebolla)
     [Sin nota]

Cliente: Sin cebolla
Bot: Tu pedido:
     1. Pepperoni (Mediana) — 14.00 EUR _(sin cebolla)_
     Total: 14.00 EUR
     [Confirmar pedido] [Anadir mas] [Vaciar carrito]

Cliente: [Confirmar pedido]
Bot: Confirmas el pedido para recoger?
     [Si, confirmar] [No, modificar]

Cliente: [Si, confirmar]
Bot: Pedido ORD-2024-0001 creado! Total: 14.00 EUR
     Link de pago: http://localhost:3000/mock-payment/...
```

---

## Panel de administracion

| URL | Descripcion |
|-----|-------------|
| `/conversations` | Lista de todas las conversaciones |
| `/conversations/[id]` | Hilo de mensajes + estado del bot + carrito |
| `/orders` | Pedidos con filtro por estado + boton "Marcar pagado" |
| `/catalog` | Gestion del catalogo por categoria |
| `/logs` | Log de eventos webhook raw |
| `/settings` | Config de tiendas y proveedores |

### Confirmar pago manualmente (MVP)

Mientras no este integrado Revo Xpress:
1. Ve a `/orders`
2. Busca el pedido en estado `AWAITING_PAYMENT`
3. Pulsa "Marcar pagado"
4. El cliente recibe confirmacion automatica por WhatsApp

---

## Estructura de proveedores

El sistema usa abstracciones para las integraciones externas:

```
CATALOG_PROVIDER=mock   → Lee catalogo de PostgreSQL (seeded)
CATALOG_PROVIDER=revo   → TODO: conectar Revo Solo API

ORDER_PROVIDER=mock     → Guarda pedidos en PostgreSQL
ORDER_PROVIDER=revo     → TODO: enviar pedidos a Revo Solo (-> Revo XEF KDS)

PAYMENT_PROVIDER=mock   → Genera URL falsa, pago manual en panel
PAYMENT_PROVIDER=revo-xpress → TODO: Revo Xpress payment link
```

Para activar una integracion real:
1. Implementa el provider en `src/services/[catalog|order|payment]/revo-*.ts`
2. Cambia la variable de entorno correspondiente
3. Sin cambios en el bot ni en el webhook

---

## Comandos utiles

```bash
npm run dev          # Servidor de desarrollo
npm run db:migrate   # Aplicar migraciones
npm run db:seed      # Sembrar datos de prueba
npm run db:studio    # Abrir Prisma Studio (GUI de base de datos)
npm run db:reset     # Resetear base de datos (CUIDADO: borra todo)
npm run build        # Build de produccion
```

---

## Diagrama de estados del bot

```
IDLE
 └── cualquier mensaje ──> GREETING

GREETING
 └── "pedir" / "1" ──> CATEGORY_SELECTION

CATEGORY_SELECTION
 ├── categoria valida ──> PRODUCT_SELECTION
 └── "cancelar" ──> IDLE

PRODUCT_SELECTION
 ├── producto con variantes ──> VARIANT_SELECTION
 ├── producto sin variantes ──> ADDING_NOTE
 └── "carrito" ──> CART_REVIEW

VARIANT_SELECTION
 └── variante valida ──> ADDING_NOTE

ADDING_NOTE
 └── cualquier texto / "no" ──> CART_REVIEW  (guarda CartItem)

CART_REVIEW
 ├── "1" confirmar ──> CONFIRMING
 ├── "2" anadir mas ──> CATEGORY_SELECTION
 └── "3" vaciar ──> IDLE

CONFIRMING
 ├── "si" ──> AWAITING_PAYMENT  (crea Order, vacia Cart)
 └── "no" ──> CART_REVIEW

AWAITING_PAYMENT
 ├── pago confirmado (webhook/admin) ──> ORDER_COMPLETE
 ├── 30min sin actividad ──> IDLE
 └── "cancelar" ──> IDLE

ORDER_COMPLETE
 └── cualquier mensaje ──> GREETING  (nuevo pedido)
```

---

## Roadmap hacia produccion

- [ ] Integrar Revo Solo API (catalog + pedidos)
- [ ] Integrar Revo Xpress (payment link real)
- [ ] Webhook de Revo para confirmar pago automaticamente
- [ ] Templates de WhatsApp aprobados por Meta (confirmacion, aviso de listo)
- [ ] Multi-tienda con enrutamiento por phone_number_id
- [ ] Autenticacion en el panel de administracion
- [ ] Despliegue en cloud (Railway, Render, Vercel + PlanetScale)
- [ ] Cola de mensajes para procesar webhooks de forma asincrona (BullMQ)
- [ ] Pedidos a domicilio (ampliar estado ORDER_TYPE=DELIVERY)
