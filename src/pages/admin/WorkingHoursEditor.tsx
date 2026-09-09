const names = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
export function normalizeHours(hours) {
  return names.map((dayName,id) => ({ isOpen: true, from:'12:00', to:'23:59', ...hours?.find(day => Number(day.id)===id), id, dayName }));
}
export default function WorkingHoursEditor({ value, onChange, timezone }) {
  const update = (id, changes) => onChange(value.map(day => day.id===id ? {...day,...changes} : day));
  return <section className="space-y-4 border-t pt-5">
    <h3 className="text-xl font-bold">ساعات العمل الأسبوعية</h3>
    <p className="text-sm text-muted-foreground">التوقيت: {timezone || 'Asia/Riyadh'}. وقت الإغلاق الأقل من الفتح يعني الإغلاق في اليوم التالي.</p>
    {value.map(day => <div key={day.id} className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between"><strong>{day.dayName}</strong><label className="flex gap-2"><input type="checkbox" checked={day.isOpen} onChange={e => update(day.id,{isOpen:e.target.checked})}/>{day.isOpen?'مفتوح':'مغلق'}</label></div>
      {day.isOpen && <><div className="grid grid-cols-2 gap-3"><label>وقت الفتح<input aria-label={`وقت فتح ${day.dayName}`} required type="time" dir="ltr" className="mt-1 w-full rounded-lg border bg-background p-3" value={day.from} onChange={e=>update(day.id,{from:e.target.value})}/></label><label>وقت الإغلاق<input aria-label={`وقت إغلاق ${day.dayName}`} required type="time" dir="ltr" className="mt-1 w-full rounded-lg border bg-background p-3" value={day.to} onChange={e=>update(day.id,{to:e.target.value})}/></label></div>
      <p className="text-sm text-primary">{day.to < day.from ? 'الإغلاق في اليوم التالي' : day.to===day.from ? 'اختر وقتين مختلفين للفتح والإغلاق' : 'الفتح والإغلاق في اليوم نفسه'}</p>
      <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>onChange(value.map(other=>({...other,from:day.from,to:day.to,isOpen:day.isOpen})))}>تطبيق هذا الدوام على كل الأيام</button></>}
    </div>)}
  </section>;
}
