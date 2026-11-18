import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { parseFormFields } from "../../../lib/standalone-forms";
import { FormView } from "./FormView";

export const dynamic = "force-dynamic";

/**
 * A standalone one-off form, reachable only by its unguessable random slug —
 * the link gets sent to people directly, nothing on the site links here.
 */
export default async function StandaloneFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data, error } = await supabaseAdmin()
    .from("forms")
    .select("id, title, intro, fields, open")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  return (
    <FormView
      form={{
        id: data.id,
        title: data.title,
        intro: data.intro,
        open: data.open,
        fields: parseFormFields(data.fields),
      }}
    />
  );
}
