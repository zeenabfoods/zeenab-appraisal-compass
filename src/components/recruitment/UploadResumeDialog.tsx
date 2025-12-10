import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { Candidate, generateNewCandidate } from "./mockData";
import { cn } from "@/lib/utils";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced email extraction patterns
  const extractEmail = (text: string): string | null => {
    // Multiple patterns for email extraction
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
      /(?:email|e-mail|mail|contact)[:\s]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
    ];
    
    for (const pattern of emailPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Clean the email
        const email = matches[0].replace(/^(?:email|e-mail|mail|contact)[:\s]*/i, '').trim();
        if (email.includes('@')) {
          return email.toLowerCase();
        }
      }
    }
    return null;
  };

  // Enhanced phone number extraction patterns
  const extractPhone = (text: string): string | null => {
    // Multiple patterns for phone extraction - handles various formats
    const phonePatterns = [
      // Nigerian format: +234, 0803, etc.
      /(?:\+?234|0)[789][01]\d{8}/g,
      // International format with country code
      /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
      // General patterns
      /(?:phone|tel|mobile|cell|contact)[:\s]*([+\d\s\-().]{10,})/gi,
      // Simple numeric patterns (10+ digits)
      /\b\d{10,14}\b/g,
    ];
    
    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Clean the phone number
        let phone = matches[0].replace(/^(?:phone|tel|mobile|cell|contact)[:\s]*/i, '').trim();
        // Remove non-phone characters but keep + for country code
        phone = phone.replace(/[^\d+]/g, '');
        if (phone.length >= 10) {
          return phone;
        }
      }
    }
    return null;
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

  const simulateUpload = async (file: File) => {
    setState('uploading');
    setFileName(file.name);
    
    // Read file content for extraction
    const fileContent = await readFileContent(file);
    
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
    
    // Simulate data extraction
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 150));
      setProgress(i);
    }

    // Generate candidate data with extracted info
    const candidateName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const newCandidate = generateNewCandidate(candidateName);
    
    // Try to extract email and phone from file content
    const extractedEmail = extractEmail(fileContent);
    const extractedPhone = extractPhone(fileContent);
    
    // Override with extracted data if found
    if (extractedEmail) {
      newCandidate.email = extractedEmail;
    }
    if (extractedPhone) {
      newCandidate.phone = extractedPhone;
    }
    
    // Store the file content as resume text for reference
    newCandidate.resumeText = fileContent.substring(0, 5000); // Limit size
    
    setExtractedData(newCandidate);
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
      onUploadComplete(extractedData);
      resetState();
    }
  };

  const resetState = () => {
    setState('idle');
    setProgress(0);
    setFileName(null);
    setExtractedData(null);
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
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
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
                    <span className="text-muted-foreground">Role:</span>
                    <span className="ml-2 font-medium">{extractedData.currentRole}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skills Found:</span>
                    <span className="ml-2 font-medium">{extractedData.foundKeywords.length}</span>
                  </div>
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
