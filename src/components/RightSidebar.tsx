import React, { useState } from "react";

export default function RightSidebar() {
  const [favorites, setFavorites] = useState([
    { id: 1, team: "Kansas City Chiefs", sport: "Football", league: "NFL" },
    { id: 2, team: "Los Angeles Lakers", sport: "Basketball", league: "NBA" },
    { id: 3, team: "Manchester United", sport: "Soccer", league: "Premier League" }
  ]);

  const [alerts, setAlerts] = useState([
    { id: 1, message: "KC Chiefs odds changed to +150", time: "2 min ago", type: "odds" },
    { id: 2, message: "Lakers vs Warriors starting soon", time: "15 min ago", type: "match" },
    { id: 3, message: "New bonus: 100% deposit match", time: "1 hour ago", type: "bonus" }
  ]);

  const favouriteLeagues = [
    {
      id: "1",
      title: "Premier League",
      image: "/src/assets/Favourite_league/1.jpg",
      description: "England's top football division"
    },
    {
      id: "2", 
      title: "La Liga",
      image: "/src/assets/Favourite_league/2.jpg",
      description: "Spain's premier football league"
    },
    {
      id: "3",
      title: "Bundesliga",
      image: "/src/assets/Favourite_league/3.jpg", 
      description: "Germany's top football competition"
    }
  ];

  const removeFavorite = (id: number) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
  };

  const removeAlert = (id: number) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  return (
    <aside className="w-64 bg-surface border-l border-border p-4 space-y-6">
      {/* FAVOURITES League Cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted mb-3">FAVOURITES</h3>
        <div className="space-y-3">
          {favouriteLeagues.map((league) => (
            <div key={league.id} className="bg-bg rounded-lg overflow-hidden border border-border hover:shadow-md transition-all duration-300 group">
              {/* League Image */}
              <div className="relative h-24 overflow-hidden">
                <img 
                  src={league.image} 
                  alt={league.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
              
              {/* League Info */}
              <div className="p-3 space-y-2">
                <h4 className="text-sm font-semibold text-text">{league.title}</h4>
                <p className="text-xs text-muted">{league.description}</p>
                <button className="w-full bg-accent text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-accent/90 transition-colors">
                  View Matches
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Favorites */}
      {/* <div>
        <h3 className="text-sm font-semibold text-muted mb-3">FAVORITES</h3>
        <div className="space-y-2">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="bg-bg rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">{favorite.team}</p>
                  <p className="text-xs text-muted">{favorite.sport} • {favorite.league}</p>
                </div>
                <button
                  onClick={() => removeFavorite(favorite.id)}
                  className="text-muted hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {favorites.length === 0 && (
            <p className="text-sm text-muted text-center py-4">No favorites yet</p>
          )}
        </div>
      </div> */}

      {/* Alerts */}
      <div>
        <h3 className="text-sm font-semibold text-muted mb-3">ALERTS</h3>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 group hover:border-accent/30">
              {/* Alert Header with Icon and Time */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    alert.type === 'odds' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                    alert.type === 'match' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 
                    'bg-gradient-to-br from-green-500 to-green-600'
                  }`}>
                    {alert.type === 'odds' ? '📊' : 
                     alert.type === 'match' ? '⚽' : '🎁'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-100 leading-tight">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                      {alert.time}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors duration-200 p-1 hover:bg-red-900/30 rounded-full group-hover:opacity-100 opacity-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Alert Type Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.type === 'odds' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                    alert.type === 'match' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' : 
                    'bg-green-900/50 text-green-300 border border-green-700/50'
                  }`}>
                    {alert.type === 'odds' ? 'Odds Alert' : 
                     alert.type === 'match' ? 'Match Alert' : 'Bonus Alert'}
                  </span>
                </div>
                
                {/* Action Button */}
                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  alert.type === 'odds' ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-600/25' :
                  alert.type === 'match' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25' : 
                  'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25'
                } hover:scale-105 transform`}>
                  {alert.type === 'odds' ? 'View Odds' : 
                   alert.type === 'match' ? 'Watch Live' : 'Claim Now'}
                </button>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-700">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">No alerts yet</p>
              <p className="text-xs text-gray-500 mt-1">We'll notify you of important updates</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
