import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Candidate } from "./mockData";
import { RadarChartComparison } from "./RadarChartComparison";
import { MatchScoreCircle } from "./MatchScoreCircle";
import { ResumePreview } from "./ResumePreview";
import { CandidateInfoCard } from "./CandidateInfoCard";
import { BoardEvaluationPanel } from "./BoardEvaluationPanel";
import { HireDecisionScreen } from "./HireDecisionScreen";
import { FileText, Mail, Phone, Briefcase, ClipboardCheck, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { DbEvaluation } from "@/hooks/useRecruitmentData";

interface CandidateProfileProps {
  candidate: Candidate;
  keywords: string[];
  evaluations: DbEvaluation[];
  currentUserId: string;
  isHROrAdmin: boolean;
  passingThreshold: number;
  onHire: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
  onSubmitEvaluation: (evaluation: {
    candidate_id: string;
    technical_proficiency: number;
    relevant_experience: number;
    cultural_fit: number;
    problem_solving: number;
    leadership: number;
    comments?: string;
  }) => Promise<void>;
}

export function CandidateProfile({ 
  candidate, 
  keywords, 
  evaluations,
  currentUserId,
  isHROrAdmin,
  passingThreshold,
  onHire, 
  onReject,
  onSubmitEvaluation
}: CandidateProfileProps) {
  // Calculate years of experience from skills
  const yearsOfExperience = candidate.skills?.experience 
    ? Math.round(candidate.skills.experience / 10) 
    : undefined;

  // Check if evaluations exist
  const hasEvaluations = evaluations.filter(e => e.submitted_at).length > 0;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Document & Extraction (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Enhanced Info Card with hover animations */}
          <CandidateInfoCard
            name={candidate.name}
            email={candidate.email}
            phone={candidate.phone}
            currentRole={candidate.currentRole}
            yearsOfExperience={yearsOfExperience}
          />

          {/* Resume Preview with actual candidate data */}
          <ResumePreview candidate={candidate} />
        </div>

        {/* Right Column - Evaluation Dashboard (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header with Match Score */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{candidate.name}</h2>
                  <p className="text-muted-foreground">{candidate.currentRole}</p>
                  {candidate.status !== 'pending' && (
                    <Badge 
                      className={cn(
                        "mt-2",
                        candidate.status === 'hired' ? "bg-green-500" : 
                        candidate.status === 'rejected' ? "bg-red-500" : "bg-orange-500"
                      )}
                    >
                      {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                    </Badge>
                  )}
                </div>
                <MatchScoreCircle score={candidate.matchScore} />
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Skills Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <RadarChartComparison skills={candidate.skills} />
            </CardContent>
          </Card>

          {/* Keyword Match */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Keyword Match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {candidate.foundKeywords.map((keyword) => (
                  <Badge key={keyword} className="bg-green-500 hover:bg-green-600">
                    {keyword}
                  </Badge>
                ))}
                {candidate.missingKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="line-through text-muted-foreground">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabbed Evaluation & Decision Area */}
          <Tabs defaultValue={hasEvaluations ? "decision" : "evaluate"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evaluate" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Evaluate
              </TabsTrigger>
              <TabsTrigger value="decision" className="gap-2">
                <Award className="h-4 w-4" />
                Hire Decision
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="evaluate" className="mt-4">
              <BoardEvaluationPanel
                candidateId={candidate.id}
                candidateName={candidate.name}
                candidateStatus={candidate.status}
                evaluations={evaluations}
                currentUserId={currentUserId}
                isHROrAdmin={isHROrAdmin}
                passingThreshold={passingThreshold}
                onSubmitEvaluation={onSubmitEvaluation}
                onHire={() => onHire(candidate.id)}
                onReject={() => onReject(candidate.id)}
              />
            </TabsContent>
            
            <TabsContent value="decision" className="mt-4">
              <HireDecisionScreen
                candidateId={candidate.id}
                candidateName={candidate.name}
                candidateRole={candidate.currentRole}
                candidateStatus={candidate.status}
                matchScore={candidate.matchScore}
                evaluations={evaluations}
                passingThreshold={passingThreshold}
                isHROrAdmin={isHROrAdmin}
                onHire={() => onHire(candidate.id)}
                onReject={() => onReject(candidate.id)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
