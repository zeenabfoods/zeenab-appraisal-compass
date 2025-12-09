import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOvertimeRates, OvertimeRate } from '@/hooks/attendance/useOvertimeRates';
import { Plus, Pencil, Trash2, Clock, Loader2 } from 'lucide-react';

export function OvertimeRatesConfig() {
  const { rates, loading, updateRate, addRate, deleteRate } = useOvertimeRates();
  const [editingRate, setEditingRate] = useState<OvertimeRate | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPosition, setNewPosition] = useState('');
  const [newDayType, setNewDayType] = useState<string>('weekday');
  const [newAmount, setNewAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (rate: OvertimeRate) => {
    setEditingRate(rate);
    setEditValue(rate.rate_amount.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingRate || !editValue) return;
    setIsSaving(true);
    try {
      await updateRate(editingRate.id, parseFloat(editValue));
      setEditingRate(null);
      setEditValue('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newPosition || !newDayType || !newAmount) return;
    setIsSaving(true);
    try {
      await addRate(newPosition, newDayType, parseFloat(newAmount));
      setIsAddDialogOpen(false);
      setNewPosition('');
      setNewDayType('weekday');
      setNewAmount('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this rate?')) {
      await deleteRate(id);
    }
  };

  const formatDayType = (dayType: string) => {
    return dayType.charAt(0).toUpperCase() + dayType.slice(1);
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Overtime Rates Configuration
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Overtime Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Position Name</Label>
                <Input
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="e.g., Operator, Helper"
                />
              </div>
              <div>
                <Label>Day Type</Label>
                <Select value={newDayType} onValueChange={setNewDayType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekday">Weekday (Mon-Fri)</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rate Amount (₦/hour)</Label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g., 1000"
                />
              </div>
              <Button onClick={handleAdd} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Rate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Configure overtime pay rates per hour based on employee position and day of week.
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Day Type</TableHead>
              <TableHead>Rate (₦/hour)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell className="font-medium">{rate.position_name}</TableCell>
                <TableCell>{formatDayType(rate.day_type)}</TableCell>
                <TableCell>
                  {editingRate?.id === rate.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24"
                      />
                      <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingRate(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    `₦${rate.rate_amount.toLocaleString()}`
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingRate?.id !== rate.id && (
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(rate)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(rate.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No overtime rates configured. Add rates above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
