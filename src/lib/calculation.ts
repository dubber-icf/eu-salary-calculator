import { getDb, query, getEligibleDaysInMonth, getFTEForDate, Payment, CalculationBreakdown, RateInfo, EUCalculationStep, NonEUCalculation } from './db';
import { format, startOfMonth, endOfMonth } from 'date-fns';

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
export async function getAverageECBRate(startDate: string, endDate: string): Promise<number> {
  const db = getDb();
  
  const result = await db.query(
    `SELECT eur_sek FROM ecb_rates WHERE date >= $1 AND date <= $2 ORDER BY date`,
    [startDate, endDate]
  );
  
  if (result.length === 0) {
    throw new Error(`No ECB rates found between ${startDate} and ${endDate}`);
  }
  
  const sum = result.reduce((acc: number, r: { eur_sek: number }) => acc + r.eur_sek, 0);
  return sum / result.length;
}

/**
 * Get current month average rate
 */
export async function getCurrentMonthRate(year: number, month: number): Promise<number> {
  const start = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const end = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  return getAverageECBRate(start, end);
}

/**
 * Get previous payments for a staff member up to (but not including) the given month/year
 */
export async function getPreviousPayments(staffId: number, year: number, month: number): Promise<Payment[]> {
  const db = getDb();
  
  return db.query(
    `SELECT * FROM payments WHERE staff_id = $1 AND (year < $2 OR (year = $2 AND month < $3)) ORDER BY year, month`,
    [staffId, year, month]
  ) as Promise<Payment[]>;
}

/**
 * Calculate cumulative EUR to date for a specific project/period
 */
export async function getCumulativeEURToDate(
  staffId: number, 
  projectId: number, 
  periodNumber: number,
  year: number, 
  month: number
): Promise<number> {
  const db = getDb();
  
  // Get all entries up to this month/year
  const entries = await db.query(
    `SELECT * FROM monthly_entries WHERE staff_id = $1 AND (year < $2 OR (year = $2 AND month <= $3)) ORDER BY year, month`,
    [staffId, year, month]
  );
  
  let cumulativeEUR = 0;
  
  for (const entry of entries as any[]) {
    const allocations = JSON.parse(entry.project_allocations) as any[];
    const allocation = allocations.find(
      (a: any) => a.project_id === projectId && a.period_number === periodNumber
    );
    
    if (allocation) {
      const fte = getFTEForDate(
        JSON.parse((await db.query(`SELECT fte_history FROM staff WHERE id = $1`, [staffId]))[0]?.fte_history || '[]'),
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
export async function calculateSalary(input: CalculationInput): Promise<CalculationResult> {
  const db = getDb();
  const { staffId, year, month } = input;
  
  // Get staff record
  const staffResult = await db.query(`SELECT * FROM staff WHERE id = $1`, [staffId]);
  const staff = staffResult[0] as any;
  if (!staff) {
    throw new Error(`Staff not found: ${staffId}`);
  }
  
  const fteHistory = JSON.parse(staff.fte_history) as any[];
  const fte = getFTEForDate(fteHistory, `${year}-${String(month).padStart(2, '0')}-15`);
  
  // Get the monthly entry
  const entryResult = await db.query(
    `SELECT * FROM monthly_entries WHERE staff_id = $1 AND year = $2 AND month = $3`,
    [staffId, year, month]
  );
  const entry = entryResult[0] as any;
  
  if (!entry) {
    throw new Error(`No entry found for staff ${staffId}, ${year}-${month}`);
  }
  
  const allocations = JSON.parse(entry.project_allocations) as any[];
  const nonEUDays = entry.non_eu_days || 0;
  
  const eligibleDays = getEligibleDaysInMonth(month);
  
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
    const daysWorked = allocGroup.reduce((sum: number, a: any) => sum + a.days, 0);
    
    // Get project info
    const projectResult = await db.query(`SELECT * FROM projects WHERE id = $1`, [projectId]);
    const project = projectResult[0] as any;
    const periodResult = await db.query(
      `SELECT * FROM project_periods WHERE project_id = $1 AND period_number = $2`,
      [projectId, periodNumber]
    );
    const period = periodResult[0] as any;
    
    // Calculate EUR for this month
    const eurAmount = (daysWorked / eligibleDays) * PERSON_MONTH_RATE * fte;
    
    // Get cumulative EUR to date
    const prevPayments = await getPreviousPayments(staffId, year, month);
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
    const avgRate = await getAverageECBRate(periodStart, today);
    
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
  const prevPayments = await getPreviousPayments(staffId, year, month);
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
    const currentMonthRate = await getCurrentMonthRate(year, month);
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
  
  // Get period start date for breakdown
  let periodStartDate = '';
  const firstGroup = Object.values(projectPeriodGroups)[0] as { projectId: number; periodNumber: number }[] | undefined;
  if (firstGroup && firstGroup.length > 0) {
    const periodResult = await db.query(
      'SELECT start_date FROM project_periods WHERE project_id = $1 AND period_number = $2',
      [firstGroup[0].projectId, firstGroup[0].periodNumber]
    );
    periodStartDate = periodResult[0]?.start_date || '';
  }
  
  // Build calculation breakdown for audit
  const calculationBreakdown: CalculationBreakdown = {
    month_index: month,
    period_start_date: periodStartDate,
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
export async function storePayment(input: CalculationInput, result: CalculationResult): Promise<number> {
  const db = getDb();
  const { staffId, year, month } = input;
  
  const result2 = await db.query(
    `INSERT INTO payments (
      staff_id, year, month, gross_sek, eu_portion_sek, non_eu_portion_sek,
      total_eur_claimable, eu_eur_amount, non_eu_eur_amount, rates_used,
      cumulative_eur_to_date, cumulative_sek_paid_to_date, cumulative_avg_rate,
      calculation_breakdown, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) RETURNING id`,
    [
      staffId, year, month,
      result.grossSEK, result.euPortionSEK, result.nonEUPortionSEK,
      result.totalEURClaimable, result.euEURAmount, result.nonEURAmount,
      JSON.stringify(result.ratesUsed),
      result.cumulativeEURToDate, result.cumulativeSEKPaidToDate, result.cumulativeAvgRate,
      JSON.stringify(result.calculationBreakdown)
    ]
  );
  
  return result2[0]?.id as number;
}
