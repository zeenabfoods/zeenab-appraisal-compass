import { Card } from "@/components/ui/card";
import { FileText, ExternalLink, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DocumentViewerProps {
  documentUrl: string | null;
  documentName: string;
  documentType?: 'pdf' | 'doc' | 'docx' | 'unknown';
}

export function DocumentViewer({ documentUrl, documentName, documentType = 'unknown' }: DocumentViewerProps) {
  const [loadError, setLoadError] = useState(false);

  // Determine if we can render inline (only PDF)
  const canRenderInline = documentType === 'pdf' && documentUrl;

  if (!documentUrl) {
    return (
      <Card className="shadow-sm overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b flex items-center gap-2">
          <FileText className="h-5 w-5 text-recruitment-primary" />
          <span className="font-medium">Resume - {documentName}</span>
        </div>
        <div className="bg-white dark:bg-gray-900 p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No Document Available</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            The resume document was not uploaded or stored. Only extracted data is available for this candidate.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-recruitment-primary" />
          <span className="font-medium">Resume - {documentName}</span>
          <span className="text-xs text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
            {documentType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(documentUrl, '_blank')}
            className="gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const link = document.createElement('a');
              link.href = documentUrl;
              link.download = documentName;
              link.click();
            }}
            className="gap-1"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 min-h-[500px]">
        {canRenderInline && !loadError ? (
          <iframe
            src={documentUrl}
            className="w-full h-[600px] border-0"
            title={`Resume - ${documentName}`}
            onError={() => setLoadError(true)}
          />
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">
              {documentType === 'pdf' ? 'PDF Preview Unavailable' : 'Word Document'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              {documentType === 'pdf' 
                ? 'Unable to render PDF inline. Click the buttons above to open or download the document.'
                : 'Word documents cannot be previewed inline. Please download to view the full document.'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => window.open(documentUrl, '_blank')}
                className="bg-recruitment-primary hover:bg-recruitment-primary/90 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Document
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
