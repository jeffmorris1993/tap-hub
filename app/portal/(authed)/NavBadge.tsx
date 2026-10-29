import { supabaseAdmin } from "../../../lib/supabase/server";

/** Pending-count pill. Rendered inside a Suspense boundary from the layout
 *  so its HEAD count query streams in without blocking the shell.
 *  `variant` picks the sidebar pill or the smaller tab-bar/sheet bubble. */
export async function PendingBadge({
  table,
  variant = "pill",
}: {
  table: "events" | "announcements";
  variant?: "pill" | "compact";
}) {
  const { count } = await supabaseAdmin()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");
  if (!count) return null;

  const compact = variant === "compact";
  return (
    <span
      style={{
        background: "#e7b84e",
        color: "#0b101c",
        fontSize: compact ? "11px" : "10.5px",
        fontWeight: 800,
        minWidth: compact ? "20px" : "19px",
        height: compact ? "20px" : "19px",
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
