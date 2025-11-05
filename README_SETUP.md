# Windows Setup Guide

## Quick Start

### 1. Activate the virtual environment

**For Command Prompt:**
```cmd
.\activate-venv.bat
```

**For PowerShell:**
```powershell
.\activate-venv.ps1
```

### 2. Verify installation
```bash
python --version
pip list
```

### 3. Run the scraper
```bash
python scrappers\get_real_odds_oddsportal.py
```

## Manual Installation Steps

If you need to recreate the virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1   # PowerShell
# or
.\venv\Scripts\activate.bat   # Command Prompt

# Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Notes

- **Python Version**: This project requires Python 3.14+
- **Database**: Uses `psycopg` (psycopg3) instead of `psycopg2` for Python 3.14 compatibility
- **Chrome Driver**: The scraper uses `undetected-chromedriver` which requires Chrome browser to be installed

## Troubleshooting

### "Python was not found" error
- Make sure you've activated the virtual environment first
- Or use the full path: `.\venv\Scripts\python.exe`

### psycopg2-binary errors
- Already fixed! We're using `psycopg` (psycopg3) instead

### Installation taking too long
- Some packages like `asyncpg` and `xgboost` need to compile from source
- Just wait for it to finish - it's working!


