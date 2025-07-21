
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Employees from '@/pages/Employees';
import Questions from '@/pages/Questions';
import AppraisalCycles from '@/pages/AppraisalCycles';
import Settings from '@/pages/Settings';
import EmployeeAppraisal from '@/pages/EmployeeAppraisal';
import ManagerAppraisals from '@/pages/ManagerAppraisals';
import Committee from '@/pages/Committee';
import HRAppraisals from '@/pages/HRAppraisals';
import Profile from '@/pages/Profile';
import MyAppraisals from '@/pages/MyAppraisals';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  console.log('🔍 HEADER AUDIT: App.tsx rendering - should show ONLY ONE header via DashboardLayout');

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <Employees />
                </ProtectedRoute>
              } />
              <Route path="/questions" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <Questions />
                </ProtectedRoute>
              } />
              <Route path="/appraisal-cycles" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <AppraisalCycles />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/appraisal/:appraisalId" element={
                <ProtectedRoute>
                  <EmployeeAppraisal />
                </ProtectedRoute>
              } />
              <Route path="/manager-appraisals" element={
                <ProtectedRoute allowedRoles={['manager', 'hr', 'admin']}>
                  <ManagerAppraisals />
                </ProtectedRoute>
              } />
              <Route path="/committee" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <Committee />
                </ProtectedRoute>
              } />
              <Route path="/hr-appraisals" element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <HRAppraisals />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/my-appraisals" element={
                <ProtectedRoute>
                  <MyAppraisals />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
