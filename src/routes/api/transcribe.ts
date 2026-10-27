import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
        if (!token) return Response.json({ error: "Sign in required" }, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !auth.user) return Response.json({ error: "Sign in required" }, { status: 401 });
        if (Number(request.headers.get("content-length") ?? 0) > 12000000) return Response.json({ error: "Audio too large" }, { status: 413 });
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "LOVABLE_API_KEY missing" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid multipart body" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const fileEntry = form.get("file");
        const language = (form.get("language") as string | null) ?? undefined;

        if (!fileEntry || typeof fileEntry === "string") {
          return new Response(
            JSON.stringify({ error: "Missing 'file' field" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        const file = fileEntry as unknown as File;

        if (file.size > 10000000 || (language && !["fr", "en"].includes(language))) return Response.json({ error: "Invalid audio" }, { status: 400 });
        if ((file as Blob).size < 2048) {
          return new Response(
            JSON.stringify({ error: "empty_audio" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        const name = (file as File).name || "recording.wav";
        upstream.append("file", file, name);
        if (language) upstream.append("language", language);

        const resp = await fetch(
          "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: upstream,
          },
        );

        const bodyText = await resp.text();
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ error: "transcribe_failed", status: resp.status, detail: bodyText.slice(0, 500) }),
            { status: resp.status, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          const json = JSON.parse(bodyText);
          return new Response(JSON.stringify({ text: json.text ?? "" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ text: bodyText }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
