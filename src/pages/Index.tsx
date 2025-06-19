
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BarChart3, Users, Shield, Clock } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Zeenab</h1>
          </div>
          <Button asChild>
            <a href="/auth">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          Performance Management System
        </Badge>
        <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Streamline Your
          <span className="text-blue-600"> Performance Reviews</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          A comprehensive appraisal system designed to enhance employee performance, 
          provide meaningful feedback, and drive organizational growth.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <a href="/auth">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Zeenab?
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Our platform provides everything you need for effective performance management
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Comprehensive Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track performance metrics with detailed analytics and reporting capabilities
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Role-Based Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Secure, role-based permissions ensuring data privacy and appropriate access levels
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Secure & Compliant</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enterprise-grade security with full data protection and compliance features
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="h-12 w-12 text-orange-600 mx-auto mb-4" />
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
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BarChart3 className="h-6 w-6" />
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
