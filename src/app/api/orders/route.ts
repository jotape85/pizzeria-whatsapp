import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20'), 100);
  const status = request.nextUrl.searchParams.get('status') ?? undefined;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as never } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { phone: true, name: true } },
        store: { select: { name: true } },
        items: { include: { product: true, variant: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ data: orders, total, page, limit });
}
