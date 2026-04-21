document.addEventListener('DOMContentLoaded', async () => {
  console.log('page loaded');

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const form = document.getElementById('leaveForm');

  const VERIFY_SSO_API = 'https://rr-leave-system.onrender.com/api/verify-sso';
  const LEAVE_REQUEST_API = 'https://rr-leave-system.onrender.com/api/leave-request';

  function getSeaTalkSDK() {
    // 先嘗試從 window 拿
    if (window.SeaTalkWebSDK) return window.SeaTalkWebSDK;
    if (window.seatalkWebSDK) return window.seatalkWebSDK;
    if (window.SeaTalkSDK) return window.SeaTalkSDK;

    return null;
  }

  async function loadUserInfo() {
    console.log('loadUserInfo called');

    const sdk = getSeaTalkSDK();
    console.log('sdk =', sdk);

    if (!sdk) {
      alert('SeaTalk SDK 沒載入成功');
      return;
    }

    const { clientInfo, getSSOToken } = sdk;

    console.log('clientInfo =', clientInfo);

    if (!clientInfo || clientInfo.app !== 'SeaTalk') {
      alert('請在 SeaTalk 內開啟此頁面');
      return;
    }

    console.log('calling getSSOToken...');

    getSSOToken({
      onSuccess: async (token) => {
        console.log('getSSOToken success, token =', token);

        try {
          const resp = await fetch(VERIFY_SSO_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          console.log('verify-sso status =', resp.status);

          const data = await resp.json();
          console.log('verify-sso data =', data);

          if (data.code === 0 && data.profile) {
            nameInput.value = data.profile.name || '';
            emailInput.value = data.profile.email || '';
          } else {
            alert('無法取得使用者資訊');
          }
        } catch (err) {
          console.error('verify-sso error =', err);
          alert('驗證使用者失敗');
        }
      },
      onError: (err) => {
        console.error('getSSOToken error =', err);
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

    console.log('submit payload =', payload);

    try {
      const resp = await fetch(LEAVE_REQUEST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('leave-request status =', resp.status);

      const data = await resp.json();
      console.log('leave-request data =', data);

      if (data.code === 0) {
        alert('請假申請已送出');
        form.reset();
        loadUserInfo();
      } else {
        alert('送出失敗');
      }
    } catch (err) {
      console.error('leave-request error =', err);
      alert('送出失敗');
    }
  });

  loadUserInfo();
});
