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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Plus, Settings2, Users, UserPlus, Trash2, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecruitmentSettings, SkillRequirements } from "@/hooks/useRecruitmentData";
import { supabase } from "@/integrations/supabase/client";

interface BoardMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

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
  
  // Skill requirements
  const [skillRequirements, setSkillRequirements] = useState<SkillRequirements>(
    settings?.skill_requirements || {
      technical: 80,
      experience: 75,
      education: 70,
      softSkills: 80,
      tools: 75
    }
  );
  
  // Board member management
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (settings) {
      setCycleName(settings.cycle_name);
      setThreshold(settings.passing_threshold);
      setKeywords(settings.required_keywords);
      setSkillRequirements(settings.skill_requirements || {
        technical: 80,
        experience: 75,
        education: 70,
        softSkills: 80,
        tools: 75
      });
    }
  }, [settings]);

  // Fetch board members (users with recruiter role)
  useEffect(() => {
    if (open) {
      fetchBoardMembers();
    }
  }, [open]);

  const fetchBoardMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('role', 'recruiter')
        .eq('is_active', true);

      if (error) throw error;
      setBoardMembers(data || []);
    } catch (error) {
      console.error('Error fetching board members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddBoardMember = async () => {
    if (!newMemberEmail.trim() || !newMemberFirstName.trim() || !newMemberLastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields for the new board member.",
        variant: "destructive"
      });
      return;
    }

    setAddingMember(true);
    try {
      // Create auth user first (this would normally be done via admin API or invite)
      // For now, we'll create a profile entry that can be linked to an auth user later
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newMemberEmail.trim())
        .maybeSingle();

      if (existingUser) {
        // Update existing user to recruiter role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'recruiter' })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;
        
        toast({
          title: "Board Member Added",
          description: `${newMemberFirstName} has been granted recruiter access. They need to log out and log back in to see the Recruitment menu.`
        });
      } else {
        toast({
          title: "User Not Found",
          description: "This email is not registered. Please have them sign up first, then add them as a board member.",
          variant: "destructive"
        });
        setAddingMember(false);
        return;
      }

      setNewMemberEmail("");
      setNewMemberFirstName("");
      setNewMemberLastName("");
      await fetchBoardMembers();
    } catch (error) {
      console.error('Error adding board member:', error);
      toast({
        title: "Error",
        description: "Failed to add board member.",
        variant: "destructive"
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveBoardMember = async (memberId: string) => {
    try {
      // Change role back to staff
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'staff' })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Board Member Removed",
        description: "User has been removed from the board."
      });
      await fetchBoardMembers();
    } catch (error) {
      console.error('Error removing board member:', error);
      toast({
        title: "Error",
        description: "Failed to remove board member.",
        variant: "destructive"
      });
    }
  };

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
        required_keywords: keywords,
        skill_requirements: skillRequirements
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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-recruitment-primary" />
            Recruitment Settings
          </DialogTitle>
          <DialogDescription>
            Configure hiring cycle, board members, and evaluation criteria.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <Sliders className="h-4 w-4" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-2">
              <Users className="h-4 w-4" />
              Board
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 py-4">
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
          </TabsContent>

          <TabsContent value="skills" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Set the minimum skill requirements for candidates. These thresholds are used in the Skills Comparison chart.
            </p>
            
            {[
              { key: 'technical', label: 'Technical Skills', color: 'text-blue-500' },
              { key: 'experience', label: 'Experience', color: 'text-purple-500' },
              { key: 'education', label: 'Education', color: 'text-emerald-500' },
              { key: 'softSkills', label: 'Soft Skills', color: 'text-orange-500' },
              { key: 'tools', label: 'Tools & Technologies', color: 'text-pink-500' }
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between">
                  <Label className={color}>{label}</Label>
                  <span className="text-sm font-medium">
                    {skillRequirements[key as keyof SkillRequirements]}%
                  </span>
                </div>
                <Slider
                  value={[skillRequirements[key as keyof SkillRequirements]]}
                  onValueChange={(value) => setSkillRequirements(prev => ({ ...prev, [key]: value[0] }))}
                  min={50}
                  max={100}
                  step={5}
                  className="cursor-pointer"
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="board" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Board members can evaluate candidates. They will only have access to the Recruitment module.
            </p>

            {/* Add New Board Member */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="h-4 w-4 text-recruitment-primary" />
                  <span className="font-medium text-sm">Add Board Member</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="First Name"
                    value={newMemberFirstName}
                    onChange={(e) => setNewMemberFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Last Name"
                    value={newMemberLastName}
                    onChange={(e) => setNewMemberLastName(e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleAddBoardMember}
                  disabled={addingMember}
                  className="w-full mt-3 bg-recruitment-primary hover:bg-recruitment-primary/90"
                >
                  {addingMember ? "Adding..." : "Add to Board"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  User must already have an account. Enter their registered email.
                </p>
              </CardContent>
            </Card>

            {/* Current Board Members */}
            <div className="space-y-2">
              <Label>Current Board Members ({boardMembers.length})</Label>
              {loadingMembers ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : boardMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  No board members yet. Add users above.
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {boardMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-recruitment-primary/20 text-recruitment-primary text-xs">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBoardMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-2" />

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
