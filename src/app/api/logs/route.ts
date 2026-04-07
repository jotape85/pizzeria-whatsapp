import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 200);
  const processedParam = request.nextUrl.searchParams.get('processed');
  const processed = processedParam === null ? undefined : processedParam === 'true';
  const skip = (page - 1) * limit;

  const where = processed !== undefined ? { processed } : {};

  const [events, total] = await Promise.all([
    prisma.webhookEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { store: { select: { name: true } } },
    }),
    prisma.webhookEvent.count({ where }),
  ]);

  return NextResponse.json({ data: events, total, page, limit });
}
