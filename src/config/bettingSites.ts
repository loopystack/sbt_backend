export interface BettingSite {
  id: string;
  name: string;
  url: string;
  description: string;
  bonus: string;
  type: string;
  rating: number;
  logo?: string;
}

export const bettingSites: BettingSite[] = [
  {
    id: "betinasia",
    name: "BETINASIA",
    url: "https://www.betinasia.com",
    description: "Get 100% First Deposit Bonus!",
    bonus: "100% First Deposit",
    type: "Welcome Bonus",
    rating: 4.8
  },
  {
    id: "betathome",
    name: "bet-at-home",
    url: "https://www.bet-at-home.com",
    description: "Get a 300€ Welcome bonus!",
    bonus: "300€ Welcome",
    type: "Welcome Bonus",
    rating: 4.6
  },
  {
    id: "betsio",
    name: "bets.io",
    url: "https://www.bets.io",
    description: "First Deposit Sport Bonus",
    bonus: "Sport Bonus",
    type: "First Deposit",
    rating: 4.7
  },
  {
    id: "bcgame",
    name: "BC.GAME",
    url: "https://www.bc.game",
    description: "Up to 100% bonus + 20 Free Bet",
    bonus: "100% + 20 Free Bet",
    type: "Welcome Package",
    rating: 4.9
  },
  {
    id: "betmgm",
    name: "BETMGM",
    url: "https://www.betmgm.com",
    description: "Get up to $1,500 paid back in bonus bets, if you don't win!",
    bonus: "$1,500 Bonus Bets",
    type: "Risk-Free Bet",
    rating: 4.5
  },
  {
    id: "caesars",
    name: "Caesars",
    url: "https://www.caesars.com/sportsbook",
    description: "Get your stake back on 4+ leg parlays",
    bonus: "Parlay Insurance",
    type: "Insurance",
    rating: 4.6
  },
  {
    id: "pointsbet",
    name: "PointsBet",
    url: "https://www.pointsbet.com",
    description: "20% bonus on live betting wins",
    bonus: "20% Live Bonus",
    type: "Live Betting",
    rating: 4.5
  },
  {
    id: "bet365",
    name: "Bet365",
    url: "https://www.bet365.com",
    description: "World's leading online sports betting",
    bonus: "Welcome Offer",
    type: "Welcome Bonus",
    rating: 4.8
  },
  {
    id: "draftkings",
    name: "DraftKings",
    url: "https://www.draftkings.com",
    description: "America's favorite sports betting platform",
    bonus: "Sign-up Bonus",
    type: "Welcome Offer",
    rating: 4.7
  },
  {
    id: "fanduel",
    name: "FanDuel",
    url: "https://www.fanduel.com",
    description: "The ultimate sports betting experience",
    bonus: "Welcome Bonus",
    type: "New User Offer",
    rating: 4.6
  }
];

export const getBettingSiteById = (id: string): BettingSite | undefined => {
  return bettingSites.find(site => site.id === id);
};

export const getBettingSiteByName = (name: string): BettingSite | undefined => {
  return bettingSites.find(site => 
    site.name.toLowerCase() === name.toLowerCase() ||
    site.name.toLowerCase().replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
};

export const openBettingSite = (siteId: string) => {
  const site = getBettingSiteById(siteId);
  if (site) {
    window.open(site.url, '_blank', 'noopener,noreferrer');
  }
};

export const openBettingSiteByName = (siteName: string) => {
  const site = getBettingSiteByName(siteName);
  if (site) {
    window.open(site.url, '_blank', 'noopener,noreferrer');
  }
};
