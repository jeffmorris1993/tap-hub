import {
  getTodaySchedule,
  getWeekLookahead,
  getEveningTonight,
  listEventsOnDate,
} from "../../lib/supabase/queries";
import { toDisplayEvent, sortByNextOccurrence } from "../../lib/events-display";
import { detroitNow, detroitDateIso } from "../../lib/tz";
import { TodayView } from "./TodayView";

export const revalidate = 60;

export default async function Today() {
  const now = detroitNow();
  const todayIso = detroitDateIso();
  const [schedule, weekLookahead, evening, todaysEventsRaw] = await Promise.all([
    getTodaySchedule(now),
    getWeekLookahead(),
    getEveningTonight(),
    listEventsOnDate(todayIso),
  ]);
  const todaysEvents = sortByNextOccurrence(todaysEventsRaw.map((e) => toDisplayEvent(e, now)));
  return (
    <TodayView
      schedule={schedule}
      weekLookahead={weekLookahead}
      evening={evening}
      todaysEvents={todaysEvents}
    />
  );
}
