"use client";

import * as React from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";

export function ContactReveal({ requestId }: { requestId: string }) {
  const [contact, setContact] = React.useState<{
    name: string;
    phone: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  if (contact) {
    return (
      <div className="flex items-center gap-1.5 rounded-[var(--r-sm)] bg-primary-weak px-3 py-2 text-sm font-semibold text-primary">
        <Phone className="size-3.5" />
        {contact.phone ? (
          <span>
            {contact.phone} · {contact.name}
          </span>
        ) : (
          <span>{contact.name} chưa cập nhật SĐT</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch(`/api/requests/${requestId}/contact`);
        setLoading(false);
        if (!res.ok) {
          toast.error("Không lấy được liên hệ");
          return;
        }
        setContact(await res.json());
      }}
      className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-primary px-3 py-2 text-sm font-semibold text-primary"
    >
      <Phone className="size-3.5" />
      {loading ? "Đang tải…" : "Xem liên hệ"}
    </button>
  );
}
