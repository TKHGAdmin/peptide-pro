"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  GripVertical,
} from "lucide-react";
import clsx from "clsx";

export default function ContentCalendar() {
  const {
    calendarEvents,
    suggestions,
    removeCalendarEvent,
    scheduleSuggestion,
    updateCalendarEvent,
  } = useAppStore();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)); // March 2026
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month fill
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({
        date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month fill
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({
        date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof calendarEvents> = {};
    for (const event of calendarEvents) {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    }
    return map;
  }, [calendarEvents]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const today = new Date().toISOString().split("T")[0];

  const unscheduledSuggestions = suggestions.filter(
    (s) => s.status === "suggested"
  );

  const selectedEvent = selectedEventId
    ? calendarEvents.find((e) => e.id === selectedEventId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Calendar</h2>
          <p className="text-gray-500 mt-1">
            Plan and schedule your content strategy
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
            {calendarDays.map((day, i) => {
              const events = eventsByDate[day.date] || [];
              const isToday = day.date === today;
              return (
                <div
                  key={i}
                  className={clsx(
                    "bg-white min-h-[100px] p-2 cursor-pointer hover:bg-blue-50/30 transition",
                    !day.isCurrentMonth && "opacity-40"
                  )}
                  onClick={() => {
                    setSelectedSlotDate(day.date);
                    if (events.length === 0) {
                      setShowScheduleModal(true);
                    }
                  }}
                >
                  <div
                    className={clsx(
                      "text-sm font-medium mb-1",
                      isToday
                        ? "w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center"
                        : "text-gray-700"
                    )}
                  >
                    {day.day}
                  </div>
                  <div className="space-y-1">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventId(event.id);
                        }}
                        className={clsx(
                          "w-full text-left text-[11px] px-1.5 py-1 rounded truncate",
                          event.suggestion.contentType === "REEL"
                            ? "bg-purple-100 text-purple-700"
                            : event.suggestion.contentType === "CAROUSEL"
                            ? "bg-blue-100 text-blue-700"
                            : event.suggestion.contentType === "VIDEO"
                            ? "bg-pink-100 text-pink-700"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {event.suggestion.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Event Detail */}
          {selectedEvent && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Event Detail
                </h4>
                <button
                  onClick={() => {
                    removeCalendarEvent(selectedEvent.id);
                    setSelectedEventId(null);
                  }}
                  className="p-1 hover:bg-red-50 rounded text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {selectedEvent.suggestion.title}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedEvent.suggestion.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedEvent.date).toLocaleDateString()} at{" "}
                  {selectedEvent.time}
                </div>
                <div className="flex gap-2 mt-2">
                  <span
                    className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      selectedEvent.suggestion.contentType === "REEL"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {selectedEvent.suggestion.contentType}
                  </span>
                  <span
                    className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      selectedEvent.status === "scheduled"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {selectedEvent.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 leading-relaxed">
                  {selectedEvent.suggestion.suggestedCaption.slice(0, 200)}...
                </p>
              </div>
            </div>
          )}

          {/* Unscheduled Suggestions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              Unscheduled Content
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {unscheduledSuggestions.length === 0 ? (
                <p className="text-xs text-gray-400">
                  All suggestions have been scheduled!
                </p>
              ) : (
                unscheduledSuggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-brand-300 transition"
                    onClick={() => {
                      if (selectedSlotDate) {
                        scheduleSuggestion(sug.id, selectedSlotDate, sug.bestTimeToPost.split(" at ")[1] || "10:00");
                      } else {
                        setShowScheduleModal(true);
                      }
                    }}
                  >
                    <p className="text-xs font-medium text-gray-900">
                      {sug.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          sug.contentType === "REEL"
                            ? "bg-purple-100 text-purple-700"
                            : sug.contentType === "CAROUSEL"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {sug.contentType}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Est. {sug.estimatedEngagement.toFixed(1)}% eng
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[480px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Schedule Content
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedSlotDate
                ? `For ${new Date(selectedSlotDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}`
                : "Select a date first"}
            </p>
            <div className="space-y-3">
              {unscheduledSuggestions.map((sug) => (
                <button
                  key={sug.id}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 transition"
                  onClick={() => {
                    if (selectedSlotDate) {
                      scheduleSuggestion(
                        sug.id,
                        selectedSlotDate,
                        sug.bestTimeToPost.split(" at ")[1] || "10:00"
                      );
                      setShowScheduleModal(false);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {sug.title}
                    </p>
                    <span
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded-full",
                        sug.contentType === "REEL"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {sug.contentType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {sug.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Est. {sug.estimatedEngagement.toFixed(1)}% eng</span>
                    <span>Brand: {sug.brandAlignmentScore}%</span>
                    <span>Best: {sug.bestTimeToPost}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
