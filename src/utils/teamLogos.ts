// 🏆 Smart Team Logo System with Country Context
export const getTeamLogo = (teamName: string, country?: string): string | null => {
  if (!teamName) return null;
  
  const normalized = teamName.trim().toLowerCase();
  
  // 🌍 Team mappings by country (based on actual logo files)
  const teams: Record<string, Record<string, string>> = {
    'Austria': {
      'a. klagenfurt': 'A. Klagenfurt.png', 'klagenfurt': 'A. Klagenfurt.png',
      'admira': 'Admira.png', 'altach': 'Altach.png',
      'austria vienna': 'Austria Vienna.png', 'austria': 'Austria Vienna.png',
      'hartberg': 'Hartberg.png', 'lask': 'LASK.png', 'ried': 'Ried.png',
      'salzburg': 'Salzburg.png', 'red bull salzburg': 'Salzburg.png',
      'sk rapid': 'SK Rapid.png', 'rapid vienna': 'SK Rapid.png', 'rapid': 'SK Rapid.png',
      'sturm graz': 'Sturm Graz.png', 'tirol': 'Tirol.png',
      'wolfsberger ac': 'Wolfsberger AC.png', 'wolfsberger': 'Wolfsberger AC.png'
    },
    
    'England': {
      'arsenal': 'Arsenal.png', 'aston villa': 'Aston Villa.png',
      'bournemouth': 'Bournemouth.png', 'brentford': 'Brentford.png',
      'brighton': 'Brighton.png', 'brighton & hove albion': 'Brighton.png',
      'burnley': 'Burnley.png', 'chelsea': 'Chelsea.png',
      'crystal palace': 'Crystal Palace.png', 'everton': 'Everton.png',
      'fulham': 'Fulham.png', 'ipswich': 'Ipswich.png', 'ipswich town': 'Ipswich.png',
      'leeds': 'Leeds.png', 'leeds united': 'Leeds.png',
      'leicester': 'Leicester.png', 'leicester city': 'Leicester.png',
      'liverpool': 'Liverpool.png',
      'manchester city': 'Manchester City.png', 'man city': 'Manchester City.png',
      'manchester utd': 'Manchester Utd.png', 'manchester united': 'Manchester Utd.png',
      'man utd': 'Manchester Utd.png', 'man united': 'Manchester Utd.png',
      'newcastle': 'Newcastle.png', 'newcastle united': 'Newcastle.png',
      'norwich': 'Norwich.png', 'norwich city': 'Norwich.png',
      'nottingham': 'Nottingham.png', 'nottingham forest': 'Nottingham.png',
      'sheffield utd': 'Sheffield Utd.png', 'sheffield united': 'Sheffield Utd.png',
      'southampton': 'Southampton.png', 'sunderland': 'Sunderland.png',
      'tottenham': 'Tottenham.png', 'tottenham hotspur': 'Tottenham.png', 'spurs': 'Tottenham.png',
      'watford': 'Watford.png', 'west ham': 'West Ham.png', 'west ham united': 'West Ham.png',
      'wolves': 'Wolves.png', 'wolverhampton': 'Wolves.png'
    },
    
    'Portugal': {
      'arouca': 'Arouca.png', 'benfica': 'Benfica.png', 'sl benfica': 'Benfica.png',
      'boavista': 'Boavista.png', 'braga': 'Braga.png', 'sc braga': 'Braga.png',
      'bsad': 'BSAD.png', 'estoril': 'Estoril.png', 'famalicao': 'Famalicao.png',
      'fc porto': 'FC Porto.png', 'porto': 'FC Porto.png',
      'gil vicente': 'Gil Vicente.png', 'maritimo': 'Maritimo.png',
      'moreirense': 'Moreirense.png', 'pacos ferreira': 'Pacos Ferreira.png',
      'pacos': 'Pacos Ferreira.png', 'portimonense': 'Portimonense.png',
      'santa clara': 'Santa Clara.png', 'sporting cp': 'Sporting CP.png',
      'sporting': 'Sporting CP.png', 'tondela': 'Tondela.png',
      'vitoria guimaraes': 'Vitoria Guimaraes.png', 'vizela': 'Vizela.png'
    },
    
    'Russia': {
      'akhmat grozny': 'Akhmat Grozny.png', 'akhmat': 'Akhmat Grozny.png',
      'arsenal tula': 'Arsenal Tula.png', // 🚨 Different from England Arsenal
      'cska moscow': 'CSKA Moscow.png', 'cska': 'CSKA Moscow.png',
      'dynamo moscow': 'Dynamo Moscow.png', 'dynamo': 'Dynamo Moscow.png',
      'fk rostov': 'FK Rostov.png', 'rostov': 'FK Rostov.png',
      'khimki': 'Khimki.png', 'krasnodar': 'Krasnodar.png',
      'krylya sovetov': 'Krylya Sovetov.png', 'lokomotiv moscow': 'Lokomotiv Moscow.png',
      'lokomotiv': 'Lokomotiv Moscow.png', 'pari nn': 'Pari NN.png',
      'nizhny novgorod': 'Pari NN.png', 'rubin kazan': 'Rubin Kazan.png',
      'rubin': 'Rubin Kazan.png', 'sochi': 'Sochi.png',
      'spartak moscow': 'Spartak Moscow.png', 'spartak': 'Spartak Moscow.png',
      'ufa': 'Ufa.png', 'ural': 'Ural.png', 'zenit': 'Zenit.png',
      'zenit st petersburg': 'Zenit.png'
    },
    
    'Turkey': {
      'adana demirspor': 'Adana Demirspor.png', 'adana': 'Adana Demirspor.png',
      'alanyaspor': 'Alanyaspor.png', 'alanya': 'Alanyaspor.png',
      'altay': 'Altay.png', 'basaksehir': 'Basaksehir.png',
      'istanbul basaksehir': 'Basaksehir.png', 'besiktas': 'Besiktas.png',
      'fenerbahce': 'Fenerbahce.png', 'fener': 'Fenerbahce.png',
      'galatasaray': 'Galatasaray.png', 'gala': 'Galatasaray.png',
      'gaziantep': 'Gaziantep.png', 'giresunspor': 'Giresunspor.png',
      'goztepe': 'Goztepe.png', 'hatayspor': 'Hatayspor.png',
      'karagumruk': 'Karagumruk.png', 'kasimpasa': 'Kasimpasa.png',
      'kayserispor': 'Kayserispor.png', 'konyaspor': 'Konyaspor.png',
      'rizespor': 'Rizespor.png', 'sivasspor': 'Sivasspor.png',
      'trabzonspor': 'Trabzonspor.png', 'trabzon': 'Trabzonspor.png',
      'yeni malatyaspor': 'Yeni Malatyaspor.png', 'malatyaspor': 'Yeni Malatyaspor.png'
    },
    
    'Ukraine': {
      'ch. odesa': 'Ch. Odesa.png', 'chornomorets odesa': 'Ch. Odesa.png',
      'desna': 'Desna.png', 'dnipro-1': 'Dnipro-1.png', 'dnipro': 'Dnipro-1.png',
      'dyn. kyiv': 'Dyn. Kyiv.png', 'dynamo kyiv': 'Dyn. Kyiv.png', 'dynamo kiev': 'Dyn. Kyiv.png',
      'fk zorya luhansk': 'FK Zorya Luhansk.png', 'zorya': 'FK Zorya Luhansk.png',
      'inhulets': 'Inhulets.png', 'kolos kovalivka': 'Kolos Kovalivka.png',
      'kolos': 'Kolos Kovalivka.png', 'lviv': 'Lviv.png', 'fc lviv': 'Lviv.png',
      'mariupol': 'Mariupol.png', 'metalist 1925': 'Metalist 1925.png',
      'metalist': 'Metalist 1925.png', 'oleksandriya': 'Oleksandriya.png',
      'rukh lviv': 'Rukh Lviv.png', 'rukh': 'Rukh Lviv.png',
      'shakhtar donetsk': 'Shakhtar Donetsk.png', 'shakhtar': 'Shakhtar Donetsk.png',
      'veres-rivne': 'Veres-Rivne.png', 'veres': 'Veres-Rivne.png',
      'vorskla poltava': 'Vorskla Poltava.png', 'vorskla': 'Vorskla Poltava.png'
    },
    
    'Spain': {
      'alaves': 'Alaves.png', 'deportivo alaves': 'Alaves.png',
      'almeria': 'Almeria.png', 'ath bilbao': 'Ath Bilbao.png',
      'athletic bilbao': 'Ath Bilbao.png', 'athletic': 'Ath Bilbao.png',
      'atl. madrid': 'Atl. Madrid.png', 'atletico madrid': 'Atl. Madrid.png',
      'atletico': 'Atl. Madrid.png', 'barcelona': 'Barcelona.png',
      'fc barcelona': 'Barcelona.png', 'barca': 'Barcelona.png',
      'betis': 'Betis.png', 'real betis': 'Betis.png',
      'cadiz cf': 'Cadiz CF.png', 'cadiz': 'Cadiz CF.png',
      'celta vigo': 'Celta vigo.png', 'celta': 'Celta vigo.png',
      'elche': 'Elche.png', 'espanyol': 'Espanyol.png', 'rcd espanyol': 'Espanyol.png',
      'garanda cf': 'Garanda CF.png', 'getafe': 'Getafe.png',
      'girona': 'Girona.png', 'levante': 'Levante.png',
      'mallorca': 'Mallorca.png', 'rcd mallorca': 'Mallorca.png',
      'osasuna': 'Osasuna.png', 'ca osasuna': 'Osasuna.png',
      'r. oviedo': 'R. Oviedo.png', 'real oviedo': 'R. Oviedo.png',
      'rayo vallecano': 'Rayo Vallecano.png', 'rayo': 'Rayo Vallecano.png',
      'real madrid': 'Real Madrid.png', 'madrid': 'Real Madrid.png',
      'real sociedad': 'Real Sociedad.png', 'sociedad': 'Real Sociedad.png',
      'sevilla': 'Sevilla.png', 'fc sevilla': 'Sevilla.png',
      'valencia': 'Valencia.png', 'valencia cf': 'Valencia.png',
      'valladolid': 'Valladolid.png', 'real valladolid': 'Valladolid.png',
      'villarreal': 'Villarreal.png', 'villarreal cf': 'Villarreal.png'
    },
    
    'France': {
      'angers': 'Angers.png', 'bordeaux': 'Bordeaux.png', 'brest': 'Brest.png',
      'clermont': 'Clermont.png', 'lens': 'Lens.png', 'rc lens': 'Lens.png',
      'lille': 'Lille.png', 'lorient': 'Lorient.png', 'lyon': 'Lyon.png',
      'olympique lyon': 'Lyon.png', 'marseille': 'Marseille.png',
      'olympique marseille': 'Marseille.png', 'metz': 'Metz.png',
      'monaco': 'Monaco.png', 'as monaco': 'Monaco.png',
      'montpellier': 'Montpellier.png', 'nantes': 'Nantes.png', 'nice': 'Nice.png',
      'psg': 'PSG.png', 'paris saint-germain': 'PSG.png', 'paris sg': 'PSG.png',
      'reims': 'Reims.png', 'rennes': 'Rennes.png',
      'st etienne': 'St Etienne.png', 'saint-etienne': 'St Etienne.png',
      'strasbourg': 'Strasbourg.png', 'troyes': 'Troyes.png'
    },
    
    'Germany': {
      'arminia bielefeld': 'Arminia Bielefeld.png', 'bielefeld': 'Arminia Bielefeld.png',
      'augsburg': 'Augsburg.png', 'b. monchengladbach': 'B. Monchengladbach.png',
      'borussia monchengladbach': 'B. Monchengladbach.png', 'gladbach': 'B. Monchengladbach.png',
      'bayer leverkusen': 'Bayer Leverkusen.png', 'leverkusen': 'Bayer Leverkusen.png',
      'bayern munich': 'Bayern Munich.png', 'bayern': 'Bayern Munich.png', 'fc bayern': 'Bayern Munich.png',
      'bochum': 'Bochum.png', 'dortmund': 'Dortmund.png', 'borussia dortmund': 'Dortmund.png', 'bvb': 'Dortmund.png',
      'eintracht frankfurt': 'Eintracht Frankfurt.png', 'frankfurt': 'Eintracht Frankfurt.png',
      'fc koln': 'FC Koln.png', 'koln': 'FC Koln.png', 'cologne': 'FC Koln.png',
      'freiburg': 'Freiburg.png', 'sc freiburg': 'Freiburg.png',
      'greuther furth': 'Greuther Furth.png', 'furth': 'Greuther Furth.png',
      'hertha berlin': 'Hertha Berlin.png', 'hertha': 'Hertha Berlin.png',
      'hoffenheim': 'Hoffenheim.png', 'tsg hoffenheim': 'Hoffenheim.png',
      'mainz': 'Mainz.png', 'rb leipzig': 'RB Leipzig.png', 'leipzig': 'RB Leipzig.png',
      'stuttgart': 'Stuttgart.png', 'vfb stuttgart': 'Stuttgart.png',
      'union berlin': 'Union Berlin.png', 'wolfsburg': 'Wolfsburg.png', 'vfl wolfsburg': 'Wolfsburg.png',
      'werder bremen': 'Werder bremen.png', 'bremen': 'Werder bremen.png', 'werder': 'Werder bremen.png'
    },
    
    'Italy': {
      'ac milan': 'AC Milan.png', 'milan': 'AC Milan.png',
      'as roma': 'AS Roma.png', 'roma': 'AS Roma.png',
      'atalanta': 'Atalanta.png', 'bologna': 'Bologna.png', 'cagliari': 'Cagliari.png',
      'empoli': 'Empoli.png', 'fiorentina': 'Fiorentina.png', 'genoa': 'Genoa.png',
      'inter': 'Inter.png', 'inter milan': 'Inter.png', 'internazionale': 'Inter.png',
      'juventus': 'Juventus.png', 'juve': 'Juventus.png', 'lazio': 'Lazio.png',
      'napoli': 'Napoli.png', 'salernitana': 'Salernitana.png', 'sampdoria': 'Sampdoria.png',
      'sassuolo': 'Sassuolo.png', 'spezia': 'Spezia.png', 'torino': 'Torino.png',
      'udinese': 'Udinese.png', 'venezia': 'Venezia.png',
      'verona': 'Verona.png', 'hellas verona': 'Verona.png'
    },
    
    'Belgium': {
      'anderlecht': 'Anderlecht.png', 'antwerp': 'Antwerp.png',
      'beerschot va': 'Beerschot VA.png', 'beerschot': 'Beerschot VA.png',
      'cercle brugge ksv': 'Cercle Brugge KSV.png', 'cercle brugge': 'Cercle Brugge KSV.png',
      'charleroi': 'Charleroi.png', 'club brugge kv': 'Club Brugge KV.png',
      'club brugge': 'Club Brugge KV.png', 'brugge': 'Club Brugge KV.png',
      'eupen': 'Eupen.png', 'genk': 'Genk.png', 'krc genk': 'Genk.png',
      'gent': 'Gent.png', 'kortrijk': 'Kortrijk.png', 'kv mechelen': 'KV Mechelen.png',
      'mechelen': 'KV Mechelen.png', 'leuven': 'Leuven.png', 'oostende': 'Oostende.png',
      'royale union sg': 'Royale Union SG.png', 'union sg': 'Royale Union SG.png',
      'union': 'Royale Union SG.png', 'seraing': 'Seraing.png',
      'st. liege': 'St. Liege.png', 'standard liege': 'St. Liege.png',
      'standard': 'St. Liege.png', 'st. truiden': 'St. Truiden.png',
      'sint-truiden': 'St. Truiden.png', 'waregem': 'Waregem.png'
    },
    
    'Brazil': {
      'america mg': 'America MG.png', 'america mineiro': 'America MG.png',
      'athletico-pr': 'Athletico-PR.png', 'athletico paranaense': 'Athletico-PR.png',
      'atletico go': 'Atletico GO.png', 'atletico goianiense': 'Atletico GO.png',
      'atletico-mg': 'Atletico-MG.png', 'atletico mineiro': 'Atletico-MG.png',
      'avai': 'Avai.png', 'bahia': 'Bahia.png', 'botafogo rj': 'Botafogo RJ.png',
      'botafogo': 'Botafogo RJ.png', 'bragantino': 'Bragantino.png',
      'red bull bragantino': 'Bragantino.png', 'ceara': 'Ceara.png',
      'chapecoense-sc': 'Chapecoense-SC.png', 'chapecoense': 'Chapecoense-SC.png',
      'corinthians': 'Corinthians.png', 'coritiba': 'Coritiba.png',
      'cruzeiro': 'Cruzeiro.png', 'cuiaba': 'Cuiaba.png',
      'flamengo rj': 'Flamengo RJ.png', 'flamengo': 'Flamengo RJ.png',
      'fluminense': 'Fluminense.png', 'fortaleza': 'Fortaleza.png',
      'goias': 'Goias.png', 'gremio': 'Gremio.png',
      'internacional': 'Internacional.png', 'inter': 'Internacional.png',
      'juventude': 'Juventude.png', 'mirassol': 'Mirassol.png',
      'palmeiras': 'Palmeiras.png', 'santos': 'Santos.png',
      'sao paulo': 'Sao Paulo.png', 'sport recife': 'Sport Recife.png',
      'sport': 'Sport Recife.png', 'vasco': 'Vasco.png',
      'vasco da gama': 'Vasco.png', 'vitoria': 'Vitoria.png'
    },
    
    'Netherlands': {
      'ajax': 'Ajax.png', 'afc ajax': 'Ajax.png',
      'az alkmaar': 'AZ Alkmaar.png', 'az': 'AZ Alkmaar.png',
      'cambuur': 'Cambuur.png', 'sc cambuur': 'Cambuur.png',
      'feyenoord': 'Feyenoord.png', 'g.a. eagles': 'G.A. Eagles.png',
      'go ahead eagles': 'G.A. Eagles.png', 'groningen': 'Groningen.png',
      'fc groningen': 'Groningen.png', 'heerenveen': 'Heerenveen.png',
      'sc heerenveen': 'Heerenveen.png', 'heracles': 'Heracles.png',
      'heracles almelo': 'Heracles.png', 'nijmegen': 'Nijmegen.png',
      'nec nijmegen': 'Nijmegen.png', 'psv': 'PSV.png', 'psv eindhoven': 'PSV.png',
      'sittard': 'Sittard.png', 'fortuna sittard': 'Sittard.png',
      'sparta rotterdam': 'Sparta Rotterdam.png', 'sparta': 'Sparta Rotterdam.png',
      'twente': 'Twente.png', 'fc twente': 'Twente.png',
      'utrecht': 'Utrecht.png', 'fc utrecht': 'Utrecht.png',
      'vitesse': 'Vitesse.png', 'waalwijk': 'Waalwijk.png',
      'rkc waalwijk': 'Waalwijk.png', 'willem ii': 'Willem II.png',
      'zwolle': 'Zwolle.png', 'pec zwolle': 'Zwolle.png'
    },
    
    'Poland': {
      'cracovia': 'Cracovia.png', 'ks cracovia': 'Cracovia.png',
      'gornik zabrze': 'Gornik Zabrze.png', 'gornik': 'Gornik Zabrze.png',
      'jagiellonia': 'Jagiellonia.png', 'jagiellonia bialystok': 'Jagiellonia.png',
      'lech poznan': 'Lech Poznan.png', 'lech': 'Lech Poznan.png',
      'lechia gdansk': 'Lechia Gdansk.png', 'lechia': 'Lechia Gdansk.png',
      'leczna': 'Leczna.png', 'gornik leczna': 'Leczna.png',
      'legia': 'Legia.png', 'legia warsaw': 'Legia.png',
      'legia warszawa': 'Legia.png', 'piast gliwice': 'Piast Gliwice.png',
      'piast': 'Piast Gliwice.png', 'pogon szczecin': 'Pogon Szczecin.png',
      'pogon': 'Pogon Szczecin.png', 'radomiak radom': 'Radomiak Radom.png',
      'radomiak': 'Radomiak Radom.png', 'rakow': 'Rakow.png',
      'rakow czestochowa': 'Rakow.png', 'slask wroclaw': 'Slask Wroclaw.png',
      'slask': 'Slask Wroclaw.png', 'stal mielec': 'Stal Mielec.png',
      'stal': 'Stal Mielec.png', 'termalica b-b..': 'Termalica B-B..png',
      'termalica': 'Termalica B-B..png', 'warta poznan': 'Warta Poznan.png',
      'warta': 'Warta Poznan.png', 'wisla plock': 'Wisla Plock.png',
      'wisla': 'Wisla.png', 'wisla krakow': 'Wisla.png',
      'zaglebie': 'Zaglebie.png', 'zaglebie lubin': 'Zaglebie.png'
    },
    
    'Switzerland': {
      'basel': 'Basel.png', 'fc basel': 'Basel.png',
      'grasshoppers': 'Grasshoppers.png', 'gc zurich': 'Grasshoppers.png',
      'lausanne': 'Lausanne.png', 'lausanne-sport': 'Lausanne.png',
      'lugano': 'Lugano.png', 'fc lugano': 'Lugano.png',
      'luzern': 'Luzern.png', 'fc luzern': 'Luzern.png',
      'servette': 'Servette.png', 'servette fc': 'Servette.png',
      'sion': 'Sion.png', 'fc sion': 'Sion.png',
      'st. gallen': 'St. Gallen.png', 'st gallen': 'St. Gallen.png',
      'winterthur': 'Winterthur.png', 'fc winterthur': 'Winterthur.png',
      'young boys': 'Young Boys.png', 'yb bern': 'Young Boys.png',
      'zurich': 'Zurich.png', 'fc zurich': 'Zurich.png'
    }
  };

  // 🎯 Smart matching with country priority
  if (country && teams[country]) {
    const countryTeams = teams[country];
    
    // Exact match first
    if (countryTeams[normalized]) {
      return `/assets/team_icons/${country}/${countryTeams[normalized]}`;
    }
    
    // Partial match within country
    for (const [key, filename] of Object.entries(countryTeams)) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return `/assets/team_icons/${country}/${filename}`;
      }
    }
  }
  
  // Search all countries if no country match
  for (const [countryName, countryTeams] of Object.entries(teams)) {
    if (countryTeams[normalized]) {
      return `/assets/team_icons/${countryName}/${countryTeams[normalized]}`;
    }
  }
  
  return null;
};

// 🚨 TEAM LOGOS SYSTEM REPORT
export const reportMissingLogos = () => {
  console.log(`
🏆 TEAM LOGO SYSTEM REPORT

✅ COUNTRIES MAPPED:
- Austria: 12 teams ✅
- Belgium: 18 teams ✅ (Anderlecht, Antwerp, Brugge, Genk, etc.)
- Brazil: 28 teams ✅ (Flamengo, Corinthians, Palmeiras, etc.)
- England: 26 teams ✅ (Arsenal, Chelsea, Liverpool, etc.)
- France: 20 teams ✅ (PSG, Lyon, Marseille, etc.)
- Germany: 19 teams ✅ (Bayern, Dortmund, Leipzig, etc.)
- Italy: 20 teams ✅ (Juventus, Inter, Milan, etc.)
- Netherlands: 18 teams ✅ (Ajax, PSV, Feyenoord, etc.)
- Poland: 18 teams ✅ (Legia, Lech, Wisla, etc.)
- Portugal: 18 teams ✅ (Benfica, Porto, Sporting, etc.)
- Russia: 16 teams ✅ (Zenit, CSKA, Spartak, etc.)
- Spain: 24 teams ✅ (Real Madrid, Barcelona, Atletico, etc.)
- Switzerland: 11 teams ✅ (Basel, Young Boys, Zurich, Winterthur, etc.)
- Turkey: 19 teams ✅ (Galatasaray, Fenerbahce, Besiktas, etc.)
- Ukraine: 15 teams ✅ (Shakhtar, Dynamo Kyiv, etc.)

🚨 POTENTIAL CONFLICTS RESOLVED:
- Arsenal (England) vs Arsenal Tula (Russia) ✅
- Inter (Italy) vs Internacional (Brazil) ✅
- Vitoria (Brazil) vs Vitoria Guimaraes (Portugal) ✅
- Dynamo (Russia) vs Dynamo Kyiv (Ukraine) ✅

💡 USAGE: getTeamLogo(teamName, country)
- Always provide country parameter for best results
- System will fallback to global search if country not provided

🎯 EXAMPLES FOR NEWLY ADDED COUNTRIES:
- Ajax → getTeamLogo("Ajax", "Netherlands") → /assets/team_icons/Netherlands/Ajax.png
- Flamengo → getTeamLogo("Flamengo", "Brazil") → /assets/team_icons/Brazil/Flamengo RJ.png
- Legia → getTeamLogo("Legia", "Poland") → /assets/team_icons/Poland/Legia.png
- Anderlecht → getTeamLogo("Anderlecht", "Belgium") → /assets/team_icons/Belgium/Anderlecht.png
  `);
};
