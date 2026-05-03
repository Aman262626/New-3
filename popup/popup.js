document.addEventListener('DOMContentLoaded', () => {
  const autoSolve = document.getElementById('autoSolve');
  const audioMode = document.getElementById('audioMode');
  const humanSim = document.getElementById('humanSim');
  const solveNow = document.getElementById('solveNow');
  const resetBtn = document.getElementById('resetBtn');
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  const solvedCount = document.getElementById('solvedCount');
  const failedCount = document.getElementById('failedCount');
  const successRate = document.getElementById('successRate');

  // Load saved settings
  chrome.storage.local.get(
    ['autoSolve', 'audioMode', 'humanSim', 'solved', 'failed'],
    (data) => {
      autoSolve.checked = data.autoSolve !== false;
      audioMode.checked = data.audioMode !== false;
      humanSim.checked = data.humanSim !== false;
      updateStats(data.solved || 0, data.failed || 0);
    }
  );

  // Save settings on change
  autoSolve.addEventListener('change', () => {
    chrome.storage.local.set({ autoSolve: autoSolve.checked });
    notifyContentScript({ type: 'SETTINGS_CHANGED', autoSolve: autoSolve.checked });
  });

  audioMode.addEventListener('change', () => {
    chrome.storage.local.set({ audioMode: audioMode.checked });
  });

  humanSim.addEventListener('change', () => {
    chrome.storage.local.set({ humanSim: humanSim.checked });
  });

  // Solve Now button
  solveNow.addEventListener('click', async () => {
    setStatus('Solving...', 'solving');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, { type: 'SOLVE_NOW' });
        setStatus('Solve command sent', 'active');
      }
    } catch (err) {
      setStatus('No CAPTCHA found', 'error');
      setTimeout(() => setStatus('Ready', 'active'), 3000);
    }
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.set({ solved: 0, failed: 0 });
    updateStats(0, 0);
    setStatus('Stats reset', 'active');
  });

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CAPTCHA_SOLVED') {
      chrome.storage.local.get(['solved', 'failed'], (data) => {
        const solved = (data.solved || 0) + 1;
        chrome.storage.local.set({ solved });
        updateStats(solved, data.failed || 0);
      });
      setStatus('CAPTCHA Solved!', 'active');
    } else if (msg.type === 'CAPTCHA_FAILED') {
      chrome.storage.local.get(['solved', 'failed'], (data) => {
        const failed = (data.failed || 0) + 1;
        chrome.storage.local.set({ failed });
        updateStats(data.solved || 0, failed);
      });
      setStatus('Solve failed', 'error');
    } else if (msg.type === 'CAPTCHA_DETECTED') {
      setStatus('CAPTCHA detected!', 'solving');
    }
  });

  function setStatus(text, state) {
    statusText.textContent = text;
    statusDot.className = 'status-dot';
    if (state === 'solving') statusDot.classList.add('solving');
    else if (state === 'error') statusDot.classList.add('error');
  }

  function updateStats(solved, failed) {
    solvedCount.textContent = solved;
    failedCount.textContent = failed;
    const total = solved + failed;
    successRate.textContent = total > 0 ? Math.round((solved / total) * 100) + '%' : '0%';
  }

  function notifyContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
      }
    });
  }
});
