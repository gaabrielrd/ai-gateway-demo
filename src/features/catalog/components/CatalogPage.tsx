import { useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { loadCatalog, type Catalog } from '../services/catalog';
import { PageHeader } from '@/shared/ui';
import { QuotePreview } from './QuotePreview';
import styles from './CatalogPage.module.css';

const tasks = [
  { id: 'summary', label: 'Resumo de texto', output: 'text' },
  { id: 'extraction', label: 'Extração de campos', output: 'text' },
  { id: 'image', label: 'Geração de imagem', output: 'image' },
];
const usd = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 7,
});

type Model = Catalog['models'][number];

function tariff({ price }: Model) {
  if (price.perMillionInputTokens !== undefined) {
    return `${usd.format(price.perMillionInputTokens)} por milhão de tokens de entrada · ${usd.format(price.perMillionOutputTokens)} por milhão de saída`;
  }
  return `${usd.format(price.per512x512Tile)} por bloco de 512 × 512 px · ${usd.format(price.perStep)} por passo`;
}

interface BenchmarkDraft {
  task?: string;
  modelIds?: string[];
  prompt?: string;
  reference?: string;
  criterion?: string;
}

export function CatalogRoute() {
  const location = useLocation();
  return <CatalogPage key={location.key} draft={location.state as BenchmarkDraft | undefined} />;
}

export function ModelSelector({ catalog, draft }: { catalog: Catalog; draft?: BenchmarkDraft }) {
  const [task, setTask] = useState(tasks.find((t) => t.id === draft?.task) ?? tasks[0]!);

  const compatible = catalog.models.filter(
    (model) => model.input === 'text' && model.output === task.output,
  );
  const required = Math.min(3, compatible.filter((model) => !model.budgetRestriction).length);
  const [selected, setSelected] = useState<string[]>(() =>
    compatible
      .filter((m) => !m.budgetRestriction && draft?.modelIds?.includes(m.id))
      .slice(0, required)
      .map((m) => m.id),
  );
  return (
    <section className={styles.page}>
      {draft?.prompt && (
        <details open>
          <summary>Prompt do benchmark</summary>
          <p>{draft.prompt}</p>
        </details>
      )}
      <label className={styles.task}>
        Tarefa
        <select
          value={task.label}
          onChange={(event) => {
            setTask(tasks.find((item) => item.label === event.target.value)!);
            setSelected([]);
          }}
        >
          {tasks.map((item) => (
            <option key={item.label}>{item.label}</option>
          ))}
        </select>
      </label>
      <fieldset className={styles.choices}>
        <legend>Versões para comparar</legend>
        {required === 0 ? (
          <p>
            Nenhum modelo habilitado tem modalidade compatível e teto de custo verificável para esta
            tarefa.
          </p>
        ) : required === 1 ? (
          <p>Apenas uma versão é compatível. Você pode testar esse modelo individualmente.</p>
        ) : required === 2 ? (
          <p>Apenas duas versões são compatíveis. Selecione ambas para comparar.</p>
        ) : (
          <p>Selecione três versões compatíveis.</p>
        )}
        {compatible.map((model) => (
          <label className={styles.row} key={model.id} htmlFor={model.id} aria-label={model.id}>
            <input
              type="checkbox"
              id={model.id}
              checked={selected.includes(model.id)}
              disabled={
                Boolean(model.budgetRestriction) ||
                (selected.length === required && !selected.includes(model.id))
              }
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...selected, model.id]
                    : selected.filter((id) => id !== model.id),
                )
              }
            />
            <span>
              <strong>{model.id}</strong>
              <small>
                {model.provider} · {tariff(model)}
                {model.budgetRestriction && <> · Indisponível. {model.budgetRestriction}</>}
              </small>
            </span>
          </label>
        ))}
      </fieldset>
      {required > 0 && (
        <output aria-live="polite">
          {selected.length} de {required} selecionadas
        </output>
      )}
      {required > 0 && selected.length === required && (
        <QuotePreview key={[task.id, ...selected].join('|')} task={task.id} modelIds={selected} />
      )}
      <a href={catalog.priceSource}>Consultar tarifas da Cloudflare</a>
    </section>
  );
}

export function CatalogPage({ draft }: { draft?: BenchmarkDraft } = {}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCatalog(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return (
    <section className={styles.page}>
      <PageHeader title="Comparar modelos" />
      {catalog ? (
        <ModelSelector catalog={catalog} draft={draft} />
      ) : error ? (
        <div role="alert">
          <p>Falha ao carregar o catálogo.</p>
          <button
            onClick={() => {
              setError(false);
              setAttempt(attempt + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <p role="status">Carregando versões…</p>
      )}
    </section>
  );
}
