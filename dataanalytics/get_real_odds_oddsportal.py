# odds_multi_countries_fixed_dates.py
import time
import re
import os
import shutil
from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict
from decimal import Decimal
from datetime import datetime, date, timedelta


import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    StaleElementReferenceException,
    ElementClickInterceptedException,
)
import subprocess
import platform

import psycopg
from psycopg.sql import SQL, Identifier
# import psycopg.pool  # Not used in script - psycopg-pool is separate package if needed

# -------------------- DB CONFIG --------------------
DB_CONFIG = {
    "host":     "ep-empty-term-adh8v9zs-pooler.c-2.us-east-1.aws.neon.tech",
    "port":     5432,
    "dbname":   "sportsbetting",
    "user":     "neondb_owner",
    "password": "npg_ZdRSbgLjv5s6",
}

TABLE  = "odds"

# -------------------- League configuration --------------------
@dataclass
class LeagueConfig:
    country: str               # url segment (brazil, england, ...)
    league_name: str           # label stored in DB
    base: str                  # e.g. https://www.oddsportal.com/football/germany/
    kind: str                  # 'single_year' | 'two_year'
    comp_slug: str             # results slug (bundesliga, serie-a, laliga, ...)
    seasons: List[int]         # single_year: [2021,...] ; two_year: [2021,...] (means 2021-22)
    next_slug: Optional[str] = None          # slug for "next matches" page
    special_slugs: Dict[int, str] = None     # overrides for certain seasons

    def results_url(self, start_year: int) -> str:
        if self.special_slugs and start_year in self.special_slugs:
            return self.base + self.special_slugs[start_year]
        if self.kind == "single_year":
            return f"{self.base}{self.comp_slug}-{start_year}/results/"
        # two-year
        if start_year >= 2025:
            return f"{self.base}{self.comp_slug}/results/"  # seasonless current page
        return f"{self.base}{self.comp_slug}-{start_year}-{start_year+1}/results/"

    def next_url(self) -> str:
        slug = self.next_slug or self.comp_slug
        return f"{self.base}{slug}/"

# --- Leagues ---
BRAZIL = LeagueConfig(
    country="brazil",
    league_name="Serie A Betano",
    base="https://www.oddsportal.com/football/brazil/",
    kind="single_year",
    comp_slug="serie-a",
    seasons=[2021, 2022, 2023, 2024, 2025],
    next_slug="serie-a-betano",
    special_slugs={2024: "serie-a-betano-2024/results/", 2025: "serie-a-betano/results/"},
)
ENGLAND = LeagueConfig("england", "Premier League", "https://www.oddsportal.com/football/england/", "two_year", "premier-league", [2021, 2022, 2023, 2024, 2025])
SPAIN   = LeagueConfig("spain",   "LaLiga",          "https://www.oddsportal.com/football/spain/",   "two_year", "laliga",          [2021, 2022, 2023, 2024, 2025])
GERMANY = LeagueConfig("germany", "Bundesliga",      "https://www.oddsportal.com/football/germany/","two_year", "bundesliga",      [2021, 2022, 2023, 2024, 2025])
ITALY   = LeagueConfig("italy",   "Serie A",         "https://www.oddsportal.com/football/italy/",  "two_year", "serie-a",         [2021, 2022, 2023, 2024, 2025])
FRANCE  = LeagueConfig("france",  "Ligue 1",         "https://www.oddsportal.com/football/france/", "two_year", "ligue-1",         [2021, 2022, 2023, 2024, 2025])
# ARGENTINA = LeagueConfig("argentina","Torneo Betano","https://www.oddsportal.com/football/argentina/","single_year","torneo-betano",[2021, 2022, 2023, 2024, 2025])
PORTUGAL  = LeagueConfig("portugal","Liga Portugal", "https://www.oddsportal.com/football/portugal/","two_year","liga-portugal",[2021, 2022, 2023, 2024, 2025])
NETHERLANDS = LeagueConfig("netherlands","Eredivisie","https://www.oddsportal.com/football/netherlands/","two_year","eredivisie",[2021, 2022, 2023, 2024, 2025])
BELGIUM  = LeagueConfig("belgium","Jupiler Pro League","https://www.oddsportal.com/football/belgium/","two_year","jupiler-pro-league",[2021, 2022, 2023, 2024, 2025])
TURKEY   = LeagueConfig("turkey","Super Lig","https://www.oddsportal.com/football/turkey/","two_year","super-lig",[2021, 2022, 2023, 2024, 2025])
RUSSIA   = LeagueConfig("russia","Premier League","https://www.oddsportal.com/football/russia/","two_year","premier-league",[2021, 2022, 2023, 2024, 2025])
UKRAINE  = LeagueConfig("ukraine","Premier League","https://www.oddsportal.com/football/ukraine/","two_year","premier-league",[2021, 2022, 2023, 2024, 2025])
POLAND   = LeagueConfig("poland","Ekstraklasa","https://www.oddsportal.com/football/poland/","two_year","ekstraklasa",[2021, 2022, 2023, 2024, 2025])
# CZECH    = LeagueConfig("czech-republic","Fortuna Liga","https://www.oddsportal.com/football/czech-republic/","two_year","fortuna-liga",[2021, 2022, 2023, 2024, 2025])
AUSTRIA  = LeagueConfig("austria","Bundesliga","https://www.oddsportal.com/football/austria/","two_year","bundesliga",[2021, 2022, 2023, 2024, 2025])
SWITZERLAND = LeagueConfig("switzerland","Super League","https://www.oddsportal.com/football/switzerland/","two_year","super-league",[2021, 2022, 2023, 2024, 2025])

LEAGUES: List[LeagueConfig] = [
    BRAZIL, ENGLAND, SPAIN,
    GERMANY, ITALY, FRANCE,
    PORTUGAL, NETHERLANDS, BELGIUM, TURKEY, 
    RUSSIA, UKRAINE, POLAND, AUSTRIA, SWITZERLAND, 
]

# -------------------- Chrome Version Detection --------------------
def get_chrome_version() -> Optional[int]:
    """
    Detect Chrome browser version automatically.
    Returns the major version number (e.g., 143) or None if detection fails.
    """
    try:
        system = platform.system()
        
        if system == "Windows":
            # Try common Chrome installation paths on Windows
            chrome_paths = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
            ]
            
            for chrome_path in chrome_paths:
                if os.path.exists(chrome_path):
                    # Get version using PowerShell
                    try:
                        # Use PowerShell to get file version (escape quotes properly)
                        ps_cmd = f'(Get-Item "{chrome_path}").VersionInfo.FileVersion'
                        cmd = ['powershell', '-Command', ps_cmd]
                        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            version_str = result.stdout.strip()
                            # Extract major version (e.g., "143.0.7499.41" -> 143)
                            version_parts = version_str.split('.')
                            if version_parts and version_parts[0].isdigit():
                                return int(version_parts[0])
                    except Exception:
                        # Fallback: try chrome --version if available
                        try:
                            result = subprocess.run(
                                [chrome_path, "--version"],
                                capture_output=True,
                                text=True,
                                timeout=5
                            )
                            if result.returncode == 0:
                                version_str = result.stdout.strip()
                                match = re.search(r'(\d+)\.', version_str)
                                if match:
                                    return int(match.group(1))
                        except Exception:
                            continue
        
        elif system == "Linux":
            # Try chrome --version command
            try:
                result = subprocess.run(
                    ["google-chrome", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    # Output format: "Google Chrome 143.0.7499.41"
                    version_str = result.stdout.strip()
                    match = re.search(r'(\d+)\.', version_str)
                    if match:
                        return int(match.group(1))
            except Exception:
                pass
        
        elif system == "Darwin":  # macOS
            # Try /Applications/Google Chrome.app
            chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            if os.path.exists(chrome_path):
                try:
                    result = subprocess.run(
                        [chrome_path, "--version"],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        version_str = result.stdout.strip()
                        match = re.search(r'(\d+)\.', version_str)
                        if match:
                            return int(match.group(1))
                except Exception:
                    pass
        
        print("⚠️ Could not auto-detect Chrome version, will let undetected-chromedriver handle it")
        return None
        
    except Exception as e:
        print(f"⚠️ Error detecting Chrome version: {e}")
        return None

# -------------------- Selenium setup --------------------
def make_driver(headless: bool = True) -> uc.Chrome:
    chrome_opts = Options()
    
    # Basic settings
    if headless:
        chrome_opts.add_argument("--headless=new")
    chrome_opts.add_argument("--disable-gpu")
    chrome_opts.add_argument("--no-sandbox")
    chrome_opts.add_argument("--window-size=1920,1080")  # More common resolution
    chrome_opts.add_argument("--disable-dev-shm-usage")
    chrome_opts.add_argument("--lang=en-US")
    
    # Anti-detection measures
    chrome_opts.add_argument("--disable-blink-features=AutomationControlled")
    chrome_opts.add_argument("--disable-web-security")
    chrome_opts.add_argument("--disable-features=VizDisplayCompositor")
    chrome_opts.add_argument("--disable-extensions")
    chrome_opts.add_argument("--disable-plugins")
    chrome_opts.add_argument("--disable-default-apps")
    chrome_opts.add_argument("--disable-sync")
    chrome_opts.add_argument("--no-first-run")
    chrome_opts.add_argument("--no-default-browser-check")
    chrome_opts.add_argument("--disable-background-timer-throttling")
    chrome_opts.add_argument("--disable-backgrounding-occluded-windows")
    chrome_opts.add_argument("--disable-renderer-backgrounding")
    
    # More realistic user agent (Chrome 130+)
    chrome_opts.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    )
    
    # Performance improvements  
    chrome_opts.add_argument("--disable-logging")
    chrome_opts.add_argument("--disable-gpu-logging")
    chrome_opts.add_argument("--silent")
    
    max_retries = 3
    retry_delay = 2  # seconds
    
    # Auto-detect Chrome version
    chrome_version = get_chrome_version()
    if chrome_version:
        print(f"🔍 Detected Chrome version: {chrome_version}")
    else:
        print("🔍 Chrome version auto-detection failed, using automatic driver selection")
    
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                print(f"🔄 Retry attempt {attempt + 1}/{max_retries}...")
                time.sleep(retry_delay * attempt)  # Exponential backoff
            
            # Use detected version if available, otherwise let uc auto-detect
            if chrome_version:
                driver = uc.Chrome(options=chrome_opts, version_main=chrome_version)
            else:
                # Let undetected-chromedriver auto-detect and download matching driver
                driver = uc.Chrome(options=chrome_opts)
            driver.set_page_load_timeout(60)
            
            # Additional anti-detection via JS
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            print("🚗 Chrome driver initialized successfully")
            return driver
            
        except Exception as e:
            error_msg = str(e).lower()
            is_download_error = any(keyword in error_msg for keyword in [
                "retrieval incomplete",
                "contenttooshort",
                "urlopen error",
                "got only"
            ])
            
            if is_download_error and attempt < max_retries - 1:
                print(f"⚠️ ChromeDriver download incomplete (attempt {attempt + 1}/{max_retries})")
                print(f"   Error: {str(e)[:200]}...")
                print(f"   Retrying in {retry_delay * (attempt + 1)} seconds...")
                
                # Clear cache to force fresh download
                cache_dir = os.path.join(os.path.expanduser('~'), '.undetected_chromedriver')
                if os.path.exists(cache_dir):
                    try:
                        shutil.rmtree(cache_dir)
                        print(f"   Cleared ChromeDriver cache: {cache_dir}")
                    except Exception as cache_error:
                        print(f"   ⚠️ Could not clear cache: {cache_error}")
                
                continue  # Retry
            else:
                print(f"❌ Failed to create Chrome driver: {e}")
                if attempt == max_retries - 1:
                    print("💡 Tips:")
                    print("   - Check your internet connection")
                    print("   - Try running the script again (download may succeed on retry)")
                    print("   - Update Chrome browser to latest version")
                    print("   - Manually clear cache: Remove ~/.undetected_chromedriver folder")
                raise

def wait_for_results_table(driver):
    """Wait for results table with fallback strategies"""
    try:
        # Primary strategy: wait for game rows or headers
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located(
                (By.XPATH, "//div[@data-testid='secondary-header'] | //div[@data-testid='game-row']")
            )
        )
        print("✅ Found results table elements")
    except Exception as e1:
        print(f"⚠️ Primary wait failed: {str(e1)[:100]}...")
        try:
            # Fallback 1: wait for any table-like structure
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//div[contains(@class,'table') or contains(@class,'row') or contains(@class,'match')]")
                )
            )
            print("✅ Found table-like elements (fallback 1)")
        except Exception as e2:
            print(f"⚠️ Fallback 1 failed: {str(e2)[:100]}...")
            try:
                # Fallback 2: wait for page body to be present
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
                print("✅ Page body loaded (fallback 2)")
                
                # Debug: show what's actually on the page
                page_source_snippet = driver.page_source[:500] if driver.page_source else "No page source"
                print(f"🔍 Page source snippet: {page_source_snippet}...")
                print(f"🔍 Current URL: {driver.current_url}")
                
            except Exception as e3:
                print(f"❌ All wait strategies failed: {str(e3)[:100]}...")
                raise e1  # Raise the original exception
    
    time.sleep(0.4)

def close_popups(driver):
    """Close various popups and overlays that might block the page"""
    popup_selectors = [
        # Cookie banners
        (By.XPATH, "//button[contains(., 'Accept') or contains(.,'I Agree') or contains(.,'I accept') or contains(.,'Allow') or contains(.,'OK')]"),
        (By.XPATH, "//button[contains(@class,'cookie') or contains(@id,'cookie')]"),
        (By.XPATH, "//div[contains(@class,'cookie')]//button"),
        
        # General dialogs and modals
        (By.CSS_SELECTOR, "div[role='dialog'] button"),
        (By.CSS_SELECTOR, ".modal button"),
        (By.CSS_SELECTOR, "[class*='modal'] button"),
        (By.CSS_SELECTOR, "[class*='popup'] button"),
        (By.CSS_SELECTOR, "[class*='overlay'] button"),
        
        # Close buttons
        (By.XPATH, "//button[contains(@class,'close') or contains(@aria-label,'close') or text()='×' or text()='X']"),
        (By.CSS_SELECTOR, ".close, [class*='close']"),
        
        # GDPR and privacy
        (By.XPATH, "//button[contains(text(),'Accept all') or contains(text(),'Accept All')]"),
        (By.XPATH, "//button[contains(@class,'consent') or contains(@id,'consent')]"),
    ]
    
    popups_closed = 0
    for by, sel in popup_selectors:
        try:
            elements = driver.find_elements(by, sel)
            for el in elements[:3]:  # Limit to first 3 to avoid clicking too many things
                if el.is_displayed() and el.is_enabled():
                    el.click()
                    popups_closed += 1
                    time.sleep(0.3)
                    print(f"🔧 Closed popup/modal ({popups_closed})")
                    break
        except Exception:
            continue
    
    # Try to dismiss any remaining overlays with ESC key
    try:
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.2)
    except Exception:
        pass

def go_to_url(driver, url: str, max_retries: int = 2):
    """Navigate to URL with retries and popup handling"""
    for attempt in range(max_retries + 1):
        try:
            print(f"🌐 Navigating to: {url}")
            if attempt > 0:
                print(f"   (Retry {attempt}/{max_retries})")
                
            driver.get(url)
            time.sleep(2)  # Give page time to start loading
            
            # Close popups first (they might block content loading)
            close_popups(driver)
            time.sleep(1)
            
            # Now wait for the actual content
            wait_for_results_table(driver)
            
            print("✅ Page loaded successfully")
            return
            
        except Exception as e:
            print(f"⚠️ Attempt {attempt + 1} failed: {str(e)[:100]}...")
            if attempt < max_retries:
                wait_time = (attempt + 1) * 3  # Progressive backoff: 3s, 6s
                print(f"   Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                print(f"❌ All {max_retries + 1} attempts failed for URL: {url}")
                
                # Try to get some diagnostic info
                try:
                    print(f"🔍 Current URL: {driver.current_url}")
                    print(f"🔍 Page title: {driver.title}")
                except:
                    print("🔍 Cannot get page info")
                
                raise e

def _row_count(driver) -> int:
    return len(driver.find_elements(
        By.XPATH,
        "//div[@data-testid='game-row']/ancestor::div[contains(@class,'group') and contains(@class,'flex')]"
    ))

def scroll_to_bottom_until_stable(driver, *, expected_rows_per_page=50, min_stable_checks=2, max_loops=40, pause=0.25) -> int:
    stable = 0
    prev_h = -1
    prev_rows = -1
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(0.2)
    for _ in range(max_loops):
        driver.execute_script("window.scrollBy(0, Math.max(700, window.innerHeight*0.9));")
        time.sleep(pause)
        at_bottom = driver.execute_script("return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 4);")
        cur_h = driver.execute_script("return document.body.scrollHeight;")
        cur_rows = _row_count(driver)
        stable = stable + 1 if (cur_h == prev_h and cur_rows == prev_rows) else 0
        prev_h, prev_rows = cur_h, cur_rows
        if at_bottom and (cur_rows >= expected_rows_per_page or stable >= min_stable_checks):
            break
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(0.2)
    return _row_count(driver)

def locate_next_button(driver):
    xp = "//a[contains(concat(' ', normalize-space(@class), ' '), ' pagination-link ') and normalize-space(.)='Next']"
    links = driver.find_elements(By.XPATH, xp)
    return links[-1] if links else None

def click_next_page(driver) -> bool:
    scroll_to_bottom_until_stable(driver)
    close_popups(driver)
    btn = locate_next_button(driver)
    if not btn:
        return False
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'nearest'});", btn)
    driver.execute_script("window.scrollBy(0, -140);")
    time.sleep(0.1)
    try:
        btn.click()
    except ElementClickInterceptedException:
        driver.execute_script("arguments[0].click();", btn)
    except Exception:
        driver.execute_script("arguments[0].click();", btn)
    wait_for_results_table(driver)
    return True

def get_total_pages(driver) -> Optional[int]:
    scroll_to_bottom_until_stable(driver)
    xp = ("//a[contains(concat(' ', normalize-space(@class), ' '), ' pagination-link ') "
          "and normalize-space(.)!='Next' and normalize-space(.)!='Previous']")
    nums = []
    for el in driver.find_elements(By.XPATH, xp):
        txt = (el.text or "").strip()
        if txt.isdigit():
            nums.append(int(txt))
    return max(nums) if nums else None

# -------------------- Date handling --------------------
# Accepts “24 Apr 2022”, “24 April 2022”, even when surrounded by text like “24 Apr 2022 – Relegation”
DATE_PAT = re.compile(r"(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})")

def extract_date_from_text(raw: str) -> Optional[str]:
    """
    Return the matched 'DD Mon YYYY' or 'DD Month YYYY' substring from any header line,
    ignoring trailing qualifiers (e.g., '– Relegation', '– Play-offs').
    """
    if not raw:
        return None
    raw = raw.strip()
    m = DATE_PAT.search(raw)
    return m.group(0) if m else None

def extract_date_from_row(row) -> Optional[str]:
    try:
        date_el = row.find_element(
            By.XPATH,
            ".//preceding::div[@data-testid='secondary-header'][1]//div[@data-testid='date-header']//div"
        )
        raw = date_el.text.strip()
        # print for debug if you want:
        # print("HEADER RAW:", raw)
        return extract_date_from_text(raw)
    except Exception:
        return None

def _parse_date(d: Optional[str]):
    """
    Parse either 'DD Mon YYYY' or 'DD Month YYYY'. If there's extra text, DATE_PAT will have
    already reduced it to the matched date substring.
    """
    if not d:
        return None
    s = d.strip()
    # try abbreviated month
    for fmt in ("%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

# -------------------- Other extraction helpers --------------------
def extract_time(row) -> Optional[str]:
    try:
        el = row.find_element(By.XPATH, ".//div[@data-testid='time-item']//p")
        return el.text.strip()
    except Exception:
        return None

def extract_teams_and_result(row) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    home_name = away_name = None
    home_goals = away_goals = None
    part = row.find_element(By.XPATH, ".//div[@data-testid='event-participants']")

    anchors = part.find_elements(By.XPATH, ".//a[.//p[contains(@class,'participant-name')]]")
    if len(anchors) >= 2:
        try:  home_name = anchors[0].find_element(By.XPATH, ".//p[contains(@class,'participant-name')]").text.strip()
        except Exception: pass
        try:  away_name = anchors[1].find_element(By.XPATH, ".//p[contains(@class,'participant-name')]").text.strip()
        except Exception: pass

        # right-edge scores
        try:
            hg = anchors[0].find_element(By.XPATH, ".//div[contains(@class,'ml-auto') and contains(@class,'font-bold')]").text.strip()
            if hg: home_goals = hg
        except Exception: pass
        try:
            ag = anchors[1].find_element(By.XPATH, ".//div[contains(@class,'ml-auto') and contains(@class,'font-bold')]").text.strip()
            if ag: away_goals = ag
        except Exception: pass

    # fallback center tiny “1–0”
    if home_goals is None or away_goals is None:
        try:
            center = part.find_element(By.XPATH, ".//div[contains(@class,'text-gray-dark') and contains(@class,'relative')]//div[contains(@class,'gap-1')]")
            raw = center.get_attribute("textContent") or ""
            m = re.search(r"(\d+)\s*[–-]\s*(\d+)", raw)
            if m:
                home_goals = home_goals or m.group(1)
                away_goals = away_goals or m.group(2)
        except Exception:
            pass

    result = f"{home_goals}-{away_goals}" if (home_goals is not None and away_goals is not None) else None
    return home_name, away_name, result

def extract_odds_and_bs(row) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    odd_1 = odd_x = odd_2 = None
    bs_value = None
    try:
        odd_cells = row.find_elements(By.XPATH, ".//following-sibling::div[contains(@data-testid,'odd-container')][position()<=3]")
        def get_odd(cell):
            try:
                p = cell.find_element(By.XPATH, ".//p[contains(@data-testid,'odd-container')]")
                return p.text.strip()
            except Exception:
                return None
        if len(odd_cells) >= 1: odd_1 = get_odd(odd_cells[0])
        if len(odd_cells) >= 2: odd_x = get_odd(odd_cells[1])
        if len(odd_cells) >= 3: odd_2 = get_odd(odd_cells[2])
    except Exception:
        pass
    try:
        bs_el = row.find_element(By.XPATH, ".//following-sibling::div[@data-testid='bookies-amount-item']//div[contains(@class,'height-content')]")
        bs_value = bs_el.text.strip()
    except Exception:
        pass
    return odd_1, odd_x, odd_2, bs_value

# -------------------- Data model --------------------
@dataclass
class MatchRow:
    country: str
    league: str
    season_start: int
    page: int
    date_str: Optional[str]
    time_str: Optional[str]
    home_team: Optional[str]
    away_team: Optional[str]
    result: Optional[str]
    odd_1: Optional[str]
    odd_X: Optional[str]
    odd_2: Optional[str]
    bets: Optional[str]

# -------------------- Season helpers --------------------
def infer_season_start(league: LeagueConfig, d: Optional[date]) -> int:
    if d is None:
        d = datetime.today().date()
    if league.kind == "single_year":
        return d.year
    # two-year: Jul–Dec -> start this year; Jan–Jun -> start previous
    return d.year if d.month >= 7 else d.year - 1

# -------------------- Scrape page (results; season fixed) --------------------
def collect_rows_on_page(driver, country: str, league: str, season_start: int, page_num: int) -> List[MatchRow]:
    rows: List[MatchRow] = []
    scroll_to_bottom_until_stable(driver, expected_rows_per_page=50, min_stable_checks=2)

    row_boxes = driver.find_elements(
        By.XPATH,
        "//div[@data-testid='game-row']/ancestor::div[contains(@class,'group') and contains(@class,'flex')]"
    )
    for box in row_boxes:
        try:
            date_s = extract_date_from_row(box)           # <-- sanitized now
            tm = extract_time(box)
            home, away, result = extract_teams_and_result(box)
            o1, ox, o2, bs = extract_odds_and_bs(box)

            print(f"[{country}][{league}][{season_start}] p{page_num} | {date_s or '?'} {tm or '?'} | "
                  f"{home or '?'} vs {away or '?'} -> {result or '?'} | 1:{o1 or '?'} X:{ox or '?'} 2:{o2 or '?'} | bets:{bs or '?'}")

            rows.append(MatchRow(
                country=country, league=league, season_start=season_start, page=page_num,
                date_str=date_s, time_str=tm, home_team=home, away_team=away, result=result,
                odd_1=o1, odd_X=ox, odd_2=o2, bets=bs
            ))
        except StaleElementReferenceException:
            continue
        except Exception:
            continue
    return rows

# -------------------- Scrape page (next matches; season inferred per row) --------------------
def collect_rows_on_page_dynamic_season(driver, league_cfg: LeagueConfig, page_num: int) -> List[MatchRow]:
    rows: List[MatchRow] = []
    scroll_to_bottom_until_stable(driver, expected_rows_per_page=50, min_stable_checks=2)

    row_boxes = driver.find_elements(
        By.XPATH,
        "//div[@data-testid='game-row']/ancestor::div[contains(@class,'group') and contains(@class,'flex')]"
    )
    for box in row_boxes:
        try:
            date_s = extract_date_from_row(box)          # sanitized
            parsed_date = _parse_date(date_s)
            season_start = infer_season_start(league_cfg, parsed_date)

            tm = extract_time(box)
            home, away, result = extract_teams_and_result(box)  # likely None
            o1, ox, o2, bs = extract_odds_and_bs(box)

            print(f"[{league_cfg.country}][{league_cfg.league_name}][{season_start}] p{page_num} | {date_s or '?'} {tm or '?'} | "
                  f"{home or '?'} vs {away or '?'} -> {result or '-'} | 1:{o1 or '-'} X:{ox or '-'} 2:{o2 or '-'} | bets:{bs or '-'}")

            rows.append(MatchRow(
                country=league_cfg.country, league=league_cfg.league_name,
                season_start=season_start, page=page_num,
                date_str=date_s, time_str=tm, home_team=home, away_team=away, result=result,
                odd_1=o1, odd_X=ox, odd_2=o2, bets=bs
            ))
        except StaleElementReferenceException:
            continue
        except Exception:
            continue
    return rows

# -------------------- Database checking helpers --------------------
def get_existing_seasons_for_league(conn, country: str, league: str) -> List[int]:
    """Get list of seasons that already have data for a specific league"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT season 
            FROM odds 
            WHERE country = %s AND league = %s AND season IS NOT NULL
            ORDER BY season DESC
        """, (country, league))
        return [row[0] for row in cur.fetchall()]

def get_date_range_for_season(conn, country: str, league: str, season: int) -> Tuple[Optional[date], Optional[date]]:
    """Get the min and max dates for a specific league/season"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT MIN(date), MAX(date)
            FROM odds 
            WHERE country = %s AND league = %s AND season = %s
        """, (country, league, season))
        result = cur.fetchone()
        return (result[0], result[1]) if result else (None, None)

def count_matches_in_season(conn, country: str, league: str, season: int) -> int:
    """Count total matches for a specific league/season"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) 
            FROM odds 
            WHERE country = %s AND league = %s AND season = %s
        """, (country, league, season))
        return cur.fetchone()[0]

def is_season_complete(conn, country: str, league: str, season: int, min_matches: int = 300) -> bool:
    """
    Check if a season appears complete based on match count.
    Most major leagues have 380+ matches per season, so 300 is a reasonable threshold.
    """
    count = count_matches_in_season(conn, country, league, season)
    return count >= min_matches

def should_skip_season(conn, country: str, league: str, season: int, force_rescrape: bool = False) -> bool:
    """
    Determine if we should skip scraping a season.
    Skip if season is complete unless force_rescrape is True.
    """
    if force_rescrape:
        return False
    
    # Check global skip settings
    current_year = datetime.now().year
    if season >= current_year and not SKIP_CURRENT_SEASON:
        return False
    
    return is_season_complete(conn, country, league, season, MIN_MATCHES_COMPLETE)

def get_missing_date_ranges(conn, country: str, league: str, season: int) -> List[Tuple[date, date]]:
    """
    Identify date ranges that might be missing matches.
    Returns list of (start_date, end_date) tuples where we might need to scrape more data.
    """
    with conn.cursor() as cur:
        # Get all existing dates for this league/season, ordered
        cur.execute("""
            SELECT DISTINCT date FROM odds 
            WHERE country = %s AND league = %s AND season = %s
            ORDER BY date
        """, (country, league, season))
        existing_dates = [row[0] for row in cur.fetchall()]
    
    if not existing_dates:
        return []  # No existing data, would need to scrape everything
    
    missing_ranges = []
    
    # Check for gaps larger than 10 days (might indicate missing data)
    for i in range(len(existing_dates) - 1):
        current_date = existing_dates[i]
        next_date = existing_dates[i + 1] 
        gap_days = (next_date - current_date).days
        
        if gap_days > 10:  # Potential missing data
            gap_start = current_date + timedelta(days=1)
            gap_end = next_date - timedelta(days=1)
            missing_ranges.append((gap_start, gap_end))
    
    return missing_ranges

def has_significant_gaps(conn, country: str, league: str, season: int) -> bool:
    """
    Check if a season has significant gaps that might warrant re-scraping specific ranges.
    """
    missing_ranges = get_missing_date_ranges(conn, country, league, season)
    if not missing_ranges:
        return False
    
    # Check if any gap is longer than 30 days
    for start_date, end_date in missing_ranges:
        if (end_date - start_date).days > 30:
            return True
    
    return False

# -------------------- Postgres helpers --------------------
def _parse_time(t: Optional[str]):
    if not t: return None
    t = t.strip()
    for fmt in ("%H:%M", "%H.%M"):
        try:
            return datetime.strptime(t, fmt).time()
        except ValueError:
            continue
    return None

def _to_decimal(s: Optional[str]):
    if not s: return None
    try: return Decimal(s)
    except Exception: return None

def _to_int(s: Optional[str]):
    if not s: return None
    try: return int(str(s).strip())
    except Exception: return None

def build_insert_values(rows: List[MatchRow]) -> List[Tuple]:
    vals = []
    for r in rows:
        d = _parse_date(r.date_str)          # robust date parsing
        if d is None:
            # Safety: skip rows whose date we can't parse (avoid NOT NULL violation)
            print(f"!! SKIP (no date): [{r.country}][{r.league}] {r.date_str} {r.time_str} {r.home_team} vs {r.away_team}")
            continue
        vals.append((
            r.country,
            r.league,
            int(r.season_start) if r.season_start is not None else None,
            d,
            _parse_time(r.time_str),
            (r.home_team or None),
            (r.away_team or None),
            (r.result or None),
            _to_decimal(r.odd_1),
            _to_decimal(r.odd_X),
            _to_decimal(r.odd_2),
            _to_int(r.bets),
        ))
    return vals

def insert_rows(conn, values: List[Tuple]):
    """
    Insert rows into odds table, skipping duplicates based on match identity.
    Note: Since there's no unique constraint on the match columns, we check for
    existing rows before inserting to avoid duplicates.
    """
    if not values:
        return
    
    # Filter out rows that already exist using a single query for better performance
    filtered_values = []
    with conn.cursor() as check_cur:
        # Build a query to check all rows at once using VALUES
        # This is more efficient than checking one by one
        for val in values:
            # val structure: (country, league, season, date, time, home_team, away_team, result, odd_1, odd_X, odd_2, bets)
            check_sql = SQL("""
                SELECT COUNT(*) FROM {table}
                WHERE country = %s 
                  AND league = %s 
                  AND season = %s 
                  AND date = %s 
                  AND (time = %s OR (time IS NULL AND %s IS NULL))
                  AND home_team = %s 
                  AND away_team = %s
            """).format(table=Identifier(TABLE))
            
            check_cur.execute(check_sql, (
                val[0],  # country
                val[1],  # league
                val[2],  # season
                val[3],  # date
                val[4],  # time
                val[4],  # time (for NULL check)
                val[5],  # home_team
                val[6],  # away_team
            ))
            exists = check_cur.fetchone()[0] > 0
            
            if not exists:
                filtered_values.append(val)
    
    if not filtered_values:
        print(f"   ⏭️  All {len(values)} rows already exist, skipping insert")
        return
    
    if len(filtered_values) < len(values):
        print(f"   📝 Inserting {len(filtered_values)} new rows (skipped {len(values) - len(filtered_values)} duplicates)")
    
    sql = f"""
    INSERT INTO {TABLE}
    (country, league, season, "date", "time", home_team, away_team, result, odd_1, "odd_X", odd_2, bets)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    with conn.cursor() as cur:
        cur.executemany(sql, filtered_values)
    conn.commit()
    print(f"   ✅ Inserted {len(filtered_values)} rows")

# -------------------- Orchestration --------------------
SCRAPE_RESULTS = True
SCRAPE_NEXT    = True

# -------------------- Skip optimization settings --------------------
SKIP_EXISTING_SEASONS = True      # Skip seasons that appear complete
FORCE_RESCRAPE_ALL = False        # Force rescrape everything (ignores all skip logic)
MIN_MATCHES_COMPLETE = 300        # Minimum matches to consider a season "complete"
SKIP_CURRENT_SEASON = False       # Whether to skip current/future seasons (usually False)
ALWAYS_SCRAPE_NEXT_MATCHES = True # Always scrape next matches regardless of skip settings

def scrape_results_for_league(conn, driver, league: LeagueConfig):
    # Check what seasons already exist
    existing_seasons = get_existing_seasons_for_league(conn, league.country, league.league_name)
    print(f"\n=== LEAGUE ANALYSIS • {league.country.upper()} • {league.league_name} ===")
    print(f"Seasons to scrape: {league.seasons}")
    print(f"Existing seasons in DB: {existing_seasons}")
    
    for start_year in league.seasons:
        # Check if we should skip this season
        if SKIP_EXISTING_SEASONS and not FORCE_RESCRAPE_ALL:
            if should_skip_season(conn, league.country, league.league_name, start_year, FORCE_RESCRAPE_ALL):
                match_count = count_matches_in_season(conn, league.country, league.league_name, start_year)
                date_range = get_date_range_for_season(conn, league.country, league.league_name, start_year)
                
                # Check for significant gaps that might warrant re-scraping
                if has_significant_gaps(conn, league.country, league.league_name, start_year):
                    missing_ranges = get_missing_date_ranges(conn, league.country, league.league_name, start_year)
                    print(f"🔍 Season {start_year} has {match_count} matches but significant gaps detected:")
                    for gap_start, gap_end in missing_ranges:
                        gap_days = (gap_end - gap_start).days
                        if gap_days > 30:
                            print(f"   📅 Gap: {gap_start} to {gap_end} ({gap_days} days)")
                    print(f"   ✅ Proceeding to re-scrape to fill gaps...")
                else:
                    print(f"⏭️  SKIPPING {start_year} - already has {match_count} matches (dates: {date_range[0]} to {date_range[1]})")
                    continue
        
        url = league.results_url(start_year)
        print(f"\n=== RESULTS • {league.country.upper()} • {league.league_name} • {start_year} ===")
        
        # Show existing data info for this season
        existing_count = count_matches_in_season(conn, league.country, league.league_name, start_year)
        if existing_count > 0:
            date_range = get_date_range_for_season(conn, league.country, league.league_name, start_year)
            print(f"📊 Existing data: {existing_count} matches (dates: {date_range[0]} to {date_range[1]})")
            
            # Check for suspicious future dates (might indicate data issues)
            if date_range[1] and date_range[1] > datetime.now().date():
                days_in_future = (date_range[1] - datetime.now().date()).days
                if days_in_future > 30:
                    print(f"⚠️ WARNING: Latest match date is {days_in_future} days in the future")
                    print(f"   This might indicate data issues or unusual league structure")
        
        try:
            go_to_url(driver, url)
        except Exception as e:
            print(f"❌ Failed to load season {start_year}: {e}")
            print(f"🔗 Problem URL: {url}")
            
            # Check if this is a known problematic season
            current_year = datetime.now().year
            if start_year >= current_year:
                print(f"💡 This is a current/future season ({start_year}). The page structure might be different.")
                print(f"   • Try running with headless=False to see what's happening")
                print(f"   • The season might not have started yet or have a different URL structure")
            
            # For now, continue with next season instead of crashing
            print(f"⏭️ Skipping season {start_year} and continuing...")
            continue

        total_pages = get_total_pages(driver)
        if total_pages is None:
            page_idx = 1
            while True:
                print(f"-- Page {page_idx}")
                rows = collect_rows_on_page(driver, league.country, league.league_name, start_year, page_idx)
                insert_rows(conn, build_insert_values(rows))
                if not click_next_page(driver):
                    break
                page_idx += 1
        else:
            for p in range(1, total_pages + 1):
                print(f"-- Page {p}/{total_pages}")
                rows = collect_rows_on_page(driver, league.country, league.league_name, start_year, p)
                insert_rows(conn, build_insert_values(rows))
                if p < total_pages and not click_next_page(driver):
                    print("Next not found/disabled early; stopping this season.")
                    break

def scrape_next_for_league(conn, driver, league: LeagueConfig):
    url = league.next_url()
    print(f"\n=== NEXT MATCHES • {league.country.upper()} • {league.league_name} ===")
    
    # Check if we should skip next matches (usually we don't)
    if not ALWAYS_SCRAPE_NEXT_MATCHES and SKIP_EXISTING_SEASONS and not FORCE_RESCRAPE_ALL:
        # Count existing future matches
        current_date = datetime.now().date()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM odds 
                WHERE country = %s AND league = %s AND date >= %s
            """, (league.country, league.league_name, current_date))
            future_matches = cur.fetchone()[0]
        
        if future_matches > 50:  # Arbitrary threshold for "enough" future matches
            print(f"⏭️  SKIPPING next matches - already has {future_matches} future matches")
            return
    
    go_to_url(driver, url)
    # Next-matches pages often aren't paginated; if they are, logic can be extended similarly.
    rows = collect_rows_on_page_dynamic_season(driver, league, page_num=1)
    insert_rows(conn, build_insert_values(rows))

def print_scraping_summary(conn):
    """Print a summary of what data already exists and what will be scraped"""
    print("\n" + "="*80)
    print("🚀 SCRAPING SUMMARY")
    print("="*80)
    print(f"📋 Configuration:")
    print(f"   • Skip existing seasons: {SKIP_EXISTING_SEASONS}")
    print(f"   • Force rescrape all: {FORCE_RESCRAPE_ALL}")
    print(f"   • Min matches for complete season: {MIN_MATCHES_COMPLETE}")
    print(f"   • Always scrape next matches: {ALWAYS_SCRAPE_NEXT_MATCHES}")
    print(f"   • Scrape results: {SCRAPE_RESULTS}")
    print(f"   • Scrape next: {SCRAPE_NEXT}")
    
    total_existing_matches = 0
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM odds")
        total_existing_matches = cur.fetchone()[0]
    
    print(f"\n📊 Current database status:")
    print(f"   • Total matches in database: {total_existing_matches:,}")
    
    if total_existing_matches > 0:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT country, league, COUNT(*) as match_count, MIN(date) as earliest, MAX(date) as latest
                FROM odds 
                GROUP BY country, league 
                ORDER BY country, league
            """)
            print(f"   • Breakdown by league:")
            for row in cur.fetchall():
                country, league, count, earliest, latest = row
                print(f"     - {country.title()} {league}: {count:,} matches ({earliest} to {latest})")
    
    print("="*80)

def main(headless=True):
    conn = psycopg.connect(**DB_CONFIG)
    driver = None
    try:
        # Show summary before starting
        print_scraping_summary(conn)
        
        driver = make_driver(headless=headless)
        for lg in LEAGUES:
            if SCRAPE_RESULTS:
                scrape_results_for_league(conn, driver, lg)
            if SCRAPE_NEXT:
                scrape_next_for_league(conn, driver, lg)
    finally:
        if driver:
            try:
                # Properly close the driver
                driver.quit()
                # Small delay to ensure cleanup completes before garbage collection
                time.sleep(0.2)
            except (OSError, Exception) as e:
                # Ignore "handle is invalid" errors during cleanup
                # This is a known issue with undetected-chromedriver on Windows
                error_msg = str(e).lower()
                if "handle is invalid" not in error_msg and "winerror 6" not in error_msg:
                    print(f"⚠️ Warning during driver cleanup: {e}")
                pass
        try: 
            conn.close()
        except Exception: 
            pass

if __name__ == "__main__":
    # Set headless=False to see the browser window for debugging
    # Set headless=True for normal automated operation
    DEBUG_MODE = False  # Change to True to see what's happening in browser
    main(headless=not DEBUG_MODE)
