export type SurveyRecord = {
  survey_number: string;
  area: number | string | null;
  pot_kharab: number | string | null;
  owner_name: string;
  khata_number: number | string | null;
  record_type?: string | null;
};

export type SurveyOwner = {
  name: string;
  record_count: number;
  area_sq_m: number;
};

export type SurveyData = {
  survey: {
    number: string;
    survey_number_id: string;
    village_id: string;
    plot_id?: string | null;
    gis_code?: string | null;
    area_sq_m?: number | string | null;
  };
  geometry?: GeoJSON.Geometry | null;
  geometry_available: boolean;
  sub_survey_geometry_available: boolean;
  bbox?: {
    xmin: number | string | null;
    ymin: number | string | null;
    xmax: number | string | null;
    ymax: number | string | null;
  } | null;
  records: SurveyRecord[];
  summary: {
    record_count: number;
    owner_count: number;
    owners: SurveyOwner[];
  };
  source: {
    provider?: string;
    survey_geometry?: string;
    survey_extent?: string;
    land_records?: string;
    [key: string]: unknown;
  };
  meta?: {
    retrieved_at?: string;
    adapter?: string;
    survey_number_id?: string;
  };
};

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function getSurveyData(
  surveyNumber: string,
  villageId: string,
  signal?: AbortSignal,
): Promise<SurveyData> {
  if (!surveyNumber.trim()) {
    throw new ApiError("Enter a survey number.");
  }

  if (!villageId.trim()) {
    throw new ApiError("Enter the village ID for this survey.");
  }

  const url = `${API_BASE_URL}/api/v1/surveys/${encodeURIComponent(
    surveyNumber.trim(),
  )}?village_id=${encodeURIComponent(villageId.trim())}`;

  let response: Response;

  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      "Could not reach the Land Intelligence API. Check the API URL and deployment.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      `The API returned an invalid response (HTTP ${response.status}).`,
      response.status,
    );
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
        ? payload.detail
        : `Request failed with HTTP ${response.status}.`;
    throw new ApiError(detail, response.status);
  }

  return payload as SurveyData;
}


export type LocationOption = {
  id: string | number;
  name?: string | null;
  englishName?: string | null;
  districtId?: string | number | null;
  talukaId?: string | number | null;
  surveyCount?: number | null;
  plotCount?: number | null;
  number?: string | null;
  villageId?: string | number | null;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the Land Intelligence API. Check the API URL and deployment.");
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(`The API returned an invalid response (HTTP ${response.status}).`, response.status);
  }
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "detail" in payload && typeof payload.detail === "string"
      ? payload.detail
      : `Request failed with HTTP ${response.status}.`;
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}

export function getDistricts(signal?: AbortSignal) {
  return getJson<LocationOption[]>("/api/v1/locations/districts", signal);
}

export function getTalukas(districtId: string, signal?: AbortSignal) {
  return getJson<LocationOption[]>(`/api/v1/locations/talukas?district_id=${encodeURIComponent(districtId)}`, signal);
}

export function getVillages(talukaId: string, signal?: AbortSignal) {
  return getJson<LocationOption[]>(`/api/v1/locations/villages?taluka_id=${encodeURIComponent(talukaId)}`, signal);
}

export function getSurveyNumbers(villageId: string, signal?: AbortSignal) {
  return getJson<LocationOption[]>(`/api/v1/locations/surveys?village_id=${encodeURIComponent(villageId)}`, signal);
}
