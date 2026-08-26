import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../pages/AdminGate";

export const Route = createFileRoute("/admin/")({
  component: AdminGate,
});
