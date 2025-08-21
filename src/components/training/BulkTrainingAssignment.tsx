
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, Target, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  position: string;
}

interface Training {
  id: string;
  title: string;
  description: string;
  content_type: string;
  duration_minutes: number;
  pass_mark: number;
}

interface BulkTrainingAssignmentProps {
  selectedTraining?: Training;
  onAssignmentComplete: () => void;
}

export function BulkTrainingAssignment({ selectedTraining, onAssignmentComplete }: BulkTrainingAssignmentProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState(selectedTraining?.id || '');
  const [dueDate, setDueDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department, position')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    }
  };

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('id, title, description, content_type, duration_minutes, pass_mark')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setTrainings(data || []);
    } catch (error: any) {
      console.error('Error fetching trainings:', error);
      toast({
        title: "Error",
        description: "Failed to load trainings",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchEmployees();
    if (!selectedTraining) {
      fetchTrainings();
    }
  }, [selectedTraining]);

  const handleEmployeeToggle = (employeeId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAllByDepartment = (department: string, isChecked: boolean) => {
    const departmentEmployees = filteredEmployees.filter(emp => emp.department === department);
    
    if (isChecked) {
      const newSelections = departmentEmployees.map(emp => emp.id);
      setSelectedEmployees(prev => [...new Set([...prev, ...newSelections])]);
    } else {
      const departmentEmployeeIds = departmentEmployees.map(emp => emp.id);
      setSelectedEmployees(prev => prev.filter(id => !departmentEmployeeIds.includes(id)));
    }
  };

  const handleBulkAssignment = async () => {
    if (!selectedTrainingId || selectedEmployees.length === 0 || !dueDate || !profile) {
      toast({
        title: "Missing Information",
        description: "Please select training, employees, and due date",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const assignments = selectedEmployees.map(employeeId => ({
        employee_id: employeeId,
        training_id: selectedTrainingId,
        assigned_by: profile.id,
        due_date: dueDate.toISOString(),
        status: 'assigned'
      }));

      const { error } = await supabase
        .from('training_assignments')
        .insert(assignments);

      if (error) throw error;

      toast({
        title: "Training Assigned Successfully",
        description: `Training has been assigned to ${selectedEmployees.length} employees`
      });

      setSelectedEmployees([]);
      setSelectedTrainingId(selectedTraining?.id || '');
      setDueDate(undefined);
      onAssignmentComplete();

    } catch (error: any) {
      console.error('Error assigning training:', error);
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
  const filteredEmployees = departmentFilter === 'all' 
    ? employees 
    : employees.filter(emp => emp.department === departmentFilter);

  const selectedTrainingData = trainings.find(t => t.id === selectedTrainingId) || selectedTraining;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Training Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Selection */}
          {!selectedTraining && (
            <div>
              <Label>Select Training</Label>
              <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a training to assign" />
                </SelectTrigger>
                <SelectContent>
                  {trainings.map(training => (
                    <SelectItem key={training.id} value={training.id}>
                      <div className="flex items-center gap-2">
                        <span>{training.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {training.content_type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Training Info */}
          {selectedTrainingData && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{selectedTrainingData.title}</h4>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {selectedTrainingData.duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{selectedTrainingData.duration_minutes} minutes</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>{selectedTrainingData.pass_mark}% pass mark</span>
                </div>
              </div>
            </div>
          )}

          {/* Due Date */}
          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Department Filter */}
          <div>
            <Label>Filter by Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Employees ({selectedEmployees.length} selected)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Department Groups */}
          {departments.map(department => {
            const deptEmployees = filteredEmployees.filter(emp => emp.department === department);
            if (deptEmployees.length === 0) return null;

            const selectedInDept = deptEmployees.filter(emp => selectedEmployees.includes(emp.id)).length;
            
            return (
              <div key={department} className="mb-6">
                <div className="flex items-center space-x-2 mb-3 p-2 bg-muted rounded">
                  <Checkbox
                    id={`dept-${department}`}
                    checked={selectedInDept === deptEmployees.length && deptEmployees.length > 0}
                    onCheckedChange={(checked) => handleSelectAllByDepartment(department, checked as boolean)}
                  />
                  <label htmlFor={`dept-${department}`} className="font-medium">
                    {department} ({selectedInDept}/{deptEmployees.length})
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-6">
                  {deptEmployees.map(employee => (
                    <div key={employee.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        id={`emp-${employee.id}`}
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={(checked) => handleEmployeeToggle(employee.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`emp-${employee.id}`} className="text-sm font-medium truncate cursor-pointer">
                          {employee.first_name} {employee.last_name}
                        </label>
                        <p className="text-xs text-muted-foreground truncate">{employee.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Assignment Summary & Action */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedEmployees.length} employees selected
              {selectedTrainingData && ` • ${selectedTrainingData.title}`}
              {dueDate && ` • Due ${format(dueDate, "MMM d, yyyy")}`}
            </div>
            <Button 
              onClick={handleBulkAssignment}
              disabled={!selectedTrainingId || selectedEmployees.length === 0 || !dueDate || loading}
            >
              {loading ? 'Assigning...' : `Assign Training to ${selectedEmployees.length} Employees`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
