import test from "node:test";
import assert from "node:assert/strict";
import { createScanLifecycle } from "../src/lib/scanLifecycle.mjs";
test("cancelled scan stops a camera that finishes starting later", () => {
  let stopped = 0,
    delivered = 0;
  const session = createScanLifecycle(() => delivered++);
  session.stop();
  session.attach({ stop: () => stopped++ });
  session.accept("late");
  assert.equal(stopped, 1);
  assert.equal(delivered, 0);
  assert.equal(session.isActive(), false);
});
test("duplicate frames yield one lookup and stop the scanner", () => {
  const codes = [];
  let stopped = 0;
  const session = createScanLifecycle((text) => codes.push(text));
  session.attach({ stop: () => stopped++ });
  session.accept("one");
  session.accept("two");
  assert.deepEqual(codes, ["one"]);
  assert.equal(stopped, 1);
});
test("a frame received before controls resolve still closes the camera", () => {
  let stopped = 0;
  const session = createScanLifecycle(() => {});
  session.accept("early");
  session.attach({ stop: () => stopped++ });
  assert.equal(stopped, 1);
});
