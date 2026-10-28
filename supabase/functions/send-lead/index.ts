// Supabase Edge Function: receives EditSimple website form submissions and emails them via Resend.
// Expected JSON: { form: "popup" | "contact", subject: string, website: "" (honeypot), fields: { Email, ... } }
// Secrets (set with `supabase secrets set ...`):
//   RESEND_API_KEY  - your Resend API key (re_...)
//   TO_EMAIL        - where leads go, e.g. contact@editsimple.in
//   FROM_EMAIL      - sender on your verified domain, e.g. "EditSimple Website <leads@editsimple.in>"
//   ALLOWED_ORIGINS - comma-separated site origins, e.g. https://editsimple.in,https://is3604.github.io

function cors(origin: string | null) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim());
  const ok = allowed.includes("*") || (origin !== null && allowed.includes(origin));
  return {
    "Access-Control-Allow-Origin": ok ? (origin ?? "*") : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  if (body.website) return Response.json({ ok: true }, { headers }); // honeypot filled: silently drop bots

  const raw = (typeof body.fields === "object" && body.fields) ? body.fields as Record<string, unknown> : {};
  const fields = Object.entries(raw).filter(([, v]) => String(v ?? "").trim() !== "");
  const email = String(raw.Email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: "Valid email required" }, { status: 400, headers });
  }
  if (fields.length > 20) return Response.json({ error: "Too many fields" }, { status: 400, headers });

  const subject = String(body.subject ?? "New website enquiry").slice(0, 150);
  const rows = fields
    .map(([k, v]) =>
      `<tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:600;background:#fff7f2">${esc(k)}</td>` +
      `<td style="padding:8px 12px;border:1px solid #eee">${esc(String(v).slice(0, 2000)).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#211b17">` +
    `<h2 style="color:#c2410c;margin:0 0 12px">${esc(subject)}</h2>` +
    `<table style="border-collapse:collapse">${rows}</table>` +
    `<p style="color:#888;font-size:12px;margin-top:16px">Sent from the EditSimple website (${esc(body.form ?? "form")}).</p></div>`;
  const text = fields.map(([k, v]) => `${k}: ${v}`).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL"),
      to: [Deno.env.get("TO_EMAIL")],
      reply_to: email,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return Response.json({ error: "Email failed" }, { status: 502, headers });
  }
  return Response.json({ ok: true }, { headers });
});
