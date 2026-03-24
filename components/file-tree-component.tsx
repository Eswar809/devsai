// FILE: components/file-tree.tsx
"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface FileNode {
  type: "file";
  name: string;
  path: string;
  language?: string;
}

interface FolderNode {
  type: "folder";
  name: string;
  children: TreeNode[];
}

type TreeNode = FileNode | FolderNode;

interface FileTreeProps {
  files: { path: string; language?: string }[];
  activePath?: string;
  onSelect?: (path: string) => void;
  theme?: "dark" | "light";
}

// ── File type → badge config ───────────────────────────────────────────────
const FILE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  tsx:  { bg: "bg-sky-500/15",    text: "text-sky-400",    label: "TX" },
  ts:   { bg: "bg-blue-500/15",   text: "text-blue-400",   label: "TS" },
  jsx:  { bg: "bg-sky-500/15",    text: "text-sky-400",    label: "JX" },
  js:   { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "JS" },
  css:  { bg: "bg-pink-500/15",   text: "text-pink-400",   label: "CS" },
  json: { bg: "bg-orange-500/15", text: "text-orange-400", label: "JS" },
  md:   { bg: "bg-zinc-500/15",   text: "text-zinc-400",   label: "MD" },
};
const DEFAULT_BADGE = { bg: "bg-zinc-500/15", text: "text-zinc-400", label: "F" };

function getExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// ── Build tree from flat path list ────────────────────────────────────────
function buildTree(files: { path: string; language?: string }[]): TreeNode[] {
  const root: FolderNode = { type: "folder", name: "__root__", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      let folder = cur.children.find(
        (n): n is FolderNode => n.type === "folder" && n.name === seg,
      );
      if (!folder) {
        folder = { type: "folder", name: seg, children: [] };
        cur.children.push(folder);
      }
      cur = folder;
    }
    const name = parts[parts.length - 1];
    cur.children.push({ type: "file", name, path: file.path, language: file.language });
  }

  return root.children;
}

// ── Icons ─────────────────────────────────────────────────────────────────
function FileIcon({ name }: { name: string }) {
  const badge = FILE_BADGE[getExt(name)] ?? DEFAULT_BADGE;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded text-[8px] font-bold leading-none ${badge.bg} ${badge.text}`}
      style={{ width: 18, height: 18 }}
    >
      {badge.label}
    </span>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0 text-amber-400">
      <path
        d="M1.5 4.5A1 1 0 012.5 3.5H6L7 5H13.5A1 1 0 0114.5 6V12A1 1 0 0113.5 13H2.5A1 1 0 011.5 12V4.5Z"
        fill="currentColor"
        fillOpacity={open ? 0.25 : 0.15}
        stroke="currentColor"
        strokeWidth="0.75"
      />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      className={`shrink-0 text-zinc-500 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
    >
      <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Tree Node ─────────────────────────────────────────────────────────────
function Node({
  node,
  depth,
  activePath,
  onSelect,
  openMap,
  toggle,
  theme,
}: {
  node: TreeNode;
  depth: number;
  activePath?: string;
  onSelect?: (path: string) => void;
  openMap: Record<string, boolean>;
  toggle: (key: string) => void;
  theme: "dark" | "light";
}) {
  const pl = 8 + depth * 12;
  const dk = theme === "dark";

  if (node.type === "folder") {
    const key = `${depth}:${node.name}`;
    const open = openMap[key] !== false; // default open
    return (
      <div>
        <button
          onClick={() => toggle(key)}
          style={{ paddingLeft: pl }}
          className={`flex w-full items-center gap-1.5 rounded-md py-[5px] pr-2 text-left transition-colors duration-100 ${
            dk ? "hover:bg-white/[0.06] text-zinc-300" : "hover:bg-zinc-100 text-zinc-600"
          }`}
        >
          <Chevron open={open} />
          <FolderIcon open={open} />
          <span className="truncate text-[12px] font-medium">{node.name}</span>
        </button>
        {open &&
          node.children.map((child, i) => (
            <Node
              key={i}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
              openMap={openMap}
              toggle={toggle}
              theme={theme}
            />
          ))}
      </div>
    );
  }

  const isActive = activePath === node.path;
  return (
    <button
      onClick={() => onSelect?.(node.path)}
      style={{ paddingLeft: pl }}
      className={`group relative flex w-full items-center gap-2 rounded-md py-[5px] pr-2 text-left transition-colors duration-100 ${
        isActive
          ? dk
            ? "bg-indigo-500/20 text-indigo-200"
            : "bg-indigo-50 text-indigo-700"
          : dk
            ? "hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200"
            : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
      }`}
    >
      {isActive && (
        <span
          className={`absolute left-0 top-1/2 h-3/4 w-[3px] -translate-y-1/2 rounded-r-full ${
            dk ? "bg-indigo-400" : "bg-indigo-500"
          }`}
        />
      )}
      <FileIcon name={node.name} />
      <span className="truncate text-[12px] font-medium">{node.name}</span>
    </button>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────
export default function FileTree({ files, activePath, onSelect, theme = "dark" }: FileTreeProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const dk = theme === "dark";

  const toggle = (key: string) =>
    setOpenMap((p) => ({ ...p, [key]: p[key] === false ? true : false }));

  const tree = buildTree(files);

  return (
    <div
      className={`flex h-full flex-col overflow-hidden text-[12px] ${
        dk ? "bg-zinc-900 text-zinc-300" : "bg-white text-zinc-700"
      }`}
    >
      {/* Header */}
      <div
        className={`flex shrink-0 items-center justify-between px-3 py-2.5 border-b ${
          dk ? "border-white/[0.06]" : "border-zinc-100"
        }`}
      >
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            dk ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          Files
        </span>
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            dk ? "bg-white/[0.07] text-zinc-500" : "bg-zinc-100 text-zinc-400"
          }`}
        >
          {files.length}
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-1.5">
        <div className="flex flex-col gap-0.5">
          {tree.map((node, i) => (
            <Node
              key={i}
              node={node}
              depth={0}
              activePath={activePath}
              onSelect={onSelect}
              openMap={openMap}
              toggle={toggle}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
