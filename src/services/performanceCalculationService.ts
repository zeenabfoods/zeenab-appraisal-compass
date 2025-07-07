
import { supabase } from '@/integrations/supabase/client';

interface SectionScore {
  sectionId: string;
  sectionName: string;
  score: number;
  weight: number;
  isNoteworthy: boolean;
  maxScore: number;
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
      
      // Calculate base score using weighted average
      const baseScore = this.calculateWeightedAverage(sectionScores);
      
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
      
      // Calculate section score as percentage
      let sectionScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
      
      // Apply section-specific caps
      const cap = this.getSectionCap(section.name);
      if (cap) {
        sectionScore = Math.min(sectionScore, cap);
      }
      
      return {
        sectionId: section.id,
        sectionName: section.name,
        score: sectionScore,
        weight: section.weight,
        isNoteworthy: false, // Will be determined later
        maxScore: maxPossibleScore
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

  private static calculateWeightedAverage(sectionScores: SectionScore[]): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    sectionScores.forEach(section => {
      weightedSum += (section.score * section.weight);
      totalWeight += section.weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
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
      const { error } = await supabase
        .from('performance_analytics')
        .upsert({
          employee_id: employeeId,
          cycle_id: cycleId,
          overall_score: calculation.overallScore,
          performance_band: calculation.performanceBand,
          section_scores: {
            sections: calculation.sectionScores,
            baseScore: calculation.baseScore,
            noteworthyBonus: calculation.noteworthyBonus
          }
        }, {
          onConflict: 'employee_id,cycle_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving performance analytics:', error);
      throw error;
    }
  }
}
