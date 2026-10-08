"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    group: "Monitoring",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
      { label: "Laporan Data", href: "/dashboard/report", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { label: "Alert Logs", href: "/dashboard/alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
    ],
  },
  {
    group: "Manajemen Data",
    items: [
      { label: "Modul", href: "/dashboard/modul", icon: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" },
      { label: "Zona Sensor", href: "/dashboard/zona", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
    ],
  },
];

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 overflow-hidden"
      style={{
        width: isOpen ? "260px" : "72px",
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        boxShadow: "2px 0 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center h-16 px-4 shrink-0"
        style={{ borderBottom: "1px solid #f1f5f9" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {isOpen && (
            <span
              className="font-bold text-lg tracking-tight"
              style={{ color: "#1e293b", whiteSpace: "nowrap" }}
            >
              SSD<span style={{ color: "#6366f1" }}>Panel</span>
            </span>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="ml-auto p-1.5 rounded-lg transition-colors"
          style={{ color: "#94a3b8" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={isOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
          </svg>
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map((group) => (
          <div key={group.group} className="mb-4">
            {isOpen && (
              <p
                className="px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "#94a3b8" }}
              >
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 relative"
                  style={{
                    background: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                    border: isActive ? "1px solid rgba(99,102,241,0.15)" : "1px solid transparent",
                  }}
                  title={!isOpen ? item.label : undefined}
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    style={{ color: isActive ? "#6366f1" : "#94a3b8" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                  {isOpen && (
                    <span
                      className="text-sm font-medium"
                      style={{ whiteSpace: "nowrap", color: isActive ? "#6366f1" : "#64748b" }}
                    >
                      {item.label}
                    </span>
                  )}
                  {isActive && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full"
                      style={{ background: "linear-gradient(180deg, #6366f1, #8b5cf6)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User profile at bottom */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid #f1f5f9" }}
      >
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl" style={{ background: "#f8fafc" }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
          >
            A
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "#1e293b" }}>Admin User</p>
              <p className="text-xs truncate" style={{ color: "#94a3b8" }}>admin@ssd.dev</p>
            </div>
          )}
          {isOpen && (
            <button
              className="p-1 rounded-lg transition-colors"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
