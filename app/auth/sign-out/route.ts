import { NextResponse, type NextRequest } from "next/server";
import { supabaseSession } from "../../../lib/supabase/auth";

export async function POST(request: NextRequest) {
  const sb = await supabaseSession();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
