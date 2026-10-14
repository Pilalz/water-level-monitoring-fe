"use client";

import { useEffect, useState, useMemo } from "react";
import { activityLogApi, ActivityLog } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// Konfigurasi badge berdasarkan action
const actionConfig: Record<string, { bg: string; text: string; label: string }> = {
  CREATE: { bg: "rgba(16,185,129,0.12)", text: "#059669", label: "Buat" },
  UPDATE: { bg: "rgba(59,130,246,0.12)", text: "#2563eb", label: "Perbarui" },
  DELETE: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", label: "Hapus" },
  RESTORE: { bg: "rgba(245,158,11,0.12)", text: "#d97706", label: "Pulihkan" },
  RESOLVE: { bg: "rgba(139,92,246,0.12)", text: "#7c3aed", label: "Selesaikan" },
  LOGIN: { bg: "rgba(99,102,241,0.12)", text: "#4f46e5", label: "Login" },
};

// Konfigurasi badge berdasarkan entity
const entityConfig: Record<string, { bg: string; text: string }> = {
  MODUL: { bg: "rgba(99,102,241,0.1)", text: "#6366f1" },
  ZONA: { bg: "rgba(20,184,166,0.1)", text: "#0d9488" },
  USER: { bg: "rgba(236,72,153,0.1)", text: "#db2777" },
  ALERT: { bg: "rgba(249,115,22,0.1)", text: "#ea580c" },
  AUTH: { bg: "rgba(100,116,139,0.1)", text: "#475569" },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ENTITIES = ["ALL", "MODUL", "ZONA", "USER", "ALERT", "AUTH"];
const ACTIONS = ["ALL", "CREATE", "UPDATE", "DELETE", "RESTORE", "RESOLVE", "LOGIN"];

export default function ActivityLogPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  // Guard: redirect jika bukan admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, authLoading, router]);

  const loadLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await activityLogApi.getAll({
        entity: entityFilter !== "ALL" ? entityFilter : undefined,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
        search: search.trim() || undefined,
        page: targetPage,
        limit: LIMIT,
      });
      if (res.success) {
        setLogs(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat activity log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadLogs(1);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, actionFilter, authLoading, isAdmin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadLogs(newPage);
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: "3px solid #e2e8f0", borderTopColor: "#6366f1",
            animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
          }} />
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .log-row { animation: fadeIn 0.25s ease; }
        .log-row:hover { background: rgba(99,102,241,0.04) !important; }
        .filter-select:focus { outline: 2px solid rgba(99,102,241,0.4); outline-offset: 0; }
        .search-input:focus { outline: 2px solid rgba(99,102,241,0.4); outline-offset: 0; border-color: #6366f1 !important; }
        .page-btn:hover:not(:disabled) { background: rgba(99,102,241,0.1) !important; color: #6366f1 !important; }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Activity Log
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          Riwayat seluruh aktivitas sistem — hanya dapat diakses oleh Admin
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: "1 1 280px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari username, detail, ID..."
              style={{
                width: "100%", padding: "8px 12px 8px 34px", borderRadius: 8,
                border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b",
                background: "#f8fafc", boxSizing: "border-box" as const,
              }}
            />
          </div>
          <button type="submit" style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
          }}>
            Cari
          </button>
        </form>

        {/* Entity Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Entitas:</span>
          <select
            className="filter-select"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0",
              fontSize: 13, color: "#1e293b", background: "#f8fafc", cursor: "pointer",
            }}
          >
            {ENTITIES.map((e) => <option key={e} value={e}>{e === "ALL" ? "Semua" : e}</option>)}
          </select>
        </div>

        {/* Action Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>Aksi:</span>
          <select
            className="filter-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0",
              fontSize: 13, color: "#1e293b", background: "#f8fafc", cursor: "pointer",
            }}
          >
            {ACTIONS.map((a) => <option key={a} value={a}>{a === "ALL" ? "Semua Aksi" : (actionConfig[a]?.label || a)}</option>)}
          </select>
        </div>

        {/* Total Count */}
        <div style={{ marginLeft: "auto", fontSize: 13, color: "#94a3b8" }}>
          Total: <strong style={{ color: "#475569" }}>{total.toLocaleString("id-ID")}</strong> log
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
          color: "#dc2626", fontSize: 14
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12,
        overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
      }}>
        {/* Table Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 90px 80px 110px 1fr 50px",
          gap: 0, padding: "10px 16px",
          background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
        }}>
          {["Waktu", "Aksi", "Entitas", "User", "Detail", "ID"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "3px solid #e2e8f0", borderTopColor: "#6366f1",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
            }} />
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Memuat data log...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && logs.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <svg style={{ margin: "0 auto 12px", color: "#cbd5e1" }} width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>Tidak ada log aktivitas ditemukan</p>
          </div>
        )}

        {/* Rows */}
        {!loading && logs.map((log, i) => {
          const act = actionConfig[log.action] || { bg: "rgba(100,116,139,0.1)", text: "#475569", label: log.action };
          const ent = entityConfig[log.entity] || { bg: "rgba(100,116,139,0.1)", text: "#475569" };
          return (
            <div
              key={log.id}
              className="log-row"
              style={{
                display: "grid",
                gridTemplateColumns: "160px 90px 80px 110px 1fr 50px",
                gap: 0,
                padding: "10px 16px",
                borderBottom: i < logs.length - 1 ? "1px solid #f1f5f9" : "none",
                alignItems: "start",
                transition: "background 0.15s",
                background: "transparent",
              }}
            >
              {/* Waktu */}
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {formatDateTime(log.createdAt)}
              </span>

              {/* Aksi */}
              <div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 6,
                  background: act.bg, color: act.text,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.03em"
                }}>
                  {act.label}
                </span>
              </div>

              {/* Entitas */}
              <div>
                <span style={{
                  display: "inline-flex",
                  padding: "2px 8px", borderRadius: 6,
                  background: ent.bg, color: ent.text,
                  fontSize: 11, fontWeight: 600
                }}>
                  {log.entity}
                </span>
              </div>

              {/* User */}
              <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
                {log.username || "System"}
              </span>

              {/* Detail */}
              <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                {log.details || "—"}
              </span>

              {/* Entity ID */}
              <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {log.entityId ? log.entityId.split("-")[0] : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginTop: 20
        }}>
          <button
            className="page-btn"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
              background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer",
              fontWeight: 500, transition: "all 0.15s"
            }}
          >
            ← Prev
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                className="page-btn"
                onClick={() => handlePageChange(pageNum)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  border: page === pageNum ? "2px solid #6366f1" : "1px solid #e2e8f0",
                  background: page === pageNum ? "rgba(99,102,241,0.1)" : "#fff",
                  color: page === pageNum ? "#6366f1" : "#475569",
                  fontSize: 13, cursor: "pointer", fontWeight: page === pageNum ? 700 : 500,
                  transition: "all 0.15s"
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className="page-btn"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
              background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer",
              fontWeight: 500, transition: "all 0.15s"
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
