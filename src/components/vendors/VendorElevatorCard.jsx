import React, { useRef, useState } from "react";
import { Phone, Mail, Star, Globe, Play } from "lucide-react";

const CATEGORY_COLORS = {
  appraisers: "bg-purple-100 text-purple-700",
  inspectors: "bg-blue-100 text-blue-700",
  lawn: "bg-green-100 text-green-700",
  roofers: "bg-orange-100 text-orange-700",
  termite: "bg-red-100 text-red-700",
  title: "bg-teal-100 text-teal-700",
  make_ready_cleaning: "bg-pink-100 text-pink-700",
  painters: "bg-indigo-100 text-indigo-700",
  flooring: "bg-amber-100 text-amber-700",
  handyman: "bg-cyan-100 text-cyan-700",
  hauling_debris: "bg-stone-100 text-stone-700",
};

export default function VendorElevatorCard({ vendor, selected, onSelect }) {
  const videoRef = useRef(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const handleMouseEnter = () => {
    if (videoRef.current && vendor.elevator_pitch_url) {
      videoRef.current.play().catch(() => {});
      setVideoPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setVideoPlaying(false);
    }
  };

  return (
    <button
      onClick={() => onSelect(vendor)}
      className={`w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden hover:shadow-lg ${
        selected
          ? "border-violet-500 shadow-lg shadow-violet-100"
          : "border-slate-100 hover:border-violet-200"
      }`}
    >
      {/* Contact photo / video area */}
      <div
        className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Photo */}
        {vendor.contact_photo_url ? (
          <img
            src={vendor.contact_photo_url}
            alt={vendor.contact_name || vendor.business_name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoPlaying ? "opacity-0" : "opacity-100"}`}
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-100 to-slate-100 transition-opacity duration-300 ${videoPlaying ? "opacity-0" : "opacity-100"}`}>
            <span className="text-4xl font-bold text-violet-300">
              {vendor.business_name?.[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Video */}
        {vendor.elevator_pitch_url && (
          <video
            ref={videoRef}
            src={vendor.elevator_pitch_url}
            muted
            loop
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoPlaying ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Video hint badge */}
        {vendor.elevator_pitch_url && !videoPlaying && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Play className="w-3 h-3 fill-white" /> Hover to play
          </div>
        )}

        {/* Selected overlay */}
        {selected && (
          <div className="absolute inset-0 bg-violet-600/10 flex items-center justify-center">
            <div className="bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              ✓ Selected
            </div>
          </div>
        )}

        {/* Logo badge */}
        {vendor.logo_url && (
          <div className="absolute top-2 left-2 bg-white rounded-lg p-1 shadow border border-slate-100">
            <img src={vendor.logo_url} alt={vendor.business_name} className="h-7 w-auto object-contain" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2 bg-white">
        <div>
          <p className="font-bold text-slate-900 text-sm leading-tight">{vendor.business_name}</p>
          {vendor.contact_name && (
            <p className="text-xs text-slate-500 mt-0.5">{vendor.contact_name}</p>
          )}
        </div>

        {/* Category badge */}
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-block ${CATEGORY_COLORS[vendor.category] || "bg-slate-100 text-slate-500"}`}>
          {vendor.category?.replace(/_/g, " ")}
        </span>

        {/* Star rating */}
        {vendor.star_rating > 0 && (
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`w-3 h-3 ${s <= vendor.star_rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
            ))}
          </div>
        )}

        {/* Notes */}
        {(vendor.notes || vendor.review_notes) && (
          <p className="text-xs text-slate-500 line-clamp-2 italic">
            "{vendor.review_notes || vendor.notes}"
          </p>
        )}

        {/* Contact links */}
        <div className="flex flex-wrap gap-2 pt-1">
          {vendor.cell_phone && (
            <a href={`tel:${vendor.cell_phone}`} onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-violet-700 transition-colors">
              <Phone className="w-3 h-3" /> {vendor.cell_phone}
            </a>
          )}
          {vendor.email && (
            <a href={`mailto:${vendor.email}`} onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 transition-colors truncate max-w-[160px]">
              <Mail className="w-3 h-3" /> {vendor.email}
            </a>
          )}
          {vendor.website && (
            <a href={vendor.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-violet-700 transition-colors">
              <Globe className="w-3 h-3" /> Website
            </a>
          )}
        </div>
      </div>
    </button>
  );
}