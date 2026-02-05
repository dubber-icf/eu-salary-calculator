'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Staff {
  id: number;
  name: string;
  email?: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  periods: any[];
}

interface Payment {
  id: number;
  staff_id: number;
  year: number;
  month: number;
  gross_sek: number;
  created_at: string;
}

export default function Home() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, projectsRes, paymentsRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/projects'),
        fetch('/api/payments?limit=10')
      ]);
      
      const staffData = await staffRes.json();
      const projectsData = await projectsRes.json();
      const paymentsData = await paymentsRes.json();
      
      setStaff(staffData);
      setProjects(projectsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">EU Salary Calculator</h1>
          <p className="text-gray-600 mt-2">
            Calculate EU project staff salaries with cumulative truing logic
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Staff</h3>
            <p className="text-3xl font-bold text-blue-600">{staff.length}</p>
            <p className="text-gray-500 text-sm mt-2">Active staff members</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Projects</h3>
            <p className="text-3xl font-bold text-green-600">{projects.length}</p>
            <p className="text-gray-500 text-sm mt-2">EU projects with periods</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Payments</h3>
            <p className="text-3xl font-bold text-purple-600">{payments.length}</p>
            <p className="text-gray-500 text-sm mt-2">Calculated payments</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link 
              href="/staff" 
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="text-blue-600 font-medium">Add Staff</div>
              <div className="text-gray-500 text-sm mt-1">Add new staff member</div>
            </Link>
            
            <Link 
              href="/projects" 
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="text-green-600 font-medium">Add Project</div>
              <div className="text-gray-500 text-sm mt-1">Create new EU project</div>
            </Link>
            
            <Link 
              href="/entries" 
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="text-purple-600 font-medium">Enter Timesheet</div>
              <div className="text-gray-500 text-sm mt-1">Record monthly work</div>
            </Link>
            
            <Link 
              href="/calculate" 
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="text-orange-600 font-medium">Calculate Salary</div>
              <div className="text-gray-500 text-sm mt-1">Run salary calculation</div>
            </Link>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Recent Payments</h2>
          </div>
          
          {payments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No payments calculated yet. Start by adding staff and projects.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gross Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calculated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => {
                    const staffMember = staff.find(s => s.id === payment.staff_id);
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {staffMember?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payment.year}-{String(payment.month).padStart(2, '0')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatSEK(payment.gross_sek)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payment.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">How It Works</h3>
          <ul className="list-disc pl-5 space-y-2 text-blue-700">
            <li>
              <strong>Cumulative Truing:</strong> EU project payments use cumulative average rates from project start
            </li>
            <li>
              <strong>Non-EU Work:</strong> Uses current month's ECB rate (no cumulative tracking)
            </li>
            <li>
              <strong>Audit Trail:</strong> Every calculation includes full breakdown for accountants
            </li>
            <li>
              <strong>Quarter-Day Precision:</strong> Time entries support 0.25, 0.5, 0.75, 1.0 day increments
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
