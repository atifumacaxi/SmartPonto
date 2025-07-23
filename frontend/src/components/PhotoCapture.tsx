import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import axios from 'axios';

interface OCRResult {
  photo_path: string;
  extracted_text: string;
  suggested_start_time: string | null;
  suggested_end_time: string | null;
  suggested_date: string | null;
}

const PhotoCapture: React.FC = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeType, setTimeType] = useState<'start' | 'end'>('start');
  const [timeValue, setTimeValue] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [uploadMode, setUploadMode] = useState<'camera' | 'upload'>('camera');
  const [unclosedDates, setUnclosedDates] = useState<string[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchUnclosedEntries = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/time-entries/unclosed`);
      setUnclosedDates(response.data.map((entry: any) => entry.date));
    } catch (err: any) {
      console.error('Error fetching unclosed entries:', err);
    }
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const retake = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setError('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setOcrResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Set the file in the input
      if (fileInputRef.current) {
        fileInputRef.current.files = files;
      }

      // Convert file to base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setOcrResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;

    setLoading(true);
    setError('');

    try {
      let blob: Blob;
      let filename = 'timecard.jpg';

      if (uploadMode === 'upload' && fileInputRef.current?.files?.[0]) {
        // Use the actual uploaded file
        blob = fileInputRef.current.files[0];
        filename = fileInputRef.current.files[0].name;
      } else {
        // Convert base64 to blob for camera captures
        const response = await fetch(capturedImage);
        blob = await response.blob();
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', blob, filename);

      // Upload photo and get OCR result
      const uploadResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/time-entries/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log("DEBUG: Full upload response:", uploadResponse.data);
      setOcrResult(uploadResponse.data);

      // Set suggested date if available
      if (uploadResponse.data.suggested_date) {
        console.log("DEBUG: Received date from backend:", uploadResponse.data.suggested_date);
        // Extract just the date portion (YYYY-MM-DD) from the datetime string
        const dateString = uploadResponse.data.suggested_date.split('T')[0];
        console.log("DEBUG: Setting date to:", dateString);
        setSelectedDate(dateString);
      } else {
        // Default to today if no date found
        console.log("DEBUG: No date found, using today");
        console.log("DEBUG: Available fields:", Object.keys(uploadResponse.data));
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }

      // Set suggested time if available (default to start time)
      if (uploadResponse.data.suggested_start_time) {
        const startDate = new Date(uploadResponse.data.suggested_start_time);
        setTimeValue(startDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }));
        setTimeType('start');
      } else if (uploadResponse.data.suggested_end_time) {
        const endDate = new Date(uploadResponse.data.suggested_end_time);
        setTimeValue(endDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        }));
        setTimeType('end');
      }
    } catch (err: any) {
      let errorMessage = 'Failed to process photo';

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
    } finally {
      setLoading(false);
    }
  };

  const confirmTimeEntry = async () => {
    if (!ocrResult || !timeValue) {
      setError('Please provide a time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create datetime object using selected date and time
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hour, minute] = timeValue.split(':').map(Number);

      // Create a datetime string in local time without timezone conversion
      const dateTimeString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

      // Confirm time entry - only send the selected time type
      const formData = new FormData();
      formData.append('photo_path', ocrResult.photo_path);
      if (timeType === 'start') {
        formData.append('start_time', dateTimeString);
      } else {
        formData.append('end_time', dateTimeString);
      }
      formData.append('extracted_text', ocrResult.extracted_text);

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/time-entries/confirm`,
        formData
      );

      navigate('/dashboard');
    } catch (err: any) {
      let errorMessage = 'Failed to save time entry';

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
    } finally {
      setLoading(false);
    }
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "environment" // Use back camera on mobile
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Capture Time Card</h1>
        <p className="mt-2 text-gray-600">Take a photo of your time card to extract work hours</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {!capturedImage ? (
          <div className="p-6">
            {/* Mode Selection */}
            <div className="mb-6">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setUploadMode('camera')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === 'camera'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Camera
                </button>
                <button
                  onClick={() => setUploadMode('upload')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === 'upload'
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload File
                </button>
              </div>
            </div>

            {uploadMode === 'camera' ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Camera</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Position your time card clearly in the camera view and ensure good lighting
                  </p>
                </div>

                <div className="relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={videoConstraints}
                    className="w-full rounded-lg"
                  />
                  <div className="absolute inset-0 border-4 border-primary-500 border-dashed rounded-lg pointer-events-none"></div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={capture}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Capture Photo
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Image</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Select an image file of your time card (JPG, PNG, etc. - max 10MB)
                  </p>
                </div>

                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <button
                      onClick={triggerFileUpload}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose File
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      or drag and drop an image file here
                    </p>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Captured Photo</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <img
                  src={capturedImage}
                  alt="Captured time card"
                  className="w-full rounded-lg border border-gray-300"
                />
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={retake}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Retake Photo
                  </button>
                  {!ocrResult && (
                    <button
                      onClick={uploadPhoto}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Process Photo'}
                    </button>
                  )}
                </div>
              </div>

              {ocrResult && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Information</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Extracted Text
                      </label>
                      <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-900 min-h-[80px]">
                        {ocrResult.extracted_text || 'No text detected'}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        id="selectedDate"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Type *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="start"
                            checked={timeType === 'start'}
                            onChange={(e) => setTimeType(e.target.value as 'start' | 'end')}
                            className="mr-2 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">Start Time</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="end"
                            checked={timeType === 'end'}
                            onChange={(e) => setTimeType(e.target.value as 'start' | 'end')}
                            className="mr-2 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">End Time</span>
                        </label>
                      </div>
                      {timeType === 'end' && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-xs text-blue-700 mb-2">
                            <strong>Note:</strong> You can only register an end time if you have already registered a start time for this date.
                          </p>
                          <button
                            type="button"
                            onClick={fetchUnclosedEntries}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Check for unclosed start times
                          </button>
                          {unclosedDates.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-blue-700 font-medium">Unclosed start times for:</p>
                              <ul className="text-xs text-blue-600 mt-1">
                                {unclosedDates.map((date, index) => (
                                  <li key={index} className="cursor-pointer hover:text-blue-800"
                                      onClick={() => setSelectedDate(date.split('T')[0])}>
                                    {new Date(date).toLocaleDateString()} - Click to select
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {timeType === 'start' && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-xs text-green-700">
                            <strong>Note:</strong> Register your start time. You can add an end time later to complete your work session.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="timeValue" className="block text-sm font-medium text-gray-700 mb-2">
                        Time *
                      </label>
                      <input
                        type="time"
                        id="timeValue"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <button
                      onClick={confirmTimeEntry}
                      disabled={loading || !timeValue}
                      className="w-full px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : `Confirm ${timeType === 'start' ? 'Start Time' : 'End Time'}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapture;
