import { type ClassValue, clsx } from 'clsx';

/**
 * Merge Tailwind class names conditionally.
 * Requires: npm install clsx
 */
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ');
}

/** Format a price in EUR */
export function formatPrice(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
}

/** Format a date for display */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Generate a sequential order number */
export function formatOrderNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(seq).padStart(4, '0')}`;
}

/** Truncate a string for display */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/** Phone number display format */
export function formatPhone(phone: string): string {
  // Shows: +34 612 345 678
  if (phone.startsWith('+34') && phone.length === 12) {
    return `+34 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  return phone;
}
