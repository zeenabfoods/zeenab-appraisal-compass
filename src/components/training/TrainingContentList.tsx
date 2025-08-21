
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, FileText, Headphones, ExternalLink, Edit, Trash2, Users, Clock, Target, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  created_by: string;
  assignment_count?: number;
}

export function TrainingContentList() {
  const { toast } = useToast();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainings')
        .select(`
          *,
          assignment_count:training_assignments(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainings(data || []);
    } catch (error: any) {
      console.error('Error fetching trainings:', error);
      toast({
        title: "Error",
        description: "Failed to load training content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return Video;
      case 'audio': return Headphones;
      case 'document': return FileText;
      case 'url': return ExternalLink;
      default: return FileText;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'audio': return 'bg-green-100 text-green-800';
      case 'document': return 'bg-purple-100 text-purple-800';
      case 'url': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeactivate = async (trainingId: string) => {
    try {
      const { error } = await supabase
        .from('trainings')
        .update({ is_active: false })
        .eq('id', trainingId);

      if (error) throw error;

      toast({
        title: "Training Deactivated",
        description: "Training has been deactivated successfully"
      });
      
      fetchTrainings();
    } catch (error: any) {
      console.error('Error deactivating training:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesSearch = training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         training.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = contentTypeFilter === 'all' || training.content_type === contentTypeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search training content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="url">External URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Training List */}
      <div className="grid gap-4">
        {filteredTrainings.map((training) => {
          const ContentIcon = getContentIcon(training.content_type);
          
          return (
            <Card key={training.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ContentIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{training.title}</CardTitle>
                      {training.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {training.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeactivate(training.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <Badge className={getContentTypeColor(training.content_type)}>
                    {training.content_type.charAt(0).toUpperCase() + training.content_type.slice(1)}
                  </Badge>
                  
                  {training.duration_minutes && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{training.duration_minutes} min</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{training.pass_mark}% pass mark</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{training.assignment_count || 0} assignments</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(training.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Preview Content
                    </Button>
                    <Button size="sm">
                      Assign to Employees
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTrainings.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Content Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || contentTypeFilter !== 'all' 
                ? 'No training content matches your current filters.'
                : 'Start by creating your first training content.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
