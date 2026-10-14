"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { zonaApi, modulApi, Zona, Modul, ZonaStatus, WaterLevelStatus, getDeviceConnectionStatus } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const waterStatusColors: Record<WaterLevelStatus, { bg: string; text: string; dot: string }> = {
  AMAN: { bg: "rgba(16,185,129,0.1)", text: "#059669", dot: "#10b981" },
  WASPADA: { bg: "rgba(245,158,11,0.1)", text: "#d97706", dot: "#f59e0b" },
  BAHAYA: { bg: "rgba(249,115,22,0.1)", text: "#ea580c", dot: "#f97316" },
  KRITIS: { bg: "rgba(239,68,68,0.1)", text: "#dc2626", dot: "#ef4444" },
};

function ZonaContent() {
  const { canManage } = useAuth();
  const searchParams = useSearchParams();
  const initialModulFilter = searchParams.get("idModul") || "ALL";

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [modulFilter, setModulFilter] = useState(initialModulFilter);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Zona | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Zona | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Zona | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formIdModul, setFormIdModul] = useState("");
  const [formKodeZona, setFormKodeZona] = useState("");
  const [formNamaZona, setFormNamaZona] = useState("");
  const [formTinggiMaks, setFormTinggiMaks] = useState("200");
  const [formSatuan, setFormSatuan] = useState("cm");
  const [formBatasWaspada, setFormBatasWaspada] = useState("120");
  const [formBatasBahaya, setFormBatasBahaya] = useState("160");
  const [formBatasKritis, setFormBatasKritis] = useState("185");
  const [formVoltMin, setFormVoltMin] = useState("0.5");
  const [formVoltMaks, setFormVoltMaks] = useState("4.5");
  const [formStatus, setFormStatus] = useState<ZonaStatus>("AKTIF");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async (deleted = showDeleted) => {
    try {
      setLoading(true);
      setError(null);
      const [zonaRes, modulRes] = await Promise.all([
        zonaApi.getAll({ includeDeleted: deleted }),
        modulApi.getAll(),
      ]);

      if (zonaRes.success) setZonas(zonaRes.data);
      if (modulRes.success) setModuls(modulRes.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data zona";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(showDeleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const openCreateModal = () => {
    setFormIdModul(moduls[0]?.id || "");
    setFormKodeZona("");
    setFormNamaZona("");
    setFormTinggiMaks("200");
    setFormSatuan("cm");
    setFormBatasWaspada("120");
    setFormBatasBahaya("160");
    setFormBatasKritis("185");
    setFormVoltMin("0.5");
    setFormVoltMaks("4.5");
    setFormStatus("AKTIF");
    setIsCreateOpen(true);
  };

  const openEditModal = (zona: Zona) => {
    setEditTarget(zona);
    setFormIdModul(zona.idModul);
    setFormKodeZona(zona.kodeZona);
    setFormNamaZona(zona.namaZona);
    setFormTinggiMaks(String(zona.tinggiMaks));
    setFormSatuan(zona.satuan || "cm");
    setFormBatasWaspada(String(zona.batasWaspada));
    setFormBatasBahaya(String(zona.batasBahaya));
    setFormBatasKritis(String(zona.batasKritis));
    setFormVoltMin(zona.voltMin !== null ? String(zona.voltMin) : "");
    setFormVoltMaks(zona.voltMaks !== null ? String(zona.voltMaks) : "");
    setFormStatus(zona.status);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdModul) {
      showToast("Pilih modul induk terlebih dahulu", "error");
      return;
    }
    if (!formKodeZona.trim()) {
      showToast("Kode zona wajib diisi", "error");
      return;
    }
    if (!formNamaZona.trim()) {
      showToast("Nama zona wajib diisi", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await zonaApi.create({
        idModul: formIdModul,
        kodeZona: formKodeZona.trim(),
        namaZona: formNamaZona.trim(),
        tinggiMaks: parseFloat(formTinggiMaks),
        satuan: formSatuan,
        batasWaspada: parseFloat(formBatasWaspada),
        batasBahaya: parseFloat(formBatasBahaya),
        batasKritis: parseFloat(formBatasKritis),
        voltMin: formVoltMin ? parseFloat(formVoltMin) : null,
        voltMaks: formVoltMaks ? parseFloat(formVoltMaks) : null,
        status: formStatus,
      });

      if (res.success) {
        showToast("Zona sensor berhasil dibuat!", "success");
        setIsCreateOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal membuat zona", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setSubmitting(true);
      const res = await zonaApi.update(editTarget.id, {
        kodeZona: formKodeZona.trim(),
        namaZona: formNamaZona.trim(),
        tinggiMaks: parseFloat(formTinggiMaks),
        satuan: formSatuan,
        batasWaspada: parseFloat(formBatasWaspada),
        batasBahaya: parseFloat(formBatasBahaya),
        batasKritis: parseFloat(formBatasKritis),
        voltMin: formVoltMin ? parseFloat(formVoltMin) : null,
        voltMaks: formVoltMaks ? parseFloat(formVoltMaks) : null,
        status: formStatus,
      });

      if (res.success) {
        showToast("Zona sensor berhasil diupdate!", "success");
        setEditTarget(null);
        loadData();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal mengupdate zona", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await zonaApi.delete(deleteTarget.id);
      showToast(`Zona '${deleteTarget.namaZona}' berhasil dihapus (soft delete)`, "success");
      setDeleteTarget(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus zona", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      setSubmitting(true);
      await zonaApi.restore(restoreTarget.id);
      showToast(`Zona '${restoreTarget.namaZona}' berhasil dipulihkan`, "success");
      setRestoreTarget(null);
      loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal memulihkan zona", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Zonas
  const filteredZonas = useMemo(() => {
    return zonas.filter((z) => {
      const matchSearch =
        z.namaZona.toLowerCase().includes(search.toLowerCase()) ||
        (z.modul?.nama && z.modul.nama.toLowerCase().includes(search.toLowerCase())) ||
        z.kodeZona.toLowerCase().includes(search.toLowerCase());
      const matchDeleted = showDeleted ? true : !z.deletedAt;
      const matchModul = modulFilter === "ALL" || z.idModul === modulFilter;
      const matchStatus = statusFilter === "ALL" || z.status === statusFilter;
      return matchSearch && matchModul && matchStatus && matchDeleted;
    });
  }, [zonas, search, modulFilter, statusFilter, showDeleted]);

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
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-1">
            <span>Manajemen Zona</span>
            <span>•</span>
            <span>Konfigurasi Sensor & Threshold</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Zona Pemantauan Air
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Atur ambang batas Waspada, Bahaya, Kritis, dan kalibrasi sensor per tangki / zona.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            disabled={moduls.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #06b6d4, #0284c7)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Zona Sensor
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama zona atau modul..."
            className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filter Modul Dropdown */}
          <select
            value={modulFilter}
            onChange={(e) => setModulFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
          >
            <option value="ALL">Semua Modul Induk</option>
            {moduls.map((m) => (
              <option key={m.id} value={m.id}>
                Modul: {m.nama}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
          >
            <option value="ALL">Semua Status</option>
            <option value="ONLINE">Status: ONLINE</option>
            <option value="DELAYED">Status: DELAYED</option>
            <option value="OFFLINE">Status: OFFLINE</option>
          </select>

          <button
            onClick={() => loadData()}
            title="Refresh Data"
            className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {canManage && (
            <button
              onClick={() => setShowDeleted((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                showDeleted ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title={showDeleted ? "Sembunyikan item terhapus" : "Tampilkan item terhapus"}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {showDeleted ? "Sembunyikan Dihapus" : "Tampilkan Dihapus"}
            </button>
          )}
        </div>
      </div>

      {/* Warning jika belum ada Modul */}
      {moduls.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <span className="text-amber-500 text-xl">ℹ️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Belum ada Modul Hardware yang terdaftar</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Setiap zona pemantauan membutuhkan Modul Induk sebagai relasi wajib. Silakan buat modul terlebih dahulu.
            </p>
            <Link
              href="/dashboard/modul"
              className="inline-block mt-2 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Ke Halaman Modul →
            </Link>
          </div>
        </div>
      )}

      {/* Zones Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Memuat data zona dari database...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 text-xs font-semibold text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredZonas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">Tidak Ada Zona Pemantauan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {search || modulFilter !== "ALL" || statusFilter !== "ALL"
                ? "Tidak ada zona yang cocok dengan filter yang dipilih."
                : "Belum ada zona sensor yang didaftarkan."}
            </p>
            {canManage && moduls.length > 0 && !search && modulFilter === "ALL" && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-xl hover:bg-cyan-700 cursor-pointer"
              >
                + Buat Zona Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredZonas.map((zona) => {
              const reading = zona.latestReading;
              console.log('ini reading', reading);
              const currentWaterLevel = reading ? Number(reading.ketinggianAir) : 0;
              const maxH = Number(zona.tinggiMaks) || 100;
              const pct = Math.min(100, Math.max(0, (currentWaterLevel / maxH) * 100));
              const wsColor = reading ? waterStatusColors[reading.statusTercatat] : null;
              const conn = getDeviceConnectionStatus(reading?.waktuTerima);

              return (
                <div
                  key={zona.id}
                  className="p-6 hover:bg-slate-50/50 transition-colors"
                  style={zona.deletedAt ? { opacity: 0.6, background: "rgba(239,68,68,0.03)" } : {}}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                          <span>({zona.kodeZona}) {zona.namaZona}</span>
                          {zona.deletedAt && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">
                              Dihapus
                            </span>
                          )}
                        </h3>

                        {/* Status Zona (ONLINE, DELAYED, OFFLINE) */}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                            zona.status === "ONLINE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : zona.status === "DELAYED"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                          title={conn.label}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              zona.status === "ONLINE"
                                ? "bg-emerald-500 animate-pulse"
                                : zona.status === "DELAYED"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          {conn.label}
                        </span>

                        {zona.unresolvedAlertsCount && zona.unresolvedAlertsCount > 0 ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 font-semibold rounded-full animate-pulse">
                            ⚠️ {zona.unresolvedAlertsCount} Alert Aktif
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1.5">
                          Induk: <strong className="text-slate-700">({zona.modul?.kodeIot}) {zona.modul?.nama}</strong>
                          {zona.modul?.status && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                zona.modul.status === "ONLINE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : zona.modul.status === "DELAYED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                              title={`Status Agregat Modul: ${zona.modul.status}`}
                            >
                              Modul {zona.modul.status}
                            </span>
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          Kapasitas Maks: <strong className="text-slate-700">{zona.tinggiMaks} {zona.satuan}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-2 shrink-0">
                        {zona.deletedAt ? (
                          <button
                            onClick={() => setRestoreTarget(zona)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                            title="Pulihkan Zona"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Pulihkan
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(zona)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(zona)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Zona"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Visual Status & Threshold Bar */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">Pembacaan Sensor:</span>
                        {reading && wsColor ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-xs"
                            style={{ background: wsColor.bg, color: wsColor.text }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: wsColor.dot }} />
                            {currentWaterLevel} {zona.satuan} ({reading.statusTercatat})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada data masuk</span>
                        )}
                      </div>
                      <span className="text-slate-500 font-mono text-xs">
                        {pct.toFixed(1)}% dari kapasitas
                      </span>
                    </div>

                    {/* Progress Indicator */}
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct > (Number(zona.batasKritis) / maxH) * 100
                              ? "#ef4444"
                              : pct > (Number(zona.batasBahaya) / maxH) * 100
                              ? "#f97316"
                              : pct > (Number(zona.batasWaspada) / maxH) * 100
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      />
                    </div>

                    {/* Threshold Markers */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batas Waspada</span>
                        <span className="font-bold text-amber-600">≥ {zona.batasWaspada} {zona.satuan}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batas Bahaya</span>
                        <span className="font-bold text-orange-600">≥ {zona.batasBahaya} {zona.satuan}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batas Kritis</span>
                        <span className="font-bold text-red-600">≥ {zona.batasKritis} {zona.satuan}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-3 sm:col-span-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kalibrasi Volt</span>
                        <span className="font-medium text-slate-700">
                          {zona.voltMin ?? "-"}V s/d {zona.voltMaks ?? "-"}V
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Tambah Zona Sensor Baru</h3>
                <p className="text-xs text-slate-500">Mendaftarkan tangki/zona sensor di bawah modul gateway</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4"></div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Modul Induk <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formIdModul}
                    onChange={(e) => setFormIdModul(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  >
                    {moduls.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama} ({m.kodeIot || "Tanpa Lokasi"})
                      </option>
                    ))}
                  </select>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Kode Zona <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formKodeZona}
                    onChange={(e) => setFormKodeZona(e.target.value)}
                    placeholder="Contoh: 01"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Nama Zona <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNamaZona}
                    onChange={(e) => setFormNamaZona(e.target.value)}
                    placeholder="Contoh: Sensor Dalam"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Tinggi Maksimum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formTinggiMaks}
                    onChange={(e) => setFormTinggiMaks(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Satuan Pengukuran
                  </label>
                  <input
                    type="text"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    placeholder="cm / m / %"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  />
                </div>
              </div>

              {/* Thresholds Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ambang Batas Air (Threshold Alert)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1">
                      Waspada (≥)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formBatasWaspada}
                      onChange={(e) => setFormBatasWaspada(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-700 uppercase mb-1">
                      Bahaya (≥)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formBatasBahaya}
                      onChange={(e) => setFormBatasBahaya(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">
                      Kritis (≥)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formBatasKritis}
                      onChange={(e) => setFormBatasKritis(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Sensor Voltage Calibration */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Volt Min (V)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formVoltMin}
                    onChange={(e) => setFormVoltMin(e.target.value)}
                    placeholder="0.5"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Volt Maks (V)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formVoltMaks}
                    onChange={(e) => setFormVoltMaks(e.target.value)}
                    placeholder="4.5"
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Status Zona
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ZonaStatus)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  >
                    <option value="AKTIF">🟢 AKTIF</option>
                    <option value="NON-AKTIF">⚪ NON-AKTIF</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Zona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Edit Zona & Threshold</h3>
                <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{editTarget.id}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Kode Zona <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formKodeZona}
                  onChange={(e) => setFormKodeZona(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Nama Zona <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNamaZona}
                  onChange={(e) => setFormNamaZona(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Tinggi Maksimum
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formTinggiMaks}
                    onChange={(e) => setFormTinggiMaks(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Ambang Batas Air
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 uppercase mb-1">
                      Waspada (≥)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formBatasWaspada}
                      onChange={(e) => setFormBatasWaspada(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-700 uppercase mb-1">
                      Bahaya (≥)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formBatasBahaya}
                      onChange={(e) => setFormBatasBahaya(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-red-700 uppercase mb-1">
                      Kritis (≥)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={formBatasKritis}
                      onChange={(e) => setFormBatasKritis(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Volt Min (V)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formVoltMin}
                    onChange={(e) => setFormVoltMin(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Volt Maks (V)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formVoltMaks}
                    onChange={(e) => setFormVoltMaks(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ZonaStatus)}
                    className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 shadow-xs font-medium"
                  >
                    <option value="AKTIF">🟢 AKTIF</option>
                    <option value="NON-AKTIF">⚪ NON-AKTIF</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Update Zona"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
              🗑️
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Hapus Zona</h3>
            <p className="text-sm text-slate-600 mt-2">
              Hapus zona sensor <strong className="text-slate-900">&quot;{deleteTarget.namaZona}&quot;</strong> (soft delete)?
            </p>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Zona akan dinonaktifkan dan disembunyikan dari pemantauan aktif. Anda dapat memulihkannya kembali kapan saja melalui fitur &apos;Tampilkan Dihapus&apos;.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus (Soft Delete)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE MODAL */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-4">
              🔄
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Pulihkan Zona</h3>
            <p className="text-sm text-slate-600 mt-2">
              Pulihkan kembali zona sensor <strong className="text-slate-900">&quot;{restoreTarget.namaZona}&quot;</strong>?
            </p>
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              Zona akan kembali aktif dan muncul dalam daftar pemantauan operasional.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? "Memulihkan..." : "Ya, Pulihkan Zona"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ZonaPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">Memuat halaman zona...</div>}>
      <ZonaContent />
    </Suspense>
  );
}
