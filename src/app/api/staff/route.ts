import { NextRequest, NextResponse } from 'next/server';
import { getDb, Staff, Project, MonthlyEntry } from '@/lib/db';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = './data';
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Staff CRUD
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // Query for specific staff member
  
  const db = getDb();
  
  if (id) {
    const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(parseInt(id));
    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }
    return NextResponse.json(staff);
  }
  
  const staff = db.prepare('SELECT * FROM staff ORDER BY name').all();
  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  const result = db.prepare(`
    INSERT INTO staff (name, email, fte_history) VALUES (?, ?, ?)
  `).run(body.name, body.email || null, JSON.stringify(body.fte_history || [{ from_date: '2020-01-01', to_date: null, percentage: 1.0 }]));
  
  return NextResponse.json({ id: result.lastInsertRowid, ...body });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const body = await request.json();
  const db = getDb();
  
  // Check if staff exists
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(parseInt(id));
  if (!existing) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }
  
  db.prepare(`
    UPDATE staff 
    SET name = ?, email = ?, fte_history = ?
    WHERE id = ?
  `).run(body.name, body.email || null, JSON.stringify(body.fte_history || [{ from_date: '2020-01-01', to_date: null, percentage: 1.0 }]), parseInt(id));
  
  return NextResponse.json({ id: parseInt(id), ...body });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const db = getDb();
  
  // Check if staff exists
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(parseInt(id));
  if (!existing) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }
  
  // Delete related entries and payments first (foreign key constraints)
  db.prepare('DELETE FROM monthly_entries WHERE staff_id = ?').run(parseInt(id));
  db.prepare('DELETE FROM payments WHERE staff_id = ?').run(parseInt(id));
  
  // Now delete the staff member
  db.prepare('DELETE FROM staff WHERE id = ?').run(parseInt(id));
  
  return NextResponse.json({ success: true, deletedId: parseInt(id) });
}
