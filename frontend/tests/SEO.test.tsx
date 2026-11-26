import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEO from "../src/components/SEO";

describe("SEO Component", () => {
  it("renders title, description, canonical, Open Graph, Twitter, and JSON-LD for public pages", async () => {
    render(
      <HelmetProvider>
        <SEO
          title="Coding Challenges for Beginners"
          description="Explore coding challenges on LevelUp."
          path="/challenges"
          structuredData={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [],
          }}
        />
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(document.title).toBe("Coding Challenges for Beginners | LevelUp");
    });

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute("href", "https://www.beginnercodes.online/challenges");

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toHaveAttribute("content", "index, follow");

    const ogUrl = document.querySelector('meta[property="og:url"]');
    expect(ogUrl).toHaveAttribute("content", "https://www.beginnercodes.online/challenges");

    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    expect(twitterCard).toHaveAttribute("content", "summary");

    const ldJson = document.querySelector('script[type="application/ld+json"]');
    expect(ldJson?.textContent).toContain('"BreadcrumbList"');
  });

  it("renders noindex, nofollow and omits social sharing tags for private pages", async () => {
    render(
      <HelmetProvider>
        <SEO
          title="Dashboard"
          description="Manage your profile."
          path="/dashboard"
          noIndex
        />
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(document.title).toBe("Dashboard | LevelUp");
    });

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toHaveAttribute("content", "noindex, nofollow");

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).toHaveAttribute("href", "https://www.beginnercodes.online/dashboard");

    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:title"]')).toBeNull();
  });
});
