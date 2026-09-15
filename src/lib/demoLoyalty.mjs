export function createDemoLoyaltyCustomer(name, phone) {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    phone,
    membership_number: crypto.randomUUID().slice(0, 8).toUpperCase(),
    points_balance: 0,
    stamps_balance: 0,
    qr_token: crypto.randomUUID().replaceAll("-", ""),
  };
}

export function adjustDemoLoyaltyBalance(customer, signedAmount, currency) {
  const balanceKey = currency === "points" ? "points_balance" : "stamps_balance";
  return {
    ...customer,
    [balanceKey]: Math.max(0, Number(customer[balanceKey]) + signedAmount),
  };
}

export function redeemDemoLoyaltyReward(customer, reward) {
  const updated = {
    ...customer,
    points_balance: customer.points_balance - (reward.points_cost || 0),
    stamps_balance: customer.stamps_balance - (reward.stamps_cost || 0),
  };
  if (updated.points_balance < 0 || updated.stamps_balance < 0) {
    throw new Error("الرصيد غير كافٍ لهذه المكافأة.");
  }
  return updated;
}
