import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  BookOpen, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Video,
  Volume2,
  FileText,
  Settings,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TrainingRequest {
  id: string;
  employee_id: string;
  requested_by: string;
  recommended_training_type: string;
  justification: string;
  status: string;
  created_at: string;
  employee: {
    first_name: string;
    last_name: string;
    email: string;
  };
  requester: {
    first_name: string;
    last_name: string;
  };
}

interface Training {
  id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  duration_minutes: number;
  pass_mark: number;
  max_attempts: number;
  is_active: boolean;
  created_at: string;
}

export function TrainingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [newTraining, setNewTraining] = useState({
    title: '',
    description: '',
    content_type: 'video',
    content_url: '',
    duration_minutes: 30,
    pass_mark: 70,
    max_attempts: 3
  });

  const { data: trainingRequests } = useQuery({
    queryKey: ['training-requests'],
    queryFn: async () => {
      // First get training requests
      const { data: requests, error: requestsError } = await supabase
        .from('training_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Then get employee and requester details for each request
      const enrichedRequests = await Promise.all(
        (requests || []).map(async (request) => {
          const [employeeResult, requesterResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', request.employee_id)
              .single(),
            supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', request.requested_by)
              .single()
          ]);

          return {
            ...request,
            employee: employeeResult.data || { first_name: '', last_name: '', email: '' },
            requester: requesterResult.data || { first_name: '', last_name: '' }
          };
        })
      );

      return enrichedRequests as TrainingRequest[];
    }
  });

  const { data: trainings } = useQuery({
    queryKey: ['trainings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('trainings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Training[];
    }
  });

  const createTrainingMutation = useMutation({
    mutationFn: async (trainingData: typeof newTraining) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from('trainings')
        .insert({
          ...trainingData,
          created_by: user.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Training Created",
        description: "New training has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      setIsCreateDialogOpen(false);
      setNewTraining({
        title: '',
        description: '',
        content_type: 'video',
        content_url: '',
        duration_minutes: 30,
        pass_mark: 70,
        max_attempts: 3
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create training. Please try again.",
        variant: "destructive",
      });
      console.error('Create training error:', error);
    }
  });

  const updateTrainingMutation = useMutation({
    mutationFn: async (trainingData: Training) => {
      const { error } = await (supabase as any)
        .from('trainings')
        .update({
          title: trainingData.title,
          description: trainingData.description,
          content_type: trainingData.content_type,
          content_url: trainingData.content_url,
          duration_minutes: trainingData.duration_minutes,
          pass_mark: trainingData.pass_mark,
          max_attempts: trainingData.max_attempts
        })
        .eq('id', trainingData.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Training Updated",
        description: "Training has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
      setIsEditDialogOpen(false);
      setEditingTraining(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update training. Please try again.",
        variant: "destructive",
      });
      console.error('Update training error:', error);
    }
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: async (trainingId: string) => {
      const { error } = await (supabase as any)
        .from('trainings')
        .update({ is_active: false })
        .eq('id', trainingId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Training Deleted",
        description: "Training has been deactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['trainings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete training. Please try again.",
        variant: "destructive",
      });
      console.error('Delete training error:', error);
    }
  });

  const handleEditTraining = (training: Training) => {
    setEditingTraining(training);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTraining = (trainingId: string) => {
    deleteTrainingMutation.mutate(trainingId);
  };

  const processRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, trainingId }: {
      requestId: string;
      action: 'approve' | 'reject';
      trainingId?: string;
    }) => {
      if (action === 'approve' && trainingId) {
        const request = trainingRequests?.find(r => r.id === requestId);
        if (request) {
          // Create training assignment
          const { error: assignmentError } = await (supabase as any)
            .from('training_assignments')
            .insert({
              employee_id: request.employee_id,
              training_id: trainingId,
              assigned_by: (await supabase.auth.getUser()).data.user?.id,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              request_id: requestId
            });

          if (assignmentError) throw assignmentError;
        }
      }

      // Update request status
      const { error } = await (supabase as any)
        .from('training_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request Processed",
        description: "Training request has been processed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['training-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
      console.error('Process request error:', error);
    }
  });

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Volume2 className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const pendingRequests = trainingRequests?.filter(r => r.status === 'pending') || [];
  const processedRequests = trainingRequests?.filter(r => r.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Training Management</h2>
          <p className="text-gray-600">Manage training requests and create new training programs</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Training
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Training</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Training Title</Label>
                <Input
                  id="title"
                  value={newTraining.title}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter training title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTraining.description}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter training description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <select
                  id="content-type"
                  value={newTraining.content_type}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, content_type: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="video">Video (YouTube)</option>
                  <option value="audio">Audio (YouTube)</option>
                  <option value="document">Document (Google Drive)</option>
                  <option value="text">Text Content</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-url">Content URL</Label>
                <Input
                  id="content-url"
                  value={newTraining.content_url}
                  onChange={(e) => setNewTraining(prev => ({ ...prev, content_url: e.target.value }))}
                  placeholder="Enter YouTube or Google Drive URL"
                />
                <p className="text-xs text-gray-500">
                  For YouTube: Use unlisted video links. For Google Drive: Use shareable links
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newTraining.duration_minutes}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pass-mark">Pass Mark (%)</Label>
                  <Input
                    id="pass-mark"
                    type="number"
                    value={newTraining.pass_mark}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, pass_mark: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="max-attempts">Max Attempts</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    value={newTraining.max_attempts}
                    onChange={(e) => setNewTraining(prev => ({ ...prev, max_attempts: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <Button 
                onClick={() => createTrainingMutation.mutate(newTraining)}
                disabled={!newTraining.title || !newTraining.content_url}
                className="w-full"
              >
                Create Training
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Training Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Training</DialogTitle>
          </DialogHeader>
          {editingTraining && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Training Title</Label>
                <Input
                  id="edit-title"
                  value={editingTraining.title}
                  onChange={(e) => setEditingTraining(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter training title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTraining.description}
                  onChange={(e) => setEditingTraining(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Enter training description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content-type">Content Type</Label>
                <select
                  id="edit-content-type"
                  value={editingTraining.content_type}
                  onChange={(e) => setEditingTraining(prev => prev ? { ...prev, content_type: e.target.value } : null)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="video">Video (YouTube)</option>
                  <option value="audio">Audio (YouTube)</option>
                  <option value="document">Document (Google Drive)</option>
                  <option value="text">Text Content</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content-url">Content URL</Label>
                <Input
                  id="edit-content-url"
                  value={editingTraining.content_url}
                  onChange={(e) => setEditingTraining(prev => prev ? { ...prev, content_url: e.target.value } : null)}
                  placeholder="Enter YouTube or Google Drive URL"
                />
                <p className="text-xs text-gray-500">
                  For YouTube: Use unlisted video links. For Google Drive: Use shareable links
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="edit-duration">Duration (min)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editingTraining.duration_minutes}
                    onChange={(e) => setEditingTraining(prev => prev ? { ...prev, duration_minutes: parseInt(e.target.value) } : null)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-pass-mark">Pass Mark (%)</Label>
                  <Input
                    id="edit-pass-mark"
                    type="number"
                    value={editingTraining.pass_mark}
                    onChange={(e) => setEditingTraining(prev => prev ? { ...prev, pass_mark: parseInt(e.target.value) } : null)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-max-attempts">Max Attempts</Label>
                  <Input
                    id="edit-max-attempts"
                    type="number"
                    value={editingTraining.max_attempts}
                    onChange={(e) => setEditingTraining(prev => prev ? { ...prev, max_attempts: parseInt(e.target.value) } : null)}
                  />
                </div>
              </div>

              <Button 
                onClick={() => updateTrainingMutation.mutate(editingTraining)}
                disabled={!editingTraining.title || !editingTraining.content_url}
                className="w-full"
              >
                Update Training
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Training Requests ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="trainings">All Trainings</TabsTrigger>
          <TabsTrigger value="history">Request History</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No pending training requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {request.employee.first_name} {request.employee.last_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{request.employee.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Requested by: {request.requester.first_name} {request.requester.last_name}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Recommended Training Type</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {request.recommended_training_type.replace('_', ' ')}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium">Justification</h4>
                        <p className="text-sm text-gray-600">{request.justification}</p>
                      </div>

                      <div className="flex space-x-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              processRequestMutation.mutate({
                                requestId: request.id,
                                action: 'approve',
                                trainingId: e.target.value
                              });
                            }
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Select training to assign...</option>
                          {trainings?.filter(t => t.is_active).map(training => (
                            <option key={training.id} value={training.id}>
                              {training.title}
                            </option>
                          ))}
                        </select>
                        
                        <Button
                          variant="outline"
                          onClick={() => processRequestMutation.mutate({
                            requestId: request.id,
                            action: 'reject'
                          })}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trainings" className="space-y-4">
          <div className="grid gap-4">
            {trainings?.map((training) => (
              <Card key={training.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        {getContentTypeIcon(training.content_type)}
                        <span>{training.title}</span>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={training.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {training.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEditTraining(training)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {training.is_active && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will deactivate the training "{training.title}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTraining(training.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-gray-600">{training.duration_minutes} min</p>
                    </div>
                    <div>
                      <span className="font-medium">Pass Mark:</span>
                      <p className="text-gray-600">{training.pass_mark}%</p>
                    </div>
                    <div>
                      <span className="font-medium">Max Attempts:</span>
                      <p className="text-gray-600">{training.max_attempts}</p>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <p className="text-gray-600 capitalize">{training.content_type}</p>
                    </div>
                  </div>
                  {training.content_url && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">URL:</span> {training.content_url}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4">
            {processedRequests.map((request) => (
              <Card key={request.id} className={`border-l-4 ${
                request.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {request.employee.first_name} {request.employee.last_name}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        {request.recommended_training_type.replace('_', ' ')} • {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}