import { useEffect } from 'react';

const FOCUSABLE = [
  'button:not(:disabled)', '[href]', 'input:not(:disabled)', 'select:not(:disabled)',
  'textarea:not(:disabled)', '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Makes a modal behave like a modal. Without this the dialogs in this app were
// reachable but not escapable: Escape did nothing, focus stayed on <body> so a
// keyboard user tabbed through the entire page behind the backdrop before
// reaching the form, and the page kept scrolling underneath.
//
// `ref` is the dialog card; `close` is what Escape should call. Pass
// `autoFocus:false` when the dialog already focuses a specific field itself.
export default function useDialog(ref, close, { autoFocus = true } = {}) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const opener = document.activeElement;
    const focusable = () => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);

    if (autoFocus) (focusable()[0] || node).focus();

    const onKey = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      // Cycle within the dialog so focus cannot wander behind the backdrop.
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
      // Send the caret back where it came from, so closing a dialog does not
      // dump the user at the top of the document.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [ref, close, autoFocus]);
}
