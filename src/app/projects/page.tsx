'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProjectPeriod {
  id?: number;
  period_number: number;
  start_date: string;
  end_date: string;
  description?: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  start_date: string;
  periods: ProjectPeriod[];
  created_at: string;
}

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_date: new Date().toISOString().split('T')[0],
    periods: [{ period_number: 1, start_date: new Date().toISOString().split('T')[0], end_date: '', description: '' }] as ProjectPeriod[]
  });
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingProject ? 'PUT' : 'POST';
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        fetchProjects();
        resetForm();
        router.refresh(); // Refresh the page to update the list
      } else {
        console.error('Error saving project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      start_date: project.start_date,
      periods: project.periods
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this project? This will also delete all related periods and entries.')) {
      try {
        const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (response.ok) {
          fetchProjects();
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      code: '',
      start_date: new Date().toISOString().split('T')[0],
      periods: [{ period_number: 1, start_date: new Date().toISOString().split('T')[0], end_date: '', description: '' }]
    });
  };

  const addPeriod = () => {
    setFormData({
      ...formData,
      periods: [
        ...formData.periods,
        { 
          period_number: Math.max(...formData.periods.map(p => p.period_number), 0) + 1, 
          start_date: new Date().toISOString().split('T')[0], 
          end_date: '', 
          description: '' 
        }
      ]
    });
  };

  const updatePeriod = (index: number, field: keyof ProjectPeriod, value: string | number) => {
    const newPeriods = [...formData.periods];
    (newPeriods[index] as any)[field] = value;
    setFormData({
      ...formData,
      periods: newPeriods
    });
  };

  const removePeriod = (index: number) => {
    if (formData.periods.length > 1) {
      const newPeriods = formData.periods.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        periods: newPeriods
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
          <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
          <p className="text-gray-600 mt-2">
            Add and manage EU projects with periods and start dates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Project name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Short code (e.g., LUMEN)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Project Periods
                      </label>
                      <button
                        type="button"
                        onClick={addPeriod}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Period
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {formData.periods.map((period, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-3">
                              <label className="block text-xs text-gray-500 mb-1">Period #</label>
                              <input
                                type="number"
                                min="1"
                                value={period.period_number}
                                onChange={(e) => updatePeriod(index, 'period_number', parseInt(e.target.value))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="col-span-4">
                              <label className="block text-xs text-gray-500 mb-1">Start</label>
                              <input
                                type="date"
                                value={period.start_date}
                                onChange={(e) => updatePeriod(index, 'start_date', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div className="col-span-4">
                              <label className="block text-xs text-gray-500 mb-1">End</label>
                              <input
                                type="date"
                                value={period.end_date}
                                onChange={(e) => updatePeriod(index, 'end_date', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Leave blank for ongoing"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-2">
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <input
                              type="text"
                              value={period.description || ''}
                              onChange={(e) => updatePeriod(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Period description"
                            />
                          </div>
                          
                          {formData.periods.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePeriod(index)}
                              className="mt-2 text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {editingProject ? 'Update Project' : 'Add Project'}
                    </button>
                    
                    {editingProject && (
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
          
          {/* Projects List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Projects</h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No projects added yet. Start by adding a project above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Periods
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {projects.map((project) => (
                        <tr key={project.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{project.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{project.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{project.start_date}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{project.periods.length}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(project)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(project.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Periods Detail */}
            <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Period Details</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={`periods-${project.id}`} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-800 mb-2">{project.name} ({project.code})</h3>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1 px-2 text-gray-500">Period #</th>
                              <th className="text-left py-1 px-2 text-gray-500">Start Date</th>
                              <th className="text-left py-1 px-2 text-gray-500">End Date</th>
                              <th className="text-left py-1 px-2 text-gray-500">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {project.periods.map((period, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-1 px-2">{period.period_number}</td>
                                <td className="py-1 px-2">{period.start_date || '-'}</td>
                                <td className="py-1 px-2">{period.end_date || 'Ongoing'}</td>
                                <td className="py-1 px-2">{period.description || '-'}</td>
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
