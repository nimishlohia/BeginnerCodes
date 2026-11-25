import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChallengesPage } from "../src/pages/ChallengesPage";
import * as api from "../src/lib/api";

const mockList: api.PaginatedChallengeList = {
  items: [
    { id: 1, slug: "two-sum", title: "Two Sum", difficulty: "Easy", topic: "arrays" },
    { id: 2, slug: "valid-parens", title: "Valid Parentheses", difficulty: "Medium", topic: "stacks" },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/challenges"]}>
      <ChallengesPage />
    </MemoryRouter>
  );
}

describe("ChallengesPage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders challenge titles after loading", async () => {
    vi.spyOn(api, "listChallenges").mockResolvedValueOnce(mockList);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Two Sum")).toBeInTheDocument();
      expect(screen.getByText("Valid Parentheses")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    vi.spyOn(api, "listChallenges").mockImplementation(
      () => new Promise(() => {})
    );
    renderPage();
    expect(screen.getByText(/loading challenges/i)).toBeInTheDocument();
  });

  it("shows empty state when no challenges found", async () => {
    vi.spyOn(api, "listChallenges").mockResolvedValueOnce({
      ...mockList, items: [], total: 0,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no challenges found/i)).toBeInTheDocument();
    });
  });

  it("shows error state on API failure", async () => {
    vi.spyOn(api, "listChallenges").mockRejectedValueOnce(
      new api.ApiError("Service unavailable", 503)
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
    });
  });

  it("calls API with search term when user types", async () => {
    const spy = vi.spyOn(api, "listChallenges").mockResolvedValue(mockList);
    renderPage();
    await waitFor(() => screen.getByText("Two Sum"));

    fireEvent.change(screen.getByLabelText(/search challenges/i), {
      target: { value: "binary" },
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ search: "binary" }));
    });
  });

  it("calls API with difficulty filter", async () => {
    const spy = vi.spyOn(api, "listChallenges").mockResolvedValue(mockList);
    renderPage();
    await waitFor(() => screen.getByText("Two Sum"));

    fireEvent.change(screen.getByLabelText(/filter by difficulty/i), {
      target: { value: "Easy" },
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ difficulty: "Easy" }));
    });
  });

  it("shows difficulty badge with correct label", async () => {
    vi.spyOn(api, "listChallenges").mockResolvedValueOnce(mockList);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Easy")).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
    });
  });
});
