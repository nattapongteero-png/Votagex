// The recap diary's timing, shared by the film (RecapFilm) and its player (RecapViewer): one entry per page,
// played one after another; the last TURN frames of a page are its turn to the next
export const FPS = 30;
export const TURN = 22;

// pages follow the trip: a page per photo; no stops or spend, those pages drop out
export function shotsFor(d) {
  return [
    { key: 'cover', dur: 80 },
    { key: 'intro', dur: 120 },
    d.stops.length > 0 && { key: 'route', dur: 70 + d.stops.length * 26 },
    ...d.photos.map((_, i) => ({ key: `photo${i}`, photo: i, dur: 105 })),
    { key: 'spend', dur: 125 },
    { key: 'end', dur: 175 },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    return [...list, { ...s, from: prev ? prev.from + prev.dur : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;
