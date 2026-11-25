// O painel da execução é a referência mesmo que um juiz não tenha respondido.
export function summarizeRanking({ attempts, indices, judges, criteria, reviews, finished }) {
  const validPanel = judges.map((id) => reviews.find((r) => r.modelId === id));
  const reasons = new Set();
  if (!finished) reasons.add('O julgamento está em andamento.');
  if (validPanel.length !== 3 || validPanel.some((r) => r?.status !== 'completed'))
    reasons.add('Faltam pareceres válidos dos três juízes.');
  const rows = [];
  for (const index of indices) {
    const candidate = attempts.find((a) => a.index === index);
    if (candidate?.status !== 'completed') continue;
    const marks = criteria.map(({ id, label }) => {
      const scores = validPanel.map((r) =>
        r?.status === 'completed'
          ? (r.verdict?.find((v) => v.index === index)?.marks.find((m) => m.id === id)?.score ??
            null)
          : null,
      );
      const numbers = scores.filter(Number.isInteger).sort((a, b) => a - b);
      const median = numbers.length === 3 ? numbers[1] : null;
      if (median === null) reasons.add('Há critérios sem três notas verificáveis.');
      return { id, label, scores, median, divergent: new Set(numbers).size > 1 };
    });
    const score =
      marks.length && marks.every((m) => m.median !== null)
        ? marks.reduce((sum, m) => sum + m.median, 0) / marks.length
        : null;
    rows.push({
      index,
      modelId: candidate.effectiveModel ?? candidate.modelId,
      marks,
      score,
      position: null,
    });
  }
  if (!rows.length) reasons.add('Nenhuma geração concluída para classificar.');
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  rows.forEach((row, i) => {
    if (row.score !== null)
      row.position = i > 0 && rows[i - 1].score === row.score ? rows[i - 1].position : i + 1;
  });
  const completeMetrics = finished && validPanel.length === 3;
  const totalCostMicroUsd =
    completeMetrics && validPanel.every((r) => Number.isSafeInteger(r?.costMicroUsd))
      ? validPanel.reduce((sum, r) => sum + r.costMicroUsd, 0)
      : null;
  const elapsedMs =
    completeMetrics && validPanel.every((r) => r?.startedAt && r.finishedAt)
      ? Math.max(...validPanel.map((r) => r.finishedAt.toMillis())) -
        Math.min(...validPanel.map((r) => r.startedAt.toMillis()))
      : null;
  return { rows, reasons: [...reasons], totalCostMicroUsd, elapsedMs };
}
