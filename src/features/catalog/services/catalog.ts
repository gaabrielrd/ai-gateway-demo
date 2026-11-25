import catalogUrl from '../../../../functions/catalog.json?url&no-inline';
import type catalog from '../../../../functions/catalog.json';

export type Catalog = typeof catalog;

export async function loadCatalog(signal: AbortSignal): Promise<Catalog> {
  const response = await fetch(catalogUrl, { signal });
  if (!response.ok) throw new Error('Falha ao carregar as versões.');
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('models' in data) ||
    !Array.isArray(data.models) ||
    !('priceSource' in data) ||
    typeof data.priceSource !== 'string' ||
    !data.priceSource.startsWith('https://') ||
    !data.models.every(
      (model: unknown) =>
        model &&
        typeof model === 'object' &&
        'id' in model &&
        typeof model.id === 'string' &&
        'provider' in model &&
        typeof model.provider === 'string' &&
        'price' in model &&
        model.price &&
        typeof model.price === 'object' &&
        'input' in model &&
        'output' in model,
    )
  )
    throw new Error('Catálogo inválido.');
  return data as Catalog;
}
