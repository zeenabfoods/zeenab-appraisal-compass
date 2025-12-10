import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Candidate } from "./mockData";
import { RadarChartComparison } from "./RadarChartComparison";
import { MatchScoreCircle } from "./MatchScoreCircle";
import { DocumentPreview } from "./DocumentPreview";
import { FileText, Mail, Phone, Briefcase, CheckCircle, XCircle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

interface CandidateProfileProps {
  candidate: Candidate;
  keywords: string[];
  onHire: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
}

export function CandidateProfile({ candidate, keywords, onHire, onReject }: CandidateProfileProps) {
  const { toast } = useToast();
  const [boardScores, setBoardScores] = useState({
    technicalProficiency: candidate.boardScores?.technicalProficiency || 5,
    relevantExperience: candidate.boardScores?.relevantExperience || 5,
    culturalFit: candidate.boardScores?.culturalFit || 5,
    problemSolving: candidate.boardScores?.problemSolving || 5,
    leadership: candidate.boardScores?.leadership || 5
  });
  const [comments, setComments] = useState(candidate.boardComments || "");

  useEffect(() => {
    setBoardScores({
      technicalProficiency: candidate.boardScores?.technicalProficiency || 5,
      relevantExperience: candidate.boardScores?.relevantExperience || 5,
      culturalFit: candidate.boardScores?.culturalFit || 5,
      problemSolving: candidate.boardScores?.problemSolving || 5,
      leadership: candidate.boardScores?.leadership || 5
    });
    setComments(candidate.boardComments || "");
  }, [candidate.id]);

  const totalBoardScore = Object.values(boardScores).reduce((a, b) => a + b, 0);
  const maxScore = 50;

  const handleHire = () => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF5722', '#FF9800', '#4CAF50', '#2196F3']
    });
    
    onHire(candidate.id);
    toast({
      title: "Candidate Selected!",
      description: `${candidate.name} has been selected for hire.`,
    });
  };

  const handleReject = () => {
    onReject(candidate.id);
    toast({
      title: "Candidate Rejected",
      description: `${candidate.name} has been marked as rejected.`,
      variant: "destructive"
    });
  };

  const handleScoreChange = (key: keyof typeof boardScores, value: number[]) => {
    setBoardScores(prev => ({ ...prev, [key]: value[0] }));
  };

  const isActionDisabled = candidate.status === 'hired' || candidate.status === 'rejected';

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
                  <div className="p-2 rounded-lg bg-orange-50">
                    <FileText className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium text-sm">{candidate.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50">
                    <Mail className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm truncate">{candidate.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50">
                    <Phone className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium text-sm">{candidate.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-orange-50">
                    <Briefcase className="h-4 w-4 text-recruitment-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current Role</p>
                    <p className="font-medium text-sm">{candidate.currentRole}</p>
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

          {/* Board Scoring Panel */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Board Evaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'technicalProficiency', label: 'Technical Proficiency' },
                { key: 'relevantExperience', label: 'Relevant Experience' },
                { key: 'culturalFit', label: 'Cultural Fit' },
                { key: 'problemSolving', label: 'Problem Solving' },
                { key: 'leadership', label: 'Leadership' }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium text-recruitment-primary">
                      {boardScores[key as keyof typeof boardScores]}/10
                    </span>
                  </div>
                  <Slider
                    value={[boardScores[key as keyof typeof boardScores]]}
                    onValueChange={(value) => handleScoreChange(key as keyof typeof boardScores, value)}
                    max={10}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>
              ))}

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Board Score</span>
                  <span className="text-2xl font-bold text-recruitment-primary">
                    {totalBoardScore}/{maxScore}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Zone */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Board Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add evaluation notes and comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[100px] resize-none"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleReject}
                  disabled={isActionDisabled}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="flex-1 gap-2 bg-recruitment-primary hover:bg-recruitment-primary/90"
                  onClick={handleHire}
                  disabled={isActionDisabled}
                >
                  <CheckCircle className="h-4 w-4" />
                  Select for Hire
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
