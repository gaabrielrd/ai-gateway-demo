import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { Button, PageHeader } from '@/shared/ui';
import { type Panel, readPanels, savePanel } from '../services/panels';

const names: Record<string, string> = {
  summary: 'Resumo de texto',
  extraction: 'Extração de campos',
  image: 'Geração de imagem',
};
function Editor({ panel }: { panel: Panel }) {
  const { ensureSession } = useAuth();
  const [ids, setIds] = useState(panel.modelIds),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google.');
      await savePanel(session, panel.task, ids);
      setMessage('Painel salvo.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy}>
      <legend>{names[panel.task]}</legend>
      <p>{panel.criteria.map((c) => c.label).join(' · ')}</p>
      {panel.options.map((id) => (
        <div key={id}>
          <label>
            <input
              type="checkbox"
              checked={ids.includes(id)}
              disabled={!ids.includes(id) && ids.length >= 3}
              onChange={(e) => {
                setMessage('');
                setIds(e.target.checked ? [...ids, id] : ids.filter((old) => old !== id));
              }}
            />
            {id}
          </label>
        </div>
      ))}
      {panel.options.length < 3 && (
        <p>São necessárias três versões compatíveis para avaliar esta tarefa.</p>
      )}
      <Button disabled={ids.length !== 3} onClick={() => void save()}>
        Salvar painel
      </Button>
      <p role="status">{message}</p>
    </fieldset>
  );
}
function Panels() {
  const { ensureSession } = useAuth();
  const [panels, setPanels] = useState<Panel[]>(),
    [error, setError] = useState(''),
    [rev, setRev] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google.');
      const data = await readPanels(session);
      if (active) setPanels(data);
    }
    void load().catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Falha ao carregar.');
    });
    return () => {
      active = false;
    };
  }, [ensureSession, rev]);
  if (error)
    return (
      <div role="alert">
        {error}{' '}
        <Button
          onClick={() => {
            setError('');
            setRev((n) => n + 1);
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  if (!panels) return <p role="status">Carregando painéis…</p>;
  return (
    <>
      {panels.map((panel) => (
        <Editor key={panel.task} panel={panel} />
      ))}
    </>
  );
}
export function PanelsPage() {
  const { state } = useAuth();
  return (
    <section>
      <PageHeader
        title="Painéis de juízes"
        description="Escolha três versões por tarefa. Para imagens, a lista inclui as versões verificadas com entradas visuais."
      />
      {state.status === 'autenticada' ? (
        <Panels key={state.session.subject} />
      ) : (
        <p>Entre com a conta administradora para configurar os juízes.</p>
      )}
    </section>
  );
}
