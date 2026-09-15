export interface KitchenOrder {
  id: string;
  status: string;
  created_at: string;
  order_number?: number;
  customer_name: string;
  customer_phone: string;
  order_type: string;
  delivery_address?: string | null;
  delivery_zone?: string | null;
  table_number?: string | null;
  notes?: string | null;
  pickup_method?: "counter" | "curbside";
  car_description?: string | null;
  curbside_arrived_at?: string | null;
  curbside_acknowledged_at?: string | null;
  total_amount: number;
  order_items?: Array<{
    id?: string;
    product_id?: string | null;
    product_name: string;
    unit_price: number;
    quantity: number;
    selected_options?: Array<{ name?: string; choice?: { label?: string; price?: number } }>;
  }>;
}
export interface KitchenStore {
  name: string;
  currency: string;
  settings?: { kitchenWarningMinutes?: number; kitchenLateMinutes?: number };
}
