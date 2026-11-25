import styles from './GenerationOutput.module.css';

export type GenerationContent = { type: 'text'; text: string } | { type: 'image'; url: string };

export function GenerationOutput({
  content,
  model,
}: {
  content: GenerationContent;
  model: string;
}) {
  return content.type === 'image' ? (
    <img src={content.url} alt={`Imagem gerada por ${model}`} className={styles.image} />
  ) : (
    <p className={styles.text}>{content.text}</p>
  );
}
