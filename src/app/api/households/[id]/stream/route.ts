import type { NextRequest } from "next/server";
import { getUidFromRequest } from "@/lib/auth/session";
import { getDb } from "@/lib/mongo/client";
import { requireMembership } from "@/lib/household/membership";
import { subscribe, type HouseholdEvent } from "@/lib/realtime/broadcaster";
import { redactForViewer } from "@/lib/household/wishlistItem";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return new Response("Not signed in.", { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return new Response("Household not found.", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: HouseholdEvent) => {
        // Redact wishlist reservation state before it ever reaches this
        // connection, if this connection belongs to the item's own owner.
        const outbound =
          event.type === "wishlist-added" || event.type === "wishlist-updated"
            ? { ...event, item: redactForViewer(event.item, uid) }
            : event;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(outbound)}\n\n`));
      };
      const unsubscribe = subscribe(householdId, send);
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_MS);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
