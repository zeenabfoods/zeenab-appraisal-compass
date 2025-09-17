import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Volume2,
  Video,
  Calendar,
  Award,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';

interface TrainingAssignment {
  id: string;
  training_id: string;
  assigned_at: string;
  due_date: string;
  status: string;
  training: {
    title: string;
    description: string;
    content_type: string;
    content_url: string;
    file_path: string;
    duration_minutes: number;
    pass_mark: number;
    max_attempts: number;
  };
  progress?: {
    progress_percentage: number;
    time_spent_minutes: number;
    completed_at: string | null;
    last_position: string | null;
  };
  quiz_attempts?: Array<{
    attempt_number: number;
    score_percentage: number;
    passed: boolean;
    completed_at: string;
  }>;
}

export function TrainingDashboard() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTraining, setCurrentTraining] = useState<TrainingAssignment | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['training-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training:trainings(*),
          progress:training_progress(*),
          quiz_attempts(*)
        `)
        .eq('employee_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as TrainingAssignment[];
    },
    enabled: !!user
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ assignmentId, progress, position }: {
      assignmentId: string;
      progress: number;
      position?: string;
    }) => {
      const { error } = await supabase
        .from('training_progress')
        .upsert({
          assignment_id: assignmentId,
          progress_percentage: progress,
          time_spent_minutes: Math.floor(currentTime / 60),
          last_position: position,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
    }
  });

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && currentTraining) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setCurrentTime(current);
      setDuration(total);

      const progress = Math.round((current / total) * 100);
      
      // Update progress every 30 seconds
      if (Math.floor(current) % 30 === 0) {
        updateProgressMutation.mutate({
          assignmentId: currentTraining.id,
          progress,
          position: current.toString()
        });
      }
    }
  };

  const handleVideoEnd = () => {
    if (currentTraining) {
      updateProgressMutation.mutate({
        assignmentId: currentTraining.id,
        progress: 100,
        position: 'completed'
      });
      
      toast({
        title: "Training Completed",
        description: "You can now take the quiz to complete your training.",
      });
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getTrainingIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (assignment: TrainingAssignment) => {
    const progress = assignment.progress?.progress_percentage || 0;
    const hasAttempts = assignment.quiz_attempts && assignment.quiz_attempts.length > 0;
    const lastAttempt = hasAttempts ? assignment.quiz_attempts[assignment.quiz_attempts.length - 1] : null;
    const isPastDue = new Date(assignment.due_date) < new Date();

    if (lastAttempt?.passed) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (progress === 100 && !hasAttempts) {
      return <Badge className="bg-blue-100 text-blue-800">Ready for Quiz</Badge>;
    } else if (isPastDue && !lastAttempt?.passed) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    } else if (progress > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const activeAssignments = assignments?.filter(a => a.status === 'assigned') || [];
  const completedAssignments = assignments?.filter(a => 
    a.quiz_attempts?.some(attempt => attempt.passed)
  ) || [];
  const overdueAssignments = activeAssignments.filter(a => 
    new Date(a.due_date) < new Date() && 
    !a.quiz_attempts?.some(attempt => attempt.passed)
  );

  return (
    <div className="space-y-6">
      {/* Training Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trainings</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAssignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedAssignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAssignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments?.length ? Math.round((completedAssignments.length / assignments.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Trainings</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          {currentTraining && <TabsTrigger value="viewer">Training Viewer</TabsTrigger>}
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No active training assignments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeAssignments.map((assignment) => {
                const progress = assignment.progress?.progress_percentage || 0;
                const daysUntilDue = getDaysUntilDue(assignment.due_date);
                
                return (
                  <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            {getTrainingIcon(assignment.training.content_type)}
                            <span>{assignment.training.title}</span>
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.training.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(assignment)}
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {daysUntilDue >= 0 ? `${daysUntilDue} days left` : `${Math.abs(daysUntilDue)} days overdue`}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {assignment.training.duration_minutes} minutes
                          </div>
                          
                          <Button 
                            onClick={() => setCurrentTraining(assignment)}
                            size="sm"
                          >
                            {progress > 0 ? 'Continue' : 'Start Training'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No completed trainings yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedAssignments.map((assignment) => {
                const lastAttempt = assignment.quiz_attempts?.[assignment.quiz_attempts.length - 1];
                
                return (
                  <Card key={assignment.id} className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            {getTrainingIcon(assignment.training.content_type)}
                            <span>{assignment.training.title}</span>
                          </CardTitle>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                          {lastAttempt && (
                            <div className="text-xs text-gray-500">
                              Score: {lastAttempt.score_percentage}%
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600">
                        Completed on: {lastAttempt ? new Date(lastAttempt.completed_at).toLocaleDateString() : 'Unknown'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {currentTraining && (
          <TabsContent value="viewer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{currentTraining.training.title}</CardTitle>
                <p className="text-gray-600">{currentTraining.training.description}</p>
              </CardHeader>
              <CardContent>
                {currentTraining.training.content_type === 'video' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={currentTraining.training.content_url}
                        className="w-full rounded-lg"
                        onTimeUpdate={handleVideoTimeUpdate}
                        onEnded={handleVideoEnd}
                        onContextMenu={(e) => e.preventDefault()} // Disable right-click
                        controlsList="nodownload nofullscreen noremoteplayback"
                        disablePictureInPicture
                      />
                      <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-2 rounded">
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={togglePlayPause}
                            className="text-white hover:bg-white/20"
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <div className="text-sm">
                            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Training Progress</span>
                        <span>{Math.round((currentTime / duration) * 100) || 0}%</span>
                      </div>
                      <Progress value={Math.round((currentTime / duration) * 100) || 0} className="h-2" />
                    </div>
                  </div>
                )}

                {currentTraining.training.content_type === 'document' && (
                  <div className="space-y-4">
                    <iframe
                      src={currentTraining.training.content_url}
                      className="w-full h-96 border rounded-lg"
                      title={currentTraining.training.title}
                    />
                    <Button
                      onClick={() => {
                        updateProgressMutation.mutate({
                          assignmentId: currentTraining.id,
                          progress: 100
                        });
                      }}
                      className="w-full"
                    >
                      Mark as Completed
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}