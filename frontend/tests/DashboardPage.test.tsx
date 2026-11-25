import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "../src/pages/DashboardPage";
import * as api from "../src/lib/api";
import { AuthContext } from "../src/context/AuthContext";
import type { UserDetail } from "../src/lib/api";

// We need to export AuthContext from AuthContext.tsx — see note below.
// For now we build a minimal mock context value.
const mockUser: UserDetail = {
  id: 1,
  username: "alice",
  email: "alice@example.com",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  profile: {
    id: 1,
    user_id: 1,
    display_name: "Alice",
    bio: "I love coding",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  skills: [
    {
      id: 1,
      user_id: 1,
      skill_name: "Python",
      proficiency_level: 7,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ],
  preferences: {
    id: 1,
    user_id: 1,
    preferred_programming_language: "Python",
    preferred_difficulty: "intermediate",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
};

const mockLogout = vi.fn();
const mockRefreshUser = vi.fn();

function renderDashboard(user: UserDetail | null = mockUser) {
  return render(
    <AuthContext.Provider
      value={{
        token: "mock-token",
        user,
        isAuthenticated: !!user,
        login: vi.fn(),
        logout: mockLogout,
        refreshUser: mockRefreshUser,
      }}
    >
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogout.mockReset();
    mockRefreshUser.mockReset().mockResolvedValue(undefined);
  });

  it("displays the logged-in username", () => {
    renderDashboard();
    const matches = screen.getAllByText(/@alice/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("lists existing skills", () => {
    renderDashboard();
    expect(screen.getByText(/Python/i)).toBeInTheDocument();
    expect(screen.getByText(/level 7/i)).toBeInTheDocument();
  });

  it("calls deleteSkill and refreshUser when Remove is clicked", async () => {
    vi.spyOn(api, "deleteSkill").mockResolvedValueOnce(undefined);

    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: /remove python/i }));

    await waitFor(() => {
      expect(api.deleteSkill).toHaveBeenCalledWith(1, "mock-token");
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  it("saves profile and calls refreshUser", async () => {
    vi.spyOn(api, "updateProfile").mockResolvedValueOnce(mockUser.profile!);

    renderDashboard();
    const displayNameInput = screen.getByLabelText(/display name/i);
    fireEvent.change(displayNameInput, { target: { value: "Alice B" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: "Alice B" }),
        "mock-token"
      );
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  it("shows logout button and calls logout on click", () => {
    renderDashboard();
    const logoutBtn = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });
});
