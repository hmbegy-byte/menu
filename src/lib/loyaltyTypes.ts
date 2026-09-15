export type LoyaltyWindow = { valid_from?: string | null; valid_until?: string | null };
export type LoyaltyProgram = {
  id: string;
  is_active: boolean;
  points_name: string;
  stamps_name: string;
  min_order_amount: number;
  program_type: string;
  allow_staff_adjustments: boolean;
};
export type LoyaltyCustomer = {
  id: string;
  name: string;
  membership_number: string;
  points_balance: number;
  stamps_balance: number;
  contact_phone?: string;
  phone?: string;
  qr_token?: string;
};
export type LoyaltyReward = LoyaltyWindow & {
  id: string;
  points_cost: number;
  stamps_cost: number;
  conditions?: { title?: string };
};
export type LoyaltyRule = LoyaltyWindow & {
  id: string;
  currency_type: string;
  rule_type: string;
  reward_value: number;
  min_amount: number;
  conditions?: { title?: string };
};
