import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEscalationRules } from '@/hooks/attendance/useEscalationRules';
import { Plus, Edit2, Trash2, Save, X, TrendingUp, AlertTriangle } from 'lucide-react';

export function EscalationRulesConfig() {
  const { rules, loading, createRule, updateRule, deleteRule } = useEscalationRules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    rule_name: string;
    violation_type: 'late_arrival' | 'absence' | 'early_departure' | 'break_violation';
    lookback_period_days: string;
    reset_after_days: string;
    is_active: boolean;
    tiers: { occurrence_count: number; multiplier: number }[];
  }>({
    rule_name: '',
    violation_type: 'late_arrival',
    lookback_period_days: '30',
    reset_after_days: '90',
    is_active: true,
    tiers: [
      { occurrence_count: 2, multiplier: 1.5 },
      { occurrence_count: 3, multiplier: 2.0 },
      { occurrence_count: 5, multiplier: 3.0 },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const ruleData = {
        rule_name: formData.rule_name,
        violation_type: formData.violation_type,
        lookback_period_days: parseInt(formData.lookback_period_days),
        reset_after_days: parseInt(formData.reset_after_days),
        escalation_tiers: formData.tiers,
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
      violation_type: 'late_arrival',
      lookback_period_days: '30',
      reset_after_days: '90',
      is_active: true,
      tiers: [
        { occurrence_count: 2, multiplier: 1.5 },
        { occurrence_count: 3, multiplier: 2.0 },
        { occurrence_count: 5, multiplier: 3.0 },
      ],
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: typeof rules[0]) => {
    setFormData({
      rule_name: rule.rule_name,
      violation_type: rule.violation_type,
      lookback_period_days: rule.lookback_period_days.toString(),
      reset_after_days: rule.reset_after_days.toString(),
      is_active: rule.is_active,
      tiers: rule.escalation_tiers,
    });
    setEditingRule(rule.id);
    setIsDialogOpen(true);
  };

  const addTier = () => {
    setFormData({
      ...formData,
      tiers: [
        ...formData.tiers,
        { occurrence_count: formData.tiers.length + 2, multiplier: 1.0 },
      ],
    });
  };

  const removeTier = (index: number) => {
    setFormData({
      ...formData,
      tiers: formData.tiers.filter((_, i) => i !== index),
    });
  };

  const updateTier = (index: number, field: 'occurrence_count' | 'multiplier', value: number) => {
    const newTiers = [...formData.tiers];
    newTiers[index][field] = value;
    setFormData({ ...formData, tiers: newTiers });
  };

  const getViolationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      late_arrival: 'Late Arrival',
      absence: 'Absence',
      early_departure: 'Early Departure',
      break_violation: 'Break Violation',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading escalation rules...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Charge Escalation Rules</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically increase penalties for repeated violations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="rule_name">Rule Name *</Label>
                <Input
                  id="rule_name"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="e.g., Late Arrival Escalation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="violation_type">Violation Type *</Label>
                <Select
                  value={formData.violation_type}
                  onValueChange={(value) => setFormData({ ...formData, violation_type: value as typeof formData.violation_type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late_arrival">Late Arrival</SelectItem>
                    <SelectItem value="absence">Absence</SelectItem>
                    <SelectItem value="early_departure">Early Departure</SelectItem>
                    <SelectItem value="break_violation">Break Violation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lookback_period">Lookback Period (days)</Label>
                  <Input
                    id="lookback_period"
                    type="number"
                    value={formData.lookback_period_days}
                    onChange={(e) => setFormData({ ...formData, lookback_period_days: e.target.value })}
                    min="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Count violations within this period
                  </p>
                </div>
                <div>
                  <Label htmlFor="reset_after">Reset After (days)</Label>
                  <Input
                    id="reset_after"
                    type="number"
                    value={formData.reset_after_days}
                    onChange={(e) => setFormData({ ...formData, reset_after_days: e.target.value })}
                    min="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Reset count after this period
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Escalation Tiers</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addTier}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tier
                  </Button>
                </div>

                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    {formData.tiers.map((tier, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Occurrence #{index + 1}</Label>
                            <Input
                              type="number"
                              value={tier.occurrence_count}
                              onChange={(e) =>
                                updateTier(index, 'occurrence_count', parseInt(e.target.value))
                              }
                              min="1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Multiplier</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={tier.multiplier}
                              onChange={(e) =>
                                updateTier(index, 'multiplier', parseFloat(e.target.value))
                              }
                              min="1"
                            />
                          </div>
                        </div>
                        {formData.tiers.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTier(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    <strong>Example:</strong> If an employee is late 3 times within{' '}
                    {formData.lookback_period_days} days, the 3rd charge will be multiplied by{' '}
                    {formData.tiers.find((t) => t.occurrence_count === 3)?.multiplier || '2.0'}x
                  </p>
                </Card>
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

      {/* Information Card */}
      <Card className="p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100">How Escalation Works</h4>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-disc list-inside">
              <li>System counts violations within the lookback period</li>
              <li>Charges are automatically multiplied based on occurrence count</li>
              <li>Escalation resets after the specified reset period</li>
              <li>Only one active rule per violation type is applied</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Escalation Rules</h3>
            <p className="text-muted-foreground mb-4">
              Create escalation rules to automatically increase penalties for repeat violations
            </p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{rule.rule_name}</h3>
                    {rule.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {getViolationTypeLabel(rule.violation_type)}
                  </Badge>
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

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Lookback Period</p>
                  <p className="font-medium">{rule.lookback_period_days} days</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reset After</p>
                  <p className="font-medium">{rule.reset_after_days} days</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Escalation Tiers:</p>
                <div className="flex flex-wrap gap-2">
                  {rule.escalation_tiers
                    .sort((a, b) => a.occurrence_count - b.occurrence_count)
                    .map((tier, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {tier.occurrence_count}x offense = {tier.multiplier}x charge
                      </Badge>
                    ))}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
