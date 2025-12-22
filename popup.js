async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function toOriginPattern(urlString) {
  const url = new URL(urlString);
  return `${url.origin}/*`;
}

async function getAllowedOrigins() {
  const { allowedOrigins = [] } = await chrome.storage.sync.get({ allowedOrigins: [] });
  return Array.isArray(allowedOrigins) ? allowedOrigins : [];
}

async function setAllowedOrigins(allowedOrigins) {
  await chrome.storage.sync.set({ allowedOrigins });
}

function setStatus(msg) {
  const el = document.getElementById('site-status');
  if (el) el.textContent = msg;
}

async function refreshStatus() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url) {
      setStatus('Open a tab to enable ForTex.');
      return;
    }

    const originPattern = toOriginPattern(tab.url);
    const allowed = await getAllowedOrigins();
    const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });

    if (allowed.includes(originPattern) && hasPermission) {
      setStatus(`Enabled on: ${originPattern}`);
    } else {
      setStatus('Not enabled on this site yet.');
    }
  } catch (e) {
    setStatus(e && e.message ? e.message : String(e));
  }
}

async function enableOnThisSite() {
  const tab = await getActiveTab();
  if (!tab || !tab.url || !tab.id) {
    setStatus('Open a normal webpage tab first.');
    return;
  }

  let originPattern;
  try {
    originPattern = toOriginPattern(tab.url);
  } catch {
    setStatus('This page cannot be enabled.');
    return;
  }

  setStatus(`Requesting permission for ${originPattern} ...`);

  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) {
    setStatus('Permission request was canceled.');
    return;
  }

  const allowed = await getAllowedOrigins();
  if (!allowed.includes(originPattern)) {
    allowed.push(originPattern);
    await setAllowedOrigins(allowed);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['quillOverride.js'],
    });
  } catch (_) {
    // ignore
  }

  await refreshStatus();
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

document.addEventListener('DOMContentLoaded', () => {
  const enableBtn = document.getElementById('enable-site');
  const settingsBtn = document.getElementById('open-settings');

  if (enableBtn) enableBtn.addEventListener('click', () => enableOnThisSite());
  if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings());

  refreshStatus();
});
