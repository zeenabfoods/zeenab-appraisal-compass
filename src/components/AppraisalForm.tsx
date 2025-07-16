import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuthContext } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast";
import { formatCycleName } from '@/utils/cycleFormatting';

interface AppraisalQuestion {
  id: string;
  question_text: string;
  weight: number;
  section_id: string;
  appraisal_question_sections: {
    name: string;
  };
}

interface AppraisalResponse {
  id?: string;
  question_id: string;
  emp_rating: number | null;
  mgr_rating: number | null;
  emp_comment: string;
  mgr_comment: string;
  question?: AppraisalQuestion;
}

interface AppraisalData {
  id?: string;
  employee_id: string;
  cycle_id: string;
  status: string;
  goals: string;
  training_needs: string;
  noteworthy: string;
  emp_comments: string;
  mgr_comments: string;
  overall_score: number | null;
  performance_band: string;
  responses: AppraisalResponse[];
  employee_submitted_at: string | null;
  manager_reviewed_at: string | null;
  cycle: {
    name: string;
    quarter: number;
    year: number;
  };
  employee: {
    first_name: string;
    last_name: string;
    position: string;
    email: string;
    department: {
      name: string;
    };
  };
}

export function AppraisalForm() {
  const { appraisalId } = useParams<{ appraisalId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [appraisalData, setAppraisalData] = useState<AppraisalData | null>(null);
  const [responses, setResponses] = useState<AppraisalResponse[]>([]);
  const [goals, setGoals] = useState('');
  const [trainingNeeds, setTrainingNeeds] = useState('');
  const [noteworthy, setNoteworthy] = useState('');
  const [empComments, setEmpComments] = useState('');
  const [mgrComments, setMgrComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fetch appraisal data
  const { data: appraisalQuery, isLoading } = useQuery({
    queryKey: ['appraisal', appraisalId],
    queryFn: async (): Promise<AppraisalData> => {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, quarter, year),
          employee:profiles(
            first_name,
            last_name,
            position,
            email,
            department:departments(name)
          )
        `)
        .eq('id', appraisalId)
        .single();

      if (error) {
        console.error("Error fetching appraisal:", error);
        throw error;
      }

      return data as AppraisalData;
    },
    enabled: !!appraisalId,
    onSuccess: (data) => {
      setAppraisalData(data);
      setGoals(data?.goals || '');
      setTrainingNeeds(data?.training_needs || '');
      setNoteworthy(data?.noteworthy || '');
      setEmpComments(data?.emp_comments || '');
      setMgrComments(data?.mgr_comments || '');
    }
  });

  // Fetch appraisal responses
  const { data: responsesQuery } = useQuery({
    queryKey: ['appraisal-responses', appraisalId],
    queryFn: async () => {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      const { data, error } = await supabase
        .from('appraisal_responses')
        .select(`
          *,
          question:appraisal_questions(
            id,
            question_text,
            weight,
            section_id,
            appraisal_question_sections(name)
          )
        `)
        .eq('appraisal_id', appraisalId);

      if (error) {
        console.error("Error fetching appraisal responses:", error);
        throw error;
      }

      return data as AppraisalResponse[];
    },
    enabled: !!appraisalId,
    onSuccess: (data) => {
      setResponses(data);
    }
  });

  useEffect(() => {
    if (responsesQuery) {
      setResponses(responsesQuery);
    }
  }, [responsesQuery]);

  const updateResponseMutation = useMutation(
    async (updatedResponse: AppraisalResponse) => {
      if (!updatedResponse.id) {
        // If the response doesn't have an ID, it's a new response
        const { data, error } = await supabase
          .from('appraisal_responses')
          .insert([
            {
              appraisal_id: appraisalId,
              question_id: updatedResponse.question_id,
              emp_rating: updatedResponse.emp_rating,
              mgr_rating: updatedResponse.mgr_rating,
              emp_comment: updatedResponse.emp_comment,
              mgr_comment: updatedResponse.mgr_comment,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Error creating appraisal response:", error);
          throw error;
        }

        return data as AppraisalResponse;
      } else {
        // If the response has an ID, it's an existing response
        const { data, error } = await supabase
          .from('appraisal_responses')
          .update({
            emp_rating: updatedResponse.emp_rating,
            mgr_rating: updatedResponse.mgr_rating,
            emp_comment: updatedResponse.emp_comment,
            mgr_comment: updatedResponse.mgr_comment,
          })
          .eq('id', updatedResponse.id)
          .select()
          .single();

        if (error) {
          console.error("Error updating appraisal response:", error);
          throw error;
        }

        return data as AppraisalResponse;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['appraisal-responses', appraisalId] });
      },
      onError: (error) => {
        console.error("Error updating appraisal response:", error);
        toast({
          title: "Error",
          description: "Failed to update appraisal response. Please try again.",
          variant: "destructive"
        });
      }
    }
  );

  const handleResponseChange = (responseId: string, field: string, value: any) => {
    setResponses((prevResponses) =>
      prevResponses.map((response) => {
        if (response.id === responseId) {
          return { ...response, [field]: value };
        }
        return response;
      })
    );
  };

  const handleSaveResponse = async (response: AppraisalResponse) => {
    try {
      await updateResponseMutation.mutateAsync(response);
      toast({
        title: "Success",
        description: "Appraisal response saved successfully."
      });
    } catch (error) {
      console.error("Error saving appraisal response:", error);
      toast({
        title: "Error",
        description: "Failed to save appraisal response. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case 'goals':
        setGoals(value);
        break;
      case 'training_needs':
        setTrainingNeeds(value);
        break;
      case 'noteworthy':
        setNoteworthy(value);
        break;
      case 'emp_comments':
        setEmpComments(value);
        break;
      case 'mgr_comments':
        setMgrComments(value);
        break;
      default:
        break;
    }
  };

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      const { error } = await supabase
        .from('appraisals')
        .update({
          goals: goals,
          training_needs: trainingNeeds,
          noteworthy: noteworthy,
          emp_comments: empComments,
          mgr_comments: mgrComments,
        })
        .eq('id', appraisalId);

      if (error) {
        console.error("Error updating appraisal:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Appraisal saved successfully."
      });
    } catch (error) {
      console.error("Error updating appraisal:", error);
      toast({
        title: "Error",
        description: "Failed to save appraisal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!appraisalId) throw new Error("Appraisal ID is required");

      // Submit the appraisal
      const { error: submitError } = await supabase
        .from('appraisals')
        .update({
          status: 'submitted' as any, // Type assertion to fix the TypeScript error
          employee_submitted_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        })
        .eq('id', appraisalId);

      if (submitError) {
        console.error("Error submitting appraisal:", submitError);
        throw submitError;
      }

      toast({
        title: "Success",
        description: "Appraisal submitted successfully."
      });
      navigate('/dashboard');
    } catch (error) {
      console.error("Error submitting appraisal:", error);
      toast({
        title: "Error",
        description: "Failed to submit appraisal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = () => {
    setIsConfirmOpen(true);
  };

  const handleCancelSubmit = () => {
    setIsConfirmOpen(false);
  };

  if (isLoading || !appraisalQuery) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Appraisal Details Header */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <CardTitle className="text-blue-600 text-lg font-semibold">
                    {appraisalQuery?.employee?.first_name} {appraisalQuery?.employee?.last_name}
                  </CardTitle>
                </div>
                <div>
                  <p className="text-gray-600 text-lg">{appraisalQuery?.employee?.position}</p>
                  <p className="text-sm text-gray-500">
                    {appraisalQuery?.employee?.email} • {appraisalQuery?.employee?.department?.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                  {appraisalQuery?.status}
                </Badge>
                <p className="text-sm text-gray-500 mt-2">
                  {formatCycleName(appraisalQuery?.cycle)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Appraisal Form */}
        <div className="grid md:grid-cols-2 gap-6">
          {responses?.map((response) => (
            <Card key={response.id || uuidv4()}>
              <CardHeader>
                <CardTitle>{response.question?.question_text}</CardTitle>
                <p className="text-sm text-gray-500">
                  Section: {response.question?.appraisal_question_sections?.name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`employee-rating-${response.id}`}>Your Rating</Label>
                  <Select
                    id={`employee-rating-${response.id}`}
                    value={response.emp_rating !== null ? response.emp_rating.toString() : ''}
                    onValueChange={(value) =>
                      handleResponseChange(response.id || '', 'emp_rating', parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Poor</SelectItem>
                      <SelectItem value="2">2 - Fair</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`employee-comment-${response.id}`}>Your Comment</Label>
                  <Textarea
                    id={`employee-comment-${response.id}`}
                    placeholder="Enter your comment"
                    value={response.emp_comment || ''}
                    onChange={(e) =>
                      handleResponseChange(response.id || '', 'emp_comment', e.target.value)
                    }
                  />
                </div>
                <Button onClick={() => handleSaveResponse(response)} disabled={isSubmitting}>
                  Save Response
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Sections */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goals">Goals</Label>
                <Textarea
                  id="goals"
                  placeholder="Enter your goals"
                  value={goals}
                  onChange={(e) => handleInputChange('goals', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="training-needs">Training Needs</Label>
                <Textarea
                  id="training-needs"
                  placeholder="Enter your training needs"
                  value={trainingNeeds}
                  onChange={(e) => handleInputChange('training_needs', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="noteworthy">Noteworthy Achievements</Label>
              <Textarea
                id="noteworthy"
                placeholder="Enter any noteworthy achievements"
                value={noteworthy}
                onChange={(e) => handleInputChange('noteworthy', e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee-comments">Additional Comments</Label>
                <Textarea
                  id="employee-comments"
                  placeholder="Enter any additional comments"
                  value={empComments}
                  onChange={(e) => handleInputChange('emp_comments', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-comments">Manager Comments</Label>
                <Textarea
                  id="manager-comments"
                  placeholder="Enter any comments for the manager"
                  value={mgrComments}
                  onChange={(e) => handleInputChange('mgr_comments', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <div>
            <Button className="mr-2" onClick={handleSaveChanges} disabled={isSubmitting}>
              Save Changes
            </Button>
            <Button onClick={handleConfirmSubmit} disabled={isSubmitting}>
              Submit Appraisal
            </Button>
          </div>
        </div>

        {/* Confirm Submit Dialog */}
        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Please ensure all information is correct
                before submitting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelSubmit}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
