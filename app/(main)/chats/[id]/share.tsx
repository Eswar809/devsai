"use client";

import { Share as ShareIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Message } from "@prisma/client";

export function Share({ message, className }: { message?: Message; className?: string }) {
  async function shareAction() {
    if (!message) return;

    const baseUrl = window.location.href;
    const shareUrl = new URL(`/share/v2/${message.id}`, baseUrl);

    toast({
      title: "App Published!",
      description: `App URL copied to clipboard: ${shareUrl.href}`,
      variant: "default",
    });

    await navigator.clipboard.writeText(shareUrl.href);
  }

  return (
    <form action={shareAction} className="flex">
      <button
        type="submit"
        disabled={!message}
        className={className}
      >
        <ShareIcon size={14} />
      </button>
    </form>
  );
}
