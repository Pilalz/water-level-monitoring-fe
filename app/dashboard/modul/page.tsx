"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { modulApi, Modul, ModulStatus } from "@/lib/api";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ONLINE: { bg: "rgba(16,185,129,0.12)", text: "#059669", dot: "#10b981", label: "Online" },
  DELAYED: { bg: "rgba(245,158,11,0.12)", text: "#d97706", dot: "#f59e0b", label: "Delayed" },
  OFFLINE: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", dot: "#ef4444", label: "Offline" },
  AKTIF: { bg: "rgba(16,185,129,0.12)", text: "#059669", dot: "#10b981", label: "Online" },
  MAINTENANCE: { bg: "rgba(245,158,11,0.12)", text: "#d97706", dot: "#f59e0b", label: "Delayed" },
  RUSAK: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", dot: "#ef4444", label: "Offline" },
};

export default function ModulPage() {
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Modul | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Modul | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formKodeIOT, setFormKodeIOT] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formLokasi, setFormLokasi] = useState("");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [formStatus, setFormStatus] = useState<ModulStatus>("AKTIF");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadModuls = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await modulApi.getAll({ includeZonas: true });
      if (res.success) {
        setModuls(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data modul";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModuls();
  }, []);

  const openCreateModal = () => {
    setFormKodeIOT("");
    setFormNama("");
    setFormLokasi("");
    setFormKeterangan("");
    setFormStatus("AKTIF");
    setIsCreateOpen(true);
  };

  const openEditModal = (modul: Modul) => {
    setEditTarget(modul);
    setFormKodeIOT(modul.kodeIot);
    setFormNama(modul.nama);
    setFormLokasi(modul.lokasi || "");
    setFormKeterangan(modul.keterangan || "");
    setFormStatus(modul.status);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      showToast("Nama modul wajib diisi", "error");
      return;
    }

    if (!formKodeIOT.trim()) {
      showToast("ID modul wajib diisi", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await modulApi.create({
        kode_iot: formKodeIOT.trim(),
        nama: formNama.trim(),
        lokasi: formLokasi.trim() || undefined,
        keterangan: formKeterangan.trim() || undefined,
        status: formStatus,
      });

      if (res.success) {
        showToast("Modul berhasil ditambahkan!", "success");
        setIsCreateOpen(false);
        loadModuls();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal membuat modul", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!formNama.trim()) {
      showToast("Nama modul wajib diisi", "error");
      return;
    }

    if (!formKodeIOT.trim()) {
      showToast("ID modul wajib diisi", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await modulApi.update(editTarget.id, {
        kode_iot: formKodeIOT.trim(),
        nama: formNama.trim(),
        lokasi: formLokasi.trim() || null,
        keterangan: formKeterangan.trim() || null,
        status: formStatus,
      });

      if (res.success) {
        showToast("Modul berhasil diperbarui!", "success");
        setEditTarget(null);
        loadModuls();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal mengupdate modul", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await modulApi.delete(deleteTarget.id);
      showToast(`Modul '${deleteTarget.nama} '(' ${deleteTarget.kodeIot} ') berhasil dihapus`, "success");
      setDeleteTarget(null);
      loadModuls();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus modul", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Moduls
  const filteredModuls = useMemo(() => {
    return moduls.filter((m) => {
      const matchSearch =
        m.nama.toLowerCase().includes(search.toLowerCase()) ||
        (m.lokasi && m.lokasi.toLowerCase().includes(search.toLowerCase())) ||
        m.kodeIot.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [moduls, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = moduls.length;
    const online = moduls.filter((m) => m.status === "ONLINE").length;
    const delayed = moduls.filter((m) => m.status === "DELAYED").length;
    const offline = moduls.filter((m) => m.status === "OFFLINE").length;
    return { total, online, delayed, offline };
  }, [moduls]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <span>Manajemen Perangkat</span>
            <span>•</span>
            <span>Gateway Hardware</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Daftar Modul Stasiun
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Kelola modul mikrokontroler & stasiun induk yang mengawasi zona sensor air.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Modul Baru
        </button>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Modul", count: stats.total, color: "#6366f1", bg: "#e0e7ff" },
          { label: "Modul Online", count: stats.online, color: "#10b981", bg: "#d1fae5" },
          { label: "Modul Delayed", count: stats.delayed, color: "#f59e0b", bg: "#fef3c7" },
          { label: "Modul Offline", count: stats.offline, color: "#ef4444", bg: "#fee2e2" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>
                {s.count}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: s.bg, color: s.color }}
            >
              {s.count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
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
            placeholder="Cari nama modul, lokasi, atau ID..."
            className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["ALL", "ONLINE", "DELAYED", "OFFLINE"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === tab
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab === "ALL" ? "Semua Status" : tab}
            </button>
          ))}
          <button
            onClick={loadModuls}
            title="Refresh Data"
            className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors ml-auto md:ml-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Menghubungkan ke API PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3 text-xl">
              ⚠️
            </div>
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button
              onClick={loadModuls}
              className="mt-3 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredModuls.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">Belum Ada Modul</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {search || statusFilter !== "ALL"
                ? "Tidak ada modul yang cocok dengan kriteria pencarian Anda."
                : "Database saat ini belum memiliki data modul gateway. Silakan buat modul pertama Anda."}
            </p>
            {!search && statusFilter === "ALL" && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                + Buat Modul Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Modul</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lokasi</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah Zona</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Keterangan</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModuls.map((modul) => {
                  const sc = statusConfig[modul.status] || statusConfig.AKTIF;
                  const zoneCount = modul._count?.zonas ?? modul.zonas?.length ?? 0;

                  return (
                    <tr key={modul.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-slate-900">{modul.nama}</div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-xs">{modul.kodeIot}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {modul.lokasi || <span className="text-slate-400 italic">- Tidak diset -</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/zona?idModul=${modul.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <span>{zoneCount} Zona</span>
                          <span>→</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {modul.keterangan || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(modul)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Modul"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(modul)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Modul"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Tambah Modul Baru</h3>
                <p className="text-xs text-slate-500">Mendaftarkan gateway hardware ke database</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  ID Modul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formKodeIOT}
                  onChange={(e) => setFormKodeIOT(e.target.value)}
                  placeholder="Contoh: 001"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Nama Modul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Modul Induk Gedung A"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Lokasi Pemasangan
                </label>
                <input
                  type="text"
                  value={formLokasi}
                  onChange={(e) => setFormLokasi(e.target.value)}
                  placeholder="Contoh: Basement Ruang Pompa"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Status Operasional
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ModulStatus)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs font-medium"
                >
                  <option value="AKTIF">🟢 AKTIF (Normal Operational)</option>
                  <option value="MAINTENANCE">🟡 MAINTENANCE (Sedang Kalibrasi/Perbaikan)</option>
                  <option value="RUSAK">🔴 RUSAK (Hardware Failure)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Keterangan / Catatan Teknis
                </label>
                <textarea
                  rows={3}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Catatan serial number, IP address, atau tipe MCU..."
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Modul"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Edit Modul</h3>
                <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{editTarget.id}</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  ID Modul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formKodeIOT}
                  onChange={(e) => setFormKodeIOT(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Nama Modul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={formLokasi}
                  onChange={(e) => setFormLokasi(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ModulStatus)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs font-medium"
                >
                  <option value="AKTIF">🟢 AKTIF</option>
                  <option value="MAINTENANCE">🟡 MAINTENANCE</option>
                  <option value="RUSAK">🔴 RUSAK</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Keterangan
                </label>
                <textarea
                  rows={3}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Update Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
              🗑️
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Hapus Modul</h3>
            <p className="text-sm text-slate-600 mt-2">
              Apakah Anda yakin ingin menghapus modul <strong className="text-slate-900">&quot;{deleteTarget.nama} ({deleteTarget.kodeIot})&quot;</strong>?
            </p>
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ <strong>Peringatan Cascade:</strong> Seluruh zona, riwayat sensor, dan log alert yang terhubung dengan modul ini akan otomatis terhapus dari database.
            </div>

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
                {submitting ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
