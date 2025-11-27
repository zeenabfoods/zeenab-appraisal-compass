import { useState, useRef, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload } from 'lucide-react';
import { useFieldTrips } from '@/hooks/useFieldTrips';

interface EvidenceCaptureDialogProps {
  tripId: string;
  children: ReactNode;
}

export function EvidenceCaptureDialog({ tripId, children }: EvidenceCaptureDialogProps) {
  const { uploadEvidence } = useFieldTrips();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'photo' | 'signature' | 'receipt' | 'document'>('photo');
  const [description, setDescription] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    try {
      await uploadEvidence(tripId, selectedFile, evidenceType, {
        description: description || undefined,
        receipt_amount: receiptAmount ? parseFloat(receiptAmount) : undefined,
        vendor_name: vendorName || undefined
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error uploading evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEvidenceType('photo');
    setDescription('');
    setReceiptAmount('');
    setVendorName('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Trip Evidence</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Evidence Type</Label>
            <Select
              value={evidenceType}
              onValueChange={(value: any) => setEvidenceType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="signature">Signature</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Upload File</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                className="hidden"
                id="evidence-file"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  {selectedFile?.type.startsWith('image/') && (
                    <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded" />
                  )}
                  <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <label htmlFor="evidence-file" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">Image or PDF, max 10MB</p>
                </label>
              )}
            </div>
          </div>

          {evidenceType === 'receipt' && (
            <>
              <div className="space-y-2">
                <Label>Receipt Amount (₦)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this evidence..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600"
              disabled={loading || !selectedFile}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
