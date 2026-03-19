"use client";

import { create } from "zustand";
import type {
  InstagramProfile,
  InstagramPost,
  BrandProfile,
  ContentSuggestion,
  NicheCompetitor,
  NicheTrend,
  AnalyticsData,
  CalendarEvent,
} from "@/types/instagram";
import {
  demoProfile,
  demoPosts,
  demoBrandProfile,
  demoCompetitors,
  demoTrends,
  demoSuggestions,
  demoCalendarEvents,
  demoAnalytics,
} from "@/lib/demo-data";

interface AppState {
  // Data
  profile: InstagramProfile | null;
  posts: InstagramPost[];
  brand: BrandProfile | null;
  competitors: NicheCompetitor[];
  trends: NicheTrend[];
  suggestions: ContentSuggestion[];
  calendarEvents: CalendarEvent[];
  analytics: AnalyticsData | null;

  // UI State
  isLoading: boolean;
  activeTab: string;
  selectedDate: string | null;

  // Actions
  loadDemoData: () => void;
  setActiveTab: (tab: string) => void;
  setSelectedDate: (date: string | null) => void;
  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  removeCalendarEvent: (id: string) => void;
  updateSuggestionStatus: (id: string, status: ContentSuggestion["status"]) => void;
  scheduleSuggestion: (suggestionId: string, date: string, time: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  posts: [],
  brand: null,
  competitors: [],
  trends: [],
  suggestions: [],
  calendarEvents: [],
  analytics: null,
  isLoading: false,
  activeTab: "dashboard",
  selectedDate: null,

  loadDemoData: () => {
    set({
      profile: demoProfile,
      posts: demoPosts,
      brand: demoBrandProfile,
      competitors: demoCompetitors,
      trends: demoTrends,
      suggestions: demoSuggestions,
      calendarEvents: demoCalendarEvents,
      analytics: demoAnalytics,
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  addCalendarEvent: (event) =>
    set((state) => ({
      calendarEvents: [...state.calendarEvents, event],
    })),

  updateCalendarEvent: (id, updates) =>
    set((state) => ({
      calendarEvents: state.calendarEvents.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  removeCalendarEvent: (id) =>
    set((state) => ({
      calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
    })),

  updateSuggestionStatus: (id, status) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    })),

  scheduleSuggestion: (suggestionId, date, time) => {
    const state = get();
    const suggestion = state.suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    const event: CalendarEvent = {
      id: `cal-${Date.now()}`,
      date,
      time,
      suggestion: { ...suggestion, status: "scheduled", scheduledDate: date, scheduledTime: time },
      status: "scheduled",
    };

    set((state) => ({
      calendarEvents: [...state.calendarEvents, event],
      suggestions: state.suggestions.map((s) =>
        s.id === suggestionId ? { ...s, status: "scheduled", scheduledDate: date, scheduledTime: time } : s
      ),
    }));
  },
}));
