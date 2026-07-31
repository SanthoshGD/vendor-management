'use client';

import { useEffect, RefObject } from 'react';

const FOCUSABLE = [
  'button:not(:disabled)', '[href]', 'input:not(:disabled)', 'select:not(:disabled)',
  'textarea:not(:disabled)', '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function useDialog(
  ref: RefObject<HTMLElement | null>,
  close: () => void,
  { autoFocus = true }: { autoFocus?: boolean } = {}
) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const opener = document.activeElement as HTMLElement | null;
    const focusable = () => [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);

    if (autoFocus) (focusable()[0] || node).focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!node.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [ref, close, autoFocus]);
}
