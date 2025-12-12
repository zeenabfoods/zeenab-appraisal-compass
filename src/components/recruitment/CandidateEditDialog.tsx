import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CandidateEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  initialData: {
    name: string;
    email: string;
    phone: string;
    appliedRole: string;
    currentRole: string;
    yearsOfExperience: number | null;
    location: string;
    education: string;
    linkedIn: string;
  };
  onSaved: () => void;
}

export function CandidateEditDialog({
  isOpen,
  onClose,
  candidateId,
  initialData,
  onSaved
}: CandidateEditDialogProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          applied_role: formData.appliedRole,
          candidate_current_role: formData.currentRole,
          years_of_experience: formData.yearsOfExperience,
          location: formData.location,
          education: formData.education,
          linkedin: formData.linkedIn
        })
        .eq('id', candidateId);

      if (error) throw error;

      toast({
        title: "Candidate Updated",
        description: "Candidate information has been saved successfully.",
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast({
        title: "Error",
        description: "Failed to update candidate information.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Candidate Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appliedRole">Applied Role</Label>
            <Input
              id="appliedRole"
              value={formData.appliedRole}
              onChange={(e) => handleChange('appliedRole', e.target.value)}
              placeholder="Enter applied role"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentRole">Current Role</Label>
            <Input
              id="currentRole"
              value={formData.currentRole}
              onChange={(e) => handleChange('currentRole', e.target.value)}
              placeholder="Enter current role"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsOfExperience">Years of Experience</Label>
            <Input
              id="yearsOfExperience"
              type="number"
              min="0"
              value={formData.yearsOfExperience ?? ''}
              onChange={(e) => handleChange('yearsOfExperience', e.target.value ? parseInt(e.target.value) : 0)}
              placeholder="Enter years of experience"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Enter location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education</Label>
            <Input
              id="education"
              value={formData.education}
              onChange={(e) => handleChange('education', e.target.value)}
              placeholder="Enter education"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedIn">LinkedIn URL</Label>
            <Input
              id="linkedIn"
              value={formData.linkedIn}
              onChange={(e) => handleChange('linkedIn', e.target.value)}
              placeholder="Enter LinkedIn profile URL"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-recruitment-primary hover:bg-recruitment-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
