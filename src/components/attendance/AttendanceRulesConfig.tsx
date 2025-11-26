import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Save, X, Settings, Clock, DollarSign } from 'lucide-react';
import { useAttendanceRules } from '@/hooks/attendance/useAttendanceRules';
import { TablesInsert } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export function AttendanceRulesConfig() {
  const { rules, loading, createRule, updateRule, deleteRule } = useAttendanceRules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    work_start_time: '08:00',
    work_end_time: '17:00',
    grace_period_minutes: '5',
    late_threshold_minutes: '15',
    late_charge_amount: '500',
    absence_charge_amount: '1000',
    mandatory_break_duration_minutes: '30',
    max_break_duration_minutes: '60',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const ruleData: TablesInsert<'attendance_rules'> = {
        rule_name: formData.rule_name,
        work_start_time: formData.work_start_time,
        work_end_time: formData.work_end_time,
        grace_period_minutes: parseInt(formData.grace_period_minutes),
        late_threshold_minutes: parseInt(formData.late_threshold_minutes),
        late_charge_amount: parseFloat(formData.late_charge_amount),
        absence_charge_amount: parseFloat(formData.absence_charge_amount),
        mandatory_break_duration_minutes: parseInt(formData.mandatory_break_duration_minutes),
        max_break_duration_minutes: parseInt(formData.max_break_duration_minutes),
        is_active: formData.is_active,
      };

      if (editingRule) {
        await updateRule(editingRule, ruleData);
      } else {
        await createRule(ruleData);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      work_start_time: '08:00',
      work_end_time: '17:00',
      grace_period_minutes: '5',
      late_threshold_minutes: '15',
      late_charge_amount: '500',
      absence_charge_amount: '1000',
      mandatory_break_duration_minutes: '30',
      max_break_duration_minutes: '60',
      is_active: true,
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: typeof rules[0]) => {
    setFormData({
      rule_name: rule.rule_name,
      work_start_time: rule.work_start_time || '08:00',
      work_end_time: rule.work_end_time || '17:00',
      grace_period_minutes: rule.grace_period_minutes?.toString() || '5',
      late_threshold_minutes: rule.late_threshold_minutes?.toString() || '15',
      late_charge_amount: rule.late_charge_amount?.toString() || '500',
      absence_charge_amount: rule.absence_charge_amount?.toString() || '1000',
      mandatory_break_duration_minutes: rule.mandatory_break_duration_minutes?.toString() || '30',
      max_break_duration_minutes: rule.max_break_duration_minutes?.toString() || '60',
      is_active: rule.is_active ?? true,
    });
    setEditingRule(rule.id);
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading rules...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Attendance Rules & Policies</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="rule_name">Rule Name *</Label>
                <Input
                  id="rule_name"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="e.g., Standard Office Hours"
                  required
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Working Hours
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="work_start">Start Time *</Label>
                    <Input
                      id="work_start"
                      type="time"
                      value={formData.work_start_time}
                      onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="work_end">End Time *</Label>
                    <Input
                      id="work_end"
                      type="time"
                      value={formData.work_end_time}
                      onChange={(e) => setFormData({ ...formData, work_end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Late Arrival Policy
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grace_period">Grace Period (minutes)</Label>
                    <Input
                      id="grace_period"
                      type="number"
                      value={formData.grace_period_minutes}
                      onChange={(e) => setFormData({ ...formData, grace_period_minutes: e.target.value })}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      No charge if within this time
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="late_threshold">Late Threshold (minutes)</Label>
                    <Input
                      id="late_threshold"
                      type="number"
                      value={formData.late_threshold_minutes}
                      onChange={(e) => setFormData({ ...formData, late_threshold_minutes: e.target.value })}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Marked as late after this time
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Charges (₦)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="late_charge">Late Arrival Charge</Label>
                    <Input
                      id="late_charge"
                      type="number"
                      value={formData.late_charge_amount}
                      onChange={(e) => setFormData({ ...formData, late_charge_amount: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="absence_charge">Absence Charge</Label>
                    <Input
                      id="absence_charge"
                      type="number"
                      value={formData.absence_charge_amount}
                      onChange={(e) => setFormData({ ...formData, absence_charge_amount: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Break Policy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mandatory_break">Mandatory Break (minutes)</Label>
                    <Input
                      id="mandatory_break"
                      type="number"
                      value={formData.mandatory_break_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, mandatory_break_duration_minutes: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_break">Max Break Duration (minutes)</Label>
                    <Input
                      id="max_break"
                      type="number"
                      value={formData.max_break_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, max_break_duration_minutes: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active Rule</Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingRule ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="p-8 text-center">
            <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Rules Configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first attendance rule to define working hours and policies
            </p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{rule.rule_name}</h3>
                    {rule.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Work Hours</p>
                  <p className="font-medium">
                    {rule.work_start_time} - {rule.work_end_time}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grace Period</p>
                  <p className="font-medium">{rule.grace_period_minutes} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Late Charge</p>
                  <p className="font-medium">₦{rule.late_charge_amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Absence Charge</p>
                  <p className="font-medium">₦{rule.absence_charge_amount}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
