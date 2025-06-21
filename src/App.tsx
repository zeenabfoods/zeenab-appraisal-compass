
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EmployeeManagement from "./pages/EmployeeManagement";
import DepartmentManagement from "./pages/DepartmentManagement";
import QuestionTemplates from "./pages/QuestionTemplates";
import EmployeeQuestions from "./pages/EmployeeQuestions";
import AppraisalCycles from "./pages/AppraisalCycles";
import MyAppraisals from "./pages/MyAppraisals";
import ManagerAppraisals from "./pages/ManagerAppraisals";
import CompanyReports from "./pages/CompanyReports";
import Committee from "./pages/Committee";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Index />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/employee-management" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EmployeeManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/department-management" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DepartmentManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/question-templates" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <QuestionTemplates />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/employee-questions" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EmployeeQuestions />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/appraisal-cycles" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AppraisalCycles />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/my-appraisals" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MyAppraisals />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/manager-appraisals" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ManagerAppraisals />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/company-reports" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CompanyReports />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/committee" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Committee />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Notifications />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
