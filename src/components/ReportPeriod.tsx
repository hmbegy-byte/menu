export default function ReportPeriod({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <label>
        من
        <input
          className="block rounded border p-2"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        إلى
        <input
          className="block rounded border p-2"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <p className="w-full text-sm">حسب تاريخ إنشاء الطلب بتوقيت السعودية، ويشمل يوم النهاية.</p>
    </div>
  );
}
