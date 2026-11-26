import { Check, ChevronDown, Search, type LucideIcon } from 'lucide-react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/shared/ui';
import { useState } from 'react';
import styles from './CatalogPage.module.css';

interface Choice {
  id: string;
  name: string;
  detail: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export function CatalogPicker({
  label,
  value,
  icon: Icon,
  choices,
  selected,
  onPick,
  multiple = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  choices: Choice[];
  selected: string[];
  onPick: (id: string) => void;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = choices.filter((choice) =>
    (choice.name + ' ' + choice.id).toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className={styles.picker}>
      <span>{label}</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <Button className={styles.trigger} aria-label={label + ': ' + value}>
            <Icon className="icon" aria-hidden="true" />
            <span>{value}</span>
            <ChevronDown className="icon icon-sm" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label={label} className={styles.menu}>
          <div className={styles.search}>
            <Search className="icon icon-sm" aria-hidden="true" />
            <Input
              aria-label={'Buscar em ' + label}
              placeholder={multiple ? 'Buscar modelo…' : 'Buscar provedor…'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.options}>
            {filtered.map((choice) => {
              const Mark = choice.icon;
              const body = (
                <>
                  <Mark className="icon icon-sm" aria-hidden="true" />
                  <span>
                    <strong>{choice.name}</strong>
                    <small>{choice.detail}</small>
                  </span>
                </>
              );
              return multiple ? (
                <Label
                  key={choice.id}
                  className={styles.row}
                  data-selected={selected.includes(choice.id)}
                >
                  {body}
                  <Checkbox
                    aria-label={choice.name}
                    disabled={choice.disabled}
                    checked={selected.includes(choice.id)}
                    onCheckedChange={() => onPick(choice.id)}
                  />
                </Label>
              ) : (
                <Button
                  key={choice.id}
                  variant="ghost"
                  className={styles.row}
                  aria-pressed={selected.includes(choice.id)}
                  onClick={() => {
                    onPick(choice.id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  {body}
                  {selected.includes(choice.id) && (
                    <Check className="icon icon-sm" aria-hidden="true" />
                  )}
                </Button>
              );
            })}
            {!filtered.length && (
              <p>
                {query ? 'Nenhum resultado para esta busca.' : 'Nenhuma versão para esta tarefa.'}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
