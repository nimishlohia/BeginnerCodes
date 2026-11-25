import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SubmissionsPage } from "../src/pages/SubmissionsPage";
import { AuthContext } from "../src/context/AuthContext";
import * as api from "../src/lib/api";

const mockPaginated: api.PaginatedSubmissionList = {
  items: [
    {
      id: 1,
      challenge_id: 1,
      challenge_title: "Two Sum",
      language: "python",
      status: "ACCEPTED",
      result_summary: "[SIMULATED] All good.",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const mockUser = {
  id: 1,
  username: "alice",
  email: "a@a.com",
  created_at: "",
  updated_at: "",
  skills: [],
};

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        token: "mock-token",
        user: mockUser,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={["/submissions"]}>
        <SubmissionsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("SubmissionsPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders submission history after loading", async () => {
    vi.spyOn(api, "listMySubmissions").mockResolvedValueOnce(mockPaginated);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Two Sum")).toBeInTheDocument();
      expect(screen.getByText(/python/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no submissions", async () => {
    vi.spyOn(api, "listMySubmissions").mockResolvedValueOnce({
      ...mockPaginated, items: [], total: 0,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/haven't submitted/i)).toBeInTheDocument();
    });
  });

  it("shows error when API fails", async () => {
    vi.spyOn(api, "listMySubmissions").mockRejectedValueOnce(
      new api.ApiError("Unauthorized", 401)
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Unauthorized");
    });
  });

  it("opens submission detail on click", async () => {
    vi.spyOn(api, "listMySubmissions").mockResolvedValueOnce(mockPaginated);
    vi.spyOn(api, "getSubmission").mockResolvedValueOnce({
      id: 1,
      challenge_id: 1,
      language: "python",
      source_code: "def solve(): pass",
      status: "ACCEPTED",
      result_summary: "[SIMULATED] All good.",
      execution_time_ms: 0,
      created_at: "2026-01-01T00:00:00Z",
      evaluated_at: "2026-01-01T00:00:01Z",
    });

    renderPage();
    await waitFor(() => screen.getByText("Two Sum"));
    fireEvent.click(screen.getByText("Two Sum"));

    await waitFor(() => {
      expect(screen.getByText(/def solve/i)).toBeInTheDocument();
      // Simulation disclaimer must be visible
      expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
    });
  });

  it("shows ACCEPTED status badge", async () => {
    vi.spyOn(api, "listMySubmissions").mockResolvedValueOnce(mockPaginated);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
    });
  });
});
