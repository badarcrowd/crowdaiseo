import type {
  DetectedIssue,
  ExtractedPage,
  FetchedResource,
} from "../domain/entities";

/**
 * Pure functions. Each detector takes the fetched + extracted page and
 * returns zero or more issues. Order does not matter.
 *
 * Severity guide:
 *   ERROR — broken / blocks indexing
 *   WARN  — degrades SEO but page is indexable
 *   INFO  — best-practice nudge
 */
type DetectorCtx = { fetched: FetchedResource; extracted: ExtractedPage; url: string };
type Detector = (ctx: DetectorCtx) => DetectedIssue[];

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

const httpDetector: Detector = ({ fetched }) => {
  const issues: DetectedIssue[] = [];
  if (fetched.httpStatus >= 500) {
    issues.push({
      code: "http-5xx",
      severity: "ERROR",
      category: "TECHNICAL",
      message: `Server error: HTTP ${fetched.httpStatus}`,
    });
  } else if (fetched.httpStatus === 404) {
    issues.push({
      code: "http-404",
      severity: "ERROR",
      category: "TECHNICAL",
      message: "Page not found (404)",
    });
  } else if (fetched.httpStatus >= 400) {
    issues.push({
      code: `http-${fetched.httpStatus}`,
      severity: "WARN",
      category: "TECHNICAL",
      message: `HTTP ${fetched.httpStatus}`,
    });
  }
  if (fetched.redirectChain.length > 3) {
    issues.push({
      code: "redirect-chain-long",
      severity: "WARN",
      category: "TECHNICAL",
      message: `Redirect chain has ${fetched.redirectChain.length} hops`,
      details: { chain: fetched.redirectChain },
    });
  }
  if (fetched.durationMs > 3000) {
    issues.push({
      code: "slow-response",
      severity: "WARN",
      category: "PERFORMANCE",
      message: `Slow first-byte time: ${fetched.durationMs}ms`,
    });
  }
  return issues;
};

const titleDetector: Detector = ({ extracted }) => {
  if (!extracted.title) {
    return [
      {
        code: "missing-title",
        severity: "ERROR",
        category: "ON_PAGE",
        message: "Page has no <title>",
      },
    ];
  }
  const len = extracted.title.length;
  if (len < TITLE_MIN) {
    return [
      {
        code: "title-too-short",
        severity: "WARN",
        category: "ON_PAGE",
        message: `Title is too short (${len} chars; recommended ≥${TITLE_MIN})`,
      },
    ];
  }
  if (len > TITLE_MAX) {
    return [
      {
        code: "title-too-long",
        severity: "WARN",
        category: "ON_PAGE",
        message: `Title may truncate in SERPs (${len} chars; recommended ≤${TITLE_MAX})`,
      },
    ];
  }
  return [];
};

const descriptionDetector: Detector = ({ extracted }) => {
  if (!extracted.metaDescription) {
    return [
      {
        code: "missing-meta-description",
        severity: "WARN",
        category: "ON_PAGE",
        message: "Page has no meta description",
      },
    ];
  }
  const len = extracted.metaDescription.length;
  if (len < DESC_MIN) {
    return [
      {
        code: "meta-description-too-short",
        severity: "INFO",
        category: "ON_PAGE",
        message: `Meta description is short (${len} chars; recommended ≥${DESC_MIN})`,
      },
    ];
  }
  if (len > DESC_MAX) {
    return [
      {
        code: "meta-description-too-long",
        severity: "INFO",
        category: "ON_PAGE",
        message: `Meta description may truncate (${len} chars; recommended ≤${DESC_MAX})`,
      },
    ];
  }
  return [];
};

const headingsDetector: Detector = ({ extracted }) => {
  const issues: DetectedIssue[] = [];
  if (extracted.headings.h1.length === 0) {
    issues.push({
      code: "missing-h1",
      severity: "WARN",
      category: "ON_PAGE",
      message: "Page has no <h1>",
    });
  } else if (extracted.headings.h1.length > 1) {
    issues.push({
      code: "multiple-h1",
      severity: "INFO",
      category: "ON_PAGE",
      message: `Page has ${extracted.headings.h1.length} <h1> tags`,
    });
  }
  return issues;
};

const canonicalDetector: Detector = ({ extracted, url }) => {
  if (!extracted.canonical) {
    return [
      {
        code: "missing-canonical",
        severity: "INFO",
        category: "INDEXABILITY",
        message: "No canonical link element",
      },
    ];
  }
  try {
    const canon = new URL(extracted.canonical, url).toString();
    if (canon !== url && new URL(canon).origin !== new URL(url).origin) {
      return [
        {
          code: "canonical-cross-origin",
          severity: "WARN",
          category: "INDEXABILITY",
          message: "Canonical points to a different origin",
          details: { canonical: canon },
        },
      ];
    }
  } catch {
    return [
      {
        code: "canonical-invalid",
        severity: "WARN",
        category: "INDEXABILITY",
        message: "Canonical href is not a valid URL",
      },
    ];
  }
  return [];
};

const robotsDetector: Detector = ({ extracted }) => {
  if (!extracted.metaRobots) return [];
  const value = extracted.metaRobots.toLowerCase();
  const issues: DetectedIssue[] = [];
  if (value.includes("noindex")) {
    issues.push({
      code: "noindex-directive",
      severity: "WARN",
      category: "INDEXABILITY",
      message: "Page has meta robots `noindex`",
    });
  }
  if (value.includes("nofollow")) {
    issues.push({
      code: "nofollow-directive",
      severity: "INFO",
      category: "INDEXABILITY",
      message: "Page has meta robots `nofollow`",
    });
  }
  return issues;
};

const imagesDetector: Detector = ({ extracted }) => {
  if (extracted.imagesMissingAlt > 0) {
    return [
      {
        code: "images-missing-alt",
        severity: "WARN",
        category: "ACCESSIBILITY",
        message: `${extracted.imagesMissingAlt} image(s) without alt text`,
      },
    ];
  }
  return [];
};

const contentDetector: Detector = ({ extracted }) => {
  if (extracted.wordCount < 100) {
    return [
      {
        code: "thin-content",
        severity: "WARN",
        category: "CONTENT",
        message: `Very low word count (${extracted.wordCount})`,
      },
    ];
  }
  return [];
};

const structuredDataDetector: Detector = ({ extracted }) => {
  if (extracted.schemas.length === 0) {
    return [
      {
        code: "no-structured-data",
        severity: "INFO",
        category: "STRUCTURED_DATA",
        message: "No JSON-LD structured data found",
      },
    ];
  }
  return [];
};

const ALL: Detector[] = [
  httpDetector,
  titleDetector,
  descriptionDetector,
  headingsDetector,
  canonicalDetector,
  robotsDetector,
  imagesDetector,
  contentDetector,
  structuredDataDetector,
];

export const detectIssues = (ctx: DetectorCtx): DetectedIssue[] =>
  ALL.flatMap((d) => d(ctx));
