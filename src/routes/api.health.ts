import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { isMockMode, supabase } from "../lib/supabase";
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        if (isMockMode) return Response.json({ status: "demo" }, { status: 503 });
        try {
          const { error } = await supabase
            .from("plans")
            .select("id")
            .limit(1)
            .abortSignal(AbortSignal.timeout(4000));
          return Response.json(
            { status: error ? "degraded" : "ok", database: !error },
            { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch {
          return Response.json({ status: "degraded" }, { status: 503 });
        }
      },
    },
  },
});
