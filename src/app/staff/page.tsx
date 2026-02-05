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
  created_at: string;
}

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    fte_history: [{ from_date: new Date().toISOString().split('T')[0], to_date: null, percentage: 1.0 }]
  });
  const router = useRouter();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      setStaffList(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingStaff ? 'PUT' : 'POST';
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        fetchStaff();
        resetForm();
        router.refresh(); // Refresh the page to update the list
      } else {
        console.error('Error saving staff');
      }
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email || '',
      fte_history: staff.fte_history
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
        if (response.ok) {
          fetchStaff();
        }
      } catch (error) {
        console.error('Error deleting staff:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      fte_history: [{ from_date: new Date().toISOString().split('T')[0], to_date: null, percentage: 1.0 }]
    });
  };

  const addFTEHistory = () => {
    setFormData({
      ...formData,
      fte_history: [
        ...formData.fte_history,
        { from_date: new Date().toISOString().split('T')[0], to_date: null, percentage: 1.0 }
      ]
    });
  };

  const updateFTEHistory = (index: number, field: string, value: string | number | null) => {
    const newFTEHistory = [...formData.fte_history];
    (newFTEHistory[index] as any)[field] = value;
    setFormData({
      ...formData,
      fte_history: newFTEHistory
    });
  };

  const removeFTEHistory = (index: number) => {
    if (formData.fte_history.length > 1) {
      const newFTEHistory = formData.fte_history.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        fte_history: newFTEHistory
      });
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-2">
            Add and manage staff members with FTE history
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {editingStaff ? 'Edit Staff' : 'Add New Staff'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        FTE History
                      </label>
                      <button
                        type="button"
                        onClick={addFTEHistory}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Period
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.fte_history.map((fte, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-5">
                              <label className="block text-xs text-gray-500 mb-1">From</label>
                              <input
                                type="date"
                                value={fte.from_date}
                                onChange={(e) => updateFTEHistory(index, 'from_date', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="col-span-5">
                              <label className="block text-xs text-gray-500 mb-1">To</label>
                              <input
                                type="date"
                                value={fte.to_date || ''}
                                onChange={(e) => updateFTEHistory(index, 'to_date', e.target.value || null)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Leave blank for ongoing"
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">%</label>
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                value={fte.percentage}
                                onChange={(e) => updateFTEHistory(index, 'percentage', parseFloat(e.target.value))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          
                          {formData.fte_history.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFTEHistory(index)}
                              className="mt-2 text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Enter FTE percentages as decimals (e.g., 0.6 for 60%, 1.0 for 100%)
                    </p>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {editingStaff ? 'Update Staff' : 'Add Staff'}
                    </button>
                    
                    {editingStaff && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          {/* Staff List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Staff Members</h2>
              </div>
              
              {staffList.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No staff members added yet. Start by adding a staff member above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current FTE
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staffList.map((staff) => {
                        const currentFTE = staff.fte_history
                          .filter(fte => !fte.to_date || new Date(fte.to_date) >= new Date())
                          .reduce((sum, fte) => sum + fte.percentage, 0);
                        
                        return (
                          <tr key={staff.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{staff.email || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{(currentFTE * 100).toFixed(0)}%</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleEdit(staff)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(staff.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* FTE History Detail */}
            <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">FTE History Details</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {staffList.map((staff) => (
                    <div key={`history-${staff.id}`} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-800 mb-2">{staff.name}</h3>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 px-2 text-gray-500">From</th>
                              <th className="text-left py-1 px-2 text-gray-500">To</th>
                              <th className="text-left py-1 px-2 text-gray-500">FTE %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staff.fte_history.map((fte, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-1 px-2">{fte.from_date}</td>
                                <td className="py-1 px-2">{fte.to_date || 'Present'}</td>
                                <td className="py-1 px-2">{(fte.percentage * 100).toFixed(0)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
