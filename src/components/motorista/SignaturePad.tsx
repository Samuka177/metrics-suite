import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  paradaId: string;
  paradaNome: string;
  paradaEndereco?: string;
  companyId: string;
  onSaved: (url: string) => void;
}

export default function SignaturePad({ open, onOpenChange, paradaId, paradaNome, paradaEndereco, companyId, onSaved }: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [saving, setSaving] = useState(false);

  const clear = () => sigRef.current?.clear();

  const save = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error('Colete a assinatura antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const sigDataUrl = sigRef.current.getCanvas().toDataURL('image/png');

      // Build PDF
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      pdf.setFontSize(16);
      pdf.text('Comprovante de Entrega', 105, 20, { align: 'center' });
      pdf.setFontSize(11);
      pdf.text(`Cliente: ${paradaNome}`, 15, 40);
      if (paradaEndereco) pdf.text(`Endereço: ${paradaEndereco}`, 15, 48);
      pdf.text(`Data/hora: ${new Date().toLocaleString('pt-BR')}`, 15, 56);
      pdf.text('Assinatura do recebedor:', 15, 72);
      pdf.addImage(sigDataUrl, 'PNG', 15, 78, 180, 60);
      pdf.setFontSize(9);
      pdf.setTextColor(120);
      pdf.text('Documento gerado pelo RotiFlow', 105, 285, { align: 'center' });

      const pdfBlob = pdf.output('blob');
      const path = `${companyId}/${paradaId}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from('assinaturas').upload(path, pdfBlob, {
        contentType: 'application/pdf', upsert: true,
      });
      if (upErr) throw upErr;

      // Save URL on parada
      const { error: updErr } = await supabase.from('paradas')
        .update({ assinatura_url: path })
        .eq('id', paradaId);
      if (updErr) throw updErr;

      toast.success('Assinatura salva!');
      onSaved(path);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar assinatura');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Coletar assinatura</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{paradaNome}</p>
          <div className="border-2 border-dashed border-border rounded-lg bg-card overflow-hidden touch-none">
            <SignatureCanvas
              ref={(r) => { sigRef.current = r; }}
              canvasProps={{ className: 'w-full h-56 bg-white' }}
              penColor="black"
            />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Assine com o dedo no campo acima.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={clear} disabled={saving}>
            <Eraser className="h-4 w-4 mr-1" /> Limpar
          </Button>
          <Button onClick={save} disabled={saving}>
            <Check className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar assinatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
