/** Coordinate late camera startup, duplicate frames and unmount cancellation.
 * @param {(text: string) => void} onCode
 */
export function createScanLifecycle(onCode) {
  let cancelled = false;
  let delivered = false;
  /** @type {{stop: () => void} | undefined} */
  let controls;
  return {
    isActive: () => !cancelled,
    attach(next) {
      controls = next;
      if (cancelled || delivered) controls.stop();
    },
    accept(text) {
      if (cancelled || delivered) return;
      delivered = true;
      controls?.stop();
      onCode(text);
    },
    stop() {
      cancelled = true;
      controls?.stop();
    },
  };
}
