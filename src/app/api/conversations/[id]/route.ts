import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      botSession: { include: { store: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Include cart if customer has one
  const cart = conversation.customer
    ? await prisma.cart.findUnique({
        where: { customerId: conversation.customer.id },
        include: { items: { include: { product: true, variant: true } } },
      })
    : null;

  return NextResponse.json({ ...conversation, cart });
}
