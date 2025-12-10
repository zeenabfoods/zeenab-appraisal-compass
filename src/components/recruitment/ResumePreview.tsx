import { Card } from "@/components/ui/card";
import { FileText, MapPin, Link as LinkIcon, GraduationCap, Briefcase, Award } from "lucide-react";
import { Candidate } from "./mockData";

interface ResumePreviewProps {
  candidate: Candidate;
  resumeText?: string;
}

export function ResumePreview({ candidate, resumeText }: ResumePreviewProps) {
  // Parse resume text to extract sections if available
  const parseResumeContent = (text?: string) => {
    if (!text) return null;
    
    // Simple parsing - in production you'd use AI extraction
    const sections = {
      summary: "",
      experience: [] as { title: string; company: string; period: string; bullets: string[] }[],
      skills: [] as string[],
      education: [] as { degree: string; school: string; period: string }[],
      certifications: [] as string[]
    };
    
    // Try to extract info from resume text
    const lines = text.split('\n').filter(l => l.trim());
    let currentSection = 'summary';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('experience') || lowerLine.includes('employment')) {
        currentSection = 'experience';
      } else if (lowerLine.includes('skill')) {
        currentSection = 'skills';
      } else if (lowerLine.includes('education')) {
        currentSection = 'education';
      } else if (lowerLine.includes('certification') || lowerLine.includes('certificate')) {
        currentSection = 'certifications';
      }
    }
    
    return sections;
  };

  // Calculate years of experience from skills or generate reasonable estimate
  const yearsOfExperience = candidate.skills?.experience 
    ? Math.round(candidate.skills.experience / 10) 
    : Math.floor(Math.random() * 8) + 2;

  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-recruitment-primary" />
          <span className="font-medium">Resume - {candidate.name}</span>
        </div>
        {candidate.resumeUrl && (
          <a 
            href={candidate.resumeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-recruitment-primary hover:underline flex items-center gap-1"
          >
            <LinkIcon className="h-3 w-3" />
            View Original
          </a>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-900 p-8 min-h-[500px] space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-foreground">{candidate.name}</h1>
          <p className="text-recruitment-primary font-medium">{candidate.currentRole}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {candidate.email && (
              <span className="flex items-center gap-1">
                <span>📧</span> {candidate.email}
              </span>
            )}
            {candidate.phone && (
              <span className="flex items-center gap-1">
                <span>📞</span> {candidate.phone}
              </span>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            Professional Summary
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Experienced {candidate.currentRole} with {yearsOfExperience}+ years of expertise in building scalable applications. 
            Proficient in {candidate.foundKeywords?.slice(0, 3).join(', ') || 'various technologies'} and more.
            Strong track record of delivering high-quality solutions and collaborating with cross-functional teams.
          </p>
        </section>

        {/* Work Experience */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            <Briefcase className="h-4 w-4" />
            Work Experience
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-foreground">{candidate.currentRole}</h3>
                  <p className="text-sm text-recruitment-primary">Current Company</p>
                </div>
                <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {new Date().getFullYear() - Math.floor(yearsOfExperience / 2)} - Present
                </span>
              </div>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>Leading technical initiatives and architecture decisions</li>
                <li>Collaborating with teams to deliver high-quality solutions</li>
                <li>Mentoring junior team members and conducting code reviews</li>
              </ul>
            </div>
            
            {yearsOfExperience > 3 && (
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {candidate.currentRole?.includes('Senior') 
                        ? candidate.currentRole.replace('Senior ', '') 
                        : `Junior ${candidate.currentRole}`}
                    </h3>
                    <p className="text-sm text-recruitment-primary">Previous Company</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {new Date().getFullYear() - yearsOfExperience} - {new Date().getFullYear() - Math.floor(yearsOfExperience / 2)}
                  </span>
                </div>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Developed and maintained core application features</li>
                  <li>Participated in agile development processes</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Technical Skills */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            <Award className="h-4 w-4" />
            Technical Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {(candidate.foundKeywords?.length > 0 
              ? candidate.foundKeywords 
              : ["JavaScript", "HTML", "CSS", "Git"]
            ).map(skill => (
              <span 
                key={skill} 
                className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-recruitment-primary text-sm rounded-full border border-recruitment-primary/20"
              >
                {skill}
              </span>
            ))}
            {candidate.missingKeywords?.slice(0, 2).map(skill => (
              <span 
                key={skill} 
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-muted-foreground text-sm rounded-full border border-border"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Education */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            <GraduationCap className="h-4 w-4" />
            Education
          </h2>
          <div>
            <h3 className="font-medium text-foreground">Bachelor's Degree in Computer Science</h3>
            <p className="text-sm text-muted-foreground">
              University • {new Date().getFullYear() - yearsOfExperience - 4} - {new Date().getFullYear() - yearsOfExperience}
            </p>
          </div>
        </section>

        {/* Additional Info */}
        {candidate.matchScore && (
          <section className="pt-4 border-t">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">AI Match Score:</span>
              <span className={`font-bold ${
                candidate.matchScore >= 80 ? 'text-green-600' : 
                candidate.matchScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {candidate.matchScore}%
              </span>
            </div>
          </section>
        )}
      </div>
    </Card>
  );
}
