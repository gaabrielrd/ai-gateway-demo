import { RefreshCw } from 'lucide-react';
import {
  Spinner,
  Button,
  Checkbox,
  Disclosure,
  ErrorMessage,
  Label,
  NativeSelect,
  PageHeader,
} from '@/shared/ui';
import { useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { loadCatalog, type Catalog } from '../services/catalog';
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
  if (price.per512x512Tile === undefined) return 'Tarifa por execução indisponível';
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
  const providers = [...new Set(catalog.models.map((m) => m.provider))].sort();
  const [provider, setProvider] = useState(
    () =>
      catalog.models.find((m) => selected.includes(m.id))?.provider ??
      (providers.includes('workers-ai') ? 'workers-ai' : (providers[0] ?? '')),
  );
  const [sort, setSort] = useState('recent');
  const byOrder = (a: Model, b: Model) =>
    (sort === 'recent' ? (b.createdAt ?? '').localeCompare(a.createdAt ?? '') : 0) ||
    a.id.localeCompare(b.id);
  const visible = compatible.filter((m) => m.provider === provider).sort(byOrder);
  const other = catalog.models
    .filter((m) => m.provider === provider && !compatible.includes(m))
    .sort(byOrder);
  return (
    <div className={styles.selector}>
      {draft?.prompt && (
        <Disclosure defaultOpen title="Prompt do benchmark">
          <p>{draft.prompt}</p>
        </Disclosure>
      )}
      <div className={styles.catalogBody}>
        <fieldset className={styles.choices}>
          <legend>Versões para comparar</legend>
          {required === 0 ? (
            <p>
              Nenhum modelo habilitado tem modalidade compatível e teto de custo verificável para
              esta tarefa.
            </p>
          ) : required === 1 ? (
            <p>Apenas uma versão é compatível. Você pode testar esse modelo individualmente.</p>
          ) : required === 2 ? (
            <p>Apenas duas versões são compatíveis. Selecione ambas para comparar.</p>
          ) : (
            <p>Selecione três versões compatíveis.</p>
          )}
          <div className={styles.filters}>
            <Label className={styles.task}>
              Tarefa
              <NativeSelect
                value={task.label}
                onChange={(event) => {
                  setTask(tasks.find((item) => item.label === event.target.value)!);
                  setSelected([]);
                }}
              >
                {tasks.map((item) => (
                  <option key={item.label}>{item.label}</option>
                ))}
              </NativeSelect>
            </Label>
            <Label className={styles.task}>
              Provedor
              <NativeSelect value={provider} onChange={(e) => setProvider(e.target.value)}>
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p === 'workers-ai' ? 'Workers AI' : p}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <Label className={styles.task}>
              Ordenar modelos
              <NativeSelect value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Mais recentes no catálogo</option>
                <option value="name">Nome (A–Z)</option>
              </NativeSelect>
            </Label>
          </div>
          {visible.length === 0 && (
            <p>Este provedor não possui modelos para a tarefa selecionada.</p>
          )}
          {visible.map((model) => (
            <Label
              className={styles.row}
              data-selected={selected.includes(model.id)}
              key={model.id}
              htmlFor={model.id}
              aria-label={model.id}
            >
              <Checkbox
                id={model.id}
                checked={selected.includes(model.id)}
                disabled={
                  Boolean(model.budgetRestriction) ||
                  (selected.length === required && !selected.includes(model.id))
                }
                onCheckedChange={(checked) =>
                  setSelected(
                    checked === true
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
            </Label>
          ))}
          {other.length > 0 && (
            <Disclosure title={`Modelos para outras tarefas (${other.length})`}>
              <ul>
                {other.map((m) => (
                  <li key={m.id}>
                    {m.id} · {m.output}
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
        </fieldset>
      </div>
      <aside aria-label="Sua comparação" className={styles.selection}>
        <h2>Sua comparação</h2>
        {selected.length > 0 && (
          <ul className={styles.selectedList} aria-label="Modelos selecionados">
            {selected.map((id) => (
              <li key={id}>
                {id}{' '}
                <Button
                  variant="ghost"
                  aria-label={`Remover ${id}`}
                  onClick={() => setSelected(selected.filter((item) => item !== id))}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
        {required > 0 && (
          <output aria-live="polite">
            {selected.length} de {required} selecionadas
          </output>
        )}
        {required > 0 && selected.length === required && (
          <QuotePreview key={[task.id, ...selected].join('|')} task={task.id} modelIds={selected} />
        )}
      </aside>
      <a href={catalog.priceSource}>Consultar tarifas da Cloudflare</a>
    </div>
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
      <PageHeader
        title="Comparar modelos"
        description="Escolha uma tarefa e as versões que receberão o mesmo prompt."
      />
      {catalog ? (
        <ModelSelector catalog={catalog} draft={draft} />
      ) : error ? (
        <ErrorMessage>
          <p>Falha ao carregar o catálogo.</p>
          <Button
            onClick={() => {
              setError(false);
              setAttempt(attempt + 1);
            }}
          >
            <RefreshCw className="icon icon-sm" aria-hidden="true" /> Tentar novamente
          </Button>
        </ErrorMessage>
      ) : (
        <p role="status">
          <Spinner /> Carregando versões…
        </p>
      )}
    </section>
  );
}
