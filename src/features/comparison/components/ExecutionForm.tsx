import examples from '../model/examples.json';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/ui';
import { startExecution } from '../services/executions';
import styles from './Comparison.module.css';

export function ExecutionForm({
  task,
  modelIds,
  confirmedMicroUsd,
  confirmedJudges,
}: {
  task: string;
  modelIds: string[];
  confirmedMicroUsd: number;
  confirmedJudges?: string[];
}) {
  const { ensureSession } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(''),
    [reference, setReference] = useState(''),
    [criterion, setCriterion] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const last = useRef({ signature: '', id: '' });
  async function submit() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await ensureSession();
      if (!session) throw new Error('Entre com Google para confirmar.');
      const fields = {
        task,
        modelIds,
        prompt,
        reference,
        criterion,
        confirmedMicroUsd,
        confirmedJudges,
      };
      const signature = JSON.stringify(fields);
      if (last.current.signature !== signature)
        last.current = { signature, id: crypto.randomUUID() };
      const executionId = last.current.id;
      await startExecution(session, { ...fields, executionId });
      await navigate('/execucoes/' + executionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao iniciar a execução.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label>
        Prompt
        <textarea
          required
          rows={4}
          maxLength={task === 'image' ? 2048 : 16000}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </label>
      <Button
        type="button"
        disabled={busy}
        onClick={() => {
          const example = examples[task as keyof typeof examples];
          if (example) {
            setPrompt(example.prompt);
            setReference(example.reference);
          }
        }}
      >
        Usar exemplo
      </Button>
      <label>
        Referência ou gabarito (opcional)
        <textarea
          rows={2}
          maxLength={8000}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </label>
      <label>
        Critério próprio (opcional)
        <input maxLength={8000} value={criterion} onChange={(e) => setCriterion(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <Button variant="primary" disabled={!prompt.trim() || busy} type="submit">
        {busy ? 'Enviando…' : 'Confirmar e executar'}
      </Button>
    </form>
  );
}
