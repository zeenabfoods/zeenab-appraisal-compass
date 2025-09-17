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
  Target,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/components/AuthProvider';
import { TrainingQuiz } from '@/components/TrainingQuiz';

interface TrainingAssignment {
  id: string;
  training_id: string;
  employee_id: string;
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
  progress?: Array<{
    progress_percentage: number;
    time_spent_minutes: number;
    completed_at: string | null;
    last_position: string | null;
  }>;
  quiz_attempts?: Array<{
    attempt_number: number;
    score_percentage: number;
    passed: boolean;
    completed_at: string;
  }>;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function TrainingDashboard() {
  const { user, profile } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTraining, setCurrentTraining] = useState<TrainingAssignment | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  const isHR = profile?.role === 'hr' || profile?.role === 'admin';

  // For HR: fetch all assignments system-wide, for employees: fetch their own
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['training-assignments', user?.id, isHR],
    queryFn: async () => {
      let query = supabase
        .from('training_assignments')
        .select(`
          *,
          training:trainings(*),
          progress:training_progress(*),
          quiz_attempts(*),
          employee:profiles!training_assignments_employee_id_fkey(first_name, last_name, email)
        `);

      if (!isHR) {
        query = query.eq('employee_id', user?.id);
      }

      const { data, error } = await query.order('assigned_at', { ascending: false });

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
          updated_at: new Date().toISOString(),
          completed_at: progress === 100 ? new Date().toISOString() : null
        });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
      if (variables.progress === 100) {
        toast({
          title: "Training Completed!",
          description: "You can now take the quiz.",
        });
      }
    }
  });

  const retakeTrainingMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      // Reset progress to 0
      const { error: progressError } = await supabase
        .from('training_progress')
        .upsert({
          assignment_id: assignmentId,
          progress_percentage: 0,
          time_spent_minutes: 0,
          last_position: null,
          completed_at: null,
          updated_at: new Date().toISOString()
        });

      if (progressError) throw progressError;

      // Clear quiz attempts
      const { error: quizError } = await supabase
        .from('quiz_attempts')
        .delete()
        .eq('assignment_id', assignmentId);

      if (quizError) throw quizError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
      toast({
        title: "Training Reset",
        description: "You can now restart the training.",
      });
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
        videoRef.current.play().catch((error) => {
          console.error('Video play failed:', error);
        });
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

  // Helper function to convert YouTube URLs to embed format
  const convertYouTubeUrl = (rawUrl: string) => {
    if (!rawUrl) return { embedUrl: rawUrl, isYouTube: false };
    const urlStr = rawUrl.trim();

    try {
      const u = new URL(urlStr);
      const host = u.hostname.replace('www.', '');

      let videoId: string | null = null;

      if (host === 'youtu.be') {
        videoId = u.pathname.replace('/', '').split('?')[0] || null;
      } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        videoId = u.searchParams.get('v');
        if (!videoId && u.pathname.startsWith('/embed/')) {
          videoId = u.pathname.split('/embed/')[1]?.split('/')[0] || null;
        }
      }

      if (videoId && videoId.length >= 10) {
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`,
          isYouTube: true,
        };
      }
    } catch (e) {
      const regExp = /^.*(?:youtu.be\/|v\/|\/u\/\w\/|embed\/|watch\?v=)([^#&?]*).*/;
      const match = urlStr.match(regExp);
      if (match && match[1]) {
        return {
          embedUrl: `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&controls=1`,
          isYouTube: true,
        };
      }
    }

    return { embedUrl: urlStr, isYouTube: urlStr.includes('youtu') };
  };

  const getProgressPercentage = (assignment: TrainingAssignment) => {
    return assignment.progress?.[0]?.progress_percentage || 0;
  };

  const getStatusBadge = (assignment: TrainingAssignment) => {
    const progress = getProgressPercentage(assignment);
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

  const getTimeUntilDue = (dueDate: string, trainingDurationMinutes: number) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    
    if (diffTime < 0) {
      const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
      return {
        isOverdue: true,
        display: diffDays === 1 ? '1 day overdue' : `${diffDays} days overdue`,
        value: -diffDays
      };
    }
    
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (trainingDurationMinutes <= 120 && diffHours < 24) {
      if (diffHours < 1) {
        return {
          isOverdue: false,
          display: diffMinutes <= 1 ? '1 minute left' : `${diffMinutes} minutes left`,
          value: diffMinutes
        };
      } else {
        return {
          isOverdue: false,
          display: diffHours === 1 ? '1 hour left' : `${diffHours} hours left`,
          value: diffHours
        };
      }
    }
    
    return {
      isOverdue: false,
      display: diffDays === 1 ? '1 day left' : `${diffDays} days left`,
      value: diffDays
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Filter assignments based on user role
  const userAssignments = isHR ? assignments : assignments?.filter(a => a.employee_id === user?.id) || [];
  
  const activeAssignments = userAssignments?.filter(a => a.status === 'assigned') || [];
  const completedAssignments = userAssignments?.filter(a => 
    a.quiz_attempts?.some(attempt => attempt.passed)
  ) || [];
  const overdueAssignments = activeAssignments.filter(a => {
    const timeInfo = getTimeUntilDue(a.due_date, a.training.duration_minutes);
    return timeInfo.isOverdue && !a.quiz_attempts?.some(attempt => attempt.passed);
  });

  // For HR: show system-wide stats
  const statsAssignments = isHR ? assignments || [] : userAssignments;

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
            <div className="text-2xl font-bold">
              {isHR ? statsAssignments.filter(a => a.status === 'assigned').length : activeAssignments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isHR ? statsAssignments.filter(a => a.quiz_attempts?.some(attempt => attempt.passed)).length : completedAssignments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isHR ? statsAssignments.filter(a => {
                const timeInfo = getTimeUntilDue(a.due_date, a.training.duration_minutes);
                return timeInfo.isOverdue && !a.quiz_attempts?.some(attempt => attempt.passed);
              }).length : overdueAssignments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsAssignments?.length ? Math.round((
                isHR ? statsAssignments.filter(a => a.quiz_attempts?.some(attempt => attempt.passed)).length 
                : completedAssignments.length
              ) / statsAssignments.length * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Trainings</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          {currentTraining && !isHR && (
            <TabsTrigger value="viewer">Training Viewer</TabsTrigger>
          )}
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
                const progress = getProgressPercentage(assignment);
                const timeInfo = getTimeUntilDue(assignment.due_date, assignment.training.duration_minutes);
                const hasQuizAttempts = assignment.quiz_attempts && assignment.quiz_attempts.length > 0;
                const lastAttempt = hasQuizAttempts ? assignment.quiz_attempts[assignment.quiz_attempts.length - 1] : null;
                const isCompleted = lastAttempt?.passed;
                
                return (
                  <Card key={assignment.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            {getTrainingIcon(assignment.training.content_type)}
                            <span>{assignment.training.title}</span>
                            {isHR && assignment.employee && (
                              <span className="text-sm font-normal text-gray-600">
                                - {assignment.employee.first_name} {assignment.employee.last_name}
                              </span>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.training.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(assignment)}
                          <div className={`flex items-center text-xs ${timeInfo.isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                            <Calendar className="h-3 w-3 mr-1" />
                            {timeInfo.display}
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
                          
                          <div className="flex gap-2">
                            {!isHR && (
                              <>
                                {isCompleted ? (
                                  <Button 
                                    onClick={() => retakeTrainingMutation.mutate(assignment.id)}
                                    size="sm"
                                    variant="outline"
                                    disabled={retakeTrainingMutation.isPending}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Retake Lesson
                                  </Button>
                                ) : (
                                  <>
                                    <Button 
                                      onClick={() => {
                                        setCurrentTraining(assignment);
                                      }}
                                      size="sm"
                                    >
                                      {progress > 0 ? 'Continue' : 'Start Training'}
                                    </Button>
                                    
                                    {progress === 100 && !hasQuizAttempts && (
                                      <Button 
                                        onClick={() => setShowQuiz(true)}
                                        size="sm"
                                        variant="outline"
                                      >
                                        Take Quiz
                                      </Button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
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
                            {isHR && assignment.employee && (
                              <span className="text-sm font-normal text-gray-600">
                                - {assignment.employee.first_name} {assignment.employee.last_name}
                              </span>
                            )}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.training.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                          <div className="text-xs text-gray-500">
                            Score: {lastAttempt?.score_percentage || 0}%
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>100%</span>
                          </div>
                          <Progress value={100} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            Completed on {new Date(lastAttempt?.completed_at || '').toLocaleDateString()}
                          </div>
                          
                          {!isHR && (
                            <Button 
                              onClick={() => retakeTrainingMutation.mutate(assignment.id)}
                              size="sm"
                              variant="outline"
                              disabled={retakeTrainingMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Retake Lesson
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {currentTraining && !isHR && (
          <TabsContent value="viewer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getTrainingIcon(currentTraining.training.content_type)}
                  <span>{currentTraining.training.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Training Progress</span>
                      <span>{getProgressPercentage(currentTraining)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(currentTraining)} className="h-2" />
                  </div>

                  {currentTraining.training.content_type === 'video' && (
                    <div className="space-y-4">
                      {convertYouTubeUrl(currentTraining.training.content_url).isYouTube ? (
                        <div className="aspect-video">
                          <iframe
                            src={convertYouTubeUrl(currentTraining.training.content_url).embedUrl}
                            className="w-full h-full rounded-lg"
                            allowFullScreen
                            title={currentTraining.training.title}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                          <video
                            ref={videoRef}
                            src={currentTraining.training.content_url}
                            className="w-full h-full object-contain"
                            onTimeUpdate={handleVideoTimeUpdate}
                            onEnded={handleVideoEnd}
                          />
                          
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Button
                              onClick={togglePlayPause}
                              size="lg"
                              variant="outline"
                              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                            >
                              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Mark as Complete Button */}
                      {getProgressPercentage(currentTraining) < 100 && (
                        <Button
                          onClick={() => {
                            updateProgressMutation.mutate({
                              assignmentId: currentTraining.id,
                              progress: 100,
                              position: 'completed'
                            });
                          }}
                          className="w-full mt-4"
                          variant="outline"
                          disabled={updateProgressMutation.isPending}
                        >
                          Mark as Completed
                        </Button>
                      )}

                      {/* Quiz Button */}
                      {getProgressPercentage(currentTraining) === 100 && !currentTraining.quiz_attempts?.some(attempt => attempt.passed) && (
                        <Button
                          onClick={() => setShowQuiz(true)}
                          className="w-full mt-4"
                          variant="default"
                        >
                          Take Quiz
                        </Button>
                      )}
                    </div>
                  )}

                  {currentTraining.training.content_type === 'document' && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <div className="flex items-center space-x-2 mb-4">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <span className="font-medium">Document Training</span>
                        </div>
                        
                        {currentTraining.training.content_url && (
                          <a
                            href={currentTraining.training.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Open Document
                          </a>
                        )}
                      </div>

                      {/* Progress Bar for Document Training */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Reading Progress</span>
                          <span>{getProgressPercentage(currentTraining)}%</span>
                        </div>
                        <Progress value={getProgressPercentage(currentTraining)} className="h-2" />
                      </div>

                      {/* Mark as Complete Button for Document */}
                      {getProgressPercentage(currentTraining) < 100 && (
                        <Button
                          onClick={() => {
                            updateProgressMutation.mutate({
                              assignmentId: currentTraining.id,
                              progress: 100,
                              position: 'completed'
                            });
                          }}
                          className="w-full mt-4"
                          variant="outline"
                          disabled={updateProgressMutation.isPending}
                        >
                          Mark as Completed
                        </Button>
                      )}

                      {/* Quiz Button for Document */}
                      {getProgressPercentage(currentTraining) === 100 && !currentTraining.quiz_attempts?.some(attempt => attempt.passed) && (
                        <Button
                          onClick={() => setShowQuiz(true)}
                          className="w-full mt-4"
                          variant="default"
                        >
                          Take Quiz
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Quiz Section */}
                  {showQuiz && (
                    <div className="space-y-4">
                      <TrainingQuiz
                        assignmentId={currentTraining.id}
                        trainingId={currentTraining.training_id}
                        maxAttempts={currentTraining.training.max_attempts}
                        passmark={currentTraining.training.pass_mark}
                        onQuizComplete={() => {
                          setShowQuiz(false);
                          queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}