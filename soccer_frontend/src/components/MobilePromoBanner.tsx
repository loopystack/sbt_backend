import React, { useState } from "react";

export default function MobilePromoBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const banners = [
    {
      id: 1,
      title: "JACK BOOST",
      subtitle: "INCREASE WINNINGS UP TO 100%",
      league: "UEFA Europa League",
      background: "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500",
      teams: ["Team A", "Team B"]
    },
    {
      id: 2,
      title: "MEGA BONUS",
      subtitle: "GET UP TO 200% BONUS",
      league: "Premier League",
      background: "bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500",
      teams: ["Team C", "Team D"]
    }
  ];

  return (
    <div className="lg:hidden px-4 py-4">
      {/* Promotional Banner */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className={`${banners[currentSlide].background} p-6 text-white relative`}>
          {/* League Logo */}
          <div className="absolute top-4 right-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-xs font-bold">{banners[currentSlide].league}</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">{banners[currentSlide].title}</h2>
            <p className="text-lg opacity-90">{banners[currentSlide].subtitle}</p>
            
            {/* Teams */}
            <div className="flex items-center gap-4 mt-4">
              {banners[currentSlide].teams.map((team, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">{team.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium">{team}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
        </div>

        {/* Banner Indicators */}
        <div className="flex justify-center gap-2 mt-3">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? "bg-yellow-400" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
