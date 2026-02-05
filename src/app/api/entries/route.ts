import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  
  const db = getDb();
  
  let query = 'SELECT * FROM monthly_entries WHERE 1=1';
  const params: any[] = [];
  
  if (staffId) {
    query += ' AND staff_id = ?';
    params.push(staffId);
  }
  if (year) {
    query += ' AND year = ?';
    params.push(year);
  }
  if (month) {
    query += ' AND month = ?';
    params.push(month);
  }
  
  query += ' ORDER BY year, month';
  
  const entries = db.prepare(query).all(...params);
  
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  // Upsert: insert or update if exists
  const existing = db.prepare(`
    SELECT id FROM monthly_entries 
    WHERE staff_id = ? AND year = ? AND month = ?
  `).get(body.staff_id, body.year, body.month);
  
  if (existing) {
    db.prepare(`
      UPDATE monthly_entries 
      SET project_allocations = ?, non_eu_days = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(body.project_allocations), body.non_eu_days || 0, (existing as any).id);
    
    return NextResponse.json({ id: (existing as any).id, ...body, updated: true });
  }
  
  const result = db.prepare(`
    INSERT INTO monthly_entries (staff_id, year, month, project_allocations, non_eu_days) 
    VALUES (?, ?, ?, ?, ?)
  `).run(body.staff_id, body.year, body.month, JSON.stringify(body.project_allocations || []), body.non_eu_days || 0);
  
  return NextResponse.json({ id: result.lastInsertRowid, ...body, created: true });
}
