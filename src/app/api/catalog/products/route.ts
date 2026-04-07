import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  sortOrder: z.number().int().default(0),
  variants: z
    .array(
      z.object({
        name: z.string().min(1),
        priceAdjust: z.number().default(0),
        sortOrder: z.number().int().default(0),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId') ?? undefined;

  const products = await prisma.product.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { sortOrder: 'asc' },
    include: { variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { variants, ...productData } = parsed.data;

  const product = await prisma.product.create({
    data: {
      ...productData,
      variants: variants
        ? { create: variants.map((v) => ({ ...v, isActive: true })) }
        : undefined,
    },
    include: { variants: true },
  });

  return NextResponse.json(product, { status: 201 });
}
