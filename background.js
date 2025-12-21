async function getAllowedOrigins() {
  const { allowedOrigins = [] } = await chrome.storage.sync.get({ allowedOrigins: [] });
  return Array.isArray(allowedOrigins) ? allowedOrigins : [];
}

async function shouldRunOnUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return { ok: false };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false };

  const originPattern = `${url.origin}/*`;
  const allowed = await getAllowedOrigins();
  if (!allowed.includes(originPattern)) return { ok: false, originPattern };

  const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
  if (!hasPermission) return { ok: false, originPattern };

  return { ok: true, originPattern };
}

async function injectForTex(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['quillOverride.js'],
    });
  } catch (_) {
    // Ignore injection failures (e.g., restricted pages, navigation races)
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab || !tab.url) return;

  const { ok } = await shouldRunOnUrl(tab.url);
  if (!ok) return;

  await injectForTex(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  // Options page manages permissions
});
