
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, MoreHorizontal } from 'lucide-react';

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

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile.first_name}!
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">01 July - 31 July 2024</span>
          <Button size="sm">Export</Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Jobs Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Jobs Overview</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="relative w-32 h-32 mx-auto mb-4">
              {/* Donut Chart Placeholder */}
              <div className="w-full h-full rounded-full border-8 border-gray-200 relative">
                <div className="absolute inset-0 rounded-full border-8 border-blue-500 border-r-transparent border-b-transparent transform rotate-45"></div>
                <div className="absolute inset-4 rounded-full border-8 border-yellow-400 border-l-transparent border-t-transparent"></div>
                <div className="absolute inset-8 rounded-full border-8 border-orange-400 border-r-transparent border-b-transparent transform rotate-90"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">180</div>
                    <div className="text-xs text-gray-500">Total Jobs</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Active Jobs
                </span>
                <span className="font-medium">100</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  In review Jobs
                </span>
                <span className="font-medium">50</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  Finish Jobs
                </span>
                <span className="font-medium">30</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Attendance Rate</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold mb-2">90%</div>
              <div className="flex items-center justify-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4 mr-1" />
                20% since last month
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={90} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Sick Leave</span>
                <span>Day Off</span>
                <span>On time</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Employees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Employees</CardTitle>
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Fulltime Employee</span>
                  <span className="text-2xl font-bold">150</span>
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                  50
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Freelance Employee</span>
                  <span className="text-2xl font-bold">50</span>
                </div>
                <div className="flex items-center text-sm text-red-600">
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                  10
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Income Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">Income Statistics</CardTitle>
            </div>
            <Button variant="ghost" size="sm">More details</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Income</span>
                <span className="text-lg font-semibold text-green-600">$2,500.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expense</span>
                <span className="text-lg font-semibold text-orange-600">$3,280.00</span>
              </div>
              {/* Chart placeholder */}
              <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-sm text-gray-500">Chart visualization would go here</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Performance Ratings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">Employee Performance Ratings</CardTitle>
            </div>
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold mb-2">98%</div>
                <p className="text-sm text-gray-600">
                  Most of employees complete their jobs and on time.
                  Give rewards to increase employee satisfaction
                </p>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: "Hazel Nutt", completion: 85, presence: 75, meetings: 90 },
                  { name: "Simon Cyrene", completion: 90, presence: 85, meetings: 95 },
                  { name: "Aida Bugg", completion: 95, presence: 90, meetings: 85 },
                  { name: "Peg Legge", completion: 80, presence: 95, meetings: 90 },
                  { name: "Barb Akew", completion: 88, presence: 82, meetings: 78 }
                ].map((employee, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{employee.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${employee.completion}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full" 
                          style={{ width: `${employee.presence}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${employee.meetings}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center space-x-6 text-xs text-gray-500 mt-4">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-1"></div>
                  Task completed
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                  Presence
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Completed Meeting
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      {(profile.role === 'hr' || profile.role === 'admin') && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium">List Employee</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">All Status</Button>
                <Button variant="outline" size="sm">All Role</Button>
                <Button size="sm">Export</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { 
                  id: "EMP120124", 
                  name: "Hazel Nutt", 
                  email: "hazelnutt@mail.com", 
                  role: "Lead UI/UX Designer", 
                  department: "Team Projects",
                  status: "Full-time"
                },
                { 
                  id: "EMP120124", 
                  name: "Simon Cyrene", 
                  email: "simoncyr@mail.com", 
                  role: "Sr UI/UX Designer", 
                  department: "Team Projects",
                  status: "Full-time"
                },
                { 
                  id: "EMP120124", 
                  name: "Aida Bugg", 
                  email: "aidabugg@mail.com", 
                  role: "Jr Graphics Designer", 
                  department: "Team Marketing",
                  status: "Freelance"
                }
              ].map((employee, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-gray-500">{employee.email}</div>
                    </div>
                    <div className="text-sm text-gray-600">{employee.role}</div>
                    <div className="text-sm text-gray-600">{employee.department}</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={employee.status === "Full-time" ? "default" : "secondary"}>
                      {employee.status}
                    </Badge>
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
