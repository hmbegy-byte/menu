export const isValidGoogleReviewUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "g.page" ||
      host === "maps.app.goo.gl" ||
      host === "maps.google.com" ||
      host === "www.google.com" ||
      /^www\.google\.[a-z.]+$/.test(host)
    );
  } catch {
    return false;
  }
};

export const expensesToCsv = (expenses) => {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = expenses.map((expense) =>
    [
      expense.expense_date,
      expense.category,
      expense.description,
      expense.amount,
      expense.reporting_scope === "organization_shared" ? "مشترك - غير موزع" : "خاص بالفرع",
    ]
      .map(escape)
      .join(","),
  );
  return `\uFEFF${["التاريخ,التصنيف,الوصف,المبلغ,النطاق", ...rows].join("\n")}`;
};
