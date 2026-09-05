import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id") || request.nextUrl.searchParams.get("appId");

    if (!id) {
      return new NextResponse("Missing application ID", { status: 400 });
    }

    const { data, error } = await supabase
      .from("exhibitor_applications")
      .select("id, brand_name_zh, deposit_proof_url")
      .eq("id", id)
      .maybeSingle();

    if (error || !data || !data.deposit_proof_url) {
      return new NextResponse("Remittance proof not found or not uploaded yet", { 
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const proofUrl = data.deposit_proof_url.trim();

    // If it is stored as a Data URL (base64)
    if (proofUrl.startsWith("data:")) {
      const matches = proofUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            "Content-Disposition": "inline",
          },
        });
      }
    }

    // If it is an external URL (e.g. Supabase Storage public URL or CDN)
    if (proofUrl.startsWith("http://") || proofUrl.startsWith("https://")) {
      return NextResponse.redirect(proofUrl, 302);
    }

    return new NextResponse("Invalid proof URL format", { status: 500 });
  } catch (err: any) {
    console.error("Error serving deposit proof:", err);
    return new NextResponse("Internal server error: " + err.message, { status: 500 });
  }
}
