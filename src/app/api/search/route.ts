import { NextRequest, NextResponse } from "next/server";

type SearchBody = {
  query?: string;
  max?: number;
};

type VideoResult = {
  id: string;
  url: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  publishedAt: string;
  channelTitle: string;
  thumbnail: string;
};

type TextRun = {
  text?: string;
};

type UnknownRecord = Record<string, unknown>;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const formatRuntime = (value?: string | null) => {
  if (!value) return "—";
  const trimmed = value.trim();
  if (/live/i.test(trimmed)) return "Ao vivo agora";
  const segments = trimmed.split(":").map((part) => Number(part));
  if (segments.some((segment) => Number.isNaN(segment))) return trimmed;
  return segments
    .map((segment, index) =>
      index === 0 && segments.length === 2
        ? segment.toString()
        : segment.toString().padStart(2, "0"),
    )
    .join(":");
};

const parseViewCount = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const normalized = value.replace(/\s+/g, " ").toLowerCase();
  const match = normalized.match(/[\d,.]+/);
  if (!match) return null;
  let numeric = Number(
    match[0]
      .replace(/\./g, "")
      .replace(/,/g, "."),
  );
  if (Number.isNaN(numeric)) {
    numeric = Number(match[0].replace(/[^0-9]/g, ""));
  }
  if (Number.isNaN(numeric)) return null;
  if (normalized.includes("bilhão") || normalized.includes(" bi")) {
    numeric *= 1_000_000_000;
  } else if (normalized.includes("milhão") || normalized.includes(" mi")) {
    numeric *= 1_000_000;
  } else if (normalized.includes("mil") || normalized.includes("k")) {
    numeric *= 1_000;
  }
  return Math.round(numeric);
};

const formatCount = (value?: string | number | null) => {
  const numeric = parseViewCount(value);
  if (!numeric || !Number.isFinite(numeric)) return "—";
  if (numeric < 1000) return numeric.toString();
  const units = ["mil", "mi", "bi"];
  const index = Math.min(Math.floor(Math.log10(numeric) / 3), units.length);
  if (index === 0) return numeric.toLocaleString("pt-BR");
  const scaled = numeric / 10 ** (index * 3);
  const unit = units[index - 1];
  return `${scaled.toFixed(scaled < 10 ? 1 : 0)} ${unit}`;
};

const cleanText = (value?: string | null) => {
  if (!value) return "";
  return value
    .replace(/\\u[\dA-Fa-f]{4}/g, (match) =>
      String.fromCharCode(parseInt(match.slice(2), 16)),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&apos;/gi, "'")
    .replace(/[^\p{L}\p{N}\s\-_.,!?'":;%&()\/\/]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
};

const parseRuns = (runs?: TextRun[]) =>
  runs?.map((run) => run.text ?? "").join(" ") ?? "";

const parseDescription = (renderer: UnknownRecord) => {
  const detailed = renderer["detailedMetadataSnippets"];
  if (Array.isArray(detailed) && detailed.length > 0) {
    const snippet = detailed[0] as UnknownRecord;
    const snippetText = snippet["snippetText"] as UnknownRecord | undefined;
    const runs = Array.isArray(snippetText?.["runs"])
      ? (snippetText?.["runs"] as TextRun[])
      : undefined;
    return cleanText(parseRuns(runs));
  }
  const descriptionSnippet = renderer["descriptionSnippet"] as UnknownRecord | undefined;
  const runs = Array.isArray(descriptionSnippet?.["runs"])
    ? (descriptionSnippet?.["runs"] as TextRun[])
    : undefined;
  return cleanText(parseRuns(runs));
};

const extractVideoRenderers = (root: unknown) => {
  const results: UnknownRecord[] = [];
  const queue: unknown[] = [root];
  const visited = new WeakSet<object>();

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (visited.has(node)) continue;
    visited.add(node);

    const record = node as UnknownRecord;
    if ("videoRenderer" in record) {
      const renderer = record["videoRenderer"];
      if (renderer && typeof renderer === "object") {
        results.push(renderer as UnknownRecord);
      }
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return results;
};

const parseVideoRenderer = (renderer: UnknownRecord): VideoResult | null => {
  const videoId = renderer["videoId"];
  if (typeof videoId !== "string") return null;

  const titleRuns = (renderer["title"] as UnknownRecord | undefined)?.["runs"];
  const title = cleanText(
    Array.isArray(titleRuns) ? parseRuns(titleRuns as TextRun[]) : "",
  );
  if (!title) return null;

  const lengthText =
    (renderer["lengthText"] as UnknownRecord | undefined)?.["simpleText"] ??
    null;
  const overlays = renderer["thumbnailOverlays"];
  const overlayDurationRaw =
    Array.isArray(overlays) && overlays.length > 0
      ? (((overlays[0] as UnknownRecord)["thumbnailOverlayTimeStatusRenderer"] as UnknownRecord | undefined)?.["text"] as UnknownRecord | undefined)?.["simpleText"]
      : null;
  const overlayDuration =
    typeof overlayDurationRaw === "string" ? overlayDurationRaw : null;

  const publishedRaw =
    (renderer["publishedTimeText"] as UnknownRecord | undefined)?.["simpleText"];
  const publishedAt =
    typeof publishedRaw === "string" ? publishedRaw : "· recente";

  const ownerRuns =
    (renderer["ownerText"] as UnknownRecord | undefined)?.["runs"] ??
    (renderer["longBylineText"] as UnknownRecord | undefined)?.["runs"];
  const ownerName = Array.isArray(ownerRuns)
    ? (ownerRuns as TextRun[])[0]?.text
    : undefined;

  const thumbnails = (renderer["thumbnail"] as UnknownRecord | undefined)?.["thumbnails"];
  const thumbArray = Array.isArray(thumbnails)
    ? (thumbnails as UnknownRecord[])
    : [];
  const bestThumb =
    thumbArray.length > 0 ? thumbArray[thumbArray.length - 1] : undefined;

  const viewCountRaw =
    (renderer["viewCountText"] as UnknownRecord | undefined)?.["simpleText"];
  const shortViewRaw =
    (renderer["shortViewCountText"] as UnknownRecord | undefined)?.["simpleText"];
  const viewCountText =
    typeof viewCountRaw === "string" ? viewCountRaw : undefined;
  const shortViewCount =
    typeof shortViewRaw === "string" ? shortViewRaw : undefined;

  return {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    description: parseDescription(renderer),
    duration: formatRuntime(
      typeof lengthText === "string" ? lengthText : overlayDuration,
    ),
    views: formatCount(viewCountText ?? shortViewCount),
    publishedAt,
    channelTitle: cleanText(ownerName),
    thumbnail:
      (typeof bestThumb?.["url"] === "string"
        ? (bestThumb["url"] as string)
        : undefined) ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
};

const searchYouTube = async (query: string, max: number) => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=pt-BR`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`YouTube search failed with status ${response.status}`);
  }

  const html = await response.text();
  const splitToken = "var ytInitialData = ";
  const [, afterToken] = html.split(splitToken);
  if (!afterToken) {
    return [];
  }
  const jsonPayload = afterToken.split(";</script>")[0];
  if (!jsonPayload) {
    return [];
  }

  const data = JSON.parse(jsonPayload) as unknown;
  const renderers = extractVideoRenderers(data);

  const videos: VideoResult[] = [];
  for (const renderer of renderers) {
    const parsed = parseVideoRenderer(renderer);
    if (parsed) {
      videos.push(parsed);
    }
    if (videos.length >= max) break;
  }

  return videos;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchBody;
    const query = body.query?.trim();
    const max = Math.min(Math.max(body.max ?? 6, 3), 10);

    if (!query) {
      return NextResponse.json(
        { error: "Informe um termo para pesquisa." },
        { status: 400 },
      );
    }

    const items = await searchYouTube(query, max);
    return NextResponse.json(
      {
        query,
        items,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/search] error", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível concluir a busca no momento. Tente novamente em instantes.",
      },
      { status: 500 },
    );
  }
}
