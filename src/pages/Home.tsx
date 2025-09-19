import React from "react";
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
  const highlightMatchId = searchParams.get('highlight');

  if (selectedLeague) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable highlightMatchId={highlightMatchId ? parseInt(highlightMatchId) : undefined} />
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-4 sm:p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-lg sm:text-xl mb-2">BETINASIA</h3>
                <p className="text-sm opacity-95 mb-2 sm:mb-3">Get 100% First Deposit Bonus!</p>
                <div className="text-xs opacity-80">Limited Time Offer</div>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BETINASIA")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50 text-sm"
              >
                CLAIM NOW
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-4 sm:p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-lg sm:text-xl mb-2">bet-at-home</h3>
                <p className="text-sm opacity-95 mb-2 sm:mb-3">Get a 300€ Welcome bonus!</p>
                <div className="text-xs opacity-80">New Players Only</div>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bet-at-home")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50 text-sm"
              >
                CLAIM NOW
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 rounded-xl p-4 sm:p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden md:col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-lg sm:text-xl mb-2">bets.io</h3>
                <p className="text-sm opacity-95 mb-2 sm:mb-3">First Deposit Sport Bonus</p>
                <div className="text-xs opacity-80">Exclusive Deal</div>
              </div>
              <button 
                onClick={() => openBettingSiteByName("bets.io")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50 text-sm"
              >
                CLAIM NOW
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


