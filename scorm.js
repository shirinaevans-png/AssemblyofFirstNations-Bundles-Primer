/* Lightweight SCORM 1.2 wrapper. Also works outside an LMS (GitHub Pages/local web server). */
window.SCORM = (() => {
  let api = null;
  let initialized = false;

  function findAPI(win) {
    let tries = 0;
    while (win && tries < 10) {
      if (win.API) return win.API;
      if (win.parent && win.parent !== win) win = win.parent; else break;
      tries++;
    }
    try { if (window.opener) return findAPI(window.opener); } catch (_) {}
    return null;
  }

  function init() {
    api = findAPI(window);
    if (!api) return false;
    try { initialized = api.LMSInitialize("") === "true"; } catch (_) { initialized = false; }
    return initialized;
  }

  function get(name) {
    if (!initialized) return null;
    try { return api.LMSGetValue(name); } catch (_) { return null; }
  }

  function set(name, value) {
    if (!initialized) return false;
    try { return api.LMSSetValue(name, String(value)) === "true"; } catch (_) { return false; }
  }

  function commit() {
    if (!initialized) return false;
    try { return api.LMSCommit("") === "true"; } catch (_) { return false; }
  }

  function finish() {
    if (!initialized) return;
    try { api.LMSCommit(""); api.LMSFinish(""); } catch (_) {}
    initialized = false;
  }

  return { init, get, set, commit, finish, isConnected: () => initialized };
})();
