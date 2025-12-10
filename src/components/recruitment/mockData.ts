export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  avatar?: string;
  matchScore: number;
  status: 'new' | 'reviewing' | 'hired' | 'rejected';
  resumeUrl?: string;
  skills: {
    technical: number;
    experience: number;
    education: number;
    softSkills: number;
    tools: number;
  };
  foundKeywords: string[];
  missingKeywords: string[];
  boardScores?: {
    technicalProficiency: number;
    relevantExperience: number;
    culturalFit: number;
    problemSolving: number;
    leadership: number;
  };
  boardComments?: string;
}

export const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    currentRole: "Senior Frontend Developer",
    matchScore: 92,
    status: 'new',
    skills: {
      technical: 95,
      experience: 88,
      education: 85,
      softSkills: 90,
      tools: 92
    },
    foundKeywords: ["React", "TypeScript", "Node.js", "SQL"],
    missingKeywords: ["Leadership"],
    boardScores: {
      technicalProficiency: 9,
      relevantExperience: 8,
      culturalFit: 7,
      problemSolving: 8,
      leadership: 6
    }
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@email.com",
    phone: "+1 (555) 234-5678",
    currentRole: "Full Stack Engineer",
    matchScore: 78,
    status: 'reviewing',
    skills: {
      technical: 82,
      experience: 75,
      education: 90,
      softSkills: 70,
      tools: 85
    },
    foundKeywords: ["React", "Node.js", "SQL"],
    missingKeywords: ["TypeScript", "Leadership"],
    boardScores: {
      technicalProficiency: 7,
      relevantExperience: 7,
      culturalFit: 8,
      problemSolving: 7,
      leadership: 5
    }
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.r@email.com",
    phone: "+1 (555) 345-6789",
    currentRole: "Tech Lead",
    matchScore: 88,
    status: 'new',
    skills: {
      technical: 88,
      experience: 92,
      education: 80,
      softSkills: 95,
      tools: 85
    },
    foundKeywords: ["React", "TypeScript", "Leadership", "SQL"],
    missingKeywords: ["Node.js"],
    boardScores: {
      technicalProficiency: 8,
      relevantExperience: 9,
      culturalFit: 9,
      problemSolving: 8,
      leadership: 9
    }
  },
  {
    id: "4",
    name: "David Kim",
    email: "d.kim@email.com",
    phone: "+1 (555) 456-7890",
    currentRole: "Junior Developer",
    matchScore: 45,
    status: 'new',
    skills: {
      technical: 55,
      experience: 40,
      education: 75,
      softSkills: 60,
      tools: 50
    },
    foundKeywords: ["React"],
    missingKeywords: ["TypeScript", "Node.js", "SQL", "Leadership"],
    boardScores: {
      technicalProficiency: 4,
      relevantExperience: 3,
      culturalFit: 6,
      problemSolving: 5,
      leadership: 3
    }
  },
  {
    id: "5",
    name: "Amanda Foster",
    email: "a.foster@email.com",
    phone: "+1 (555) 567-8901",
    currentRole: "Backend Developer",
    matchScore: 65,
    status: 'reviewing',
    skills: {
      technical: 70,
      experience: 65,
      education: 70,
      softSkills: 75,
      tools: 60
    },
    foundKeywords: ["Node.js", "SQL", "TypeScript"],
    missingKeywords: ["React", "Leadership"],
    boardScores: {
      technicalProficiency: 6,
      relevantExperience: 6,
      culturalFit: 7,
      problemSolving: 6,
      leadership: 5
    }
  }
];

export const generateNewCandidate = (name: string): Candidate => {
  const matchScore = Math.floor(Math.random() * 50) + 50; // 50-100
  const allKeywords = ["React", "TypeScript", "Node.js", "SQL", "Leadership"];
  const numFound = Math.floor(Math.random() * 4) + 1;
  const shuffled = [...allKeywords].sort(() => Math.random() - 0.5);
  const foundKeywords = shuffled.slice(0, numFound);
  const missingKeywords = shuffled.slice(numFound);

  return {
    id: Date.now().toString(),
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
    phone: `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
    currentRole: ["Software Engineer", "Frontend Developer", "Full Stack Developer", "Tech Lead"][Math.floor(Math.random() * 4)],
    matchScore,
    status: 'new',
    skills: {
      technical: Math.floor(Math.random() * 40) + 60,
      experience: Math.floor(Math.random() * 40) + 60,
      education: Math.floor(Math.random() * 40) + 60,
      softSkills: Math.floor(Math.random() * 40) + 60,
      tools: Math.floor(Math.random() * 40) + 60
    },
    foundKeywords,
    missingKeywords,
    boardScores: {
      technicalProficiency: 5,
      relevantExperience: 5,
      culturalFit: 5,
      problemSolving: 5,
      leadership: 5
    }
  };
};
