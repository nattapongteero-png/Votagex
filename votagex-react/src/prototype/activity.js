import { useMemo } from 'react';
import { useProto } from './useProto';
import { ME, addDays, fmtMoney } from './data';

// What came in for me (the home bar's bell, HomeBar), newest first, over the last two weeks: a transfer back
// waiting for me to confirm (or one I sent, now confirmed), a spend a friend noted on a trip I'm on, a photo or
// note they added to one, a place they saved, and a postcard I sent myself arriving from a year ago.
// Each: { id, date, who (a person, or none for my own), icon, text, where, thumb?, action?, go }, where `go`
// is { sheet: [name, props] }, { plan: [id, tab] } or { recap: planId }.
export function useActivity() {
  const { plans, payments, expenses, places, memories, postcards, groups, today } = useProto();
  return useMemo(() => {
    const since = addDays(today, -14);
    const recent = (d) => Boolean(d) && d >= since && d <= today;
    const planOf = new Map(plans.map((p) => [p.id, p]));
    const onIt = (planId) => planOf.get(planId)?.members.includes(ME);
    const groupOf = new Map(groups.map((g) => [g.id, g]));
    const out = [];
    payments.forEach((x) => {
      if (!recent(x.date)) return;
      const where = planOf.get(x.planId)?.name;
      const go = { sheet: ['payment', { payId: x.id }] };
      if (x.to === ME && x.status === 'sent') out.push({ id: `pay:${x.id}`, date: x.date, who: x.from, icon: 'wallet', text: `โอนคืน ${fmtMoney(x.amount)}`, where, action: 'ยืนยัน', go });
      if (x.from === ME && x.status === 'received') out.push({ id: `got:${x.id}`, date: x.date, who: x.to, icon: 'check', text: `ได้รับ ${fmtMoney(x.amount)} ที่โอนคืนแล้ว`, where, go });
    });
    expenses.forEach((e) => {
      if (e.paidBy === ME || !recent(e.date) || !onIt(e.planId)) return;
      out.push({ id: `exp:${e.id}`, date: e.date, who: e.paidBy, icon: 'wallet', text: `จด${e.title} ${fmtMoney(e.amount, e.currency)}`, where: planOf.get(e.planId).name, go: { plan: [e.planId, 'money'] } });
    });
    memories.forEach((m) => {
      if (m.by === ME || !recent(m.date) || !onIt(m.planId)) return;
      out.push({ id: `mem:${m.id}`, date: m.date, who: m.by, icon: 'camera', text: m.photos?.length ? 'เพิ่มรูป' : 'เพิ่มโน้ต', where: planOf.get(m.planId).name, thumb: m.photos?.[0], go: { plan: [m.planId, 'memories'] } });
    });
    places.forEach((p) => {
      if (!p.by || p.by === ME || !recent(p.savedAt)) return;
      out.push({ id: `place:${p.id}`, date: p.savedAt, who: p.by, icon: 'bookmark', text: `เก็บ${p.name}`, where: groupOf.get(p.groupId)?.name, go: { sheet: ['place', { placeId: p.id }] } });
    });
    postcards.forEach((x) => {
      if (x.by !== ME || today < addDays(x.deliver, -3) || today > addDays(x.deliver, 14)) return;
      out.push({ id: `card:${x.id}`, date: x.deliver < today ? x.deliver : today, icon: 'mail', text: 'โปสการ์ดจากตัวเองเมื่อปีที่แล้วมาถึงแล้ว', where: planOf.get(x.planId)?.name, go: { recap: x.planId } });
    });
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [plans, payments, expenses, places, memories, postcards, groups, today]);
}
