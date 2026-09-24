import { NextResponse } from "next/server";

import { rpcErrorStatus } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";

/** POST /api/requests/:id/decline — owner declines a pending request. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("decline_request", { p_request_id: id });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: rpcErrorStatus(error.message) },
    );
  }
  return NextResponse.json({ ok: true });
}
