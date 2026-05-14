import type { Parada } from '@/types/rotafacil';

/**
 * Marca endereço como "precisa verificar" se faltar CEP (8 dígitos) ou
 * número visível no logradouro.
 */
export function needsAddressReview(p: Pick<Parada, 'endereco'>): boolean {
  const e = (p.endereco || '').trim();
  if (!e) return true;
  const hasCep = /\b\d{5}-?\d{3}\b/.test(e);
  // número da rua: dígito isolado após vírgula/espaço, ou padrão "rua xxx, 123"
  const hasNumero = /(,\s*\d+|n[º°o]\s*\d+|\b\d+\b\s*[-,])/i.test(e);
  return !hasCep || !hasNumero;
}
