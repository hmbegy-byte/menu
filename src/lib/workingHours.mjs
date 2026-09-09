export function isOpenAt(hours, day, minutes) {
  if (!hours?.length) return true;
  const toMinutes=value=>{if(!/^\d{2}:\d{2}$/.test(value||''))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;};
  const today=hours.find(d=>Number(d.id)===day),previous=hours.find(d=>Number(d.id)===(day+6)%7);
  const from=toMinutes(today?.from),to=toMinutes(today?.to);
  const yesterdayFrom=toMinutes(previous?.from),yesterdayTo=toMinutes(previous?.to);
  return Boolean((today?.isOpen && (from<to ? minutes>=from&&minutes<to : from>to&&minutes>=from)) || (previous?.isOpen && yesterdayFrom>yesterdayTo && minutes<yesterdayTo));
}
