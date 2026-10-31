(() => {
  const protectedRoutes = new Set(["/app", "/insights", "/goals", "/challenges", "/family", "/ai-chat", "/settings"]);
  if (!protectedRoutes.has(location.pathname)) return;

  const fmt = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const notificationKey = "budgetBuddyNotificationsV1";
  const reminderKey = "budgetBuddyReminderTime";
  let latestSummary = null;
  let reconnectTimer = null;

  function readNotifications() {
    try { const value = JSON.parse(localStorage.getItem(notificationKey) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  let notifications = readNotifications();
  if (!notifications.length) {
    notifications = [
      { id: "welcome", type: "celebration", title: "Your money space is ready", body: "Budget Buddy will celebrate progress and gently remind you about saving.", createdAt: Date.now(), read: false },
      { id: "weekly-tip", type: "insight", title: "A small saving idea", body: "Reducing one weekend food order could add ₹500 to your Laptop goal.", createdAt: Date.now() - 3600000, read: false }
    ];
    persistNotifications();
  }

  const panel = document.createElement("aside");
  panel.className = "bb-notification-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Budget Buddy notifications");
  panel.innerHTML = `
    <header><div><span class="notification-kicker">MONEY MOMENTS</span><h2>Notifications</h2></div><button class="notification-close" type="button" aria-label="Close notifications">×</button></header>
    <div class="notification-live"><span><i></i> Live updates connected</span><button id="enableDesktopAlerts" type="button">Enable desktop alerts</button></div>
    <div class="notification-list" id="notificationList"></div>
    <footer><div><button id="markNotificationsRead" type="button">Mark all read</button><button id="clearReadNotifications" type="button">Clear read</button></div><a href="/settings">Notification settings →</a></footer>`;
  document.body.append(panel);

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "notification-backdrop";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-label", "Close notifications");
  document.body.append(backdrop);

  function persistNotifications() {
    localStorage.setItem(notificationKey, JSON.stringify(notifications.slice(0, 35)));
  }
  function timeAgo(timestamp) {
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(timestamp));
  }
  function iconFor(type) { return ({ celebration: "✦", reminder: "◷", warning: "!", activity: "₹", insight: "↗" })[type] || "•"; }
  function renderNotifications() {
    const list = panel.querySelector("#notificationList");
    list.replaceChildren();
    if (!notifications.length) {
      list.innerHTML = `<div class="notification-empty"><span>✓</span><b>You're all caught up</b><p>New reminders and achievements will appear here.</p></div>`;
    } else notifications.forEach(item => {
      const article = document.createElement("article");
      article.className = `notification-item ${item.type}${item.read ? " read" : ""}`;
      article.innerHTML = `<span class="notification-symbol">${iconFor(item.type)}</span><div><div class="notification-meta"><b></b><small>${timeAgo(item.createdAt)}</small></div><p></p></div>`;
      article.querySelector("b").textContent = item.title;
      article.querySelector("p").textContent = item.body;
      article.addEventListener("click", () => { item.read = true; persistNotifications(); renderNotifications(); });
      list.append(article);
    });
    const unread = notifications.filter(item => !item.read).length;
    document.querySelectorAll('[data-v3="notify"]').forEach(button => {
      button.classList.toggle("has-notifications", unread > 0);
      button.dataset.count = unread > 9 ? "9+" : String(unread);
      button.setAttribute("aria-label", unread ? `${unread} unread notifications` : "Notifications");
    });
    const desktop = panel.querySelector("#enableDesktopAlerts");
    if (!("Notification" in window)) { desktop.textContent = "In-app alerts active"; desktop.disabled = true; }
    else if (Notification.permission === "granted") { desktop.textContent = "Desktop alerts on ✓"; desktop.disabled = true; }
    else if (Notification.permission === "denied") { desktop.textContent = "Blocked in browser"; desktop.disabled = true; }
  }
  function addNotification({ id, type = "activity", title, body, desktop = false }) {
    if (id && notifications.some(item => item.id === id)) return;
    notifications.unshift({ id: id || `${Date.now()}-${Math.random()}`, type, title, body, createdAt: Date.now(), read: false });
    persistNotifications(); renderNotifications();
    if (desktop && "Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, icon: "/assets/budget-buddy-icon.png", tag: id || title });
    }
  }
  function togglePanel(force) {
    const open = typeof force === "boolean" ? force : panel.hidden;
    panel.hidden = !open; backdrop.hidden = !open;
    requestAnimationFrame(() => { panel.classList.toggle("open", open); backdrop.classList.toggle("open", open); });
    if (open) renderNotifications();
  }
  window.BudgetBuddyNotifications = { toggle: togglePanel, add: addNotification, getAll: () => [...notifications] };
  document.addEventListener("budgetbuddy:toggle-notifications", () => togglePanel());
  panel.querySelector(".notification-close").addEventListener("click", () => togglePanel(false));
  backdrop.addEventListener("click", () => togglePanel(false));
  panel.querySelector("#markNotificationsRead").addEventListener("click", () => { notifications.forEach(item => item.read = true); persistNotifications(); renderNotifications(); });
  panel.querySelector("#clearReadNotifications").addEventListener("click", () => { notifications = notifications.filter(item => !item.read); persistNotifications(); renderNotifications(); });
  panel.querySelector("#enableDesktopAlerts").addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission(); renderNotifications();
    if (result === "granted") addNotification({ id: "desktop-enabled", type: "celebration", title: "Desktop reminders enabled", body: "Budget Buddy can now celebrate progress even when this panel is closed." });
  });

  function setText(selector, text) { const element = document.querySelector(selector); if (element) element.textContent = text; }
  function applySummary(summary, source = "live") {
    if (!summary || typeof summary !== "object") return;
    const previous = latestSummary || (() => { try { return JSON.parse(localStorage.getItem("budgetBuddyLastSummary") || "null"); } catch { return null; } })();
    latestSummary = summary;
    localStorage.setItem("budgetBuddyLastSummary", JSON.stringify(summary));

    setText("#balance", fmt(summary.balance));
    setText("#saved", fmt(summary.saved));
    setText("#streak", `🔥 ${summary.streak} day streak`);
    setText("#goalPercent", `${Math.min(100, Math.round(summary.saved / summary.goal * 100))}%`);
    const goalProgress = document.querySelector(".page-goals .goal-item:first-child .progress i");
    if (goalProgress) goalProgress.style.width = `${Math.min(100, summary.saved / summary.goal * 100)}%`;
    const goalCopy = document.querySelector(".page-goals .goal-item:first-child > p");
    if (goalCopy) goalCopy.textContent = `${fmt(summary.saved)} of ${fmt(summary.goal)}`;
    const goalCompletion = document.querySelector(".page-goals .goal-item:first-child .between small:first-child");
    if (goalCompletion) goalCompletion.textContent = `${Math.min(100, Math.round(summary.saved / summary.goal * 100))}% complete`;
    document.dispatchEvent(new CustomEvent("budgetbuddy:summary", { detail: summary }));

    if (source === "live" && previous) {
      if (summary.saved > previous.saved) {
        const delta = summary.saved - previous.saved;
        addNotification({ id: `saved-${summary.saved}`, type: "activity", title: `${fmt(delta)} moved to your goal`, body: `Your Laptop Fund is now ${Math.round(summary.saved / summary.goal * 100)}% complete. Every small save matters.`, desktop: true });
      }
      if (summary.balance !== previous.balance && summary.saved === previous.saved) {
        const delta = summary.balance - previous.balance;
        addNotification({ id: `balance-${summary.balance}-${summary.updatedAt}`, type: "activity", title: delta > 0 ? "Income recorded" : "Expense recorded", body: `${fmt(Math.abs(delta))} ${delta > 0 ? "was added to" : "was deducted from"} your balance.`, desktop: false });
      }
      const oldPercent = Math.floor(previous.saved / previous.goal * 100), newPercent = Math.floor(summary.saved / summary.goal * 100);
      [60, 75, 90, 100].forEach(milestone => {
        if (oldPercent < milestone && newPercent >= milestone) addNotification({ id: `goal-${milestone}`, type: "celebration", title: milestone === 100 ? "Goal reached! You did it 🎉" : `${milestone}% goal milestone!`, body: milestone === 100 ? `Your ${fmt(summary.goal)} Laptop goal is complete. That consistency paid off.` : `You are now ${milestone}% of the way to your Laptop. Keep the momentum going.`, desktop: true });
      });
      if (summary.streak > previous.streak && summary.streak % 5 === 0) addNotification({ id: `streak-${summary.streak}`, type: "celebration", title: `${summary.streak}-day saving streak 🔥`, body: "Your daily saving habit is becoming a real financial strength.", desktop: true });
    }
  }

  async function fetchSummary(source = "initial") {
    try { const token=localStorage.getItem("budgetBuddyAccessToken"); const response = await fetch("/api/summary", { cache: "no-store", headers:token?{Authorization:`Bearer ${token}`}:{}}); if (!response.ok) throw new Error("summary"); applySummary(await response.json(), source); setConnection(true); }
    catch { setConnection(false); }
  }
  function setConnection(online) {
    document.documentElement.dataset.live = online ? "connected" : "reconnecting";
    const label = panel.querySelector(".notification-live span");
    label.innerHTML = online ? "<i></i> Live updates connected" : "<i></i> Reconnecting safely…";
    label.classList.toggle("offline", !online);
  }
  function connect() {
    if (localStorage.getItem("budgetBuddyAccessToken")) { setInterval(() => fetchSummary("live"), 5000); return; }
    if (!("EventSource" in window)) { setInterval(() => fetchSummary("live"), 5000); return; }
    const stream = new EventSource("/api/events");
    stream.addEventListener("summary", event => { try { applySummary(JSON.parse(event.data), "live"); setConnection(true); } catch {} });
    stream.onopen = () => setConnection(true);
    stream.onerror = () => { setConnection(false); stream.close(); clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connect, 3000); };
  }

  function checkReminder() {
    if (localStorage.getItem("budgetBuddyPref_dailyReminder") === "false") return;
    const reminder = localStorage.getItem(reminderKey) || "20:00";
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const day = now.toISOString().slice(0,10);
    if (current === reminder && localStorage.getItem("budgetBuddyReminderSent") !== day) {
      localStorage.setItem("budgetBuddyReminderSent", day);
      addNotification({ id: `saving-reminder-${day}`, type: "reminder", title: "A tiny saving moment", body: "Ready to add ₹20 to your goal and keep your streak alive?", desktop: true });
    }
  }

  const timeInput = document.querySelector("#reminderTime");
  if (timeInput) { timeInput.value = localStorage.getItem(reminderKey) || "20:00"; timeInput.addEventListener("change", () => localStorage.setItem(reminderKey, timeInput.value)); }
  const desktopSettings = document.querySelector("#settingsDesktopAlerts");
  if (desktopSettings) desktopSettings.addEventListener("click", () => panel.querySelector("#enableDesktopAlerts").click());

  renderNotifications(); fetchSummary("initial"); connect(); checkReminder(); setInterval(checkReminder, 30000);
})();
