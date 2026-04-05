import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Upload, Plus, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NFeParsed {
  destinatario: string;
  cnpjCpf: string;
  endereco: string;
  nNF: string;
  dataEmissao: string;
  produtos: { nome: string; quantidade: string; unidade: string }[];
}

function parseNFeXML(xmlStr: string): NFeParsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'text/xml');

  const err = doc.querySelector('parsererror');
  if (err) throw new Error('XML inválido');

  const ns = doc.documentElement.namespaceURI || '';
  const q = (parent: Element | Document, tag: string) => {
    const el = parent.getElementsByTagNameNS(ns, tag)[0] || parent.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() || '';
  };

  const dest = doc.getElementsByTagNameNS(ns, 'dest')[0] || doc.getElementsByTagName('dest')[0];
  if (!dest) throw new Error('XML não é uma NF-e válida (tag <dest> não encontrada)');

  const enderDest = dest.getElementsByTagNameNS(ns, 'enderDest')[0] || dest.getElementsByTagName('enderDest')[0];
  const endParts = enderDest ? [
    q(enderDest, 'xLgr'), q(enderDest, 'nro'), q(enderDest, 'xBairro'), q(enderDest, 'xMun'), q(enderDest, 'UF')
  ].filter(Boolean).join(', ') : '';

  const dets = [...(doc.getElementsByTagNameNS(ns, 'det') || []), ...(doc.getElementsByTagName('det') || [])];
  const seen = new Set<string>();
  const produtos = dets.reduce<NFeParsed['produtos']>((acc, det) => {
    const prod = det.getElementsByTagNameNS(ns, 'prod')[0] || det.getElementsByTagName('prod')[0];
    if (!prod) return acc;
    const nome = q(prod, 'xProd');
    const key = `${nome}`;
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push({ nome, quantidade: q(prod, 'qCom'), unidade: q(prod, 'uCom') });
    return acc;
  }, []);

  return {
    destinatario: q(dest, 'xNome'),
    cnpjCpf: q(dest, 'CNPJ') || q(dest, 'CPF'),
    endereco: endParts,
    nNF: q(doc, 'nNF'),
    dataEmissao: q(doc, 'dhEmi') || q(doc, 'dEmi'),
    produtos,
  };
}

export default function NFeTab() {
  const { addParada } = useApp();
  const [nfe, setNfe] = useState<NFeParsed | null>(null);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setNfe(null); setChecked({});
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseNFeXML(ev.target?.result as string);
        setNfe(parsed);
      } catch (err: any) {
        setError(err.message || 'Erro ao ler XML');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const addToRoute = () => {
    if (!nfe) return;
    addParada({
      nome: nfe.destinatario || `NF ${nfe.nNF}`,
      endereco: nfe.endereco,
      tipo: 'Delivery',
      produtos: nfe.produtos.map(p => ({ nome: p.nome, quantidade: p.quantidade, unidade: p.unidade })),
    });
    toast.success(`NF-e ${nfe.nNF} adicionada à rota!`);
    setNfe(null);
  };

  const limpar = () => { setNfe(null); setError(''); setChecked({}); };

  return (
    <div className="space-y-4 fade-in pb-4">
      <input ref={fileRef} type="file" accept=".xml" onChange={handleFile} className="hidden" id="nfe-upload" />
      <label
        htmlFor="nfe-upload"
        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
      >
        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium text-foreground">Clique para selecionar XML da NF-e</p>
        <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .xml</p>
      </label>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {nfe && (
        <Card className="fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{nfe.destinatario}</p>
                <p className="text-xs text-muted-foreground">NF-e {nfe.nNF} · {nfe.cnpjCpf}</p>
                {nfe.dataEmissao && <p className="text-xs text-muted-foreground">{nfe.dataEmissao}</p>}
              </div>
              <button onClick={limpar}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-primary">{nfe.endereco}</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm font-medium">Produtos ({nfe.produtos.length})</p>
              {nfe.produtos.map((p, i) => (
                <label key={i} className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={!!checked[i]} onCheckedChange={v => setChecked(prev => ({ ...prev, [i]: !!v }))} />
                  <span className="text-sm">{p.nome} — {p.quantidade} {p.unidade}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={addToRoute} className="flex-1">
                <Plus className="h-4 w-4 mr-1" /> Adicionar à rota
              </Button>
              <Button variant="outline" onClick={limpar}>Limpar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!nfe && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">Nenhuma NF-e importada</p>
            <p className="text-sm text-muted-foreground mt-1">Importe um XML de NF-e para extrair dados automaticamente.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
