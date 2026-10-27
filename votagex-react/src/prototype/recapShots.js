// The recap's timing, shared by the film (RecapFilm) and its player (RecapViewer): one entry per shot,
// played one after another. `light` shots sit on a pale background, so the player's bars switch to ink.
export const FPS = 30;

// shots follow the trip: a shot per photo; no crew or stops, those shots drop out
export function shotsFor(d) {
  return [
    { key: 'intro', dur: 112, light: true },
    { key: 'cover', dur: 96 },
    d.crew.length > 1 && { key: 'crew', dur: 84, light: true },
    d.stops.length > 0 && { key: 'route', dur: 84 + d.stops.length * 12, light: true },
    ...d.photos.map((_, i) => ({ key: `photo${i}`, photo: i, dur: 104 })),
    { key: 'numbers', dur: 128 },
    { key: 'end', dur: 150, light: true },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    return [...list, { ...s, from: prev ? prev.from + prev.dur : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;
