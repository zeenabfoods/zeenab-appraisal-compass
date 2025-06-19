
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, User, FileText, Settings, Bell } from 'lucide-react';

export function Dashboard() {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Zeenab Appraisal System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {profile.first_name} {profile.last_name}
                </span>
                <Badge className={getRoleBadgeColor(profile.role)}>
                  {profile.role.toUpperCase()}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile.first_name}!
          </h2>
          <p className="mt-2 text-gray-600">
            Manage your performance appraisals and track your progress.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appraisals">My Appraisals</TabsTrigger>
            {(profile.role === 'manager' || profile.role === 'hr' || profile.role === 'admin') && (
              <TabsTrigger value="team">Team Reviews</TabsTrigger>
            )}
            {(profile.role === 'hr' || profile.role === 'admin') && (
              <TabsTrigger value="admin">Admin</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Quarter
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Q{Math.ceil(new Date().getMonth() / 3) + 1} {new Date().getFullYear()}</div>
                  <p className="text-xs text-muted-foreground">
                    Performance period
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Reviews
                  </CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting completion
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed Reviews
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    This year
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Department
                  </CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile.department || 'N/A'}</div>
                  <p className="text-xs text-muted-foreground">
                    Your department
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks you might want to perform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Start New Appraisal
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    View My Profile
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest appraisal activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    No recent activity to display
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appraisals">
            <Card>
              <CardHeader>
                <CardTitle>My Appraisals</CardTitle>
                <CardDescription>
                  View and manage your performance appraisals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  No appraisals found. Your appraisals will appear here once created.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(profile.role === 'manager' || profile.role === 'hr' || profile.role === 'admin') && (
            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>Team Reviews</CardTitle>
                  <CardDescription>
                    Manage appraisals for your team members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    No team appraisals to review at this time.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {(profile.role === 'hr' || profile.role === 'admin') && (
            <TabsContent value="admin">
              <Card>
                <CardHeader>
                  <CardTitle>Administration</CardTitle>
                  <CardDescription>
                    Manage system settings and user accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="justify-start">
                      <User className="mr-2 h-4 w-4" />
                      Manage Users
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Appraisal Templates
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
