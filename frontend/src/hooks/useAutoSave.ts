import { useEffect, useRef } from "react";

/**
 * Sistema anti-escape: guarda automáticamente cada `intervalMs` (10s por
 * defecto) si el valor cambió desde el último guardado — así nunca se
 * pierde una idea a mitad de escritura, sin spamear al backend en cada
 * tecla.
 */
export function useAutoSave<T>(value: T, save: () => void, intervalMs = 10000) {
  const lastSaved = useRef(value);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const id = setInterval(() => {
      if (JSON.stringify(value) !== JSON.stringify(lastSaved.current)) {
        lastSaved.current = value;
        saveRef.current();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [value, intervalMs]);
}
