// prisma.config.ts
// DATABASE_URL  → Supabase Transaction Pooler (port 6543) — usado por la app en runtime
// DIRECT_URL    → Supabase Direct Connection (port 5432)  — usado por prisma migrate
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migraciones usan conexion directa (sin pooler) para evitar timeouts
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
