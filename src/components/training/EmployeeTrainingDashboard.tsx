
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { useEmployeeTrainingData } from '@/hooks/training/useEmployeeTrainingData';
import { TrainingPlayer } from './TrainingPlayer';
import { TrainingQuiz } from './TrainingQuiz';

export function EmployeeTrainingDashboard() {
  const { profile } = useAuth();
  const { assignments, loading } = useEmployeeTrainingData();
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState<string | null>(null);

  if (!profile) {
    return <div>Loading...</div>;
  }

  if (selectedTraining) {
    return (
      <TrainingPlayer
        assignmentId={selectedTraining}
        onComplete={() => setSelectedTraining(null)}
        onBack={() => setSelectedTraining(null)}
      />
    );
  }

  if (showQuiz) {
    return (
      <TrainingQuiz
        assignmentId={showQuiz}
        onComplete={() => setShowQuiz(null)}
        onBack={() => setShowQuiz(null)}
      />
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'disciplinary': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'disciplinary': return <AlertTriangle className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const activeAssignments = assignments.filter(a => ['assigned', 'in_progress'].includes(a.status));
  const completedAssignments = assignments.filter(a => a.status === 'completed');
  const failedAssignments = assignments.filter(a => ['failed', 'disciplinary'].includes(a.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Training</h1>
        <p className="text-gray-600 mt-2">Complete your assigned training modules and track your progress</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAssignments.length}</div>
            <p className="text-xs text-muted-foreground">Training modules to complete</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedAssignments.length}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedAssignments.length}</div>
            <p className="text-xs text-muted-foreground">Failed or under review</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Training</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Needs Attention</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {activeAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Training</h3>
                <p className="text-gray-500">You have no active training assignments at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{assignment.training.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{assignment.training.description}</p>
                      </div>
                      <Badge className={getStatusColor(assignment.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(assignment.status)}
                          {assignment.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        <span>Duration: {assignment.training.duration_minutes || 'N/A'} minutes</span>
                      </div>
                      
                      {assignment.progress && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{assignment.progress.progress_percentage}%</span>
                          </div>
                          <Progress value={assignment.progress.progress_percentage} />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setSelectedTraining(assignment.id)}
                          className="flex items-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          {assignment.progress?.progress_percentage === 100 ? 'Review' : 'Start Training'}
                        </Button>
                        
                        {assignment.progress?.progress_percentage === 100 && (
                          <Button 
                            onClick={() => setShowQuiz(assignment.id)}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <BookOpen className="h-4 w-4" />
                            Take Quiz
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Training</h3>
                <p className="text-gray-500">Complete your first training to see it here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{assignment.training.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Completed successfully</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        COMPLETED
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {failedAssignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues</h3>
                <p className="text-gray-500">All your training is progressing well.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {failedAssignments.map((assignment) => (
                <Card key={assignment.id} className="border-red-200">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{assignment.training.title}</CardTitle>
                        <p className="text-sm text-red-600 mt-1">
                          {assignment.status === 'disciplinary' 
                            ? 'Under disciplinary review after 3 failed attempts'
                            : 'Quiz failed - retake required'
                          }
                        </p>
                      </div>
                      <Badge className={getStatusColor(assignment.status)}>
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {assignment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
