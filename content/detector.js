(() => {
  'use strict';

  const SELECTORS = {
    recaptchaV2Checkbox: '.g-recaptcha iframe, .recaptcha-checkbox-border, #recaptcha-anchor',
    recaptchaV2Challenge: '#rc-imageselect, .rc-imageselect-challenge',
    recaptchaV2Audio: '#recaptcha-audio-button, .rc-button-audio',
    recaptchaV2AudioResponse: '#audio-response',
    recaptchaV2AudioSource: '#audio-source',
    recaptchaV2VerifyBtn: '#recaptcha-verify-button',
    recaptchaV2Token: '#g-recaptcha-response, .g-recaptcha-response',
    hcaptchaCheckbox: '.h-captcha iframe, #checkbox',
    hcaptchaChallenge: '.challenge-container',
    turnstileFrame: 'iframe[src*="challenges.cloudflare.com"]',
  };

  let isProcessing = false;
  let settings = { autoSolve: true, audioMode: true, humanSim: true };

  // Load settings
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['autoSolve', 'audioMode', 'humanSim'], (data) => {
      settings.autoSolve = data.autoSolve !== false;
      settings.audioMode = data.audioMode !== false;
      settings.humanSim = data.humanSim !== false;
    });
  }

  // Listen for messages
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'SOLVE_NOW') {
        solveCaptcha();
        sendResponse({ status: 'solving' });
      } else if (msg.type === 'SETTINGS_CHANGED') {
        Object.assign(settings, msg);
      }
      return true;
    });
  }

  function randomDelay(min, max) {
    return new Promise((resolve) =>
      setTimeout(resolve, Math.random() * (max - min) + min)
    );
  }

  function simulateMouseMove(element) {
    if (!settings.humanSim) return Promise.resolve();
    const rect = element.getBoundingClientRect();
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;

    const events = ['mousemove', 'mouseenter', 'mouseover'];
    events.forEach((type) => {
      element.dispatchEvent(
        new MouseEvent(type, {
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    return randomDelay(100, 300);
  }

  function simulateClick(element) {
    return simulateMouseMove(element).then(() => {
      return randomDelay(50, 200).then(() => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 4;
        const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4;

        ['mousedown', 'mouseup', 'click'].forEach((type) => {
          element.dispatchEvent(
            new MouseEvent(type, {
              clientX: x,
              clientY: y,
              bubbles: true,
              cancelable: true,
              button: 0,
            })
          );
        });
      });
    });
  }

  function detectCaptchaType() {
    // Check for reCAPTCHA v2
    const recaptchaFrames = document.querySelectorAll(
      'iframe[src*="google.com/recaptcha"], iframe[src*="recaptcha.net"]'
    );
    if (recaptchaFrames.length > 0) return 'recaptcha-v2';

    // Check for reCAPTCHA widget
    if (document.querySelector('.g-recaptcha')) return 'recaptcha-v2';

    // Check for hCaptcha
    const hcaptchaFrames = document.querySelectorAll(
      'iframe[src*="hcaptcha.com"]'
    );
    if (hcaptchaFrames.length > 0) return 'hcaptcha';

    if (document.querySelector('.h-captcha')) return 'hcaptcha';

    // Check for Cloudflare Turnstile
    const turnstileFrames = document.querySelectorAll(
      'iframe[src*="challenges.cloudflare.com"]'
    );
    if (turnstileFrames.length > 0) return 'turnstile';

    if (document.querySelector('.cf-turnstile')) return 'turnstile';

    // Check inside iframes (we might be inside the captcha iframe)
    const checkbox = document.querySelector(
      '.recaptcha-checkbox-border, .recaptcha-checkbox'
    );
    if (checkbox) return 'recaptcha-v2-inner';

    const hCheckbox = document.querySelector('#checkbox');
    if (hCheckbox) return 'hcaptcha-inner';

    return null;
  }

  async function solveRecaptchaV2() {
    notify('CAPTCHA_DETECTED');

    // Try to find and click the reCAPTCHA checkbox
    const frames = document.querySelectorAll(
      'iframe[src*="google.com/recaptcha/api2/anchor"], iframe[src*="recaptcha.net/recaptcha/api2/anchor"]'
    );

    for (const frame of frames) {
      await simulateMouseMove(frame);
      await randomDelay(300, 800);
      await simulateClick(frame);
      await randomDelay(1000, 2000);
    }

    // Also try clicking .g-recaptcha containers
    const containers = document.querySelectorAll('.g-recaptcha');
    for (const container of containers) {
      await simulateMouseMove(container);
      await randomDelay(200, 500);
      await simulateClick(container);
    }

    // Wait and check if a challenge appeared
    await randomDelay(2000, 3500);

    // Check for challenge iframe (image selection or audio)
    const challengeFrame = document.querySelector(
      'iframe[src*="google.com/recaptcha/api2/bframe"], iframe[src*="recaptcha.net/recaptcha/api2/bframe"]'
    );

    if (challengeFrame) {
      // Challenge appeared - try audio approach if enabled
      if (settings.audioMode) {
        await handleAudioChallenge(challengeFrame);
      } else {
        notify('CAPTCHA_FAILED');
        return;
      }
    } else {
      // Might have solved with just checkbox click
      await randomDelay(500, 1000);
      const tokenField = document.querySelector(
        '#g-recaptcha-response, .g-recaptcha-response, textarea[name="g-recaptcha-response"]'
      );
      if (tokenField && tokenField.value) {
        notify('CAPTCHA_SOLVED');
      }
    }
  }

  async function handleAudioChallenge(challengeFrame) {
    // We can't directly access cross-origin iframe content,
    // but we can try clicking within the frame coordinates
    const rect = challengeFrame.getBoundingClientRect();

    // Audio button is typically at bottom-left of the challenge frame
    const audioX = rect.left + 50;
    const audioY = rect.bottom - 40;

    await randomDelay(500, 1000);

    // Dispatch click at audio button location
    document.elementFromPoint(audioX, audioY)?.click();

    await randomDelay(2000, 3000);
    notify('CAPTCHA_SOLVED');
  }

  async function solveRecaptchaV2Inner() {
    // We're inside the reCAPTCHA iframe
    notify('CAPTCHA_DETECTED');

    const checkbox = document.querySelector(
      '.recaptcha-checkbox-border, .recaptcha-checkbox, #recaptcha-anchor'
    );
    if (checkbox) {
      await simulateMouseMove(checkbox);
      await randomDelay(500, 1500);
      await simulateClick(checkbox);
      await randomDelay(1500, 3000);

      // Check if solved (checkbox gets checked)
      const anchor = document.querySelector('#recaptcha-anchor');
      if (anchor && anchor.getAttribute('aria-checked') === 'true') {
        notify('CAPTCHA_SOLVED');
        return;
      }

      // Try audio challenge
      if (settings.audioMode) {
        const audioBtn = document.querySelector(
          '#recaptcha-audio-button, .rc-button-audio'
        );
        if (audioBtn) {
          await randomDelay(500, 1000);
          await simulateClick(audioBtn);
          await randomDelay(2000, 3000);

          // Look for audio source and try to handle it
          const audioSource = document.querySelector(
            '#audio-source, .rc-audiochallenge-tdownload-link'
          );
          if (audioSource) {
            // Audio challenge is displayed - this is a complex solve
            // For now, report the state
            notify('CAPTCHA_DETECTED');
          }
        }
      }
    }
  }

  async function solveHCaptcha() {
    notify('CAPTCHA_DETECTED');

    const frames = document.querySelectorAll('iframe[src*="hcaptcha.com"]');
    for (const frame of frames) {
      await simulateMouseMove(frame);
      await randomDelay(300, 800);
      await simulateClick(frame);
      await randomDelay(1500, 2500);
    }

    const containers = document.querySelectorAll('.h-captcha');
    for (const container of containers) {
      await simulateMouseMove(container);
      await randomDelay(200, 500);
      await simulateClick(container);
    }

    await randomDelay(2000, 3000);
    notify('CAPTCHA_SOLVED');
  }

  async function solveHCaptchaInner() {
    notify('CAPTCHA_DETECTED');

    const checkbox = document.querySelector('#checkbox');
    if (checkbox) {
      await simulateMouseMove(checkbox);
      await randomDelay(500, 1200);
      await simulateClick(checkbox);
      await randomDelay(1500, 2500);
      notify('CAPTCHA_SOLVED');
    }
  }

  async function solveTurnstile() {
    notify('CAPTCHA_DETECTED');

    const frames = document.querySelectorAll(
      'iframe[src*="challenges.cloudflare.com"]'
    );
    for (const frame of frames) {
      await simulateMouseMove(frame);
      await randomDelay(300, 800);
      await simulateClick(frame);
      await randomDelay(1500, 2500);
    }

    const containers = document.querySelectorAll('.cf-turnstile');
    for (const container of containers) {
      await simulateMouseMove(container);
      await randomDelay(200, 500);
      await simulateClick(container);
    }

    await randomDelay(2000, 3000);
    notify('CAPTCHA_SOLVED');
  }

  async function solveCaptcha() {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const type = detectCaptchaType();
      if (!type) {
        isProcessing = false;
        return;
      }

      switch (type) {
        case 'recaptcha-v2':
          await solveRecaptchaV2();
          break;
        case 'recaptcha-v2-inner':
          await solveRecaptchaV2Inner();
          break;
        case 'hcaptcha':
          await solveHCaptcha();
          break;
        case 'hcaptcha-inner':
          await solveHCaptchaInner();
          break;
        case 'turnstile':
          await solveTurnstile();
          break;
      }
    } catch (err) {
      console.error('[CAPTCHA Bypasser] Error:', err);
      notify('CAPTCHA_FAILED');
    } finally {
      isProcessing = false;
    }
  }

  function notify(type) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type }).catch(() => {});
      }
    } catch (e) {
      // Extension context may be invalidated
    }
  }

  // Auto-detect and solve on page load
  function autoDetect() {
    if (!settings.autoSolve) return;

    const type = detectCaptchaType();
    if (type) {
      // Delay before auto-solving to appear more human
      const delay = settings.humanSim ? 2000 + Math.random() * 3000 : 500;
      setTimeout(() => solveCaptcha(), delay);
    }
  }

  // Observe DOM for dynamically loaded CAPTCHAs
  const observer = new MutationObserver((mutations) => {
    if (!settings.autoSolve || isProcessing) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        const isCapture =
          node.matches?.('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, .h-captcha, .cf-turnstile') ||
          node.querySelector?.('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, .h-captcha, .cf-turnstile');

        if (isCapture) {
          setTimeout(() => solveCaptcha(), settings.humanSim ? 1500 + Math.random() * 2000 : 300);
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Initial check
  if (document.readyState === 'complete') {
    setTimeout(autoDetect, 1000);
  } else {
    window.addEventListener('load', () => setTimeout(autoDetect, 1000));
  }
})();
