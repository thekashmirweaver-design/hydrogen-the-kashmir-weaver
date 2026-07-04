import {createContext, useContext, type ReactNode} from 'react';
import type {LocalizationSnapshot} from '~/lib/localization';

const LocalizationContext = createContext<LocalizationSnapshot | null>(null);

export function LocalizationProvider({
  localization,
  children,
}: {
  localization: LocalizationSnapshot;
  children: ReactNode;
}) {
  return (
    <LocalizationContext.Provider value={localization}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const localization = useContext(LocalizationContext);
  if (!localization) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return localization;
}
