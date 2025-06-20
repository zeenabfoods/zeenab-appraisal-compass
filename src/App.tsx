
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
                  <Route path="notifications" element={<div className="text-center py-8">Notifications page coming soon...</div>} />
                  <Route path="history" element={<div className="text-center py-8">Performance History page coming soon...</div>} />
                  <Route path="settings" element={<div className="text-center py-8">Settings page coming soon...</div>} />
                  <Route path="team" element={<div className="text-center py-8">Team Overview page coming soon...</div>} />
                  <Route path="reviews" element={<div className="text-center py-8">Review Appraisals page coming soon...</div>} />
                  <Route path="analytics" element={<div className="text-center py-8">Team Analytics page coming soon...</div>} />
                  <Route path="employees" element={<div className="text-center py-8">Employee Management page coming soon...</div>} />
                  <Route path="templates" element={<QuestionTemplates />} />
                  <Route path="cycles" element={<AppraisalCycles />} />
                  <Route path="reports" element={<div className="text-center py-8">Company Reports page coming soon...</div>} />
                  <Route path="executive" element={<div className="text-center py-8">Executive Overview page coming soon...</div>} />
                  <Route path="config" element={<div className="text-center py-8">System Configuration page coming soon...</div>} />
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
