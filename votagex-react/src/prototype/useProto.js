import { createContext, useContext, useMemo } from 'react';
import { planStatus } from './data';

export const ProtoCtx = createContext(null);
export const useProto = () => useContext(ProtoCtx);

// Provinces and countries "collected" from checked-in stops of past plans and places marked visited
export function useCollection() {
  const { plans, places, today } = useProto();
  return useMemo(() => {
    const prov = new Map();
    const countries = new Set(['TH']);
    plans.filter((p) => planStatus(p, today) === 'past').forEach((p) => {
      countries.add(p.country);
      p.stops.forEach((s) => { if (s.prov && Object.keys(s.checkIns || {}).length) prov.set(s.prov, [...(prov.get(s.prov) || []), p.name]); });
    });
    places.filter((p) => p.status === 'visited' && p.prov).forEach((p) => prov.set(p.prov, [...(prov.get(p.prov) || []), p.name]));
    return { provinces: [...prov.entries()].map(([name, from]) => ({ name, from: [...new Set(from)] })), countries: [...countries] };
  }, [plans, places, today]);
}
