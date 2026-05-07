import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendlyScheduling() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedType, setExpandedType] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke("getCalendlyData", {});
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#FFFF00] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <p className="text-sm">Failed to load Calendly data</p>
        <Button variant="outline" onClick={fetchData} className="gap-2 text-xs">
          <RefreshCw className="w-3 h-3" /> Retry
        </Button>
      </div>
    );
  }

  const { user, eventTypes, availabilityByType, scheduledEvents } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col items-start">
          <h1 className="text-2xl font-bold text-slate-900">Calendly Scheduling</h1>
          <p className="text-sm text-slate-500 mt-1 mb-3">
            Agent availability &amp; upcoming meetings with vendors
          </p>
          {user && (
            <div className="flex items-center gap-2">
              {user.avatar_url && (
                <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full border border-slate-200" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                <a
                  href={`https://calendly.com/${user.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  calendly.com/{user.slug} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <img
            src="https://media.base44.com/images/public/69b41e51440bd7785a5b082e/850b0b8d7_ChatGPTImageMar16202609_26_07AM.png"
            alt="DealMagic"
            className="h-20 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
      </div>

      {/* Event Types + Availability */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          Meeting Types &amp; Available Slots (Next 7 Days)
        </h2>

        {eventTypes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
            No active event types found on your Calendly account.
          </div>
        ) : (
          eventTypes.map((et) => {
            const slots = availabilityByType[et.uri] || [];
            const isOpen = expandedType === et.uri;
            return (
              <div key={et.uri} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setExpandedType(isOpen ? null : et.uri)}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: et.color || "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{et.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {et.duration} min · {slots.length} slot{slots.length !== 1 ? "s" : ""} available
                    </p>
                  </div>
                  <a
                    href={et.scheduling_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0 mr-3"
                  >
                    Book <ExternalLink className="w-3 h-3" />
                  </a>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-50 px-5 py-4">
                    {slots.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">No available slots in the next 7 days.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {slots.slice(0, 24).map((slot, i) => (
                          <a
                            key={i}
                            href={et.scheduling_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center px-3 py-2 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                          >
                            <span className="text-[11px] font-medium text-slate-500 group-hover:text-blue-600">
                              {format(parseISO(slot.start_time), "EEE, MMM d")}
                            </span>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                              {format(parseISO(slot.start_time), "h:mm a")}
                            </span>
                          </a>
                        ))}
                        {slots.length > 24 && (
                          <div className="flex items-center justify-center text-xs text-slate-400 col-span-full">
                            +{slots.length - 24} more slots — <a href={et.scheduling_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">view all</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Scheduled Meetings */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          Upcoming Scheduled Meetings (Next 30 Days)
        </h2>

        {scheduledEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
            No upcoming meetings scheduled.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {scheduledEvents
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
              .map((ev, i) => {
                const invitees = ev.invitees_counter?.total || 0;
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="shrink-0 text-center min-w-[48px]">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase">
                        {format(parseISO(ev.start_time), "MMM")}
                      </p>
                      <p className="text-xl font-bold text-slate-800 leading-tight">
                        {format(parseISO(ev.start_time), "d")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{ev.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(ev.start_time), "h:mm a")} – {format(parseISO(ev.end_time), "h:mm a")}
                      </p>
                    </div>
                    {invitees > 0 && (
                      <div className="shrink-0 flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                        <Users className="w-3 h-3" /> {invitees}
                      </div>
                    )}
                    <a
                      href={ev.location?.join_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Details <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}