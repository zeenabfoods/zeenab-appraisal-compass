import { cn } from "@/lib/utils";

interface MatchScoreCircleProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function MatchScoreCircle({ score, size = "md" }: MatchScoreCircleProps) {
  const sizeClasses = {
    sm: "w-16 h-16 text-lg",
    md: "w-24 h-24 text-2xl",
    lg: "w-32 h-32 text-3xl"
  };

  const strokeWidth = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const radius = size === "sm" ? 28 : size === "md" ? 42 : 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#FF5722";
    return "#ef4444";
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold" style={{ color: getColor() }}>
          {score}%
        </span>
        <span className="text-xs text-muted-foreground">Match</span>
      </div>
    </div>
  );
}
