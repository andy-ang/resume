(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const syncHeroPortrait = () => {
    const identity = document.querySelector(".hero-identity");
    const wrap = document.querySelector(".hero-portrait-wrap");
    const brand = document.querySelector(".hero-brand");
    const contact = document.querySelector(".hero-contact");
    if (!identity || !wrap || !brand || !contact) return;

    const textHeight = contact.offsetTop + contact.offsetHeight - brand.offsetTop;
    if (textHeight > 0) {
      identity.style.setProperty("--hero-portrait-size", `${textHeight}px`);
    }
  };

  syncHeroPortrait();
  window.addEventListener("resize", syncHeroPortrait);
  if (document.fonts?.ready) {
    document.fonts.ready.then(syncHeroPortrait);
  }

  const targets = document.querySelectorAll(".job, .reveal");
  if (!("IntersectionObserver" in window) || targets.length === 0) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  targets.forEach((el) => observer.observe(el));
})();
