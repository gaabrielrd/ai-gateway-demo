import type { ComponentType, ReactNode, SVGProps } from 'react';
import styles from './PageHeader.module.css';

/** Assinatura dos icones do lucide-react, sem acoplar ao pacote. */
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: IconComponent;
};

/** Cabeçalho de página: título, apoio opcional e ações. */
export function PageHeader({ title, description, actions, icon: Icon }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>
          {Icon ? <Icon className="icon" aria-hidden="true" /> : null}
          {title}
        </h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

type SectionHeadingProps = {
  title: string;
  description?: ReactNode;
  icon?: IconComponent;
};

/** Título de bloco dentro de uma página. */
export function SectionHeading({ title, description, icon: Icon }: SectionHeadingProps) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {Icon ? <Icon className="icon" aria-hidden="true" /> : null}
        {title}
      </h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}
