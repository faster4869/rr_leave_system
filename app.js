import { clientInfo, getSSOToken, toast } from 'https://cdn.example.com/@seatalk/web-app-sdk.js';

const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const form = document.getElementById('leaveForm');

async function loadUserInfo() {
  if (clientInfo.app !== 'SeaTalk') {
    alert('請在 SeaTalk 內開啟此頁面');
    return;
  }

  getSSOToken({
    onSuccess: async (token) => {
      try {
        const resp = await fetch('/api/verify-sso', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await resp.json();

        if (data.code === 0 && data.profile) {
          nameInput.value = data.profile.name || '';
          emailInput.value = data.profile.email || '';
        } else {
          alert('無法取得使用者資訊');
        }
      } catch (err) {
        console.error(err);
        alert('驗證使用者失敗');
      }
    },
    onError: () => {
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

  try {
    const resp = await fetch('/api/leave-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (data.code === 0) {
      toast({ message: '請假申請已送出' });
      form.reset();
      loadUserInfo();
    } else {
      alert('送出失敗');
    }
  } catch (err) {
    console.error(err);
    alert('送出失敗');
  }
});

loadUserInfo();
