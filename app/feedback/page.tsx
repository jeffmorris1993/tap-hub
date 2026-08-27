import { FeedbackView } from "./FeedbackView";

export default async function Feedback({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <FeedbackView initialTab={tab === "prayer" ? "prayer" : "feedback"} />;
}
