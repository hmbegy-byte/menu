import test from "node:test";
import assert from "node:assert/strict";
import { runActivation } from "../supabase/functions/manage-staff/activation.mjs";

const names = ["savePassword", "grantMembership", "finishMetadata"];
for (const mode of ["error", "throw", "missing"]) {
  for (let failure = 0; failure < names.length; failure++) {
    test(`activation stops at ${names[failure]} on ${mode}`, async () => {
      const calls = [];
      const operations = Object.fromEntries(
        names.map((name, index) => [
          name,
          async () => {
            calls.push(name);
            if (index === failure) {
              if (mode === "throw") throw new Error("private provider detail");
              if (mode === "missing") return undefined;
              return { error: { message: "private provider detail" } };
            }
            return { error: null };
          },
        ]),
      );
      const result = await runActivation(operations);
      assert.deepEqual(calls, names.slice(0, failure + 1));
      assert.equal(result.ok, undefined);
      assert.equal(typeof result.error, "string");
      assert.ok(!result.error.includes("private provider detail"));
    });
  }
}
test("activation reports success only after all three confirmed steps", async () => {
  const calls = [];
  const operations = Object.fromEntries(
    names.map((name) => [
      name,
      async () => {
        calls.push(name);
        return { error: null };
      },
    ]),
  );
  assert.deepEqual(await runActivation(operations), { ok: true });
  assert.deepEqual(calls, names);
});
