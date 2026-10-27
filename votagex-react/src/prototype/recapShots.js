// The recap's timing, shared by the film (RecapFilm) and its player (RecapViewer): one entry per shot. Each
// shot comes in by its `cut` (slide, rise or iris), which overlaps the shot before by CUT frames, so `from`
// is where it starts in the film. `light` shots sit on a pale ground, so the player's bars switch to ink.
export const FPS = 30;
export const CUT = 14;
export const BLOCK = 26; // each colour block in the numbers shot

// how many colour blocks the numbers shot has (the spend drops out when nothing was noted)
export const blocksFor = (d) => (d.spend.total > 0 ? 4 : 3);

// shots follow the trip: a shot per photo (up to 4); no stops, that shot drops out
export function shotsFor(d) {
  return [
    { key: 'hook', dur: 84, light: true },
    { key: 'say', dur: 100, light: true, cut: 'slide' },
    { key: 'brief', dur: 92, light: true, cut: 'rise' },
    d.stops.length > 0 && { key: 'map', dur: 96 + d.stops.length * 16, light: true, cut: 'iris' },
    ...d.photos.slice(0, 4).map((_, i) => ({ key: `photo${i}`, photo: i, dur: 90, light: true, cut: 'slide' })),
    { key: 'blocks', dur: blocksFor(d) * BLOCK + 20, cut: 'iris' },
    { key: 'end', dur: 120, light: true, cut: 'iris' },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    return [...list, { ...s, from: prev ? prev.from + prev.dur - (s.cut ? CUT : 0) : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;
