import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
  const db = getDb();
  
  let query = 'SELECT * FROM ecb_rates';
  const params: any[] = [];
  
  if (startDate && endDate) {
    query += ' WHERE date >= ? AND date <= ? ORDER BY date';
    params.push(startDate, endDate);
  } else {
    query += ' ORDER BY date DESC LIMIT 100';
  }
  
  const rates = db.prepare(query).all(...params);
  return NextResponse.json(rates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  // Insert or update rates
  const inserted: string[] = [];
  const updated: string[] = [];
  
  for (const rate of body.rates || [body]) {
    const date = rate.date || rate;
    const eurSek = rate.eur_sek || rate.rate || rate.value;
    
    const existing = db.prepare('SELECT * FROM ecb_rates WHERE date = ?').get(date);
    
    if (existing) {
      db.prepare('UPDATE ecb_rates SET eur_sek = ? WHERE date = ?').run(eurSek, date);
      updated.push(date);
    } else {
      db.prepare('INSERT INTO ecb_rates (date, eur_sek) VALUES (?, ?)').run(date, eurSek);
      inserted.push(date);
    }
  }
  
  return NextResponse.json({ inserted, updated });
}
