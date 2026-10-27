import { createElement } from 'react';
import { HEAD_AT, PIECE_AT, pieceKey, treeOf } from './peeps';

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
  const at = (kind) => `translate(${PIECE_AT[kind]})`;
  return (
    <g>
      {piece(pose, ink, fill)}
      <g transform={`translate(${HEAD_AT})`}>
        <g className="pp-head">
          {piece(pieceKey('hair', look.hair), ink, fill)}
          <g className="pp-face" transform={at('face')}>{piece(pieceKey('face', look.face), ink, fill)}</g>
          {blink && <g className="pp-shut" transform={at('face')}>{piece('face/EyesClosed', ink, fill)}</g>}
          <g transform={at('beard')}>{piece(pieceKey('beard', look.beard), ink, fill)}</g>
          <g transform={at('glasses')}>{piece(pieceKey('glasses', look.glasses), ink, fill)}</g>
        </g>
      </g>
    </g>
  );
}
