import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { RegisterPage } from "../src/pages/RegisterPage";
import * as api from "../src/lib/api";
import { AuthProvider } from "../src/context/AuthContext";

function renderRegisterPage() {
  return render(
    <HelmetProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/register"]}>
          <RegisterPage />
        </MemoryRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

const mockUser: api.User = {
  id: 1,
  username: "newuser",
  email: "new@example.com",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the registration form", () => {
    renderRegisterPage();
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows loading state while submitting", async () => {
    vi.spyOn(api, "registerUser").mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockUser), 500))
    );
    vi.spyOn(api, "loginUser").mockResolvedValue({ access_token: "tok", token_type: "bearer", user: mockUser });
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({ ...mockUser, skills: [] });

    renderRegisterPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/creating account/i)).toBeInTheDocument();
  });

  it("shows an error when registration fails (duplicate username)", async () => {
    vi.spyOn(api, "registerUser").mockRejectedValueOnce(
      new api.ApiError("Username already taken", 409)
    );

    renderRegisterPage();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "taken" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "taken@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Username already taken");
    });
  });

  it("contains a link to the login page", () => {
    renderRegisterPage();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });
});
