import { Helmet } from "react-helmet-async";

export interface SEOProps {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

export const SITE_NAME = "LevelUp";
export const SITE_URL = "https://www.beginnercodes.online";

export default function SEO({
  title,
  description,
  path = "/",
  noIndex = false,
  type = "website",
  structuredData,
}: SEOProps) {
  const canonicalUrl = new URL(path, SITE_URL).toString();
  const fullTitle = `${title} | ${SITE_NAME}`;
  const schemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />

      {!noIndex && (
        <>
          <meta property="og:type" content={type} />
          <meta property="og:title" content={fullTitle} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:site_name" content={SITE_NAME} />
          <meta property="og:locale" content="en_US" />

          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={fullTitle} />
          <meta name="twitter:description" content={description} />
        </>
      )}

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
