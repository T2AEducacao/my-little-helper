import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const AreaSchema = z.object({
  name: z.string(),
  score: z.number().nullable(),
  delta: z.number().nullable(),
  count: z.number(),
  riskCount: z.number(),
});

const SummarySchema = z.object({
  rangeLabel: z.string(),
  activeCount: z.number(),
  teamScore: z.number().nullable(),
  teamDelta: z.number().nullable(),
  attentionRiskCount: z.number(),
  attentionRiskShare: z.number(),
  alertsCount: z.number(),
  criticalAlertsCount: z.number(),
  goalsAtRiskCount: z.number(),
  evolutionDelta: z.number().nullable(),
  topRisingAreas: z.array(AreaSchema).max(5),
  topFallingAreas: z.array(AreaSchema).max(5),
  bottlenecks: z.array(z.string()).max(10),
});

export type AnaliseAiSummary = z.infer<typeof SummarySchema>;

export const gerarAnaliseEmpresa = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummarySchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const pct = (n: number) => `${Math.round(n * 100)}%`;
    const fmt = (n: number | null, suffix = "") =>
      n === null ? "sem dado" : `${Math.round(n)}${suffix}`;

    const areasFmt = (arr: AnaliseAiSummary["topRisingAreas"]) =>
      arr.length === 0
        ? "—"
        : arr
            .map(
              (a) =>
                `${a.name} (score ${fmt(a.score)}, variação ${fmt(a.delta, "pts")}, ${a.count} pessoas, ${a.riskCount} em risco)`,
            )
            .join("; ");

    const factual = [
      `Período analisado: ${data.rangeLabel}.`,
      `Colaboradores ativos: ${data.activeCount}.`,
      `Score médio da equipe: ${fmt(data.teamScore)} (variação ${fmt(data.teamDelta, "pts")}).`,
      `Em atenção/risco: ${data.attentionRiskCount} pessoas (${pct(data.attentionRiskShare)} da equipe avaliada).`,
      `Ações abertas: ${data.alertsCount} (${data.criticalAlertsCount} crítica(s)).`,
      `Metas em risco: ${data.goalsAtRiskCount}.`,
      `Evolução no período: ${fmt(data.evolutionDelta, "pts")}.`,
      `Áreas em alta: ${areasFmt(data.topRisingAreas)}.`,
      `Áreas em queda: ${areasFmt(data.topFallingAreas)}.`,
      data.bottlenecks.length > 0
        ? `Gargalos observados: ${data.bottlenecks.join("; ")}.`
        : "Sem gargalos relevantes registrados.",
    ].join("\n");

    const system = `Você é um analista de RH sênior. Escreva uma análise objetiva e profissional em português do Brasil sobre a situação da empresa, usando ESTRITAMENTE os números fornecidos — não invente nomes, dados ou colaboradores. Tom: claro, direto, sem jargão de IA, sem promessas, sem emojis.

Formato obrigatório:
**Visão geral**
- No máximo 2 linhas. Uma frase curta.

**Pontos de atenção**
- No máximo 2 linhas. Uma frase curta.

**Destaques positivos**
- No máximo 2 linhas. Uma frase curta.

Não escreva introdução, conclusão, explicações extras, nem mais de um bullet por seção. Total máximo: 90 palavras.`;

    const { text } = await generateText({
      model,
      system,
      prompt: `Dados consolidados da empresa:\n${factual}\n\nGere a análise.`,
    });

    return { analysis: text, generatedAt: new Date().toISOString() };
  });
