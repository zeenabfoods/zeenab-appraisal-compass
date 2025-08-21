
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LayoutGuard } from '@/components/LayoutGuard';
import Auth from '@/pages/Auth';
import Index from '@/pages/Index';
import EmployeeQuestions from '@/pages/EmployeeQuestions';
import AppraisalCycles from '@/pages/AppraisalCycles';
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
                      <Route path="/" element={<Index />} />
                      <Route path="/employee-questions" element={<EmployeeQuestions />} />
                      <Route path="/appraisal-cycles" element={<AppraisalCycles />} />
                      
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
