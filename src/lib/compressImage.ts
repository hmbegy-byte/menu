import imageCompression from "browser-image-compression";

/**
 * Compresses an image file and returns a Base64 string.
 * @param {File} file - The image file to compress.
 * @returns {Promise<string>} - The compressed image as a base64 Data URL.
 */
export async function compressImageToBase64(file: File): Promise<string> {
  const options = {
    maxSizeMB: 0.2, // 200KB
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: "image/webp", // Default to webp for better compression
  };

  try {
    const compressedFile = await imageCompression(file, options);

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("تعذر قراءة الصورة المضغوطة"));
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}
