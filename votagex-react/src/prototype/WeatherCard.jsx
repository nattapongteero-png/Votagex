import { lazy, Suspense, useEffect, useState } from 'react';
import { pm25Level, rainLevel, weatherKind } from './weather';
import { localHM } from './data';

// the moving sky (Remotion) loads only with the card
const WeatherSky = lazy(() => import('./WeatherSky'));
// clear days: a physically-based sky with the sun where it is at that hour (three.js)
const SunSky = lazy(() => import('./SunSky'));
// weather icon name → sky colour and scene
const KINDS = { wSun: 'sun', wPartly: 'partly', wCloud: 'cloud', wFog: 'fog', wRain: 'rain', wSnow: 'snow', wStorm: 'storm' };
const RAIN_TEXT = ['', 'ฝนเล็กน้อย', 'ฝนปานกลาง', 'ฝนตกหนัก', 'ฝนตกหนักมาก'];
const SKY = { sun: 'sun', partly: 'sun', cloud: 'cloud', fog: 'fog', snow: 'fog', rain: 'rain', storm: 'storm' };

// live clock for the place (its own time zone), ticking over each minute
function Clock({ utc }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 15000);
    return () => clearInterval(id);
  }, []);
  return <span className="pt-wxc-clock">{localHM(utc)}</span>;
}

// Weather widget for a day: sky-coloured card with place, date and temperature over a moving sky, like the
// iPhone weather app's: clouds drift past, rain falls, snow, lightning, stars at night. Also the day's
// public holiday (Thailand) and PM2.5 (Thai bands) when known.
export default function WeatherCard({ wx, place, title, holiday, night = false, clock = false, utc = 7 }) {
  const label = weatherKind(wx.code);
  const level = rainLevel(wx);
  const air = pm25Level(wx.pm25);
  // rain days say how hard (TMD bands), storms keep their own label
  const kind = KINDS[label.icon] || 'cloud';
  const text = kind === 'rain' ? RAIN_TEXT[level] || label.label : label.label;
  return (
    <div className={`pt-wxc sky-${night ? 'night' : SKY[kind]}`}>
      <div className="pt-wxc-card">
        {!night && (kind === 'sun' || kind === 'partly') && (
          <Suspense fallback={null}><SunSky hour={clock ? Number(localHM(utc).slice(0, 2)) + Number(localHM(utc).slice(3)) / 60 : 10} hazy={kind === 'partly'} /></Suspense>
        )}
        <Suspense fallback={null}><WeatherSky kind={kind} level={level} night={night} /></Suspense>
        <div className="pt-wxc-text">
          <span className="pt-wxc-place">{place}</span>
          <b className="pt-wxc-date">{title}</b>
          {holiday && <span className="pt-wxc-sub" title={holiday}>{holiday}</span>}
          {clock && <Clock utc={utc} />}
        </div>
        <div className="pt-wxc-temp">
          <b>{wx.max}°</b>
          <span>{text}</span>
          {air && <span className={`pt-wxc-aq ${air.key}`} title={air.label}><i />PM2.5 {wx.pm25}</span>}
        </div>
      </div>
    </div>
  );
}
