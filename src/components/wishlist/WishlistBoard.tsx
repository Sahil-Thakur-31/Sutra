"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { usePendingSet } from "@/hooks/usePendingSet";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TrashIcon, GiftIcon, SpinnerIcon } from "@/components/ui/icons";
import type { WishlistItemDTO } from "@/lib/types";

export function WishlistBoard({
  householdId,
  items,
  loading,
}: {
  householdId: string;
  items: WishlistItemDTO[];
  loading: boolean;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const deleting = usePendingSet();

  async function setReserved(item: WishlistItemDTO, reserved: boolean) {
    try {
      const res = await fetch(`/api/households/${householdId}/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reserved }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Couldn't update that reservation.");
      }
    } catch {
      toast.error("Couldn't update that reservation.");
    }
  }

  async function removeItem(item: WishlistItemDTO) {
    const displayTitle = item.translations?.[profile?.preferredLanguage ?? "en"] ?? item.title;
    const ok = await confirm({ title: `Remove "${displayTitle}"?`, confirmLabel: "Remove" });
    if (!ok) return;

    deleting.start(item.id);
    try {
      const res = await fetch(`/api/households/${householdId}/wishlist/${item.id}`, { method: "DELETE" });
      if (!res.ok) toast.error("Couldn't remove that item.");
    } catch {
      toast.error("Couldn't remove that item.");
    } finally {
      deleting.stop(item.id);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <GiftIcon className="size-5" />
        </div>
        <p className="text-sm text-fg-muted">No wishlist items yet.</p>
      </div>
    );
  }

  const myLang = profile?.preferredLanguage ?? "en";
  const myUid = profile?.uid;

  const groups = new Map<string, { ownerName: string; items: WishlistItemDTO[] }>();
  for (const item of items) {
    if (!groups.has(item.ownerUid)) groups.set(item.ownerUid, { ownerName: item.ownerName, items: [] });
    groups.get(item.ownerUid)!.items.push(item);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([ownerUid, group]) => (
        <div key={ownerUid}>
          <div className="mb-2 flex items-center gap-2">
            <Avatar name={group.ownerName} className="size-6 text-[10px]" />
            <h4 className="text-sm font-medium text-fg">
              {ownerUid === myUid ? "Your wishlist" : `${group.ownerName}'s wishlist`}
            </h4>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {group.items.map((item) => {
                const displayTitle = item.translations?.[myLang] ?? item.title;
                const isOwner = item.ownerUid === myUid;
                const reservedByMe = item.reservedByUid === myUid;

                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-bg-elevated px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium text-accent hover:text-accent-hover"
                        >
                          {displayTitle}
                        </a>
                      ) : (
                        <p className="truncate text-sm font-medium text-fg">{displayTitle}</p>
                      )}
                      {!isOwner && item.reservedByUid && (
                        <p className="text-xs text-sage">{reservedByMe ? "Reserved by you" : "Reserved"}</p>
                      )}
                    </div>

                    {isOwner ? (
                      <button
                        onClick={() => removeItem(item)}
                        disabled={deleting.has(item.id)}
                        aria-label="Remove item"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50"
                      >
                        {deleting.has(item.id) ? (
                          <SpinnerIcon className="size-4 animate-spin" />
                        ) : (
                          <TrashIcon className="size-4" />
                        )}
                      </button>
                    ) : item.reservedByUid ? (
                      reservedByMe && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-2.5 !py-1.5 !text-xs"
                          onClick={() => setReserved(item, false)}
                        >
                          Undo
                        </Button>
                      )
                    ) : (
                      <Button
                        type="button"
                        className="!px-2.5 !py-1.5 !text-xs"
                        onClick={() => setReserved(item, true)}
                      >
                        Reserve
                      </Button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      ))}
    </div>
  );
}
