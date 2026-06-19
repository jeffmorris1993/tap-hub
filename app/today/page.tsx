import {
  getSundaySchedule,
  getWeekLookahead,
  getEveningTonight,
} from "../../lib/supabase/queries";
import { TodayView } from "./TodayView";

export const revalidate = 60;

export default async function Today() {
  const [schedule, weekLookahead, evening] = await Promise.all([
    getSundaySchedule(),
    getWeekLookahead(),
    getEveningTonight(),
  ]);
  return <TodayView schedule={schedule} weekLookahead={weekLookahead} evening={evening} />;
}
