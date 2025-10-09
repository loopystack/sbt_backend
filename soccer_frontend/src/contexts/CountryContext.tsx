import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Match {
  id: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  homeOdds: string;
  drawOdds: string;
  awayOdds: string;
  bookmakers: number;
}

export interface Country {
  name: string;
  flag: string;
  leagues: {
    name: string;
    matchCount: number;
    matches: Match[];
  }[];
}

interface CountryContextType {
  selectedCountry: Country | null;
  setSelectedCountry: (country: Country | null) => void;
  selectedLeague: any | null;
  setSelectedLeague: (league: any | null) => void;
  countries: Country[];
  loading: boolean;
  error: string | null;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

interface CountryProviderProps {
  children: ReactNode;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<any | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Country flag mapping
  const countryFlagMap: Record<string, string> = {
    'austria': 'at',
    'belgium': 'be',
    'brazil': 'br',
    'england': 'gb',
    'france': 'fr',
    'germany': 'de',
    'italy': 'it',
    'netherlands': 'nl',
    'poland': 'pl',
    'portugal': 'pt',
    'russia': 'ru',
    'spain': 'es',
    'turkey': 'tr',
    'ukraine': 'ua',
    'usa': 'us'
  };

  // Fetch countries and leagues from API
  useEffect(() => {
    const fetchCountriesAndLeagues = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch countries and leagues from the API
        try {
          const response = await fetch('http://localhost:5001/api/odds/leagues/list');
          if (!response.ok) {
            throw new Error('Failed to fetch leagues');
          }

          const leaguesData = await response.json();
        
        // Transform the data into the expected format
        const countriesData: Country[] = Object.entries(leaguesData).map(([countryName, leagues]) => {
          const countryKey = countryName.toLowerCase();
          const flagCode = countryFlagMap[countryKey] || 'xx';
          
          return {
            name: countryName.charAt(0).toUpperCase() + countryName.slice(1),
            flag: flagCode,
            leagues: (leagues as string[]).map(leagueName => ({
              name: leagueName,
              matchCount: 0, // Will be calculated when needed
              matches: []
            }))
          };
        });

        // Sort countries alphabetically
        countriesData.sort((a, b) => a.name.localeCompare(b.name));

        setCountries(countriesData);
        
        // Don't auto-select any country or league - let user choose
        } catch (apiError) {
          console.warn('Failed to fetch leagues from API, using fallback data:', apiError);
          
          // Fallback data when API is not available - includes all countries available in the database
          const fallbackCountries: Country[] = [
            {
              name: 'Austria',
              flag: 'at',
              leagues: [
                { name: 'Bundesliga', matchCount: 0, matches: [] },
                { name: '2. Liga', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Belgium',
              flag: 'be',
              leagues: [
                { name: 'Jupiler Pro League', matchCount: 0, matches: [] },
                { name: 'Challenger Pro League', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Brazil',
              flag: 'br',
              leagues: [
                { name: 'Serie A', matchCount: 0, matches: [] },
                { name: 'Serie B', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'England',
              flag: 'gb',
              leagues: [
                { name: 'Premier League', matchCount: 0, matches: [] },
                { name: 'Championship', matchCount: 0, matches: [] },
                { name: 'League One', matchCount: 0, matches: [] },
                { name: 'League Two', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'France',
              flag: 'fr',
              leagues: [
                { name: 'Ligue 1', matchCount: 0, matches: [] },
                { name: 'Ligue 2', matchCount: 0, matches: [] },
                { name: 'National', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Germany',
              flag: 'de',
              leagues: [
                { name: 'Bundesliga', matchCount: 0, matches: [] },
                { name: '2. Bundesliga', matchCount: 0, matches: [] },
                { name: '3. Liga', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Italy',
              flag: 'it',
              leagues: [
                { name: 'Serie A', matchCount: 0, matches: [] },
                { name: 'Serie B', matchCount: 0, matches: [] },
                { name: 'Serie C', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Netherlands',
              flag: 'nl',
              leagues: [
                { name: 'Eredivisie', matchCount: 0, matches: [] },
                { name: 'Eerste Divisie', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Poland',
              flag: 'pl',
              leagues: [
                { name: 'Ekstraklasa', matchCount: 0, matches: [] },
                { name: 'I Liga', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Portugal',
              flag: 'pt',
              leagues: [
                { name: 'Primeira Liga', matchCount: 0, matches: [] },
                { name: 'Segunda Liga', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Russia',
              flag: 'ru',
              leagues: [
                { name: 'Premier League', matchCount: 0, matches: [] },
                { name: 'First League', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Spain',
              flag: 'es',
              leagues: [
                { name: 'La Liga', matchCount: 0, matches: [] },
                { name: 'Segunda División', matchCount: 0, matches: [] },
                { name: 'Primera División RFEF', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Turkey',
              flag: 'tr',
              leagues: [
                { name: 'Süper Lig', matchCount: 0, matches: [] },
                { name: '1. Lig', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'Ukraine',
              flag: 'ua',
              leagues: [
                { name: 'Premier League', matchCount: 0, matches: [] },
                { name: 'First League', matchCount: 0, matches: [] }
              ]
            },
            {
              name: 'USA',
              flag: 'us',
              leagues: [
                { name: 'MLS', matchCount: 0, matches: [] },
                { name: 'USL Championship', matchCount: 0, matches: [] }
              ]
            }
          ];
          
          setCountries(fallbackCountries);
        }

      } catch (err) {
        console.error('Error fetching countries and leagues:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchCountriesAndLeagues();
  }, []);

  // Remove the match count fetching useEffect - it's causing slow loading

  const value: CountryContextType = {
    selectedCountry,
    setSelectedCountry,
    selectedLeague,
    setSelectedLeague,
    countries,
    loading,
    error
  };

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
};