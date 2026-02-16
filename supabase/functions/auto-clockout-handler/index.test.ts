import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auto-clockout-handler`;

Deno.test("auto-clockout-handler: returns success response with expected fields", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.success, true);
  assertExists(body.currentTime);
  assertExists(body.closingTime);
  assertExists(body.autoClockoutDeadline);
  assertExists(body.timestamp);
  assertEquals(typeof body.notificationsSent, "number");
  assertEquals(typeof body.autoClockouts, "number");
  assertEquals(typeof body.nightShiftClockouts, "number");
  assertEquals(typeof body.activeSessions, "number");
  assertEquals(typeof body.nightShiftSessions, "number");

  console.log("Response:", JSON.stringify(body, null, 2));
});

Deno.test("auto-clockout-handler: handles CORS preflight", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  await response.text();
  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
});
