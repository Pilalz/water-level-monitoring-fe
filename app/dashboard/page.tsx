"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { modulApi, zonaApi, alertApi, Modul, Zona, AlertLog, AlertSummary, WaterLevelStatus, getDeviceConnectionStatus } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const statusBadges: Record<WaterLevelStatus, { bg: string; text: string; dot: string }> = {
  AMAN: { bg: "rgba(16,185,129,0.1)", text: "#059669", dot: "#10b981" },
  WASPADA: { bg: "rgba(245,158,11,0.1)", text: "#d97706", dot: "#f59e0b" },
  BAHAYA: { bg: "rgba(249,115,22,0.1)", text: "#ea580c", dot: "#f97316" },
  KRITIS: { bg: "rgba(239,68,68,0.1)", text: "#dc2626", dot: "#ef4444" },
};

export default function DashboardPage() {
  const { canManage } = useAuth();
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({
    WASPADA: 0,
    BAHAYA: 0,
    KRITIS: 0,
    totalUnresolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [modulRes, zonaRes, alertRes, sumRes] = await Promise.all([
        modulApi.getAll(),
        zonaApi.getAll(),
        alertApi.getAll({ isResolved: false, limit: 5 }),
        alertApi.getSummary(),
      ]);

      if (modulRes.success) setModuls(modulRes.data);
      if (zonaRes.success) setZonas(zonaRes.data);
      if (alertRes.success) setAlerts(alertRes.data);
      if (sumRes.success) setSummary(sumRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh data every 60 seconds for real-time monitoring
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveAlert = async (id: string) => {
    try {
      await alertApi.resolve(id);
      loadDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  // Status distributions
  const waterStats = useMemo(() => {
    let aman = 0;
    let waspada = 0;
    let bahaya = 0;
    let kritis = 0;

    zonas.forEach((z) => {
      const st = z.latestReading?.statusTercatat;
      if (st === "KRITIS") kritis++;
      else if (st === "BAHAYA") bahaya++;
      else if (st === "WASPADA") waspada++;
      else aman++;
    });

    return { aman, waspada, bahaya, kritis };
  }, [zonas]);

  // Connectivity distributions (Heartbeat: Online <=120s, Delayed <=500s, Offline >500s)
  const connStats = useMemo(() => {
    let online = 0;
    let delayed = 0;
    let offline = 0;

    zonas.forEach((z) => {
      const conn = getDeviceConnectionStatus(z.latestReading?.waktuTerima);
      if (conn.status === "ONLINE") online++;
      else if (conn.status === "DELAYED") delayed++;
      else offline++;
    });

    return { online, delayed, offline };
  }, [zonas]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Real-time Water Monitoring
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Ringkasan status stasiun modul, level tangki air, dan peringatan dini bahaya banjir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            title="Refresh Data Sekarang"
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700">
          <span>⚠️ {error} — Pastikan backend Express berjalan di port 8000.</span>
          <button onClick={loadDashboardData} className="font-semibold underline ml-2">Coba Lagi</button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Modul</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{moduls.length}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">
              {moduls.filter((m) => m.status === "ONLINE").length} Online
            </span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">
              {moduls.filter((m) => m.status === "DELAYED").length} Delayed
            </span>
            <span>•</span>
            <Link href="/dashboard/modul" className="text-indigo-600 hover:underline">
              Kelola →
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Zona Sensor</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{zonas.length}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold">
              {zonas.filter((z) => z.status === "ONLINE").length} Online
            </span>
            <span>•</span>
            <span className="text-amber-600 font-semibold">
              {zonas.filter((z) => z.status === "DELAYED").length} Delayed
            </span>
            <span>•</span>
            <Link href="/dashboard/zona" className="text-indigo-600 hover:underline">
              Kelola →
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zona Normal / Aman</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{waterStats.aman}</p>
          <p className="text-xs text-slate-400 mt-2">Level air stabil di bawah batas</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alert Belum Ditangani</p>
          <p className={`text-3xl font-bold mt-2 ${summary.totalUnresolved > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
            {summary.totalUnresolved}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-amber-600 font-medium">{summary.WASPADA} Waspada</span>
            <span>•</span>
            <span className="text-red-600 font-medium">{summary.KRITIS} Kritis</span>
          </div>
        </div>
      </div>

      {/* Live Monitoring Water Level Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pemantauan Ketinggian Air Tangki (Live)</h2>
            <p className="text-xs text-slate-500">Status real-time per zona sensor dan konektivitas perangkat IoT</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Connectivity Summary Pills */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {connStats.online} Online
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {connStats.delayed} Delayed
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {connStats.offline} Offline
              </span>
            </div>
            <Link
              href="/dashboard/zona"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Lihat Semua Zona →
            </Link>
          </div>
        </div>

        {loading && zonas.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Memuat telemetri zona...</div>
        ) : zonas.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-semibold text-slate-700">Belum ada zona sensor terdaftar</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">Buat modul dan zona sensor terlebih dahulu.</p>
            <Link
              href="/dashboard/modul"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
            >
              Mulai Daftarkan Modul
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {zonas.map((zona) => {
              const reading = zona.latestReading;
              const conn = getDeviceConnectionStatus(reading?.waktuTerima);
              const currentLevel = reading ? Number(reading.ketinggianAir) : 0;
              const maxH = Number(zona.tinggiMaks) || 100;
              const pct = maxH > 0 ? Math.min(100, Math.max(0, (currentLevel / maxH) * 100)) : 0;
              const st = reading ? reading.statusTercatat : "AMAN";
              const badge = statusBadges[st] || statusBadges.AMAN;

              const modulLabel = zona.modul?.kodeIot
                ? `${zona.modul.kodeIot} — ${zona.modul.nama}`
                : zona.modul?.nama || "Modul Gateway";

              return (
                <div
                  key={zona.id}
                  className="rounded-2xl border border-slate-200/90 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {/* ── HEADER: Identitas Zona + Status Air ─── */}
                  <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                    {/* Kode + Nama Zona */}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {zona.kodeZona}
                      </span>
                      <h3
                        className="font-bold text-slate-900 text-sm leading-snug mt-0.5 truncate"
                        title={zona.namaZona}
                      >
                        {zona.namaZona}
                      </h3>
                      <p
                        className="text-[11px] text-slate-400 font-medium mt-0.5 truncate"
                        title={modulLabel}
                      >
                        📡 {modulLabel}
                      </p>
                    </div>

                    {/* Badge Status Level Air */}
                    <span
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border mt-0.5"
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        borderColor: badge.dot + "50",
                      }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          st === "KRITIS" || st === "BAHAYA" ? "animate-pulse" : ""
                        }`}
                        style={{ background: badge.dot }}
                      />
                      {st}
                    </span>
                  </div>

                  {/* Colored accent line bawah header */}
                  <div
                    className="mx-4 h-px rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${badge.dot}70, ${badge.dot}10)`,
                    }}
                  />

                  {/* ── BODY: Angka Level + Progress Bar ──────── */}
                  <div className="px-4 py-4 flex-1 space-y-3">
                    {/* Nilai level + persen */}
                    <div className="flex items-end justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="text-4xl font-black tabular-nums leading-none"
                          style={{ color: reading ? badge.dot : "#94a3b8" }}
                        >
                          {currentLevel.toFixed(1)}
                        </span>
                        <span className="text-sm font-semibold text-slate-500 mb-0.5">
                          {zona.satuan}
                        </span>
                      </div>
                      <div className="text-right leading-none">
                        <div className="flex items-baseline gap-0.5 justify-end">
                          <span className="text-2xl font-black text-slate-700 tabular-nums">
                            {pct.toFixed(0)}
                          </span>
                          <span className="text-sm font-bold text-slate-400">%</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">kapasitas</p>
                      </div>
                    </div>

                    {/* Progress Bar dengan gradient */}
                    <div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background:
                              st === "KRITIS"
                                ? "linear-gradient(90deg,#f97316,#ef4444)"
                                : st === "BAHAYA"
                                ? "linear-gradient(90deg,#f59e0b,#f97316)"
                                : st === "WASPADA"
                                ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                                : "linear-gradient(90deg,#34d399,#10b981)",
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-mono">
                        <span>0</span>
                        <span>{zona.tinggiMaks} {zona.satuan}</span>
                      </div>
                    </div>

                    {/* Voltase */}
                    <div className="text-[11px] text-slate-500">
                      {reading ? (
                        <>
                          ⚡ Voltase:{" "}
                          <span className="font-bold text-slate-700 font-mono">
                            {Number(reading.voltaseRaw).toFixed(2)} V
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada transmisi sensor</span>
                      )}
                    </div>
                  </div>

                  {/* ── FOOTER: Koneksi + Waktu Update ────────── */}
                  <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Badge koneksi (kompak: hanya status teks + dot) */}
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                      style={{
                        background: conn.badge.bg,
                        color: conn.badge.text,
                        borderColor: conn.badge.border,
                      }}
                      title={conn.label}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          conn.status === "ONLINE" ? "animate-pulse" : ""
                        }`}
                        style={{ background: conn.badge.dot }}
                      />
                      {conn.status}
                    </span>

                    {/* Durasi elapsed + jam update */}
                    <div className="text-right text-[10px] text-slate-400 font-mono leading-tight">
                      {reading ? (
                        <>
                          <span className="block font-medium text-slate-500">
                            {new Date(reading.waktuTerima).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="block text-slate-400">
                            {new Date(reading.waktuTerima).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Alerts Feed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Insiden & Peringatan Terkini</h2>
            <p className="text-xs text-slate-500">Alert aktif yang membutuhkan konfirmasi petugas</p>
          </div>
          <Link
            href="/dashboard/alerts"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Lihat Semua Alert ({summary.totalUnresolved}) →
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada peringatan aktif saat ini. Semua zona terpantau aman.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((al) => (
              <div key={al.id} className="p-4 px-6 flex items-center justify-between gap-4 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {al.levelStatus === "KRITIS" ? "🔴" : al.levelStatus === "BAHAYA" ? "🟠" : "🟡"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{al.levelStatus}</span>
                      <span className="text-xs text-slate-500">• {al.namaZona || `Zona ${al.idZona}`}</span>
                      <span className="text-xs text-slate-400">
                        ({new Date(al.waktuAlert).toLocaleString("id-ID")})
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">{al.pesanAlert}</p>
                  </div>
                </div>

                {canManage && (
                  <button
                    onClick={() => handleResolveAlert(al.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    Tandai Selesai ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
