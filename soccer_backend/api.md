http://localhost:8000/api/odds

queries:
{
    page: 1,
    size: 60
    season: ~
    country: ~
    ...
}



response: 
{
    odds: [
        {
            "season": 2025,
            "date": "2025-08-31",
            "time": "23:30:00",
            "home_team": "Sport Recife",
            "away_team": "Vasco",
            "result": "3:02",
            "half_first": "",
            "half_second": "",
            "odd_1": 144.0,
            "odd_X": 224.0,
            "odd_2": 196.0,
            "bets": 7,
            "country": "spain",
            "league": "Serie A Betano",
            "id": 1522
        },
    ],
    "total": 4094,
    "page": 1,
    "size": 60,
    "pages": 69
}