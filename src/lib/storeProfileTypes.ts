import type { WorkingDay } from "./workingHoursEditorModel";
export type StoreSocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  map?: string;
};
export type StoreLegalDetails = {
  country?: string;
  legalName?: string;
  commercialRegistration?: string;
  vatNumber?: string;
  nationalAddress?: string;
  supportEmail?: string;
  complaintPhone?: string;
  privacyEmail?: string;
};
export type StoreProfile = {
  id: string;
  slug: string;
  name: string;
  phone_whatsapp?: string;
  timezone?: string;
  bio?: string;
  logo_url?: string;
  cover_url?: string;
  social_links?: StoreSocialLinks;
  legal?: StoreLegalDetails;
  working_hours?: WorkingDay[];
};
