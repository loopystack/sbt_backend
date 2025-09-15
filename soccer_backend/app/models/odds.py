from sqlalchemy import Column, Integer, String, Date, Time, Numeric, Float
from app.core.database import Base


class Odds(Base):
    __tablename__ = "odds"

    id = Column(Integer, primary_key=True, index=True)
    season = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=True)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    result = Column(String(10), nullable=True)
    odd_1 = Column(Numeric, nullable=True)
    odd_X = Column(Numeric, nullable=True)
    odd_2 = Column(Numeric, nullable=True)
    bets = Column(Integer, nullable=True)
    country = Column(String(50), nullable=True)
    league = Column(String(100), nullable=False)
    pre_odd_1 = Column(Numeric, nullable=True)
    pre_odd_x = Column(Numeric, nullable=True)
    pre_odd_2 = Column(Numeric, nullable=True)

    def __repr__(self):
        return f"<Odds(id={self.id}, home_team='{self.home_team}', away_team='{self.away_team}', date='{self.date}')>"
