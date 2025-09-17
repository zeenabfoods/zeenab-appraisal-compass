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

  // Debug effect to track currentTraining changes
  useEffect(() => {
    console.log('currentTraining changed:', currentTraining);
  }, [currentTraining]);

  // Debug effect to track isPlaying changes
  useEffect(() => {
    console.log('isPlaying changed:', isPlaying);
  }, [isPlaying]);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['training-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
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
      const { error } = await (supabase as any)
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
    console.log('togglePlayPause called');
    if (videoRef.current) {
      console.log('Video element found:', videoRef.current);
      console.log('Video paused state:', videoRef.current.paused);
      console.log('Video readyState:', videoRef.current.readyState);
      
      if (isPlaying) {
        console.log('Pausing video...');
        videoRef.current.pause();
      } else {
        console.log('Playing video...');
        videoRef.current.play().then(() => {
          console.log('Video play successful');
        }).catch((error) => {
          console.error('Video play failed:', error);
        });
      }
      setIsPlaying(!isPlaying);
    } else {
      console.error('No video element found');
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

  // Helper function to convert YouTube URLs to embed format (robust)
  const convertYouTubeUrl = (rawUrl: string) => {
    if (!rawUrl) return { embedUrl: rawUrl, isYouTube: false };
    const urlStr = rawUrl.trim();

    try {
      const u = new URL(urlStr);
      const host = u.hostname.replace('www.', '');

      let videoId: string | null = null;

      if (host === 'youtu.be') {
        // Short link: youtu.be/<id>
        videoId = u.pathname.replace('/', '').split('?')[0] || null;
      } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        // Standard watch URL
        videoId = u.searchParams.get('v');
        // Or already an embed URL: /embed/<id>
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
      // not a valid URL, fall back to regex
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

  const getTimeUntilDue = (dueDate: string, trainingDurationMinutes: number) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    
    // If overdue, return negative values
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
    
    // For trainings under 2 hours, show time in hours/minutes if due within 24 hours
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
    
    // For longer trainings or longer timeframes, show days
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

  const activeAssignments = assignments?.filter(a => a.status === 'assigned') || [];
  const completedAssignments = assignments?.filter(a => 
    a.quiz_attempts?.some(attempt => attempt.passed)
  ) || [];
  const overdueAssignments = activeAssignments.filter(a => {
    const timeInfo = getTimeUntilDue(a.due_date, a.training.duration_minutes);
    return timeInfo.isOverdue && !a.quiz_attempts?.some(attempt => attempt.passed);
  });

  console.log('TrainingDashboard: assignments data:', assignments);
  console.log('TrainingDashboard: activeAssignments:', activeAssignments);
  console.log('TrainingDashboard: currentTraining:', currentTraining);

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
          {currentTraining && (
            <TabsTrigger 
              value="viewer"
              onClick={() => console.log('Training Viewer tab clicked')}
            >
              Training Viewer
            </TabsTrigger>
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
                const progress = assignment.progress?.progress_percentage || 0;
                const timeInfo = getTimeUntilDue(assignment.due_date, assignment.training.duration_minutes);
                
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
                          
                          <Button 
                            onClick={() => {
                              console.log('Start Training clicked for:', assignment);
                              console.log('Current training before set:', currentTraining);
                              setCurrentTraining(assignment);
                              console.log('Current training after set:', assignment);
                            }}
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
                <div className="text-sm text-gray-500">
                  <p>Content Type: {currentTraining.training.content_type}</p>
                  <p>Content URL: {currentTraining.training.content_url}</p>
                </div>
              </CardHeader>
              <CardContent>
                {currentTraining.training.content_type === 'video' && (
                  <div className="space-y-4">
                    {(() => {
                      const urlInfo = convertYouTubeUrl(currentTraining.training.content_url);
                      
                      if (urlInfo?.isYouTube) {
                        // YouTube video - use iframe
                        return (
                          <div className="space-y-4">
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                src={urlInfo.embedUrl}
                                className="absolute top-0 left-0 w-full h-full rounded-lg"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={currentTraining.training.title}
                              />
                            </div>
                            <div className="text-sm text-blue-600">
                              🎥 YouTube Video - Use video controls to play/pause
                            </div>
                          </div>
                        );
                      } else {
                        // Direct video file - use video element
                        return (
                          <div className="space-y-4">
                            <div className="relative">
                              <video
                                ref={videoRef}
                                src={currentTraining.training.content_url}
                                className="w-full rounded-lg"
                                onTimeUpdate={handleVideoTimeUpdate}
                                onEnded={handleVideoEnd}
                                onLoadedMetadata={() => {
                                  console.log('Video metadata loaded');
                                  console.log('Video duration:', videoRef.current?.duration);
                                }}
                                onError={(e) => {
                                  console.error('Video error:', e);
                                  console.error('Video URL:', currentTraining.training.content_url);
                                }}
                                onCanPlay={() => console.log('Video can play')}
                                onContextMenu={(e) => e.preventDefault()}
                                controlsList="nodownload nofullscreen noremoteplayback"
                                disablePictureInPicture
                                controls
                              />
                              <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-2 rounded">
                                <div className="flex items-center justify-between">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      console.log('Play/Pause button clicked');
                                      console.log('Current isPlaying state:', isPlaying);
                                      console.log('Video element:', videoRef.current);
                                      if (videoRef.current) {
                                        console.log('Video readyState:', videoRef.current.readyState);
                                        console.log('Video paused:', videoRef.current.paused);
                                      }
                                      togglePlayPause();
                                    }}
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
                          </div>
                        );
                      }
                    })()}
                    
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