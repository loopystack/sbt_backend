import React from "react";
import HeroSection from "@/components/HeroSection";
import PopularSports from "@/components/PopularSports";
import HotPicks from "@/components/HotPicks";
import LatestBonuses from "@/components/LatestBonuses";
import OddsTable from "@/components/OddsTable";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Promotional Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl mb-2">BETINASIA</h3>
                <p className="text-sm opacity-95 mb-3">Get 100% First Deposit Bonus!</p>
                <div className="text-xs opacity-80">Limited Time Offer</div>
              </div>
              <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50">
                CLAIM NOW
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl mb-2">bet-at-home</h3>
                <p className="text-sm opacity-95 mb-3">Get a 300€ Welcome bonus!</p>
                <div className="text-xs opacity-80">New Players Only</div>
              </div>
              <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50">
                CLAIM NOW
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 rounded-xl p-6 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl mb-2">bets.io</h3>
                <p className="text-sm opacity-95 mb-3">First Deposit Sport Bonus</p>
                <div className="text-xs opacity-80">Exclusive Deal</div>
              </div>
              <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 hover:border-white/50">
                CLAIM NOW
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section with Search */}
      <HeroSection />
      
      {/* Popular Sports Grid */}
      <PopularSports />
      
      {/* Hot Picks Section */}
      <HotPicks />
      
      {/* Latest Bonuses Section */}
      <LatestBonuses />
      
      {/* Live Matches Odds Table Section */}
      <OddsTable />
    </div>
  );
}
