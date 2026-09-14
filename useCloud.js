import { useCallback, useEffect, useRef, useState } from 'react';
import { changeCloud, readCloud } from './cloud.js';
import { KEY, validateBackup } from './model.js';

export function useCloud(userId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Načítám soukromou evidenci…');
  const queue = useRef(Promise.resolve());
  const active = useRef(true);
  const busy = useRef(false);
  const lastRevision = useRef(-1);
  const cacheKey = `${KEY}-cloud-${userId}`;
  const accept = useCallback(result => {
    if (!active.current) return;
    if (result.revision !== lastRevision.current) {
      setData(result.document);
      lastRevision.current = result.revision;
    }
    setError('');
    try { localStorage.setItem(cacheKey, JSON.stringify(result.document)); }
    catch { setError('Online uložení funguje, ale místní zálohu se nepodařilo uložit. Stáhni zálohu JSON.'); }
    setStatus('Synchronizováno · ' + new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }));
  }, [cacheKey]);
  const enqueue = useCallback(job => {
    const next = queue.current.then(job, job);
    queue.current = next.catch(() => {});
    return next;
  }, []);
  const refresh = useCallback(() => {
    if (busy.current || !active.current) return;
    busy.current = true;
    return enqueue(async () => {
      try { accept(await readCloud(userId)); }
      catch (err) {
        if (!active.current) return;
        setStatus('Není synchronizováno');
        setError(`Databáze není dostupná: ${err.message}. Neuložené změny neopouštěj.`);
        setData(current => {
          if (current) return current;
          try { return validateBackup(JSON.parse(localStorage.getItem(cacheKey))); } catch { return null; }
        });
      } finally { busy.current = false; }
    });
  }, [userId, cacheKey, accept, enqueue]);
  useEffect(() => {
    active.current = true;
    refresh();
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 5000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { active.current = false; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [refresh]);
  async function commit(transform) {
    return enqueue(async () => {
      if (!active.current) return false;
      setStatus('Ukládám do cloudu…');
      try { accept(await changeCloud(userId, transform)); return active.current; }
      catch (err) {
        if (active.current) {
          setStatus('Změna není uložená');
          setError(`Uložení nelze potvrdit: ${err.message}. Formulář zůstává otevřený. Před opakováním zkontroluj historii.`);
        }
        return false;
      }
    });
  }
  return { data, error, status, commit, refresh, setError };
}
