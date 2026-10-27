import { createElement } from 'react';
import { treeOf } from './peeps';

const draw = (node, ink, fill, key) => {
  if (!Array.isArray(node)) return node;
  const [tag, props, ...kids] = node;
  const p = { key };
  Object.entries(props).forEach(([k, v]) => { p[k] = v === '$S' ? ink : v === '$B' ? fill : v; });
  return createElement(tag, p, ...kids.map((c, i) => draw(c, ink, fill, i)));
};
const piece = (key, ink, fill) => { const t = key && treeOf(key); return t ? draw(t, ink, fill) : null; };

// one Open Peep (peeps.js) in a pose, as SVG in the library's own units, the head where the library puts it
// (its top left at 225, 0) and in its own group (.pp-head) to nod or tilt. With `blink`, the face has its
// eyes-closed one over it too (.pp-face / .pp-shut, for CSS to swap). Its pieces must have loaded (usePeeps)
export default function Peep({ look, pose, blink = false, ink = '#18181B', fill = '#fff' }) {
  return (
    <g>
      {piece(pose, ink, fill)}
      <g transform="translate(225 0)">
        <g className="pp-head">
          {piece(look.hair && `hair/${look.hair}`, ink, fill)}
          <g className="pp-face" transform="translate(159 186)">{piece(`face/${look.face}`, ink, fill)}</g>
          {blink && <g className="pp-shut" transform="translate(159 186)">{piece('face/EyesClosed', ink, fill)}</g>}
          {look.beard && look.beard !== 'None' && <g transform="translate(123 338)">{piece(`facialHair/${look.beard}`, ink, fill)}</g>}
          {look.glasses && look.glasses !== 'None' && <g transform="translate(47 241)">{piece(`accessories/${look.glasses}`, ink, fill)}</g>}
        </g>
      </g>
    </g>
  );
}
