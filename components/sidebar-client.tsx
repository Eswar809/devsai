"use client";

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { renameChat, deleteChat, pinChat } from '@/app/(main)/chat-actions';
import { toast } from '@/hooks/use-toast';

const PROFILE_IMAGE_URL = "https://cdn.auth0.com/avatars/ed.png";

// --- Tooltip ---
const Tooltip = ({ children, label, side = "right" }: { children: React.ReactNode; label: string; side?: "right" | "left" | "bottom" }) => {
  const pos = side === "right"
    ? "left-full ml-3 top-1/2 -translate-y-1/2"
    : side === "left"
      ? "right-full mr-3 top-1/2 -translate-y-1/2"
      : "top-full mt-2 left-1/2 -translate-x-1/2";
  const arrow = side === "right"
    ? "right-full top-1/2 -translate-y-1/2 border-r-zinc-900 border-y-transparent border-l-transparent border-[5px]"
    : side === "left"
      ? "left-full top-1/2 -translate-y-1/2 border-l-zinc-900 border-y-transparent border-r-transparent border-[5px]"
      : "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-900 border-x-transparent border-t-transparent border-[5px]";
  return (
    <div className="relative group/tip">
      {children}
      <div className={`pointer-events-none absolute ${pos} z-50 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white/90 font-medium opacity-0 group-hover/tip:opacity-100 transition-all duration-200 delay-500 scale-90 group-hover/tip:scale-100 shadow-2xl`}>
        <span className={`absolute border ${arrow}`} />
        {label}
      </div>
    </div>
  );
};

// --- SVGs ---
const DevsAILogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20" className="h-[18px] flex-shrink-0">
    <defs>
      <linearGradient id="devsai-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="50%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
    <text x="0" y="15" fill="url(#devsai-grad)" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="16" fontWeight="800" letterSpacing="-0.5">
      Dev&apos;s AI
    </text>
  </svg>
);

const NewChatIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 3C10.4142 3 10.75 3.33579 10.75 3.75V9.25H16.25C16.6642 9.25 17 9.58579 17 10C17 10.3882 16.7051 10.7075 16.3271 10.7461L16.25 10.75H10.75V16.25C10.75 16.6642 10.4142 17 10 17C9.58579 17 9.25 16.6642 9.25 16.25V10.75H3.75C3.33579 10.75 3 10.4142 3 10C3 9.58579 3.33579 9.25 3.75 9.25H9.25V3.75C9.25 3.33579 9.58579 3 10 3Z" />
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8.5 2C12.0899 2 15 4.91015 15 8.5C15 10.1149 14.4094 11.5908 13.4346 12.7275L17.8535 17.1465L17.918 17.2246C18.0461 17.4187 18.0244 17.6827 17.8535 17.8535C17.6827 18.0244 17.4187 18.0461 17.2246 17.918L17.1465 17.8535L12.7275 13.4346C11.5908 14.4094 10.1149 15 8.5 15C4.91015 15 2 12.0899 2 8.5C2 4.91015 4.91015 2 8.5 2ZM8.5 3C5.46243 3 3 5.46243 3 8.5C3 11.5376 5.46243 14 8.5 14C11.5376 14 14 11.5376 14 8.5C14 5.46243 11.5376 3 8.5 3Z" />
  </svg>
);

const ChatsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
    <path d="M8.99962 2C12.3133 2 14.9996 4.68629 14.9996 8C14.9996 11.3137 12.3133 14 8.99962 14H2.49962C2.30105 13.9998 2.12113 13.8821 2.04161 13.7002C1.96224 13.5181 1.99835 13.3058 2.1334 13.1602L3.93516 11.2178C3.34317 10.2878 2.99962 9.18343 2.99962 8C2.99962 4.68643 5.68609 2.00022 8.99962 2ZM8.99962 3C6.23838 3.00022 3.99961 5.23871 3.99961 8C3.99961 9.11212 4.36265 10.1386 4.97618 10.9688C5.11884 11.1621 5.1035 11.4293 4.94004 11.6055L3.64512 13H8.99962C11.761 13 13.9996 10.7614 13.9996 8C13.9996 5.23858 11.761 3 8.99962 3Z" />
    <path d="M16.5445 9.72754C16.4182 9.53266 16.1678 9.44648 15.943 9.53418C15.7183 9.62215 15.5932 9.85502 15.6324 10.084L15.7369 10.3955C15.9073 10.8986 16.0006 11.438 16.0006 12C16.0006 13.1123 15.6376 14.1386 15.024 14.9687C14.8811 15.1621 14.8956 15.4302 15.0592 15.6064L16.3531 17H11.0006C9.54519 17 8.23527 16.3782 7.32091 15.3848L7.07091 15.1103C6.88996 14.9645 6.62535 14.9606 6.43907 15.1143C6.25267 15.2682 6.20668 15.529 6.31603 15.7344L6.58458 16.0625C7.68048 17.253 9.25377 18 11.0006 18H17.5006C17.6991 17.9998 17.8791 17.8822 17.9586 17.7002C18.038 17.5181 18.0018 17.3058 17.8668 17.1602L16.0631 15.2178C16.6554 14.2876 17.0006 13.1837 17.0006 12C17.0006 11.3271 16.8891 10.6792 16.6842 10.0742L16.5445 9.72754Z" />
  </svg>
);

const MoreOptionsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
    <path d="M4.5 8.5C5.32843 8.5 6 9.17157 6 10C6 10.8284 5.32843 11.5 4.5 11.5C3.67157 11.5 3 10.8284 3 10C3 9.17157 3.67157 8.5 4.5 8.5ZM10 8.5C10.8284 8.5 11.5 9.17157 11.5 10C11.5 10.8284 10.8284 11.5 10 11.5C9.17157 11.5 8.5 10.8284 8.5 10C8.5 9.17157 9.17157 8.5 10 8.5ZM15.5 8.5C16.3284 8.5 17 9.17157 17 10C17 10.8284 16.3284 11.5 15.5 11.5C14.6716 11.5 14 10.8284 14 10C14 9.17157 14.6716 8.5 15.5 8.5Z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
    <path d="M16.5 13C16.7761 13 17 13.2239 17 13.5V15.5C17 16.3284 16.3284 17 15.5 17H4.5C3.67157 17 3 16.3284 3 15.5V13.5C3 13.2239 3.22386 13 3.5 13C3.77614 13 4 13.2239 4 13.5V15.5C4 15.7761 4.22386 16 4.5 16H15.5C15.7761 16 16 15.7761 16 15.5V13.5C16 13.2239 16.2239 13 16.5 13ZM10 3C10.2761 3 10.5 3.22386 10.5 3.5V12.1855L13.626 8.66797C13.8094 8.46166 14.1256 8.44275 14.332 8.62598C14.5383 8.80936 14.5573 9.12563 14.374 9.33203L10.374 13.832L10.2949 13.9033C10.21 13.9654 10.107 14 10 14C9.85718 14 9.72086 13.9388 9.62598 13.832L5.62598 9.33203L5.56738 9.25C5.45079 9.04872 5.48735 8.78653 5.66797 8.62598C5.84854 8.46567 6.1127 8.46039 6.29883 8.59961L6.37402 8.66797L9.5 12.1855V3.5C9.5 3.22386 9.72386 3 10 3Z" />
  </svg>
);

const ChevronUpDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
    <path d="M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z" />
  </svg>
);

const SidebarToggleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" color="currentColor">
    <path d="M2 12C2 8.31087 2 6.4663 2.81382 5.15877C3.1149 4.67502 3.48891 4.25427 3.91891 3.91554C5.08116 3 6.72077 3 10 3H14C17.2792 3 18.9188 3 20.0811 3.91554C20.5111 4.25427 20.8851 4.67502 21.1862 5.15877C22 6.4663 22 8.31087 22 12C22 15.6891 22 17.5337 21.1862 18.8412C20.8851 19.325 20.5111 19.7457 20.0811 20.0845C18.9188 21 17.2792 21 14 21H10C6.72077 21 5.08116 21 3.91891 20.0845C3.48891 19.7457 3.1149 19.325 2.81382 18.8412C2 17.5337 2 15.6891 2 12Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9.5 3L9.5 21" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    <path d="M5 7H6M5 10H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

// ─── Shared styles ───────────────────────────────────────────────────────────

const navItemBase = [
  "relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] text-[13px] font-medium",
  "text-stone-800/80 transition-all duration-200 cursor-pointer select-none",
  "hover:bg-stone-100 hover:text-stone-900",
  "active:scale-[0.985] active:bg-stone-200",
  "group",
].join(" ");

const NavItem = ({ icon: Icon, label, shortcut, href }: any) => (
  <Link href={href || "#"} prefetch={false} className={navItemBase} style={{ letterSpacing: '-0.01em' }}>
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-stone-100 text-stone-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] group-hover:text-stone-600 group-hover:bg-stone-200 transition-all duration-200 flex-shrink-0">
      <Icon />
    </span>
    <span className="flex-1 truncate">{label}</span>
    {shortcut && (
      <kbd className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] text-stone-500 bg-stone-200/50 px-1.5 py-0.5 rounded-md border border-stone-300/30 flex-shrink-0 font-mono">
        {shortcut}
      </kbd>
    )}
  </Link>
);

// ─── Context Menu ─────────────────────────────────────────────────────────────

type ChatItemProps = {
  title: string;
  id: string;
  isPinned: boolean;
  active?: boolean;
  onTogglePin?: (id: string, isPinned: boolean) => void;
};

function ChatItem({ title, id, isPinned, active, onTogglePin }: ChatItemProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const [localTitle, setLocalTitle] = useState(title);
  const [localPinned, setLocalPinned] = useState(isPinned);
  const [isPending, startTransition] = useTransition();
  const [isDeleted, setIsDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Focus rename input
  useEffect(() => {
    if (isRenaming) setTimeout(() => renameRef.current?.select(), 50);
  }, [isRenaming]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenuOpen(o => !o);
  };

  const handleShare = () => {
    setMenuOpen(false);
    const url = `${window.location.origin}/chats/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Chat link copied to clipboard." });
  };

  const handlePin = () => {
    setMenuOpen(false);
    const newPinned = !localPinned;
    setLocalPinned(newPinned);
    if (onTogglePin) onTogglePin(id, newPinned);

    startTransition(async () => {
      try {
        await pinChat(id, newPinned);
        router.refresh();
      } catch (error) {
        setLocalPinned(!newPinned);
        if (onTogglePin) onTogglePin(id, !newPinned);
      }
    });
  };

  const handleRename = () => { setMenuOpen(false); setIsRenaming(true); };

  const submitRename = () => {
    setIsRenaming(false);
    if (!renameValue.trim() || renameValue === localTitle) return;
    setLocalTitle(renameValue.trim());
    startTransition(async () => { await renameChat(id, renameValue.trim()); router.refresh(); });
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setIsDeleted(true); // Optimistic UI: hide immediately
    startTransition(async () => {
      try {
        await deleteChat(id);
        router.refresh();
      } catch (error) {
        console.error("Failed to delete chat", error);
        setIsDeleted(false); // Revert if failed
      }
    });
  };

  if (isDeleted) return null;

  return (
    <>
      <div className={`relative group flex items-center rounded-[9px] transition-all duration-150 ${active ? 'bg-stone-100 shadow-[0_0_8px_rgba(0,0,0,0.08)]' : 'hover:bg-stone-50'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') submitRename();
              if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(localTitle); }
            }}
            className="flex-1 py-[7px] px-2.5 text-[12.5px] font-medium text-stone-900 bg-white border border-violet-400 rounded-[9px] outline-none ring-2 ring-violet-200 min-w-0"
          />
        ) : (
          <Link href={`/chats/${id}`} prefetch={true} className="flex-1 flex items-center gap-2.5 py-[7px] px-2.5 min-w-0">
            {localPinned ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-violet-500 flex-shrink-0">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            ) : (
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200 ${active ? 'bg-violet-500' : 'bg-violet-400/30 group-hover:bg-violet-500/50'}`} />
            )}
            <span
              className={`truncate text-[12.5px] transition-colors duration-150 ${active ? 'text-stone-900 font-medium' : 'text-stone-600/70 group-hover:text-stone-800/90'}`}
              style={{ maskImage: 'linear-gradient(to right, #000 75%, transparent 95%)', WebkitMaskImage: 'linear-gradient(to right, #000 75%, transparent 95%)' }}
            >
              {localTitle || "New Chat"}
            </span>
          </Link>
        )}

        {/* More options button */}
        {!isRenaming && (
          <div className={`absolute right-1.5 transition-all duration-150 ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover:opacity-100 translate-x-1.5 group-hover:translate-x-0'}`}>
            <button
              ref={btnRef}
              onClick={openMenu}
              className={`h-6 w-6 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-700 active:scale-95 transition-all ${menuOpen ? 'bg-stone-200 text-stone-700' : 'hover:bg-stone-200'}`}
            >
              <MoreOptionsIcon />
            </button>
          </div>
        )}
      </div>

      {/* Fixed-position dropdown — rendered in portal to escape backdrop-filter & overflow bounds */}
      {mounted && menuOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 9999,
            animation: 'gsMenuIn 0.15s cubic-bezier(0.16,1,0.3,1) both',
          }}
          className="min-w-[175px] rounded-xl bg-white border border-stone-200/80 shadow-xl shadow-stone-300/40 py-1 overflow-hidden"
        >
          <ContextMenuItem icon="share" label="Share" onClick={handleShare} />
          <ContextMenuItem icon="pin" label={localPinned ? "Unpin" : "Pin"} onClick={handlePin} />
          <div className="my-1 mx-2 h-px bg-stone-100" />
          <ContextMenuItem icon="rename" label="Rename" onClick={handleRename} />
          <ContextMenuItem icon="delete" label="Delete" onClick={handleDelete} destructive />
        </div>,
        document.body
      )}
    </>
  );
}

function ContextMenuItem({ icon, label, onClick, destructive }: {
  icon: 'share' | 'pin' | 'rename' | 'delete';
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  const icons = {
    share: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
    pin: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
    ),
    rename: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    delete: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-[12.5px] font-medium transition-colors duration-100 text-left
        ${destructive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-stone-700 hover:bg-stone-50'
        }`}
    >
      <span className={destructive ? 'text-red-500' : 'text-stone-400'}>
        {icons[icon]}
      </span>
      {label}
    </button>
  );
}

const RailItem = ({ icon: Icon, onClick, href, tooltip, side = "left" }: { icon: any; onClick?: () => void; href?: string; tooltip: string; side?: "right" | "left" | "bottom" }) => {
  const Wrapper: any = href ? Link : 'button';
  const props: any = href ? { href, prefetch: false } : { onClick };
  return (
    <Tooltip label={tooltip} side={side}>
      <Wrapper {...props}
        className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-stone-100 active:scale-95 active:bg-stone-200 transition-all duration-150 group"
      >
        <span className="text-stone-500 group-hover:text-stone-700 transition-colors duration-150">
          <Icon />
        </span>
      </Wrapper>
    </Tooltip>
  );
};

// ─── Divider ─────────────────────────────────────────────────────────────────

const Divider = () => (
  <div className="mx-4 my-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.08), transparent)' }} />
);

// ─── Section Label ────────────────────────────────────────────────────────────

const SectionLabel = ({ label, action }: { label: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between px-2.5 mb-1.5">
    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-stone-500/70">{label}</span>
    {action}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SidebarClient({ recentChats }: { recentChats: { id: string; title: string; isPinned: boolean }[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [localChats, setLocalChats] = useState(recentChats);

  // Sync local state when server props change
  useEffect(() => {
    setLocalChats(recentChats);
  }, [recentChats]);

  const togglePin = (id: string, isPinned: boolean) => {
    setLocalChats(prev => prev.map(c => c.id === id ? { ...c, isPinned } : c));
  };

  const sidebarBg: React.CSSProperties = {
    background: '#ffffff',
    backdropFilter: 'blur(12px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
    borderRight: '1px solid rgba(0,0,0,0.05)',
    boxShadow: '1px 0 12px rgba(0,0,0,0.04)',
  };

  if (!isOpen) {
    return (
      <div className="h-screen w-[54px] shrink-0 flex flex-col sticky top-0 z-20" style={sidebarBg}>
        <div className="h-14 flex items-center justify-center shrink-0">
          <RailItem icon={SidebarToggleIcon} onClick={() => setIsOpen(true)} tooltip="Open sidebar" />
        </div>
        <div className="flex flex-col gap-1 items-center px-1.5 mt-0.5">
          <RailItem icon={NewChatIcon} href="/" tooltip="New chat" />
          <RailItem icon={SearchIcon} href="#" tooltip="Search" />
        </div>
        <div className="flex-grow" />
        <div className="mb-4 flex justify-center">
          <Tooltip label="Account" side="right">
            <button className="group flex h-9 w-9 items-center justify-center rounded-xl hover:bg-stone-100 transition-all duration-150 active:scale-95">
              <div className="h-[28px] w-[28px] rounded-full overflow-hidden ring-2 ring-stone-300/50 group-hover:ring-stone-400/70 transition-all duration-200 shadow-[0_0_8px_rgba(0,0,0,0.1)]">
                <img alt="Profile" className="h-full w-full object-cover" src={PROFILE_IMAGE_URL} width={28} height={28} />
              </div>
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }

  const pinnedChats = localChats.filter(c => c.isPinned);
  const unpinnedChats = localChats.filter(c => !c.isPinned);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .gs-scroll::-webkit-scrollbar { width: 3px; }
        .gs-scroll::-webkit-scrollbar-track { background: transparent; }
        .gs-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 99px; }
        .gs-scroll:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
        @keyframes gsIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        .gs-in { animation: gsIn 0.2s ease both; }
        @keyframes gsMenuIn { from { opacity: 0; transform: scale(0.95) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}} />

      <div className="h-screen w-[17rem] shrink-0 hidden md:flex flex-col sticky top-0 z-20 font-sans overflow-hidden" style={sidebarBg}>
        {/* Header */}
        <div className="relative flex items-center justify-between px-3.5 h-14 shrink-0">
          <Link href="/" prefetch={false} aria-label="Home"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
          >
            <DevsAILogo />
          </Link>
          <Tooltip label="Collapse" side="bottom">
            <button onClick={() => setIsOpen(false)} aria-label="Close sidebar"
              className="h-7 w-7 rounded-[8px] flex items-center justify-center text-stone-500 hover:text-stone-700 hover:bg-stone-100 active:scale-95 transition-all duration-150"
            >
              <SidebarToggleIcon />
            </button>
          </Tooltip>
        </div>

        {/* Top Actions */}
        <div className="px-2.5 pb-2 flex flex-col gap-0.5 shrink-0">
          <NavItem icon={NewChatIcon} label="New chat" shortcut="⌘⇧O" href="/" />
          <NavItem icon={SearchIcon} label="Search" shortcut="⌘K" href="#" />
        </div>

        <Divider />

        {/* Nav */}
        <div className="px-2.5 py-1.5 shrink-0">
          <NavItem icon={ChatsIcon} label="All chats" href="/" />
        </div>

        <Divider />

        {/* Scrollable Recents */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gs-scroll px-2.5 pt-3 pb-2">
          {/* Pinned Section */}
          {pinnedChats.length > 0 && (
            <>
              <SectionLabel label="Pinned" />
              <div className="flex flex-col gap-px mb-3">
                {pinnedChats.map((chat, i) => (
                  <div key={chat.id} className="gs-in" style={{ animationDelay: `${i * 25}ms` }}>
                    <ChatItem id={chat.id} title={chat.title} isPinned={chat.isPinned} onTogglePin={togglePin} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Recent Section */}
          <SectionLabel
            label="Recent"
            action={
              <button className="text-[10px] text-stone-500 hover:text-stone-700 transition-colors duration-150 font-medium px-1.5 py-0.5 rounded-md hover:bg-stone-100">
                View all
              </button>
            }
          />
          <div className="flex flex-col gap-px">
            {unpinnedChats.map((chat, i) => (
              <div key={chat.id} className="gs-in" style={{ animationDelay: `${i * 25}ms` }}>
                <ChatItem id={chat.id} title={chat.title} isPinned={chat.isPinned} onTogglePin={togglePin} />
              </div>
            ))}
            {localChats.length === 0 && (
              <div className="mt-6 flex flex-col items-center gap-2 py-8 opacity-40">
                <div className="h-9 w-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <ChatsIcon />
                </div>
                <span className="text-[12px] text-stone-500">No recent chats</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-2.5 pb-3 pt-1">
          <Divider />
          <div className="flex items-center justify-center gap-1.5 py-2">
            <span className="text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: '#6b7280' }}>Powered by Dev&apos;s AI</span>
          </div>
          <button
            className="w-full flex items-center h-12 rounded-[12px] px-3 gap-2.5 transition-all duration-200 group active:scale-[0.985] text-left"
            style={{
              background: '#f9fafb',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f9fafb';
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
            }}
          >
            <div className="relative flex-shrink-0">
              <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-stone-300/50 transition-all duration-300">
                <img alt="Profile" className="h-full w-full object-cover" src={PROFILE_IMAGE_URL} width={32} height={32} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            </div>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="text-[12.5px] font-bold text-stone-800 truncate w-full leading-tight" style={{ letterSpacing: '-0.02em' }}>
                Dev&apos;s User
              </span>
              <span className="text-[10px] truncate w-full leading-tight flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full text-[9px] font-semibold tracking-wide" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                  Guest Mode
                </span>
              </span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
              <Tooltip label="Export chats" side="bottom">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-500 hover:text-stone-700 hover:bg-stone-100 active:scale-95 transition-all">
                  <DownloadIcon />
                </div>
              </Tooltip>
              <span className="text-stone-400/80 group-hover:text-stone-600 transition-colors duration-150 ml-0.5">
                <ChevronUpDownIcon />
              </span>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}