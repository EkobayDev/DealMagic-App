import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, Users, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const fmt = (iso) => format(parseISO(iso), "EEE, MMM d · h:mm a");

function EventTypeCard({ et, slots }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSlots = expanded ? slots : slots.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-start justify-between p-5 border-b border-slate-50">
        <div>
          <p className="text-sm font-semibold text-slate-900">{et.name}</p>
          {et.description_plain && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{et.description_plain}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" /> {et.duration} min
            </span>
            {et.scheduling_url && (
              <a
                href={et.scheduling_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Book this
              </a>
            )}
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0 ml-3">
          Active
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Available Slots (Next 7 Days)
        </p>
        {slots.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No available slots in the next 7 days.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFFF00] border border-yellow-400 shrink-0" />
                  <span className="text-xs text-slate-700">{fmt(slot.start_time)}</span>
                </div>
              ))}
            </div>
            {slots.length > 5 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Show less" : `+${slots.length - 5} more slots`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ScheduledMeetingCard({ event }) {
  const invitee = event.invitees?.[0];
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
        <Users className="w-5 h-5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{event.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{fmt(event.start_time)}</p>
        {invitee && (
          <p className="text-xs text-slate-400 mt-1">
            With: <span className="font-medium text-slate-600">{invitee.name || invitee.email}</span>
            {invitee.email && invitee.name && <span className="ml-1 text-slate-400">({invitee.email})</span>}
          </p>
        )}
      </div>
      <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
        {Math.round((new Date(event.end_time) - new Date(event.start_time)) / 60000)} min
      </span>
    </div>
  );
}

export default function Scheduling() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("getCalendlyData", {});
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduling</h1>
          <p className="text-sm text-slate-500 mt-1">Calendly availability & upcoming meetings</p>
          {data?.calendlyUser && (
            <p className="text-xs text-slate-400 mt-1">
              Connected as <span className="font-medium text-slate-600">{data.calendlyUser.name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={load}
            disabled={loading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-24 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm">{error}</div>
      )}

      {!loading && data && (
        <>
          {/* Upcoming Meetings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-800">
                Upcoming Meetings
                <span className="ml-2 text-sm font-normal text-slate-400">next 7 days</span>
              </h2>
            </div>
            {data.scheduledEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
                No meetings scheduled in the next 7 days.
              </div>
            ) : (
              <div className="space-y-3">
                {data.scheduledEvents
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .map((ev) => (
                    <ScheduledMeetingCard key={ev.uri} event={ev} />
                  ))}
              </div>
            )}
          </div>

          {/* Event Types & Availability */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-bold text-slate-800">
                Event Types & Available Slots
              </h2>
            </div>
            {data.eventTypes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
                No active event types found on your Calendly account.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.eventTypes.map((et) => (
                  <EventTypeCard
                    key={et.uri}
                    et={et}
                    slots={data.availabilityByType[et.uri] || []}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}