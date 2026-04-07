import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  const stores = await prisma.store.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(stores);
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  botEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...data } = parsed.data;
  const store = await prisma.store.update({ where: { id }, data });
  return NextResponse.json(store);
}
