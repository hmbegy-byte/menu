/**
 * Reconcile only the caller's scoped queue, then fetch authoritative orders.
 * A failed queued command must not prevent fresh orders from being displayed.
 * @param {{authorize:()=>Promise<void>,read:()=>Array<{command:string;orderId:string;expected:string;status:string}>,remove:(id:string)=>void,send:(command:{command:string;orderId:string;expected:string;status:string})=>Promise<string>,snapshot:()=>Promise<void>,stale:()=>void}} io
 */
export async function reconcileKitchen(io) {
  await io.authorize();
  let failure;
  try {
    const queue = io.read();
    if (!Array.isArray(queue)) throw new Error("Invalid queue");
    for (const command of queue) {
      await io.authorize();
      if (!command.command || !command.expected || !command.status || !command.orderId) {
        throw new Error("Invalid queued command");
      }
      const result = await io.send(command);
      if (result !== "APPLIED" && result !== "STALE") throw new Error("Unknown command result");
      if (result === "STALE") io.stale();
      io.remove(command.command);
    }
  } catch (error) {
    failure = error;
  }
  await io.authorize();
  await io.snapshot();
  if (failure) throw failure;
}
