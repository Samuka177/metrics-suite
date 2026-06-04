# Auditoria do roadmap RotiFlow

## Status atual por item

### Fase 1 — MVP vendável

| Item | Status | Observação |
|---|---|---|
| Importação NF-e / XML | ✅ Existe | `supabase/functions/parse-fiscal-note` + `NFeTab.tsx` + `ImportModal` |
| Geocodificação + revisão manual | ✅ Existe | `utils/geocode.ts` (Nominatim) + `AddressReviewDialog.tsx` + `addressValidation.ts` |
| Motor de rota básico (VRP) | 🟡 Parcial | `nearestNeighborOrder` existe; **falta 2-opt** e **falta OSRM** (usa Haversine, não distância por estrada) |
| Envio de rota por WhatsApp | ✅ Existe | `utils/whatsapp.ts` + `buildRouteMessage` |
| Persistência multi-empresa (Supabase + RLS) | ✅ Existe | Tabelas com RLS por `company_id`, super admin, convites |

### Fase 2 — produto competitivo

| Item | Status | Observação |
|---|---|---|
| Janelas de tempo + restrições avançadas | 🟡 Parcial | Campos `horario_min/max`, `capacidade_peso/volume` existem mas **não são respeitados no algoritmo** de roteirização |
| App do motorista (PWA) | 🟡 Parcial | `MotoristaApp.tsx` + `SignaturePad` funcionam, mas **não é PWA instalável** (sem manifest/service worker) |
| Rastreamento GPS tempo real | ❌ Não existe | Nenhuma tabela de posições, sem Realtime, sem envio de coordenadas do motorista |
| Dashboard de KPIs e relatórios | 🟡 Parcial | `Dashboard.tsx` e `Relatorios.tsx` existem com dados mock/vendas; **faltam KPIs operacionais reais** (OTIF, custo/entrega, km/entrega, taxa insucesso) baseados em `paradas` |

### Fase 3 — escala e receita recorrente

| Item | Status |
|---|---|
| Integrações ERP/WMS (TOTVS, Sankhya, VTEX) | ❌ Não existe |
| Resequenciamento dinâmico on-the-fly | ❌ Não existe |
| Gestão transportadoras + auditoria de frete + CT-e | ❌ Não existe |

---

## O que proponho fazer agora

Itens da **Fase 3** são projetos grandes (cada um leva semanas — integração ERP real, parser CT-e, etc.). Não dá pra entregar tudo num turno e fingir que ficou pronto. Vou focar em **fechar Fase 1 e cobrir o essencial da Fase 2**:

### Entregas deste turno

1. **Motor de rota — melhoria 2-opt**
   Adicionar `twoOptImprove()` em `utils/routeOptimization.ts` e usar após o nearest-neighbor. (OSRM por estrada fica como nota — exige chamada externa; sigo com Haversine + 2-opt agora.)

2. **Janelas de tempo + capacidade no roteirizador**
   Estender a otimização para respeitar `horario_min/max` da parada e `capacidade_peso/volume` do motorista (penalizar/dividir rotas que estouram).

3. **PWA instalável (manifest-only)**
   `public/manifest.webmanifest` + tags no `index.html` + ícones reaproveitando o logo. Sem service worker (usuário não pediu offline). Isso transforma o app do motorista em "instalar na tela inicial".

4. **KPIs operacionais reais**
   Substituir/complementar `Dashboard.tsx` com cards de OTIF, taxa de insucesso, km totais, paradas/dia, tempo médio por entrega — tudo calculado de `paradas` da empresa.

5. **Rastreamento GPS — base mínima**
   Migration criando tabela `motorista_posicoes` (lat/lng/timestamp/motorista_id/company_id) com RLS. App do motorista envia posição a cada X segundos durante rota ativa. Painel admin mostra última posição no mapa via Supabase Realtime.

### Fora do escopo deste turno (preciso confirmar antes)

- Integração ERP real (TOTVS/Sankhya/VTEX) — exige credenciais e contrato com cada API
- Auditoria de frete + emissão CT-e — projeto fiscal completo
- Resequenciamento dinâmico avançado — pode ser feito depois com base no motor da etapa 1
- Conversão para React Native — alternativa ao PWA, mudaria a stack

Confirma que sigo com os 5 itens acima? Se quiser priorizar diferente (ex.: só PWA + GPS, ou pular GPS), me diz.
