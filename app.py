from flask import Flask, request, Response, render_template, g
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import datetime
import os
import logging
import time
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)


def configure_logging():
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    return logging.getLogger('tsun-bancheck')


logger = configure_logging()
try:
    from waitress import serve
except ImportError:
    serve = None

# Configure requests session with retry strategy
def create_retry_session(
    retries=3,
    backoff_factor=0.5,
    status_forcelist=(500, 502, 503, 504),
):
    """
    Create a requests session with automatic retry on failures
    """
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=["GET", "POST"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session


@app.before_request
def start_request_timer():
    g.request_started_at = time.perf_counter()


@app.after_request
def log_request(response):
    if request.path in {'/favicon.ico'} or request.path.startswith('/static/'):
        return response

    started_at = getattr(g, 'request_started_at', None)
    elapsed_ms = ((time.perf_counter() - started_at) * 1000) if started_at else 0.0
    logger.info(f"HTTP  | {request.method} {request.path} -> {response.status_code} ({elapsed_ms:.1f}ms)")
    return response

@app.route('/')
def index():
    return render_template('index.html', active_page='home')

@app.route('/docs')
def docs():
    return render_template('index.html', active_page='docs')



def get_combined_data(uid, ban_key=None):
    # Get BAN_KEY from environment variables
    if ban_key is None:
        ban_key = os.getenv('BAN_KEY', 'saeed')
    
    namecheck_url = f"https://infoxvisits.tsunxkittens.app/info/{uid}"
    bancheck_url = f"https://bancheckapi.tsunstudio.me/bancheck?key={ban_key}&uid={uid}"

    # Initialize default data structure
    combined_data = {
        "nickname": None,
        "uid": uid,
        "AccountLevel": None,
        "region": None,
        "AccountLastLogin": None,
        "status": None,
        "is_banned": None,
        "credits": None,
        "error": None
    }

    # Fetch namecheck data with error handling and retry
    session = create_retry_session()
    
    try:
        # Add multiple retry attempts for DNS issues
        max_attempts = 3
        namecheck_response = None
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"NAMECHECK | attempt {attempt + 1}/{max_attempts} | uid={uid}")
                namecheck_response = session.get(
                    namecheck_url, 
                    timeout=15,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    }
                )
                namecheck_response.raise_for_status()
                if os.getenv('LOG_RAW_RESPONSES', '0') == '1':
                    logger.info(f"NAMECHECK | response | {namecheck_response.text[:200]}...")
                break
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"NAMECHECK | connection error | attempt={attempt + 1} | {str(e)}")
                if attempt < max_attempts - 1:
                    time.sleep(1 * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    raise
        
        if namecheck_response is None:
            raise requests.exceptions.ConnectionError("Failed to connect after all retries")
            
        namecheck_data = namecheck_response.json()
        
        # Extract account info
        combined_data["nickname"] = namecheck_data.get("AccountInfo", {}).get("AccountName")
        combined_data["uid"] = namecheck_data.get("SocialInfo", {}).get("accountId") or uid
        combined_data["AccountLevel"] = namecheck_data.get("AccountInfo", {}).get("AccountLevel")
        combined_data["region"] = namecheck_data.get("AccountInfo", {}).get("AccountRegion")
        combined_data["AccountLastLogin"] = namecheck_data.get("AccountInfo", {}).get("AccountLastLogin")
        
    except requests.exceptions.Timeout:
        logger.warning(f"NAMECHECK | timeout | uid={uid}")
        combined_data["error"] = "Namecheck API request timed out"
    except requests.exceptions.ConnectionError as e:
        logger.warning(f"NAMECHECK | connection error | uid={uid} | {str(e)}")
        combined_data["error"] = "Failed to connect to namecheck API. Please check the URL or try again later."
    except requests.exceptions.HTTPError as e:
        logger.warning(f"NAMECHECK | http error | uid={uid} | status={e.response.status_code}")
        combined_data["error"] = f"Namecheck API returned error: {e.response.status_code}"
    except ValueError as e:
        logger.warning(f"NAMECHECK | json parse error | uid={uid} | {str(e)}")
        combined_data["error"] = "Failed to parse namecheck API response"
    except Exception as e:
        logger.error(f"NAMECHECK | unexpected error | uid={uid} | {str(e)}")
        combined_data["error"] = f"Unexpected error with namecheck API: {str(e)}"

    # Fetch bancheck data with error handling and retry
    try:
        # Add multiple retry attempts for DNS issues
        max_attempts = 3
        bancheck_response = None
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"BANCHECK  | attempt {attempt + 1}/{max_attempts} | uid={uid}")
                bancheck_response = session.get(
                    bancheck_url, 
                    timeout=15,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    }
                )
                bancheck_response.raise_for_status()
                if os.getenv('LOG_RAW_RESPONSES', '0') == '1':
                    logger.info(f"BANCHECK  | response | {bancheck_response.text[:200]}...")
                break
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"BANCHECK  | connection error | attempt={attempt + 1} | {str(e)}")
                if attempt < max_attempts - 1:
                    time.sleep(1 * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    raise
        
        if bancheck_response is None:
            raise requests.exceptions.ConnectionError("Failed to connect after all retries")
            
        bancheck_data = bancheck_response.json()
        
        # Extract ban info
        combined_data["status"] = bancheck_data.get("status")
        combined_data["is_banned"] = bancheck_data.get("is_banned")
        combined_data["credits"] = bancheck_data.get("credits")
        
    except requests.exceptions.Timeout:
        logger.warning(f"BANCHECK  | timeout | uid={uid}")
        if combined_data["error"]:
            combined_data["error"] += " | Bancheck API request timed out"
        else:
            combined_data["error"] = "Bancheck API request timed out"
    except requests.exceptions.ConnectionError as e:
        logger.warning(f"BANCHECK  | connection error | uid={uid} | {str(e)}")
        if combined_data["error"]:
            combined_data["error"] += " | Failed to connect to bancheck API"
        else:
            combined_data["error"] = "Failed to connect to bancheck API"
    except requests.exceptions.HTTPError as e:
        logger.warning(f"BANCHECK  | http error | uid={uid} | status={e.response.status_code}")
        if combined_data["error"]:
            combined_data["error"] += f" | Bancheck API error: {e.response.status_code}"
        else:
            combined_data["error"] = f"Bancheck API returned error: {e.response.status_code}"
    except ValueError as e:
        logger.warning(f"BANCHECK  | json parse error | uid={uid} | {str(e)}")
        if combined_data["error"]:
            combined_data["error"] += " | Failed to parse bancheck API response"
        else:
            combined_data["error"] = "Failed to parse bancheck API response"
    except Exception as e:
        logger.error(f"BANCHECK  | unexpected error | uid={uid} | {str(e)}")
        if combined_data["error"]:
            combined_data["error"] += f" | Unexpected bancheck error: {str(e)}"
        else:
            combined_data["error"] = f"Unexpected error with bancheck API: {str(e)}"
    
    if combined_data["AccountLastLogin"]:
        try:
            # Try to parse as timestamp first (integer)
            timestamp = int(combined_data["AccountLastLogin"])
            last_login_date = datetime.datetime.fromtimestamp(timestamp)
        except (ValueError, TypeError):
            # If not a timestamp, parse as date string format: "YYYY-MM-DD HH:MM:SS TZ"
            try:
                # Remove timezone suffix (e.g., " PKT") and parse
                date_str = combined_data["AccountLastLogin"].rsplit(' ', 1)[0]
                last_login_date = datetime.datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
            except:
                # If parsing fails, skip date calculations
                last_login_date = None
        
        if last_login_date:
            combined_data["AccountLastLogin"] = last_login_date.strftime('%Y-%m-%d')

            today = datetime.datetime.now()
            diff = today - last_login_date
            
            total_seconds = diff.total_seconds()
            
            # Handle different time ranges
            if total_seconds < 0:
                # Future date (shouldn't happen, but handle it)
                combined_data["Last_Login"] = "Just now"
            elif total_seconds < 60:
                # Less than a minute
                combined_data["Last_Login"] = "Just now"
            elif total_seconds < 3600:
                # Less than an hour - show minutes
                minutes = int(total_seconds // 60)
                combined_data["Last_Login"] = f"{minutes} Minute{'s' if minutes != 1 else ''} Ago"
            elif total_seconds < 86400:
                # Less than a day - show hours
                hours = int(total_seconds // 3600)
                combined_data["Last_Login"] = f"{hours} Hour{'s' if hours != 1 else ''} Ago"
            elif diff.days < 30:
                # Less than a month - show days
                combined_data["Last_Login"] = f"{diff.days} Day{'s' if diff.days != 1 else ''} Ago"
            elif diff.days < 365:
                # Less than a year - show months and days
                months = diff.days // 30
                days = diff.days % 30
                combined_data["Last_Login"] = f"{months} Month{'s' if months != 1 else ''} And {days} Day{'s' if days != 1 else ''} Ago"
            else:
                # More than a year - show years, months, and days
                years = diff.days // 365
                remaining_days = diff.days % 365
                months = remaining_days // 30
                days = remaining_days % 30
                combined_data["Last_Login"] = f"{years} Year{'s' if years != 1 else ''} {months} Month{'s' if months != 1 else ''} And {days} Day{'s' if days != 1 else ''} Ago"

    return combined_data

@app.route('/bancheck', methods=['GET'])
def bancheck():
    uid = request.args.get('uid')
    if not uid:
        return Response(json.dumps({"error": "UID is required"}, indent=2, sort_keys=False), mimetype='application/json'), 400
    
    # Validate UID format (should be numeric)
    if not uid.isdigit():
        return Response(json.dumps({"error": "Invalid UID format. UID must be numeric."}, indent=2, sort_keys=False), mimetype='application/json'), 400
    
    # Get BAN_KEY from environment variables
    ban_key = os.getenv('BAN_KEY', 'none')

    try:
        result = get_combined_data(uid, ban_key)
        
        # If there's an error in the result, return 503 (Service Unavailable)
        if result.get("error"):
            return Response(json.dumps(result, indent=2, sort_keys=False), mimetype='application/json'), 503
        
        return Response(json.dumps(result, indent=2, sort_keys=False), mimetype='application/json')
    except Exception as e:
        logger.error(f"HTTP     | /bancheck unexpected error | uid={uid} | {str(e)}")
        error_response = {
            "error": f"Internal server error: {str(e)}",
            "uid": uid
        }
        return Response(json.dumps(error_response, indent=2, sort_keys=False), mimetype='application/json'), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    logger.info(f"TSun BanCheck ready | http://127.0.0.1:{port}")

    if serve is not None:
        serve(app, host='0.0.0.0', port=port, threads=int(os.getenv('WEB_CONCURRENCY', '8')))
    else:
        app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False, threaded=True)
