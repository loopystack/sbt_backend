import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const useCountry = () => {
  console.log('useCountry hook called');
  const context = useContext(CountryContext);
  console.log('Context value:', context);
  if (context === undefined) {
    console.error('Context is undefined!');
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

interface CountryProviderProps {
  children: ReactNode;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
  console.log('CountryProvider is rendering');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<any | null>(null);

  const countries: Country[] = [
    {
      name: "Brazil",
      flag: "br",
      leagues: [
        {
          name: "Serie A Betano",
          matchCount: 23,
          matches: [
            {
              id: "1",
              date: "14 Sep 2025",
              time: "04:00",
              team1: "Fortaleza",
              team2: "Vitoria",
              homeOdds: "93/100",
              drawOdds: "113/50",
              awayOdds: "321/100",
              bookmakers: 12
            },
            {
              id: "2",
              date: "15 Sep 2025",
              time: "06:30",
              team1: "Gremio",
              team2: "Mirassol",
              homeOdds: "67/100",
              drawOdds: "11/4",
              awayOdds: "4/1",
              bookmakers: 15
            },
            {
              id: "3",
              date: "15 Sep 2025",
              time: "08:00",
              team1: "Palmeiras",
              team2: "Internacional",
              homeOdds: "11/10",
              drawOdds: "21/10",
              awayOdds: "5/2",
              bookmakers: 18
            },
            {
              id: "4",
              date: "16 Sep 2025",
              time: "04:00",
              team1: "Bahia",
              team2: "Cruzeiro",
              homeOdds: "1/1",
              drawOdds: "21/10",
              awayOdds: "11/4",
              bookmakers: 14
            },
            {
              id: "5",
              date: "18 Sep 2025",
              time: "04:00",
              team1: "Fluminense",
              team2: "Corinthians",
              homeOdds: "51/50",
              drawOdds: "41/20",
              awayOdds: "317/100",
              bookmakers: 16
            },
            {
              id: "6",
              date: "18 Sep 2025",
              time: "06:30",
              team1: "Bragantino",
              team2: "Sport Recife",
              homeOdds: "9/10",
              drawOdds: "59/25",
              awayOdds: "159/50",
              bookmakers: 13
            },
            {
              id: "7",
              date: "21 Sep 2025",
              time: "04:00",
              team1: "Atletico-MG",
              team2: "Santos",
              homeOdds: "41/50",
              drawOdds: "247/100",
              awayOdds: "86/25",
              bookmakers: 17
            },
            {
              id: "8",
              date: "21 Sep 2025",
              time: "06:30",
              team1: "Juventude",
              team2: "Flamengo RJ",
              homeOdds: "333/50",
              drawOdds: "83/25",
              awayOdds: "41/100",
              bookmakers: 19
            },
            {
              id: "9",
              date: "21 Sep 2025",
              time: "08:00",
              team1: "Sao Paulo",
              team2: "Botafogo RJ",
              homeOdds: "123/100",
              drawOdds: "52/25",
              awayOdds: "123/50",
              bookmakers: 15
            },
            {
              id: "10",
              date: "22 Sep 2025",
              time: "04:00",
              team1: "Vasco",
              team2: "Ceara",
              homeOdds: "17/20",
              drawOdds: "117/50",
              awayOdds: "69/20",
              bookmakers: 14
            },
            {
              id: "11",
              date: "22 Sep 2025",
              time: "06:30",
              team1: "Bahia",
              team2: "Cruzeiro",
              homeOdds: "13/10",
              drawOdds: "209/100",
              awayOdds: "227/100",
              bookmakers: 16
            },
            {
              id: "12",
              date: "22 Sep 2025",
              time: "08:00",
              team1: "Botafogo RJ",
              team2: "Fluminense",
              homeOdds: "31/50",
              drawOdds: "133/50",
              awayOdds: "89/20",
              bookmakers: 18
            }
          ]
        },
        
      ]
    },
    {
      name: "England",
      flag: "gb",
      leagues: [
        {
          name: "Premier League",
          matchCount: 25,
          matches: []
        },
       
      ]
    },
    {
      name: "Spain",
      flag: "es",
      leagues: [
        {
          name: "LaLiga",
          matchCount: 22,
          matches: []
        },
        
      ]
    },
    {
      name: "Germany",
      flag: "de",
      leagues: [
        {
          name: "Bundesliga",
          matchCount: 19,
          matches: []
        },
        {
          name: "2. Bundesliga",
          matchCount: 16,
          matches: []
        },
        {
          name: "DFB Pokal",
          matchCount: 10,
          matches: []
        },
        {
          name: "DFL-Supercup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Italy",
      flag: "it",
      leagues: [
        {
          name: "Serie A",
          matchCount: 21,
          matches: []
        },
        {
          name: "Serie B",
          matchCount: 17,
          matches: []
        },
        {
          name: "Coppa Italia",
          matchCount: 14,
          matches: []
        },
        {
          name: "Supercoppa Italiana",
          matchCount: 3,
          matches: []
        }
      ]
    },
    {
      name: "France",
      flag: "fr",
      leagues: [
        {
          name: "Ligue 1",
          matchCount: 20,
          matches: []
        },
        {
          name: "Ligue 2",
          matchCount: 16,
          matches: []
        },
        {
          name: "Coupe de France",
          matchCount: 12,
          matches: []
        },
        {
          name: "Trophée des Champions",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Argentina",
      flag: "ar",
      leagues: [
        {
          name: "Primera Division",
          matchCount: 18,
          matches: []
        },
        {
          name: "Primera B Nacional",
          matchCount: 15,
          matches: []
        },
        {
          name: "Copa Argentina",
          matchCount: 8,
          matches: []
        },
        {
          name: "Supercopa Argentina",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Portugal",
      flag: "pt",
      leagues: [
        {
          name: "Primeira Liga",
          matchCount: 16,
          matches: []
        },
        {
          name: "Segunda Liga",
          matchCount: 14,
          matches: []
        },
        {
          name: "Taça de Portugal",
          matchCount: 10,
          matches: []
        },
        {
          name: "Supertaça Cândido de Oliveira",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Netherlands",
      flag: "nl",
      leagues: [
        {
          name: "Eredivisie",
          matchCount: 18,
          matches: []
        },
        {
          name: "Eerste Divisie",
          matchCount: 15,
          matches: []
        },
        {
          name: "KNVB Cup",
          matchCount: 12,
          matches: []
        },
        {
          name: "Johan Cruyff Shield",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Belgium",
      flag: "be",
      leagues: [
        {
          name: "Pro League",
          matchCount: 16,
          matches: []
        },
        {
          name: "Challenger Pro League",
          matchCount: 14,
          matches: []
        },
        {
          name: "Belgian Cup",
          matchCount: 10,
          matches: []
        },
        {
          name: "Belgian Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Turkey",
      flag: "tr",
      leagues: [
        {
          name: "Süper Lig",
          matchCount: 20,
          matches: []
        },
        {
          name: "TFF 1. Lig",
          matchCount: 16,
          matches: []
        },
        {
          name: "Turkish Cup",
          matchCount: 12,
          matches: []
        },
        {
          name: "Turkish Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Russia",
      flag: "ru",
      leagues: [
        {
          name: "Premier League",
          matchCount: 18,
          matches: []
        },
        {
          name: "First League",
          matchCount: 15,
          matches: []
        },
        {
          name: "Russian Cup",
          matchCount: 10,
          matches: []
        },
        {
          name: "Russian Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Ukraine",
      flag: "ua",
      leagues: [
        {
          name: "Premier League",
          matchCount: 16,
          matches: []
        },
        {
          name: "First League",
          matchCount: 14,
          matches: []
        },
        {
          name: "Ukrainian Cup",
          matchCount: 8,
          matches: []
        },
        {
          name: "Ukrainian Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Poland",
      flag: "pl",
      leagues: [
        {
          name: "Ekstraklasa",
          matchCount: 18,
          matches: []
        },
        {
          name: "I Liga",
          matchCount: 15,
          matches: []
        },
        {
          name: "Polish Cup",
          matchCount: 10,
          matches: []
        },
        {
          name: "Polish Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Czech Republic",
      flag: "cz",
      leagues: [
        {
          name: "First League",
          matchCount: 16,
          matches: []
        },
        {
          name: "Second League",
          matchCount: 14,
          matches: []
        },
        {
          name: "Czech Cup",
          matchCount: 8,
          matches: []
        },
        {
          name: "Czech Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Austria",
      flag: "at",
      leagues: [
        {
          name: "Bundesliga",
          matchCount: 14,
          matches: []
        },
        {
          name: "2. Liga",
          matchCount: 12,
          matches: []
        },
        {
          name: "Austrian Cup",
          matchCount: 8,
          matches: []
        },
        {
          name: "Austrian Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    },
    {
      name: "Switzerland",
      flag: "ch",
      leagues: [
        {
          name: "Super League",
          matchCount: 12,
          matches: []
        },
        {
          name: "Challenge League",
          matchCount: 10,
          matches: []
        },
        {
          name: "Swiss Cup",
          matchCount: 6,
          matches: []
        },
        {
          name: "Swiss Super Cup",
          matchCount: 2,
          matches: []
        }
      ]
    }
  ];

  return (
    <CountryContext.Provider value={{ selectedCountry, setSelectedCountry, selectedLeague, setSelectedLeague, countries }}>
      {children}
    </CountryContext.Provider>
  );
};
