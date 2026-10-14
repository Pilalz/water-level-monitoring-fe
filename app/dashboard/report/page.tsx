"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  sensorDataApi,
  modulApi,
  zonaApi,
  SensorDataReading,
  Modul,
  Zona,
  WaterLevelStatus,
} from "@/lib/api";

const statusBadges: Record<
  WaterLevelStatus,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  AMAN: {
    bg: "rgba(16, 185, 129, 0.1)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.25)",
    dot: "#10b981",
    label: "AMAN",
  },
  WASPADA: {
    bg: "rgba(245, 158, 11, 0.1)",
    text: "#d97706",
    border: "rgba(245, 158, 11, 0.25)",
    dot: "#f59e0b",
    label: "WASPADA",
  },
  BAHAYA: {
    bg: "rgba(249, 115, 22, 0.1)",
    text: "#ea580c",
    border: "rgba(249, 115, 22, 0.25)",
    dot: "#f97316",
    label: "BAHAYA",
  },
  KRITIS: {
    bg: "rgba(239, 68, 68, 0.1)",
    text: "#dc2626",
    border: "rgba(239, 68, 68, 0.25)",
    dot: "#ef4444",
    label: "KRITIS",
  },
};

export default function ReportSensorDataPage() {
  const [data, setData] = useState<SensorDataReading[]>([]);
  const [moduls, setModuls] = useState<Modul[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filter states
  const [filterModulId, setFilterModulId] = useState<string>("ALL");
  const [filterZonaId, setFilterZonaId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Load modules and zones list once for dropdown filters
  useEffect(() => {
    async function initOptions() {
      try {
        const [modulRes, zonaRes] = await Promise.all([
          modulApi.getAll(),
          zonaApi.getAll(),
        ]);
        if (modulRes.success) setModuls(modulRes.data);
        if (zonaRes.success) setZonas(zonaRes.data);
      } catch (err) {
        console.error("Gagal memuat opsi filter modul/zona:", err);
      }
    }
    initOptions();
  }, []);

  // Filtered zonas based on selected modul
  const filteredZonaOptions = useMemo(() => {
    if (filterModulId === "ALL") return zonas;
    return zonas.filter((z) => z.idModul === filterModulId);
  }, [zonas, filterModulId]);

  // Load Sensor Data
  const loadSensorData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        page: number;
        limit: number;
        idModul?: string;
        idZona?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
      } = {
        page,
        limit,
      };

      if (filterZonaId !== "ALL") {
        params.idZona = filterZonaId;
      } else if (filterModulId !== "ALL") {
        params.idModul = filterModulId;
      }

      if (filterStatus !== "ALL") {
        params.status = filterStatus;
      }

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await sensorDataApi.getAll(params);

      if (res.success) {
        setData(res.data);
        if (res.pagination) {
          setTotalRecords(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        } else {
          setTotalRecords(res.data.length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data laporan sensor");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterModulId, filterZonaId, filterStatus, startDate, endDate]);

  useEffect(() => {
    loadSensorData();
  }, [loadSensorData]);

  // Handle Modul Change: reset zona if it does not belong to selected module
  const handleModulChange = (newModulId: string) => {
    setFilterModulId(newModulId);
    setFilterZonaId("ALL");
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterModulId("ALL");
    setFilterZonaId("ALL");
    setFilterStatus("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Quick Preset Date Filters
  const setDatePreset = (preset: "today" | "7days" | "30days" | "all") => {
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else {
      const today = new Date();
      const endStr = today.toISOString().split("T")[0];
      let startD = new Date();

      if (preset === "today") {
        startD = today;
      } else if (preset === "7days") {
        startD.setDate(today.getDate() - 7);
      } else if (preset === "30days") {
        startD.setDate(today.getDate() - 30);
      }

      const startStr = startD.toISOString().split("T")[0];
      setStartDate(startStr);
      setEndDate(endStr);
    }
    setPage(1);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      "Waktu Sensor",
      "Waktu Terima",
      "Kode Modul",
      "Nama Modul",
      "Kode Zona",
      "Nama Zona",
      "Voltase (V)",
      "Level Ketinggian",
      "Satuan",
      "Persen (%)",
      "Status",
    ];

    const rows = data.map((item) => [
      `"${new Date(item.waktuRekam).toLocaleString("id-ID")}"`,
      `"${new Date(item.waktuTerima).toLocaleString("id-ID")}"`,
      `"${item.modulKodeIot || "-"}"`,
      `"${item.modulNama || "-"}"`,
      `"${item.kodeZona || "-"}"`,
      `"${item.namaZona || "-"}"`,
      item.voltaseRaw !== null ? item.voltaseRaw : "",
      item.ketinggianAir,
      `"${item.satuan || "cm"}"`,
      item.persen !== null && item.persen !== undefined ? `${item.persen}%` : "",
      `"${item.statusTercatat}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `laporan_telemetri_sensor_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary Metrics from current data
  const summaryMetrics = useMemo(() => {
    const total = data.length;
    if (total === 0) return { avgLevel: 0, nonNormalCount: 0, latestTime: "-" };

    const sumLevel = data.reduce((acc, curr) => acc + (Number(curr.ketinggianAir) || 0), 0);
    const avg = Math.round((sumLevel / total) * 10) / 10;
    const nonNormal = data.filter((d) => d.statusTercatat !== "AMAN").length;
    const latest = new Date(data[0].waktuRekam).toLocaleTimeString("id-ID");

    return { avgLevel: avg, nonNormalCount: nonNormal, latestTime: latest };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <span>Audit & Monitoring</span>
            <span>•</span>
            <span>Histori Transmisi Telemetri</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Laporan Data Sensor
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
            Rekap histori data pembacaan telemetri level air dari seluruh modul IoT dan zona sensor.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSensorData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Record</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{totalRecords.toLocaleString("id-ID")}</span>
            <span className="text-xs text-slate-400">log</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rata-rata Level</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{summaryMetrics.avgLevel}</span>
            <span className="text-xs text-slate-400">cm (hlm ini)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status Berisiko</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-black ${
                summaryMetrics.nonNormalCount > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {summaryMetrics.nonNormalCount}
            </span>
            <span className="text-xs text-slate-400">log abnormal</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transmisi Terbaru</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800">{summaryMetrics.latestTime}</span>
            <span className="text-xs text-slate-400">WIB</span>
          </div>
        </div>
      </div>

      {/* Filter Control Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Data Sensor</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick date presets */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-[11px] font-medium text-slate-600">
              <button
                onClick={() => setDatePreset("today")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  startDate && startDate === endDate ? "bg-white text-indigo-600 font-bold shadow-xs" : "hover:text-slate-900"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setDatePreset("7days")}
                className="px-2.5 py-1 rounded-lg transition-colors hover:text-slate-900"
              >
                7 Hari
              </button>
              <button
                onClick={() => setDatePreset("30days")}
                className="px-2.5 py-1 rounded-lg transition-colors hover:text-slate-900"
              >
                30 Hari
              </button>
              <button
                onClick={() => setDatePreset("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  !startDate && !endDate ? "bg-white text-indigo-600 font-bold shadow-xs" : "hover:text-slate-900"
                }`}
              >
                Semua
              </button>
            </div>

            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Filter Modul */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Modul IoT
            </label>
            <select
              value={filterModulId}
              onChange={(e) => handleModulChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">Semua Modul</option>
              {moduls.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.kodeIot} - {m.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Zona */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Zona Sensor
            </label>
            <select
              value={filterZonaId}
              onChange={(e) => {
                setFilterZonaId(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">Semua Zona Sensor</option>
              {filteredZonaOptions.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.kodeZona} - {z.namaZona}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Status Level
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="AMAN">AMAN (Normal)</option>
              <option value="WASPADA">WASPADA (Warning)</option>
              <option value="BAHAYA">BAHAYA (Danger)</option>
              <option value="KRITIS">KRITIS (Critical)</option>
            </select>
          </div>

          {/* Tanggal Mulai */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Tanggal Sampai */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Head Bar with Limit Selector */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daftar Telemetri Sensor
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
              {totalRecords} data
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Tampilkan per halaman:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="m-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <strong>Gagal Memuat Data:</strong> {error}
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Waktu Terima</th>
                <th className="py-3.5 px-4">Waktu Sensor</th>
                <th className="py-3.5 px-4">Modul</th>
                <th className="py-3.5 px-4">Zona</th>
                <th className="py-3.5 px-4 text-right">Voltase</th>
                <th className="py-3.5 px-4 text-right">Level</th>
                <th className="py-3.5 px-4 min-w-[140px]">% Ketinggian</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="w-6 h-6 animate-spin text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                      <span>Memuat histori data sensor...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
                        📊
                      </div>
                      <p className="text-sm font-bold text-slate-700">Tidak ada data sensor ditemukan</p>
                      <p className="text-xs text-slate-400 text-center">
                        Tidak ada log telemetri yang cocok dengan kriteria filter yang Anda pilih.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                      >
                        Reset Kriteria Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const badge = statusBadges[item.statusTercatat] || statusBadges.AMAN;
                  
                  const dateObjTerima = new Date(item.waktuTerima);
                  const formattedDateTerima = dateObjTerima.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTimeTerima = dateObjTerima.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  const dateObjSensor = new Date(item.waktuRekam);
                  const formattedDateSensor = dateObjSensor.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTimeSensor = dateObjSensor.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  const pctValue =
                    item.persen !== null && item.persen !== undefined
                      ? item.persen
                      : item.tinggiMaks && item.tinggiMaks > 0
                      ? Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round(
                              (Number(item.ketinggianAir) / Number(item.tinggiMaks)) *
                                1000
                            ) / 10
                          )
                        )
                      : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Waktu Terima */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{formattedDateTerima}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{formattedTimeTerima} WIB</div>
                      </td>

                      {/* Waktu Sensor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{formattedDateSensor}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{formattedTimeSensor} WIB</div>
                      </td>

                      {/* Modul (Kode dan Nama) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {item.modulKodeIot && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.modulKodeIot}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 truncate max-w-[170px]" title={item.modulNama}>
                            {item.modulNama || "Modul Gateway"}
                          </span>
                        </div>
                      </td>

                      {/* Zona (Kode dan Nama) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {item.kodeZona && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {item.kodeZona}
                            </span>
                          )}
                          <span className="font-medium text-slate-800 truncate max-w-[170px]" title={item.namaZona}>
                            {item.namaZona || item.idZona}
                          </span>
                        </div>
                      </td>

                      {/* Voltase */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                        {item.voltaseRaw !== null ? (
                          <span className="font-semibold text-slate-700">
                            {Number(item.voltaseRaw).toFixed(2)}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">V</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Level (Ketinggian) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {Number(item.ketinggianAir).toFixed(1)}
                        </span>{" "}
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {item.satuan || "cm"}
                        </span>
                      </td>

                      {/* % Ketinggian */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {pctValue !== null ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span style={{ color: badge.text }}>{pctValue}%</span>
                              {item.tinggiMaks && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  / {item.tinggiMaks}
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(0, pctValue))}%`,
                                  background: badge.dot,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: badge.dot }}
                          />
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="p-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan{" "}
            <span className="font-bold text-slate-700">
              {data.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-bold text-slate-700">
              {Math.min(page * limit, totalRecords)}
            </span>{" "}
            dari <span className="font-bold text-slate-700">{totalRecords}</span> total data
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Sebelumnya
            </button>

            <span className="px-3 py-1.5 rounded-lg bg-slate-100 font-bold text-slate-800">
              {page} / {Math.max(1, totalPages)}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
