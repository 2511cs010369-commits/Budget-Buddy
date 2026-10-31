(() => {
  const wordmark = "/assets/budget-buddy-wordmark.png";
  const icon = "/assets/budget-buddy-icon.png";

  const image = (src, className, alt) => {
    const img = document.createElement("img");
    img.src = src;
    img.className = className;
    img.alt = alt;
    img.decoding = "async";
    return img;
  };

  document.querySelectorAll(".sidebar .brand").forEach(brand => {
    brand.classList.add("bb-official-brand");
    brand.replaceChildren(
      image(wordmark, "bb-wordmark", "Budget Buddy"),
      image(icon, "bb-brand-icon", "Budget Buddy")
    );
  });

  document.querySelectorAll(".landing-brand, .auth-logo").forEach(brand => {
    brand.classList.add("bb-official-brand", "bb-public-brand");
    brand.replaceChildren(image(wordmark, "bb-wordmark", "Budget Buddy"));
  });

  document.querySelectorAll(".dash-brand span").forEach(slot => {
    slot.classList.add("bb-demo-icon");
    slot.replaceChildren(image(icon, "bb-brand-icon", ""));
  });

  if (location.pathname === "/app") {
    const hero = document.querySelector(".v3-hero");
    if (hero) {
      const seal = document.createElement("div");
      seal.className = "bb-dashboard-seal";
      seal.append(image(icon, "bb-brand-icon", ""));
      const copy = document.createElement("span");
      copy.innerHTML = "<b>OFFICIAL MONEY SPACE</b><small>BUDGET BUDDY</small>";
      seal.append(copy);
      hero.append(seal);
    }
  }
})();
