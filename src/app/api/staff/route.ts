import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/lib/db';

// Staff CRUD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  const db = getDb();
  
  if (id) {
    const result = await db.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
    if (result.length === 0) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  }
  
  const staff = await db.query('SELECT * FROM staff ORDER BY name');
  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  const result = await db.query(
    `INSERT INTO staff (name, email, fte_history) VALUES ($1, $2, $3) RETURNING id`,
    [body.name, body.email || null, JSON.stringify(body.fte_history || [{ from_date: '2020-01-01', to_date: null, percentage: 1.0 }])]
  );
  
  return NextResponse.json({ id: result[0]?.id, ...body });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const body = await request.json();
  const db = getDb();
  
  const existing = await db.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }
  
  await db.query(
    `UPDATE staff SET name = $1, email = $2, fte_history = $3 WHERE id = $4`,
    [body.name, body.email || null, JSON.stringify(body.fte_history || [{ from_date: '2020-01-01', to_date: null, percentage: 1.0 }]), parseInt(id)]
  );
  
  return NextResponse.json({ id: parseInt(id), ...body });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const db = getDb();
  
  const existing = await db.query('SELECT * FROM staff WHERE id = $1', [parseInt(id)]);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }
  
  await db.query('DELETE FROM monthly_entries WHERE staff_id = $1', [parseInt(id)]);
  await db.query('DELETE FROM payments WHERE staff_id = $1', [parseInt(id)]);
  await db.query('DELETE FROM staff WHERE id = $1', [parseInt(id)]);
  
  return NextResponse.json({ success: true, deletedId: parseInt(id) });
}
