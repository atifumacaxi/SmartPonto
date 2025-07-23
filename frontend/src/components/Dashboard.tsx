import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ManualTimeEntry from './ManualTimeEntry';
import AdminDashboard from './AdminDashboard';
import BossTimeEntries from './BossTimeEntries';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

interface DailySummary {
  date: string;
  total_hours: number;
  entries_count: number;
}

interface MonthlySummary {
  month: string;
  year: number;
  total_hours: number;
  total_days: number;
  daily_breakdown: DailySummary[];
}

interface MonthlyTargetWithProgress {
  target: {
    id: number;
    year: number;
    month: number;
    start_day: number;
    end_day: number;
    target_hours: number;
  };
  current_hours: number;
  remaining_hours: number;
  progress_percentage: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { canViewAdminDashboard, hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entries'>('dashboard');
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [currentTarget, setCurrentTarget] = useState<MonthlyTargetWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchMonthlySummary();
    fetchCurrentTarget();
  }, [selectedYear, selectedMonth]);

  const fetchMonthlySummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/time-entries/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      setMonthlySummary(response.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load monthly summary');
      console.error('Error fetching monthly summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTarget = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/monthly-targets/${selectedYear}/${selectedMonth}`);
      setCurrentTarget(response.data);
    } catch (err: any) {
      // No target set for selected month is not an error
      if (err.response?.status !== 404) {
        console.error('Error fetching target:', err);
      }
      setCurrentTarget(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Debug logs
  console.log('Dashboard Debug:', {
    user: user,
    canViewAdminDashboard,
    hasPermission: hasPermission('view_all_time_entries'),
    permissions: usePermissions()
  });

  // If user can view admin dashboard, show it with tabs
  if (canViewAdminDashboard) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="mt-2 text-gray-600">Gerencie usuários e visualize dados da equipe</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumo Geral
            </button>
            {hasPermission('view_all_time_entries') && (
              <button
                onClick={() => setActiveTab('entries')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'entries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Visualizar Entradas
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'entries' && hasPermission('view_all_time_entries') && <BossTimeEntries />}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Track your work hours and productivity</p>
      </div>

      {/* Manual Time Entry Component */}
      <ManualTimeEntry
        onEntryAdded={() => {
          fetchMonthlySummary();
          fetchCurrentTarget();
        }}
        onClose={() => {}}
      />

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/capture"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Capture Photo
            </Link>
            <button
              onClick={() => {
                // This will be handled by the ManualTimeEntry component
                const addButton = document.querySelector('[title="Add Manual Time Entry"]') as HTMLButtonElement;
                if (addButton) addButton.click();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Manual Entry
            </button>
            <Link
              to="/profile"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              View Profile
            </Link>
            <Link
              to="/entries"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View Entries
            </Link>
          </div>
        </div>
      </div>

      {/* Monthly Target Progress */}
      {currentTarget && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Target Progress - {monthNames[currentTarget.target.month - 1]} {currentTarget.target.year}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Custom Range: {new Date(currentTarget.target.year, currentTarget.target.month - 1, currentTarget.target.start_day).toLocaleDateString()} to {new Date(currentTarget.target.year, currentTarget.target.month - 1, currentTarget.target.end_day).toLocaleDateString()}
                </p>
              </div>
              <Link
                to="/targets"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Manage Targets →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
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
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${currentTarget.progress_percentage}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 text-center">
              {currentTarget.progress_percentage.toFixed(1)}% Complete
            </div>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Summary</h2>
            <div className="flex space-x-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>
                    {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {monthlySummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Total Hours</p>
                    <p className="text-2xl font-semibold text-blue-900">{formatHours(monthlySummary.total_hours)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Work Days</p>
                    <p className="text-2xl font-semibold text-green-900">{monthlySummary.total_days}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Average/Day</p>
                    <p className="text-2xl font-semibold text-purple-900">
                      {monthlySummary.total_days > 0 ? formatHours(monthlySummary.total_hours / monthlySummary.total_days) : '0h 0m'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown */}
      {monthlySummary && monthlySummary.daily_breakdown.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Daily Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours Worked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entries
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlySummary.daily_breakdown.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(day.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(day.total_hours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.entries_count} {day.entries_count === 1 ? 'entry' : 'entries'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {monthlySummary && monthlySummary.daily_breakdown.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No time entries</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by capturing your first time entry.
          </p>
          <div className="mt-6">
            <Link
              to="/capture"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Capture Photo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
