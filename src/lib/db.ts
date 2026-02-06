import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/salary_calc',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

let db: Pool | null = null;

export function getDb(): Pool {
  if (!db) {
    db = pool;
    initSchema();
  }
  return db;
}

// Wrap pg query to return arrays directly
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

async function initSchema() {
  const client = await getClient();
  try {
    // Staff table with FTE history as JSON
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        fte_history JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects with periods
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        start_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS project_periods (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        period_number INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        description TEXT,
        UNIQUE(project_id, period_number)
      )
    `);

    // ECB rates storage
    await client.query(`
      CREATE TABLE IF NOT EXISTS ecb_rates (
        date TEXT PRIMARY KEY,
        eur_sek REAL NOT NULL,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Monthly timesheet entries
    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_entries (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        project_allocations JSONB NOT NULL DEFAULT '[]',
        non_eu_days REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(staff_id, year, month)
      )
    `);

    // Payment records with full audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        gross_sek REAL NOT NULL,
        eu_portion_sek REAL NOT NULL,
        non_eu_portion_sek REAL NOT NULL,
        total_eur_claimable REAL NOT NULL,
        eu_eur_amount REAL NOT NULL,
        non_eu_eur_amount REAL NOT NULL,
        rates_used JSONB NOT NULL,
        cumulative_eur_to_date REAL NOT NULL,
        cumulative_sek_paid_to_date REAL NOT NULL,
        cumulative_avg_rate REAL NOT NULL,
        calculation_breakdown JSONB NOT NULL,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_staff ON payments(staff_id, year, month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_entries_staff ON monthly_entries(staff_id, year, month)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rates_date ON ecb_rates(date)`);
  } finally {
    client.release();
  }
}

export interface Staff {
  id: number;
  name: string;
  email?: string;
  fte_history: FTEHistory[];
  created_at: string;
}

export interface FTEHistory {
  from_date: string;
  to_date: string | null;
  percentage: number;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  start_date: string;
  created_at: string;
}

export interface ProjectPeriod {
  id: number;
  project_id: number;
  period_number: number;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface ECBRate {
  date: string;
  eur_sek: number;
  fetched_at: string;
}

export interface ProjectAllocation {
  project_id: number;
  period_number: number;
  days: number;
}

export interface MonthlyEntry {
  id: number;
  staff_id: number;
  year: number;
  month: number;
  project_allocations: ProjectAllocation[];
  non_eu_days: number;
  created_at: string;
  updated_at: string;
}

export interface RateInfo {
  type: 'project' | 'non_eu';
  project_id?: number;
  project_name?: string;
  period_number?: number;
  rate: number;
  rate_source: string;
  days: number;
  eur_amount: number;
  sek_amount: number;
}

export interface EUCalculationStep {
  project_id: number;
  project_name: string;
  period_number: number;
  days_worked: number;
  fte_percentage: number;
  days_in_month: number;
  eur_calculation: string;
  eur_amount: number;
}

export interface NonEUCalculation {
  days: number;
  fte_percentage: number;
  eur_calculation: string;
  eur_amount: number;
  rate_calculation: string;
  rate: number;
  sek_calculation: string;
  sek_amount: number;
}

export interface CalculationBreakdown {
  month_index: number;
  period_start_date: string;
  calculation_date: string;
  eu_calculation_steps: EUCalculationStep[];
  non_eu_calculation: NonEUCalculation;
  gross_calculation: string;
}

export interface Payment {
  id: number;
  staff_id: number;
  year: number;
  month: number;
  gross_sek: number;
  eu_portion_sek: number;
  non_eu_portion_sek: number;
  total_eur_claimable: number;
  eu_eur_amount: number;
  non_eu_eur_amount: number;
  rates_used: RateInfo[];
  cumulative_eur_to_date: number;
  cumulative_sek_paid_to_date: number;
  cumulative_avg_rate: number;
  calculation_breakdown: CalculationBreakdown;
  paid_at?: string;
  created_at: string;
}

// Helper functions
export function getEligibleDaysInMonth(month: number): number {
  return month === 2 ? 17 : 18;
}

export function getFTEForDate(fteHistory: FTEHistory[], date: string): number {
  const targetDate = new Date(date);
  for (const fte of fteHistory) {
    const fromDate = new Date(fte.from_date);
    const toDate = fte.to_date ? new Date(fte.to_date) : new Date('2099-12-31');
    if (targetDate >= fromDate && targetDate <= toDate) {
      return fte.percentage;
    }
  }
  return 1.0;
}

// Type assertion helpers for PostgreSQL JSON columns
export function parseJson<T>(str: string | null | undefined, defaultValue: T): T {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}
