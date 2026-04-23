import os
import requests
import json # 確保最上面有 import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

APP_ID = os.getenv("SEATALK_APP_ID")
APP_SECRET = os.getenv("SEATALK_APP_SECRET")


def get_app_access_token():
    url = "https://openapi.seatalk.io/auth/app_access_token"
    payload = {
        "app_id": APP_ID,
        "app_secret": APP_SECRET
    }

    resp = requests.post(url, json=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != 0:
        raise Exception(f"get app access token failed: {data}")

    return data["app_access_token"]


@app.route("/api/verify-sso", methods=["POST"])
def verify_sso():
    try:
        body = request.get_json(force=True)
        token = body.get("token")

        if not token:
            return jsonify({"code": -1, "message": "token is required"}), 400

        app_access_token = get_app_access_token()

        url = "https://openapi.seatalk.io/sso/v2/verify"
        payload = {
            "token": token
        }
        headers = {
            "Authorization": f"Bearer {app_access_token}",
            "Content-Type": "application/json"
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        # 🌟 加上這段：把 SeaTalk 回傳的完整資料印到 Render 後台
        print("=== SeaTalk SSO Verify Data ===")
        print(json.dumps(data, indent=2, ensure_ascii=False))
        print("===============================")

        return jsonify(data)

    except Exception as e:
        print("verify_sso error:", str(e))
        return jsonify({
            "code": -1,
            "message": "verify sso failed"
        }), 500


@app.route("/api/leave-request", methods=["POST"])
def leave_request():
    try:
        body = request.get_json(force=True)

        # 這裡先直接印出來，之後你可以改成存資料庫或送審批通知
        print("leave request received:", body)

        return jsonify({
            "code": 0,
            "message": "leave request created"
        })

    except Exception as e:
        print("leave_request error:", str(e))
        return jsonify({
            "code": -1,
            "message": "leave request failed"
        }), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
