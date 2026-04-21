import { clientInfo, getSSOToken } from 'https://esm.sh/@seatalk/web-app-sdk';
document.addEventListener('DOMContentLoaded', async () => {
  const debugEl = document.getElementById('debug');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const form = document.getElementById('leaveForm');

  const VERIFY_SSO_API = 'https://rr-leave-system.onrender.com/api/verify-sso';
  const LEAVE_REQUEST_API = 'https://rr-leave-system.onrender.com/api/leave-request';

  function log(msg) {
    if (debugEl) {
      debugEl.textContent += msg + '\n';
    }
  }

  function getSeaTalkSDK() {
    if (window.SeaTalkWebSDK) return window.SeaTalkWebSDK;
    if (window.seatalkWebSDK) return window.seatalkWebSDK;
    if (window.SeaTalkSDK) return window.SeaTalkSDK;
    return null;
  }

  async function loadUserInfo() {
    log('1. 開始載入使用者資訊');

    const sdk = getSeaTalkSDK();
    if (!sdk) {
      log('❌ SeaTalk SDK 沒有載入成功');
      alert('SeaTalk SDK 沒載入成功');
      return;
    }

    log('2. SDK 已載入');

    const { clientInfo, getSSOToken } = sdk;

    if (!clientInfo) {
      log('❌ clientInfo 不存在');
      alert('無法讀取 SeaTalk 環境資訊');
      return;
    }

    log(`3. clientInfo.app = ${clientInfo.app}`);

    if (clientInfo.app !== 'SeaTalk') {
      log('❌ 這不是在 SeaTalk 內開啟');
      alert('請在 SeaTalk 內開啟此頁面');
      return;
    }

    log('4. 開始取得 SSO token');

    getSSOToken({
      onSuccess: async (token) => {
        log('5. 成功取得 SSO token');

        try {
          const resp = await fetch(VERIFY_SSO_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          log(`6. verify-sso 回應狀態: ${resp.status}`);

          const data = await resp.json();

          if (data.code === 0 && data.profile) {
            log(`7. 成功取得資料: ${data.profile.email}`);
            nameInput.value = data.profile.name || '';
            emailInput.value = data.profile.email || '';
          } else {
            log('❌ verify-sso 回傳失敗');
            log(JSON.stringify(data, null, 2));
            alert('無法取得使用者資訊');
          }
        } catch (err) {
          log('❌ verify-sso 呼叫失敗');
          log(String(err));
          alert('驗證使用者失敗');
        }
      },
      onError: (err) => {
        log('❌ getSSOToken 失敗');
        log(String(err));
        alert('取得 SSO token 失敗');
      },
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: nameInput.value,
      email: emailInput.value,
      leaveType: document.getElementById('leaveType').value,
      startTime: document.getElementById('startTime').value,
      endTime: document.getElementById('endTime').value,
      reason: document.getElementById('reason').value,
      proxy: document.getElementById('proxy').value,
    };

    log('8. 開始送出請假單');

    try {
      const resp = await fetch(LEAVE_REQUEST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      log(`9. leave-request 回應狀態: ${resp.status}`);

      const data = await resp.json();

      if (data.code === 0) {
        log('10. 請假單送出成功');
        alert('請假申請已送出');
        form.reset();
        loadUserInfo();
      } else {
        log('❌ 請假單送出失敗');
        log(JSON.stringify(data, null, 2));
        alert('送出失敗');
      }
    } catch (err) {
      log('❌ leave-request 呼叫失敗');
      log(String(err));
      alert('送出失敗');
    }
  });

  loadUserInfo();
});
