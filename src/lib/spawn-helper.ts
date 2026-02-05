/**
 * Sub-Agent Spawn Helper
 * 
 * Provides easy-to-use functions for offloading tasks to MiniMax sub-agents
 * while keeping the main session (Kimi K2.5) responsive.
 */

import { sessions_spawn } from 'openclaw';

/**
 * Offload a task to a MiniMax sub-agent
 * 
 * @param task - Description of the task to run
 * @param label - Human-readable label for the task (for monitoring)
 * @param timeoutSeconds - Maximum time to allow (default: 300 = 5 minutes)
 * @returns The sub-agent session key
 */
export async function offloadToMinimax(
  task: string,
  label: string,
  timeoutSeconds: number = 300
): Promise<string> {
  const result = await sessions_spawn({
    task,
    label,
    model: 'minimax/MiniMax-M2.1',
    timeoutSeconds
  });
  
  return result;
}

/**
 * Common task templates for offloading
 */
export const TaskTemplates = {
  /**
   * Deploy to Render
   */
  deployRender: (appName: string, apiKey: string, repoUrl: string) => `
Deploy ${appName} to Render:
1. Build the Next.js application in /home/ubuntu/.openclaw/workspace/${appName}
2. Push changes to GitHub at ${repoUrl}
3. Create or update Render service using API key: ${apiKey}
4. Return deployment URL and any errors
  `.trim(),
  
  /**
   * Process ECB rates
   */
  processECBRates: (year: number, month: number) => `
Fetch ECB exchange rates for ${year}-${month}:
1. Download rates from https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
2. Extract EUR to SEK rates for all business days
3. Calculate monthly average
4. Store in database at /home/ubuntu/.openclaw/workspace/eu-salary-calculator-demo/data/salary.db
5. Return summary: total days, average rate, min/max
  `.trim(),
  
  /**
   * Calculate all staff salaries for a period
   */
  calculateAllSalaries: (year: number, month: number) => `
Calculate salary payments for all staff for ${year}-${month}:
1. Fetch all staff from database
2. For each staff member, fetch their monthly entries
3. Calculate payments using cumulative truing logic
4. Store payments in database
5. Return summary: total payments, breakdown by staff, any errors
  `.trim(),
  
  /**
   * Backfill historical data
   */
  backfillData: (startYear: number, startMonth: number, endYear: number, endMonth: number) => `
Backfill salary data from ${startYear}-${startMonth} to ${endYear}-${endMonth}:
1. For each month in range, fetch/calculate ECB rates
2. For each staff member, calculate salary payments
3. Store all calculations in database
4. Return summary: total entries created, any errors
  `.trim(),
  
  /**
   * Generate monthly report
   */
  generateReport: (year: number, month: number) => `
Generate monthly salary report for ${year}-${month}:
1. Fetch all payments for the month
2. Calculate totals by project and by staff
3. Generate summary statistics
4. Return formatted report with tables
  `.trim(),
  
  /**
   * Database maintenance
   */
  databaseMaintenance: () => `
Perform database maintenance:
1. Check for orphaned records
2. Verify data integrity
3. Vacuum/optimize the database
4. Return status report
  `.trim()
};

/**
 * Quick spawn function for common tasks
 */
export async function spawnTask(
  template: keyof typeof TaskTemplates,
  params: Record<string, any>
): Promise<string> {
  let task: string;
  
  switch (template) {
    case 'deployRender':
      task = TaskTemplates.deployRender(
        params.appName,
        params.apiKey,
        params.repoUrl
      );
      break;
    case 'processECBRates':
      task = TaskTemplates.processECBRates(
        params.year,
        params.month
      );
      break;
    case 'calculateAllSalaries':
      task = TaskTemplates.calculateAllSalaries(
        params.year,
        params.month
      );
      break;
    case 'backfillData':
      task = TaskTemplates.backfillData(
        params.startYear,
        params.startMonth,
        params.endYear,
        params.endMonth
      );
      break;
    case 'generateReport':
      task = TaskTemplates.generateReport(
        params.year,
        params.month
      );
      break;
    case 'databaseMaintenance':
      task = TaskTemplates.databaseMaintenance();
      break;
    default:
      throw new Error(`Unknown task template: ${template}`);
  }
  
  return offloadToMinimax(task, `${template}-${Date.now()}`, params.timeout || 300);
}
