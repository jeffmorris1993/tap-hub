"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "../../ConfirmDialog";
import { useToast } from "../../Toaster";
import { CopyLinkButton } from "../FormAdminCard";
import { deleteForm, setFormOpen } from "../actions";

const btnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#cdd3e0",
  border: "1px solid rgba(244,241,234,.16)",
  borderRadius: "9px",
  padding: "9px 13px",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
};

export function FormControls({
  id,
  slug,
  open,
  submissionCount,
}: {
  id: string;
  slug: string;
  open: boolean;
  submissionCount: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function onToggleOpen() {
    startTransition(async () => {
      const r = await setFormOpen(id, !open);
      if (r.ok) {
        toast(open ? "Form closed — the link now says so." : "Form reopened.", "success");
        router.refresh();
      } else {
        toast(r.error, "error");
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const r = await deleteForm(id);
      if (r.ok) {
        toast("Form and its responses deleted.", "success");
        router.push("/portal/forms");
        router.refresh();
      } else {
        setConfirmDelete(false);
        toast(r.error, "error");
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
      <CopyLinkButton slug={slug} />
      <button type="button" onClick={onToggleOpen} disabled={pending} style={btnStyle}>
        {open ? "Close form" : "Reopen form"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        disabled={pending}
        style={{ ...btnStyle, color: "#ff8a8a", borderColor: "rgba(255,138,138,.3)" }}
      >
        Delete
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this form?"
        body={
          submissionCount > 0
            ? `This deletes the form and all ${submissionCount} ${
                submissionCount === 1 ? "response" : "responses"
              }. The emailed copies are unaffected, but this can't be undone.`
            : "The link will stop working. This can't be undone."
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
