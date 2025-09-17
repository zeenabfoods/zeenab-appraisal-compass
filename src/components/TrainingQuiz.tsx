import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Award,
  RefreshCw,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: string;
  points: number;
}

interface QuizAttempt {
  attempt_number: number;
  score_percentage: number;
  passed: boolean;
  completed_at: string;
}

interface TrainingQuizProps {
  assignmentId: string;
  trainingId: string;
  maxAttempts: number;
  passmark: number;
  onQuizComplete: () => void;
}

export function TrainingQuiz({ 
  assignmentId, 
  trainingId, 
  maxAttempts, 
  passmark, 
  onQuizComplete 
}: TrainingQuizProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  // Fetch quiz questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['training-quiz-questions', trainingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('training_quiz_questions')
        .select('*')
        .eq('training_id', trainingId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as QuizQuestion[];
    },
    enabled: !!trainingId
  });

  // Fetch previous attempts
  const { data: attempts } = useQuery({
    queryKey: ['quiz-attempts', assignmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quiz_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('attempt_number', { ascending: false });

      if (error) throw error;
      return data as QuizAttempt[];
    },
    enabled: !!assignmentId
  });

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: Record<string, string>) => {
      if (!questions) throw new Error('No questions available');

      const startTime = Date.now();
      let totalPoints = 0;
      let earnedPoints = 0;

      // Calculate score
      questions.forEach(question => {
        totalPoints += question.points;
        if (quizAnswers[question.id] === question.correct_answer) {
          earnedPoints += question.points;
        }
      });

      const scorePercentage = Math.round((earnedPoints / totalPoints) * 100);
      const passed = scorePercentage >= passmark;
      const attemptNumber = (attempts?.length || 0) + 1;

      // Save attempt
      const { error } = await (supabase as any)
        .from('quiz_attempts')
        .insert({
          assignment_id: assignmentId,
          attempt_number: attemptNumber,
          score_percentage: scorePercentage,
          passed,
          answers: quizAnswers,
          completed_at: new Date().toISOString(),
          time_taken_minutes: Math.round((Date.now() - startTime) / 60000)
        });

      if (error) throw error;

      // Update assignment status if passed
      if (passed) {
        await (supabase as any)
          .from('training_assignments')
          .update({ status: 'completed' })
          .eq('id', assignmentId);
      }

      return { scorePercentage, passed, attemptNumber };
    },
    onSuccess: (result) => {
      const { scorePercentage, passed, attemptNumber } = result;
      
      if (passed) {
        toast({
          title: "Congratulations!",
          description: `You passed the quiz with ${scorePercentage}%! Training completed successfully.`,
        });
      } else {
        const attemptsLeft = maxAttempts - attemptNumber;
        if (attemptsLeft > 0) {
          toast({
            title: "Quiz Failed",
            description: `You scored ${scorePercentage}%. You have ${attemptsLeft} attempt(s) remaining.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Quiz Failed - No Attempts Left",
            description: "You have exceeded the maximum number of attempts. A disciplinary panel will be arranged.",
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['training-assignments'] });
      onQuizComplete();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
      console.error('Quiz submission error:', error);
      setIsSubmitting(false);
    }
  });

  const handleSubmitQuiz = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    submitQuizMutation.mutate(answers);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mb-4" />
          <p className="text-gray-600">No quiz questions available for this training</p>
        </CardContent>
      </Card>
    );
  }

  const attemptsUsed = attempts?.length || 0;
  const attemptsRemaining = maxAttempts - attemptsUsed;
  const hasPassedAttempt = attempts?.some(attempt => attempt.passed);
  const canTakeQuiz = attemptsRemaining > 0 && !hasPassedAttempt;
  
  // Check if 3 failures trigger disciplinary panel
  const failureCount = attempts?.filter(attempt => !attempt.passed).length || 0;
  const needsDisciplinaryPanel = failureCount >= 3;

  if (hasPassedAttempt) {
    const passingAttempt = attempts?.find(attempt => attempt.passed);
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <Award className="h-5 w-5" />
            <span>Quiz Completed Successfully!</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-green-700">
              You passed the quiz with a score of <strong>{passingAttempt?.score_percentage}%</strong>
            </p>
            <p className="text-sm text-gray-600">
              Completed on: {passingAttempt ? new Date(passingAttempt.completed_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsDisciplinaryPanel) {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Users className="h-5 w-5" />
            <span>Disciplinary Panel Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have failed this quiz 3 times. A disciplinary panel has been scheduled to review your case. 
                Please contact HR for further instructions.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-gray-600">
              <p>Failed attempts: {failureCount}</p>
              <p>Maximum attempts allowed: {maxAttempts}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canTakeQuiz) {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <XCircle className="h-5 w-5" />
            <span>No Attempts Remaining</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-red-700">You have used all available quiz attempts.</p>
            <div className="text-sm text-gray-600">
              <p>Attempts used: {attemptsUsed} / {maxAttempts}</p>
              {attempts?.map((attempt, index) => (
                <div key={index} className="flex justify-between">
                  <span>Attempt {attempt.attempt_number}:</span>
                  <span className={attempt.passed ? 'text-green-600' : 'text-red-600'}>
                    {attempt.score_percentage}% {attempt.passed ? '(Passed)' : '(Failed)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quizStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Training Quiz</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Questions:</span>
                <p className="text-gray-600">{questions.length}</p>
              </div>
              <div>
                <span className="font-medium">Time Limit:</span>
                <p className="text-gray-600">30 minutes</p>
              </div>
              <div>
                <span className="font-medium">Pass Mark:</span>
                <p className="text-gray-600">{passmark}%</p>
              </div>
              <div>
                <span className="font-medium">Attempts Remaining:</span>
                <p className="text-gray-600">{attemptsRemaining}</p>
              </div>
            </div>

            {attempts && attempts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Previous Attempts:</h4>
                {attempts.map((attempt, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>Attempt {attempt.attempt_number}:</span>
                    <span className={attempt.passed ? 'text-green-600' : 'text-red-600'}>
                      {attempt.score_percentage}% {attempt.passed ? '(Passed)' : '(Failed)'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Once you start the quiz, you cannot pause or restart it. Make sure you have enough time to complete it.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setQuizStarted(true)}
              className="w-full"
              size="lg"
            >
              Start Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Question {currentQuestion + 1} of {questions.length}
          </CardTitle>
          <div className="flex items-center space-x-4">
            <Badge className={timeRemaining < 300 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(timeRemaining)}
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">{currentQ.question_text}</h3>
            
            {currentQ.question_type === 'multiple_choice' && currentQ.options && (
              <div className="space-y-2">
                {Object.entries(currentQ.options).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name={currentQ.id}
                      value={key}
                      checked={answers[currentQ.id] === key}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm">{value as string}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            {currentQuestion === questions.length - 1 ? (
              <Button
                onClick={handleSubmitQuiz}
                disabled={!allAnswered || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestion === questions.length - 1}
              >
                Next
              </Button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Answered: {Object.keys(answers).length} / {questions.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}