import {
  getTodaySchedule,
  getScheduleForDayOfWeek,
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
  // Always fetch Sunday too, so we can fall back gracefully on days that
  // have nothing scheduled (the empty Saturday case in particular).
  const [schedule, sundaySchedule, weekLookahead, evening, todaysEventsRaw] =
    await Promise.all([
      getTodaySchedule(now),
      getScheduleForDayOfWeek(0),
      getWeekLookahead(),
      getEveningTonight(),
      listEventsOnDate(todayIso),
    ]);
  const todaysEvents = sortByNextOccurrence(
    todaysEventsRaw.map((e) => toDisplayEvent(e, now)),
  );
  return (
    <TodayView
      schedule={schedule}
      sundayFallback={sundaySchedule}
      weekLookahead={weekLookahead}
      evening={evening}
      todaysEvents={todaysEvents}
    />
  );
}
