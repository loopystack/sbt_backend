from sqlalchemy import Column, Integer, String, Date, Time, Numeric, Float
from app.core.database import Base


class Odds(Base):
    __tablename__ = "odds"

    id = Column(Integer, primary_key=True, index=True)
    season = Column(String(10), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    result = Column(String(10), nullable=True)
    half_first = Column(String(10), nullable=True)
    half_second = Column(String(10), nullable=True)
    odd_1 = Column(String(10), nullable=True)
    odd_X = Column(String(10), nullable=True)
    odd_2 = Column(String(10), nullable=True)
    bets = Column(String(10), nullable=True)
    country = Column(String(50), nullable=False)
    league = Column(String(100), nullable=False)

    def __repr__(self):
        return f"<Odds(id={self.id}, home_team='{self.home_team}', away_team='{self.away_team}', date='{self.date}')>"
