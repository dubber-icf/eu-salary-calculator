import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get('staffId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  
  const db = getDb();
  
  let sql = 'SELECT * FROM monthly_entries WHERE 1=1';
  const params: any[] = [];
  
  if (staffId) {
    sql += ' AND staff_id = $' + (params.length + 1);
    params.push(staffId);
  }
  if (year) {
    sql += ' AND year = $' + (params.length + 1);
    params.push(year);
  }
  if (month) {
    sql += ' AND month = $' + (params.length + 1);
    params.push(month);
  }
  
  sql += ' ORDER BY year, month';
  
  const entries = await db.query(sql, params);
  
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  const existing = await db.query(
    `SELECT id FROM monthly_entries WHERE staff_id = $1 AND year = $2 AND month = $3`,
    [body.staff_id, body.year, body.month]
  );
  
  if (existing.length > 0) {
    await db.query(
      `UPDATE monthly_entries SET project_allocations = $1, non_eu_days = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [JSON.stringify(body.project_allocations), body.non_eu_days || 0, existing[0].id]
    );
    
    return NextResponse.json({ id: existing[0].id, ...body, updated: true });
  }
  
  const result = await db.query(
    `INSERT INTO monthly_entries (staff_id, year, month, project_allocations, non_eu_days) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [body.staff_id, body.year, body.month, JSON.stringify(body.project_allocations || []), body.non_eu_days || 0]
  );
  
  return NextResponse.json({ id: result[0]?.id, ...body, created: true });
}
