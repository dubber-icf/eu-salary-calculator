import { getDb, query } from './src/lib/db';

async function seed() {
  console.log('Initializing PostgreSQL database...\n');

  // Seed ECB rates for December 2025
  console.log('Seeding ECB rates for December 2025...');

  const monthlyAverages = {
    1: 10.15, 2: 10.18, 3: 10.20, 4: 10.22, 5: 10.25, 6: 10.28,
    7: 10.30, 8: 10.32, 9: 10.35, 10: 10.38, 11: 10.42, 12: 10.48
  };

  // Generate full year rates
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = month === 2 ? 28 : (month <= 7 ? 31 : 30);
    const baseRate = monthlyAverages[month as keyof typeof monthlyAverages];
    
    for (let day = 1; day <= daysInMonth; day++) {
      // Skip weekends
      const date = new Date(2025, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      const dateStr = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rate = baseRate + (Math.random() * 0.02 - 0.01);
      
      await query(
        `INSERT INTO ecb_rates (date, eur_sek) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING`,
        [dateStr, rate]
      );
    }
  }
  console.log('ECB rates seeded.');

  // Seed Staff - Polina
  console.log('Seeding staff...');
  const polinaResult = await query(
    `INSERT INTO staff (name, email, fte_history) VALUES ($1, $2, $3) RETURNING id`,
    ['Polina Ivanova', 'polina@example.com', JSON.stringify([{ from_date: '2025-01-01', to_date: null, percentage: 0.6 }])]
  );
  const polinaId = polinaResult[0].id;
  console.log(`Created staff: Polina (ID: ${polinaId})`);

  // Seed Projects
  console.log('Seeding projects...');

  const lumenResult = await query(
    `INSERT INTO projects (name, code, start_date) VALUES ($1, $2, $3) RETURNING id`,
    ['LUMEN Research Project', 'LUMEN', '2025-01-01']
  );
  const lumenId = lumenResult[0].id;
  console.log(`Created project: LUMEN (ID: ${lumenId})`);

  const graphiaResult = await query(
    `INSERT INTO projects (name, code, start_date) VALUES ($1, $2, $3) RETURNING id`,
    ['GRAPHIA Innovation', 'GRAPHIA', '2025-01-01']
  );
  const graphiaId = graphiaResult[0].id;
  console.log(`Created project: GRAPHIA (ID: ${graphiaId})`);

  // Seed Periods
  console.log('Seeding project periods...');

  await query(
    `INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5)`,
    [lumenId, 1, '2025-01-01', '2025-06-30', 'Phase 1 - Foundation']
  );
  await query(
    `INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5)`,
    [lumenId, 2, '2025-07-01', '2025-12-31', 'Phase 2 - Implementation']
  );
  await query(
    `INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5)`,
    [graphiaId, 1, '2025-01-01', '2025-12-31', 'Full Year 2025']
  );

  // Seed Monthly Entries for Polina - December 2025 (our test case)
  console.log('Seeding monthly entries for December 2025...');

  await query(
    `INSERT INTO monthly_entries (staff_id, year, month, project_allocations, non_eu_days) VALUES ($1, $2, $3, $4, $5)`,
    [polinaId, 2025, 12, JSON.stringify([
      { project_id: lumenId, period_number: 2, days: 4 },
      { project_id: graphiaId, period_number: 1, days: 7 }
    ]), 0]
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
}

seed().catch(console.error);
