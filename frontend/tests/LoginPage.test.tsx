import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../src/pages/LoginPage";
import * as api from "../src/lib/api";
import { AuthProvider } from "../src/context/AuthContext";

// Wrap component with required providers
function renderLoginPage(initialPath = "/login") {
  return render(
    <HelmetProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the sign-in form", () => {
    renderLoginPage();
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a loading state while the request is in flight", async () => {
    vi.spyOn(api, "loginUser").mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );
    vi.spyOn(api, "getCurrentUser").mockResolvedValue({
      id: 1,
      username: "alice",
      email: "alice@example.com",
      created_at: "",
      updated_at: "",
      skills: [],
    });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/signing in/i)).toBeInTheDocument();
  });

  it("displays an error message on failed login", async () => {
    vi.spyOn(api, "loginUser").mockRejectedValueOnce(new api.ApiError("Invalid credentials", 401));

    renderLoginPage();
    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: "bad" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
    });
  });

  it("contains a link to the register page", () => {
    renderLoginPage();
    expect(screen.getByRole("link", { name: /create one/i })).toHaveAttribute("href", "/register");
  });
});
