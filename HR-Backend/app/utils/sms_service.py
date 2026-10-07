import os
import urllib.request
import urllib.parse
import json
import base64

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─── SMS Provider Configuration ──────────────────────────────────────────────
# Supported providers: "fast2sms", "twilio", "none"
# Set SMS_PROVIDER in .env to choose which one to use
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "none").strip().lower()

# Fast2SMS Config
FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

# Twilio Config
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")  # e.g. +1234567890


def send_sms_otp(phone_number: str, otp_code: str) -> dict:
    """
    Send OTP SMS to the given phone number.
    Automatically picks the provider based on SMS_PROVIDER env var.
    Falls back to dev/mock mode if no provider is configured.
    """
    clean_phone = "".join(c for c in str(phone_number) if c.isdigit())[-10:]

    if SMS_PROVIDER == "twilio" and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        return _send_via_twilio(clean_phone, otp_code)
    elif SMS_PROVIDER == "fast2sms" and FAST2SMS_API_KEY:
        return _send_via_fast2sms(clean_phone, otp_code)
    else:
        print(f"📱 [SMS Dev Mode] No SMS provider configured. OTP for {clean_phone}: {otp_code}")
        return {
            "success": True,
            "mode": "dev_mock",
            "message": f"Dev mode: OTP is {otp_code}"
        }


# ─── Twilio SMS Provider ─────────────────────────────────────────────────────
def _send_via_twilio(phone: str, otp_code: str) -> dict:
    """
    Send SMS using Twilio REST API.
    Free trial: $15.50 credits, send to verified numbers only.
    Sign up at: https://www.twilio.com/try-twilio
    """
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"

        # Indian phone number with country code
        to_number = f"+91{phone}"
        message_body = f"Your HRMS verification code is: {otp_code}. Valid for 10 minutes. Do not share."

        data = urllib.parse.urlencode({
            "To": to_number,
            "From": TWILIO_PHONE_NUMBER,
            "Body": message_body
        }).encode("utf-8")

        # Twilio uses HTTP Basic Auth
        credentials = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
        headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            print(f"📱 [Twilio SMS] Sent to {to_number} | SID: {res_data.get('sid', 'N/A')}")
            return {
                "success": True,
                "mode": "live_sms",
                "message": f"OTP sent to {to_number}"
            }

    except Exception as e:
        error_msg = str(e)
        # Try to read HTTP error body for better debugging
        if hasattr(e, 'read'):
            try:
                error_msg = e.read().decode("utf-8")
            except Exception:
                pass
        print(f"❌ [Twilio Error] {error_msg}")
        return {"success": False, "mode": "failed", "error": error_msg}


# ─── Fast2SMS Provider ───────────────────────────────────────────────────────
def _send_via_fast2sms(phone: str, otp_code: str) -> dict:
    """
    Send OTP using Fast2SMS OTP route.
    Requires website verification or DLT registration on fast2sms.com.
    """
    try:
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": FAST2SMS_API_KEY.strip(),
            "Content-Type": "application/json"
        }
        payload = {
            "variables_values": otp_code,
            "route": "otp",
            "numbers": phone
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            print(f"📱 [Fast2SMS] Response: {res_data}")
            return {
                "success": res_data.get("return", False),
                "mode": "live_sms",
                "message": res_data.get("message", ["SMS sent"])
            }

    except Exception as e:
        error_msg = str(e)
        if hasattr(e, 'read'):
            try:
                error_msg = e.read().decode("utf-8")
            except Exception:
                pass
        print(f"❌ [Fast2SMS Error] {error_msg}")
        return {"success": False, "mode": "failed", "error": error_msg}
