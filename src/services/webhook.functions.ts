import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const relaySchema = z.object({
  endpoint: z.string().url(),
  body: z.unknown(),
  headers: z.record(z.string(), z.string()).optional(),
});

function isAllowedEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

export const relayWebhook = createServerFn({ method: "POST" })
  .validator((data) => relaySchema.parse(data))
  .handler(async ({ data }) => {
    if (!isAllowedEndpoint(data.endpoint)) {
      return {
        ok: false,
        status: 400,
        body: "",
        detail: "invalid_endpoint",
      };
    }

    try {
      const rawBody =
        typeof data.body === "string" ? data.body : JSON.stringify(data.body);
      const headers = {
        "Content-Type": "application/json",
        ...data.headers,
      };
      const response = await fetch(data.endpoint, {
        method: "POST",
        headers,
        body: rawBody,
      });
      const text = (await response.text()).trim();
      return {
        ok: response.ok,
        status: response.status,
        body: text.slice(0, 300),
        detail: response.ok ? undefined : text.slice(0, 180),
      };
    } catch (error) {
      return {
        ok: false,
        status: 502,
        body: "",
        detail: error instanceof Error ? error.message : "relay_failed",
      };
    }
  });
