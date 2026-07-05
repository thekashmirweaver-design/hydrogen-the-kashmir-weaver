import type {CatalogSnapshot} from '~/models/types';
import type {CatalogOptions} from '~/models/catalog.repository';
import * as CatalogRepository from '~/models/catalog.repository';

const catalogByRequest = new WeakMap<Request, Promise<CatalogSnapshot>>();
const catalogMenuByRequest = new WeakMap<Request, Promise<CatalogSnapshot>>();

/** One catalog fetch per document request — shared by root and route loaders. */
export function loadSharedCatalog(
  request: Request,
  options: CatalogOptions,
): Promise<CatalogSnapshot> {
  let pending = catalogByRequest.get(request);
  if (!pending) {
    pending = CatalogRepository.getCatalogSnapshot(options);
    catalogByRequest.set(request, pending);
  }
  return pending;
}

/** Lightweight catalog for layout chrome on editorial routes. */
export function loadSharedCatalogMenu(
  request: Request,
  options: CatalogOptions,
): Promise<CatalogSnapshot> {
  let pending = catalogMenuByRequest.get(request);
  if (!pending) {
    pending = CatalogRepository.getCatalogMenuSnapshot(options);
    catalogMenuByRequest.set(request, pending);
  }
  return pending;
}

export async function resolveCatalogSnapshot(
  options: CatalogOptions | undefined,
  catalog?: CatalogSnapshot,
): Promise<CatalogSnapshot> {
  return catalog ?? (await CatalogRepository.getCatalogSnapshot(options));
}
