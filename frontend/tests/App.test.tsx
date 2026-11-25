import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../src/App";
import * as api from "../src/lib/api";

describe("App Integration & Routing", () => {
  it("renders layout header and home page successfully", async () => {
    vi.spyOn(api, "checkBackendHealth").mockResolvedValueOnce({
      status: "healthy",
      app: "LevelUp",
      version: "0.1.0",
      environment: "development",
    });

    render(<App />);

    // Layout header — brand name
    expect(screen.getAllByRole("heading", { name: "LevelUp" })[0]).toBeInTheDocument();

    // Unauthenticated nav links rendered
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument();

    // Footer text
    expect(
      screen.getByText(/A friendly, peer-based coding practice platform/i)
    ).toBeInTheDocument();

    // Backend health check resolves
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });
});
