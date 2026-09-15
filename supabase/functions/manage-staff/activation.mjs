// Never retry an uncertain external write automatically or return its raw error.
export async function runActivation({ savePassword, grantMembership, finishMetadata }) {
  const steps = [
    [savePassword, "تعذر تأكيد حفظ كلمة المرور الجديدة. حاول مجددًا."],
    [grantMembership, "تم حفظ كلمة المرور لكن تعذر تفعيل الصلاحية. حاول مجددًا."],
    [finishMetadata, "تعذر إنهاء التفعيل. حاول مجددًا."],
  ];
  for (const [operation, message] of steps) {
    try {
      const result = await operation();
      if (!result || result.error) return { error: message };
    } catch {
      return { error: message };
    }
  }
  return { ok: true };
}
