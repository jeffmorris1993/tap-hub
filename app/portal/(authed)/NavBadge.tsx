import { supabaseAdmin } from "../../../lib/supabase/server";

/** Sidebar pending-count pill. Rendered inside a Suspense boundary from the
 *  layout so its HEAD count query streams in without blocking the shell. */
export async function PendingBadge({ table }: { table: "events" | "announcements" }) {
  const { count } = await supabaseAdmin()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");
  if (!count) return null;
  return (
    <span
      style={{
        background: "#e7b84e",
        color: "#0b101c",
        fontSize: "10.5px",
        fontWeight: 800,
        minWidth: "19px",
        height: "19px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 5px",
      }}
    >
      {count}
    </span>
  );
}
