// Edge function: parse-fiscal-note
// Aceita um arquivo (XML, PDF, CSV, imagem) e retorna os dados estruturados da NF.
// XML: parsing direto. Demais: usa Lovable AI Gateway (Gemini) com visão para extrair JSON.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedNote {
  numero?: string;
  serie?: string;
  chave?: string;
  emitente_nome?: string;
  emitente_cnpj?: string;
  destinatario_nome?: string;
  destinatario_cnpj?: string;
  destinatario_logradouro?: string;
  destinatario_numero?: string;
  destinatario_bairro?: string;
  destinatario_endereco?: string;
  destinatario_municipio?: string;
  destinatario_uf?: string;
  destinatario_cep?: string;
  valor_total?: number;
  peso_kg?: number;
  volume_m3?: number;
  itens?: { nome: string; quantidade?: number; unidade?: string; valor?: number }[];
}

const UF_VALIDAS = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

function isMissing(v?: string | null): boolean {
  if (v === undefined || v === null) return true;
  const t = String(v).trim().toUpperCase();
  return !t || t === 'SEM' || t === 'N/A' || t === 'NA' || t === 'NULL' || t === '-' || t === '0' || t === 'XXXXX';
}

function validateParsed(p: ParsedNote): { missing_fields: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  if (isMissing(p.destinatario_logradouro)) missing.push('logradouro');
  if (isMissing(p.destinatario_numero)) missing.push('numero');
  if (isMissing(p.destinatario_municipio)) missing.push('municipio');
  if (isMissing(p.destinatario_uf)) missing.push('uf');
  else if (!UF_VALIDAS.has(String(p.destinatario_uf).trim().toUpperCase())) {
    warnings.push(`UF inválida: "${p.destinatario_uf}"`);
  }
  if (!isMissing(p.destinatario_cep)) {
    const digits = String(p.destinatario_cep).replace(/\D/g, '');
    if (digits.length !== 8) warnings.push(`CEP inválido: "${p.destinatario_cep}"`);
  }
  return { missing_fields: missing, warnings };
}


function parseXMLNote(xml: string): ParsedNote {
  // Remove namespaces para simplificar regex
  const get = (tag: string, scope = xml): string | undefined => {
    const m = scope.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
    return m?.[1]?.trim();
  };
  const scope = (tag: string): string | undefined => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m?.[1];
  };

  const dest = scope("dest") || "";
  const ender = scope("enderDest") || "";
  const emit = scope("emit") || "";
  const ide = scope("ide") || "";
  const total = scope("ICMSTot") || "";

  const itens: ParsedNote["itens"] = [];
  const detRegex = /<det[\s\S]*?<\/det>/gi;
  const dets = xml.match(detRegex) || [];
  const seen = new Set<string>();
  for (const d of dets) {
    const prod = (d.match(/<prod[^>]*>([\s\S]*?)<\/prod>/i)?.[1]) || "";
    const nome = get("xProd", prod) || "";
    if (!nome || seen.has(nome)) continue;
    seen.add(nome);
    itens.push({
      nome,
      quantidade: Number(get("qCom", prod) || 0),
      unidade: get("uCom", prod),
      valor: Number(get("vProd", prod) || 0),
    });
  }

  const chaveMatch = xml.match(/Id="NFe(\d{44})"/);

  const lgr = get("xLgr", ender);
  const nro = get("nro", ender);
  const bairro = get("xBairro", ender);
  return {
    numero: get("nNF", ide),
    serie: get("serie", ide),
    chave: chaveMatch?.[1],
    emitente_nome: get("xNome", emit),
    emitente_cnpj: get("CNPJ", emit),
    destinatario_nome: get("xNome", dest),
    destinatario_cnpj: get("CNPJ", dest) || get("CPF", dest),
    destinatario_logradouro: lgr,
    destinatario_numero: nro,
    destinatario_bairro: bairro,
    destinatario_endereco: [lgr, nro, bairro].filter(Boolean).join(", "),
    destinatario_municipio: get("xMun", ender),
    destinatario_uf: get("UF", ender),
    destinatario_cep: get("CEP", ender),
    valor_total: Number(get("vNF", total) || 0),
    itens,
  };
}

async function parseWithAI(base64: string, mimeType: string, filename: string): Promise<ParsedNote> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const isText = mimeType.startsWith("text/") || filename.endsWith(".csv") || filename.endsWith(".txt");
  const messages: any[] = [
    {
      role: "system",
      content:
        "Você é um extrator de dados de notas fiscais brasileiras (NF-e/DANFE). Extraia os dados do destinatário (nome, CNPJ, endereço completo, município, UF, CEP), número da nota, valor total, peso (kg), volume (m³) e itens. Responda APENAS chamando a função extract_note. Para itens repetidos, agregue.",
    },
  ];

  if (isText) {
    const text = atob(base64);
    messages.push({
      role: "user",
      content: `Extraia os dados desta nota/planilha (${filename}):\n\n${text.slice(0, 30000)}`,
    });
  } else {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: `Extraia os dados desta nota fiscal (${filename}).` },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    });
  }

  const tool = {
    type: "function",
    function: {
      name: "extract_note",
      description: "Estrutura os dados extraídos da nota fiscal",
      parameters: {
        type: "object",
        properties: {
          numero: { type: "string" },
          serie: { type: "string" },
          chave: { type: "string" },
          emitente_nome: { type: "string" },
          emitente_cnpj: { type: "string" },
          destinatario_nome: { type: "string" },
          destinatario_cnpj: { type: "string" },
          destinatario_endereco: { type: "string", description: "Logradouro + número + bairro" },
          destinatario_municipio: { type: "string" },
          destinatario_uf: { type: "string", description: "Sigla UF (SP, RJ...)" },
          destinatario_cep: { type: "string" },
          valor_total: { type: "number" },
          peso_kg: { type: "number" },
          volume_m3: { type: "number" },
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                quantidade: { type: "number" },
                unidade: { type: "string" },
                valor: { type: "number" },
              },
              required: ["nome"],
            },
          },
        },
        required: ["destinatario_nome"],
      },
    },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "extract_note" } },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway erro ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("IA não retornou dados estruturados");
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { filename, mimeType, base64 } = await req.json();
    if (!base64 || !filename) {
      return new Response(JSON.stringify({ error: "filename e base64 obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lower = filename.toLowerCase();
    let parsed: ParsedNote;
    let source_format = "unknown";

    if (lower.endsWith(".xml") || mimeType?.includes("xml")) {
      const xml = atob(base64);
      parsed = parseXMLNote(xml);
      source_format = "xml";
    } else if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
      parsed = await parseWithAI(base64, "application/pdf", filename);
      source_format = "pdf";
    } else if (lower.endsWith(".csv") || lower.endsWith(".txt") || mimeType?.startsWith("text/")) {
      parsed = await parseWithAI(base64, mimeType || "text/csv", filename);
      source_format = "csv";
    } else if (mimeType?.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(lower)) {
      parsed = await parseWithAI(base64, mimeType || "image/jpeg", filename);
      source_format = "image";
    } else {
      return new Response(JSON.stringify({ error: "Formato não suportado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ source_format, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("parse-fiscal-note erro:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
