import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { openBettingSiteByName } from "../config/bettingSites";
import { useCountry } from "../contexts/CountryContext";
import OddsTable from "../components/OddsTable";

export default function AllEvents() {
  const { selectedLeague: contextSelectedLeague } = useCountry();
  const [selectedSport, setSelectedSport] = useState("All sports");
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedLeague, setSelectedLeague] = useState("All leagues");
  const [searchParams] = useSearchParams();
  
  // Get search term from URL parameter
  const searchFromHome = searchParams.get('search');
  const sports = [
    { name: "All sports", icon: "🏆" },
    { name: "Football", icon: "⚽" },
    { name: "Basketball", icon: "🏀" },
    { name: "Tennis", icon: "🎾" },
    { name: "Baseball", icon: "⚾" },
    { name: "Hockey", icon: "🏒" }
  ];
  const dateFilters = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" }
  ];
  const leagueFilters = [
    { id: "all", label: "All Leagues" },
    { id: "premier", label: "Premier League" },
    { id: "laliga", label: "LaLiga" },
    { id: "bundesliga", label: "Bundesliga" },
    { id: "seriea", label: "Serie A" },
    { id: "champions", label: "Champions League" }
  ];

  const allEvents = [
    {
      id: "1",
      sport: "Football",
      country: "England",
      league: "Premier League",
      date: "Today",
      time: "20:00",
      team1: "Arsenal",
      team2: "Chelsea",
      odds1: "2.10",
      oddsX: "3.25",
      odds2: "3.40",
      bookmakers: 8,
      status: "Upcoming"
    },
    {
      id: "2",
      sport: "Football",
      country: "England",
      league: "Premier League",
      date: "Today",
      time: "22:30",
      team1: "Manchester United",
      team2: "Liverpool",
      odds1: "2.85",
      oddsX: "3.10",
      odds2: "2.45",
      bookmakers: 12,
      status: "Upcoming"
    },
    {
      id: "3",
      sport: "Football",
      country: "Spain",
      league: "LaLiga",
      date: "Today",
      time: "21:00",
      team1: "Real Madrid",
      team2: "Barcelona",
      odds1: "2.20",
      oddsX: "3.15",
      odds2: "3.20",
      bookmakers: 15,
      status: "Upcoming"
    },
    {
      id: "4",
      sport: "Football",
      country: "Spain",
      league: "LaLiga",
      date: "Today",
      time: "23:00",
      team1: "Atletico Madrid",
      team2: "Sevilla",
      odds1: "1.95",
      oddsX: "3.30",
      odds2: "3.80",
      bookmakers: 10,
      status: "Upcoming"
    },
    {
      id: "5",
      sport: "Basketball",
      country: "USA",
      league: "NBA",
      date: "Today",
      time: "02:00",
      team1: "Lakers",
      team2: "Warriors",
      odds1: "2.15",
      oddsX: "N/A",
      odds2: "1.75",
      bookmakers: 6,
      status: "Upcoming"
    },
    {
      id: "6",
      sport: "Basketball",
      country: "USA",
      league: "NBA",
      date: "Today",
      time: "04:30",
      team1: "Celtics",
      team2: "Heat",
      odds1: "1.90",
      oddsX: "N/A",
      odds2: "1.95",
      bookmakers: 7,
      status: "Upcoming"
    },
    {
      id: "7",
      sport: "Tennis",
      country: "Australia",
      league: "Australian Open",
      date: "Tomorrow",
      time: "08:00",
      team1: "Djokovic N.",
      team2: "Medvedev D.",
      odds1: "1.85",
      oddsX: "N/A",
      odds2: "2.15",
      bookmakers: 9,
      status: "Upcoming"
    },
    {
      id: "8",
      sport: "Tennis",
      country: "Australia",
      league: "Australian Open",
      date: "Tomorrow",
      time: "10:30",
      team1: "Williams S.",
      team2: "Osaka N.",
      odds1: "2.40",
      oddsX: "N/A",
      odds2: "1.65",
      bookmakers: 11,
      status: "Upcoming"
    },
    {
      id: "9",
      sport: "Baseball",
      country: "USA",
      league: "MLB",
      date: "Tomorrow",
      time: "01:00",
      team1: "Yankees",
      team2: "Red Sox",
      odds1: "1.95",
      oddsX: "N/A",
      odds2: "1.85",
      bookmakers: 5,
      status: "Upcoming"
    },
    {
      id: "10",
      sport: "Hockey",
      country: "Canada",
      league: "NHL",
      date: "Tomorrow",
      time: "03:00",
      team1: "Maple Leafs",
      team2: "Canadiens",
      odds1: "2.05",
      oddsX: "N/A",
      odds2: "1.80",
      bookmakers: 8,
      status: "Upcoming"
    }
  ];
  const getBestOdds = (odds1: string, oddsX: string, odds2: string) => {
    const odds = [parseFloat(odds1), parseFloat(oddsX), parseFloat(odds2)].filter(odd => !isNaN(odd));
    if (odds.length === 0) return null;
    return Math.min(...odds);
  };
  // If a league is selected from context OR if there's a search term, show the OddsTable
  if (contextSelectedLeague || searchFromHome) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <OddsTable initialSearchTerm={searchFromHome || undefined} />
      </div>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-lime-500 via-green-500 to-emerald-500 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Shimmer Effect */}
          <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer opacity-80"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex-1">
                <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">BC.GAME</h3>
                <p className="text-xs sm:text-sm opacity-80 mb-1 sm:mb-2">Crypto Casino</p>
                <p className="text-xs sm:text-sm opacity-95">100% + Free Bet</p>
              </div>
              <button 
                onClick={() => openBettingSiteByName("BC.GAME")}
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
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
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-400 relative overflow-hidden group">
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
                className="w-full sm:w-auto bg-white/20 backdrop-blur-sm text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300 border border-white/30 text-xs sm:text-sm"
              >
                CLAIM
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted px-2">
        Home &gt; All Events
      </div>
      <div className="space-y-3 sm:space-y-4 px-2">
        <h1 className="text-xl sm:text-2xl font-bold text-text">
          All Events - Complete Sports Betting Coverage
        </h1>
        <p className="text-muted text-sm max-w-4xl leading-relaxed">
          Discover all available sporting events across all leagues and competitions. From major 
          tournaments to local matches, find the best odds and betting opportunities for every 
          sport and event. Filter by sport, date, or league to find exactly what you're looking for.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 shadow-sm mx-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-muted">Filters:</span>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {dateFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
            >
              {leagueFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide px-2 pb-2">
        {sports.map((sport) => (
          <button
            key={sport.name}
            onClick={() => setSelectedSport(sport.name)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 flex-shrink-0 ${
              selectedSport === sport.name
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-accent hover:bg-bg"
            }`}
          >
            <span className="text-base sm:text-lg">{sport.icon}</span>
            <span className="font-medium text-sm sm:text-base">{sport.name}</span>
          </button>
        ))}
        <button className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg whitespace-nowrap transition-colors duration-200 text-muted hover:text-text hover:bg-bg flex-shrink-0">
          <span className="font-medium text-sm sm:text-base">More</span>
          <span className="text-base sm:text-lg">⌄</span>
        </button>
      </div>
      <div className="block lg:hidden space-y-3 px-2">
        {Object.entries(allEvents.reduce((groups, event) => {
          const key = `${event.sport} / ${event.country} / ${event.league}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(event);
          return groups;
        }, {} as Record<string, typeof allEvents>)).map(([key, group]) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{key.includes('Football') ? '⚽' : key.includes('Basketball') ? '🏀' : key.includes('Tennis') ? '🎾' : key.includes('Baseball') ? '⚾' : key.includes('Hockey') ? '🏒' : '🏆'}</span>
              <span className="text-xs sm:text-sm">{key}</span>
            </div>
            {group.map((event) => {
              const bestOdds = getBestOdds(event.odds1, event.oddsX, event.odds2);
              return (
                <div key={event.id} className="bg-surface border border-border rounded-lg p-3 sm:p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">{event.date}</span>
                        <span className="text-sm font-medium text-text">{event.time}</span>
                      </div>
                      <span className="text-xs text-muted">{event.bookmakers} bookmakers</span>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-text text-sm sm:text-base">{event.team1} vs {event.team2}</div>
                      <div className="text-xs text-muted">{event.sport} • {event.country} • {event.league}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">1</div>
                        <div className={`text-sm font-medium ${bestOdds === parseFloat(event.odds1) ? 'text-green-500' : 'text-text'}`}>
                          {event.odds1}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">X</div>
                        <div className={`text-sm font-medium ${bestOdds === parseFloat(event.oddsX) ? 'text-green-500' : 'text-text'}`}>
                          {event.oddsX === 'N/A' ? '-' : event.oddsX}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted mb-1">2</div>
                        <div className={`text-sm font-medium ${bestOdds === parseFloat(event.odds2) ? 'text-green-500' : 'text-text'}`}>
                          {event.odds2}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-bg border border-border rounded-lg">
          <div className="col-span-1 text-sm font-medium text-muted text-center">Date</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">Time</div>
          <div className="col-span-4 text-sm font-medium text-muted">Match</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">1</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">X</div>
          <div className="col-span-1 text-sm font-medium text-muted text-center">2</div>
          <div className="col-span-2 text-sm font-medium text-muted text-center">B's</div>
        </div>
        <div className="space-y-4">
          {Object.entries(allEvents.reduce((groups, event) => {
            const key = `${event.sport} / ${event.country} / ${event.league}`;
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(event);
            return groups;
          }, {} as Record<string, typeof allEvents>)).map(([key, group]) => (
            <div key={key} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span>{key.includes('Football') ? '⚽' : key.includes('Basketball') ? '🏀' : key.includes('Tennis') ? '🎾' : key.includes('Baseball') ? '⚾' : key.includes('Hockey') ? '🏒' : '🏆'}</span>
                <span>{key}</span>
              </div>
              {group.map((event) => {
                const bestOdds = getBestOdds(event.odds1, event.oddsX, event.odds2);
                return (
                  <div key={event.id} className="bg-surface border border-border rounded-lg p-4 hover:bg-bg/50 transition-colors cursor-pointer">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1 text-center">
                        <div className="text-sm text-muted">{event.date}</div>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className="text-sm font-medium text-text">{event.time}</div>
                      </div>
                      <div className="col-span-4">
                        <div className="space-y-1">
                          <div className="font-medium text-text">{event.team1} vs {event.team2}</div>
                          <div className="text-xs text-muted">{event.sport} • {event.country} • {event.league}</div>
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className={`text-sm font-medium ${bestOdds === parseFloat(event.odds1) ? 'text-green-500' : 'text-text'}`}>
                          {event.odds1}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className={`text-sm font-medium ${bestOdds === parseFloat(event.oddsX) ? 'text-green-500' : 'text-text'}`}>
                          {event.oddsX === 'N/A' ? '-' : event.oddsX}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <div className={`text-sm font-medium ${bestOdds === parseFloat(event.odds2) ? 'text-green-500' : 'text-text'}`}>
                          {event.odds2}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm text-muted">{event.bookmakers}</span>
                          <span className="text-xs text-muted">bookmakers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
        <h3 className="text-lg font-semibold text-text mb-4">Events Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-text">{allEvents.length}</div>
            <div className="text-sm text-muted">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-text">
              {allEvents.filter(event => event.sport === 'Football').length}
            </div>
            <div className="text-sm text-muted">Football Events</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-text">
              {allEvents.filter(event => event.sport === 'Basketball').length}
            </div>
            <div className="text-sm text-muted">Basketball Events</div>
          </div>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 mx-2">
        <h3 className="text-lg font-semibold text-text mb-4">About All Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-text">Comprehensive Coverage</h4>
            <p className="text-sm text-muted leading-relaxed">
              Our All Events page provides complete coverage of sporting events from around the 
              world. From major international tournaments to local league matches, you'll find 
              betting opportunities for every sport and competition.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-text">Best Odds Guarantee</h4>
            <p className="text-sm text-muted leading-relaxed">
              We aggregate odds from multiple bookmakers to ensure you always get the best 
              available odds. Green-highlighted odds indicate the best value for each market, 
              helping you maximize your potential returns.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


