# Plano de implementação

## 1. Upload múltiplo de notas (PDF/XML/imagens)
- `NFeTab.tsx`: aceitar `multiple` no input, processar em fila com barra de progresso (X de Y).
- Mostrar lista de resultados por arquivo (sucesso/erro/incompleto).
- Botão **"Adicionar à rota"** global aparece SÓ quando todos os arquivos terminaram E não há campos pendentes de correção.

## 2. Bloqueio de inserção até terminar import
- Estado `processing` desabilita o botão "Adicionar todas à rota".
- Contador "Processando 3/8…" visível.

## 3. Detecção de duplicatas
- Critério: mesma `chave` NF-e OU (mesmo `emitente_cnpj` + `numero` + `serie`) OU (mesmo destinatário + endereço + mesmo dia).
- Verificar contra `fiscal_notes` já no banco + dentro do lote atual.
- UI: badge amarelo "Possível duplicata" com botão **Ignorar** / **Importar mesmo assim**.

## 4. Mapa redimensionável (split pane)
- Em `RotasTab.tsx` usar `ResizablePanelGroup` (já existe em `components/ui/resizable.tsx`) para dividir lista de paradas × mapa.
- Persistir tamanho em `localStorage`.

## 6. Editar parada na aba Rotas
- Investigar handler atual em `RotasTab.tsx` — provavelmente dialog não abre ou save não persiste.
- Corrigir e adicionar campos: nome, endereço, horário, peso, volume, observações, telefone.

## 7. App do motorista
- Nova role `motorista` (enum `app_role`).
- Rota `/motorista` protegida: lista paradas do dia atribuídas ao motorista logado.
- Ações por parada:
  - **Check-in** (registra `checkin_time` + geolocation)
  - **Entregue** → status `entregue` + `checkout_time`
  - **Não realizada** → abre dialog para motivo, salva em `paradas.observacoes` + status `falhou`
- Login normal email/senha; ao logar, se role = motorista, redireciona para `/motorista`.

## 8. Coleta de assinatura
- Dentro de cada parada (app motorista) botão **"Coletar assinatura"**.
- Canvas de assinatura (touch/mouse) — usar `react-signature-canvas` ou implementação canvas nativa.
- Ao confirmar: gerar PDF (jsPDF) com nome cliente, data/hora, NF, assinatura → upload para Storage bucket `assinaturas` (privado, RLS por company).
- Salvar URL em `paradas.assinatura_url` (nova coluna).

## 9. Cadastro de colaboradores com senha + perfil
- Em `EmpresasAdmin.tsx` (criar usuário): adicionar campo **senha** e select de **perfil** (motorista / ajudante / admin).
- Edge function `admin-actions` já cria user com senha; estender para aceitar `role` e gravar em `user_roles`.
- Adicionar `ajudante` ao enum `app_role` se ainda não existir.

---

## Migrations necessárias
```sql
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'motorista';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ajudante';

ALTER TABLE paradas
  ADD COLUMN assinatura_url text,
  ADD COLUMN motivo_falha text,
  ADD COLUMN data_rota date DEFAULT CURRENT_DATE;

-- vincular motorista (auth user) ao registro de motoristas
ALTER TABLE motoristas ADD COLUMN user_id uuid;

-- RLS: motorista vê só suas paradas
CREATE POLICY "Motorista vê suas paradas" ON paradas FOR SELECT
  USING (motorista_id IN (SELECT id FROM motoristas WHERE user_id = auth.uid()));
CREATE POLICY "Motorista atualiza suas paradas" ON paradas FOR UPDATE
  USING (motorista_id IN (SELECT id FROM motoristas WHERE user_id = auth.uid()));

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('assinaturas', 'assinaturas', false);
-- policies por company_id
```

## Pontos que preciso confirmar
Antes de implementar, ver perguntas a seguir.