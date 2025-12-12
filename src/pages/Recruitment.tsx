import { useState, useEffect, useMemo } from "react";
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
import { Candidate } from "@/components/recruitment/mockData";
import { useRecruitmentData, DbCandidate } from "@/hooks/useRecruitmentData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Convert DB candidate to UI Candidate format with keyword matching
function dbToUiCandidate(db: DbCandidate, requiredKeywords: string[]): Candidate {
  const candidateSkills = db.skills || [];
  
  // Compare candidate skills against required keywords (case-insensitive)
  const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
  const normalizedRequired = requiredKeywords.map(k => k.toLowerCase().trim());
  
  const foundKeywords = requiredKeywords.filter(keyword => 
    normalizedCandidateSkills.some(skill => 
      skill.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skill)
    )
  );
  
  const missingKeywords = requiredKeywords.filter(keyword => 
    !normalizedCandidateSkills.some(skill => 
      skill.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skill)
    )
  );
  
  // Calculate match score based on keyword matching
  const keywordMatchPercent = requiredKeywords.length > 0 
    ? Math.round((foundKeywords.length / requiredKeywords.length) * 100)
    : 0;
  
  // Calculate skill percentages based on keyword matching and other factors
  const technicalScore = Math.min(100, 50 + (foundKeywords.length * 10));
  const experienceScore = db.years_of_experience 
    ? Math.min(100, db.years_of_experience * 10 + 20)
    : 50;
  const educationScore = db.education ? 75 : 50;
  const softSkillsScore = Math.min(100, 50 + (foundKeywords.length * 8));
  const toolsScore = Math.min(100, 40 + (candidateSkills.length * 5));
  
  return {
    id: db.id,
    name: db.name,
    email: db.email || '',
    phone: db.phone || '',
    currentRole: db.candidate_current_role || '',
    appliedRole: db.applied_role || undefined,
    matchScore: keywordMatchPercent, // Dynamic match score based on keyword matching
    skills: {
      technical: technicalScore,
      experience: experienceScore,
      education: educationScore,
      softSkills: softSkillsScore,
      tools: toolsScore
    },
    foundKeywords,
    missingKeywords,
    status: db.status as Candidate['status'],
    resumeUrl: db.resume_url || undefined,
    resumeText: db.resume_text || undefined,
    yearsOfExperience: db.years_of_experience || undefined,
    location: db.location || undefined,
    education: db.education || undefined,
    linkedIn: db.linkedin || undefined
  };
}

export default function Recruitment() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const {
    candidates: dbCandidates,
    settings,
    loading,
    isHROrAdmin,
    addCandidate,
    updateCandidateStatus,
    saveSettings,
    deleteCandidate,
    deleteAllCandidates,
    fetchEvaluations,
    evaluations,
    submitEvaluation,
    fetchCandidates
  } = useRecruitmentData();

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [keywords, setKeywords] = useState<string[]>(settings?.required_keywords || []);
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

  // Convert DB candidates to UI format with keyword matching
  const candidates = useMemo(() => 
    dbCandidates.map(db => dbToUiCandidate(db, keywords)), 
    [dbCandidates, keywords]
  );

  // Fetch evaluations when candidate is selected
  useEffect(() => {
    if (selectedCandidate) {
      fetchEvaluations(selectedCandidate.id);
    }
  }, [selectedCandidate?.id]);

  // Update selected candidate when candidates list changes
  useEffect(() => {
    if (selectedCandidate) {
      const updated = candidates.find(c => c.id === selectedCandidate.id);
      if (updated) {
        setSelectedCandidate(updated);
      }
    }
  }, [candidates]);

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleUploadComplete = async (newCandidate: Candidate) => {
    try {
      console.log('Adding candidate:', newCandidate);
      await addCandidate({
        name: newCandidate.name,
        email: newCandidate.email || null,
        phone: newCandidate.phone || null,
        applied_role: newCandidate.appliedRole || null,
        candidate_current_role: newCandidate.currentRole || null,
        skills: newCandidate.foundKeywords || [],
        match_score: newCandidate.matchScore || 0,
        resume_url: newCandidate.resumeUrl || null,
        resume_text: newCandidate.resumeText || null,
        years_of_experience: newCandidate.yearsOfExperience || null,
        location: newCandidate.location || null,
        education: newCandidate.education || null,
        linkedin: newCandidate.linkedIn || null
      });
      await fetchCandidates();
      setUploadDialogOpen(false);
      toast({
        title: "Candidate Added",
        description: `${newCandidate.name} has been added successfully.`
      });
    } catch (error: any) {
      console.error('Error adding candidate:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add candidate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleHireCandidate = async (candidateId: string) => {
    try {
      // Use 'selected' status instead of 'hired' - archived for record
      await updateCandidateStatus(candidateId, 'selected');
      toast({
        title: "Candidate Selected!",
        description: "Candidate has been selected and archived."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive"
      });
    }
  };

  const handleRejectCandidate = async (candidateId: string) => {
    try {
      await updateCandidateStatus(candidateId, 'rejected');
      toast({
        title: "Candidate Rejected",
        description: "Candidate has been moved to the rejected bank."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      await deleteCandidate(candidateId);
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete candidate",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllCandidates = async () => {
    try {
      await deleteAllCandidates();
      setSelectedCandidate(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete candidates",
        variant: "destructive"
      });
    }
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
    selected: candidates.filter(c => c.status === 'selected' || c.status === 'hired').length,
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
              </>
            )}
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
              onDelete={handleDeleteCandidate}
              isHROrAdmin={isHROrAdmin}
            />
          </div>

          {/* Main View */}
          <div className="flex-1 overflow-y-auto bg-gray-50/30">
            {selectedCandidate ? (
              <CandidateProfile
                candidate={selectedCandidate}
                keywords={keywords}
                evaluations={evaluations}
                currentUserId={profile?.id || ''}
                isHROrAdmin={isHROrAdmin}
                passingThreshold={settings?.passing_threshold || 70}
                skillRequirements={settings?.skill_requirements}
                onHire={handleHireCandidate}
                onReject={handleRejectCandidate}
                onSubmitEvaluation={submitEvaluation}
                onCandidateUpdate={fetchCandidates}
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
