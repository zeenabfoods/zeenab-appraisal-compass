import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Users, Trophy, TrendingUp, Star, PartyPopper } from "lucide-react";
import { DbEvaluation } from "@/hooks/useRecruitmentData";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface HireDecisionScreenProps {
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  candidateStatus: string;
  matchScore: number;
  evaluations: DbEvaluation[];
  passingThreshold: number;
  isHROrAdmin: boolean;
  onHire: () => void;
  onReject: () => void;
}

export function HireDecisionScreen({
  candidateId,
  candidateName,
  candidateRole,
  candidateStatus,
  matchScore,
  evaluations,
  passingThreshold,
  isHROrAdmin,
  onHire,
  onReject
}: HireDecisionScreenProps) {
  const submittedEvaluations = evaluations.filter(e => e.submitted_at);
  const maxScore = 50;
  
  // Calculate average score
  const avgScore = submittedEvaluations.length > 0
    ? Math.round(submittedEvaluations.reduce((sum, e) => sum + e.total_score, 0) / submittedEvaluations.length)
    : 0;
  const avgPercentage = Math.round((avgScore / maxScore) * 100);
  const passesThreshold = avgPercentage >= passingThreshold;

  // Category scores
  const categoryAverages = {
    technical: submittedEvaluations.length > 0 
      ? (submittedEvaluations.reduce((sum, e) => sum + e.technical_proficiency, 0) / submittedEvaluations.length).toFixed(1)
      : 0,
    experience: submittedEvaluations.length > 0
      ? (submittedEvaluations.reduce((sum, e) => sum + e.relevant_experience, 0) / submittedEvaluations.length).toFixed(1)
      : 0,
    cultural: submittedEvaluations.length > 0
      ? (submittedEvaluations.reduce((sum, e) => sum + e.cultural_fit, 0) / submittedEvaluations.length).toFixed(1)
      : 0,
    problem: submittedEvaluations.length > 0
      ? (submittedEvaluations.reduce((sum, e) => sum + e.problem_solving, 0) / submittedEvaluations.length).toFixed(1)
      : 0,
    leadership: submittedEvaluations.length > 0
      ? (submittedEvaluations.reduce((sum, e) => sum + e.leadership, 0) / submittedEvaluations.length).toFixed(1)
      : 0,
  };

  const isDecisionMade = candidateStatus === 'hired' || candidateStatus === 'rejected' || candidateStatus === 'selected';

  const handleHire = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FF5722', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0']
    });
    onHire();
  };

  if (submittedEvaluations.length === 0) {
    return (
      <Card className="shadow-sm border-dashed border-2 border-muted">
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Awaiting Board Evaluations</h3>
          <p className="text-muted-foreground text-sm">
            No board member evaluations have been submitted yet. 
            Once evaluations are submitted, the final hire decision can be made here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg overflow-hidden">
        {/* Header with gradient */}
        <div className={cn(
          "p-6 text-white",
          passesThreshold 
            ? "bg-gradient-to-r from-green-500 to-emerald-600" 
            : "bg-gradient-to-r from-orange-500 to-amber-600"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{candidateName}</h2>
              <p className="text-white/80">{candidateRole}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                {passesThreshold ? (
                  <Trophy className="h-6 w-6 text-yellow-300" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-white/70" />
                )}
                <span className="text-4xl font-bold">{avgPercentage}%</span>
              </div>
              <p className="text-sm text-white/80">
                Board Average • Threshold: {passingThreshold}%
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Status Badge */}
          {isDecisionMade && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex justify-center"
            >
              <Badge 
                className={cn(
                  "text-lg py-2 px-6",
                  candidateStatus === 'hired' ? "bg-green-500 hover:bg-green-600" :
                  candidateStatus === 'selected' ? "bg-blue-500 hover:bg-blue-600" :
                  "bg-red-500 hover:bg-red-600"
                )}
              >
                {candidateStatus === 'hired' && <PartyPopper className="h-5 w-5 mr-2" />}
                {candidateStatus.charAt(0).toUpperCase() + candidateStatus.slice(1)}
              </Badge>
            </motion.div>
          )}

          {/* Score Breakdown */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Technical', value: categoryAverages.technical },
              { label: 'Experience', value: categoryAverages.experience },
              { label: 'Cultural Fit', value: categoryAverages.cultural },
              { label: 'Problem Solving', value: categoryAverages.problem },
              { label: 'Leadership', value: categoryAverages.leadership },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-recruitment-primary">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Board Member Votes */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-recruitment-primary" />
              Board Member Scores ({submittedEvaluations.length})
            </h3>
            <div className="space-y-2">
              {submittedEvaluations.map((evaluation) => {
                const evalPercent = Math.round((evaluation.total_score / maxScore) * 100);
                return (
                  <div key={evaluation.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-recruitment-primary/20 text-recruitment-primary">
                          {evaluation.evaluator?.first_name?.[0]}{evaluation.evaluator?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {evaluation.evaluator?.first_name} {evaluation.evaluator?.last_name}
                        </p>
                        {evaluation.comments && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            "{evaluation.comments}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                        evalPercent >= passingThreshold 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      )}>
                        <Star className="h-3 w-3" />
                        {evaluation.total_score}/{maxScore}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HR/Admin Decision Buttons - Only HR can make final decisions */}
          {isHROrAdmin && !isDecisionMade && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-center">Final Decision (HR Only)</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Based on board member evaluations, HR makes the final selection decision.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 h-10 text-sm border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    onClick={onReject}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      "flex-1 gap-1.5 h-10 text-sm",
                      passesThreshold
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-recruitment-primary hover:bg-recruitment-primary/90"
                    )}
                    onClick={handleHire}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {passesThreshold ? "Select" : "Select Anyway"}
                  </Button>
                </div>
                {!passesThreshold && (
                  <p className="text-center text-sm text-muted-foreground">
                    ⚠️ Candidate is below the {passingThreshold}% threshold but can still be selected if desired
                  </p>
                )}
              </div>
            </>
          )}

          {/* Message for non-HR users */}
          {!isHROrAdmin && !isDecisionMade && submittedEvaluations.length > 0 && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Only HR can make the final hire decision based on board evaluations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
