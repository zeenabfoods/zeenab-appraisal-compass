
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <LayoutGuard>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Index />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/employee-questions"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <EmployeeQuestions />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/appraisal-cycles"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <AppraisalCycles />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/training"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <TrainingDashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <NotFound />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </LayoutGuard>
            <Toaster />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
