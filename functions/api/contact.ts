interface Env {
  RESEND_API_KEY: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, max = 4000): string {
  const str = typeof value === "string" ? value.trim() : "";
  return str.slice(0, max);
}

function toHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isHtmlRequest(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function redirect(request: Request, path: string): Response {
  const location = new URL(path, request.url).toString();
  return Response.redirect(location, 303);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const formData = await request.formData();

    // Quietly succeed on honeypot hits to avoid signaling bot detection.
    if (clean(formData.get("bot-field"), 255)) {
      return redirect(request, "/contact/?sent=1");
    }

    const name = clean(formData.get("name"), 120);
    const email = clean(formData.get("email"), 254).toLowerCase();
    const company = clean(formData.get("company"), 160);
    const useCase = clean(formData.get("use_case"), 200);
    const message = clean(formData.get("message"), 5000);

    if (!name || !email || !message || !EMAIL_RE.test(email)) {
      if (isHtmlRequest(request)) {
        return redirect(request, "/contact/?error=validation");
      }
      return new Response(JSON.stringify({ error: "Invalid form fields." }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (!env.RESEND_API_KEY) {
      return new Response("Missing RESEND_API_KEY.", { status: 500 });
    }

    const to = (env.CONTACT_TO || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (to.length === 0) {
      return new Response("Missing CONTACT_TO.", { status: 500 });
    }

    const from = env.CONTACT_FROM || "Agentrical Contact <onboarding@resend.dev>";
    const subjectBase = company ? `${name} (${company})` : name;
    const subject = `New Contact Form Submission: ${subjectBase}`;

    const textBody =
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Company: ${company || "-"}\n` +
      `Use Case: ${useCase || "-"}\n\n` +
      `Message:\n${message}\n`;

    const htmlBody =
      `<h2>New Contact Form Submission</h2>` +
      `<p><strong>Name:</strong> ${toHtml(name)}</p>` +
      `<p><strong>Email:</strong> ${toHtml(email)}</p>` +
      `<p><strong>Company:</strong> ${toHtml(company || "-")}</p>` +
      `<p><strong>Use Case:</strong> ${toHtml(useCase || "-")}</p>` +
      `<p><strong>Message:</strong></p><p>${toHtml(message).replace(/\n/g, "<br>")}</p>`;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!resendResp.ok) {
      const detail = await resendResp.text();
      return new Response(`Resend error: ${detail}`, { status: 502 });
    }

    if (isHtmlRequest(request)) {
      return redirect(request, "/contact/?sent=1");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(`Contact function error: ${message}`, { status: 500 });
  }
};
