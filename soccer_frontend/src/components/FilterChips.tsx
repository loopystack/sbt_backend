import React from "react";

export default function FilterChips() {
    return (
      <div className="flex flex-wrap gap-2 px-2">
        <button className="rounded-full border border-border px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-white/5 transition-colors">
          Date ▾
        </button>
        <button className="rounded-full border border-border px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-white/5 transition-colors">
          League ▾
        </button>
        <button className="rounded-full border border-border px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-white/5 transition-colors">
          Market ▾
        </button>
        <button className="rounded-full border border-border px-2 sm:px-3 py-1 text-xs sm:text-sm hover:bg-white/5 transition-colors">
          Sort ▾
        </button>
      </div>
    );
  }
  
