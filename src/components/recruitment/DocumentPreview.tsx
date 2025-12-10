import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface DocumentPreviewProps {
  candidateName: string;
}

export function DocumentPreview({ candidateName }: DocumentPreviewProps) {
  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="bg-gray-100 p-4 border-b flex items-center gap-2">
        <FileText className="h-5 w-5 text-recruitment-primary" />
        <span className="font-medium">Resume - {candidateName}.pdf</span>
      </div>
      
      {/* Simulated PDF Preview */}
      <div className="bg-white p-8 min-h-[500px] space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-900">{candidateName}</h1>
          <p className="text-muted-foreground">Senior Software Engineer</p>
        </div>

        {/* Summary */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            Professional Summary
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Experienced software engineer with 8+ years of expertise in building scalable web applications. 
            Proficient in React, TypeScript, Node.js, and cloud technologies. Strong track record of 
            leading cross-functional teams and delivering high-quality software solutions.
          </p>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            Work Experience
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Senior Frontend Developer</h3>
                  <p className="text-sm text-recruitment-primary">TechCorp Inc.</p>
                </div>
                <span className="text-xs text-muted-foreground">2021 - Present</span>
              </div>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Led a team of 5 developers in building a SaaS platform</li>
                <li>Reduced application load time by 40% through optimization</li>
                <li>Implemented CI/CD pipelines and automated testing</li>
              </ul>
            </div>
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Full Stack Developer</h3>
                  <p className="text-sm text-recruitment-primary">StartupXYZ</p>
                </div>
                <span className="text-xs text-muted-foreground">2018 - 2021</span>
              </div>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>Developed RESTful APIs serving 100K+ daily users</li>
                <li>Built real-time features using WebSocket technology</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            Technical Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Docker", "GraphQL", "Python"].map(skill => (
              <span key={skill} className="px-3 py-1 bg-orange-50 text-recruitment-primary text-sm rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Education */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <div className="w-1 h-5 bg-recruitment-primary rounded-full" />
            Education
          </h2>
          <div>
            <h3 className="font-medium">B.S. Computer Science</h3>
            <p className="text-sm text-muted-foreground">State University • 2014 - 2018</p>
          </div>
        </section>
      </div>
    </Card>
  );
}
