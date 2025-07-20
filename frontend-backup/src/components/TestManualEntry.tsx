import React from 'react';

const TestManualEntry: React.FC = () => {
  return (
    <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
      <h3 className="text-lg font-bold text-red-800">TEST: Manual Entry Component</h3>
      <p className="text-red-600">If you can see this, the component is loading!</p>
      <button
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md mt-2"
        onClick={() => alert('Manual Entry Test Button Works!')}
      >
        Test Button
      </button>
    </div>
  );
};

export default TestManualEntry;
