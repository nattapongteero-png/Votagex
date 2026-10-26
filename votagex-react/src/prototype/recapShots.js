// The recap film's timing, shared by the film (RecapFilm) and its player (RecapViewer)
export const FPS = 30;
export const XF = 14; // frames two shots overlap in a transition

// shot lengths follow the trip: more photos, a longer polaroid shot; no route or spend, those shots drop out
export function shotsFor(d) {
  return [
    { key: 'rewind', dur: 105 },
    { key: 'ticket', dur: 120 },
    d.stops.length > 0 && { key: 'route', dur: 90 + d.stops.length * 22 },
    d.photos.length > 0 && { key: 'photos', dur: 40 + d.photos.length * 62 },
    { key: 'receipt', dur: 170 },
    { key: 'outro', dur: 150 },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    return [...list, { ...s, from: prev ? prev.from + prev.dur - XF : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;
