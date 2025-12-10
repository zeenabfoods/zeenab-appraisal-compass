import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from "recharts";

interface RadarChartComparisonProps {
  skills: {
    technical: number;
    experience: number;
    education: number;
    softSkills: number;
    tools: number;
  };
}

export function RadarChartComparison({ skills }: RadarChartComparisonProps) {
  // Required skills baseline (normalized to 100)
  const requiredSkills = {
    technical: 80,
    experience: 75,
    education: 70,
    softSkills: 80,
    tools: 75
  };

  const data = [
    {
      subject: "Technical",
      required: requiredSkills.technical,
      candidate: skills.technical,
      fullMark: 100
    },
    {
      subject: "Experience",
      required: requiredSkills.experience,
      candidate: skills.experience,
      fullMark: 100
    },
    {
      subject: "Education",
      required: requiredSkills.education,
      candidate: skills.education,
      fullMark: 100
    },
    {
      subject: "Soft Skills",
      required: requiredSkills.softSkills,
      candidate: skills.softSkills,
      fullMark: 100
    },
    {
      subject: "Tools",
      required: requiredSkills.tools,
      candidate: skills.tools,
      fullMark: 100
    }
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]} 
          tick={{ fill: '#9ca3af', fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          name="Required"
          dataKey="required"
          stroke="#9ca3af"
          fill="#e5e7eb"
          fillOpacity={0.4}
          strokeWidth={2}
        />
        <Radar
          name="Candidate"
          dataKey="candidate"
          stroke="#FF5722"
          fill="#FF5722"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Legend 
          wrapperStyle={{ paddingTop: 10 }}
          iconType="circle"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
