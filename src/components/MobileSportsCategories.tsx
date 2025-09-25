import React, { useState } from "react";

export default function MobileSportsCategories() {
  const [selectedSport, setSelectedSport] = useState("Football");

  const sports = [
    { name: "Football", icon: "/assets/sports_icons/football.png", active: true },
    { name: "Basketball", icon: "/assets/sports_icons/basketball.png", active: false },
    { name: "Tennis", icon: "/assets/sports_icons/tennis.png", active: false },
    { name: "Hockey", icon: "/assets/sports_icons/hockey.png", active: false },
    { name: "Golf", icon: "/assets/sports_icons/golf.png", active: false },
    { name: "Volleyball", icon: "/assets/sports_icons/volleyball.png", active: false },
    { name: "Snooker", icon: "/assets/sports_icons/snooker.png", active: false },
    { name: "Player", icon: "/assets/sports_icons/player.png", active: false },
  ];

  return (
    <div className="lg:hidden bg-black border-b border-gray-800 px-1 py-2">
      {/* Sports Categories - 8 Icons Only */}
      <div className="flex gap-0.5 pb-1">
        {sports.map((sport) => (
          <button
            key={sport.name}
            onClick={() => setSelectedSport(sport.name)}
            className={`flex-1 min-w-0 p-0.5 sm:p-1 rounded-lg transition-colors ${
              selectedSport === sport.name
                ? "bg-yellow-400"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
            title={sport.name}
          >
            <img 
              src={sport.icon} 
              alt={sport.name}
              className="w-full h-5 sm:h-6 object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
