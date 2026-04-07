import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const categories = await prisma.productCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const category = await prisma.productCategory.create({ data: parsed.data });
  return NextResponse.json(category, { status: 201 });
}
