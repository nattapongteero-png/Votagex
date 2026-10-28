import { clockWipe } from '@remotion/transitions/clock-wipe';
import { fade } from '@remotion/transitions/fade';
import { flip } from '@remotion/transitions/flip';
import { iris } from '@remotion/transitions/iris';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';

// How the day scene changes over to another profile's (SceneSwap.jsx): Remotion's transitions, the ones that
// work on a live page (the rest draw the page into a canvas first, which Safari can't).
// [key, label, (from: the side the next comes in from, 'left' | 'right'; size: { width, height }) => presentation]
export const SCENE_SWAPS = [
  ['slide', 'เลื่อน', (from) => slide({ direction: `from-${from}` })],
  ['wipe', 'ปัด', (from) => wipe({ direction: `from-${from}` })],
  ['flip', 'พลิก', (from) => flip({ direction: `from-${from}` })],
  ['iris', 'วงกลม', (from, size) => iris(size)],
  ['clock', 'เข็มนาฬิกา', (from, size) => clockWipe(size)],
  ['fade', 'จาง', () => fade()],
];
