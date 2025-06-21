
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
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
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Outlet />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Index />} />
                <Route path="employee-management" element={<EmployeeManagement />} />
                <Route path="department-management" element={<DepartmentManagement />} />
                <Route path="question-templates" element={<QuestionTemplates />} />
                <Route path="employee-questions" element={<EmployeeQuestions />} />
                <Route path="appraisal-cycles" element={<AppraisalCycles />} />
                <Route path="my-appraisals" element={<MyAppraisals />} />
                <Route path="manager-appraisals" element={<ManagerAppraisals />} />
                <Route path="company-reports" element={<CompanyReports />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
