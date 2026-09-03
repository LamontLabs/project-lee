import { useState } from "react";
import { useLocation, Link } from "wouter";
import { META } from "../data/meta";

type SidebarProps = {
  onSearch: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const NAV = [
  { label: "Overview", path: "/", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { label: "Start Here", path: "/start-here", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { label: "Vision and Identity", path: "/vision", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  {
    label: "Constitution",
    path: "/constitution",
    badge: "13",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    label: "Architecture Explorer",
    path: "/architecture",
    badge: "11",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    children: [
      { label: "Layer 0 — Identity", path: "/architecture/layer-0" },
      { label: "Layer 1 — Foundations", path: "/architecture/layer-1" },
      { label: "Layer 2 — Knowledge", path: "/architecture/layer-2" },
      { label: "Layer 3 — Retrieval", path: "/architecture/layer-3" },
      { label: "Layer 4 — Intelligence", path: "/architecture/layer-4" },
      { label: "Layer 5 — Coordination", path: "/architecture/layer-5" },
      { label: "Layer 6 — Operational Context", path: "/architecture/layer-6" },
      { label: "Layer 6b — Portfolio Intelligence", path: "/architecture/layer-6b" },
      { label: "Layer 7 — Connected Lamont Labs Systems", path: "/architecture/layer-7" },
      { label: "Layer 8 — Provider Layer", path: "/architecture/layer-8" },
      { label: "Layer 9 — Interfaces", path: "/architecture/layer-9" },
    ],
  },
  {
    label: "Task Manual",
    path: "/tasks",
    badge: "69",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  {
    label: "Knowledge and Data",
    path: "/knowledge",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    label: "LEE, CIL, and CerbaSeal",
    path: "/systems",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    label: "Glossary",
    path: "/glossary",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    label: "Version History",
    path: "/version-history",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

export function Sidebar({ onSearch, mobileOpen, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const [archExpanded, setArchExpanded] = useState(location.startsWith("/architecture"));

  function isActive(path: string) {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 mb-4" onClick={onMobileClose}>
          <img src="/favicon.png?icon=lee" alt="" className="w-7 h-7 rounded border border-primary/60 shrink-0 shadow-[0_0_18px_hsl(var(--brand-red)/.2)]" />
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Project LEE</p>
            <p className="text-xs text-muted-foreground mt-0.5">v{META.version} Manual</p>
          </div>
        </Link>

        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border border-sidebar-border transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
          <kbd className="ml-auto text-xs text-muted-foreground/60 font-mono">⌘K</kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(item => {
          const active = isActive(item.path);
          const hasChildren = item.children && item.children.length > 0;
          const childActive = hasChildren && item.children!.some(c => location.startsWith(c.path));
          const expanded = hasChildren && (archExpanded || childActive);

          return (
            <div key={item.path}>
              <div className="flex items-center">
                <Link
                  href={item.path}
                  onClick={() => {
                    if (hasChildren) setArchExpanded(e => !e);
                    onMobileClose();
                  }}
                  className={`flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    active && !childActive
                      ? "bg-sidebar-accent text-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs text-muted-foreground font-mono">{item.badge}</span>
                  )}
                  {hasChildren && (
                    <svg
                      className={`w-3 h-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>
              </div>

              {hasChildren && expanded && (
                <div className="ml-4 pl-3 border-l border-sidebar-border mt-0.5 mb-1 space-y-0.5">
                  {item.children!.map(child => (
                    <Link
                      key={child.path}
                      href={child.path}
                      onClick={onMobileClose}
                      className={`block px-2 py-1.5 rounded text-xs transition-colors ${
                        location === child.path || location.startsWith(child.path)
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Internal reference only.</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">Not for distribution.</p>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50" onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
