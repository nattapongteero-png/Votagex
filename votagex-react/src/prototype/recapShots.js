// The recap's timing, shared by the film (RecapFilm), its sound (recapSound) and its player (RecapViewer).
// Everything sits on one beat grid: 112.5 bpm is 16 frames a beat at 30 fps, so shots, cuts and every pop
// land on whole beats, eighths (8) or sixteenths (4), and the sound's hits land with them. Each shot comes
// in by its `cut` (slide, rise or iris), one beat long and overlapping the shot before, so `from` is where it
// starts in the film. `light` shots sit on a pale ground, so the player's bars switch to ink.
export const FPS = 30;
export const BEAT = 16;
export const CUT = BEAT;

// when things happen inside each shot, in frames from the shot's start; the film draws to these and the
// sound hits on them
export const T = {
  hook: { mascot: 0, chips: 8, chipStep: 4, title: 16 },
  say: { words: [0, 8], went: 16, name: 24, nameStep: 2, quotes: 40, quoteStep: 8, bar: 64, query: 72, queryStep: 1.25, press: 104 },
  brief: { card: 0, title: 8, sub: 16, mascot: 32 },
  map: { title: 0, start: 16, per: 16 },
  photo: { date: 16, text: 24, by: 32 },
  blocks: { step: 2 * BEAT },
  stamp: { land: 16, mark: 24, no: 40, total: 56 },
  end: { mascot: 8, title: 16, sub: 24, crew: 40 },
};

const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s || '')].map((x) => x.segment);
export const queryOf = (d) => `${d.title} · ${d.dateFull}`;
export const quotesOf = (d) => d.photos.map((p) => p.text).filter(Boolean).slice(0, 3);

// how many colour blocks the numbers shot has (the spend drops out when nothing was noted)
export const blocksFor = (d) => (d.spend.total > 0 ? 4 : 3);

// shots follow the trip: a shot per photo (up to 4); no stops, that shot drops out; the trip's stamp (from the
// stamp book) is pressed in before the close, when it has one
export function shotsFor(d) {
  const B = BEAT;
  return [
    { key: 'hook', dur: 6 * B, light: true },
    { key: 'say', dur: 7 * B, light: true, cut: 'slide' },
    { key: 'brief', dur: 6 * B, light: true, cut: 'rise' },
    d.stops.length > 0 && { key: 'map', dur: (6 + d.stops.length) * B, light: true, cut: 'iris' },
    ...d.photos.slice(0, 4).map((_, i) => ({ key: `photo${i}`, photo: i, dur: 6 * B, light: true, cut: 'slide' })),
    { key: 'blocks', dur: (blocksFor(d) * 2 + 1) * B, cut: 'iris' },
    d.stamp && { key: 'stamp', dur: 6 * B, light: true, cut: 'iris' },
    { key: 'end', dur: 8 * B, light: true, cut: d.stamp ? 'rise' : 'iris' },
  ].filter(Boolean).reduce((list, s) => {
    const prev = list[list.length - 1];
    return [...list, { ...s, from: prev ? prev.from + prev.dur - (s.cut ? CUT : 0) : 0 }];
  }, []);
}
export const lengthOf = (shots) => shots[shots.length - 1].from + shots[shots.length - 1].dur;

// every hit the sound plays, in film frames: { f, kind, n } where n picks the note for pitched pops
export function cuesFor(d, shots) {
  const out = [];
  const at = (f, kind, n = 0) => out.push({ f: Math.round(f), kind, n });
  shots.forEach((s) => {
    const o = s.from;
    if (s.cut) at(o, s.cut === 'iris' ? 'iris' : 'whoosh');
    if (s.key === 'hook') {
      at(o + T.hook.mascot, 'thump');
      for (let i = 0; i < 6; i += 1) at(o + T.hook.chips + i * T.hook.chipStep, 'pop', i);
    } else if (s.key === 'say') {
      T.say.words.forEach((w, i) => at(o + w, 'pop', i * 2));
      at(o + T.say.went, 'pop', 4);
      graphemes(d.title).forEach((_, i) => at(o + T.say.name + i * T.say.nameStep, 'tick'));
      quotesOf(d).forEach((_, i) => at(o + T.say.quotes + i * T.say.quoteStep, 'pop', i + 2));
      at(o + T.say.bar, 'pop', 0);
      graphemes(queryOf(d)).forEach((_, i) => at(o + T.say.query + i * T.say.queryStep, 'tick'));
      at(o + T.say.press, 'click');
    } else if (s.key === 'brief') {
      at(o + T.brief.title, 'pop', 3);
      at(o + T.brief.mascot, 'boing');
    } else if (s.key === 'map') {
      at(o + T.map.title, 'pop', 0);
      d.stops.forEach((_, i) => { at(o + T.map.start + i * T.map.per, 'ding', i); at(o + T.map.start + i * T.map.per + 8, 'pop', i + 2); });
      at(o + T.map.start + d.stops.length * T.map.per, 'hit');
    } else if (s.photo != null) {
      at(o + 2, 'shutter');
      at(o + T.photo.date, 'pop', 1); at(o + T.photo.text, 'pop', 3); at(o + T.photo.by, 'pop', 5);
    } else if (s.key === 'blocks') {
      for (let k = 0; k < blocksFor(d); k += 1) at(o + k * T.blocks.step, 'impact', k);
    } else if (s.key === 'stamp') {
      at(o + T.stamp.land, 'stamp'); at(o + T.stamp.mark, 'ink'); at(o + T.stamp.no, 'pop', 2); at(o + T.stamp.total, 'pop', 4);
    } else if (s.key === 'end') {
      at(o + T.end.mascot, 'pop', 0); at(o + T.end.title, 'chime'); at(o + T.end.crew, 'pop', 4);
    }
  });
  return out.sort((a, b) => a.f - b.f);
}
