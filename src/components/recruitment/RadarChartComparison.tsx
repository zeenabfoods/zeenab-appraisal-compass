import { motion } from "framer-motion";
import { Code, Briefcase, GraduationCap, Users, Wrench } from "lucide-react";

interface RadarChartComparisonProps {
  skills: {
    technical: number;
    experience: number;
    education: number;
    softSkills: number;
    tools: number;
  };
}

interface SkillBarProps {
  label: string;
  icon: React.ElementType;
  value: number;
  required: number;
  color: string;
  bgColor: string;
  delay: number;
}

function SkillBar({ label, icon: Icon, value, required, color, bgColor, delay }: SkillBarProps) {
  const percentage = Math.min(value, 100);
  const requiredPercentage = Math.min(required, 100);
  const meetsRequirement = value >= required;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div 
            className={`p-1.5 rounded-md ${bgColor}`}
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              delay 
            }}
          >
            <Icon className={`h-4 w-4 ${color}`} />
          </motion.div>
          <span className="font-medium text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${meetsRequirement ? 'text-green-600' : 'text-amber-600'}`}>
            {value}%
          </span>
          <span className="text-xs text-muted-foreground">/ {required}% req</span>
        </div>
      </div>
      
      {/* Progress bar container */}
      <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
        {/* Required threshold marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
          style={{ left: `${requiredPercentage}%` }}
        />
        
        {/* Animated progress bar */}
        <motion.div
          className={`h-full rounded-full relative overflow-hidden`}
          style={{ backgroundColor: color.replace('text-', '') }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: delay * 0.1, ease: "easeOut" }}
        >
          {/* Breathing glow effect */}
          <motion.div
            className="absolute inset-0 opacity-50"
            style={{ 
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)` 
            }}
            animate={{ 
              x: ['-100%', '200%']
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              delay 
            }}
          />
        </motion.div>
      </div>
      
      {/* Status indicator */}
      <div className="flex items-center gap-1">
        <motion.span 
          className={`inline-block w-2 h-2 rounded-full ${meetsRequirement ? 'bg-green-500' : 'bg-amber-500'}`}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            delay 
          }}
        />
        <span className={`text-xs ${meetsRequirement ? 'text-green-600' : 'text-amber-600'}`}>
          {meetsRequirement ? 'Meets requirement' : `${required - value}% below requirement`}
        </span>
      </div>
    </div>
  );
}

export function RadarChartComparison({ skills }: RadarChartComparisonProps) {
  // Required skills baseline
  const requiredSkills = {
    technical: 80,
    experience: 75,
    education: 70,
    softSkills: 80,
    tools: 75
  };

  const skillsData = [
    {
      label: "Technical Skills",
      icon: Code,
      value: skills.technical,
      required: requiredSkills.technical,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      barColor: "#3B82F6"
    },
    {
      label: "Experience",
      icon: Briefcase,
      value: skills.experience,
      required: requiredSkills.experience,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      barColor: "#8B5CF6"
    },
    {
      label: "Education",
      icon: GraduationCap,
      value: skills.education,
      required: requiredSkills.education,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      barColor: "#10B981"
    },
    {
      label: "Soft Skills",
      icon: Users,
      value: skills.softSkills,
      required: requiredSkills.softSkills,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      barColor: "#F97316"
    },
    {
      label: "Tools & Technologies",
      icon: Wrench,
      value: skills.tools,
      required: requiredSkills.tools,
      color: "text-pink-500",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      barColor: "#EC4899"
    }
  ];

  // Calculate overall match
  const overallMatch = Math.round(
    Object.values(skills).reduce((a, b) => a + b, 0) / Object.values(skills).length
  );
  const overallRequired = Math.round(
    Object.values(requiredSkills).reduce((a, b) => a + b, 0) / Object.values(requiredSkills).length
  );
  const meetsOverall = overallMatch >= overallRequired;

  return (
    <div className="space-y-6">
      {/* Legend / Explanation */}
      <div className="bg-muted/30 rounded-lg p-3 text-sm">
        <p className="text-muted-foreground">
          <strong className="text-foreground">How to read:</strong> Each bar shows the candidate's score compared to the minimum requirement. 
          The vertical line marks the required threshold. <span className="text-green-600 font-medium">Green</span> = meets requirement, 
          <span className="text-amber-600 font-medium"> Amber</span> = needs improvement.
        </p>
      </div>

      {/* Skill bars */}
      <div className="space-y-5">
        {skillsData.map((skill, index) => (
          <motion.div
            key={skill.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <SkillBar
              label={skill.label}
              icon={skill.icon}
              value={skill.value}
              required={skill.required}
              color={skill.barColor}
              bgColor={skill.bgColor}
              delay={index * 0.2}
            />
          </motion.div>
        ))}
      </div>

      {/* Overall score summary */}
      <motion.div 
        className={`p-4 rounded-lg border-2 ${meetsOverall ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overall Skills Match</p>
            <p className={`text-2xl font-bold ${meetsOverall ? 'text-green-600' : 'text-amber-600'}`}>
              {overallMatch}%
            </p>
          </div>
          <motion.div
            className={`p-3 rounded-full ${meetsOverall ? 'bg-green-100' : 'bg-amber-100'}`}
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: meetsOverall 
                ? ['0 0 0 0 rgba(34,197,94,0)', '0 0 0 8px rgba(34,197,94,0.2)', '0 0 0 0 rgba(34,197,94,0)']
                : ['0 0 0 0 rgba(245,158,11,0)', '0 0 0 8px rgba(245,158,11,0.2)', '0 0 0 0 rgba(245,158,11,0)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-2xl">{meetsOverall ? '✓' : '!'}</span>
          </motion.div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {meetsOverall 
            ? 'Candidate meets overall skill requirements for this position.' 
            : `Candidate is ${overallRequired - overallMatch}% below the overall requirement threshold.`}
        </p>
      </motion.div>
    </div>
  );
}
