import { useEffect, useRef, useState } from 'react';

const cx = (...values) => values.filter(Boolean).join(' ');

const FLAVOR_LABEL = {
  bank: 'OFFICIAL BANK VERIFICATION',
  license: 'BUSINESS REGISTRY AUTHORITY',
  certificate: 'CERTIFICATION AUTHORITY',
  audit: 'COMPLIANCE AUDIT REPORT',
  legal: 'LEGAL AGREEMENT RECORD',
};

const LANGUAGE_LABEL = { vi: 'Tiếng Việt', zh: '中文' };

const tierOf = (f) => (f.crossDocMismatch || f.confidence < 60 ? 'red' : f.confidence < 90 ? 'amber' : 'green');

// Renders the left-hand "document" and a semi-transparent highlight box that
// physically animates to whichever field is currently selected. The box
// position is measured from the real rendered row (not hand-authored
// coordinates), so it can never drift out of alignment with the document.
export default function DocumentCanvas({ doc, activeFieldKey, onSelectField, showOriginal, onToggleOriginal }) {
  const paperRef = useRef(null);
  const scrollRef = useRef(null);
  const [box, setBox] = useState(null);

  useEffect(() => {
    const measure = () => {
      if (!doc || !paperRef.current) { setBox(null); return; }
      const rowEl = paperRef.current.querySelector(`[data-field-key="${activeFieldKey}"]`);
      if (!rowEl) { setBox(null); return; }
      const paperRect = paperRef.current.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      setBox({
        top: rowRect.top - paperRect.top,
        left: rowRect.left - paperRect.left,
        width: rowRect.width,
        height: rowRect.height,
      });
    };
    measure();
    // Measure again on the next frame: switching between Mandarin and English
    // reflows the rows (CJK glyphs wrap differently to Latin text), and web
    // fonts can settle a frame late. Without this the box keeps the previous
    // language's geometry and visibly drifts off its row.
    const frame = window.requestAnimationFrame(measure);

    // A ResizeObserver catches every other cause of reflow — panel resizing,
    // a field being corrected to a longer value, the rail collapsing.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer && paperRef.current) observer.observe(paperRef.current);

    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
    // `showOriginal` matters here even though it is not read in this effect:
    // it changes the rendered text, and therefore the geometry being measured.
  }, [doc, activeFieldKey, showOriginal]);

  useEffect(() => {
    const rowEl = paperRef.current?.querySelector(`[data-field-key="${activeFieldKey}"]`);
    const scrollEl = scrollRef.current;
    if (!rowEl || !scrollEl) return;
    const rowRect = rowEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    if (rowRect.top < scrollRect.top || rowRect.bottom > scrollRect.bottom) {
      scrollEl.scrollTo({
        top: Math.max(0, scrollEl.scrollTop + rowRect.top - scrollRect.top - 32),
        behavior: 'smooth',
      });
    }
  }, [doc?.id, activeFieldKey]);
  if (!doc) {
    return <div className="doc-canvas doc-canvas-empty"><p>Select a document to begin review.</p></div>;
  }

  const hasTranslations = Boolean(doc.language && doc.fields.some((field) => field.translatedValue));

  return (
    <div className="doc-canvas">
      <div className="doc-canvas-toolbar">
        <div>
          <strong>{doc.title}</strong>
          <span>{doc.fileName || 'No file on record'}{doc.pageCount ? ` · Page 1 of ${doc.pageCount}` : ''}</span>
        </div>
        {hasTranslations && (
          <div className="bilingual-toggle" role="group" aria-label="Switch between original and translated text">
            <button type="button" className={showOriginal ? 'active' : ''} onClick={() => onToggleOriginal(true)}>
              Original · {LANGUAGE_LABEL[doc.language] || doc.language}
            </button>
            <button type="button" className={!showOriginal ? 'active' : ''} onClick={() => onToggleOriginal(false)}>
              Translated · English
            </button>
          </div>
        )}
      </div>
      <div className="doc-canvas-scroll" ref={scrollRef}>
        <div className={cx('doc-paper', `flavor-${doc.docTemplate}`)} ref={paperRef}>
          {box && <div className="doc-highlight-box" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} />}
          <div className="doc-paper-header">
            <span className="doc-paper-seal">{doc.code}</span>
            <div>
              <strong>{FLAVOR_LABEL[doc.docTemplate] || 'OFFICIAL RECORD'}</strong>
              <small>Authenticated copy on file</small>
            </div>
          </div>

          {doc.status === 'Missing' ? (
            <div className="doc-paper-empty">
              <p>Document not yet received from the supplier.</p>
            </div>
          ) : doc.status === 'Processing' ? (
            <div className="doc-paper-empty doc-paper-scanning">
              <p>Scanning document — AI checks are running…</p>
            </div>
          ) : (
            <div className="doc-paper-fields">
              {doc.fields.map((f) => {
                const displayValue = (showOriginal || !f.translatedValue) ? f.value : f.translatedValue;
                return (
                  <button
                    type="button"
                    key={f.key}
                    data-field-key={f.key}
                    className={cx('doc-paper-field', activeFieldKey === f.key && 'active', `tier-${tierOf(f)}`)}
                    onClick={() => onSelectField?.(f.key)}
                  >
                    <span className="doc-paper-field-label">{f.label}</span>
                    <strong className="doc-paper-field-value">{displayValue}</strong>
                  </button>
                );
              })}
            </div>
          )}

          <div className="doc-paper-footer">
            <span>Document reference {doc.id.toUpperCase()}</span>
            <span>Page 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
