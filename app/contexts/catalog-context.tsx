import {createContext, useContext, type ReactNode} from 'react';
import type {CatalogSnapshot} from '~/models/types';

const CatalogContext = createContext<CatalogSnapshot | null>(null);

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: CatalogSnapshot;
  children: ReactNode;
}) {
  return (
    <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return catalog;
}
