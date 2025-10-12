import { supabase } from '@/integrations/supabase/client';

interface SectionScore {
  sectionId: string;
  sectionName: string;
  score: number;
  weight: number;
  isNoteworthy: boolean;
  maxScore: number;
  [key: string]: any; // Add index signature for Json compatibility
}

interface PerformanceCalculationResult {
  overallScore: number;
  performanceBand: string;
  sectionScores: SectionScore[];
  baseScore: number;
  noteworthyBonus: number;
}

export class PerformanceCalculationService {
  // Section caps based on your specifications
  private static readonly SECTION_CAPS = {
    'Financial': 50,
    'Sales': 50,
    'Operational': 35,
    'Efficiency': 35,
    'Behavioral': 15,
    'Soft Skills': 15,
  };

  static async calculatePerformanceScore(
    employeeId: string, 
    cycleId: string
  ): Promise<PerformanceCalculationResult | null> {
    try {
      // Get appraisal data
      const { data: appraisal, error: appraisalError } = await supabase
        .from('appraisals')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycleId)
        .maybeSingle();

      if (appraisalError) throw appraisalError;
      if (!appraisal) return null;

      // Get all responses for this appraisal
      const { data: responses, error: responsesError } = await supabase
        .from('appraisal_responses')
        .select(`
          *,
          appraisal_questions!inner (
            id,
            question_text,
            weight,
            section_id,
            appraisal_question_sections!inner (
              name,
              weight
            )
          )
        `)
        .eq('appraisal_id', appraisal.id);

      if (responsesError) throw responsesError;
      if (!responses || responses.length === 0) return null;

      // Group responses by section
      const sectionGroups = this.groupResponsesBySection(responses);
      
      // Calculate section scores
      const sectionScores = this.calculateSectionScores(sectionGroups);
      
      // Calculate base score by summing section contributions
      const baseScore = this.calculateBaseScore(sectionScores);
      
      // Calculate noteworthy bonus
      const noteworthyBonus = this.calculateNoteworthyBonus(sectionScores, appraisal.noteworthy);
      
      // Calculate final score
      const overallScore = Math.min(100, baseScore + noteworthyBonus);
      
      // Determine performance band
      const performanceBand = this.getPerformanceBand(overallScore);

      return {
        overallScore: Math.round(overallScore * 100) / 100,
        performanceBand,
        sectionScores,
        baseScore: Math.round(baseScore * 100) / 100,
        noteworthyBonus: Math.round(noteworthyBonus * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating performance score:', error);
      return null;
    }
  }

  private static groupResponsesBySection(responses: any[]) {
    const sections = new Map();
    
    responses.forEach(response => {
      const section = response.appraisal_questions.appraisal_question_sections;
      const sectionId = section.id;
      
      if (!sections.has(sectionId)) {
        sections.set(sectionId, {
          id: sectionId,
          name: section.name,
          weight: section.weight,
          responses: []
        });
      }
      
      sections.get(sectionId).responses.push(response);
    });
    
    return Array.from(sections.values());
  }

  private static calculateSectionScores(sectionGroups: any[]): SectionScore[] {
    return sectionGroups.map(section => {
      const responses = section.responses;
      let totalScore = 0;
      let maxPossibleScore = 0;
      
      responses.forEach((response: any) => {
        // Use manager score as authoritative, fall back to employee score
        const score = response.mgr_rating || response.emp_rating || 0;
        const questionWeight = response.appraisal_questions.weight || 1;
        
        totalScore += (score * questionWeight);
        maxPossibleScore += (5 * questionWeight); // Assuming 5-point scale
      });
      
      // Calculate raw percentage (0-1)
      const rawPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) : 0;
      
      // Apply section-specific cap to get actual contribution
      // e.g., if Financial scores 80% (0.8), contribution = 0.8 * 50 = 40 points
      const cap = this.getSectionCap(section.name);
      const sectionScore = cap ? (rawPercentage * cap) : (rawPercentage * 100);
      
      return {
        sectionId: section.id,
        sectionName: section.name,
        score: sectionScore, // Actual points contributed (0-50 for Financial, 0-35 for Operational, 0-15 for Behavioral)
        weight: section.weight,
        isNoteworthy: false, // Will be determined later
        maxScore: maxPossibleScore,
        rawPercentage: rawPercentage * 100 // Store for display (0-100%)
      };
    });
  }

  private static getSectionCap(sectionName: string): number | null {
    for (const [key, cap] of Object.entries(this.SECTION_CAPS)) {
      if (sectionName.toLowerCase().includes(key.toLowerCase())) {
        return cap;
      }
    }
    return null;
  }

  private static calculateBaseScore(sectionScores: SectionScore[]): number {
    // Simply sum all section scores since they're already properly scaled
    // (each section score is already the contribution to the final 100-point scale)
    return sectionScores.reduce((sum, section) => sum + section.score, 0);
  }

  private static calculateNoteworthyBonus(sectionScores: SectionScore[], noteworthy: string | null): number {
    if (!noteworthy) return 0;
    
    let totalBonus = 0;
    const noteworthySections = noteworthy.split(',').map(s => s.trim().toLowerCase());
    
    sectionScores.forEach(section => {
      const isNoteworthy = noteworthySections.some(nw => 
        section.sectionName.toLowerCase().includes(nw)
      );
      
      if (isNoteworthy) {
        section.isNoteworthy = true;
        const bonus = Math.min(section.score * 0.1, 10);
        totalBonus += bonus;
      }
    });
    
    return Math.min(totalBonus, 10); // Cap total bonus at 10%
  }

  private static getPerformanceBand(score: number): string {
    if (score >= 91) return 'Exceptional';
    if (score >= 81) return 'Excellent';
    if (score >= 71) return 'Very Good';
    if (score >= 61) return 'Good';
    if (score >= 51) return 'Fair';
    return 'Poor';
  }

  static async savePerformanceAnalytics(
    employeeId: string,
    cycleId: string,
    calculation: PerformanceCalculationResult
  ): Promise<void> {
    try {
      // Convert the section scores to a JSON-compatible format
      const sectionScoresJson = {
        sections: calculation.sectionScores.map(section => ({
          sectionId: section.sectionId,
          sectionName: section.sectionName,
          score: section.score,
          weight: section.weight,
          isNoteworthy: section.isNoteworthy,
          maxScore: section.maxScore
        })),
        baseScore: calculation.baseScore,
        noteworthyBonus: calculation.noteworthyBonus
      };

      const { error } = await supabase
        .from('performance_analytics')
        .upsert({
          employee_id: employeeId,
          cycle_id: cycleId,
          overall_score: calculation.overallScore,
          performance_band: calculation.performanceBand,
          section_scores: sectionScoresJson
        }, {
          onConflict: 'employee_id,cycle_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving performance analytics:', error);
      throw error;
    }
  }

  // Recalculate all existing performance analytics with the corrected formula
  static async recalculateAllScores(): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      // Get all appraisals that have manager reviews (submitted or beyond)
      const { data: appraisals, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id, employee_id, cycle_id')
        .in('status', ['submitted', 'manager_review', 'committee_review', 'completed']);

      if (appraisalsError) throw appraisalsError;
      if (!appraisals || appraisals.length === 0) {
        return { success: 0, failed: 0, errors: [] };
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Recalculate each appraisal
      for (const appraisal of appraisals) {
        try {
          const calculation = await this.calculatePerformanceScore(
            appraisal.employee_id,
            appraisal.cycle_id
          );

          if (calculation) {
            await this.savePerformanceAnalytics(
              appraisal.employee_id,
              appraisal.cycle_id,
              calculation
            );
            successCount++;
          } else {
            failedCount++;
            errors.push(`No calculation result for appraisal ${appraisal.id}`);
          }
        } catch (error) {
          failedCount++;
          errors.push(`Failed for appraisal ${appraisal.id}: ${error}`);
        }
      }

      return { success: successCount, failed: failedCount, errors };
    } catch (error) {
      console.error('Error recalculating all scores:', error);
      throw error;
    }
  }
}
