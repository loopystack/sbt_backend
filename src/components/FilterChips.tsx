import React from "react";

export default function FilterChips() {
    return (
      <div className="flex flex-wrap gap-2">
        <button className="rounded-full border border-border px-3 py-1 text-sm hover:bg-white/5">
          Date ▾
        </button>
        <button className="rounded-full border border-border px-3 py-1 text-sm hover:bg-white/5">
          League ▾
        </button>
        <button className="rounded-full border border-border px-3 py-1 text-sm hover:bg-white/5">
          Market ▾
        </button>
        <button className="rounded-full border border-border px-3 py-1 text-sm hover:bg-white/5">
          Sort ▾
        </button>
      </div>
    );
  }
  