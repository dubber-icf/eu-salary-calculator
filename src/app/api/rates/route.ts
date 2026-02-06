import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
  if (startDate && endDate) {
    const rates = await query(
      'SELECT * FROM ecb_rates WHERE date >= $1 AND date <= $2 ORDER BY date',
      [startDate, endDate]
    );
    return NextResponse.json(rates);
  }
  
  const rates = await query('SELECT * FROM ecb_rates ORDER BY date DESC LIMIT 100');
  return NextResponse.json(rates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const inserted: string[] = [];
  const updated: string[] = [];
  
  const rates = Array.isArray(body.rates) ? body.rates : [body];
  
  for (const rate of rates) {
    const date = rate.date || rate;
    const eurSek = rate.eur_sek || rate.rate || rate.value;
    
    const existing = await query('SELECT * FROM ecb_rates WHERE date = $1', [date]);
    
    if (existing.length > 0) {
      await query('UPDATE ecb_rates SET eur_sek = $1 WHERE date = $2', [eurSek, date]);
      updated.push(date);
    } else {
      await query('INSERT INTO ecb_rates (date, eur_sek) VALUES ($1, $2)', [date, eurSek]);
      inserted.push(date);
    }
  }
  
  return NextResponse.json({ inserted, updated });
}
