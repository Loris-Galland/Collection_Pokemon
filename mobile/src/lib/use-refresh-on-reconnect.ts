import * as Network from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/** Refreshes a store when the network comes back or the app returns to the screen. */
export function useRefreshOnReconnect(store: { refresh: () => Promise<void> } | undefined): void {
  useEffect(() => {
    if (!store) return;
    const network = Network.addNetworkStateListener((state) => {
      if (state.isInternetReachable) store.refresh();
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') store.refresh();
    });
    return () => {
      network.remove();
      appState.remove();
    };
  }, [store]);
}
