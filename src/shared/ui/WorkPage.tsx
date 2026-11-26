import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import styles from './PageHeader.module.css';

export function WorkPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.workPage}>
      <PageHeader title={title} description={description} />
      {children}
    </section>
  );
}
