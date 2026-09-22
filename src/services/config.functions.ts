import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saveSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
});

const countdownSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
});

async function decrementCountdownWithServiceRoleImpl(input: {
  url: string;
  anonKey?: string;
  accessToken?: string;
}): Promise<{ ok: boolean; changed?: boolean; reason?: string }> {
  const url = input.url.replace(/\/$/, "");
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
  if (!serviceKey && !input.anonKey)
    return { ok: false, reason: "missing_supabase_key" };
  const bearerToken = serviceKey || input.accessToken || input.anonKey || "";
  if (!serviceKey && input.accessToken) {
    const response = await fetch(
      `${url}/rest/v1/funnel_configs?id=eq.1&select=data`,
      {
        headers: {
          apikey: input.anonKey || input.accessToken,
          Authorization: `Bearer ${input.accessToken}`,
        },
      },
    );
    if (!response.ok) return { ok: false, reason: "read_failed" };
    const rows = (await response.json()) as Array<{
      data?: Record<string, unknown>;
    }>;
    const data = rows[0]?.data;
    const countdown = data?.["countdown"] as
      Record<string, unknown> | undefined;
    const slots = Number(countdown?.["slotsLeft"]);
    if (!countdown || !Number.isFinite(slots)) {
      return { ok: false, reason: "countdown_not_configured" };
    }
    if (slots <= 0) return { ok: true, changed: false };
    const nextData = structuredClone(data ?? {}) as Record<string, unknown>;
    nextData["countdown"] = { ...countdown, slotsLeft: slots - 1 };
    const write = await fetch(`${url}/rest/v1/funnel_configs?id=eq.1`, {
      method: "PATCH",
      headers: {
        apikey: input.anonKey || input.accessToken,
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        data: nextData,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!write.ok) return { ok: false, reason: "write_failed" };
    return { ok: true, changed: true };
  }
  if (!serviceKey && input.anonKey) {
    const rpc = await fetch(`${url}/rest/v1/rpc/decrement_funnel_countdown`, {
      method: "POST",
      headers: {
        apikey: input.anonKey,
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!rpc.ok) return { ok: false, reason: "rpc_failed" };
    const result = (await rpc.json().catch(() => true)) as unknown;
    return result === false
      ? { ok: true, changed: false }
      : { ok: true, changed: true };
  }
  const headers = {
    apikey: serviceKey,
    Authorization: serviceKey ? `Bearer ${serviceKey}` : "",
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const read = await fetch(
      `${url}/rest/v1/funnel_configs?id=eq.1&select=data`,
      { headers },
    );
    if (!read.ok) return { ok: false, reason: "read_failed" };

    const rows = (await read.json()) as Array<{
      data?: Record<string, unknown>;
    }>;
    const dataRow = rows[0]?.data;
    const countdown = dataRow?.["countdown"] as
      Record<string, unknown> | undefined;
    if (!countdown || typeof countdown["slotsLeft"] === "undefined") {
      return { ok: false, reason: "countdown_not_configured" };
    }
    const currentSlots = Number(countdown["slotsLeft"]);
    if (!Number.isFinite(currentSlots)) {
      return { ok: false, reason: "invalid_slots" };
    }
    if (currentSlots <= 0) return { ok: true, changed: false };
    const nextData = structuredClone(
      (dataRow ?? {}) as Record<string, unknown>,
    );
    nextData["countdown"] = {
      ...(countdown ?? {}),
      enabled: true,
      autoDecrement: true,
      headline:
        typeof countdown?.["headline"] === "string"
          ? countdown["headline"]
          : "suất học bổng miễn 100% KTX tháng này",
      slotsLeft: currentSlots - 1,
      template:
        typeof countdown?.["template"] === "string"
          ? countdown["template"]
          : "premium",
    };

    const write = await fetch(
      `${url}/rest/v1/funnel_configs?id=eq.1&data->countdown->>slotsLeft=eq.${currentSlots}`,
      {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          data: nextData,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!write.ok) return { ok: false, reason: "write_failed" };
    const changedRows =
      typeof write.json === "function"
        ? ((await write.json().catch(() => [])) as unknown[])
        : [true];
    if (changedRows.length > 0) return { ok: true, changed: true };
  }
  return { ok: false, reason: "write_conflict" };
}

function stripSecrets(config: Record<string, unknown>) {
  const copy = structuredClone(config);
  const admin = (copy["admin"] || {}) as Record<string, unknown>;
  admin["supabaseAnonKey"] = "";
  admin["password"] = "";
  admin["backupCronToken"] = "";
  copy["admin"] = admin;
  const emailAutomation = (copy["emailAutomation"] || {}) as Record<
    string,
    unknown
  >;
  for (const key of [
    "resendApiKey",
    "gmailClientId",
    "gmailClientSecret",
    "gmailRefreshToken",
  ])
    emailAutomation[key] = "";
  copy["emailAutomation"] = emailAutomation;
  const tracking = (copy["tracking"] || {}) as Record<string, unknown>;
  tracking["tiktokAccessToken"] = "";
  copy["tracking"] = tracking;
  return copy;
}

export const saveConfigWithSupabaseAuth = createServerFn({ method: "POST" })
  .validator((input) => saveSchema.parse(input))
  .handler(async ({ data }) => {
    const authResponse = await fetch(
      `${data.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: data.anonKey },
        body: JSON.stringify({ email: data.email, password: data.password }),
      },
    );
    if (!authResponse.ok) return { ok: false, reason: "auth_failed" } as const;
    const authPayload = (await authResponse.json()) as {
      access_token?: string;
    };
    if (!authPayload.access_token)
      return { ok: false, reason: "auth_failed" } as const;

    const response = await fetch(
      `${data.url.replace(/\/$/, "")}/rest/v1/funnel_configs?on_conflict=id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: data.anonKey,
          Authorization: `Bearer ${authPayload.access_token}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([
          {
            id: 1,
            data: stripSecrets(data.config),
            updated_at: new Date().toISOString(),
          },
        ]),
      },
    );
    if (!response.ok)
      return { ok: false, reason: "config_write_failed" } as const;
    return { ok: true, accessToken: authPayload.access_token } as const;
  });

export async function decrementCountdownWithServiceRole(input: {
  data: { url: string; anonKey?: string; accessToken?: string };
}): Promise<{ ok: boolean; changed?: boolean; reason?: string }> {
  const parsed = countdownSchema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }

  const url = (process.env["SUPABASE_URL"] || parsed.data.url).replace(
    /\/$/,
    "",
  );
  return decrementCountdownWithServiceRoleImpl(
    parsed.data.anonKey || parsed.data.accessToken
      ? {
          url,
          ...(parsed.data.anonKey ? { anonKey: parsed.data.anonKey } : {}),
          ...(parsed.data.accessToken
            ? { accessToken: parsed.data.accessToken }
            : {}),
        }
      : { url },
  );
}

export const decrementCountdownWithServiceRoleServer = createServerFn({
  method: "POST",
})
  .validator((input) => countdownSchema.parse(input))
  .handler(async ({ data }) => {
    return decrementCountdownWithServiceRoleImpl(
      data.anonKey || data.accessToken
        ? {
            url: (process.env["SUPABASE_URL"] || data.url).replace(/\/$/, ""),
            ...(data.anonKey ? { anonKey: data.anonKey } : {}),
            ...(data.accessToken ? { accessToken: data.accessToken } : {}),
          }
        : {
            url: (process.env["SUPABASE_URL"] || data.url).replace(/\/$/, ""),
          },
    );
  });
