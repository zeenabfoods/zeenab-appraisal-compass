import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useBranches } from '@/hooks/attendance/useBranches';
import { TablesInsert } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

export function BranchManagement() {
  const { branches, loading, createBranch, updateBranch, deleteBranch } = useBranches();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius: '100',
    geofence_color: '#FF6B35',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const branchData: TablesInsert<'attendance_branches'> = {
        name: formData.name,
        address: formData.address || null,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        geofence_radius: parseInt(formData.geofence_radius),
        geofence_color: formData.geofence_color,
        is_active: true,
      };

      if (editingBranch) {
        await updateBranch(editingBranch, branchData);
      } else {
        await createBranch(branchData);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      geofence_radius: '100',
      geofence_color: '#FF6B35',
    });
    setEditingBranch(null);
  };

  const handleEdit = (branch: typeof branches[0]) => {
    setFormData({
      name: branch.name,
      address: branch.address || '',
      latitude: branch.latitude.toString(),
      longitude: branch.longitude.toString(),
      geofence_radius: branch.geofence_radius.toString(),
      geofence_color: branch.geofence_color || '#FF6B35',
    });
    setEditingBranch(branch.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      await deleteBranch(id);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading branches...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Branch Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Branch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Lagos HQ"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="6.5244"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="3.3792"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="geofence">Geofence Radius (meters) *</Label>
                <Input
                  id="geofence"
                  type="number"
                  value={formData.geofence_radius}
                  onChange={(e) => setFormData({ ...formData, geofence_radius: e.target.value })}
                  min="1"
                  max="500"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: 1m, Recommended: 100-200m for offices
                </p>
              </div>
              <div>
                <Label htmlFor="color">Geofence Color</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color"
                    type="color"
                    value={formData.geofence_color}
                    onChange={(e) => setFormData({ ...formData, geofence_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.geofence_color}
                    onChange={(e) => setFormData({ ...formData, geofence_color: e.target.value })}
                    placeholder="#FF6B35"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a color for this branch on the map
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  {editingBranch ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {branches.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Branches Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first office branch to enable geofence-based attendance tracking
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Branch
            </Button>
          </Card>
        ) : (
          branches.map((branch) => (
            <Card key={branch.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{branch.name}</h3>
                    {branch.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  {branch.address && (
                    <p className="text-sm text-muted-foreground mb-2">{branch.address}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>📍 {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}</span>
                    <span>🎯 {branch.geofence_radius}m radius</span>
                    <span className="flex items-center gap-1">
                      <span 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: branch.geofence_color || '#FF6B35' }}
                      />
                      {branch.geofence_color || '#FF6B35'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(branch)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(branch.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
