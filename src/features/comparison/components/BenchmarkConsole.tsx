import examples from '../model/examples.json';
import { ArrowRight, FlaskConical } from 'lucide-react';
import {
  Empty,
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
  Button,
  Card,
  Disclosure,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Execution } from '../services/executions';
import { EvaluationResults } from './EvaluationResults';
import styles from './BenchmarkConsole.module.css';

const names: Record<string, string> = {
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': 'Llama 3.3 70B',
  '@cf/mistralai/mistral-small-3.1-24b-instruct': 'Mistral Small 3.1',
  '@cf/meta/llama-4-scout-17b-16e-instruct': 'Llama 4 Scout',
  '@cf/leonardo/lucid-origin': 'Lucid Origin',
};
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const seconds = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const cost = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
function fieldText(value: unknown) {
  return typeof value === 'string' ? value : (JSON.stringify(value) ?? 'Não informado');
}
function jsonObject(text?: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(
      (text ?? '').trim().replace(/^\x60{3}(?:json)?\s*|\s*\x60{3}$/gi, ''),
    );
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
export function BenchmarkConsole({ record }: { record: Execution }) {
  const attempts = record.attempts.filter((a) => a.retryIndex === undefined);
  const round = record.evaluation;
  const rows = attempts.map((a) => {
    const fields = round?.checks?.find((c) => c.index === a.index)?.fields;
    const score = round?.ranking?.rows.find((r) => r.index === a.index)?.score;
    const matches = fields?.filter((f) => f.correct).length;
    return {
      a,
      name: names[a.modelId] ?? a.modelId,
      fields,
      matches,
      result: fields?.length ? matches + '/' + fields.length : null,
      score: score == null ? '—' : number.format(score) + '/4',
    };
  });
  const [index, setIndex] = useState<number>();
  const active =
    rows.find((r) => r.a.index === index) ??
    rows.find((r) => r.fields?.some((f) => !f.correct)) ??
    rows[0];
  const challenge =
    record.task && Object.hasOwn(examples, record.task)
      ? examples[record.task as keyof typeof examples]
      : undefined;
  if (!active) return <Empty>Este benchmark ainda não tem resultados.</Empty>;
  const { a } = active;
  const output = a.output?.type === 'text' ? a.output.text : undefined;
  const received = jsonObject(output),
    expected = jsonObject(record.reference);
  const perfect = rows.filter((r) => r.result && r.matches === r.fields?.length).length;
  const hasFields = rows.some((row) => row.fields?.length);
  const leaders = round?.ranking?.rows.filter((row) => row.position === 1) ?? [];
  const leader = leaders[0];
  let conclusion = 'Compare as respostas e os indicadores por modelo.';
  if (round?.ranking?.reasons.length) conclusion = 'Classificação parcial';
  else if (rows.length === 3 && perfect === 2 && rows.every((row) => row.fields?.length === 6))
    conclusion = 'Dois modelos acertaram os seis campos.';
  else if (leaders.length > 1)
    conclusion = `${leaders.length} modelos empataram em primeiro lugar.`;
  else if (leader?.score != null) {
    conclusion = `${names[leader.modelId] ?? leader.modelId} obteve ${number.format(leader.score)}/4 na avaliação.`;
  }
  return (
    <section className={styles.console}>
      <header className={styles.hero}>
        <div>
          <h1>{record.title ?? 'Benchmark publicado'}</h1>
          <p>{conclusion}</p>
        </div>
        <div className={styles.actions}>
          <Button asChild variant="default">
            <Link
              className={styles.action}
              to="/comparar"
              state={{
                task: record.task,
                prompt: record.prompt,
                reference: record.reference,
                criterion: record.criterion,
                modelIds: attempts.map((item) => item.modelId),
              }}
            >
              <ArrowRight className="icon icon-sm" aria-hidden="true" /> Usar este prompt
            </Link>
          </Button>
          {challenge && (
            <Button asChild variant="outline">
              <Link
                to="/comparar"
                state={{
                  task: record.task,
                  prompt: challenge.prompt,
                  reference: challenge.reference,
                  modelIds: attempts.map((item) => item.modelId),
                }}
              >
                <FlaskConical className="icon icon-sm" aria-hidden="true" />
                Experimentar desafio
              </Link>
            </Button>
          )}
        </div>
      </header>
      <div className={styles.workspace}>
        <div className={styles.left}>
          <Card className={styles.panel}>
            <Table>
              <TableCaption className={styles.sr}>Resultados por modelo</TableCaption>
              <TableHeader>
                <TableRow>
                  {[
                    'Modelo',
                    ...(hasFields ? ['Campos'] : []),
                    'Nota',
                    'Tempo',
                    'Tokens¹',
                    'US$',
                  ].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.a.index}
                    data-active={r === active}
                    onClick={() => setIndex(r.a.index)}
                  >
                    <TableHead scope="row">
                      <Button
                        aria-pressed={r === active}
                        onClick={() => setIndex(r.a.index)}
                        title={r.a.modelId}
                      >
                        {r.name}
                      </Button>
                    </TableHead>
                    {hasFields && <TableCell>{r.result ?? '—'}</TableCell>}
                    <TableCell>{r.score}</TableCell>
                    <TableCell>
                      {r.a.durationMs == null ? '—' : seconds.format(r.a.durationMs / 1000) + ' s'}
                    </TableCell>
                    <TableCell>
                      {r.a.inputTokens == null || r.a.outputTokens == null
                        ? '—'
                        : number.format(r.a.inputTokens + r.a.outputTokens)}
                    </TableCell>
                    <TableCell>
                      {r.a.costMicroUsd == null ? '—' : cost.format(r.a.costMicroUsd / 1e6)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <footer>¹ Entrada + saída · — Não informado</footer>
          </Card>
          <div className={styles.flow} aria-label="Percurso do prompt">
            <Disclosure title="Prompt">
              <div className={styles.source}>
                <p>{record.prompt}</p>
                {record.reference && <p>Referência: {record.reference}</p>}
                {record.criterion && <p>Critério: {record.criterion}</p>}
              </div>
            </Disclosure>
            <div className={styles.branches}>
              {rows.map((r, i) => (
                <div key={r.a.index} className={styles.branch} data-active={r === active}>
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={{ height: rows.length * 100 + '%', top: -i * 100 + '%' }}
                  >
                    <path
                      d={`M0 50 C55 50 45 ${((i + 0.5) * 100) / rows.length} 100 ${((i + 0.5) * 100) / rows.length}`}
                    />
                  </svg>
                  <Button aria-pressed={r === active} onClick={() => setIndex(r.a.index)}>
                    {r.name}
                  </Button>
                  <ArrowRight className={`icon ${styles.arrow}`} aria-hidden="true" />
                  <b>{r.result ?? r.score}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className={styles.inspector} aria-label="Detalhe do modelo">
          <h2>{active.name}</h2>
          <Tabs defaultValue="response">
            <TabsList aria-label="Detalhes do modelo" variant="line">
              <TabsTrigger value="response">Resposta</TabsTrigger>
              <TabsTrigger value="reviews">Pareceres</TabsTrigger>
            </TabsList>
            <TabsContent value="reviews">
              <EvaluationResults record={record} selectedIndex={a.index} />
            </TabsContent>
            <TabsContent value="response">
              {active.fields
                ?.filter((f) => !f.correct)
                .map((f) => (
                  <section key={f.field}>
                    <h3>Diferença {f.field === 'emissao' ? 'na emissão' : 'em ' + f.field}</h3>
                    <dl>
                      <dt>Esperado</dt>
                      <dd>{fieldText(expected?.[f.field])}</dd>
                      <dt>Recebido</dt>
                      <dd>{fieldText(received?.[f.field])}</dd>
                    </dl>
                  </section>
                ))}
              {output !== undefined && (
                <pre>{received ? JSON.stringify(received, null, 2) : output}</pre>
              )}
              {a.output?.type === 'image' && (
                <img
                  src={'/api/gallery/' + record.executionId + '/media/' + a.index}
                  alt={'Imagem gerada por ' + active.name}
                />
              )}
              {!a.output && !a.error && <p>Resposta indisponível para esta tentativa.</p>}
              {a.error && <p role="status">{a.error}</p>}
              <Disclosure title="Detalhes da geração">
                <p>
                  {a.provider} · {a.effectiveModel ?? a.modelId}
                </p>
                <p>
                  Tokens de entrada: {a.inputTokens ?? 'Não informado'} · Saída:{' '}
                  {a.outputTokens ?? 'Não informado'}
                </p>
                {received && (
                  <Disclosure title="Saída original">
                    <pre>{output}</pre>
                  </Disclosure>
                )}
                <p>Cache: {a.cacheStatus ?? 'Não informado'}</p>
              </Disclosure>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </section>
  );
}
