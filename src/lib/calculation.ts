import { getDb, getEligibleDaysInMonth, getFTEForDate, Payment, CalculationBreakdown, RateInfo, EUCalculationStep, NonEUCalculation } from './db';
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';

const PERSON_MONTH_RATE = 8000; // EUR per person-month

export interface CalculationInput {
  staffId: number;
  year: number;
  month: number;
}

export interface CalculationResult {
  grossSEK: number;
  euPortionSEK: number;
  nonEUPortionSEK: number;
  totalEURClaimable: number;
  euEURAmount: number;
  nonEURAmount: number;
  ratesUsed: RateInfo[];
  cumulativeEURToDate: number;
  cumulativeSEKPaidToDate: number;
  cumulativeAvgRate: number;
  calculationBreakdown: CalculationBreakdown;
}

/**
 * Calculate average EUR-SEK rate between two dates from ECB data
 */
export function getAverageECBRate(startDate: string, endDate: string): number {
  const db = getDb();
  
  const rates = db.prepare(`
    SELECT eur_sek 
    FROM ecb_rates 
    WHERE date >= ? AND date <= ?
    ORDER BY date
  `).all(startDate, endDate) as { eur_sek: number }[];
  
  if (rates.length === 0) {
    throw new Error(`No ECB rates found between ${startDate} and ${endDate}`);
  }
  
  const sum = rates.reduce((acc, r) => acc + r.eur_sek, 0);
  return sum / rates.length;
}

/**
 * Get current month average rate
 */
export function getCurrentMonthRate(year: number, month: number): number {
  const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  return getAverageECBRate(start, end);
}

/**
 * Get previous payments for a staff member up to (but not including) the given month/year
 */
export function getPreviousPayments(staffId: number, year: number, month: number): Payment[] {
  const db = getDb();
  
  return db.prepare(`
    SELECT * FROM payments 
    WHERE staff_id = ? 
    AND (
      year < ? 
      OR (year = ? AND month < ?)
    )
    ORDER BY year, month
  `).all(staffId, year, year, month) as Payment[];
}

/**
 * Calculate cumulative EUR to date for a specific project/period
 */
export function getCumulativeEURToDate(
  staffId: number, 
  projectId: number, 
  periodNumber: number,
  year: number, 
  month: number
): number {
  const db = getDb();
  
  // Get all entries up to this month/year
  const entries = db.prepare(`
    SELECT * FROM monthly_entries 
    WHERE staff_id = ? AND (year < ? OR (year = ? AND month <= ?))
    ORDER BY year, month
  `).all(staffId, year, year, month) as any[];
  
  let cumulativeEUR = 0;
  
  for (const entry of entries) {
    const allocations = JSON.parse(entry.project_allocations) as any[];
    const allocation = allocations.find(
      (a: any) => a.project_id === projectId && a.period_number === periodNumber
    );
    
    if (allocation) {
      const fte = getFTEForDate(
        JSON.parse(db.prepare(`SELECT fte_history FROM staff WHERE id = ?`).get(staffId) as any).fte_history,
        `${entry.year}-${String(entry.month).padStart(2, '0')}-15`
      );
      
      const eligibleDays = getEligibleDaysInMonth(entry.month);
      const eur = (allocation.days / eligibleDays) * PERSON_MONTH_RATE * fte;
      cumulativeEUR += eur;
    }
  }
  
  return cumulativeEUR;
}

/**
 * Main calculation function for salary payment
 */
export function calculateSalary(input: CalculationInput): CalculationResult {
  const db = getDb();
  const { staffId, year, month } = input;
  
  // Get staff record
  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId) as any;
  if (!staff) {
    throw new Error(`Staff not found: ${staffId}`);
  }
  
  const fteHistory = JSON.parse(staff.fte_history) as any[];
  const fte = getFTEForDate(fteHistory, `${year}-${String(month).padStart(2, '0')}-15`);
  
  // Get the monthly entry
  const entry = db.prepare(`
    SELECT * FROM monthly_entries 
    WHERE staff_id = ? AND year = ? AND month = ?
  `).get(staffId, year, month) as any;
  
  if (!entry) {
    throw new Error(`No entry found for staff ${staffId}, ${year}-${month}`);
  }
  
  const allocations = JSON.parse(entry.project_allocations) as any[];
  const nonEUDays = entry.non_eu_days || 0;
  
  const eligibleDays = getEligibleDaysInMonth(month);
  
  // Calculate which period number we're in for each project
  const currentDate = `${year}-${String(month).padStart(2, '0')}-15`;
  
  // Group allocations by project/period
  const projectPeriodGroups: Record<string, { projectId: number; periodNumber: number; days: number }[]> = {};
  
  for (const alloc of allocations) {
    const key = `${alloc.project_id}-${alloc.period_number}`;
    if (!projectPeriodGroups[key]) {
      projectPeriodGroups[key] = [];
    }
    projectPeriodGroups[key].push(alloc);
  }
  
  // Calculate EU portion
  const ratesUsed: RateInfo[] = [];
  const euCalculationSteps: EUCalculationStep[] = [];
  let euEURAmount = 0;
  let cumulativeEURToDate = 0;
  
  for (const [key, allocGroup] of Object.entries(projectPeriodGroups)) {
    const [projectId, periodNumber] = key.split('-').map(Number);
    const daysWorked = allocGroup.reduce((sum, a) => sum + a.days, 0);
    
    // Get project info
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    const period = db.prepare(`
      SELECT * FROM project_periods 
      WHERE project_id = ? AND period_number = ?
    `).get(projectId, periodNumber) as any;
    
    // Calculate EUR for this month
    const eurAmount = (daysWorked / eligibleDays) * PERSON_MONTH_RATE * fte;
    
    // Get cumulative EUR to date
    const prevPayments = getPreviousPayments(staffId, year, month);
    let cumulativeForThisProject = 0;
    
    for (const payment of prevPayments) {
      const rates = JSON.parse(payment.rates_used) as RateInfo[];
      const projectRate = rates.find(
        r => r.type === 'project' && r.project_id === projectId && r.period_number === periodNumber
      );
      if (projectRate) {
        cumulativeForThisProject += projectRate.eur_amount;
      }
    }
    
    cumulativeForThisProject += eurAmount;
    cumulativeEURToDate += eurAmount;
    
    // Get cumulative average rate from period start to today
    const periodStart = period.start_date;
    const today = format(new Date(), 'yyyy-MM-dd');
    const avgRate = getAverageECBRate(periodStart, today);
    
    // Calculate what should have been paid to date
    const cumulativeSEKShouldBe = cumulativeForThisProject * avgRate;
    
    // Get what was actually paid to date (this project/period only)
    let previousSEKPaid = 0;
    for (const payment of prevPayments) {
      const rates = JSON.parse(payment.rates_used) as RateInfo[];
      const projectRate = rates.find(
        r => r.type === 'project' && r.project_id === projectId && r.period_number === periodNumber
      );
      if (projectRate) {
        previousSEKPaid += projectRate.sek_amount;
      }
    }
    
    // This month's payment for this project/period
    const paymentSEK = cumulativeSEKShouldBe - previousSEKPaid;
    
    ratesUsed.push({
      type: 'project',
      project_id: projectId,
      project_name: project.name,
      period_number: periodNumber,
      rate: avgRate,
      rate_source: `ECB average ${periodStart} to ${today}`,
      days: daysWorked,
      eur_amount: eurAmount,
      sek_amount: paymentSEK
    });
    
    euEURAmount += eurAmount;
    
    euCalculationSteps.push({
      project_id: projectId,
      project_name: project.name,
      period_number: periodNumber,
      days_worked: daysWorked,
      fte_percentage: fte,
      days_in_month: eligibleDays,
      eur_calculation: `(${daysWorked} / ${eligibleDays}) × ${PERSON_MONTH_RATE} × ${fte} = ${eurAmount.toFixed(2)} EUR`,
      eur_amount: eurAmount
    });
  }
  
  // Calculate previous payments total SEK
  const prevPayments = getPreviousPayments(staffId, year, month);
  let previousSEKPaid = 0;
  for (const payment of prevPayments) {
    previousSEKPaid += payment.eu_portion_sek;
  }
  
  // Calculate cumulative average rate (weighted by EUR amount)
  let weightedRateSum = 0;
  let totalEURForWeightedAvg = 0;
  
  for (const rateInfo of ratesUsed) {
    weightedRateSum += rateInfo.rate * rateInfo.eur_amount;
    totalEURForWeightedAvg += rateInfo.eur_amount;
  }
  
  const cumulativeAvgRate = totalEURForWeightedAvg > 0 
    ? weightedRateSum / totalEURForWeightedAvg 
    : 0;
  
  // EU portion SEK
  const euPortionSEK = (euEURAmount * cumulativeAvgRate) - previousSEKPaid;
  
  // Non-EU portion
  let nonEUPortionSEK = 0;
  let nonEURAmount = 0;
  let nonEURCalc: NonEUCalculation | null = null;
  
  if (nonEUDays > 0) {
    nonEURAmount = (nonEUDays / eligibleDays) * PERSON_MONTH_RATE * fte;
    const currentMonthRate = getCurrentMonthRate(year, month);
    nonEUPortionSEK = nonEURAmount * currentMonthRate;
    
    nonEURCalc = {
      days: nonEUDays,
      fte_percentage: fte,
      eur_calculation: `(${nonEUDays} / ${eligibleDays}) × ${PERSON_MONTH_RATE} × ${fte} = ${nonEURAmount.toFixed(2)} EUR`,
      eur_amount: nonEURAmount,
      rate_calculation: `ECB average for ${year}-${String(month).padStart(2, '0')}`,
      rate: currentMonthRate,
      sek_calculation: `${nonEURAmount.toFixed(2)} EUR × ${currentMonthRate} = ${nonEUPortionSEK.toFixed(2)} SEK`,
      sek_amount: nonEUPortionSEK
    };
    
    ratesUsed.push({
      type: 'non_eu',
      rate: currentMonthRate,
      rate_source: `ECB average for ${year}-${String(month).padStart(2, '0')}`,
      days: nonEUDays,
      eur_amount: nonEURAmount,
      sek_amount: nonEUPortionSEK
    });
  }
  
  // Total gross
  const grossSEK = euPortionSEK + nonEUPortionSEK;
  const totalEURClaimable = euEURAmount + nonEURAmount;
  
  // Build calculation breakdown for audit
  const calculationBreakdown: CalculationBreakdown = {
    month_index: month,
    period_start_date: Object.values(projectPeriodGroups)[0] 
      ? (() => {
          const result = db.prepare('SELECT start_date FROM project_periods WHERE project_id = ? AND period_number = ?')
            .get(Object.values(projectPeriodGroups)[0][0].projectId, Object.values(projectPeriodGroups)[0][0].periodNumber) as any;
          return result ? result.start_date || '' : '';
        })()
      : '',
    calculation_date: format(new Date(), 'yyyy-MM-dd'),
    eu_calculation_steps: euCalculationSteps,
    non_eu_calculation: nonEURCalc!,
    gross_calculation: `${euEURAmount.toFixed(2)} EUR × ${cumulativeAvgRate.toFixed(4)} + ${nonEURAmount.toFixed(2)} EUR × ${nonEURCalc?.rate.toFixed(4) || 0} = ${grossSEK.toFixed(2)} SEK`
  };
  
  return {
    grossSEK,
    euPortionSEK,
    nonEUPortionSEK,
    totalEURClaimable,
    euEURAmount,
    nonEURAmount,
    ratesUsed,
    cumulativeEURToDate,
    cumulativeSEKPaidToDate: previousSEKPaid,
    cumulativeAvgRate,
    calculationBreakdown
  };
}

/**
 * Store a payment record
 */
export function storePayment(input: CalculationInput, result: CalculationResult): number {
  const db = getDb();
  const { staffId, year, month } = input;
  
  const stmt = db.prepare(`
    INSERT INTO payments (
      staff_id, year, month, gross_sek, eu_portion_sek, non_eu_portion_sek,
      total_eur_claimable, eu_eur_amount, non_eu_eur_amount, rates_used,
      cumulative_eur_to_date, cumulative_sek_paid_to_date, cumulative_avg_rate,
      calculation_breakdown, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const result2 = stmt.run(
    staffId, year, month,
    result.grossSEK, result.euPortionSEK, result.nonEUPortionSEK,
    result.totalEURClaimable, result.euEURAmount, result.nonEURAmount,
    JSON.stringify(result.ratesUsed),
    result.cumulativeEURToDate, result.cumulativeSEKPaidToDate, result.cumulativeAvgRate,
    JSON.stringify(result.calculationBreakdown)
  );
  
  return result2.lastInsertRowid as number;
}
