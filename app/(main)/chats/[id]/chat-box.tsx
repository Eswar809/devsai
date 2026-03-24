"use client";

import Spinner from "@/components/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";
import { MODELS } from "@/lib/constants";

// --- Utility: Class Name Merger ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

// --- CSS for Animation ---
const customStyles = `
  @keyframes spin-border {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }

  .animate-spin-border {
    animation: spin-border 4s linear infinite;
  }

  .border-gradient {
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      transparent 60%,
      #4285F4 75%, /* Google Blue */
      #EA4335 85%, /* Google Red */
      #FBBC05 92%, /* Google Yellow */
      #34A853 98%, /* Google Green */
      transparent 100%
    );
  }
`;

export default function ChatBox({
  chat,
  onNewStreamPromise,
  isStreaming,
}: {
  chat: Chat;
  onNewStreamPromise: (v: Promise<ReadableStream>) => void;
  isStreaming: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const disabled = isPending || isStreaming;
  const didFocusOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [focusCount, setFocusCount] = useState(0);

  const modelLabel =
    MODELS.find((m) => m.value === chat.model)?.label || chat.model;

  useEffect(() => {
    if (!textareaRef.current) return;

    if (!disabled && !didFocusOnce.current) {
      textareaRef.current.focus();
      didFocusOnce.current = true;
    } else {
      didFocusOnce.current = false;
    }
  }, [disabled]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  return (
    <div className="mx-auto mb-5 flex w-full max-w-2xl shrink-0 px-4 pt-[26px]">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      {/* Outer wrapper group */}
      <div className="relative w-full group">

        {/* Subtle Outer Glow (Optional, blends nice on light themes) */}
        <div className={cn(
          "absolute -inset-[2px] rounded-[34px] overflow-hidden transition-opacity duration-500 pointer-events-none",
          isFocused ? "opacity-20" : "opacity-0"
        )}>
          <div className="absolute top-1/2 left-1/2 w-[200%] aspect-square animate-spin-border blur-xl">
            <div className="w-full h-full border-gradient"></div>
          </div>
        </div>

        {/* Main Border Container - Light gray border base */}
        <div className="relative w-full rounded-[32px] p-[2px] overflow-hidden bg-zinc-200 shadow-xl transition-all duration-300">

          {/* Spinning Gradient Border Layer */}
          <div className="absolute top-1/2 left-1/2 w-[200%] aspect-square animate-spin-border pointer-events-none">
            <div className={cn(
              "w-full h-full border-gradient transition-opacity duration-500",
              isFocused ? "opacity-100" : "opacity-0"
            )}></div>
          </div>

          {/* Form Inner Box - Keeps your original white #FDFDF9 color */}
          <form
            className="relative z-10 flex w-full flex-col gap-2 rounded-[30px] bg-[#FDFDF9] p-3"
            action={async () => {
              startTransition(async () => {
                const message = await createMessage(chat.id, prompt, "user");
                const streamPromise = fetch(
                  "/api/get-next-completion-stream-promise",
                  {
                    method: "POST",
                    body: JSON.stringify({
                      messageId: message.id,
                      model: chat.model,
                    }),
                  },
                ).then((res) => {
                  if (!res.body) {
                    throw new Error("No body on response");
                  }
                  return res.body;
                });

                onNewStreamPromise(streamPromise);
                startTransition(() => {
                  router.refresh();
                  setPrompt("");
                });
              });
            }}
          >
            <fieldset className="w-full" disabled={disabled}>
              <div className="relative flex w-full flex-1 px-2 pt-1">
                <textarea
                  ref={textareaRef}
                  placeholder="Ask a follow up..."
                  value={prompt}
                  onChange={handleInput}
                  onFocus={() => {
                    setIsFocused(true);
                    setFocusCount((c) => c + 1);
                  }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setIsFocused(false);
                    }
                  }}
                  required
                  name="prompt"
                  rows={1}
                  className="max-h-[35vh] min-h-[24px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none scrollbar-hide"
                  style={{ overflowY: prompt.length > 100 ? 'auto' : 'hidden' }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      const target = event.target;
                      if (!(target instanceof HTMLTextAreaElement)) return;
                      target.closest("form")?.requestSubmit();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2 px-1 pb-1">
                <div
                  className="max-w-[200px] items-center truncate font-mono text-xs text-gray-500"
                  title={chat.model}
                >
                  {modelLabel}
                </div>

                <button
                  type="submit"
                  disabled={prompt.trim().length === 0 || disabled}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out shadow-sm",
                    (prompt.trim().length > 0 && !disabled)
                      ? "bg-black text-white hover:bg-zinc-800 hover:scale-105 active:scale-95 cursor-pointer"
                      : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
                  )}
                >
                  {disabled ? <Spinner /> : <ArrowUpIcon className="h-5 w-5" />}
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}