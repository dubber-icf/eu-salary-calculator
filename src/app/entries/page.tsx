'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Staff {
  id: number;
  name: string;
  email?: string;
  fte_history: {
    from_date: string;
    to_date: string | null;
    percentage: number;
  }[];
}

interface Project {
  id: number;
  name: string;
  code: string;
  start_date: string;
  periods: {
    id: number;
    period_number: number;
    start_date: string;
    end_date: string;
    description?: string;
  }[];
}

interface ProjectAllocation {
  project_id: number;
  period_number: number;
  days: number;
}

interface MonthlyEntry {
  id: number;
  staff_id: number;
  year: number;
  month: number;
  project_allocations: ProjectAllocation[];
  non_eu_days: number;
  created_at: string;
  updated_at: string;
}

export default function EntriesPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([{ project_id: 0, period_number: 1, days: 0 }]);
  const [nonEUDays, setNonEUDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<MonthlyEntry | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStaff && selectedYear && selectedMonth) {
      loadExistingEntry();
    }
  }, [selectedStaff, selectedYear, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, projectsRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/projects')
      ]);
      
      const staffData = await staffRes.json();
      const projectsData = await projectsRes.json();
      
      setStaff(staffData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingEntry = async () => {
    if (!selectedStaff) return;
    
    try {
      const response = await fetch(`/api/entries?staffId=${selectedStaff}&year=${selectedYear}&month=${selectedMonth}`);
      const entries = await response.json();
      
      if (entries.length > 0) {
        const entry = entries[0];
        setCurrentEntry(entry);
        setProjectAllocations(entry.project_allocations);
        setNonEUDays(entry.non_eu_days || 0);
      } else {
        setCurrentEntry(null);
        setProjectAllocations([{ project_id: 0, period_number: 1, days: 0 }]);
        setNonEUDays(0);
      }
    } catch (error) {
      console.error('Error loading existing entry:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedStaff) {
      alert('Please select a staff member');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff,
          year: selectedYear,
          month: selectedMonth,
          project_allocations: projectAllocations,
          non_eu_days: nonEUDays
        })
      });
      
      if (response.ok) {
        alert('Entry saved successfully!');
        loadExistingEntry(); // Reload the entry to update the current entry state
      } else {
        const error = await response.json();
        alert(`Error saving entry: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving entry');
    } finally {
      setSaving(false);
    }
  };

  const addAllocation = () => {
    setProjectAllocations([...projectAllocations, { project_id: 0, period_number: 1, days: 0 }]);
  };

  const updateAllocation = (index: number, field: keyof ProjectAllocation, value: number) => {
    const newAllocations = [...projectAllocations];
    (newAllocations[index] as any)[field] = value;
    setProjectAllocations(newAllocations);
  };

  const removeAllocation = (index: number) => {
    if (projectAllocations.length > 1) {
      const newAllocations = projectAllocations.filter((_, i) => i !== index);
      setProjectAllocations(newAllocations);
    }
  };

  const getEligibleDaysInMonth = (month: number): number => {
    return month === 2 ? 17 : 18; // February has 17 eligible days, others have 18
  };

  const eligibleDays = getEligibleDaysInMonth(selectedMonth);

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Monthly Timesheet Entry</h1>
          <p className="text-gray-600 mt-2">
            Record monthly work distribution across EU projects and non-EU days
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Staff and Period</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </div>

        {selectedStaff && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Timesheet for {staff.find(s => s.id === selectedStaff)?.name} - {selectedYear} {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })}
                </h2>
                
                {currentEntry && (
                  <span className="text-sm text-green-600">
                    Last updated: {new Date(currentEntry.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
              
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Eligible days for this month:</strong> {eligibleDays} days
                  {selectedMonth === 2 && " (February)"}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Total days entered should not exceed {eligibleDays} days
                </p>
              </div>
              
              {/* Project Allocations */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">EU Project Allocations</h3>
                  <button
                    type="button"
                    onClick={addAllocation}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Project Allocation
                  </button>
                </div>
                
                <div className="space-y-4">
                  {projectAllocations.map((allocation, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                          <select
                            value={allocation.project_id}
                            onChange={(e) => updateAllocation(index, 'project_id', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="0">Select project...</option>
                            {projects.map(project => (
                              <option key={project.id} value={project.id}>{project.code} - {project.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                          <select
                            value={allocation.period_number}
                            onChange={(e) => updateAllocation(index, 'period_number', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!allocation.project_id}
                          >
                            {allocation.project_id 
                              ? projects
                                  .find(p => p.id === allocation.project_id)
                                  ?.periods.map(period => (
                                    <option key={period.period_number} value={period.period_number}>
                                      {period.period_number}: {period.description || `Period ${period.period_number}`}
                                    </option>
                                  ))
                              : <option value="1">Select project first</option>}
                          </select>
                        </div>
                        
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Days (<span className="text-gray-500">max {eligibleDays}</span>)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={eligibleDays}
                            step="0.25"
                            value={allocation.days}
                            onChange={(e) => updateAllocation(index, 'days', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Days worked"
                          />
                        </div>
                        
                        <div className="md:col-span-1 flex items-end">
                          {projectAllocations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAllocation(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Non-EU Days */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Non-EU Days</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Non-EU Days (<span className="text-gray-500">max {eligibleDays}</span>)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={eligibleDays}
                      step="0.25"
                      value={nonEUDays}
                      onChange={(e) => setNonEUDays(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Days worked"
                    />
                  </div>
                  
                  <div className="md:col-span-4 flex items-end">
                    <div className="text-sm text-gray-600">
                      <p>Non-EU work uses current month's ECB rate (no cumulative truing)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Summary</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total EU Days:</p>
                    <p className="font-medium">{projectAllocations.reduce((sum, a) => sum + a.days, 0).toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Non-EU Days:</p>
                    <p className="font-medium">{nonEUDays.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Total Days:</p>
                    <p className="font-medium">{(projectAllocations.reduce((sum, a) => sum + a.days, 0) + nonEUDays).toFixed(2)}</p>
                  </div>
                </div>
                
                {projectAllocations.reduce((sum, a) => sum + a.days, 0) + nonEUDays > eligibleDays && (
                  <div className="mt-3 p-2 bg-red-100 text-red-700 rounded text-sm">
                    Warning: Total days ({(projectAllocations.reduce((sum, a) => sum + a.days, 0) + nonEUDays).toFixed(2)}) exceeds eligible days ({eligibleDays})
                  </div>
                )}
              </div>
              
              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Timesheet'}
                </button>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Instructions</h3>
              <ul className="list-disc pl-5 space-y-1 text-yellow-700 text-sm">
                <li>Enter days worked on each EU project for this month</li>
                <li>Use quarter-day precision (0.25, 0.5, 0.75, 1.0, etc.)</li>
                <li>Total EU + Non-EU days should not exceed eligible days for the month</li>
                <li>Non-EU work uses current month's ECB rate, EU projects use cumulative truing</li>
                <li>Changes are saved immediately when you click "Save Timesheet"</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}