import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface KeywordBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}

export function KeywordBankDialog({
  open,
  onOpenChange,
  keywords,
  onKeywordsChange
}: KeywordBankDialogProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const [localKeywords, setLocalKeywords] = useState<string[]>(keywords);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !localKeywords.includes(newKeyword.trim())) {
      setLocalKeywords([...localKeywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setLocalKeywords(localKeywords.filter(k => k !== keyword));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSave = () => {
    onKeywordsChange(localKeywords);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyword Bank</DialogTitle>
          <DialogDescription>
            Define required skills and keywords for the open role. Candidates will be matched against these criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new keyword */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a keyword (e.g., React, SQL)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleAddKeyword} size="icon" className="shrink-0 bg-recruitment-primary hover:bg-recruitment-primary/90">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Keywords list */}
          <div className="min-h-[100px] p-4 border rounded-lg bg-gray-50">
            {localKeywords.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">
                No keywords added yet. Add skills to start matching candidates.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {localKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quick add suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1">
              {["JavaScript", "Python", "AWS", "Docker", "Agile", "Leadership", "Communication"].map(suggestion => (
                !localKeywords.includes(suggestion) && (
                  <button
                    key={suggestion}
                    onClick={() => setLocalKeywords([...localKeywords, suggestion])}
                    className="text-xs px-2 py-1 border rounded-full hover:bg-orange-50 hover:border-recruitment-primary hover:text-recruitment-primary transition-colors"
                  >
                    + {suggestion}
                  </button>
                )
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-recruitment-primary hover:bg-recruitment-primary/90">
            Save Keywords
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
