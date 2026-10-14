"use client";

import { useEffect, useState, useMemo } from "react";
import { userApi, User } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const roleBadgeConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ADMIN: { bg: "rgba(239, 68, 68, 0.12)", text: "#dc2626", dot: "#ef4444", label: "ADMIN" },
  OPERATOR: { bg: "rgba(245, 158, 11, 0.12)", text: "#d97706", dot: "#f59e0b", label: "OPERATOR" },
  VIEWER: { bg: "rgba(99, 102, 241, 0.12)", text: "#4f46e5", dot: "#6366f1", label: "VIEWER" },
};

export default function UserPage() {
  const { userId: currentUserId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter & Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<User | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<"ADMIN" | "OPERATOR" | "VIEWER">("VIEWER");
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadUsers = async (deleted = showDeleted) => {
    try {
      setLoading(true);
      setError(null);
      const res = await userApi.getAll({ includeDeleted: deleted });
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data user";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(showDeleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const openCreateModal = () => {
    setFormUsername("");
    setFormPassword("");
    setFormRole("VIEWER");
    setShowPassword(false);
    setIsCreateOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditTarget(user);
    setFormUsername(user.username);
    setFormPassword(""); // Password dikosongkan secara default saat edit
    setFormRole(user.role);
    setShowPassword(false);
  };

  const openDeleteModal = (user: User) => {
    setDeleteTarget(user);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      showToast("Username wajib diisi", "error");
      return;
    }
    if (!formPassword.trim() || formPassword.trim().length < 6) {
      showToast("Password wajib diisi minimal 6 karakter", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await userApi.create({
        username: formUsername.trim(),
        password: formPassword.trim(),
        role: formRole,
      });

      if (res.success) {
        showToast("User baru berhasil ditambahkan!", "success");
        setIsCreateOpen(false);
        loadUsers();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal membuat user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    if (!formUsername.trim()) {
      showToast("Username wajib diisi", "error");
      return;
    }

    if (formPassword.trim() && formPassword.trim().length < 6) {
      showToast("Password baru minimal 6 karakter", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload: { username: string; role: "ADMIN" | "OPERATOR" | "VIEWER"; password?: string } = {
        username: formUsername.trim(),
        role: formRole,
      };

      if (formPassword.trim() !== "") {
        payload.password = formPassword.trim();
      }

      const res = await userApi.update(editTarget.id, payload);

      if (res.success) {
        showToast("Data user berhasil diperbarui!", "success");
        setEditTarget(null);
        loadUsers();
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal mengupdate user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await userApi.delete(deleteTarget.id);
      showToast(`User '${deleteTarget.username}' berhasil dihapus (soft delete)`, "success");
      setDeleteTarget(null);
      loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      setSubmitting(true);
      await userApi.restore(restoreTarget.id);
      showToast(`User '${restoreTarget.username}' berhasil dipulihkan`, "success");
      setRestoreTarget(null);
      loadUsers();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal memulihkan user", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = u.username.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchDeleted = showDeleted ? true : !u.deletedAt;
      return matchSearch && matchRole && matchDeleted;
    });
  }, [users, search, roleFilter, showDeleted]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const admin = users.filter((u) => u.role === "ADMIN").length;
    const operator = users.filter((u) => u.role === "OPERATOR").length;
    const viewer = users.filter((u) => u.role === "VIEWER").length;
    return { total, admin, operator, viewer };
  }, [users]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

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
            <span>Manajemen User</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Daftar Pengguna Sistem
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Kelola hak akses akun Admin, Operator, dan Viewer.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow-sm transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah User Baru
        </button>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Pengguna", count: stats.total, color: "#6366f1", bg: "#e0e7ff" },
          { label: "User Admin", count: stats.admin, color: "#dc2626", bg: "#fee2e2" },
          { label: "User Operator", count: stats.operator, color: "#d97706", bg: "#fef3c7" },
          { label: "User Viewer", count: stats.viewer, color: "#4f46e5", bg: "#e0e7ff" },
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
            placeholder="Cari username..."
            className="w-full pl-9 pr-4 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["ALL", "ADMIN", "OPERATOR", "VIEWER"].map((tab) => (
            <button
              key={tab}
              onClick={() => setRoleFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                roleFilter === tab
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab === "ALL" ? "Semua Role" : tab}
            </button>
          ))}
          <button
            onClick={() => loadUsers()}
            title="Refresh Data"
            className="p-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors ml-auto md:ml-0 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setShowDeleted((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              showDeleted ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title={showDeleted ? "Sembunyikan user terhapus" : "Tampilkan user terhapus"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {showDeleted ? "Sembunyikan Dihapus" : "Tampilkan Dihapus"}
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Memuat data user dari database...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3 text-xl">
              ⚠️
            </div>
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-3 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-800">Tidak Ada Data User</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {search || roleFilter !== "ALL"
                ? "Tidak ada user yang cocok dengan kata kunci atau filter yang dipilih."
                : "Belum ada user yang terdaftar pada sistem."}
            </p>
            {!search && roleFilter === "ALL" && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 cursor-pointer"
              >
                + Buat User Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Akses</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Dibuat</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const rc = roleBadgeConfig[user.role] || roleBadgeConfig.VIEWER;
                  const isSelf = user.id === currentUserId;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors"
                      style={user.deletedAt ? { opacity: 0.6, background: "rgba(239,68,68,0.03)" } : {}}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white uppercase"
                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                          >
                            {user.username.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                              <span>{user.username}</span>
                              {user.deletedAt && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">
                                  Dihapus
                                </span>
                              )}
                              {isSelf && (
                                <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-200">
                                  Akun Anda
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: rc.bg, color: rc.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: rc.dot }} />
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.deletedAt ? (
                            <button
                              onClick={() => setRestoreTarget(user)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                              title="Pulihkan Akun User"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Pulihkan
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditModal(user)}
                                title="Edit User"
                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openDeleteModal(user)}
                                disabled={isSelf}
                                title={isSelf ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus User"}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 cursor-pointer disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
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

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Tambah User Baru</h3>
                <p className="text-xs text-slate-500">Mendaftarkan akun baru ke sistem dengan role tertentu</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: johndoe"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Role Akses <span className="text-red-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as "ADMIN" | "OPERATOR" | "VIEWER")}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs font-medium cursor-pointer"
                >
                  <option value="VIEWER">👁️ VIEWER (Hanya Memantau)</option>
                  <option value="OPERATOR">⚙️ OPERATOR (Input & Edit Modul/Zona)</option>
                  <option value="ADMIN">🛡️ ADMIN (Akses Penuh & Manajemen User)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Edit Pengguna</h3>
                <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{editTarget.username}</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Password Baru (Opsional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm text-slate-900 bg-white placeholder:text-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Isi hanya jika user ingin mereset password baru (min. 6 karakter).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Role Akses <span className="text-red-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as "ADMIN" | "OPERATOR" | "VIEWER")}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs font-medium cursor-pointer"
                >
                  <option value="VIEWER">👁️ VIEWER (Hanya Memantau)</option>
                  <option value="OPERATOR">⚙️ OPERATOR (Input & Edit Modul/Zona)</option>
                  <option value="ADMIN">🛡️ ADMIN (Akses Penuh & Manajemen User)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
              🗑️
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Hapus User</h3>
            <p className="text-sm text-slate-600 mt-2">
              Apakah Anda yakin ingin menonaktifkan akun user{" "}
              <strong className="text-slate-900">&quot;{deleteTarget.username}&quot;</strong> ({deleteTarget.role}) dengan soft delete?
            </p>
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              ⚠️ User ini tidak akan dapat login lagi ke sistem dashboard sampai akun dipulihkan kembali melalui menu &apos;Tampilkan Dihapus&apos;.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Menghapus..." : "Ya, Hapus (Soft Delete)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE USER MODAL */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-4">
              🔄
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Konfirmasi Pulihkan User</h3>
            <p className="text-sm text-slate-600 mt-2">
              Pulihkan kembali akun user{" "}
              <strong className="text-slate-900">&quot;{restoreTarget.username}&quot;</strong> ({restoreTarget.role})?
            </p>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              User ini akan dapat kembali login dan beraktivitas di dashboard sesuai hak akses role-nya.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Memulihkan..." : "Ya, Pulihkan Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
