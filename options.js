const domainInput = document.getElementById('domain');
const addBtn = document.getElementById('add');
const listEl = document.getElementById('list');
const statusEl = document.getElementById('status');

try {
  console.log('[ForTex][options] options.js loaded');
} catch (_) {}

if (statusEl) {
  statusEl.textContent = 'Settings page loaded.';
}

function normalizeToOriginPattern(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\s+/g, '')
    .replace(/\/.*/, '');

  if (!cleaned) throw new Error('Enter a domain like example.com');

  // If they enter a wildcard domain like *.example.com, accept it.
  if (cleaned.startsWith('*.')) {
    return `https://${cleaned}/*`;
  }

  return `https://${cleaned}/*`;
}

async function getAllowedOrigins() {
  const { allowedOrigins = [] } = await chrome.storage.sync.get({ allowedOrigins: [] });
  return Array.isArray(allowedOrigins) ? allowedOrigins : [];
}

async function setAllowedOrigins(allowedOrigins) {
  await chrome.storage.sync.set({ allowedOrigins });
}

async function render() {
  const allowed = await getAllowedOrigins();
  listEl.innerHTML = '';

  if (allowed.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No sites added yet.';
    listEl.appendChild(li);
    return;
  }

  for (const originPattern of allowed) {
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.textContent = originPattern;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.marginLeft = '8px';

    removeBtn.addEventListener('click', async () => {
      const next = (await getAllowedOrigins()).filter((x) => x !== originPattern);
      await setAllowedOrigins(next);
      try {
        await chrome.permissions.remove({ origins: [originPattern] });
      } catch (_) {
        // ignore
      }
      await render();
    });

    li.appendChild(label);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  }
}

addBtn.addEventListener('click', async () => {
  try {
    const originPattern = normalizeToOriginPattern(domainInput.value);

    if (statusEl) statusEl.textContent = `Requesting permission for ${originPattern} ...`;

    const granted = await chrome.permissions.request({
      origins: [originPattern],
    });

    if (!granted) {
      if (statusEl) statusEl.textContent = 'Permission request was canceled.';
      return;
    }

    const allowed = await getAllowedOrigins();
    if (!allowed.includes(originPattern)) {
      allowed.push(originPattern);
      await setAllowedOrigins(allowed);
    }

    domainInput.value = '';
    if (statusEl) statusEl.textContent = `Allowed: ${originPattern}`;
    await render();
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error: ' + (e && e.message ? e.message : String(e));
    alert(e && e.message ? e.message : String(e));
  }
});

render();
