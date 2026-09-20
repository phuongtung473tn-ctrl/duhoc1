import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown,
  ) => Promise<Response> | Response;
};

const BACKUP_TABLES = [
  "funnel_configs",
  "funnel_analytics",
  "leads",
  "visitor_sessions",
] as const;

function isBackupRequest(request: Request) {
  return new URL(request.url).pathname === "/api/backup";
}

function isAnalyticsReportRequest(request: Request) {
  return new URL(request.url).pathname === "/api/analytics-report";
}

function isAuthorizedBackupRequest(request: Request) {
  const token = process.env["BACKUP_CRON_TOKEN"];
  return (
    request.headers.get("x-vercel-cron") === "1" ||
    (Boolean(token) &&
      new URL(request.url).searchParams.get("token") === token) ||
    (Boolean(token) && request.headers.get("x-backup-token") === token)
  );
}

async function handleAnalyticsReportRequest(
  request: Request,
): Promise<Response> {
  const token =
    process.env["BACKUP_CRON_TOKEN"] || process.env["REPORT_CRON_TOKEN"];
  const url = new URL(request.url);
  const isTest = url.searchParams.get("test") === "1";
  const isAdminPost = request.method === "POST";
  const authorized =
    request.headers.get("x-vercel-cron") === "1" ||
    (Boolean(token) && url.searchParams.get("token") === token) ||
    (Boolean(token) && request.headers.get("x-backup-token") === token) ||
    (!token && isAdminPost);
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resendKey = process.env["RESEND_API_KEY"];
  const fromEmail =
    process.env["BACKUP_FROM_EMAIL"] || process.env["REPORT_FROM_EMAIL"];
  const defaultRecipient =
    process.env["REPORT_RECIPIENT_EMAIL"] || process.env["BACKUP_FROM_EMAIL"];

  let payload: Record<string, unknown> = {};
  if (request.method === "POST") {
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }

  const recipients = (() => {
    const raw = Array.isArray(payload["recipients"])
      ? payload["recipients"]
      : typeof payload["recipients"] === "string"
        ? payload["recipients"]
        : defaultRecipient;
    if (Array.isArray(raw)) {
      return raw
        .map((item) => String(item).trim())
        .filter((item) => item && /.+@.+\..+/.test(item));
    }
    if (typeof raw === "string") {
      return raw
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .filter((item) => item && /.+@.+\..+/.test(item));
    }
    return defaultRecipient && /.+@.+\..+/.test(String(defaultRecipient))
      ? [String(defaultRecipient)]
      : [];
  })();

  if (!recipients.length || !resendKey || !fromEmail) {
    return new Response("Analytics report email is not configured", {
      status: 503,
    });
  }

  const reportDate = new Date().toISOString().slice(0, 10);
  const summaryPayload =
    (payload["summary"] as Record<string, unknown> | undefined) ?? {};
  const summaryRange =
    (summaryPayload["range"] as Record<string, unknown> | undefined) ?? {};
  const summaryStart =
    typeof summaryRange["start"] === "string"
      ? summaryRange["start"]
      : reportDate;
  const summaryEnd =
    typeof summaryRange["end"] === "string" ? summaryRange["end"] : reportDate;
  const summaryDate =
    summaryRange && Object.keys(summaryRange).length > 0
      ? `${summaryStart} → ${summaryEnd}`
      : reportDate;
  const summaryVisits = Number(summaryPayload["totalVisits"]) || 0;
  const summaryLeads = Number(summaryPayload["totalLeads"]) || 0;
  const summaryConversion = String(summaryPayload["conversionRate"]) || "0.0%";
  const summaryNote =
    typeof payload["note"] === "string" && payload["note"].trim()
      ? payload["note"]
      : "This is a generated analytics report template. Connect your data source for live values.";
  const sourceBreakdown = Array.isArray(summaryPayload["sourceBreakdown"])
    ? (summaryPayload["sourceBreakdown"] as Array<Record<string, unknown>>)
    : [];
  const reportSubject =
    typeof payload["subject"] === "string" && payload["subject"].trim()
      ? payload["subject"]
      : isTest
        ? "[Analytics Report Test] " + reportDate
        : "[Analytics Report] " + reportDate;

  const textBody = [
    "Báo cáo analytics",
    `Ngày: ${summaryDate}`,
    `Lượt truy cập: ${summaryVisits}`,
    `Lượt đăng ký: ${summaryLeads}`,
    `Tỷ lệ CR: ${summaryConversion}`,
    "",
    summaryNote,
    ...sourceBreakdown.map((item) => {
      const source = String(item["source"] ?? "other");
      const visits = Number(item["visits"]) || 0;
      const leads = Number(item["leads"]) || 0;
      const rate = String(item["conversionRate"]) || "0.0%";
      return `- ${source}: ${visits} visits · ${leads} leads · ${rate}`;
    }),
  ].join("\n");

  const sourceRows = sourceBreakdown
    .map((item) => {
      const source = String(item["source"] ?? "other");
      const visits = Number(item["visits"]) || 0;
      const leads = Number(item["leads"]) || 0;
      const rate = String(item["conversionRate"]) || "0.0%";
      return `<li>${source}: ${visits} visits · ${leads} leads · ${rate}</li>`;
    })
    .join("");

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 720px; margin: 0 auto;">
      <h2 style="margin-bottom: 12px;">Báo cáo analytics</h2>
      <p><strong>Ngày:</strong> ${summaryDate}</p>
      <p><strong>Lượt truy cập:</strong> ${summaryVisits}</p>
      <p><strong>Lượt đăng ký:</strong> ${summaryLeads}</p>
      <p><strong>Tỷ lệ CR:</strong> ${summaryConversion}</p>
      <p style="margin-top: 14px; color: #475569;">${summaryNote}</p>
      ${sourceBreakdown.length ? `<h3 style="margin-top: 20px; margin-bottom: 8px;">Nguồn traffic</h3><ul>${sourceRows}</ul>` : ""}
    </div>
  `;
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject: reportSubject,
      text: textBody,
      html: htmlBody,
    }),
  });

  if (!emailResponse.ok) {
    console.error("Analytics report email failed", await emailResponse.text());
    return new Response("Analytics report email failed", { status: 502 });
  }
  return new Response(
    JSON.stringify({ sent: true, recipients: recipients.length }),
    {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}

async function handleBackupRequest(request: Request): Promise<Response> {
  if (!isAuthorizedBackupRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const supabaseUrl = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  const fromEmail = process.env["BACKUP_FROM_EMAIL"];
  const missing = [
    !supabaseUrl && "SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    !resendKey && "RESEND_API_KEY",
    !fromEmail && "BACKUP_FROM_EMAIL",
  ].filter((value): value is string => Boolean(value));
  if (missing.length > 0) {
    return new Response(
      `Backup environment is incomplete: ${missing.join(", ")}`,
      {
        status: 503,
      },
    );
  }

  const headers = {
    apikey: serviceKey as string,
    Authorization: `Bearer ${serviceKey}`,
  };
  const configResponse = await fetch(
    `${supabaseUrl}/rest/v1/funnel_configs?id=eq.1&select=data`,
    { headers },
  );
  if (!configResponse.ok) {
    return new Response("Cannot read backup configuration", { status: 502 });
  }
  const configRows = (await configResponse.json()) as Array<{
    data?: { admin?: { backupEmail?: string; cronSchedule?: string } };
  }>;
  const admin = configRows[0]?.data?.admin;
  const recipient = admin?.backupEmail?.trim();
  const schedule = admin?.cronSchedule || "off";
  const isTestRequest = new URL(request.url).searchParams.get("test") === "1";
  if (!recipient)
    return new Response("Backup disabled: chưa có email nhận backup");
  // Nút "Gửi backup thử" trong Admin phải chạy được ngay cả khi lịch tự động
  // đang Tắt; chỉ áp dụng gating lịch/ngày cho lần chạy thật từ Vercel Cron.
  if (!isTestRequest) {
    if (schedule === "off") return new Response("Backup disabled");
    if (schedule === "weekly" && new Date().getUTCDay() !== 1) {
      return new Response("Weekly backup is not due");
    }
  }

  const tables = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=*${table === "leads" || table === "visitor_sessions" ? "&limit=5000" : ""}`,
        { headers },
      );
      return [table, response.ok ? await response.json() : []] as const;
    }),
  );
  const backup = JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      tables: Object.fromEntries(tables),
    },
    null,
  );
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: `[Backup${new URL(request.url).searchParams.get("test") === "1" ? " Test" : ""}] ${new Date().toISOString().slice(0, 10)}`,
      text: "Bản backup dữ liệu Supabase được đính kèm.",
      attachments: [
        {
          filename: `backup-${new Date().toISOString().slice(0, 10)}.json`,
          content: Buffer.from(backup, "utf8").toString("base64"),
        },
      ],
    }),
  });
  if (!emailResponse.ok) {
    console.error("Backup email failed", await emailResponse.text());
    return new Response("Backup email failed", { status: 502 });
  }
  return new Response("Backup sent");
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(
    consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
  );
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as {
      unhandled?: unknown;
      message?: unknown;
    };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (isBackupRequest(request)) return await handleBackupRequest(request);
      if (isAnalyticsReportRequest(request))
        return await handleAnalyticsReportRequest(request);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const headers = new Headers(normalized.headers);
      headers.set("Cache-Control", "no-store, max-age=0");
      headers.set("Pragma", "no-cache");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      return new Response(normalized.body, {
        status: normalized.status,
        statusText: normalized.statusText,
        headers,
      });
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
