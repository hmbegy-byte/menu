import { createFileRoute } from "@tanstack/react-router";
import KitchenGate from "../pages/KitchenGate";

export const Route = createFileRoute("/kitchen/")({ component: KitchenGate });
