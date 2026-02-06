import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';
  
  const payments = await query(
    `SELECT p.*, s.name as staff_name FROM payments p
     LEFT JOIN staff s ON p.staff_id = s.id
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [parseInt(limit)]
  );
  
  return NextResponse.json(payments);
}
