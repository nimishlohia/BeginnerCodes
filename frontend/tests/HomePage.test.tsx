import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HomePage } from "../src/pages/HomePage";
import * as api from "../src/lib/api";

describe("HomePage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the LevelUp product identity and tagline", async () => {
    vi.spyOn(api, "checkBackendHealth").mockResolvedValueOnce({
      status: "healthy",
      app: "LevelUp",
      version: "0.1.0",
      environment: "development",
    });

    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "LevelUp" })).toBeInTheDocument();
    expect(
      screen.getByText(/Skill-aligned, peer-based coding practice/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it("displays connected state when health endpoint responds successfully", async () => {
    vi.spyOn(api, "checkBackendHealth").mockResolvedValueOnce({
      status: "healthy",
      app: "LevelUp",
      version: "0.1.0",
      environment: "development",
    });

    render(<HomePage />);

    // Initially or upon resolve
    await waitFor(() => {
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      expect(screen.getByText(/\(LevelUp v0.1.0\)/i)).toBeInTheDocument();
    });
  });

  it("displays unavailable state when backend request fails", async () => {
    vi.spyOn(api, "checkBackendHealth").mockRejectedValueOnce(
      new api.ApiError("Connection refused", 0)
    );

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Unavailable")).toBeInTheDocument();
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
    });
  });

  it("retries check when 'Check Again' button is clicked", async () => {
    const mockCheck = vi
      .spyOn(api, "checkBackendHealth")
      .mockRejectedValueOnce(new api.ApiError("Failed", 0))
      .mockResolvedValueOnce({
        status: "healthy",
        app: "LevelUp",
        version: "0.1.0",
        environment: "development",
      });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Unavailable")).toBeInTheDocument();
    });

    const checkButton = screen.getByRole("button", { name: /Check Again/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });
});
