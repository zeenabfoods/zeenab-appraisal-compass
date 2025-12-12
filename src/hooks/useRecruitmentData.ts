import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface DbCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  applied_role: string | null;
  candidate_current_role: string | null;
  resume_url: string | null;
  resume_text: string | null;
  skills: string[];
  match_score: number;
  status: string;
  cycle_id: string | null;
  years_of_experience: number | null;
  location: string | null;
  education: string | null;
  linkedin: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEvaluation {
  id: string;
  candidate_id: string;
  evaluator_id: string;
  technical_proficiency: number;
  relevant_experience: number;
  cultural_fit: number;
  problem_solving: number;
  leadership: number;
  total_score: number;
  comments: string | null;
  submitted_at: string | null;
  evaluator?: {
    first_name: string;
    last_name: string;
  };
}

export interface SkillRequirements {
  technical: number;
  experience: number;
  education: number;
  softSkills: number;
  tools: number;
}

export interface RecruitmentSettings {
  id: string;
  cycle_name: string;
  passing_threshold: number;
  is_active: boolean;
  required_keywords: string[];
  skill_requirements: SkillRequirements;
}

export function useRecruitmentData() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<DbCandidate[]>([]);
  const [evaluations, setEvaluations] = useState<DbEvaluation[]>([]);
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const isHROrAdmin = profile?.role === 'hr' || profile?.role === 'admin';
  const isRecruiter = (profile?.role as string) === 'recruiter';

  // Fetch candidates
  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching candidates:', error);
      return;
    }
    setCandidates(data || []);
  };

  // Fetch evaluations for a candidate
  const fetchEvaluations = async (candidateId?: string) => {
    let query = supabase
      .from('candidate_evaluations')
      .select(`
        *,
        evaluator:profiles!candidate_evaluations_evaluator_id_fkey(first_name, last_name)
      `);

    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching evaluations:', error);
      return;
    }
    setEvaluations(data || []);
  };

  // Fetch recruitment settings
  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('recruitment_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }
    if (data) {
      const skillReqs = data.skill_requirements as unknown as SkillRequirements | null;
      setSettings({
        id: data.id,
        cycle_name: data.cycle_name,
        passing_threshold: data.passing_threshold,
        is_active: data.is_active,
        required_keywords: data.required_keywords,
        skill_requirements: skillReqs || {
          technical: 80,
          experience: 75,
          education: 70,
          softSkills: 80,
          tools: 75
        }
      });
    }
  };

  // Save or update settings
  const saveSettings = async (newSettings: Partial<RecruitmentSettings>) => {
    if (settings?.id) {
      const { error } = await supabase
        .from('recruitment_settings')
        .update({
          cycle_name: newSettings.cycle_name,
          passing_threshold: newSettings.passing_threshold,
          required_keywords: newSettings.required_keywords,
          skill_requirements: newSettings.skill_requirements as unknown as Record<string, number>
        })
        .eq('id', settings.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('recruitment_settings')
        .insert([{
          cycle_name: newSettings.cycle_name || 'Default Cycle',
          passing_threshold: newSettings.passing_threshold || 70,
          required_keywords: newSettings.required_keywords || [],
          skill_requirements: (newSettings.skill_requirements || {
            technical: 80,
            experience: 75,
            education: 70,
            softSkills: 80,
            tools: 75
          }) as unknown as Record<string, number>,
          created_by: user?.id
        }]);

      if (error) throw error;
    }
    await fetchSettings();
  };

  // Add a new candidate
  const addCandidate = async (candidate: Partial<DbCandidate>) => {
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        name: candidate.name || 'Unknown',
        email: candidate.email,
        phone: candidate.phone,
        applied_role: candidate.applied_role,
        candidate_current_role: candidate.candidate_current_role,
        skills: candidate.skills || [],
        match_score: candidate.match_score || 0,
        status: 'pending',
        cycle_id: settings?.id,
        resume_url: candidate.resume_url,
        resume_text: candidate.resume_text,
        years_of_experience: candidate.years_of_experience,
        location: candidate.location,
        education: candidate.education,
        linkedin: candidate.linkedin
      })
      .select()
      .single();

    if (error) throw error;
    await fetchCandidates();
    return data;
  };

  // Update candidate status
  const updateCandidateStatus = async (candidateId: string, status: DbCandidate['status']) => {
    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId);

    if (error) throw error;
    await fetchCandidates();
  };

  // Submit evaluation
  const submitEvaluation = async (evaluation: {
    candidate_id: string;
    technical_proficiency: number;
    relevant_experience: number;
    cultural_fit: number;
    problem_solving: number;
    leadership: number;
    comments?: string;
  }) => {
    // total_score is auto-calculated by database trigger

    // Check if evaluation already exists
    const { data: existingEval } = await supabase
      .from('candidate_evaluations')
      .select('id')
      .eq('candidate_id', evaluation.candidate_id)
      .eq('evaluator_id', user?.id)
      .maybeSingle();

    if (existingEval) {
      // Update existing evaluation (total_score is auto-calculated by trigger)
      const { error } = await supabase
        .from('candidate_evaluations')
        .update({
          technical_proficiency: evaluation.technical_proficiency,
          relevant_experience: evaluation.relevant_experience,
          cultural_fit: evaluation.cultural_fit,
          problem_solving: evaluation.problem_solving,
          leadership: evaluation.leadership,
          comments: evaluation.comments,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingEval.id);

      if (error) throw error;
    } else {
      // Insert new evaluation (total_score is auto-calculated by trigger)
      const { error } = await supabase
        .from('candidate_evaluations')
        .insert({
          candidate_id: evaluation.candidate_id,
          technical_proficiency: evaluation.technical_proficiency,
          relevant_experience: evaluation.relevant_experience,
          cultural_fit: evaluation.cultural_fit,
          problem_solving: evaluation.problem_solving,
          leadership: evaluation.leadership,
          comments: evaluation.comments,
          evaluator_id: user?.id,
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    // Update candidate status to under_review if pending
    const { data: candidate } = await supabase
      .from('candidates')
      .select('status')
      .eq('id', evaluation.candidate_id)
      .single();

    if (candidate?.status === 'pending') {
      await supabase
        .from('candidates')
        .update({ status: 'under_review' })
        .eq('id', evaluation.candidate_id);
      await fetchCandidates();
    }

    await fetchEvaluations(evaluation.candidate_id);
    toast({
      title: "Evaluation Submitted",
      description: "Your evaluation has been saved successfully."
    });
  };

  // Get aggregated scores for a candidate
  const getAggregatedScore = async (candidateId: string) => {
    const { data, error } = await supabase
      .rpc('get_candidate_aggregated_score', { candidate_id_param: candidateId });

    if (error) {
      console.error('Error getting aggregated score:', error);
      return null;
    }
    return data?.[0] || null;
  };

  // Delete a single candidate
  const deleteCandidate = async (candidateId: string) => {
    if (!isHROrAdmin) return;

    // First delete evaluations for this candidate
    await supabase
      .from('candidate_evaluations')
      .delete()
      .eq('candidate_id', candidateId);

    // Then delete the candidate
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId);

    if (error) throw error;
    await fetchCandidates();
    toast({
      title: "Candidate Deleted",
      description: "Candidate record has been removed."
    });
  };

  // Delete all candidates (for HR to clear mock data)
  const deleteAllCandidates = async () => {
    if (!isHROrAdmin) return;

    // First delete all evaluations
    await supabase
      .from('candidate_evaluations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Then delete all candidates
    const { error } = await supabase
      .from('candidates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    await fetchCandidates();
    setEvaluations([]);
    toast({
      title: "All Data Cleared",
      description: "All candidates and evaluations have been deleted."
    });
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCandidates(),
        fetchSettings()
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  return {
    candidates,
    evaluations,
    settings,
    loading,
    isHROrAdmin,
    isRecruiter,
    fetchCandidates,
    fetchEvaluations,
    fetchSettings,
    saveSettings,
    addCandidate,
    updateCandidateStatus,
    submitEvaluation,
    getAggregatedScore,
    deleteCandidate,
    deleteAllCandidates
  };
}
