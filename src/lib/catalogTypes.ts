export type CatalogChoice = {
  id: string;
  name: string;
  extra_price: number;
  is_available: boolean;
};
export type CatalogOption = {
  id: string;
  title: string;
  required: boolean;
  multiple: boolean;
  min_selections: number;
  max_selections: number;
  choices: CatalogChoice[];
};
export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string;
  is_available: boolean;
  options: CatalogOption[];
};
export type CatalogCategory = { id: string; name: string };
