// Background service worker for CAPTCHA Bypasser

// Track solved/failed counts and relay messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CAPTCHA_SOLVED') {
    chrome.storage.local.get(['solved'], (data) => {
      chrome.storage.local.set({ solved: (data.solved || 0) + 1 });
    });

    // Show notification badge
    chrome.action.setBadgeText({ text: 'OK', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId: sender.tab?.id });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: sender.tab?.id });
    }, 3000);
  } else if (msg.type === 'CAPTCHA_FAILED') {
    chrome.storage.local.get(['failed'], (data) => {
      chrome.storage.local.set({ failed: (data.failed || 0) + 1 });
    });

    chrome.action.setBadgeText({ text: '!', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId: sender.tab?.id });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: sender.tab?.id });
    }, 3000);
  } else if (msg.type === 'CAPTCHA_DETECTED') {
    chrome.action.setBadgeText({ text: '...', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#eab308', tabId: sender.tab?.id });
  }

  sendResponse({ received: true });
  return true;
});

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    autoSolve: true,
    audioMode: true,
    humanSim: true,
    solved: 0,
    failed: 0,
  });
});
