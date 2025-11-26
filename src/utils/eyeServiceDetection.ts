import { differenceInMinutes, format, getDay, isSameDay } from 'date-fns';

export interface AttendanceLog {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  is_late: boolean;
  late_by_minutes: number | null;
  total_hours: number | null;
}

export interface ManagerPresence {
  date: string;
  wasPresent: boolean;
  clockInTime?: string;
}

export interface EyeServiceMetrics {
  consistencyScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  detectionFlags: DetectionFlag[];
  patterns: BehavioralPattern[];
  recommendations: string[];
}

export interface DetectionFlag {
  rule: 'monday_star_friday_ghost' | 'meeting_miracle_worker' | 'calendar_sync_opportunist';
  severity: 'low' | 'medium' | 'high';
  description: string;
  data: any;
}

export interface BehavioralPattern {
  type: string;
  description: string;
  variance: number;
  occurrences: number;
}

/**
 * Calculate consistency score comparing behavior when manager is present vs absent
 */
export function calculateConsistencyScore(
  logs: AttendanceLog[],
  managerPresence: ManagerPresence[]
): number {
  if (logs.length < 5) return 100; // Not enough data

  // Group logs by manager presence
  const withManager: Date[] = [];
  const withoutManager: Date[] = [];

  logs.forEach(log => {
    const logDate = new Date(log.clock_in_time);
    const presence = managerPresence.find(p => 
      isSameDay(new Date(p.date), logDate)
    );

    const clockInMinutes = logDate.getHours() * 60 + logDate.getMinutes();
    
    if (presence?.wasPresent) {
      withManager.push(new Date(log.clock_in_time));
    } else {
      withoutManager.push(new Date(log.clock_in_time));
    }
  });

  if (withManager.length < 2 || withoutManager.length < 2) {
    return 100; // Not enough data for comparison
  }

  // Calculate average clock-in time for each group
  const avgWithManager = calculateAverageClockInMinutes(withManager);
  const avgWithoutManager = calculateAverageClockInMinutes(withoutManager);

  // Calculate variance (difference in behavior)
  const variance = Math.abs(avgWithManager - avgWithoutManager);

  // Convert variance to consistency score (inverse relationship)
  // 0 min difference = 100 score, 60+ min difference = 0 score
  const consistencyScore = Math.max(0, 100 - (variance * 1.5));

  return Math.round(consistencyScore);
}

/**
 * Calculate average clock-in time in minutes since midnight
 */
function calculateAverageClockInMinutes(dates: Date[]): number {
  const totalMinutes = dates.reduce((sum, date) => {
    return sum + (date.getHours() * 60 + date.getMinutes());
  }, 0);
  return totalMinutes / dates.length;
}

/**
 * Detect Monday Star vs Friday Ghost pattern
 * Flags employees with >30min clock-in difference on management-heavy days
 */
export function detectMondayStarFridayGhost(
  logs: AttendanceLog[],
  managerPresence: ManagerPresence[]
): DetectionFlag | null {
  // Group logs by day of week
  const mondayLogs: Date[] = [];
  const fridayLogs: Date[] = [];

  logs.forEach(log => {
    const logDate = new Date(log.clock_in_time);
    const dayOfWeek = getDay(logDate);
    
    if (dayOfWeek === 1) { // Monday
      mondayLogs.push(logDate);
    } else if (dayOfWeek === 5) { // Friday
      fridayLogs.push(logDate);
    }
  });

  if (mondayLogs.length < 2 || fridayLogs.length < 2) {
    return null; // Not enough data
  }

  const avgMonday = calculateAverageClockInMinutes(mondayLogs);
  const avgFriday = calculateAverageClockInMinutes(fridayLogs);
  const difference = Math.abs(avgMonday - avgFriday);

  if (difference > 30) {
    return {
      rule: 'monday_star_friday_ghost',
      severity: difference > 60 ? 'high' : difference > 45 ? 'medium' : 'low',
      description: `Significant difference in arrival times: Mondays avg ${formatMinutes(avgMonday)}, Fridays avg ${formatMinutes(avgFriday)} (${Math.round(difference)} min variance)`,
      data: {
        mondayAvg: avgMonday,
        fridayAvg: avgFriday,
        difference: difference
      }
    };
  }

  return null;
}

/**
 * Detect Meeting Miracle Worker pattern
 * Detect productivity spikes (early arrivals) before meetings
 */
export function detectMeetingMiracleWorker(
  logs: AttendanceLog[],
  meetingDates: string[] // Dates when there were important meetings
): DetectionFlag | null {
  if (meetingDates.length < 3) return null;

  const meetingDayLogs: Date[] = [];
  const regularDayLogs: Date[] = [];

  logs.forEach(log => {
    const logDate = new Date(log.clock_in_time);
    const dateStr = format(logDate, 'yyyy-MM-dd');
    
    if (meetingDates.includes(dateStr)) {
      meetingDayLogs.push(logDate);
    } else {
      regularDayLogs.push(logDate);
    }
  });

  if (meetingDayLogs.length < 2 || regularDayLogs.length < 3) {
    return null;
  }

  const avgMeetingDay = calculateAverageClockInMinutes(meetingDayLogs);
  const avgRegularDay = calculateAverageClockInMinutes(regularDayLogs);
  const difference = avgRegularDay - avgMeetingDay; // Positive = earlier on meeting days

  if (difference > 20) { // Arriving 20+ min earlier on meeting days
    return {
      rule: 'meeting_miracle_worker',
      severity: difference > 45 ? 'high' : difference > 30 ? 'medium' : 'low',
      description: `Consistently arrives ${Math.round(difference)} minutes earlier on days with important meetings`,
      data: {
        meetingDayAvg: avgMeetingDay,
        regularDayAvg: avgRegularDay,
        difference: difference
      }
    };
  }

  return null;
}

/**
 * Detect Calendar Sync Opportunist pattern
 * Identify work patterns that match manager schedules
 */
export function detectCalendarSyncOpportunist(
  logs: AttendanceLog[],
  managerPresence: ManagerPresence[]
): DetectionFlag | null {
  // Calculate correlation between employee and manager clock-in times
  const correlatedDays = logs.filter(log => {
    const logDate = new Date(log.clock_in_time);
    const presence = managerPresence.find(p => 
      isSameDay(new Date(p.date), logDate)
    );

    if (!presence?.wasPresent || !presence.clockInTime) return false;

    const employeeTime = logDate.getHours() * 60 + logDate.getMinutes();
    const managerTime = new Date(presence.clockInTime).getHours() * 60 + 
                        new Date(presence.clockInTime).getMinutes();

    // Within 15 minutes of manager
    return Math.abs(employeeTime - managerTime) < 15;
  });

  const correlationRate = (correlatedDays.length / logs.length) * 100;

  if (correlationRate > 70 && logs.length >= 5) {
    return {
      rule: 'calendar_sync_opportunist',
      severity: correlationRate > 85 ? 'high' : correlationRate > 77 ? 'medium' : 'low',
      description: `${Math.round(correlationRate)}% of clock-ins within 15 minutes of manager arrival - unusually high synchronization`,
      data: {
        correlationRate: correlationRate,
        matchedDays: correlatedDays.length,
        totalDays: logs.length
      }
    };
  }

  return null;
}

/**
 * Calculate risk score (0-100) based on detection flags and consistency
 */
export function calculateRiskScore(
  consistencyScore: number,
  flags: DetectionFlag[]
): { score: number; level: 'low' | 'medium' | 'high' } {
  let riskScore = 100 - consistencyScore;

  // Add risk points for each flag
  flags.forEach(flag => {
    switch (flag.severity) {
      case 'high':
        riskScore += 25;
        break;
      case 'medium':
        riskScore += 15;
        break;
      case 'low':
        riskScore += 8;
        break;
    }
  });

  // Cap at 100
  riskScore = Math.min(100, riskScore);

  const level: 'low' | 'medium' | 'high' = 
    riskScore <= 30 ? 'low' : 
    riskScore <= 60 ? 'medium' : 
    'high';

  return { score: Math.round(riskScore), level };
}

/**
 * Generate coaching recommendations based on patterns
 */
export function generateRecommendations(
  flags: DetectionFlag[],
  riskLevel: 'low' | 'medium' | 'high'
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'low') {
    recommendations.push('Maintain current consistent work patterns');
    recommendations.push('Continue demonstrating reliable attendance behavior');
  }

  if (riskLevel === 'medium') {
    recommendations.push('Review work-life balance and schedule consistency');
    recommendations.push('Consider discussing flexible work arrangements with manager');
    recommendations.push('Focus on maintaining consistent arrival patterns regardless of management presence');
  }

  if (riskLevel === 'high') {
    recommendations.push('Schedule one-on-one coaching session to discuss attendance patterns');
    recommendations.push('Develop personalized attendance improvement plan');
    recommendations.push('Explore underlying factors affecting consistency (commute, personal obligations, etc.)');
    recommendations.push('Set clear expectations and accountability measures');
  }

  flags.forEach(flag => {
    switch (flag.rule) {
      case 'monday_star_friday_ghost':
        recommendations.push('Address weekly schedule variance - aim for consistent start times throughout the week');
        break;
      case 'meeting_miracle_worker':
        recommendations.push('Maintain the same level of punctuality on all work days, not just meeting days');
        break;
      case 'calendar_sync_opportunist':
        recommendations.push('Develop independent work schedule that reflects role requirements rather than manager presence');
        break;
    }
  });

  return recommendations;
}

/**
 * Format minutes since midnight to HH:MM format
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Analyze complete eye service metrics for an employee
 */
export function analyzeEyeService(
  logs: AttendanceLog[],
  managerPresence: ManagerPresence[],
  meetingDates: string[] = []
): EyeServiceMetrics {
  const consistencyScore = calculateConsistencyScore(logs, managerPresence);
  
  const flags: DetectionFlag[] = [];
  
  const mondayFridayFlag = detectMondayStarFridayGhost(logs, managerPresence);
  if (mondayFridayFlag) flags.push(mondayFridayFlag);
  
  const meetingFlag = detectMeetingMiracleWorker(logs, meetingDates);
  if (meetingFlag) flags.push(meetingFlag);
  
  const calendarSyncFlag = detectCalendarSyncOpportunist(logs, managerPresence);
  if (calendarSyncFlag) flags.push(calendarSyncFlag);
  
  const { score: riskScore, level: riskLevel } = calculateRiskScore(consistencyScore, flags);
  
  const recommendations = generateRecommendations(flags, riskLevel);
  
  // Generate behavioral patterns summary
  const patterns: BehavioralPattern[] = [];
  
  if (mondayFridayFlag) {
    patterns.push({
      type: 'Weekly Variance',
      description: 'Inconsistent arrival times across weekdays',
      variance: mondayFridayFlag.data.difference,
      occurrences: logs.length
    });
  }
  
  return {
    consistencyScore,
    riskLevel,
    detectionFlags: flags,
    patterns,
    recommendations
  };
}
