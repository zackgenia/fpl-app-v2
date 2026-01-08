import { useCallback, useState } from 'react';
import type { EntityRef } from '../types';

export function useDetailsDrawer() {
  const [stack, setStack] = useState<EntityRef[]>([]);
  const isOpen = stack.length > 0;
  const current = stack[stack.length - 1] ?? null;

  const openEntity = useCallback((ref: EntityRef) => {
    setStack([ref]);
  }, []);

  const pushEntity = useCallback((ref: EntityRef) => {
    setStack(prev => [...prev, ref]);
  }, []);

  const replaceEntity = useCallback((ref: EntityRef) => {
    setStack(prev => (prev.length > 0 ? [...prev.slice(0, -1), ref] : [ref]));
  }, []);

  const back = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const close = useCallback(() => {
    setStack([]);
  }, []);

  return {
    isOpen,
    stack,
    current,
    openEntity,
    pushEntity,
    replaceEntity,
    back,
    close,
  };
}
