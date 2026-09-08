export function normalizeLoyaltyPhone(value) {
  let phone = String(value ?? '').replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[\s()-]/g, '');
  if (/^05\d{8}$/.test(phone)) phone = '+966' + phone.slice(1);
  if (/^9665\d{8}$/.test(phone)) phone = '+' + phone;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
