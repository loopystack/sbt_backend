// Team icon utility functions
export const getTeamIcon = (teamName: string, country?: string): string | null => {
  if (!teamName) return null;
  
  // Normalize team name for matching
  const normalizedTeamName = teamName.trim();
  
  // Define country mappings for team icons
  const countryMappings: Record<string, string[]> = {
    'England': [
      'Manchester Utd', 'Manchester City', 'Liverpool', 'Burnley', 'Chelsea', 
      'Brentford', 'Tottenham', 'West Ham', 'Wolves', 'Newcastle', 'Leeds', 
      'Fulham', 'Aston Villa', 'Everton', 'Sunderland', 'Crystal Palace', 
      'Brighton', 'Bournemouth', 'Nottingham', 'Arsenal', 'Watford', 'Leicester', 
      'Southampton', 'Norwich', 'Ipswich', 'Sheffield Utd'
    ],
    'Brazil': [
      'Cruzeiro', 'Bahia', 'Ceara', 'Vasco', 'Botafogo RJ', 'Sao Paulo', 
      'Flamengo RJ', 'Juventude', 'Santos', 'Atletico-MG', 'Sport Recife', 
      'Bragantino', 'Corinthians', 'Fluminense', 'Internacional', 'Palmeiras', 
      'Mirassol', 'Gremio', 'Vitoria', 'Fortaleza', 'Cuiaba', 'Athletico-PR', 
      'America MG', 'Chapecoense-SC', 'Atletico GO',  'Coritiba', 'Goias',
      'Avai'
    ],
    'Spain': [
      'Mallorca', 'Espanyol', 'Valencia', 'Barcelona', 'Rayo Vallecano', 
      'Osasuna', 'Betis', 'Levante', 'Girona', 'Celta vigo', 'Villarreal', 
      'Atl. Madrid', 'Alaves', 'Ath Bilbao', 'Real Madrid', 'Real Sociedad', 
      'R. Oviedo', 'Getafe', 'Elche', 'Sevilla', 'Cadiz CF', 'Garanda CF',
      'Almeria', 'Valladolid'
    ]
  };

  // Try to find the team in the specified country first
  if (country && countryMappings[country]) {
    const foundTeam = countryMappings[country].find(team => 
      team.toLowerCase() === normalizedTeamName.toLowerCase() ||
      normalizedTeamName.toLowerCase().includes(team.toLowerCase()) ||
      team.toLowerCase().includes(normalizedTeamName.toLowerCase())
    );
    
    if (foundTeam) {
      return `/assets/team_icons/${country}/${foundTeam}.png`;
    }
  }

  // If no country specified or not found, search in all countries
  for (const [countryName, teams] of Object.entries(countryMappings)) {
    const foundTeam = teams.find(team => 
      team.toLowerCase() === normalizedTeamName.toLowerCase() ||
      normalizedTeamName.toLowerCase().includes(team.toLowerCase()) ||
      team.toLowerCase().includes(normalizedTeamName.toLowerCase())
    );
    
    if (foundTeam) {
      return `/assets/team_icons/${countryName}/${foundTeam}.png`;
    }
  }

  return null;
};
