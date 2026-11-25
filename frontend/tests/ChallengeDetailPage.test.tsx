import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ChallengeDetailPage } from "../src/pages/ChallengeDetailPage";
import { AuthContext } from "../src/context/AuthContext";
import * as api from "../src/lib/api";

const mockChallenge: api.ChallengeDetail = {
  id: 1,
  slug: "two-sum",
  title: "Two Sum",
  description: "Find two numbers that add to target.",
  difficulty: "Easy",
  topic: "arrays",
  input_format: "Space-separated integers, then target",
  output_format: "Two indices",
  constraints: "2 <= n <= 10^4",
  examples: [
    {
      id: 1,
      input_data: "2 7 11 15\n9",
      expected_output: "0 1",
      explanation: "nums[0] + nums[1] = 9",
      display_order: 0,
    },
  ],
  supported_languages: ["python", "javascript"],
};

const mockSubmission: api.SubmissionDetail = {
  id: 1,
  challenge_id: 1,
  language: "python",
  source_code: "print('hello')",
  status: "ACCEPTED",
  result_summary: "[SIMULATED] Mock result.",
  execution_time_ms: 0,
  created_at: "2026-01-01T00:00:00Z",
  evaluated_at: "2026-01-01T00:00:01Z",
};

function renderPage(authenticated = false) {
  return render(
    <AuthContext.Provider
      value={{
        token: authenticated ? "mock-token" : null,
        user: authenticated ? { id: 1, username: "alice", email: "a@a.com", created_at: "", updated_at: "", skills: [] } : null,
        isAuthenticated: authenticated,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={["/challenges/1"]}>
        <Routes>
          <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("ChallengeDetailPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders challenge details after loading", async () => {
    vi.spyOn(api, "getChallenge").mockResolvedValueOnce(mockChallenge);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Two Sum" })).toBeInTheDocument();
      expect(screen.getByText(/Find two numbers/i)).toBeInTheDocument();
    });
  });

  it("renders public examples", async () => {
    vi.spyOn(api, "getChallenge").mockResolvedValueOnce(mockChallenge);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/2 7 11 15/)).toBeInTheDocument();
      expect(screen.getByText("0 1")).toBeInTheDocument();
    });
  });

  it("shows sign-in prompt when unauthenticated", async () => {
    vi.spyOn(api, "getChallenge").mockResolvedValueOnce(mockChallenge);
    renderPage(false);
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });

  it("shows code editor form when authenticated", async () => {
    vi.spyOn(api, "getChallenge").mockResolvedValueOnce(mockChallenge);
    renderPage(true);
    await waitFor(() => {
      expect(screen.getByLabelText(/source code/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /submit solution/i })).toBeInTheDocument();
    });
  });

  it("shows simulated result after submission", async () => {
    vi.spyOn(api, "getChallenge").mockResolvedValueOnce(mockChallenge);
    vi.spyOn(api, "submitCode").mockResolvedValueOnce({
      id: 1,
      challenge_id: 1,
      language: "python",
      status: "ACCEPTED",
      created_at: "2026-01-01T00:00:00Z",
    });
    vi.spyOn(api, "getSubmission").mockResolvedValueOnce(mockSubmission);

    renderPage(true);
    await waitFor(() => screen.getByLabelText(/source code/i));

    fireEvent.change(screen.getByLabelText(/source code/i), {
      target: { value: "print('hello')" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit solution/i }));

    await waitFor(() => {
      expect(screen.getByText(/ACCEPTED/i)).toBeInTheDocument();
      // Simulation disclaimer must be shown
      expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
    });
  });

  it("shows error on API failure", async () => {
    vi.spyOn(api, "getChallenge").mockRejectedValueOnce(
      new api.ApiError("Challenge not found", 404)
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Challenge not found/i)).toBeInTheDocument();
    });
  });
});
