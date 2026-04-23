import { clientInfo, getSSOToken } from 'https://esm.sh/@seatalk/web-app-sdk';

document.addEventListener('DOMContentLoaded', async () => {
  // --- 🌟 啟動 Rolldate 日期滾輪 ---
  new Rolldate({
    el: '#startTime',
    format: 'YYYY-MM-DD hh:mm', // 顯示格式
    beginYear: 2024,
    endYear: 2030,
    minStep: 30, // 🌟 這裡就是限制分鐘只能選 00 或 30 的關鍵！
    lang: {
      title: '選擇時間',
      cancel: '取消',
      confirm: '完成'
    }
  });

  new Rolldate({
    el: '#endTime',
    format: 'YYYY-MM-DD hh:mm',
    beginYear: 2024,
    endYear: 2030,
    minStep: 30, // 🌟 一樣限制 30 分鐘
    lang: {
      title: '選擇時間',
      cancel: '取消',
      confirm: '完成'
    }
  });
  // --- 滾輪設定結束 ---
  // --- 抓取新版 HTML 的 DOM 元素 ---
  const loadingScreen = document.getElementById('loadingScreen');
  const mainContent = document.getElementById('mainContent');
  
  // 個人資料卡片的元素
  const userNameEl = document.getElementById('userName');
  const userEmailEl = document.getElementById('userEmail');
  const employeeIdEl = document.getElementById('employeeId');
  
  const form = document.getElementById('leaveForm');
  
  // 表單中用來送出的隱藏欄位
  const nameHiddenInput = document.getElementById('name');
  const emailHiddenInput = document.getElementById('email');

  const VERIFY_SSO_API = 'https://rr-leave-system.onrender.com/api/verify-sso';
  const LEAVE_REQUEST_API = 'https://rr-leave-system.onrender.com/api/leave-request';

  // --- 刪除原本的 Debug log 函式，因為我們要用正式的 UX ---

  async function loadUserInfo() {
    // 🌟 Step 1: 確保 Loading 畫面是顯示的，主內容是隱藏的
    loadingScreen.style.display = 'flex';
    mainContent.style.display = 'none';

    // 檢查 SeaTalk 環境 (保留原本邏輯)
    if (!clientInfo || clientInfo.app !== 'SeaTalk') {
      // 在個人資料卡顯示錯誤狀態，並隱藏 Loading
      loadingScreen.style.display = 'none';
      mainContent.style.display = 'block';
      userNameEl.textContent = '❌ 請在 SeaTalk 內開啟';
      userNameEl.style.color = 'red';
      return;
    }

    getSSOToken({
      onSuccess: async (token) => {
        try {
          const resp = await fetch(VERIFY_SSO_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });

          if (resp.status !== 200) throw new Error('驗證失敗');

          const data = await resp.json();

          if (data.code === 0 && data.profile) {
            // 🌟 核心修改：填入精緻個人資料卡片 (仿影片 UX)
            userNameEl.textContent = data.profile.name || '未知使用者';
            userEmailEl.textContent = data.profile.email || '';
            
            // 下面這兩項（大頭貼和員工編號）需要你的後端配合回傳正確欄位。
            // 假設你的後端回傳 data.profile.avatar_url 和 data.profile.employee_id。
            // 如果後端沒這兩項，我也寫了預設值，不會崩潰。
            employeeIdEl.textContent = data.profile.employee_id ? `員工編號: ${data.profile.employee_id}` : '';

            // 同時填入表單的隱藏欄位，確保送出時有姓名和 Email
            nameHiddenInput.value = data.profile.name || '';
            emailHiddenInput.value = data.profile.email || '';

            // 🌟 Step 2: 成功後，隱藏 Loading 畫面，顯示主內容
            loadingScreen.style.display = 'none';
            mainContent.style.display = 'block';

          } else {
            throw new Error('資料不完全');
          }
        } catch (err) {
          console.error(err);
          loadingScreen.style.display = 'none';
          mainContent.style.display = 'block';
          userNameEl.textContent = '❌ 驗證使用者失敗';
          userNameEl.style.color = 'red';
        }
      },
      onError: (err) => {
        console.error(err);
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';
        userNameEl.textContent = '❌ 取得 SSO token 失敗';
        userNameEl.style.color = 'red';
      },
    });
  }

  // 表單送出邏輯 (保留原本邏輯，只調整提示 UX)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      // 這裡抓取隱藏欄位的值
      name: nameHiddenInput.value,
      email: emailHiddenInput.value,
      leaveType: document.getElementById('leaveType').value,
      startTime: document.getElementById('startTime').value,
      endTime: document.getElementById('endTime').value,
      reason: document.getElementById('reason').value,
      proxy: document.getElementById('proxy').value,
    };

    // 按鈕顯示「送出中...」
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '送出中...';
    submitBtn.disabled = true;

    try {
      const resp = await fetch(LEAVE_REQUEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (data.code === 0) {
        alert('✅ 請假申請已成功送出！');
        form.reset();
        loadUserInfo(); // 重新載入，保持 readonly 狀態
      } else {
        alert('❌ 送出失敗: ' + (data.msg || '未知錯誤'));
      }
    } catch (err) {
      console.error(err);
      alert('❌ 網路錯誤，送出失敗');
    } finally {
      // 復原按鈕狀態
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  loadUserInfo();
});
