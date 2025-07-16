
interface CycleData {
  name?: string;
  quarter?: number;
  year?: number;
}

export const formatCycleName = (cycle: CycleData | null | undefined): string => {
  if (!cycle) return 'Unknown Cycle';
  
  // If name exists, use it with quarter and year
  if (cycle.name) {
    if (cycle.quarter && cycle.year) {
      return `${cycle.name} (Q${cycle.quarter} ${cycle.year})`;
    }
    return cycle.name;
  }
  
  // Fallback to quarter and year only
  if (cycle.quarter && cycle.year) {
    return `Q${cycle.quarter} ${cycle.year}`;
  }
  
  return 'Unknown Cycle';
};

export const formatCycleNameShort = (cycle: CycleData | null | undefined): string => {
  if (!cycle) return 'Unknown';
  
  if (cycle.quarter && cycle.year) {
    return `Q${cycle.quarter} ${cycle.year}`;
  }
  
  if (cycle.name) {
    return cycle.name;
  }
  
  return 'Unknown';
};
