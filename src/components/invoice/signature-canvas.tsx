'use client';

import { useRef } from 'react';
import SignaturePad from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Eraser, Check } from 'lucide-react';

interface SignatureCanvasProps {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export default function SignatureCanvas({ open, onClose, onSave }: SignatureCanvasProps) {
  const sigRef = useRef<SignaturePad>(null);

  const handleClear = () => { sigRef.current?.clear(); };

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) return;
    const dataUrl = sigRef.current?.toDataURL('image/png');
    if (dataUrl) onSave(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Draw Your Signature</DialogTitle>
          <DialogDescription>Use your finger or mouse to sign below</DialogDescription>
        </DialogHeader>
        <div className="border-2 border-dashed rounded-lg overflow-hidden bg-white dark:bg-gray-50">
          <SignaturePad
            ref={sigRef}
            canvasProps={{
              className: 'w-full',
              style: { width: '100%', height: '180px' },
            }}
            penColor="#1a1a1a"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            <Eraser className="size-4 mr-1" /> Clear
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
            <Check className="size-4 mr-1" /> Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
