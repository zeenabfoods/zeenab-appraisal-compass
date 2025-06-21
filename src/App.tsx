import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Dashboard } from "@/components/Dashboard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MyAppraisals from "./pages/MyAppraisals";
import AppraisalCycles from "./pages/AppraisalCycles";
import QuestionTemplates from "./pages/QuestionTemplates";
import DepartmentManagement from "./pages/DepartmentManagement";
import EmployeeManagement from "./pages/EmployeeManagement";
import CompanyReports from "./pages/CompanyReports";
import EmployeeQuestions from "./pages/EmployeeQuestions";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard/*" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="appraisals" element={<MyAppraisals />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="history" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance History</h2>
                      <p className="text-gray-600">Performance history tracking coming soon...</p>
                    </div>
                  } />
                  <Route path="settings" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
                      <p className="text-gray-600">User settings panel coming soon...</p>
                    </div>
                  } />
                  <Route path="team" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Overview</h2>
                      <p className="text-gray-600">Team management dashboard coming soon...</p>
                    </div>
                  } />
                  <Route path="reviews" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Appraisals</h2>
                      <p className="text-gray-600">Appraisal review system coming soon...</p>
                    </div>
                  } />
                  <Route path="analytics" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Team Analytics</h2>
                      <p className="text-gray-600">Advanced analytics dashboard coming soon...</p>
                    </div>
                  } />
                  <Route path="employees" element={<EmployeeManagement />} />
                  <Route path="departments" element={<DepartmentManagement />} />
                  <Route path="employee-questions" element={<EmployeeQuestions />} />
                  <Route path="templates" element={<QuestionTemplates />} />
                  <Route path="cycles" element={<AppraisalCycles />} />
                  <Route path="reports" element={<CompanyReports />} />
                  <Route path="executive" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Overview</h2>
                      <p className="text-gray-600">Executive dashboard coming soon...</p>
                    </div>
                  } />
                  <Route path="config" element={
                    <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-8 text-center shadow-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">System Configuration</h2>
                      <p className="text-gray-600">System configuration panel coming soon...</p>
                    </div>
                  } />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
