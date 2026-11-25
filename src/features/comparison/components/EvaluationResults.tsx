import { Disclosure } from '@/shared/ui';
import type { Execution } from '../services/executions';
import styles from './Comparison.module.css';

const usd = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
});
const scoreFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
function money(value: number | null | undefined) {
  return value == null ? 'Não informado' : usd.format(value / 1e6);
}
export function EvaluationResults({
  record,
  selectedIndex,
}: {
  record: Execution;
  selectedIndex?: number;
}) {
  const round = record.evaluation;
  if (!round?.ranking)
    return (
      <section>
        <h2>Pareceres dos juízes</h2>
        <p>Sem pareceres disponíveis.</p>
      </section>
    );
  const { ranking } = round;
  return (
    <section className={styles.page} aria-label="Avaliação de qualidade">
      <h2>
        {round.status !== 'finished'
          ? 'Julgamento em andamento'
          : ranking.reasons.length
            ? 'Classificação parcial'
            : 'Classificação geral'}
      </h2>
      {ranking.reasons.map((reason) => (
        <p key={reason}>{reason}</p>
      ))}
      {ranking.rows
        .filter((row) => selectedIndex === undefined || row.index === selectedIndex)
        .map((row) => (
          <section className={styles.card} key={row.index}>
            <h3>
              {row.position === null ? 'Sem posição' : row.position + 'º lugar'} · {row.modelId}
            </h3>
            <p>
              {row.score === null
                ? 'Nota geral indisponível'
                : `Nota geral: ${scoreFormat.format(row.score)}/4`}
              {row.position !== null &&
                ranking.rows.some(
                  (other) => other.index !== row.index && other.position === row.position,
                ) &&
                ' · Empate'}
            </p>
            <ul>
              {row.marks.map((mark) => (
                <li key={mark.id}>
                  <strong>{mark.label}</strong> · Mediana: {mark.median ?? 'indisponível'}
                  {' · Notas: '}
                  {mark.scores.map((v) => v ?? '—').join(' / ')}
                  {mark.divergent && ' · Juízes divergiram'}
                </li>
              ))}
            </ul>
            {round.checks
              ?.find((c) => c.index === row.index)
              ?.fields?.map((f) => (
                <p key={f.field}>
                  {f.field}: {f.correct ? 'correto' : 'incorreto'}
                </p>
              ))}
          </section>
        ))}
      <h3>Pareceres dos juízes</h3>
      <p>
        Custo do julgamento: {money(ranking.totalCostMicroUsd)} · Tempo do painel:{' '}
        {ranking.elapsedMs == null ? 'Não informado' : ranking.elapsedMs + ' ms'}
      </p>
      {record.judges?.map((id) => {
        const review = round.reviews.find((r) => r.modelId === id);
        return (
          <Disclosure
            key={id}
            title={
              <>
                {id} ·{' '}
                {review?.status === 'completed'
                  ? 'Parecer disponível'
                  : review?.status === 'failed'
                    ? 'Falhou'
                    : round.status === 'finished'
                      ? 'Parecer ausente'
                      : 'Aguardando'}
              </>
            }
          >
            {review?.error && <p>{review.error}</p>}
            {review && (
              <p>
                Custo do juiz: {money(review.costMicroUsd)} · Tempo de resposta:{' '}
                {review.durationMs == null ? 'Não informado' : review.durationMs + ' ms'}
              </p>
            )}
            {review?.verdict
              ?.filter((v) => selectedIndex === undefined || v.index === selectedIndex)
              .map((v) => (
                <div key={v.index}>
                  <h4>{record.attempts.find((a) => a.index === v.index)?.modelId}</h4>
                  <ul>
                    {v.marks.map((m) => (
                      <li key={m.id}>
                        <strong>
                          {record.criteria?.find((c) => c.id === m.id)?.label ?? m.id}:{' '}
                          {m.score === null ? 'Não verificável' : m.score + '/4'}
                        </strong>{' '}
                        — {m.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </Disclosure>
        );
      })}
    </section>
  );
}
