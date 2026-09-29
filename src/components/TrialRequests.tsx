type TrialRequest = {
  id: string;
  contact_name: string;
  business_name: string;
  phone: string;
  business_type: string;
  branch_count: number;
  notes?: string;
  status: string;
  created_at: string;
};

const statuses: Record<string, string> = {
  new: "جديد",
  following_up: "قيد المتابعة",
  provisioned: "تم التجهيز",
  closed: "مغلق",
};

export default function TrialRequests({
  requests,
  onStatus,
}: {
  requests: TrialRequest[];
  onStatus: (id: string, status: string) => Promise<unknown>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">طلبات التجربة</h2>
        <p className="mt-1 text-sm text-gray-500">بيانات خاصة بمالك المنصة ولا تُعرض للعامة.</p>
      </div>
      {requests.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">لا توجد طلبات تجربة حتى الآن.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4">النشاط</th>
                <th className="p-4">المسؤول</th>
                <th className="p-4">التواصل</th>
                <th className="p-4">الفروع</th>
                <th className="p-4">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t align-top">
                  <td className="p-4">
                    <strong>{request.business_name}</strong>
                    <span className="mt-1 block text-xs text-gray-500">
                      {request.business_type}
                    </span>
                    {request.notes && (
                      <p className="mt-2 max-w-xs text-xs text-gray-600">{request.notes}</p>
                    )}
                  </td>
                  <td className="p-4">
                    {request.contact_name}
                    <span className="mt-1 block text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleDateString("ar-SA")}
                    </span>
                  </td>
                  <td dir="ltr" className="p-4 text-right">
                    {request.phone}
                  </td>
                  <td className="p-4">{request.branch_count}</td>
                  <td className="p-4">
                    <select
                      aria-label={`حالة طلب ${request.business_name}`}
                      value={request.status}
                      onChange={(event) => void onStatus(request.id, event.target.value)}
                      className="rounded-lg border p-2"
                    >
                      {Object.entries(statuses).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
