import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "../src/pages/AboutPage";
import { BlogPage } from "../src/pages/BlogPage";
import { BlogPostPage } from "../src/pages/BlogPostPage";

describe("Content & Keyword SEO Pages", () => {
  it("renders AboutPage with H1, internal links, and external documentation links", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <AboutPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByRole("heading", { level: 1, name: /About LevelUp/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Challenges catalogue/i })).toHaveAttribute("href", "/challenges");
    expect(screen.getByRole("link", { name: /Official Python 3 Tutorial/i })).toHaveAttribute(
      "href",
      "https://docs.python.org/3/tutorial/"
    );

    await waitFor(() => {
      expect(document.title).toContain("About Us");
    });
  });

  it("renders BlogPage with link to the beginner guide", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <BlogPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(screen.getByRole("heading", { level: 1, name: /LevelUp Programming Blog/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read Full Guide/i })).toHaveAttribute(
      "href",
      "/blog/how-to-start-learning-programming-as-a-beginner"
    );

    await waitFor(() => {
      expect(document.title).toContain("Blog");
    });
  });

  it("renders BlogPostPage with headings, internal challenge links, official docs, and Article JSON-LD", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <BlogPostPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /How to Start Learning Programming as a Beginner/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Two Sum/i })).toHaveAttribute("href", "/challenges/1");
    const pythonTutorialLink = screen.getByRole("link", { name: /official Python 3 tutorial/i });
    expect(pythonTutorialLink).toHaveAttribute("href", "https://docs.python.org/3/tutorial/");
    expect(pythonTutorialLink).toHaveAttribute("rel", "noopener noreferrer");

    const seonaLink = screen.getByRole("link", { name: /SEO tools at Seona Labs/i });
    expect(seonaLink).toHaveAttribute("href", "https://seonalabs.com");
    expect(seonaLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByRole("link", { name: /Oracle Java Tutorials/i })).toHaveAttribute(
      "href",
      "https://docs.oracle.com/javase/tutorial/"
    );

    await waitFor(() => {
      expect(document.title).toBe("How to Start Programming as a Beginner | LevelUp");
    });

    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
      (s) => s.textContent || ""
    );
    expect(ldScripts.some((txt) => txt.includes('"@type":"Article"'))).toBe(true);
    expect(ldScripts.some((txt) => txt.includes('"@type":"BreadcrumbList"'))).toBe(true);
  });
});
