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

        # --- 第一步：驗證 SSO Token ---
        sso_url = "https://openapi.seatalk.io/sso/v2/verify"
        headers = {
            "Authorization": f"Bearer {app_access_token}",
            "Content-Type": "application/json"
        }
        
        sso_resp = requests.post(sso_url, json={"token": token}, headers=headers, timeout=15)
        sso_resp.raise_for_status()
        sso_data = sso_resp.json()

        if sso_data.get("code") != 0:
            return jsonify(sso_data)

        # 拿到 employee_code 了
        employee_code = sso_data["profile"].get("employee_code")

        # --- 第二步：呼叫 Get Employee Profile 拿大頭貼 ---
        # 根據文件，這支 API 通常是 GET 請求
        profile_url = f"https://openapi.seatalk.io/contact/v2/employee/get?employee_code={employee_code}"
        
        profile_resp = requests.get(profile_url, headers=headers, timeout=15)
        profile_data = profile_resp.json()

        # --- 第三步：整合資料 ---
        # 我們把 profile_data 裡面的大頭貼等資訊塞進原本的 sso_data 回傳給前端
        if profile_data.get("code") == 0:
            employee_info = profile_data.get("employee", {})
            # 把頭像與員工編號補進去
            sso_data["profile"]["avatar"] = employee_info.get("avatar")
            sso_data["profile"]["employee_id"] = employee_info.get("employee_code")
            # 如果有需要其他欄位（如部門），也可以在這裡補

        return jsonify(sso_data)

    except Exception as e:
        print("verify_sso error:", str(e))
        return jsonify({"code": -1, "message": str(e)}), 500


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
