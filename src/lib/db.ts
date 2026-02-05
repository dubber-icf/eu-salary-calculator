import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'salary.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  if (!db) return;

  // Staff table with FTE history as JSON
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      fte_history TEXT NOT NULL, -- JSON array of {from_date, to_date, percentage}
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Projects with periods
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL, -- ISO date YYYY-MM-DD
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS project_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      period_number INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      UNIQUE(project_id, period_number)
    )
  `);

  // ECB rates storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS ecb_rates (
      date TEXT PRIMARY KEY,
      eur_sek REAL NOT NULL,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Monthly timesheet entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      project_allocations TEXT NOT NULL, -- JSON: [{project_id, period_number, days}]
      non_eu_days REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(staff_id, year, month)
    )
  `);

  // Payment records with full audit trail
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      gross_sek REAL NOT NULL,
      eu_portion_sek REAL NOT NULL,
      non_eu_portion_sek REAL NOT NULL,
      total_eur_claimable REAL NOT NULL,
      eu_eur_amount REAL NOT NULL,
      non_eu_eur_amount REAL NOT NULL,
      rates_used TEXT NOT NULL, -- JSON: detailed rate info per project/non-EU
      cumulative_eur_to_date REAL NOT NULL,
      cumulative_sek_paid_to_date REAL NOT NULL,
      cumulative_avg_rate REAL NOT NULL,
      calculation_breakdown TEXT NOT NULL, -- JSON: full audit trail
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes for performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_staff ON payments(staff_id, year, month)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_entries_staff ON monthly_entries(staff_id, year, month)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rates_date ON ecb_rates(date)`);
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
  return 1.0; // Default to 100%
}
