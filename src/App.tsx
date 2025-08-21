import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LayoutGuard } from '@/components/LayoutGuard';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import EmployeeQuestionManagerPage from '@/pages/EmployeeQuestionManagerPage';
import AppraisalCyclesPage from '@/pages/AppraisalCyclesPage';
import PerformanceAnalyticsPage from '@/pages/PerformanceAnalyticsPage';
import NotFound from '@/pages/NotFound';
import TrainingDashboard from '@/pages/TrainingDashboard';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <LayoutGuard>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/employee-question-manager" element={<EmployeeQuestionManagerPage />} />
                      <Route path="/appraisal-cycles" element={<AppraisalCyclesPage />} />
                      <Route path="/performance-analytics" element={<PerformanceAnalyticsPage />} />
                      
                      {/* New Training Module Route - Isolated */}
                      <Route path="/training" element={<TrainingDashboard />} />
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </LayoutGuard>
        <Toaster />
      </div>
    </AuthProvider>
  );
}

export default App;
