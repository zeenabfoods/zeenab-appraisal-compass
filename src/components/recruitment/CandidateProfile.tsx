import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Candidate } from "./mockData";
import { RadarChartComparison } from "./RadarChartComparison";
import { MatchScoreCircle } from "./MatchScoreCircle";
import { DocumentPreview } from "./DocumentPreview";
import { BoardEvaluationPanel } from "./BoardEvaluationPanel";
import { FileText, Mail, Phone, Briefcase } from "lucide-react";
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Document & Extraction (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Extracted Header Data */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                    <FileText className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium text-sm truncate">{candidate.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                    <Mail className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm truncate">{candidate.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                    <Phone className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium text-sm whitespace-nowrap">{candidate.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                    <Briefcase className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Current Role</p>
                    <p className="font-medium text-sm truncate">{candidate.currentRole}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Preview */}
          <DocumentPreview candidateName={candidate.name} />
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

          {/* Board Evaluation Panel */}
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
        </div>
      </div>
    </div>
  );
}
