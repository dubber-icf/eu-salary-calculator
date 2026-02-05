import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '10';
  
  const db = getDb();
  
  const payments = db.prepare(`
    SELECT p.*, s.name as staff_name 
    FROM payments p
    LEFT JOIN staff s ON p.staff_id = s.id
    ORDER BY p.created_at DESC
    LIMIT ?
  `).all(parseInt(limit));
  
  return NextResponse.json(payments);
}
