/* eslint-disable @next/next/no-img-element */
"use client";

import Spinner from "@/components/spinner";
import * as Select from "@radix-ui/react-select";
import assert from "assert";
import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  use,
  useState,
  useRef,
  useTransition,
  useEffect,
  useMemo,
} from "react";

import { Context } from "./providers";
import { useS3Upload } from "next-s3-upload";
import { MODELS, SUGGESTED_PROMPTS } from "@/lib/constants";

// --- Utility: Class Name Merger ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// --- Icons ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
);
const AudioWaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v4" /></svg>
);
const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
);
const GlobeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
);

// --- Design Components ---


const StatusBadge = () => {
  const [index, setIndex] = useState(0);
  const statuses = [
    { symbol: "◈", message: "Debugging..." },
    { symbol: "◓", message: "Analyzing..." },
    { symbol: "✽", message: "Doodling..." },
    { symbol: "◐", message: "Thinking..." },
    { symbol: "◑", message: "Processing..." },
    { symbol: "◒", message: "Computing..." },
    { symbol: "●", message: "Synthesizing..." },
    { symbol: "◯", message: "Optimizing..." },
    { symbol: "◇", message: "Refactoring..." },
    { symbol: "◆", message: "Compiling..." },
    { symbol: "▲", message: "Iterating..." },
    { symbol: "▼", message: "Innovating..." }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % statuses.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const current = statuses[index];

  return (
    <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-stone-200/60 bg-white/70 px-5 py-2.5 shadow-sm backdrop-blur-md transition-all duration-300">
      <span className="animate-pulse font-mono text-lg leading-none text-orange-600">{current.symbol}</span>
      <span className="min-w-[120px] font-mono text-sm font-medium uppercase tracking-wider text-stone-600 opacity-80">
        {current.message}
      </span>
    </div>
  );
};

const TypewriterHeading = () => {
  const words = [ "developers", "coders", "hackers", "tinkerers", "builders", "engineers", "programmers", "makers", "creators", "debuggers", "inventors", "shippers" ];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    const handleTyping = () => {
      const fullWord = words[currentWordIndex];
      if (isDeleting) {
        setCurrentText(fullWord.substring(0, currentText.length - 1));
        setTypingSpeed(50);
      } else {
        setCurrentText(fullWord.substring(0, currentText.length + 1));
        setTypingSpeed(150);
      }
      if (!isDeleting && currentText === fullWord) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentText === "") {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      }
    };
    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, typingSpeed, words]);

  return (
    <h1 className="mb-8 flex flex-wrap items-center justify-center gap-2 text-4xl font-bold leading-tight tracking-tight text-stone-900 drop-shadow-sm md:gap-4 md:text-6xl lg:text-7xl font-serif">
      <span>Built for</span>
      <div className="flex h-8 w-8 items-center justify-center text-orange-600 md:h-12 md:w-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 64 64" fill="none">
          <path d="M19.2617 9.77173C19.9088 9.07558 20.9191 8.91467 21.7314 9.31665L21.8906 9.40356L21.9355 9.43481L22.1914 9.6311C22.2037 9.64058 22.2161 9.6508 22.2275 9.66138L44.627 30.4622C45.0537 30.8586 45.2997 31.4154 45.2998 32.0002C45.2998 32.4378 45.1632 32.862 44.9141 33.2141C44.9036 33.2289 44.8919 33.2435 44.8799 33.2571L44.6611 33.5032C44.6504 33.5153 44.6388 33.5273 44.627 33.5383L22.2275 54.3381C21.3775 55.127 20.0506 55.0769 19.2617 54.2278H19.2607C18.4721 53.3777 18.5226 52.0508 19.3721 51.262L40.1182 32.0002L19.3721 12.7385C19.3602 12.7275 19.3487 12.7155 19.3379 12.7034L19.1221 12.4592C19.1105 12.4462 19.0999 12.4324 19.0898 12.4182C18.5226 11.6235 18.5712 10.5162 19.2607 9.77271L19.2617 9.77173Z" fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      </div>
      <span className="relative whitespace-nowrap">
        <span className="animate-gradient bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 bg-[length:200%_auto] bg-clip-text text-transparent">
          {currentText}
        </span>
        <span className="animate-blink absolute -right-1 bottom-1 top-1 w-0.5 bg-orange-600 md:-right-2 md:w-1"></span>
      </span>
    </h1>
  );
};

export default function Home() {
  const { setStreamPromise } = use(Context);
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    MODELS.find((m) => !m.hidden)?.value || MODELS[0].value,
  );
  const [quality, setQuality] = useState("high");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    undefined,
  );
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const { uploadToS3 } = useS3Upload();
  const selectedModel = useMemo(() => MODELS.find((m) => m.value === model), [model]);

  const qualityOptions = useMemo(
    () => [
      { value: "low", label: "Fast" },
      { value: "high", label: "High Quality" },
    ],
    [],
  );

  const handleScreenshotUpload = async (event: any) => {
    if (prompt.length === 0) setPrompt("Build this");
    setQuality("low");
    setScreenshotLoading(true);
    let file = event.target.files[0];
    const { url } = await uploadToS3(file);
    setScreenshotUrl(url);
    setScreenshotLoading(false);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#FAFAF9] text-[#1D1D1D] font-sans selection:bg-orange-100 selection:text-orange-900">

      <div className="z-10 flex w-full max-w-5xl flex-col items-center px-4">
        
        {/* New Header Elements */}
        <StatusBadge />
        <TypewriterHeading />

        {/* Chat / Install Block */}
        <form
            className="relative w-full max-w-2xl mt-8"
            action={async () => {
              startTransition(async () => {
                // We use state values directly to avoid "undefined" errors from FormData
                const response = await fetch("/api/create-chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt, model, quality, screenshotUrl }),
                });

                if (!response.ok) throw new Error("Failed to create chat");
                const { chatId, lastMessageId } = await response.json();

                const streamPromise = fetch(
                  "/api/get-next-completion-stream-promise",
                  {
                    method: "POST",
                    body: JSON.stringify({ messageId: lastMessageId, model }),
                  },
                ).then((res) => {
                  if (!res.body) throw new Error("No body on response");
                  return res.body;
                });

                startTransition(() => {
                  setStreamPromise(streamPromise);
                  router.push(`/chats/${chatId}`);
                });
              });
            }}
          >
            <div
              className={cn(
                "group relative flex w-full flex-col gap-2 rounded-[32px] border bg-white p-3 shadow-xl transition-all duration-300 ease-out",
                isFocused
                  ? "border-black/10 ring-1 ring-black/5"
                  : "border-black/5 hover:border-black/10",
              )}
            >
              {/* Screenshot Preview */}
              {(screenshotLoading || screenshotUrl) && (
                <div className="relative px-2 pt-2">
                  {screenshotLoading ? (
                    <div className="flex h-16 w-[68px] animate-pulse items-center justify-center rounded bg-gray-200">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <img
                        alt="screenshot"
                        src={screenshotUrl}
                        className="h-16 w-[68px] rounded object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        className="absolute -right-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full bg-gray-500 text-white hover:bg-gray-700"
                        onClick={() => {
                          setScreenshotUrl(undefined);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Text Input Area */}
              <div className="relative flex w-full flex-1 px-2 pt-1">
                <textarea
                  ref={textareaRef}
                  name="prompt"
                  value={prompt}
                  onChange={handleInput}
                  onFocus={() => setIsFocused(true)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      const target = event.target as HTMLTextAreaElement;
                      target.closest("form")?.requestSubmit();
                    }
                  }}
                  placeholder="Ask to create a web app..."
                  rows={1}
                  className="max-h-[35vh] min-h-[24px] w-full resize-none bg-transparent text-[16px] leading-relaxed text-stone-900 placeholder:text-stone-400 focus:outline-none scrollbar-hide"
                  style={{ overflowY: prompt.length > 100 ? "auto" : "hidden" }}
                />
              </div>

              {/* Bottom Action Row */}
              <div className="flex items-center justify-between px-1 pb-1 pt-2">
                <div className="flex items-center">
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group/btn flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-all duration-200 hover:bg-stone-100 hover:text-stone-900 active:scale-95"
                    aria-label="Add attachment"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Model Pill */}
                  <Select.Root name="model" value={model} onValueChange={setModel}>
                    <Select.Trigger className="hidden h-8 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:flex">
                      <Select.Value aria-label={model}><span className="max-w-[100px] truncate">{selectedModel?.label}</span></Select.Value>
                      <ChevronDownIcon className="size-3 opacity-50" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="z-50 overflow-hidden rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5">
                        <Select.Viewport>
                          {MODELS.filter((m) => !m.hidden).map((m) => (
                            <Select.Item key={m.value} value={m.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-gray-100 data-[state=checked]:bg-stone-50 data-[state=checked]:text-stone-900">
                              <Select.ItemText>{m.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>

                  {/* Quality Pill */}
                  <Select.Root name="quality" value={quality} onValueChange={setQuality}>
                    <Select.Trigger className="hidden h-8 items-center gap-2 rounded-full px-3 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:flex">
                      <Select.Value aria-label={quality}>{quality === "low" ? "Fast" : "High Quality"}</Select.Value>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="z-50 overflow-hidden rounded-lg bg-white p-1 shadow-lg ring-1 ring-black/5">
                        <Select.Viewport>
                          {qualityOptions.map((q) => (
                            <Select.Item key={q.value} value={q.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-gray-100 data-[state=checked]:bg-stone-50 data-[state=checked]:text-stone-900">
                              <Select.ItemText>{q.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>

                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900">
                    <AudioWaveIcon className="h-5 w-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={prompt.trim().length === 0 || isPending || screenshotLoading}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ease-out shadow-sm",
                      prompt.trim().length > 0 && !isPending && !screenshotLoading
                        ? "cursor-pointer bg-black text-white hover:scale-105 hover:bg-stone-800 active:scale-95"
                        : "cursor-not-allowed bg-stone-100 text-stone-300",
                    )}
                  >
                    {isPending ? <Spinner /> : <ArrowUpIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="absolute -inset-0.5 -z-10 rounded-[34px] bg-gradient-to-r from-orange-500/20 to-red-500/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            </div>

            {/* Helper Pills */}
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-stone-600">
              {SUGGESTED_PROMPTS.slice(0, 3).map((v) => (
                <button
                  key={v.title}
                  type="button"
                  onClick={() => {
                    setPrompt(v.description);
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-stone-900"
                >
                  {v.title.includes("Landing") && <GlobeIcon className="h-3.5 w-3.5" />}
                  {v.title.includes("App") && <PlusIcon className="h-3.5 w-3.5" />}
                  <span>{v.title}</span>
                </button>
              ))}
            </div>
          </form>

          {isPending && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Spinner />
                <p className="text-sm text-stone-500">
                  {quality === "high" ? "Planning project..." : "Creating app..."}
                </p>
              </div>
            </div>
          )}
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-blink { animation: blink 1s step-end infinite; }
        .animate-gradient { animation: gradient 3s ease infinite; }
      `}</style>
    </div>
  );
}

export const runtime = "edge";
export const maxDuration = 60;