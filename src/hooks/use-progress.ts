"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  PROGRESS_EVENT,
  freshStore,
  loadStore,
  saveStore,
  type Store,
} from "@/lib/progress";

const serverStore = freshStore();
let cachedRaw: string | null | undefined;
let cachedStore = serverStore;
let loadProblem: string | null = null;

let clientReady = false;

function subscribe(onStoreChange: () => void) {
  const timeout = window.setTimeout(() => {
    clientReady = true;
    onStoreChange();
  }, 0);
  window.addEventListener(PROGRESS_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.clearTimeout(timeout);
    window.removeEventListener(PROGRESS_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getClientReady() {
  return clientReady;
}

function getSnapshot(): Store {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("learn100.v1");
  } catch {
    loadProblem = "本地进度读不出来，已按空白重新开始。";
    cachedRaw = undefined;
    cachedStore = freshStore();
    return cachedStore;
  }
  if (raw === cachedRaw) return cachedStore;
  cachedRaw = raw;
  if (!raw) {
    loadProblem = null;
    cachedStore = freshStore();
    return cachedStore;
  }
  try {
    cachedStore = loadStore();
    loadProblem = null;
  } catch {
    loadProblem = "本地进度读不出来，已按空白重新开始。";
    try {
      window.localStorage.removeItem("learn100.v1");
    } catch {
      /* ignore */
    }
    cachedRaw = null;
    cachedStore = freshStore();
  }
  return cachedStore;
}

function getServerSnapshot(): Store {
  return serverStore;
}

export function useProgress() {
  const isClient = useSyncExternalStore(subscribe, getClientReady, () => false);
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const store = isClient ? live : serverStore;

  const commit = useCallback((next: Store) => {
    try {
      saveStore(next);
    } catch {
      loadProblem = "进度没能写进浏览器，刷新后可能丢失。这次仍然可以学。";
      window.dispatchEvent(new Event(PROGRESS_EVENT));
    }
  }, []);

  return {
    ready: isClient,
    store,
    error: isClient ? loadProblem : null,
    clearError: () => {
      loadProblem = null;
      window.dispatchEvent(new Event(PROGRESS_EVENT));
    },
    commit,
  };
}
