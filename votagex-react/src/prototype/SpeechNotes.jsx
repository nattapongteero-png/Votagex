import { useLayoutEffect, useRef, useState } from 'react';
import Icon, { Flag } from './icons';

// Notes I say, Instagram-notes style: a small bubble floating over my head in the day scene (DayScene)
// with two little dots trailing down to it. Each note starts with typing dots, then the words; after a
// few seconds it fades for the next one (the cycle follows the animation itself). Tap to open it.
export default function SpeechNotes({ notes }) {
  const [tick, setTick] = useState(0);
  const btn = useRef(null);
  const note = notes.length ? notes[tick % notes.length] : null;
  const id = note ? `${note.key}-${tick}` : '';

  // the bubble wraps onto a second line; only a note that would need a
  // third line gets wider (the bubble grows upward and has room for two). Then the box shrinks to its longest line.
  useLayoutEffect(() => {
    const el = btn.current;
    if (!el) return;
    el.style.width = '';
    el.style.maxWidth = '';
    const text = el.querySelector('.pt-speech-text');
    if (text.offsetHeight / parseFloat(getComputedStyle(text).lineHeight) > 2.5) el.style.maxWidth = '210px';
    const range = document.createRange();
    range.selectNodeContents(el.querySelector('.pt-speech-text'));
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1; // the pop animation scales the bubble
    const pad = parseFloat(getComputedStyle(el).paddingLeft) * 2;
    // +2px: sub-pixel rounding must not push the last word onto a new line
    el.style.width = `${Math.ceil(range.getBoundingClientRect().width / scale + pad) + 2}px`;
  }, [id, note?.text]);

  if (!note) return null;
  const many = notes.length > 1;
  const next = (e) => { if (many && e.animationName === 'pt-speech-life') setTick((x) => x + 1); };
  return (
    <div className="pt-speech-wrap">
      <button key={id} ref={btn} className={`pt-speech${many ? ' cycling' : ''}`}
        onClick={note.onClick} onAnimationEnd={next}>
        <span className="pt-speech-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="pt-speech-text">{note.text}{note.icon && <Icon name={note.icon} size={14} className="pt-inline-icon" />}{note.flag && <Flag code={note.flag} className="pt-inline-icon" />}</span>
      </button>
    </div>
  );
}
