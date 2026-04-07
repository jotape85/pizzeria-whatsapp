import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '20'), 100);
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: { select: { id: true, phone: true, name: true } },
        botSession: { select: { state: true, lastActivityAt: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, direction: true, createdAt: true },
        },
      },
    }),
    prisma.conversation.count(),
  ]);

  return NextResponse.json({ data: conversations, total, page, limit });
}
