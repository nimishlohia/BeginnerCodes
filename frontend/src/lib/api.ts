export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  environment: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: number;
  user_id: number;
  skill_name: string;
  proficiency_level: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: number;
  user_id: number;
  preferred_programming_language: string | null;
  preferred_difficulty: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDetail extends User {
  profile?: UserProfile | null;
  skills: UserSkill[];
  preferences?: UserPreference | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const getBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl !== undefined) {
    return configuredUrl.replace(/\/+$/, "");
  }
  return import.meta.env.DEV ? "http://localhost:8000" : "";
};

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers || {});

  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new ApiError(
      err instanceof Error ? err.message : "Failed to connect to backend",
      0
    );
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // Empty or non-json response body
  }

  if (!response.ok) {
    const detail = data?.detail;
    let message = `Request failed with status ${response.status}`;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
      message = detail[0].msg;
    }
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health", { method: "GET" });
}

export async function registerUser(payload: { username: string; email: string; password: string }): Promise<User> {
  return request<User>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: { identifier: string; password: string }): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string): Promise<UserDetail> {
  return request<UserDetail>("/api/v1/users/me", { method: "GET" }, token);
}

export async function updateProfile(
  payload: { display_name?: string | null; bio?: string | null; avatar_url?: string | null },
  token: string
): Promise<UserProfile> {
  return request<UserProfile>("/api/v1/users/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function addSkill(
  payload: { skill_name: string; proficiency_level: number },
  token: string
): Promise<UserSkill> {
  return request<UserSkill>("/api/v1/users/me/skills", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function updateSkill(
  skillId: number,
  payload: { proficiency_level: number },
  token: string
): Promise<UserSkill> {
  return request<UserSkill>(`/api/v1/users/me/skills/${skillId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteSkill(skillId: number, token: string): Promise<void> {
  return request<void>(`/api/v1/users/me/skills/${skillId}`, {
    method: "DELETE",
  }, token);
}

export async function updatePreferences(
  payload: { preferred_programming_language?: string | null; preferred_difficulty?: string | null },
  token: string
): Promise<UserPreference> {
  return request<UserPreference>("/api/v1/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

// ─── Challenge types ─────────────────────────────────────────────────────────

export interface ChallengeListItem {
  id: number;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
}

export interface ChallengeExample {
  id: number;
  input_data: string;
  expected_output: string;
  explanation: string | null;
  display_order: number;
}

export interface ChallengeDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  input_format: string | null;
  output_format: string | null;
  constraints: string | null;
  examples: ChallengeExample[];
  supported_languages: string[];
}

export interface PaginatedChallengeList {
  items: ChallengeListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Submission types ─────────────────────────────────────────────────────────

export interface SubmissionStatus {
  id: number;
  challenge_id: number;
  language: string;
  status: string;
  created_at: string;
}

export interface SubmissionDetail {
  id: number;
  challenge_id: number;
  language: string;
  source_code: string;
  status: string;
  result_summary: string | null;
  execution_time_ms: number | null;
  created_at: string;
  evaluated_at: string | null;
}

export interface SubmissionListItem {
  id: number;
  challenge_id: number;
  challenge_title: string;
  language: string;
  status: string;
  result_summary: string | null;
  created_at: string;
}

export interface PaginatedSubmissionList {
  items: SubmissionListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Challenge API functions ─────────────────────────────────────────────────

export async function listChallenges(params?: {
  search?: string;
  difficulty?: string;
  topic?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedChallengeList> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.difficulty) qs.set("difficulty", params.difficulty);
  if (params?.topic) qs.set("topic", params.topic);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<PaginatedChallengeList>(`/api/v1/challenges${query}`, { method: "GET" });
}

export async function getChallenge(challengeId: number): Promise<ChallengeDetail> {
  return request<ChallengeDetail>(`/api/v1/challenges/${challengeId}`, { method: "GET" });
}

// ─── Submission API functions ─────────────────────────────────────────────────

export async function submitCode(
  challengeId: number,
  payload: { language: string; source_code: string },
  token: string
): Promise<SubmissionStatus> {
  return request<SubmissionStatus>(
    `/api/v1/challenges/${challengeId}/submissions`,
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
}

export async function getSubmission(
  submissionId: number,
  token: string
): Promise<SubmissionDetail> {
  return request<SubmissionDetail>(`/api/v1/submissions/${submissionId}`, { method: "GET" }, token);
}

export async function listMySubmissions(
  token: string,
  params?: { challenge_id?: number; status?: string; page?: number }
): Promise<PaginatedSubmissionList> {
  const qs = new URLSearchParams();
  if (params?.challenge_id) qs.set("challenge_id", String(params.challenge_id));
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<PaginatedSubmissionList>(`/api/v1/users/me/submissions${query}`, { method: "GET" }, token);
}

