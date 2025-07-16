import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface MonthlyTarget {
  id: number;
  year: number;
  month: number;
  target_hours: number;
  created_at: string;
  updated_at?: string;
}

interface MonthlyTargetWithProgress {
  target: MonthlyTarget;
  current_hours: number;
  remaining_hours: number;
  progress_percentage: number;
}

const MonthlyTargets: React.FC = () => {
  const [targets, setTargets] = useState<MonthlyTarget[]>([]);
  const [currentTarget, setCurrentTarget] = useState<MonthlyTargetWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MonthlyTarget | null>(null);

  // Form states
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [targetHours, setTargetHours] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchTargets();
    fetchCurrentTarget();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/monthly-targets/`);
      setTargets(response.data);
    } catch (err: any) {
      console.error('Error fetching targets:', err);
    }
  };

  const fetchCurrentTarget = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/monthly-targets/current`);
      setCurrentTarget(response.data);
    } catch (err: any) {
      // No target set for current month is not an error
      if (err.response?.status !== 404) {
        console.error('Error fetching current target:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/monthly-targets/`, {
        year: parseInt(year.toString()),
        month: parseInt(month.toString()),
        target_hours: parseFloat(targetHours)
      });

      setShowCreateForm(false);
      setYear(new Date().getFullYear());
      setMonth(new Date().getMonth() + 1);
      setTargetHours('');

      fetchTargets();
      fetchCurrentTarget();
    } catch (err: any) {
      let errorMessage = 'Failed to create target';

      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (Array.isArray(err.response.data)) {
          errorMessage = err.response.data.map((e: any) => e.msg || e.message || 'Validation error').join(', ');
        }
      }

      setError(errorMessage);
    }
  };

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingTarget) return;

    try {
      await axios.put(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/monthly-targets/${editingTarget.id}`, {
        target_hours: parseFloat(targetHours)
      });

      setEditingTarget(null);
      setTargetHours('');

      fetchTargets();
      fetchCurrentTarget();
    } catch (err: any) {
      let errorMessage = 'Failed to update target';

      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (Array.isArray(err.response.data)) {
          errorMessage = err.response.data.map((e: any) => e.msg || e.message || 'Validation error').join(', ');
        }
      }

      setError(errorMessage);
    }
  };

  const handleDeleteTarget = async (targetId: number) => {
    if (!window.confirm('Are you sure you want to delete this target?')) return;

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/monthly-targets/${targetId}`);
      fetchTargets();
      fetchCurrentTarget();
    } catch (err: any) {
      let errorMessage = 'Failed to delete target';

      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (Array.isArray(err.response.data)) {
          errorMessage = err.response.data.map((e: any) => e.msg || e.message || 'Validation error').join(', ');
        }
      }

      setError(errorMessage);
    }
  };

  const startEdit = (target: MonthlyTarget) => {
    setEditingTarget(target);
    setTargetHours(target.target_hours.toString());
  };

  const cancelEdit = () => {
    setEditingTarget(null);
    setTargetHours('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Monthly Work Targets</h1>
        <p className="mt-2 text-gray-600">Set and track your monthly work hour goals</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Current Month Progress */}
      {currentTarget && (
        <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Month Progress - {monthNames[currentTarget.target.month - 1]} {currentTarget.target.year}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{currentTarget.current_hours}h</div>
              <div className="text-sm text-gray-600">Hours Worked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentTarget.target.target_hours}h</div>
              <div className="text-sm text-gray-600">Target Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{currentTarget.remaining_hours}h</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-primary-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${currentTarget.progress_percentage}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 text-center">
            {currentTarget.progress_percentage.toFixed(1)}% Complete
          </div>
        </div>
      )}

      {/* Create New Target */}
      <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Target</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {showCreateForm ? 'Cancel' : 'Add Target'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateTarget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {monthNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., 160"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Create Target
              </button>
            </div>
          </form>
        )}
      </div>

      {/* All Targets */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Targets</h2>

        {targets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No targets set yet. Create your first target above!</p>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => (
              <div key={target.id} className="border border-gray-200 rounded-lg p-4">
                {editingTarget?.id === target.id ? (
                  <form onSubmit={handleUpdateTarget} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">
                          {monthNames[target.month - 1]} {target.year}
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={targetHours}
                          onChange={(e) => setTargetHours(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          required
                        />
                        <span className="text-sm text-gray-600">hours</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {monthNames[target.month - 1]} {target.year}
                      </span>
                      <span className="ml-4 text-gray-600">{target.target_hours} hours</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(target)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTarget(target.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyTargets;
