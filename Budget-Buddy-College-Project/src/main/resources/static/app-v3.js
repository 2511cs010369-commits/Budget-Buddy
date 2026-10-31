(() => {
  const routes = {
    "/app": { key: "home", eyebrow: "YOUR FINANCIAL ORBIT", title: "Money that moves with you.", copy: "See today clearly, protect tomorrow, and keep every goal in motion.", score: "82", scoreLabel: "MOMENTUM", actions: [["Add transaction", "add"], ["Save ₹20", "save"], ["Ask AI", "ai"]] },
    "/insights": { key: "insights", eyebrow: "MONEY INTELLIGENCE", title: "Patterns you can act on.", copy: "Your spending story, translated into calmer choices and practical savings.", score: "₹2.1k", scoreLabel: "SAVE POTENTIAL", actions: [["Ask about spending", "ai"], ["Open goals", "goals"]] },
    "/goals": { key: "goals", eyebrow: "DREAM RUNWAY", title: "Make the future feel closer.", copy: "Three goals are moving forward. Your laptop is the next big milestone.", score: "58%", scoreLabel: "LEAD GOAL", actions: [["Create a goal", "goal"], ["Plan with AI", "ai"]] },
    "/challenges": { key: "challenges", eyebrow: "QUEST BOARD · LEVEL 4", title: "Turn consistency into momentum.", copy: "Small money habits become visible wins, streaks, badges, and better decisions.", score: "1,240", scoreLabel: "TOTAL XP", actions: [["View goals", "goals"], ["Save today", "save"]] },
    "/family": { key: "family", eyebrow: "SHARED DREAM CONTROL ROOM", title: "One goal. Everyone in sync.", copy: "Discuss money openly, split the plan fairly, and celebrate every contribution together.", score: "47.5%", scoreLabel: "VACATION FUND", actions: [["Invite member", "invite"], ["Open money chat", "family-chat"]] },
    "/ai-chat": { key: "ai", eyebrow: "PRIVATE MONEY COMPANION", title: "Ask. Explore. Decide calmly.", copy: "A judgment-free space to think through spending, saving, and your next move.", score: "LIVE", scoreLabel: "AI FRIEND", actions: [["Try a question", "focus-ai"], ["Back to home", "home"]] },
    "/settings": { key: "settings", eyebrow: "YOUR SPACE, YOUR RULES", title: "Tune Budget Buddy to you.", copy: "Shape the appearance, saving rhythm, alerts, and privacy around your life.", score: "4", scoreLabel: "PREFERENCES", actions: [["Switch theme", "theme"], ["Save settings", "settings-save"]] }
  };

  const path = location.pathname.replace(/\/$/, "") || "/";
  const config = routes[path];
  if (!config) return;

  document.body.classList.add("product-v3", `page-${config.key}`);
  const host = document.querySelector(".main, .ai-main");
  if (!host) return;

  const storedName = (localStorage.getItem("budgetBuddyUser") || localStorage.getItem("budgetBuddyUserName") || localStorage.getItem("userName") || "Budget Buddy User").trim();
  const firstName = storedName === "Ananya" ? "Budget Buddy User" : storedName;
  const initials = firstName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "BB";
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date());

  const command = document.createElement("header");
  command.className = "v3-command";
  command.innerHTML = `
    <div class="v3-command-left"><span class="v3-page-dot"></span><div><small>BUDGET BUDDY / ${config.key.toUpperCase()}</small><b>${today}</b></div></div>
    <button class="v3-search" type="button" data-v3="palette"><span>⌕</span><span>Jump to a page or action</span><kbd>Ctrl K</kbd></button>
    <div class="v3-command-actions"><span class="v3-sync"><i></i> Synced</span><button class="v3-icon-btn" data-v3="theme" aria-label="Change theme">◐</button><button class="v3-icon-btn" data-v3="notify" aria-label="Notifications">♢<i></i></button><div class="v3-person"><span class="v3-avatar"></span><span><b class="v3-user"></b><small>Personal space</small></span></div></div>`;
  command.querySelector(".v3-user").textContent = firstName;
  command.querySelector(".v3-avatar").textContent = initials;
  host.prepend(command);

  const oldHeader = host.querySelector(":scope > .topbar, :scope > .page-head, :scope > .ai-top");
  if (oldHeader) oldHeader.classList.add("v3-legacy-head");

  const hero = document.createElement("section");
  hero.className = "v3-hero";
  hero.innerHTML = `
    <div class="v3-hero-copy"><span class="v3-eyebrow"><i></i>${config.eyebrow}</span><h1>${config.title}</h1><p>${config.copy}</p><div class="v3-hero-actions"></div></div>
    <div class="v3-orbit" aria-hidden="true"><span class="v3-orbit-ring ring-one"></span><span class="v3-orbit-ring ring-two"></span><span class="v3-orbit-core"><b>${config.score}</b><small>${config.scoreLabel}</small></span><i class="satellite-one"></i><i class="satellite-two"></i></div>`;
  const actionBox = hero.querySelector(".v3-hero-actions");
  config.actions.forEach(([label, action], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === 0 ? "v3-action primary" : "v3-action";
    button.dataset.v3 = action;
    button.textContent = `${label} ${index === 0 ? "↗" : "→"}`;
    actionBox.append(button);
  });
  command.insertAdjacentElement("afterend", hero);

  const menu = document.querySelector(".menu");
  if (menu) {
    const label = document.createElement("span");
    label.className = "v3-menu-label";
    label.textContent = "WORKSPACE";
    menu.prepend(label);
    if (!menu.querySelector('a[href="/ai-chat"], button[data-page="ai"]')) {
      const ai = document.createElement("a");
      ai.href = "/ai-chat";
      ai.innerHTML = "✦ <span>AI Friend</span>";
      menu.append(ai);
    }
    if (!menu.querySelector('a[href="/settings"], button[data-page="settings"]')) {
      const settings = document.createElement("a");
      settings.href = "/settings";
      settings.innerHTML = "⚙ <span>Settings</span>";
      menu.append(settings);
    }
    const profile = document.createElement("div");
    profile.className = "v3-side-profile";
    profile.innerHTML = `<span>${initials}</span><div><b></b><small>Level 4 · 1,240 XP</small></div><i>↗</i>`;
    profile.querySelector("b").textContent = firstName;
    menu.insertAdjacentElement("afterend", profile);
  }

  const palette = document.createElement("div");
  palette.className = "v3-palette";
  palette.hidden = true;
  palette.innerHTML = `<div class="v3-palette-backdrop" data-v3="close-palette"></div><section class="v3-palette-card" role="dialog" aria-modal="true"><div class="v3-palette-input"><span>⌕</span><input aria-label="Search Budget Buddy" placeholder="Where do you want to go?" autocomplete="off"><kbd>ESC</kbd></div><p>QUICK NAVIGATION</p><div class="v3-palette-grid"><a href="/app">⌂ <span><b>Home</b><small>Your financial command center</small></span></a><a href="/insights">▥ <span><b>Insights</b><small>Understand your money patterns</small></span></a><a href="/goals">◎ <span><b>Goals</b><small>Move your dreams forward</small></span></a><a href="/challenges">🏆 <span><b>Challenges</b><small>Build habits through wins</small></span></a><a href="/family">♧ <span><b>Family goals</b><small>Plan and save together</small></span></a><a href="/ai-chat">✦ <span><b>AI Friend</b><small>Think through a money decision</small></span></a></div></section>`;
  document.body.append(palette);

  const notify = message => {
    let toast = document.querySelector(".v3-toast");
    if (!toast) { toast = document.createElement("div"); toast.className = "v3-toast"; document.body.append(toast); }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  };
  const openPalette = () => { palette.hidden = false; requestAnimationFrame(() => palette.classList.add("open")); setTimeout(() => palette.querySelector("input").focus(), 80); };
  const closePalette = () => { palette.classList.remove("open"); setTimeout(() => { palette.hidden = true; }, 220); };
  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("budgetBuddyTheme", next);
    notify(`${next === "dark" ? "Dark" : "Light"} mode is on`);
  };

  document.addEventListener("click", event => {
    const control = event.target.closest("[data-v3]");
    if (!control) return;
    const action = control.dataset.v3;
    if (action === "palette") openPalette();
    else if (action === "close-palette") closePalette();
    else if (action === "theme") toggleTheme();
    else if (action === "notify") document.dispatchEvent(new CustomEvent("budgetbuddy:toggle-notifications"));
    else if (action === "home") location.href = "/app";
    else if (action === "goals") location.href = "/goals";
    else if (action === "ai") location.href = "/ai-chat";
    else if (action === "add") document.querySelector("#addBtn")?.click() || (location.href = "/app");
    else if (action === "save") document.querySelector("#saveBtn")?.click() || notify("Open Home to complete today's ₹20 save.");
    else if (action === "goal") document.querySelector('[data-toast="New goal form opened"]')?.click() || notify("Goal creator is ready.");
    else if (action === "invite") document.querySelector('[data-toast="Invitation link copied"]')?.click() || notify("Family invitation copied.");
    else if (action === "family-chat") { document.querySelector(".family-collab")?.scrollIntoView({ behavior: "smooth" }); notify("Money Circle opened."); }
    else if (action === "focus-ai") { document.querySelector("#aiInput")?.focus(); document.querySelector(".conversation")?.scrollIntoView({ behavior: "smooth" }); }
    else if (action === "settings-save") document.querySelector('[data-toast="Preferences saved successfully"]')?.click() || notify("Preferences saved.");
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openPalette(); }
    if (event.key === "Escape" && !palette.hidden) closePalette();
  });
  palette.querySelector("input").addEventListener("input", event => {
    const query = event.target.value.toLowerCase();
    palette.querySelectorAll("a").forEach(item => { item.style.display = item.textContent.toLowerCase().includes(query) ? "flex" : "none"; });
  });

  document.querySelectorAll(".card, .metric, .goal-item, .settings-panel, .conversation, .side-panel").forEach(card => {
    card.classList.add("v3-surface");
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
  });
})();
