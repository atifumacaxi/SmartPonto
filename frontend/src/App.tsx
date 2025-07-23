import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import PhotoCapture from './components/PhotoCapture';
import Profile from './components/Profile';
import MonthlyTargets from './components/MonthlyTargets';
import TimeEntries from './components/TimeEntries';
import Navbar from './components/Navbar';
import { useAuth } from './contexts/AuthContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <div>
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                  <Dashboard />
                </main>
              </div>
            </PrivateRoute>
          } />
          <Route path="/capture" element={
            <PrivateRoute>
              <div>
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                  <PhotoCapture />
                </main>
              </div>
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <div>
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                  <Profile />
                </main>
              </div>
            </PrivateRoute>
          } />
          <Route path="/targets" element={
            <PrivateRoute>
              <div>
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                  <MonthlyTargets />
                </main>
              </div>
            </PrivateRoute>
          } />
          <Route path="/entries" element={
            <PrivateRoute>
              <div>
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                  <TimeEntries />
                </main>
              </div>
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
