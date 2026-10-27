// The recap trailer's timing, shared by the film (RecapFilm) and its player (RecapViewer): one entry per shot,
// played one after another
export const FPS = 30;
export const LEADER = 66; // the countdown, before the studio card in the same shot

// shots follow the trip: a scene per photo; no stops or spend, those shots drop out
export function shotsFor(d) {
  return [
    { key: 'open', dur: LEADER + 84 },
    { key: 'title', dur: 115 },
    d.crew.length > 0 && { key: 'cast', dur: 64 + d.crew.length * 16 },
    d.stops.length > 0 && { key: 'map', dur: 76 + d.stops.length * 22 },
    ...d.photos.map((_, i) => ({ key: `scene${i}`, photo: i, dur: 120 })),
    { key: 'budget', dur: 130 },
    { key: 'credits', dur: 250 },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    return [...list, { ...s, from: prev ? prev.from + prev.dur : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;
