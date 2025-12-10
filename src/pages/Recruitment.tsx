import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CandidateList } from "@/components/recruitment/CandidateList";
import { CandidateProfile } from "@/components/recruitment/CandidateProfile";
import { KeywordBankDialog } from "@/components/recruitment/KeywordBankDialog";
import { UploadResumeDialog } from "@/components/recruitment/UploadResumeDialog";
import { RecruitmentSettingsDialog } from "@/components/recruitment/RecruitmentSettingsDialog";
import { DeleteAllCandidatesDialog } from "@/components/recruitment/DeleteAllCandidatesDialog";
import { CandidateStatusTabs } from "@/components/recruitment/CandidateStatusTabs";
import { Button } from "@/components/ui/button";
import { Settings2, Upload, Trash2, Loader2 } from "lucide-react";
import { Candidate, mockCandidates, generateNewCandidate } from "@/components/recruitment/mockData";
import { useRecruitmentData } from "@/hooks/useRecruitmentData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Recruitment() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    candidates: dbCandidates,
    settings,
    loading,
    isHROrAdmin,
    addCandidate,
    updateCandidateStatus,
    saveSettings,
    deleteAllCandidates,
    fetchEvaluations,
    evaluations,
    submitEvaluation
  } = useRecruitmentData();

  // Use mock data for now, will transition to DB later
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [keywords, setKeywords] = useState<string[]>(settings?.required_keywords || ["React", "TypeScript", "Node.js", "SQL", "Leadership"]);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState("all");

  // Update keywords when settings load
  useEffect(() => {
    if (settings?.required_keywords?.length) {
      setKeywords(settings.required_keywords);
    }
  }, [settings]);

  // Fetch evaluations when candidate is selected
  useEffect(() => {
    if (selectedCandidate) {
      fetchEvaluations(selectedCandidate.id);
    }
  }, [selectedCandidate?.id]);

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
    toast({
      title: "Candidate Rejected",
      description: "Candidate has been moved to the rejected bank for future consideration.",
    });
  };

  const handleDeleteAllCandidates = () => {
    setCandidates([]);
    setSelectedCandidate(null);
    setDeleteDialogOpen(false);
    toast({
      title: "All Candidates Deleted",
      description: "All mock data has been cleared. You're ready to go live!",
    });
  };

  const handleSaveSettings = async (newSettings: any) => {
    try {
      await saveSettings(newSettings);
      if (newSettings.required_keywords) {
        setKeywords(newSettings.required_keywords);
      }
    } catch (error) {
      throw error;
    }
  };

  // Filter candidates by status
  const filteredCandidates = activeStatusTab === 'all' 
    ? candidates 
    : activeStatusTab === 'selected'
      ? candidates.filter(c => c.status === 'selected' || c.status === 'hired')
      : candidates.filter(c => c.status === activeStatusTab);

  // Calculate counts
  const counts = {
    all: candidates.length,
    pending: candidates.filter(c => c.status === 'pending').length,
    under_review: candidates.filter(c => c.status === 'under_review').length,
    selected: candidates.filter(c => c.status === 'selected').length,
    rejected: candidates.filter(c => c.status === 'rejected').length,
    hired: candidates.filter(c => c.status === 'hired').length
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Recruitment">
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <Loader2 className="h-8 w-8 animate-spin text-recruitment-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Recruitment">
      <div className="h-[calc(100vh-80px)] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Candidate Cockpit</h1>
            {settings?.cycle_name && (
              <p className="text-sm text-muted-foreground">{settings.cycle_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isHROrAdmin && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 text-destructive hover:text-destructive"
                  disabled={candidates.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSettingsDialogOpen(true)}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Settings
                </Button>
              </>
            )}
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

        {/* Status Tabs */}
        <div className="px-4 py-2 border-b bg-white">
          <CandidateStatusTabs
            activeTab={activeStatusTab}
            onTabChange={setActiveStatusTab}
            counts={counts}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Candidate List */}
          <div className="w-80 border-r bg-gray-50/50 overflow-y-auto">
            <CandidateList
              candidates={filteredCandidates}
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

      <RecruitmentSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <DeleteAllCandidatesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteAllCandidates}
        candidateCount={candidates.length}
      />
    </DashboardLayout>
  );
}
