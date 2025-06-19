
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
                  <Route path="tasks" element={<div className="text-center py-8">Tasks page coming soon...</div>} />
                  <Route path="calendar" element={<div className="text-center py-8">Calendar page coming soon...</div>} />
                  <Route path="settings" element={<div className="text-center py-8">Settings page coming soon...</div>} />
                  <Route path="help" element={<div className="text-center py-8">Help & Center page coming soon...</div>} />
                  <Route path="performance" element={<div className="text-center py-8">Performance page coming soon...</div>} />
                  <Route path="payrolls" element={<div className="text-center py-8">Payrolls page coming soon...</div>} />
                  <Route path="invoices" element={<div className="text-center py-8">Invoices page coming soon...</div>} />
                  <Route path="employees" element={<div className="text-center py-8">Employees page coming soon...</div>} />
                  <Route path="hiring" element={<div className="text-center py-8">Hiring page coming soon...</div>} />
                  <Route path="salary" element={<div className="text-center py-8">Salary Information page coming soon...</div>} />
                  <Route path="compensation" element={<div className="text-center py-8">Compensation Breakdown page coming soon...</div>} />
                  <Route path="projects" element={<div className="text-center py-8">Project-specific Data page coming soon...</div>} />
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
