import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CandidateList } from "@/components/recruitment/CandidateList";
import { CandidateProfile } from "@/components/recruitment/CandidateProfile";
import { KeywordBankDialog } from "@/components/recruitment/KeywordBankDialog";
import { UploadResumeDialog } from "@/components/recruitment/UploadResumeDialog";
import { Button } from "@/components/ui/button";
import { Settings2, Upload } from "lucide-react";
import { Candidate, mockCandidates } from "@/components/recruitment/mockData";

export default function Recruitment() {
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [keywords, setKeywords] = useState<string[]>(["React", "TypeScript", "Node.js", "SQL", "Leadership"]);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleUploadComplete = (newCandidate: Candidate) => {
    setCandidates(prev => [newCandidate, ...prev]);
    setSelectedCandidate(newCandidate);
    setUploadDialogOpen(false);
  };

  const handleHireCandidate = (candidateId: string) => {
    setCandidates(prev => 
      prev.map(c => c.id === candidateId ? { ...c, status: 'hired' as const } : c)
    );
    if (selectedCandidate?.id === candidateId) {
      setSelectedCandidate(prev => prev ? { ...prev, status: 'hired' as const } : null);
    }
  };

  const handleRejectCandidate = (candidateId: string) => {
    setCandidates(prev => 
      prev.map(c => c.id === candidateId ? { ...c, status: 'rejected' as const } : c)
    );
    if (selectedCandidate?.id === candidateId) {
      setSelectedCandidate(prev => prev ? { ...prev, status: 'rejected' as const } : null);
    }
  };

  return (
    <DashboardLayout pageTitle="Recruitment">
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h1 className="text-xl font-semibold text-foreground">Candidate Cockpit</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setKeywordDialogOpen(true)}
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Keyword Bank
            </Button>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="gap-2 bg-recruitment-primary hover:bg-recruitment-primary/90 text-white"
            >
              <Upload className="h-4 w-4" />
              Upload Resume
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Candidate List */}
          <div className="w-80 border-r bg-gray-50/50 overflow-y-auto">
            <CandidateList
              candidates={candidates}
              selectedCandidate={selectedCandidate}
              onSelect={handleCandidateSelect}
            />
          </div>

          {/* Main View */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30">
            {selectedCandidate ? (
              <CandidateProfile
                candidate={selectedCandidate}
                keywords={keywords}
                onHire={handleHireCandidate}
                onReject={handleRejectCandidate}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg">Select a candidate to view their profile</p>
                  <p className="text-sm mt-2">Or upload a new resume to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <KeywordBankDialog
        open={keywordDialogOpen}
        onOpenChange={setKeywordDialogOpen}
        keywords={keywords}
        onKeywordsChange={setKeywords}
      />

      <UploadResumeDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />
    </DashboardLayout>
  );
}
