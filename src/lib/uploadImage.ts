import { compressImageToBase64 } from "./compressImage";
import { isMockMode, supabase } from "./supabase";

export async function uploadStoreImage(file: File, storeId: string, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("الملف المختار ليس صورة");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
  if (isMockMode) return compressImageToBase64(file);
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${storeId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("store-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return supabase.storage.from("store-images").getPublicUrl(path).data.publicUrl;
}
