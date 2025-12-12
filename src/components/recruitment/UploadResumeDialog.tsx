import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, Loader2, Edit2 } from "lucide-react";
import { Candidate } from "./mockData";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
interface UploadResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (candidate: Candidate) => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'extracting' | 'complete';

export function UploadResumeDialog({
  open,
  onOpenChange,
  onUploadComplete
}: UploadResumeDialogProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Candidate | null>(null);
  const [appliedRole, setAppliedRole] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced email extraction patterns
  const extractEmail = (text: string): string | null => {
    // Clean the text first
    const cleanText = text.replace(/\s+/g, ' ');
    
    // Multiple patterns for email extraction - most specific first
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/gi,
      /(?:email|e-mail|mail)[:\s]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7})/gi,
    ];
    
    for (const pattern of emailPatterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          // Clean the email
          const email = match.replace(/^(?:email|e-mail|mail)[:\s]*/i, '').trim().toLowerCase();
          // Validate it looks like an email
          if (email.includes('@') && email.includes('.') && !email.includes(' ')) {
            return email;
          }
        }
      }
    }
    return null;
  };

  // Enhanced phone number extraction patterns
  const extractPhone = (text: string): string | null => {
    const cleanText = text.replace(/\s+/g, ' ');
    
    // Multiple patterns for phone extraction - handles various formats
    const phonePatterns = [
      // Nigerian format: +234, 0803, etc.
      /(?:\+?234|0)[789][01]\d{8}/g,
      // International format with country code
      /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
      // Labeled phone numbers
      /(?:phone|tel|mobile|cell)[:\s]*([+\d\s\-().]{10,18})/gi,
      // Common phone formats
      /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
      // Simple numeric patterns (10-14 digits)
      /\b\d{10,14}\b/g,
    ];
    
    for (const pattern of phonePatterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          // Clean the phone number
          let phone = match.replace(/^(?:phone|tel|mobile|cell)[:\s]*/i, '').trim();
          // Keep only digits and + sign
          phone = phone.replace(/[^\d+]/g, '');
          if (phone.length >= 10 && phone.length <= 15) {
            return phone;
          }
        }
      }
    }
    return null;
  };

  // Extract name from resume text
  const extractName = (text: string, fileName: string): string => {
    // Try to extract name from first lines (common resume pattern)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // First non-empty line is often the name
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      // Check if it looks like a name (2-4 words, letters/spaces/hyphens/periods only)
      if (/^[A-Za-z][A-Za-z\s.'-]{1,48}[A-Za-z.]$/.test(line)) {
        const words = line.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words.length <= 5) {
          // Ensure it's not all caps acronyms or titles
          const hasLowerCase = /[a-z]/.test(line);
          if (hasLowerCase || line.length > 10) {
            return line;
          }
        }
      }
    }
    
    // Fallback to filename
    return fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  };

  // Extract current role from resume text
  const extractCurrentRole = (text: string): string | null => {
    const rolePatterns = [
      /(?:current\s*(?:position|role|title)|job\s*title)[:\s]*([A-Za-z\s,]+)/i,
      /(?:^|\n)([A-Za-z]+\s+(?:Developer|Engineer|Manager|Lead|Architect|Designer|Analyst|Consultant|Director|Specialist|Coordinator))/im,
      /(?:position|role|title)[:\s]*([A-Za-z\s,]+)(?:\n|$)/i,
    ];
    
    for (const pattern of rolePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().substring(0, 50);
      }
    }
    return null;
  };

  // Extract years of experience
  const extractExperience = (text: string): number | undefined => {
    const expPatterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/i,
      /experience[:\s]*(\d+)\+?\s*years?/i,
      /(\d+)\+?\s*years?\s*(?:in\s*(?:the\s*)?(?:industry|field))/i,
    ];
    
    for (const pattern of expPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    return undefined;
  };

  // Extract location from resume text
  const extractLocation = (text: string): string | null => {
    const locationPatterns = [
      /(?:location|address|city)[:\s]*([A-Za-z\s,]+)(?:\n|$)/i,
      /([A-Za-z\s]+,\s*(?:Nigeria|USA|UK|Canada|India|Ghana))/i,
      /(?:Lagos|Abuja|Port Harcourt|Kano|Ibadan|Kaduna|Benin City)/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return (match[1] || match[0]).trim().substring(0, 50);
      }
    }
    return null;
  };

  // Extract education from resume text
  const extractEducation = (text: string): string | null => {
    const eduPatterns = [
      /(?:B\.?S\.?c?|B\.?A\.?|M\.?S\.?c?|M\.?A\.?|Ph\.?D\.?|Bachelor|Master|Doctorate)['\s]*(?:in\s*)?([A-Za-z\s,]+)/i,
      /(?:degree|education)[:\s]*([A-Za-z\s,]+)(?:\n|$)/i,
    ];
    
    for (const pattern of eduPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim().substring(0, 100);
      }
    }
    return null;
  };

  // Extract LinkedIn URL
  const extractLinkedIn = (text: string): string | null => {
    const match = text.match(/(?:linkedin\.com\/in\/|linkedin:?\s*)([a-zA-Z0-9-]+)/i);
    if (match) {
      return `https://linkedin.com/in/${match[1]}`;
    }
    return null;
  };

  // Extract skills/keywords from resume
  const extractSkills = (text: string, keywords: string[]): { found: string[], missing: string[] } => {
    const textLower = text.toLowerCase();
    const found: string[] = [];
    const missing: string[] = [];
    
    // Common tech skills to look for
    const allSkills = [...keywords, 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 
      'SQL', 'Java', 'C#', '.NET', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git',
      'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'MySQL', 'REST', 'API', 'Agile', 'Scrum'];
    
    const uniqueSkills = [...new Set(allSkills)];
    
    for (const skill of uniqueSkills) {
      if (textLower.includes(skill.toLowerCase())) {
        found.push(skill);
      }
    }
    
    // Check which keywords are missing
    for (const keyword of keywords) {
      if (!textLower.includes(keyword.toLowerCase())) {
        missing.push(keyword);
      }
    }
    
    return { found: [...new Set(found)], missing: [...new Set(missing)] };
  };

  // Read file content for text extraction
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || '';
        resolve(content);
      };
      reader.onerror = () => resolve('');
      
      // Try to read as text (works for some doc formats)
      reader.readAsText(file);
    });
  };

  // Upload file to Supabase storage and return public URL
  const uploadToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log('Uploading file to storage:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting if file exists
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Don't fail the whole process, candidate can still be saved without resume URL
        return null;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Storage upload failed:', error);
      return null;
    }
  };

  const simulateUpload = async (file: File) => {
    setState('uploading');
    setFileName(file.name);
    
    // Read file content for extraction
    const fileContent = await readFileContent(file);
    
    // Upload to Supabase storage for persistent storage
    const storageUrl = await uploadToStorage(file);
    
    // Determine document type
    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const docType = ext === 'pdf' ? 'pdf' : ['doc', 'docx'].includes(ext) ? ext : 'unknown';
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 100));
      setProgress(i);
    }

    setState('processing');
    setProgress(0);
    
    // Simulate AI processing
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 80));
      setProgress(i);
    }

    setState('extracting');
    setProgress(0);
    
    // Simulate data extraction progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 150));
      setProgress(i);
    }

    // Extract real data from resume content
    const extractedName = extractName(fileContent, file.name);
    const extractedEmailValue = extractEmail(fileContent);
    const extractedPhoneValue = extractPhone(fileContent);
    const extractedRole = extractCurrentRole(fileContent);
    const extractedExp = extractExperience(fileContent);
    const extractedLoc = extractLocation(fileContent);
    const extractedEdu = extractEducation(fileContent);
    const extractedLinkedInUrl = extractLinkedIn(fileContent);
    const skillsResult = extractSkills(fileContent, ['React', 'TypeScript', 'Node.js', 'SQL', 'Leadership']);
    
    // Calculate a realistic match score based on skills found
    const matchScore = Math.min(100, Math.round(
      (skillsResult.found.length / (skillsResult.found.length + skillsResult.missing.length)) * 100
    )) || 50;

    // Build candidate from REAL extracted data (no mock data)
    const newCandidate: Candidate = {
      id: Date.now().toString(),
      name: extractedName,
      email: extractedEmailValue || '',
      phone: extractedPhoneValue || '',
      currentRole: extractedRole || '',
      appliedRole: '', // HR will set this
      matchScore,
      status: 'pending',
      resumeUrl: storageUrl || undefined, // Persistent URL from Supabase storage
      resumeText: fileContent.substring(0, 10000),
      yearsOfExperience: extractedExp,
      location: extractedLoc || undefined,
      education: extractedEdu || undefined,
      linkedIn: extractedLinkedInUrl || undefined,
      skills: {
        technical: Math.min(100, skillsResult.found.length * 15),
        experience: extractedExp ? Math.min(100, extractedExp * 10) : 50,
        education: extractedEdu ? 75 : 50,
        softSkills: 60,
        tools: Math.min(100, skillsResult.found.length * 12)
      },
      foundKeywords: skillsResult.found,
      missingKeywords: skillsResult.missing,
      boardScores: {
        technicalProficiency: 5,
        relevantExperience: 5,
        culturalFit: 5,
        problemSolving: 5,
        leadership: 5
      }
    };
    
    setExtractedData(newCandidate);
    setAppliedRole(""); // Empty so HR can set it
    setState('complete');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      simulateUpload(file);
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      // Set applied role separately - DO NOT override currentRole
      const finalCandidate: Candidate = {
        ...extractedData,
        appliedRole: appliedRole || extractedData.currentRole || 'Not specified',
        // Keep currentRole as extracted from resume
      };
      onUploadComplete(finalCandidate);
      resetState();
    }
  };

  const resetState = () => {
    setState('idle');
    setProgress(0);
    setFileName(null);
    setExtractedData(null);
    setAppliedRole("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const getStatusText = () => {
    switch (state) {
      case 'uploading': return 'Uploading resume...';
      case 'processing': return 'AI analyzing document...';
      case 'extracting': return 'Extracting candidate data...';
      case 'complete': return 'Extraction complete!';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload a PDF or Word document. Our AI will automatically extract candidate information.
          </DialogDescription>
        </DialogHeader>

        {state === 'idle' ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-recruitment-primary transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-orange-50">
                <Upload className="h-8 w-8 text-recruitment-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Drop your file here, or <span className="text-recruitment-primary">browse</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports PDF and Word documents
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-6 w-6 text-recruitment-primary" />
              <span className="font-medium truncate">{fileName}</span>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={cn(
                  "flex items-center gap-2",
                  state === 'complete' ? "text-green-600" : "text-muted-foreground"
                )}>
                  {state === 'complete' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {getStatusText()}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Extracted data preview */}
            {state === 'complete' && extractedData && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <h4 className="font-medium text-green-800">Extracted Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{extractedData.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Match:</span>
                    <span className="ml-2 font-medium text-recruitment-primary">{extractedData.matchScore}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{extractedData.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="ml-2 font-medium">{extractedData.phone || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Skills Found:</span>
                    <span className="ml-2 font-medium">{extractedData.foundKeywords.length}</span>
                  </div>
                </div>
                
                {/* Applied Role - Editable by HR */}
                <div className="pt-3 border-t border-green-200">
                  <Label htmlFor="applied-role" className="text-green-800 flex items-center gap-1 mb-2">
                    <Edit2 className="h-3 w-3" />
                    Applied Role (Set by HR)
                  </Label>
                  <Input
                    id="applied-role"
                    value={appliedRole}
                    onChange={(e) => setAppliedRole(e.target.value)}
                    placeholder="e.g., Software Engineer, Project Manager"
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            {state === 'complete' && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetState} className="flex-1">
                  Upload Another
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  className="flex-1 bg-recruitment-primary hover:bg-recruitment-primary/90"
                >
                  Add Candidate
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
