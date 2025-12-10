import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecruitmentSettings } from "@/hooks/useRecruitmentData";

interface RecruitmentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: RecruitmentSettings | null;
  onSave: (settings: Partial<RecruitmentSettings>) => Promise<void>;
}

export function RecruitmentSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave
}: RecruitmentSettingsDialogProps) {
  const { toast } = useToast();
  const [cycleName, setCycleName] = useState(settings?.cycle_name || "Q1 2025 Hiring");
  const [threshold, setThreshold] = useState(settings?.passing_threshold || 70);
  const [keywords, setKeywords] = useState<string[]>(settings?.required_keywords || []);
  const [newKeyword, setNewKeyword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCycleName(settings.cycle_name);
      setThreshold(settings.passing_threshold);
      setKeywords(settings.required_keywords);
    }
  }, [settings]);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        cycle_name: cycleName,
        passing_threshold: threshold,
        required_keywords: keywords
      });
      toast({
        title: "Settings Saved",
        description: "Recruitment settings have been updated."
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-recruitment-primary" />
            Recruitment Settings
          </DialogTitle>
          <DialogDescription>
            Configure the hiring cycle, passing threshold, and required keywords.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cycle Name */}
          <div className="space-y-2">
            <Label htmlFor="cycleName">Hiring Cycle Name</Label>
            <Input
              id="cycleName"
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              placeholder="e.g., Q1 2025 Engineering Hiring"
            />
          </div>

          {/* Passing Threshold */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Passing Threshold</Label>
              <span className="text-sm font-medium text-recruitment-primary">
                {threshold}%
              </span>
            </div>
            <Slider
              value={[threshold]}
              onValueChange={(value) => setThreshold(value[0])}
              min={50}
              max={100}
              step={5}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Candidates must achieve this average board score to be selected.
            </p>
          </div>

          {/* Required Keywords */}
          <div className="space-y-3">
            <Label>Required Keywords / Skills</Label>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add a keyword..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <Button
                type="button"
                onClick={handleAddKeyword}
                className="bg-recruitment-primary hover:bg-recruitment-primary/90"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-muted/30">
              {keywords.length === 0 ? (
                <span className="text-sm text-muted-foreground">No keywords added</span>
              ) : (
                keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    className="bg-recruitment-primary hover:bg-recruitment-primary/80 gap-1"
                  >
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveKeyword(keyword)}
                    />
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-recruitment-primary hover:bg-recruitment-primary/90"
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
