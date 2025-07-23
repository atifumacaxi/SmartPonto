import React, { useState } from 'react';
import axios from 'axios';

// Manual Time Entry Component - Force rebuild for Vercel deployment
// Cache bust: 2025-07-18 23:59 - Force Vercel to rebuild
// Cache bust: 2025-07-19 00:05 - Added alternative button for better visibility
interface ManualTimeEntryProps {
  onEntryAdded: () => void;
  onClose: () => void;
}

interface TimeEntryData {
  date: string;
  start_time: string;
  end_time: string;
}

const ManualTimeEntry: React.FC<ManualTimeEntryProps> = ({ onEntryAdded, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [entryData, setEntryData] = useState<TimeEntryData>({
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00'
  });

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create start time entry
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/time-entries/manual`,
        {
          date: entryData.date,
          start_time: entryData.start_time,
          end_time: null
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Create end time entry
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/time-entries/manual`,
        {
          date: entryData.date,
          start_time: null,
          end_time: entryData.end_time
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      setSuccess('Time entry added successfully!');
      onEntryAdded();

      // Reset form
      setEntryData({
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00'
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        onClose();
      }, 2000);

    } catch (err: any) {
      let errorMessage = 'Failed to add time entry';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = () => {
    const start = new Date(`2000-01-01T${entryData.start_time}`);
    const end = new Date(`2000-01-01T${entryData.end_time}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 0 ? diffHours.toFixed(2) : '0.00';
  };

  const isDateInFuture = () => {
    const selectedDate = new Date(entryData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate > today;
  };

  return (
    <>
      {/* Quick Add Button - Floating */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 transform hover:scale-110 z-[9999] border-2 border-white"
        title="Add Manual Time Entry"
        style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Alternative Button - Inline */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg" style={{ display: 'block !important' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Manual Time Entry</h3>
            <p className="text-xs text-yellow-600">Add past time entries manually</p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ display: 'inline-block !important' }}
          >
            Add Entry
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Manual Time Entry</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={entryData.date}
                    onChange={(e) => setEntryData({ ...entryData, date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                  {isDateInFuture() && (
                    <p className="mt-1 text-sm text-amber-600">
                      ⚠️ You're selecting a future date
                    </p>
                  )}
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={entryData.start_time}
                      onChange={(e) => setEntryData({ ...entryData, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={entryData.end_time}
                      onChange={(e) => setEntryData({ ...entryData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Hours Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Hours:</span>
                    <span className="text-lg font-semibold text-primary-600">
                      {calculateHours()} hours
                    </span>
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                {success && (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="text-sm text-green-700">{success}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding...
                      </div>
                    ) : (
                      'Add Entry'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManualTimeEntry;
