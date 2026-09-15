import test from "node:test";
import assert from "node:assert/strict";
import { reconcileKitchen } from "../src/lib/kitchenRecovery.mjs";
function fixture() {
  let queue = [{ command: "id", orderId: "order", expected: "pending", status: "preparing" }];
  let displayed = [];
  let snapshots = 0;
  let sends = 0;
  let notices = 0;
  const io = {
    authorize: async () => {},
    read: () => queue,
    remove: (id) => {
      queue = queue.filter((c) => c.command !== id);
    },
    send: async () => {
      sends++;
      return "APPLIED";
    },
    snapshot: async () => {
      snapshots++;
      displayed = ["old", "arrived-during-gap"];
    },
    stale: () => {
      notices++;
    },
  };
  return { io, state: () => ({ queue, displayed, snapshots, sends, notices }) };
}
test("reconnection fetches gap orders; repeated recovery neither duplicates cards nor commands", async () => {
  const f = fixture();
  await reconcileKitchen(f.io);
  await reconcileKitchen(f.io);
  assert.equal(f.state().sends, 1);
  assert.equal(f.state().snapshots, 2);
  assert.deepEqual(f.state().displayed, ["old", "arrived-during-gap"]);
});
test("stale queued action is discarded and current server snapshot wins", async () => {
  const f = fixture();
  f.io.send = async () => "STALE";
  await reconcileKitchen(f.io);
  assert.equal(f.state().queue.length, 0);
  assert.equal(f.state().notices, 1);
  assert.equal(f.state().snapshots, 1);
});
test("failed replay retains queue but still fetches incoming orders and rejects healthy state", async () => {
  const f = fixture();
  f.io.send = async () => {
    throw new Error("offline");
  };
  await assert.rejects(reconcileKitchen(f.io), /offline/);
  assert.equal(f.state().queue.length, 1);
  assert.equal(f.state().snapshots, 1);
});
test("failed snapshot prevents successful recovery", async () => {
  const f = fixture();
  f.io.snapshot = async () => {
    throw new Error("fetch failed");
  };
  await assert.rejects(reconcileKitchen(f.io), /fetch failed/);
});
test("changed account cannot flush queue or fetch protected orders", async () => {
  const f = fixture();
  f.io.authorize = async () => {
    throw new Error("account changed");
  };
  await assert.rejects(reconcileKitchen(f.io), /account changed/);
  assert.equal(f.state().sends, 0);
  assert.equal(f.state().snapshots, 0);
  assert.equal(f.state().queue.length, 1);
});
