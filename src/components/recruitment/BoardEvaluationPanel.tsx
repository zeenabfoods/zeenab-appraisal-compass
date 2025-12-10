import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Users, CheckCircle, XCircle, Send } from "lucide-react";
import { DbEvaluation } from "@/hooks/useRecruitmentData";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

interface BoardEvaluationPanelProps {
  candidateId: string;
  candidateName: string;
  candidateStatus: string;
  evaluations: DbEvaluation[];
  currentUserId: string;
  isHROrAdmin: boolean;
  passingThreshold: number;
  onSubmitEvaluation: (evaluation: {
    candidate_id: string;
    technical_proficiency: number;
    relevant_experience: number;
    cultural_fit: number;
    problem_solving: number;
    leadership: number;
    comments?: string;
  }) => Promise<void>;
  onHire: () => void;
  onReject: () => void;
}

export function BoardEvaluationPanel({
  candidateId,
  candidateName,
  candidateStatus,
  evaluations,
  currentUserId,
  isHROrAdmin,
  passingThreshold,
  onSubmitEvaluation,
  onHire,
  onReject
}: BoardEvaluationPanelProps) {
  const { toast } = useToast();
  
  // Find current user's evaluation
  const myEvaluation = evaluations.find(e => e.evaluator_id === currentUserId);
  
  const [scores, setScores] = useState({
    technical_proficiency: myEvaluation?.technical_proficiency || 5,
    relevant_experience: myEvaluation?.relevant_experience || 5,
    cultural_fit: myEvaluation?.cultural_fit || 5,
    problem_solving: myEvaluation?.problem_solving || 5,
    leadership: myEvaluation?.leadership || 5
  });
  const [comments, setComments] = useState(myEvaluation?.comments || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (myEvaluation) {
      setScores({
        technical_proficiency: myEvaluation.technical_proficiency,
        relevant_experience: myEvaluation.relevant_experience,
        cultural_fit: myEvaluation.cultural_fit,
        problem_solving: myEvaluation.problem_solving,
        leadership: myEvaluation.leadership
      });
      setComments(myEvaluation.comments || "");
    } else {
      setScores({
        technical_proficiency: 5,
        relevant_experience: 5,
        cultural_fit: 5,
        problem_solving: 5,
        leadership: 5
      });
      setComments("");
    }
  }, [candidateId, myEvaluation]);

  const myTotalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxScore = 50;
  const myPercentage = Math.round((myTotalScore / maxScore) * 100);

  // Calculate aggregated scores from all evaluations
  const submittedEvaluations = evaluations.filter(e => e.submitted_at);
  const avgScore = submittedEvaluations.length > 0
    ? Math.round(submittedEvaluations.reduce((sum, e) => sum + e.total_score, 0) / submittedEvaluations.length)
    : 0;
  const avgPercentage = Math.round((avgScore / maxScore) * 100);
  const passesThreshold = avgPercentage >= passingThreshold;

  const isActionDisabled = candidateStatus === 'selected' || candidateStatus === 'rejected' || candidateStatus === 'hired';

  const handleSubmitEvaluation = async () => {
    setSubmitting(true);
    try {
      await onSubmitEvaluation({
        candidate_id: candidateId,
        ...scores,
        comments: comments || undefined
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleHire = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF5722', '#FF9800', '#4CAF50', '#2196F3']
    });
    onHire();
  };

  return (
    <div className="space-y-4">
      {/* Board Members Summary */}
      {submittedEvaluations.length > 0 && (
        <Card className="shadow-sm border-recruitment-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-recruitment-primary" />
              Board Scores ({submittedEvaluations.length} member{submittedEvaluations.length > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submittedEvaluations.map((evaluation) => (
                <div key={evaluation.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-recruitment-primary/20 text-recruitment-primary text-xs">
                        {evaluation.evaluator?.first_name?.[0]}{evaluation.evaluator?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {evaluation.evaluator?.first_name} {evaluation.evaluator?.last_name}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {evaluation.total_score}/{maxScore}
                  </Badge>
                </div>
              ))}
              
              <Separator className="my-3" />
              
              <div className="flex items-center justify-between">
                <span className="font-semibold">Average Score</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${passesThreshold ? 'text-green-600' : 'text-orange-500'}`}>
                    {avgPercentage}%
                  </span>
                  {passesThreshold ? (
                    <Badge className="bg-green-500">Passes</Badge>
                  ) : (
                    <Badge variant="secondary">Below Threshold</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Evaluation */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {myEvaluation?.submitted_at ? "My Evaluation" : "Submit Your Evaluation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'technical_proficiency', label: 'Technical Proficiency' },
            { key: 'relevant_experience', label: 'Relevant Experience' },
            { key: 'cultural_fit', label: 'Cultural Fit' },
            { key: 'problem_solving', label: 'Problem Solving' },
            { key: 'leadership', label: 'Leadership' }
          ].map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium text-recruitment-primary">
                  {scores[key as keyof typeof scores]}/10
                </span>
              </div>
              <Slider
                value={[scores[key as keyof typeof scores]]}
                onValueChange={(value) => setScores(prev => ({ ...prev, [key]: value[0] }))}
                max={10}
                step={1}
                className="cursor-pointer"
              />
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">My Total Score</span>
              <span className="text-2xl font-bold text-recruitment-primary">
                {myTotalScore}/{maxScore} ({myPercentage}%)
              </span>
            </div>
            
            <Textarea
              placeholder="Add evaluation notes and comments..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[80px] resize-none mb-4"
            />

            <Button
              onClick={handleSubmitEvaluation}
              disabled={submitting}
              className="w-full gap-2 bg-recruitment-primary hover:bg-recruitment-primary/90"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : myEvaluation?.submitted_at ? "Update Evaluation" : "Submit Evaluation"}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
