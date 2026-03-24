// ✅ FILE: app/(main)/chats/[id]/code-viewer.tsx
"use client";

import {
  X, Code as CodeIcon, Eye, Copy, Maximize, Minimize,
  ArrowDownToLine,   RefreshCw, ChevronDown, CheckCheck,
  FileCode2, Layers, Globe,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  extractAllCodeBlocks, generateIntelligentFilename,
  getExtensionForLanguage, toTitleCase,
} from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import type { Chat, Message } from "./page";
import { Share } from "./share";
import { StickToBottom } from "use-stick-to-bottom";
import JSZip from "jszip";
import dynamic from "next/dynamic";

const CodeRunner = dynamic(() => import("@/components/code-runner"), { ssr: false });
const SyntaxHighlighter = dynamic(() => import("@/components/syntax-highlighter"), { ssr: false });

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const Tooltip = ({ children, text, position = "bottom" }: {
  children: React.ReactNode; text: React.ReactNode; position?: "bottom" | "left" | "top";
}) => (
  <div className="group relative flex">
    {children}
    <div className={`pointer-events-none absolute z-[200] whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium opacity-0 shadow-lg transition-all duration-150 scale-95 group-hover:scale-100 group-hover:opacity-100 border border-zinc-200 bg-white text-zinc-700
      ${position === "bottom" ? "left-1/2 top-full mt-2 -translate-x-1/2"
        : position === "top" ? "left-1/2 bottom-full mb-2 -translate-x-1/2"
        : "right-full top-1/2 mr-2.5 -translate-y-1/2"}`}>
      {text}
    </div>
  </div>
);

const iconBtn = (active = false, disabled = false, extra = "") =>
  ["relative flex size-8 items-center justify-center rounded-lg text-sm transition-all duration-150 outline-none",
    active ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700",
    disabled ? "pointer-events-none opacity-30" : "cursor-pointer", extra].join(" ");

const Divider = ({ className = "" }: { className?: string }) => (
  <div className={`mx-0.5 h-4 w-px shrink-0 bg-zinc-200 ${className}`} />
);

// ─── File Badge ───────────────────────────────────────────────────────────────
const FILE_BADGE: Record<string, { bg: string; text: string; label: string; dot: string; color: string }> = {
  tsx: { bg: "bg-sky-500/10",    text: "text-sky-500",    label: "TX", dot: "bg-sky-400",    color: "#0ea5e9" },
  ts:  { bg: "bg-blue-500/10",   text: "text-blue-500",   label: "TS", dot: "bg-blue-400",   color: "#3b82f6" },
  jsx: { bg: "bg-sky-500/10",    text: "text-sky-500",    label: "JX", dot: "bg-sky-400",    color: "#0ea5e9" },
  js:  { bg: "bg-yellow-500/10", text: "text-yellow-600", label: "JS", dot: "bg-yellow-400", color: "#eab308" },
  css: { bg: "bg-pink-500/10",   text: "text-pink-500",   label: "CS", dot: "bg-pink-400",   color: "#ec4899" },
  json:{ bg: "bg-orange-500/10", text: "text-orange-500", label: "JN", dot: "bg-orange-400", color: "#f97316" },
  md:  { bg: "bg-zinc-500/10",   text: "text-zinc-500",   label: "MD", dot: "bg-zinc-400",   color: "#71717a" },
};
const DEFAULT_BADGE = { bg: "bg-zinc-100", text: "text-zinc-500", label: "F", dot: "bg-zinc-400", color: "#71717a" };

function getBadge(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return FILE_BADGE[ext] ?? DEFAULT_BADGE;
}

// ─── File Tree ────────────────────────────────────────────────────────────────
interface FileNode   { type: "file";   name: string; path: string; language?: string }
interface FolderNode { type: "folder"; name: string; children: TreeNode[] }
type TreeNode = FileNode | FolderNode;

function buildTree(files: { path: string; language?: string }[]): TreeNode[] {
  const root: FolderNode = { type: "folder", name: "__root__", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      let folder = cur.children.find((n): n is FolderNode => n.type === "folder" && n.name === seg);
      if (!folder) { folder = { type: "folder", name: seg, children: [] }; cur.children.push(folder); }
      cur = folder;
    }
    cur.children.push({ type: "file", name: parts[parts.length - 1], path: file.path, language: file.language });
  }
  return root.children;
}

function FtNode({ node, depth, activePath, openPaths, onSelect, openMap, toggle }: {
  node: TreeNode; depth: number; activePath?: string; openPaths: string[];
  onSelect?: (p: string) => void; openMap: Record<string, boolean>; toggle: (k: string) => void;
}) {
  const pl = 10 + depth * 14;
  if (node.type === "folder") {
    const key = `${depth}:${node.name}`;
    const open = openMap[key] !== false;
    return (
      <div>
        <button onClick={() => toggle(key)} style={{ paddingLeft: pl }}
          className="flex w-full items-center gap-1.5 rounded-md py-[4px] pr-2 text-left hover:bg-zinc-100/80 text-zinc-500 transition-colors">
          <ChevronDown size={10} className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-amber-400">
            <path d="M1.5 4.5A1 1 0 012.5 3.5H6L7 5H13.5A1 1 0 0114.5 6V12A1 1 0 0113.5 13H2.5A1 1 0 011.5 12V4.5Z"
              fill="currentColor" fillOpacity={open ? 0.3 : 0.12} stroke="currentColor" strokeWidth="0.75"/>
          </svg>
          <span className="truncate text-[11.5px] font-medium">{node.name}</span>
        </button>
        {open && (
          <div className="border-l border-zinc-100 ml-[17px]">
            {node.children.map((child, i) => (
              <FtNode key={i} node={child} depth={depth + 1} activePath={activePath}
                openPaths={openPaths} onSelect={onSelect} openMap={openMap} toggle={toggle} />
            ))}
          </div>
        )}
      </div>
    );
  }
  const isActive = activePath === node.path;
  const isOpen = openPaths.includes(node.path);
  const b = getBadge(node.name);
  return (
    <button onClick={() => onSelect?.(node.path)} style={{ paddingLeft: pl }}
      className={`group relative flex w-full items-center gap-2 rounded-md py-[4px] pr-2 text-left transition-all duration-100
        ${isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-700"}`}>
      {isActive && <span className="absolute left-0 top-1/2 h-3/4 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-500" />}
      <span className={`inline-flex shrink-0 items-center justify-center rounded text-[8px] font-bold leading-none ${b.bg} ${b.text}`}
        style={{ width: 17, height: 17 }}>{b.label}</span>
      <span className="truncate text-[11.5px] font-medium">{node.name}</span>
      {isOpen && !isActive && <span className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${b.dot} opacity-50`} />}
      {isActive && <span className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${b.dot}`} />}
    </button>
  );
}

function FileTree({ files, activePath, openPaths, onSelect }: {
  files: { path: string; language?: string }[];
  activePath?: string; openPaths: string[];
  onSelect?: (p: string) => void;
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpenMap(p => ({ ...p, [k]: p[k] === false }));
  const tree = buildTree(files);
  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50/60">
      <div className="flex shrink-0 items-center justify-between px-3 py-2 border-b border-zinc-200/60">
        <div className="flex items-center gap-1.5">
          <Layers size={11} className="text-zinc-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Explorer</span>
        </div>
        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-zinc-100 text-zinc-400">{files.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-px">
        {tree.map((node, i) => (
          <FtNode key={i} node={node} depth={0} activePath={activePath}
            openPaths={openPaths} onSelect={onSelect} openMap={openMap} toggle={toggle} />
        ))}
      </div>
    </div>
  );
}

// ─── File Tabs ────────────────────────────────────────────────────────────────
function FileTabs({ openPaths, activePath, onSelect, onClose, streamingPath }: {
  openPaths: string[]; activePath?: string;
  onSelect: (p: string) => void; onClose: (p: string) => void;
  streamingPath?: string;
}) {
  if (openPaths.length === 0) return null;
  return (
    <div className="flex items-center overflow-x-auto border-b border-zinc-200/80 bg-zinc-100/80 px-1 no-scrollbar">
      {openPaths.map(path => {
        const name = path.split("/").pop() ?? path;
        const b = getBadge(name);
        const isActive = activePath === path;
        const isStreaming = streamingPath === path;
        return (
          <div key={path} onClick={() => onSelect(path)}
            className={`group relative flex shrink-0 items-center gap-1.5 pl-3 pr-1.5 py-[6px] text-[11.5px] font-medium transition-all select-none cursor-pointer mx-1 mt-1.5
              ${isActive
                ? "bg-white text-zinc-800 rounded-t-lg shadow-sm ring-1 ring-zinc-200/80 ring-b-0"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-white/50 rounded-t-lg"}`}>
            {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm" style={{ background: b.color }} />}
            <span className={`${b.text} text-[9px] font-bold shrink-0`}>{b.label}</span>
            <span className="max-w-[100px] truncate">{name}</span>
            {isStreaming && (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
              </span>
            )}
            <button onClick={e => { e.stopPropagation(); onClose(path); }}
              className={`ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all
                ${isActive ? "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  : "text-transparent group-hover:text-zinc-400 hover:!bg-zinc-200 hover:!text-zinc-600"}`}>
              <X size={10} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────
function StatusBar({ file, isStreaming, lineCount }: {
  file?: { path: string; language: string; code: string };
  isStreaming: boolean; lineCount: number;
}) {
  const name = file?.path.split("/").pop() ?? "";
  const b = getBadge(name);
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-zinc-200/60 bg-zinc-50/80 px-3 py-[3px] text-[10px] text-zinc-400 font-mono">
      <div className="flex items-center gap-3">
        {file && (
          <span className={`flex items-center gap-1 font-semibold ${b.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
            {file.language.toUpperCase()}
          </span>
        )}
        {lineCount > 0 && <span>{lineCount} lines</span>}
      </div>
      <div className="flex items-center gap-3">
        {isStreaming ? (
          <span className="flex items-center gap-1 text-blue-500 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            Generating
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-500 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ready
          </span>
        )}
        <span>UTF-8</span>
      </div>
    </div>
  );
}

// ─── Browser Chrome (Preview wrapper) ────────────────────────────────────────
function BrowserChrome({ children, onRefresh, disabled }: {
  children: React.ReactNode; onRefresh: () => void; disabled: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Browser toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-2">
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 mr-1">
          <span className="h-3 w-3 rounded-full bg-red-400/70 hover:bg-red-400 transition-colors cursor-default" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70 hover:bg-yellow-400 transition-colors cursor-default" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/70 hover:bg-emerald-400 transition-colors cursor-default" />
        </div>
        {/* Address bar */}
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-400">
          <Globe size={11} className="shrink-0 text-zinc-300" />
          <span className="truncate font-mono">localhost:3000</span>
        </div>
        {/* Refresh */}
        <button onClick={onRefresh} disabled={disabled}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-all disabled:opacity-30">
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-300">
        <FileCode2 size={32} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-zinc-500">No code yet</p>
        <p className="mt-1 text-[11.5px] text-zinc-400">Ask the AI to generate something and it'll appear here.</p>
      </div>
    </div>
  );
}

// ─── Streaming Overlay ────────────────────────────────────────────────────────
function StreamingOverlay({ filename }: { filename?: string }) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20">
      <div className="h-20 bg-gradient-to-t from-white via-white/80 to-transparent" />
      <div className="flex justify-center pb-4 bg-white">
        <div className="flex items-center gap-2.5 rounded-full border border-zinc-200/80 bg-white px-4 py-1.5 text-[11.5px] font-medium text-zinc-600 shadow-md shadow-zinc-200/60">
          <div className="flex gap-[3px]">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span>Writing <span className="font-semibold text-zinc-800">{filename ?? "code"}</span></span>
        </div>
      </div>
    </div>
  );
}



// ─── Main CodeViewer ──────────────────────────────────────────────────────────
export default function CodeViewer({
  chat, streamText, message, onMessageChange, activeTab, onTabChange,
  onClose, onRequestFix, onRestore,
}: {
  chat: Chat; streamText: string; message?: Message;
  onMessageChange: (v: Message) => void;
  activeTab: string; onTabChange: (v: "code" | "preview") => void;
  onClose: () => void; onRequestFix: (e: string) => void;
  onRestore: (msg: Message | undefined, old: number, next: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [activeFilePath, setActiveFilePath] = useState<string | undefined>();
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(console.error);
    else document.exitFullscreen().catch(console.error);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── File helpers ──────────────────────────────────────────────────────────
  const streamAllFiles = extractAllCodeBlocks(streamText);

  function extractLatestStreamBlock(input: string) {
    if (!input) return undefined;
    const lines = input.split("\n");
    const re = /^```([^\n]*)$/;
    let openTag: string | null = null, buf: string[] = [];
    let latest: { code: string; language: string; path: string } | undefined;
    for (const line of lines) {
      const m = line.match(re);
      if (m && !openTag) { openTag = m[1] || ""; buf = []; }
      else if (m && openTag) { latest = { code: buf.join("\n"), ...parseTag(openTag) }; openTag = null; buf = []; }
      else if (openTag) buf.push(line);
    }
    if (openTag) return { code: buf.join("\n"), ...parseTag(openTag) };
    return latest;
  }

  function parseTag(tag: string) {
    const raw = tag || "";
    const language = raw.match(/^([A-Za-z0-9]+)/)?.[1] ?? "text";
    const path =
      raw.match(/(?:\{\s*)?path\s*=\s*([^}\s]+)/)?.[1] ??
      raw.match(/(?:\{\s*)?filename\s*=\s*([^}\s]+)/)?.[1] ??
      `file.${getExtensionForLanguage(language)}`;
    return { language, path };
  }

  function mergeFiles<T extends { path: string }>(base: T[], overlay: T[]) {
    const map = new Map(base.map(f => [f.path, f]));
    overlay.forEach(f => map.set(f.path, f));
    return Array.from(map.values());
  }

  const latestStreamBlock = extractLatestStreamBlock(streamText);
  let mergedStreamFiles = [...streamAllFiles];
  if (latestStreamBlock) {
    const idx = mergedStreamFiles.findIndex(f => f.path === latestStreamBlock.path);
    const entry = { ...latestStreamBlock, fullMatch: "" };
    if (idx !== -1) mergedStreamFiles[idx] = entry; else mergedStreamFiles.push(entry);
  }

  const getFilesFromMessage = (msg: Message) => (msg.files as any[]) || extractAllCodeBlocks(msg.content);
  const assistantMessages = chat.messages.filter(m => m.role === "assistant" && getFilesFromMessage(m).length > 0);

  const files = streamText
    ? (() => {
        const base = assistantMessages.at(-1) ? getFilesFromMessage(assistantMessages.at(-1)!) : [];
        return mergeFiles(base, mergedStreamFiles);
      })()
    : message ? getFilesFromMessage(message) : [];

  // Auto-open default file as first tab
  const defaultMainFile = latestStreamBlock && streamText
    ? files.find(f => f.path === latestStreamBlock.path) || files.at(-1)
    : files.find(f => f.path === "App.tsx") || files.find(f => f.path.endsWith(".tsx")) || files[0];

  useEffect(() => {
    setActiveFilePath(undefined);
    setOpenPaths([]);
  }, [message?.id]);

  useEffect(() => {
    if (!defaultMainFile) return;
    setOpenPaths(prev => prev.includes(defaultMainFile.path) ? prev : [defaultMainFile.path, ...prev]);
    setActiveFilePath(prev => prev ?? defaultMainFile.path);
  }, [defaultMainFile?.path]);

  const handleOpenFile = (path: string) => {
    setActiveFilePath(path);
    setOpenPaths(prev => prev.includes(path) ? prev : [...prev, path]);
  };

  const handleCloseTab = (path: string) => {
    setOpenPaths(prev => {
      const next = prev.filter(p => p !== path);
      if (activeFilePath === path) setActiveFilePath(next.at(-1));
      return next;
    });
  };

  const mainFile = files.find(f => f.path === (activeFilePath ?? defaultMainFile?.path)) ?? defaultMainFile;
  const code = mainFile?.code ?? "";
  const language = mainFile?.language ?? "";
  const lineCount = code ? code.split("\n").length : 0;

  const generateAppTitle = (fl: typeof files) => {
    if (fl.length === 1) return generateIntelligentFilename(fl[0].code, fl[0].language).name;
    const app = fl.find(f => f.path === "App.tsx" || f.path.endsWith("App.tsx"));
    if (app) {
      const m = app.code.match(/function\s+(\w+App|\w+Component|\w+)/);
      if (m) return toTitleCase(m[1].replace(/(App|Component)$/, ""));
    }
    const name = fl[0]?.path.split("/").pop()?.replace(/\.\w+$/, "") || "App";
    return toTitleCase(name.replace(/(App|Component)$/, ""));
  };
  const appTitle = generateAppTitle(files);

  const allAssistantMessages = assistantMessages.some(m => m.id === message?.id)
    ? assistantMessages
    : message && getFilesFromMessage(message).length > 0
      ? [...assistantMessages, message] : assistantMessages;
  const reversed = allAssistantMessages.slice().reverse();
  const currentVersionIndex = streamAllFiles.length > 0
    ? allAssistantMessages.length
    : message && allAssistantMessages.some(m => m.id === message.id)
      ? allAssistantMessages.map(m => m.id).indexOf(message.id)
      : allAssistantMessages.length - 1;
  const currentVersion = (chat.assistantMessagesCountBefore || 0) + currentVersionIndex;

  const disabled = !!streamText || files.length === 0;
  const selectValue = disabled ? undefined : (allAssistantMessages.length - 1 - currentVersionIndex).toString();
  const activeStreamingPath = streamText ? (latestStreamBlock?.path || files.at(-1)?.path) : undefined;

  const handleDownload = async () => {
    if (!files.length) return;
    const zip = new JSZip();
    files.forEach(f => zip.file(f.path, f.code));
    const blob = await zip.generateAsync({ type: "blob" });
    const name = `${appTitle.replace(/[^a-zA-Z0-9]/g, "-")}-llamacoder.zip`;
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: `${files.length} files → ${name}` });
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .cv-root ::-webkit-scrollbar{width:5px;height:5px}
        .cv-root ::-webkit-scrollbar-track{background:transparent}
        .cv-root ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:99px}
        .cv-root ::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.18)}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      <div ref={containerRef}
        className="cv-root flex h-full w-full flex-col overflow-hidden bg-zinc-100 font-sans text-zinc-900">

        {/* ── HEADER ── */}
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-2 sm:px-3 py-2 border-b border-zinc-200/80 bg-white shadow-sm shadow-zinc-100/60">

          {/* Left */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex shrink-0 items-center gap-0.5 rounded-xl p-1 bg-zinc-100 ring-1 ring-zinc-200/80">
              <Tooltip text="Close (Esc)">
                <button onClick={onClose} className={iconBtn()} aria-label="Close"><X size={14} /></button>
              </Tooltip>
              <Divider />
              <Tooltip text="Code editor">
                <button onClick={() => onTabChange("code")} disabled={disabled}
                  className={iconBtn(activeTab === "code", disabled)}><CodeIcon size={14} /></button>
              </Tooltip>
              <Tooltip text="Live preview">
                <button onClick={() => onTabChange("preview")} disabled={disabled}
                  className={iconBtn(activeTab === "preview", disabled)}><Eye size={14} /></button>
              </Tooltip>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <div className={`h-2 w-2 shrink-0 rounded-full transition-all ${
                  streamText ? "bg-blue-500 animate-pulse scale-110" : files.length ? "bg-emerald-500" : "bg-zinc-300"
                }`} />
                <span className="truncate text-[13px] font-semibold text-zinc-800">{appTitle || "Untitled"}</span>
              </div>

              {!disabled && (
                <Select value={selectValue} onValueChange={v => onMessageChange(reversed[parseInt(v)])}>
                  <SelectTrigger className="h-6 w-auto gap-1 rounded-lg border-0 px-2 py-0 text-[11px] font-bold ring-0 focus:ring-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer">
                    <SelectValue>{`v${currentVersion + 1}`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl p-1 border border-zinc-200 bg-white shadow-xl">
                    {reversed.map((_, i) => (
                      <SelectItem key={i} value={i.toString()}
                        className="rounded-lg text-xs data-[highlighted]:bg-zinc-100 cursor-pointer">
                        Version {(chat.assistantMessagesCountBefore || 0) + (allAssistantMessages.length - 1 - i) + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {streamText && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10.5px] font-semibold text-blue-600 border border-blue-100 animate-in fade-in">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Generating…
                </span>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-xl p-1 bg-zinc-100 ring-1 ring-zinc-200/80">
              <Tooltip text="Copy active file">
                <button onClick={handleCopy} disabled={disabled} className={iconBtn(false, disabled)}>
                  {copied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </Tooltip>
              <Divider className="hidden sm:block" />
              <Tooltip text={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                <button onClick={toggleFullscreen} className={iconBtn(false, false, "hidden sm:flex")}>
                  {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                </button>
              </Tooltip>
              <Divider className="hidden sm:block" />
              <Tooltip text="Export as ZIP">
                <button onClick={handleDownload} disabled={disabled} className={iconBtn(false, disabled, "hidden sm:flex")}>
                  <ArrowDownToLine size={14} />
                </button>
              </Tooltip>
              <Divider className="hidden sm:block" />
              <Tooltip text="Share app">
                <Share message={disabled ? undefined : message && streamAllFiles.length === 0 ? message : undefined} className={iconBtn(false, disabled)} />
              </Tooltip>
            </div>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">

          {/* File Tree */}
          {activeTab === "code" && files.length > 1 && (
            <aside className="hidden md:flex w-[190px] shrink-0 border-r border-zinc-200/80 bg-zinc-50/60">
              <FileTree
                files={files.map(f => ({ path: f.path, language: f.language }))}
                activePath={mainFile?.path}
                openPaths={openPaths}
                onSelect={path => !disabled && handleOpenFile(path)}
              />
            </aside>
          )}



          {/* Main card */}
          <div className="flex flex-1 flex-col overflow-hidden sm:m-3 sm:mb-0 rounded-t-xl sm:border border-zinc-200/80 bg-white shadow-xl shadow-zinc-300/30">

            {files.length === 0 ? (
              <EmptyState />
            ) : activeTab === "code" ? (
              <>
                <FileTabs
                  openPaths={openPaths}
                  activePath={mainFile?.path}
                  onSelect={path => !disabled && handleOpenFile(path)}
                  onClose={handleCloseTab}
                  streamingPath={activeStreamingPath}
                />
                <div className="relative flex-1 overflow-hidden">
                  <StickToBottom className="h-full *:!h-full" resize="smooth" initial={false}>
                    <StickToBottom.Content>
                      <SyntaxHighlighter
                        files={files.map(f => ({ path: f.path, content: f.code, language: f.language }))}
                        activePath={activeFilePath
                          ? activeFilePath
                          : streamText
                            ? latestStreamBlock?.path || files.at(-1)?.path
                            : mainFile?.path}
                        disableSelection={!!streamText}
                        isStreaming={!!streamText}
                        onRequestFix={onRequestFix} // ✅ ADD THIS LINE HERE
                      />
                    </StickToBottom.Content>
                  </StickToBottom>
                  {streamText && <StreamingOverlay filename={activeStreamingPath?.split("/").pop()} />}
                </div>
                <StatusBar file={mainFile ? { path: mainFile.path, language: mainFile.language, code: mainFile.code } : undefined}
                  isStreaming={!!streamText} lineCount={lineCount} />
              </>
            ) : (
              <BrowserChrome onRefresh={() => setRefresh(r => r + 1)} disabled={disabled}>
                <CodeRunner
                  onRequestFix={onRequestFix}
                  language={language}
                  files={files.map(f => ({ path: f.path, content: f.code }))}
                  key={refresh}
                />
              </BrowserChrome>
            )}
          </div>
        </div>
      </div>
    </>
  );
}