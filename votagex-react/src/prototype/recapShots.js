// The recap's timing, shared by the film (RecapFilm) and its player (RecapViewer): one entry per shot. Each
// shot comes in by its `cut` (none, slide or zoom), which overlaps the shot before by CUT frames, so `from`
// is where it starts in the film. `light` shots sit on a pale background, so the player's bars switch to ink.
export const FPS = 30;
export const CUT = 18;

// shots follow the trip: a shot per photo; no crew or stops, those shots drop out
export function shotsFor(d) {
  return [
    { key: 'intro', dur: 112, light: true },
    { key: 'cover', dur: 96, cut: 'none' }, // the intro already pushes into the cover photo
    d.crew.length > 1 && { key: 'crew', dur: 96, light: true, cut: 'slide' },
    d.stops.length > 0 && { key: 'route', dur: 96 + d.stops.length * 12, light: true, cut: 'slide' },
    ...d.photos.map((_, i) => ({ key: `photo${i}`, photo: i, dur: 110, cut: i ? 'slide' : 'zoom' })),
    { key: 'numbers', dur: 140, cut: 'zoom' },
    { key: 'end', dur: 160, light: true, cut: 'zoom' },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    const lap = prev && s.cut && s.cut !== 'none' ? CUT : 0;
    return [...list, { ...s, from: prev ? prev.from + prev.dur - lap : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;
