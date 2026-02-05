import { getDb } from './src/lib/db';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = './data';
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = getDb(); // This will automatically initialize schema

// Seed ECB rates for December 2025
console.log('Seeding ECB rates for December 2025...');

const decemberRates = [
  { date: '2025-12-01', eur_sek: 10.45 },
  { date: '2025-12-02', eur_sek: 10.47 },
  { date: '2025-12-03', eur_sek: 10.48 },
  { date: '2025-12-04', eur_sek: 10.46 },
  { date: '2025-12-05', eur_sek: 10.44 },
  { date: '2025-12-08', eur_sek: 10.43 },
  { date: '2025-12-09', eur_sek: 10.42 },
  { date: '2025-12-10', eur_sek: 10.44 },
  { date: '2025-12-11', eur_sek: 10.46 },
  { date: '2025-12-12', eur_sek: 10.48 },
  { date: '2025-12-15', eur_sek: 10.47 },
  { date: '2025-12-16', eur_sek: 10.45 },
  { date: '2025-12-17', eur_sek: 10.43 },
  { date: '2025-12-18', eur_sek: 10.44 },
  { date: '2025-12-19', eur_sek: 10.46 },
  { date: '2025-12-22', eur_sek: 10.48 },
  { date: '2025-12-23', eur_sek: 10.50 },
  { date: '2025-12-29', eur_sek: 10.52 },
  { date: '2025-12-30', eur_sek: 10.51 },
  { date: '2025-12-31', eur_sek: 10.49 },
];

// Calculate average for different periods
const avgDec = 10.48;
const avgNov = 10.42;
const avgOct = 10.38;
const avgSep = 10.35;
const avgAug = 10.32;
const avgJul = 10.30;
const avgJun = 10.28;
const avgMay = 10.25;
const avgApr = 10.22;
const avgMar = 10.20;
const avgFeb = 10.18;
const avgJan = 10.15;

const monthlyAverages = {
  1: avgJan, 2: avgFeb, 3: avgMar, 4: avgApr, 5: avgMay, 6: avgJun,
  7: avgJul, 8: avgAug, 9: avgSep, 10: avgOct, 11: avgNov, 12: avgDec
};

// Generate full year rates (simplified)
for (let month = 1; month <= 12; month++) {
  const daysInMonth = month === 2 ? 28 : (month <= 7 ? 31 : 30);
  const rate = monthlyAverages[month as keyof typeof monthlyAverages];
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Skip weekends
    const date = new Date(2025, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const dateStr = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    try {
      db.prepare('INSERT OR IGNORE INTO ecb_rates (date, eur_sek) VALUES (?, ?)').run(dateStr, rate + (Math.random() * 0.02 - 0.01));
    } catch (e) {
      // Ignore duplicate key errors
    }
  }
}

// Seed Staff - Polina
console.log('Seeding staff...');
const polinaResult = db.prepare(`
  INSERT INTO staff (name, email, fte_history) 
  VALUES (?, ?, ?)
`).run(
  'Polina Ivanova',
  'polina@example.com',
  JSON.stringify([
    { from_date: '2025-01-01', to_date: null, percentage: 0.6 }
  ])
);
console.log(`Created staff: Polina (ID: ${polinaResult.lastInsertRowid})`);

// Seed Projects
console.log('Seeding projects...');

const lumenResult = db.prepare(`
  INSERT INTO projects (name, code, start_date) 
  VALUES (?, ?, ?)
`).run('LUMEN Research Project', 'LUMEN', '2025-01-01');
console.log(`Created project: LUMEN (ID: ${lumenResult.lastInsertRowid})`);

const graphiaResult = db.prepare(`
  INSERT INTO projects (name, code, start_date) 
  VALUES (?, ?, ?)
`).run('GRAPHIA Innovation', 'GRAPHIA', '2025-01-01');
console.log(`Created project: GRAPHIA (ID: ${graphiaResult.lastInsertRowid})`);

// Seed Periods
console.log('Seeding project periods...');

db.prepare(`
  INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) 
  VALUES (?, ?, ?, ?, ?)
`).run(lumenResult.lastInsertRowid, 1, '2025-01-01', '2025-06-30', 'Phase 1 - Foundation');

db.prepare(`
  INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) 
  VALUES (?, ?, ?, ?, ?)
`).run(lumenResult.lastInsertRowid, 2, '2025-07-01', '2025-12-31', 'Phase 2 - Implementation');

db.prepare(`
  INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) 
  VALUES (?, ?, ?, ?, ?)
`).run(graphiaResult.lastInsertRowid, 1, '2025-01-01', '2025-12-31', 'Full Year 2025');

// Seed Monthly Entries for Polina - December 2025 (our test case)
console.log('Seeding monthly entries for December 2025...');

db.prepare(`
  INSERT INTO monthly_entries (staff_id, year, month, project_allocations, non_eu_days) 
  VALUES (?, ?, ?, ?, ?)
`).run(
  polinaResult.lastInsertRowid,
  2025,
  12,
  JSON.stringify([
    { project_id: lumenResult.lastInsertRowid, period_number: 2, days: 4 },
    { project_id: graphiaResult.lastInsertRowid, period_number: 1, days: 7 }
  ]),
  0 // No non-EU days
);

console.log('\n✅ Database seeded successfully!');
console.log('\nTest Case: Polina (60% FTE), December 2025');
console.log('  - 4 days LUMEN Period 2');
console.log('  - 7 days GRAPHIA Period 1');
console.log('  - Eligible days: 18');
console.log('  - Expected EUR: ((4/18) × 8000 × 0.6) + ((7/18) × 8000 × 0.6) = 2933.33 EUR');
console.log('\nTo test the calculation:');
console.log('  1. npm run dev');
console.log('  2. Go to http://localhost:3000');
console.log('  3. Navigate to Calculate');
console.log('  4. Select Polina, December 2025');
console.log('  5. Click "Calculate Payment"');
