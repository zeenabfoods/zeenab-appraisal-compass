
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, MoreHorizontal, ClipboardList, Users, Target, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuth();

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

  const renderStaffDashboard = () => (
    <>
      {/* Current Appraisal Status */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Current Appraisal</CardTitle>
            <ClipboardList className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Q4 2024</div>
              <Badge className="bg-yellow-100 text-yellow-800 mb-4">In Progress</Badge>
              <div className="space-y-2">
                <Progress value={65} className="h-2" />
                <p className="text-sm text-gray-600">65% Complete</p>
                <Button size="sm" className="w-full">Continue Assessment</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Performance Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">85%</div>
              <div className="flex items-center justify-center text-sm text-green-600 mb-2">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                5% from last quarter
              </div>
              <Badge className="bg-green-100 text-green-800">Excellent</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Pending Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Self Assessment</span>
                <Badge className="bg-orange-100 text-orange-800">Due Soon</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Goal Setting</span>
                <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { quarter: "Q3 2024", score: 82, status: "Completed", feedback: "Strong performance in project delivery" },
              { quarter: "Q2 2024", score: 78, status: "Completed", feedback: "Good collaboration and teamwork" },
              { quarter: "Q1 2024", score: 80, status: "Completed", feedback: "Exceeded expectations in client management" }
            ].map((appraisal, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-medium">{appraisal.quarter}</div>
                    <div className="text-sm text-gray-500">{appraisal.feedback}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold">{appraisal.score}%</div>
                    <Badge className="bg-green-100 text-green-800">{appraisal.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderManagerDashboard = () => (
    <>
      {/* Team Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-500">Direct reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Pending Reviews</CardTitle>
            <ClipboardList className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8</div>
            <p className="text-xs text-gray-500">Awaiting manager review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">4</div>
            <p className="text-xs text-gray-500">Fully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Team Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpIcon className="h-3 w-3 mr-1" />
              3% improvement
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Team Performance Overview</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "John Smith", position: "Senior Developer", score: 88, status: "Pending Review" },
              { name: "Sarah Johnson", position: "UI/UX Designer", score: 92, status: "Completed" },
              { name: "Mike Wilson", position: "Project Manager", score: 85, status: "Pending Review" },
              { name: "Lisa Brown", position: "QA Engineer", score: 79, status: "Draft" }
            ].map((employee, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.position}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold">{employee.score}%</div>
                  </div>
                  <Badge variant={employee.status === "Completed" ? "default" : employee.status === "Pending Review" ? "secondary" : "outline"}>
                    {employee.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderHRDashboard = () => (
    <>
      {/* HR Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-gray-500">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Active Cycles</CardTitle>
            <Target className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-gray-500">Ongoing appraisal cycles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73%</div>
            <Progress value={73} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Avg Score</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">81%</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpIcon className="h-3 w-3 mr-1" />
              2% from last cycle
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Department Performance</CardTitle>
            <Button variant="outline" size="sm">View Reports</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { department: "Engineering", employees: 45, avgScore: 84, completion: 78 },
              { department: "Sales", employees: 32, avgScore: 79, completion: 85 },
              { department: "Marketing", employees: 28, avgScore: 82, completion: 71 },
              { department: "Operations", employees: 25, avgScore: 77, completion: 80 }
            ].map((dept, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-medium">{dept.department}</div>
                    <div className="text-sm text-gray-500">{dept.employees} employees</div>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="font-semibold">{dept.avgScore}%</div>
                    <div className="text-xs text-gray-500">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{dept.completion}%</div>
                    <div className="text-xs text-gray-500">Completion</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile.first_name}!
          </h2>
          <p className="text-gray-600">
            {profile.role === 'hr' ? 'Manage appraisals and employee performance' : 
             profile.role === 'manager' ? 'Review your team performance' : 
             profile.role === 'admin' ? 'Executive overview and system management' :
             'Track your performance and complete appraisals'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Q4 2024 Cycle</span>
          <Button size="sm">
            {profile.role === 'staff' ? 'Start Appraisal' : 'View Reports'}
          </Button>
        </div>
      </div>

      {/* Role-based Dashboard Content */}
      {profile.role === 'staff' && renderStaffDashboard()}
      {profile.role === 'manager' && renderManagerDashboard()}
      {(profile.role === 'hr' || profile.role === 'admin') && renderHRDashboard()}
    </div>
  );
}
