// frontend/lib/api.ts
// Best-practice API client & Type definitions for Water Level Monitoring
import Cookies from "js-cookie";

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
  deletedAt: string | null;
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
  deletedAt: string | null;
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
    waktuTerima: string;
  } | null;
  unresolvedAlertsCount?: number;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export type DeviceConnectionStatus = "ONLINE" | "DELAYED" | "OFFLINE";

/**
 * Format durasi elapsed time menjadi label yang human-readable,
 * dengan satuan yang menyesuaikan: detik → menit → jam → hari → minggu → bulan → tahun
 */
function formatElapsedDuration(diffSeconds: number): string {
  if (diffSeconds < 60) {
    return `${diffSeconds} detik`;
  }

  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes} mnt ${seconds} dtk` : `${minutes} mnt`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours < 24) {
    return remMinutes > 0 ? `${hours} jam ${remMinutes} mnt` : `${hours} jam`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;

  if (days < 7) {
    return remHours > 0 ? `${days} hari ${remHours} jam` : `${days} hari`;
  }

  const weeks = Math.floor(days / 7);
  const remDays = days % 7;

  if (weeks < 4) {
    return remDays > 0 ? `${weeks} minggu ${remDays} hari` : `${weeks} minggu`;
  }

  const months = Math.floor(days / 30);
  const remWeeks = Math.floor((days % 30) / 7);

  if (months < 12) {
    return remWeeks > 0 ? `${months} bulan ${remWeeks} minggu` : `${months} bulan`;
  }

  const years = Math.floor(days / 365);
  const remMonths = Math.floor((days % 365) / 30);
  return remMonths > 0 ? `${years} tahun ${remMonths} bulan` : `${years} tahun`;
}

export function getDeviceConnectionStatus(waktuTerima?: string | Date | null): {
  status: DeviceConnectionStatus;
  label: string;
  diffSeconds: number | null;
  badge: { bg: string; text: string; dot: string; border: string };
} {
  if (!waktuTerima) {
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
  const recorded = new Date(waktuTerima).getTime();
  const diffSeconds = Math.max(0, Math.floor((now - recorded) / 1000));

  if (diffSeconds <= 120) {
    return {
      status: "ONLINE",
      label: `Online · ${formatElapsedDuration(diffSeconds)} lalu`,
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
    return {
      status: "DELAYED",
      label: `Delayed · ${formatElapsedDuration(diffSeconds)} lalu`,
      diffSeconds,
      badge: {
        bg: "rgba(245, 158, 11, 0.12)",
        text: "#d97706",
        dot: "#f59e0b",
        border: "rgba(245, 158, 11, 0.25)",
      },
    };
  }

  return {
    status: "OFFLINE",
    label: `Offline · ${formatElapsedDuration(diffSeconds)} lalu`,
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
  waktuTerima: string;
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
    waktuTerima: string;
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
  
  const token = typeof window !== "undefined" ? Cookies.get("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
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
  getAll: (params?: { status?: string; includeZonas?: boolean; includeDeleted?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.includeZonas) searchParams.append("includeZonas", "true");
    if (params?.includeDeleted) searchParams.append("includeDeleted", "true");
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

  restore: (id: string) => {
    return apiRequest<ApiResponse<Modul>>(`/modul/${id}/restore`, {
      method: "PATCH",
    });
  },
};

// ─── Zona API ─────────────────────────────────────────────────────────────────

export const zonaApi = {
  getAll: (params?: { idModul?: string; status?: string; includeDeleted?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.idModul) searchParams.append("idModul", params.idModul);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.includeDeleted) searchParams.append("includeDeleted", "true");
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

  restore: (id: string) => {
    return apiRequest<ApiResponse<Zona>>(`/zona/${id}/restore`, {
      method: "PATCH",
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

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    role: "ADMIN" | "OPERATOR" | "VIEWER";
  };
  message?: string;
}

export const authApi = {
  login: (credentials: { username: string; password: string }) => {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },
  register: (data: { username: string; password: string; role?: "ADMIN" | "OPERATOR" | "VIEWER" }) => {
    return apiRequest<{ success: boolean; message: string; user: { id: string; username: string; role: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ─── User API ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const userApi = {
  getAll: (params?: { includeDeleted?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.includeDeleted) searchParams.append("includeDeleted", "true");
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<ApiResponse<User[]>>(`/users${query}`);
  },

  getById: (id: string) => {
    return apiRequest<ApiResponse<User>>(`/users/${id}`);
  },

  create: (data: {
    username: string;
    password: string;
    role: "ADMIN" | "OPERATOR" | "VIEWER";
  }) => {
    return apiRequest<ApiResponse<User>>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: (
    id: string,
    data: Partial<{
      username: string;
      password: string;
      role: "ADMIN" | "OPERATOR" | "VIEWER";
    }>
  ) => {
    return apiRequest<ApiResponse<User>>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiRequest<ApiResponse<null>>(`/users/${id}`, {
      method: "DELETE",
    });
  },

  restore: (id: string) => {
    return apiRequest<ApiResponse<User>>(`/users/${id}/restore`, {
      method: "PATCH",
    });
  },
};

// ─── Activity Log API ─────────────────────────────────────────────────────────

export const activityLogApi = {
  getAll: (params?: {
    entity?: string;
    action?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.entity && params.entity !== "ALL") searchParams.append("entity", params.entity);
    if (params?.action && params.action !== "ALL") searchParams.append("action", params.action);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiRequest<ApiResponse<ActivityLog[]>>(`/activity-logs${query}`);
  },
};