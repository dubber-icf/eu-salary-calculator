'use client';

import { useState, useEffect } from 'react';

interface Staff {
  id: number;
  name: string;
  fte_history: { from_date: string; to_date: string | null; percentage: number }[];
}

interface PaymentResult {
  success: boolean;
  paymentId?: number;
  grossSEK: number;
  euPortionSEK: number;
  nonEUPortionSEK: number;
  totalEURClaimable: number;
  euEURAmount: number;
  nonEURAmount: number;
  ratesUsed: { type: string; rate: number; rate_source: string; days: number; eur_amount: number; sek_amount: number; project_name?: string; project_id?: number; period_number?: number }[];
  cumulativeEURToDate: number;
  cumulativeSEKPaidToDate: number;
  cumulativeAvgRate: number;
  calculationBreakdown: {
    month_index: number;
    period_start_date: string;
    calculation_date: string;
    eu_calculation_steps: { project_id: number; project_name: string; period_number: number; days_worked: number; fte_percentage: number; days_in_month: number; eur_calculation: string; eur_amount: number }[];
    non_eu_calculation: { days: number; fte_percentage: number; eur_calculation: string; eur_amount: number; rate_calculation: string; rate: number; sek_calculation: string; sek_amount: number } | null;
    gross_calculation: string;
  };
  error?: string;
}

export default function CalculatePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedStaff) {
      alert('Please select a staff member');
      return;
    }

    setCalculating(true);
    setResult(null);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff,
          year: selectedYear,
          month: selectedMonth
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error calculating salary:', error);
      setResult({
        success: false,
        error: 'Failed to calculate salary',
        grossSEK: 0,
        euPortionSEK: 0,
        nonEUPortionSEK: 0,
        totalEURClaimable: 0,
        euEURAmount: 0,
        nonEURAmount: 0,
        ratesUsed: [],
        cumulativeEURToDate: 0,
        cumulativeSEKPaidToDate: 0,
        cumulativeAvgRate: 0,
        calculationBreakdown: {
          month_index: selectedMonth,
          period_start_date: '',
          calculation_date: new Date().toISOString().split('T')[0],
          eu_calculation_steps: [],
          non_eu_calculation: null,
          gross_calculation: 'Error in calculation'
        }
      });
    } finally {
      setCalculating(false);
    }
  };

  const formatSEK = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatEUR = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calculate Salary</h1>
          <p className="text-gray-600 mt-2">
            Calculate salary payments with cumulative truing for EU projects
          </p>
        </div>

        {/* Calculation Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Period to Calculate</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff Member
              </label>
              <select
                value={selectedStaff || ''}
                onChange={(e) => setSelectedStaff(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select staff...</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleCalculate}
                disabled={calculating || !selectedStaff}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {calculating ? 'Calculating...' : 'Calculate Payment'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Calculation Result</h2>
            </div>
            
            {result.success ? (
              <>
                <div className="p-6">
                  {/* Main Result */}
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-800">Gross Payment</h3>
                      <span className="text-3xl font-bold text-blue-600">{formatSEK(result.grossSEK)}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded p-4">
                        <p className="text-sm text-gray-600">EU Portion</p>
                        <p className="text-xl font-semibold text-gray-900">{formatSEK(result.euPortionSEK)}</p>
                      </div>
                      
                      <div className="bg-white rounded p-4">
                        <p className="text-sm text-gray-600">Non-EU Portion</p>
                        <p className="text-xl font-semibold text-gray-900">{formatSEK(result.nonEUPortionSEK)}</p>
                      </div>
                      
                      <div className="bg-white rounded p-4">
                        <p className="text-sm text-gray-600">Cumulative Avg Rate</p>
                        <p className="text-xl font-semibold text-gray-900">{result.cumulativeAvgRate.toFixed(4)} SEK/EUR</p>
                      </div>
                    </div>
                  </div>

                  {/* EUR Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">EUR Breakdown</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total EUR Claimable:</span>
                          <span className="font-medium">{formatEUR(result.totalEURClaimable)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">EU Work:</span>
                          <span className="font-medium">{formatEUR(result.euEURAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Non-EU Work:</span>
                          <span className="font-medium">{formatEUR(result.nonEURAmount)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Cumulative Totals</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">EUR to Date:</span>
                          <span className="font-medium">{formatEUR(result.cumulativeEURToDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">SEK Paid to Date:</span>
                          <span className="font-medium">{formatSEK(result.cumulativeSEKPaidToDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment ID:</span>
                          <span className="font-medium">#{result.paymentId}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rates Used */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Exchange Rates Applied</h4>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project/Source</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate Source</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Days</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">EUR</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">SEK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {result.ratesUsed.map((rate, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${rate.type === 'project' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                  {rate.type === 'project' ? 'EU Project' : 'Non-EU'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {rate.project_name || 'N/A'}
                                {rate.period_number && ` P${rate.period_number}`}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">{rate.rate_source}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{rate.days}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{formatEUR(rate.eur_amount)}</td>
                              <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">{formatSEK(rate.sek_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Audit Trail Button */}
                  <button
                    onClick={() => setShowAudit(!showAudit)}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <span className="mr-2">[{showAudit ? '−' : '+'}]</span>
                    <span className="font-medium">View Full Calculation Audit Trail</span>
                  </button>
                  
                  {/* Full Audit Trail */}
                  {showAudit && result.calculationBreakdown && (
                    <div className="mt-4 border border-blue-200 rounded-lg bg-blue-50 p-4">
                      <h4 className="font-semibold text-blue-800 mb-4">Full Calculation Breakdown</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">Calculation Date:</p>
                          <p className="font-medium">{result.calculationBreakdown.calculation_date}</p>
                        </div>
                        
                        {result.calculationBreakdown.eu_calculation_steps.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">EU Project Calculations:</p>
                            {result.calculationBreakdown.eu_calculation_steps.map((step, idx) => (
                              <div key={idx} className="bg-white rounded p-3 mb-2 border border-gray-200">
                                <p className="font-medium text-gray-800">{step.project_name} (Period {step.period_number})</p>
                                <p className="text-sm text-gray-600 mt-1">{step.eur_calculation}</p>
                                <p className="text-sm font-medium text-blue-600 mt-1">= {formatEUR(step.eur_amount)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {result.calculationBreakdown.non_eu_calculation && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Non-EU Calculation:</p>
                            <div className="bg-white rounded p-3 border border-gray-200">
                              <p className="text-sm text-gray-600">{result.calculationBreakdown.non_eu_calculation.eur_calculation}</p>
                              <p className="text-sm text-gray-600 mt-1">Rate: {result.calculationBreakdown.non_eu_calculation.rate.toFixed(4)} SEK/EUR</p>
                              <p className="text-sm text-gray-600 mt-1">{result.calculationBreakdown.non_eu_calculation.sek_calculation}</p>
                              <p className="text-sm font-medium text-blue-600 mt-1">= {formatEUR(result.calculationBreakdown.non_eu_calculation.eur_amount)} → {formatSEK(result.calculationBreakdown.non_eu_calculation.sek_amount)}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <p className="text-sm text-gray-600">Gross Calculation:</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{result.calculationBreakdown.gross_calculation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Error calculating payment</p>
                  <p className="text-red-600 text-sm mt-1">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">How Salary Calculation Works</h3>
          <ul className="list-disc pl-5 space-y-1 text-yellow-700 text-sm">
            <li>
              <strong>EU Projects:</strong> Uses cumulative truing — calculates average EUR-SEK rate from project start to today
            </li>
            <li>
              <strong>Non-EU Work:</strong> Uses current month's average ECB rate (no cumulative tracking)
            </li>
            <li>
              <strong>FTE Applied:</strong> Automatically calculated based on staff member's FTE history for the selected month
            </li>
            <li>
              <strong>Payment Formula:</strong> (Cumulative EUR × Cumulative Avg Rate) − Previous Payments = This Month's Payment
            </li>
            <li>
              <strong>Audit Trail:</strong> Click "View Full Calculation Audit Trail" to see the complete step-by-step math
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
