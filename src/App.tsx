
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ManagerAppraisals from "./pages/ManagerAppraisals";
import MyAppraisals from "./pages/MyAppraisals";
import EmployeeManagement from "./pages/EmployeeManagement";
import DepartmentManagement from "./pages/DepartmentManagement";
import AppraisalCycles from "./pages/AppraisalCycles";
import QuestionTemplates from "./pages/QuestionTemplates";
import EmployeeQuestions from "./pages/EmployeeQuestions";
import EmployeeQuestionsView from "./pages/EmployeeQuestionsView";
import Committee from "./pages/Committee";
import CompanyReports from "./pages/CompanyReports";
import Notifications from "./pages/Notifications";
import AppraisalPage from "./pages/AppraisalPage";
import NewAppraisalPage from "./pages/NewAppraisalPage";
import NotFound from "./pages/NotFound";

// Create QueryClient with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/manager-appraisals" element={<ProtectedRoute><ManagerAppraisals /></ProtectedRoute>} />
                <Route path="/my-appraisals" element={<ProtectedRoute><MyAppraisals /></ProtectedRoute>} />
                <Route path="/appraisal/new" element={<ProtectedRoute><NewAppraisalPage /></ProtectedRoute>} />
                <Route path="/appraisal/:id" element={<ProtectedRoute><AppraisalPage /></ProtectedRoute>} />
                <Route path="/employee-management" element={<ProtectedRoute><EmployeeManagement /></ProtectedRoute>} />
                <Route path="/department-management" element={<ProtectedRoute><DepartmentManagement /></ProtectedRoute>} />
                <Route path="/appraisal-cycles" element={<ProtectedRoute><AppraisalCycles /></ProtectedRoute>} />
                <Route path="/question-templates" element={<ProtectedRoute><QuestionTemplates /></ProtectedRoute>} />
                <Route path="/employee-questions" element={<ProtectedRoute><EmployeeQuestions /></ProtectedRoute>} />
                <Route path="/employee-questions/:employeeId" element={<ProtectedRoute><EmployeeQuestionsView /></ProtectedRoute>} />
                <Route path="/committee" element={<ProtectedRoute><Committee /></ProtectedRoute>} />
                <Route path="/company-reports" element={<ProtectedRoute><CompanyReports /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
