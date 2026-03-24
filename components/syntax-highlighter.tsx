// ✅ FILE: components/syntax-highlighter.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";
import { WrapText, ZoomIn, ZoomOut, ChevronRight, Sparkles, CornerDownLeft } from "lucide-react";

// ─── File badge colors ─────────────────────────────
const FILE_COLORS: Record<string, string> = {
  tsx: "#0ea5e9", ts: "#3b82f6", jsx: "#0ea5e9", js: "#eab308",
  css: "#ec4899", json: "#f97316", md: "#71717a",
};

function getBreadcrumbs(path: string) {
  return path ? path.split("/") : [];
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TBtn({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] transition-all
        ${active ? "bg-zinc-200 text-zinc-700" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"}`}>
      {children}
    </button>
  );
}

export default function SyntaxHighlighter({
  files, activePath, disableSelection, isStreaming, onRequestFix
}: {
  files: Array<{ path: string; content: string; language: string }>;
  activePath?: string;
  disableSelection?: boolean;
  isStreaming?: boolean;
  onRequestFix?: (e: string) => void; // ✅ Added this prop to send prompt to AI
}) {
  const [activeFile, setActiveFile] = useState(0);
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");
  const [fontSize, setFontSize] = useState(14); 
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Ask AI Feature States
  const [aiMenu, setAiMenu] = useState<{ text: string, top: number, left: number } | null>(null);
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    if (!activePath) return;
    const idx = files.findIndex(f => f.path === activePath);
    if (idx !== -1 && idx !== activeFile) setActiveFile(idx);
  }, [activePath, files, activeFile]);

  const file = files[activeFile];
  const monacoLanguage = useMemo(
    () => (file ? getMonacoLanguage(file.language) : "plaintext"),
    [file?.language],
  );

  const ext = file?.path.split(".").pop()?.toLowerCase() ?? "";
  const langColor = FILE_COLORS[ext] ?? "#71717a";
  const breadcrumbs = getBreadcrumbs(file?.path ?? "");

  useEffect(() => {
    if (!isStreaming || !editorRef.current) return;
    const editor = editorRef.current;
    const lineCount = editor.getModel?.()?.getLineCount?.() || 1;
    editor.revealLine?.(lineCount);
    const scrollHeight = editor.getScrollHeight?.();
    if (typeof scrollHeight === "number") editor.setScrollTop?.(scrollHeight);
  }, [file?.content, activeFile, isStreaming]);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monaco.editor.defineTheme("llamacoder-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment",       foreground: "94a3b8", fontStyle: "italic" },
        { token: "keyword",       foreground: "7c3aed", fontStyle: "bold" },
        { token: "string",        foreground: "059669" },
        { token: "number",        foreground: "ea580c" },
        { token: "type",          foreground: "0369a1" },
        { token: "function",      foreground: "1d4ed8" },
        { token: "variable",      foreground: "374151" },
        { token: "tag",           foreground: "7c3aed" },
        { token: "attribute.name",foreground: "0369a1" },
      ],
      colors: {
        "editor.background":             "#ffffff",
        "editor.foreground":             "#1e293b",
        "editor.lineHighlightBackground":"#f1f5f9",
        "editor.selectionBackground":    "#bfdbfe",
        "editorLineNumber.foreground":   "#cbd5e1",
        "editorLineNumber.activeForeground": "#64748b",
        "editorCursor.foreground":       "#6366f1",
        "editorIndentGuide.background1": "#f1f5f9",
        "editorIndentGuide.activeBackground1": "#e2e8f0",
        "editor.inactiveSelectionBackground": "#e0e7ff",
        "scrollbarSlider.background":    "#e2e8f080",
        "scrollbarSlider.hoverBackground":"#cbd5e1a0",
        "editorBracketMatch.background": "#e0e7ff",
        "editorBracketMatch.border":     "#6366f140",
      },
    });
  }, []);

  const handleEditorMount = useCallback((editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    // ✅ Selection Event: Shows "Ask AI" when text is highlighted
    editor.onDidChangeCursorSelection((e: any) => {
      if (isStreaming || disableSelection) return;
      
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        if (!showAiInput) setAiMenu(null); // Keep menu if typing in input
        return;
      }

      const text = editor.getModel()?.getValueInRange(selection);
      if (text && text.trim().length > 0) {
        const pos = editor.getScrolledVisiblePosition(selection.getEndPosition());
        if (pos) {
          // Calculate safe position so it doesn't go off-screen
          const top = Math.min(pos.top + 20, editor.getLayoutInfo().height - 50);
          const left = Math.min(pos.left, editor.getLayoutInfo().width - 250);
          setAiMenu({ text, top, left });
          setShowAiInput(false); // Reset input state on new selection
        }
      } else {
        if (!showAiInput) setAiMenu(null);
      }
    });

    if (isStreaming) {
      const lineCount = editor.getModel?.()?.getLineCount?.() || 1;
      editor.revealLine?.(lineCount);
    }
  }, [isStreaming, showAiInput, disableSelection]);

  const handleAskAISubmit = () => {
    if (!aiPrompt.trim() || !aiMenu || !onRequestFix) return;
    
    // Formatting the prompt to tell AI exactly which code to target
    const promptToSend = `Modify this specific selected code:\n\n\`\`\`${monacoLanguage}\n${aiMenu.text}\n\`\`\`\n\nInstruction: ${aiPrompt}`;
    
    onRequestFix(promptToSend);
    setAiMenu(null);
    setShowAiInput(false);
    setAiPrompt("");
  };

  if (files.length === 0) {
    return (
      <div className="flex h-[75vh] w-full items-center justify-center text-sm text-zinc-400">
        No files to display
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col bg-white">
      {/* ── Breadcrumb + Toolbar bar ── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/80 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-0.5 overflow-hidden">
          {breadcrumbs.map((seg, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="flex min-w-0 items-center gap-0.5">
                {i > 0 && <ChevronRight size={10} className="shrink-0 text-zinc-300" />}
                <span className={`truncate font-mono text-[11.5px] transition-colors
                  ${isLast ? "font-semibold text-zinc-700" : "text-zinc-400"}`}
                  style={isLast ? { color: langColor } : {}}>
                  {seg}
                </span>
              </span>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <TBtn onClick={() => setWordWrap(w => w === "on" ? "off" : "on")}
            active={wordWrap === "on"} title={wordWrap === "on" ? "Disable word wrap" : "Enable word wrap"}>
            <WrapText size={12} />
          </TBtn>
          <TBtn onClick={() => setFontSize(s => Math.max(11, s - 1))} title="Decrease font size">
            <ZoomOut size={12} />
          </TBtn>
          <span className="w-6 select-none text-center font-mono text-[10px] text-zinc-400">{fontSize}</span>
          <TBtn onClick={() => setFontSize(s => Math.min(18, s + 1))} title="Increase font size">
            <ZoomIn size={12} />
          </TBtn>
        </div>
      </div>

      <div className="relative w-full h-[75vh] overflow-hidden">
        
        {/* ✅ Ask AI Floating Menu */}
        {aiMenu && !isStreaming && (
          <div 
            onMouseDown={(e) => e.stopPropagation()} // Prevent selection from clearing
            className="absolute z-50 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white shadow-xl transition-all animate-in zoom-in-95 duration-150"
            style={{ top: aiMenu.top, left: aiMenu.left }}
          >
            {!showAiInput ? (
              <button
                onClick={() => setShowAiInput(true)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                <Sparkles size={14} /> Ask AI
              </button>
            ) : (
              <div className="flex w-72 items-center gap-2 p-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="What should AI do?"
                  className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAskAISubmit();
                    if (e.key === "Escape") setShowAiInput(false);
                  }}
                />
                <button 
                  onClick={handleAskAISubmit}
                  disabled={!aiPrompt.trim()}
                  className="flex size-7 items-center justify-center rounded-md bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 transition"
                >
                  <CornerDownLeft size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        <Editor
          key={`${activeFile}-${file?.path}`}
          value={file?.content || ""}
          language={monacoLanguage}
          theme="llamacoder-light"
          beforeMount={handleBeforeMount} 
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap,
            padding: { top: 16, bottom: 16 },
            fontSize,
            lineHeight: Math.round(fontSize * 1.6),
            fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "line",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            showFoldingControls: "mouseover",
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, highlightActiveIndentation: true },
            scrollbar: isStreaming
              ? { vertical: "hidden", horizontal: "hidden" }
              : { vertical: "auto", horizontal: "auto", verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            occurrencesHighlight: "off",
          }}
          height="100%"
          width="100%"
        />

        {/* Streaming overlay blocker */}
        {isStreaming && (
          <div className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
            onWheel={e => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
            onKeyDown={e => {
              if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","PageUp","PageDown","Home","End"].includes(e.key)) {
                e.preventDefault(); e.stopPropagation();
              }
            }}
            tabIndex={-1}
            style={{ pointerEvents: "auto" }}
          />
        )}
      </div>

      {/* ── Bottom status strip ── */}
      <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-3 py-[4px]">
        <div className="flex items-center gap-3">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: langColor + "18", color: langColor }}>
            {monacoLanguage}
          </span>
          <span className="font-mono text-[10px] text-zinc-400">
            {file?.content?.split("\n").length ?? 0} lines
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-400">
          {!isStreaming && (
            <span className="tabular-nums">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
          )}
          <span>UTF-8</span>
          {isStreaming && (
            <span className="flex items-center gap-1 font-semibold text-blue-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              Writing…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}