"use client";

import { useEffect, useState, useMemo } from "react";
import { alertApi, AlertLog, AlertSummary } from "@/lib/api";

const levelBadges: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  WASPADA: { bg: "#fef3c7", text: "#92400e", border: "#fde68a", icon: "🟡" },
  BAHAYA: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa", icon: "🟠" },
  KRITIS: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca", icon: "🔴" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({
    WASPADA: 0,
    BAHAYA: 0,
    KRITIS: 0,
    totalUnresolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters
  const [filterResolved, setFilterResolved] = useState<string>("false"); // default to unresolved
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const isResolvedParam = filterResolved === "ALL" ? undefined : filterResolved === "true";
      const levelParam = filterLevel === "ALL" ? undefined : filterLevel;

      const [alertsRes, sumRes] = await Promise.all([
        alertApi.getAll({
          isResolved: isResolvedParam,
          levelStatus: levelParam,
          limit: 50,
        }),
        alertApi.getSummary(),
      ]);

      if (alertsRes.success) setAlerts(alertsRes.data);
      if (sumRes.success) setSummary(sumRes.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat log alert";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterResolved, filterLevel]);

  const handleResolve = async (id: string) => {
    try {
      setResolvingId(id);
      const res = await alertApi.resolve(id);
      if (res.success) {
        showToast("Alert berhasil ditandai sebagai resolved!", "success");
        loadAlerts();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal meresolve alert", "error");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all animate-bounce"
          style={{
            background: toast.type === "success" ? "#065f46" : "#991b1b",
            color: "white",
          }}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
            <span>Sistem Peringatan</span>
            <span>•</span>
            <span>Insiden & Threshold Breaches</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Riwayat Log Alert
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Log otomatis yang ditrigger saat ketinggian air sensor melebihi ambang batas.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Alert
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Alert Aktif</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{summary.totalUnresolved}</p>
          <p className="text-xs text-slate-400 mt-1">Perlu tindakan penanganan</p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Level Waspada</p>
            <span>🟡</span>
          </div>
          <p className="text-3xl font-bold text-amber-700 mt-2">{summary.WASPADA}</p>
          <p className="text-xs text-amber-600 mt-1">Mendekati ambang normal</p>
        </div>

        <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Level Bahaya</p>
            <span>🟠</span>
          </div>
          <p className="text-3xl font-bold text-orange-700 mt-2">{summary.BAHAYA}</p>
          <p className="text-xs text-orange-600 mt-1">Level air tinggi</p>
        </div>

        <div className="p-5 rounded-2xl bg-red-50/60 border border-red-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Level Kritis</p>
            <span>🔴</span>
          </div>
          <p className="text-3xl font-bold text-red-700 mt-2">{summary.KRITIS}</p>
          <p className="text-xs text-red-600 mt-1">Darurat banjir / meluap</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Status:</span>
          {[
            { label: "Aktif / Belum Ditangani", value: "false" },
            { label: "Sudah Selesai", value: "true" },
            { label: "Semua", value: "ALL" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterResolved(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterResolved === tab.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Severity:</span>
          {["ALL", "WASPADA", "BAHAYA", "KRITIS"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterLevel === lvl
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lvl === "ALL" ? "Semua Level" : lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Memuat log alert...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-2xl">
              ✅
            </div>
            <p className="text-base font-semibold text-slate-800">Tidak Ada Alert</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {filterResolved === "false"
                ? "Semua sensor berada dalam kondisi normal dan aman."
                : "Tidak ada riwayat alert yang sesuai dengan filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => {
              const badge = levelBadges[alert.levelStatus] || levelBadges.WASPADA;
              const dateStr = new Date(alert.waktuAlert).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "medium",
              });

              return (
                <div
                  key={alert.id}
                  className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    alert.isResolved ? "opacity-60 bg-slate-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{badge.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                          style={{
                            background: badge.bg,
                            color: badge.text,
                            borderColor: badge.border,
                          }}
                        >
                          {alert.levelStatus}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {alert.namaZona || `Zona ID: ${alert.idZona}`}
                        </span>
                        {alert.modulNama && (
                          <span className="text-xs text-slate-400">({alert.modulNama})</span>
                        )}
                        <span className="text-xs text-slate-400">• {dateStr}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-1">{alert.pesanAlert}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">Alert ID: #{alert.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    {alert.isResolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <span>✓</span> Ditangani
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolvingId === alert.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                      >
                        {resolvingId === alert.id ? "Memproses..." : "Tandai Selesai ✓"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
