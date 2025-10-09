import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import PopularSports from "../components/PopularSports";
import HotPicks from "../components/HotPicks";
import LatestBonuses from "../components/LatestBonuses";
import OddsTable from "../components/OddsTable";
import OddsDemo from "../components/OddsDemo";
import { useCountry } from "../contexts/CountryContext";
import { openBettingSiteByName } from "../config/bettingSites";

export default function Home() {
  const [searchParams] = useSearchParams();
  const { selectedLeague } = useCountry();
  const highlightParam = searchParams.get('highlight');
  

  // Handle both old format (just number) and new format (id_team1_team2_date)
  let highlightMatchId: number | undefined;
  if (highlightParam) {
    if (highlightParam.includes('_')) {
      // New format: extract just the ID part
      const matchId = highlightParam.split('_')[0];
      highlightMatchId = parseInt(matchId);
      console.log('🎯 New highlight format detected:', { highlightParam, extractedId: matchId });
    } else {
      // Old format: just a number
      highlightMatchId = parseInt(highlightParam);
      console.log('🎯 Old highlight format detected:', highlightMatchId);
    }
  }

  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable highlightMatchId={highlightMatchId} />
      </div>
    );
  }
  
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-4 sm:p-7 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BETINASIA</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Premium Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">100% Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-4 sm:p-7 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bet-at-home</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">European Leader</p>
                <p className="text-xs sm:text-sm opacity-95">300€ Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 rounded-xl p-4 sm:p-7 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">bets.io</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Sportsbook</p>
                <p className="text-xs sm:text-sm opacity-95">Sport Bonus</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>
      <HeroSection />
      <OddsDemo />
      <PopularSports />
      <HotPicks />
      <LatestBonuses />
    </div>
  );
}


