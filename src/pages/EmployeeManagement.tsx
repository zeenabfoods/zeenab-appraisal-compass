
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search, Filter } from 'lucide-react';

export default function EmployeeManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600 mt-2">Manage employee profiles, roles, and organizational structure</p>
        </div>
        
        <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-orange-600" />
              <CardTitle>Employee Directory</CardTitle>
            </div>
            <CardDescription>
              View and manage all employee profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Browse Employees
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Filter className="h-6 w-6 text-blue-600" />
              <CardTitle>Role Management</CardTitle>
            </div>
            <CardDescription>
              Assign and modify employee roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Roles
            </Button>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Plus className="h-6 w-6 text-green-600" />
              <CardTitle>Bulk Operations</CardTitle>
            </div>
            <CardDescription>
              Import/export employee data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Import/Export
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="backdrop-blur-md bg-white/60 border-white/40">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Employee Management System</h3>
          <p className="text-gray-600 text-center max-w-md">
            This comprehensive employee management system is under development. 
            Soon you'll be able to manage employee profiles, assignments, and organizational hierarchy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
