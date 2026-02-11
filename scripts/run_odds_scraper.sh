#!/usr/bin/env bash
# Daily OddsPortal scraper launcher.
# Run from repo root; requires .env with DATABASE_URL and venv with dependencies.
# Server needs Chrome/Chromium for headless scraping.
set -e
cd "$(dirname "$0")/.."
exec ./venv/bin/python dataanalytics/get_real_odds_oddsportal.py
