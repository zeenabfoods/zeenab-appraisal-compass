import { useAuthContext } from '@/components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3, Users, Shield, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RecentActivityCard } from '@/components/RecentActivityCard';
import { FunctionalQuickActions } from '@/components/FunctionalQuickActions';

export default function Index() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center backdrop-blur-md bg-white/20 p-8 rounded-3xl border border-white/30 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show the dashboard with sidebar
  if (user) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here's what's happening.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appraisals</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">3 due this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89%</div>
                <p className="text-xs text-muted-foreground">+5% from last quarter</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <RecentActivityCard />
            <FunctionalQuickActions />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative overflow-hidden">
      {/* Floating glass orbs for background effect */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      <div className="absolute top-60 right-20 w-48 h-48 bg-gradient-to-r from-red-400/15 to-orange-400/15 rounded-full blur-2xl"></div>
      <div className="absolute bottom-40 left-1/4 w-40 h-40 bg-gradient-to-r from-orange-300/10 to-red-300/10 rounded-full blur-xl"></div>

      {/* Header */}
      <header className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex justify-between items-center backdrop-blur-sm bg-white/60 rounded-2xl px-6 py-4 border border-white/30 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
              <img 
                src="/lovable-uploads/382d6c71-33c6-4592-bd0f-0fb453a48ecf.png" 
                alt="Zeenab Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Zeenab
            </h1>
          </div>
          <Button asChild className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg">
            <a href="/auth">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/30 shadow-2xl p-12 max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-200">
            Performance Management System
          </Badge>
          <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Streamline Your
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"> Performance Reviews</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A comprehensive appraisal system designed to enhance employee performance, 
            provide meaningful feedback, and drive organizational growth.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg">
              <a href="/auth">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="backdrop-blur-sm bg-white/50 border-white/40 hover:bg-white/60">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Zeenab?
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform provides everything you need for effective performance management
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="text-center backdrop-blur-md bg-white/40 border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <CardTitle>Comprehensive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track performance metrics with detailed analytics and reporting capabilities
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center backdrop-blur-md bg-white/40 border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle>Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure, role-based permissions ensuring data privacy and appropriate access levels
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center backdrop-blur-md bg-white/40 border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle>Secure & Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enterprise-grade security with full data protection and compliance features
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center backdrop-blur-md bg-white/40 border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <CardTitle>Automated Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Streamlined processes with automated notifications and deadline management
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img 
                src="/lovable-uploads/382d6c71-33c6-4592-bd0f-0fb453a48ecf.png" 
                alt="Zeenab Logo" 
                className="w-full h-full object-contain filter brightness-0 invert"
              />
            </div>
            <span className="text-xl font-bold">Zeenab Appraisal System</span>
          </div>
          <p className="text-gray-400">
            Empowering organizations through effective performance management
          </p>
        </div>
      </footer>
    </div>
  );
}
