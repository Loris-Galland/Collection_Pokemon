import {
  addCopy,
  countOwnedQuantities,
  isCopy,
  removeCopy,
  setCopyQuantity,
  type Copy,
  type CopyInput,
} from '@collection/shared';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { createId } from '@/lib/id';
import { usePersistentState } from '@/lib/storage';

// Prototype only. The collection lives on the phone. It will move to the server (MongoDB) and this local storage will
// become the offline cache.
const STORAGE_KEY = 'collection/v1';

// Keeps the valid copies only, so one corrupted entry does not cost the whole collection.
const restoreCopies = (value: unknown): Copy[] | undefined => (Array.isArray(value) ? value.filter(isCopy) : undefined);

interface CollectionActions {
  add: (input: CopyInput) => void;
  setQuantity: (copyId: string, quantity: number) => void;
  remove: (copyId: string) => void;
}

// Two contexts. The actions never change, so a component that only adds or edits copies is not redrawn whenever the
// collection changes.
const CopiesContext = createContext<readonly Copy[] | null>(null);
const ActionsContext = createContext<CollectionActions | null>(null);

/** Loads the collection on startup and saves it after every change. */
export function CollectionProvider({ children }: { children: ReactNode }) {
  const [copies, setCopies, loaded] = usePersistentState<Copy[]>(STORAGE_KEY, [], restoreCopies);

  const actions = useMemo<CollectionActions>(
    () => ({
      add: (input) => setCopies((current) => addCopy(current, input, createId)),
      setQuantity: (copyId, quantity) => setCopies((current) => setCopyQuantity(current, copyId, quantity)),
      remove: (copyId) => setCopies((current) => removeCopy(current, copyId)),
    }),
    [setCopies],
  );

  if (!loaded) return null;
  return (
    <ActionsContext.Provider value={actions}>
      <CopiesContext.Provider value={copies}>{children}</CopiesContext.Provider>
    </ActionsContext.Provider>
  );
}

/** The copies in the collection. */
export function useCopies(): readonly Copy[] {
  const copies = useContext(CopiesContext);
  if (!copies) throw new Error('useCopies must be used inside <CollectionProvider>');
  return copies;
}

/** The add, edit and remove actions, stable across renders. */
export function useCollectionActions(): CollectionActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useCollectionActions must be used inside <CollectionProvider>');
  return actions;
}

/** Total owned quantity per card, across every variant, language and condition. */
export function useOwnedQuantities(): Map<string, number> {
  const copies = useCopies();
  return useMemo(() => countOwnedQuantities(copies), [copies]);
}
