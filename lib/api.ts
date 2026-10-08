// frontend/lib/api.ts
// Best-practice API client & Type definitions for Water Level Monitoring

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type ConnectionStatus = "ONLINE" | "DELAYED" | "OFFLINE";
export type ModulStatus = ConnectionStatus | "AKTIF" | "MAINTENANCE" | "RUSAK";
export type ZonaStatus = ConnectionStatus | "AKTIF" | "NON-AKTIF";
export type WaterLevelStatus = "AMAN" | "WASPADA" | "BAHAYA" | "KRITIS";

export interface Modul {
  id: string;
  kodeIot: string;
  nama: string;
  lokasi: string | null;
  keterangan: string | null;
  status: ModulStatus;
  createdAt: string;
  updatedAt: string;
  zonas?: Zona[];
  totalZonas?: number;
  onlineZonas?: number;
  delayedZonas?: number;
  offlineZonas?: number;
  _count?: {
    zonas: number;
  };
}

export interface Zona {
  id: string;
  idModul: string;
  kodeZona: string;
  namaZona: string;
  tinggiMaks: number | string;
  voltMin: number | string | null;
  voltMaks: number | string | null;
  satuan: string;
  batasWaspada: number | string;
  batasBahaya: number | string;
  batasKritis: number | string;
  status: ZonaStatus;
  createdAt: string;
  updatedAt: string;
  modul?: {
    id: string;
    kodeIot: string;
    nama: string;
    lokasi: string | null;
    status: string;
  };
  statusKoneksi?: DeviceConnectionStatus;
  diffSeconds?: number | null;
  latestReading?: {
    id: string;
    ketinggianAir: number;
    voltaseRaw: number | null;
    statusTercatat: WaterLevelStatus;
    waktuRekam: string;
  } | null;
  unresolvedAlertsCount?: number;
}

export type DeviceConnectionStatus = "ONLINE" | "DELAYED" | "OFFLINE";

export function getDeviceConnectionStatus(waktuRekam?: string | Date | null): {
  status: DeviceConnectionStatus;
  label: string;
  diffSeconds: number | null;
  badge: { bg: string; text: string; dot: string; border: string };
} {
  if (!waktuRekam) {
    return {
      status: "OFFLINE",
      label: "Offline",
      diffSeconds: null,
      badge: {
        bg: "rgba(100, 116, 139, 0.1)",
        text: "#64748b",
        dot: "#94a3b8",
        border: "rgba(148, 163, 184, 0.3)",
      },
    };
  }

  const now = Date.now();
  const recorded = new Date(waktuRekam).getTime();
  const diffSeconds = Math.max(0, Math.floor((now - recorded) / 1000));

  if (diffSeconds <= 120) {
    return {
      status: "ONLINE",
      label: `Online (${diffSeconds}s)`,
      diffSeconds,
      badge: {
        bg: "rgba(16, 185, 129, 0.12)",
        text: "#059669",
        dot: "#10b981",
        border: "rgba(16, 185, 129, 0.25)",
      },
    };
  }

  if (diffSeconds <= 500) {
    const min = Math.floor(diffSeconds / 60);
    const sec = diffSeconds % 60;
    return {
      status: "DELAYED",
      label: `Delayed (${min > 0 ? `${min}m ` : ""}${sec}s)`,
      diffSeconds,
      badge: {
        bg: "rgba(245, 158, 11, 0.12)",
        text: "#d97706",
        dot: "#f59e0b",
        border: "rgba(245, 158, 11, 0.25)",
      },
    };
  }

  const min = Math.floor(diffSeconds / 60);
  return {
    status: "OFFLINE",
    label: `Offline (${min}m lalu)`,
    diffSeconds,
    badge: {
      bg: "rgba(239, 68, 68, 0.12)",
      text: "#dc2626",
      dot: "#ef4444",
      border: "rgba(239, 68, 68, 0.25)",
    },
  };
}

export interface SensorDataReading {
  id: string;
  idZona: string;
  kodeZona?: string;
  namaZona?: string;
  tinggiMaks?: number | null;
  modulId?: string;
  modulKodeIot?: string;
  modulNama?: string;
  satuan?: string;
  ketinggianAir: number;
  persen?: number | null;
  voltaseRaw: number | null;
  statusTercatat: WaterLevelStatus;
  waktuRekam: string;
}

export interface LatestZonaData {
  idZona: string;
  namaZona: string;
  modulNama?: string;
  satuan: string;
  thresholds: {
    waspada: number;
    bahaya: number;
    kritis: number;
    tinggiMaks: number;
  };
  latestReading: {
    id: string;
    ketinggianAir: number;
    voltaseRaw: number | null;
    statusTercatat: WaterLevelStatus;
    waktuRekam: string;
  } | null;
}

export interface AlertLog {
  id: string;
  idZona: string;
  namaZona?: string;
  modulNama?: string;
  levelStatus: "WASPADA" | "BAHAYA" | "KRITIS";
  pesanAlert: string;
  isResolved: boolean;
  waktuAlert: string;
}

export interface AlertSummary {
  WASPADA: number;
  BAHAYA: number;
  KRITIS: number;
  totalUnresolved: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Generic Fetch Helper ─────────────────────────────────────────────────────

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `API error: ${response.status} ${response.statusText}`);
    }

    return result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Terjadi kesalahan jaringan atau server tidak dapat dihubungi");
  }
}

// ─── Modul API ────────────────────────────────────────────────────────────────

export const modulApi = {
  getAll: (params?: { status?: string; includeZonas?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.includeZonas) searchParams.append("includeZonas", "true");
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<ApiResponse<Modul[]>>(`/modul${query}`);
  },

  getById: (id: string) => {
    return apiRequest<ApiResponse<Modul>>(`/modul/${id}`);
  },

  create: (data: { kode_iot: string; nama: string; lokasi?: string; keterangan?: string; status?: ModulStatus }) => {
    return apiRequest<ApiResponse<Modul>>("/modul", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<{ kode_iot: string; nama: string; lokasi: string | null; keterangan: string | null; status: ModulStatus }>) => {
    return apiRequest<ApiResponse<Modul>>(`/modul/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiRequest<ApiResponse<null>>(`/modul/${id}`, {
      method: "DELETE",
    });
  },
};

// ─── Zona API ─────────────────────────────────────────────────────────────────

export const zonaApi = {
  getAll: (params?: { idModul?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.idModul) searchParams.append("idModul", params.idModul);
    if (params?.status) searchParams.append("status", params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<ApiResponse<Zona[]>>(`/zona${query}`);
  },

  getById: (id: string) => {
    return apiRequest<ApiResponse<Zona>>(`/zona/${id}`);
  },

  create: (data: {
    idModul: string;
    kodeZona: string;
    namaZona: string;
    tinggiMaks: number;
    satuan?: string;
    batasWaspada: number;
    batasBahaya: number;
    batasKritis: number;
    voltMin?: number | null;
    voltMaks?: number | null;
    status?: ZonaStatus;
  }) => {
    return apiRequest<ApiResponse<Zona>>("/zona", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (
    id: string,
    data: Partial<{
      kodeZona: string;
      namaZona: string;
      tinggiMaks: number;
      satuan: string;
      batasWaspada: number;
      batasBahaya: number;
      batasKritis: number;
      voltMin: number | null;
      voltMaks: number | null;
      status: ZonaStatus;
    }>
  ) => {
    return apiRequest<ApiResponse<Zona>>(`/zona/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiRequest<ApiResponse<null>>(`/zona/${id}`, {
      method: "DELETE",
    });
  },
};

// ─── Sensor Data API ──────────────────────────────────────────────────────────

export const sensorDataApi = {
  getLatest: (idZona?: string) => {
    const query = idZona ? `?idZona=${idZona}` : "";
    return apiRequest<ApiResponse<LatestZonaData[] | SensorDataReading>>(`/sensor-data/latest${query}`);
  },

  getAll: (params?: { idZona?: string; idModul?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.idZona) searchParams.append("idZona", params.idZona);
    if (params?.idModul) searchParams.append("idModul", params.idModul);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<ApiResponse<SensorDataReading[]>>(`/sensor-data${query}`);
  },

  record: (data: { idZona: string; ketinggianAir: number; voltaseRaw?: number | null; waktuRekam?: string }) => {
    return apiRequest<ApiResponse<{
      id: string;
      idZona: string;
      ketinggianAir: number;
      voltaseRaw: number | null;
      statusTercatat: WaterLevelStatus;
      waktuRekam: string;
      alertTriggered: boolean;
      alert?: { id: string; levelStatus: string; pesanAlert: string } | null;
    }>>("/sensor-data", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ─── Alert Log API ────────────────────────────────────────────────────────────

export const alertApi = {
  getAll: (params?: { idZona?: string; levelStatus?: string; isResolved?: boolean; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.idZona) searchParams.append("idZona", params.idZona);
    if (params?.levelStatus) searchParams.append("levelStatus", params.levelStatus);
    if (params?.isResolved !== undefined) searchParams.append("isResolved", String(params.isResolved));
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<ApiResponse<AlertLog[]>>(`/alerts${query}`);
  },

  getSummary: () => {
    return apiRequest<ApiResponse<AlertSummary>>("/alerts/summary");
  },

  resolve: (id: string) => {
    return apiRequest<ApiResponse<{ id: string; isResolved: boolean }>>(`/alerts/${id}/resolve`, {
      method: "PATCH",
    });
  },
};
