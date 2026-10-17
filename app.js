(() => {
  // The four official shapes, with hand-drawn nugget silhouettes.
  const SHAPES = [
    {
      id: "boot", name: "Boot",
      path: "M30 14c8-3 18-1 22 6l4 34c10 2 24 4 32 11 6 6 3 16-6 18l-44 3c-12 1-20-6-20-17l-2-38c0-8 6-14 14-17z",
    },
    {
      id: "ball", name: "Ball",
      path: "M50 12c22 0 38 15 38 37 0 23-16 39-39 39-22 0-37-17-37-38 0-22 16-38 38-38z",
    },
    {
      id: "bell", name: "Bell",
      path: "M50 10c10 0 16 8 17 18 2 14 6 28 16 40 5 7 2 16-8 17H25c-10-1-13-10-8-17 10-12 14-26 16-40 1-10 7-18 17-18z",
    },
    {
      id: "bone", name: "Bone",
      path: "M20 22c8-6 18-3 22 5l16 0c4-8 14-11 22-5 8 6 7 15 2 21 5 6 6 15-2 21-8 6-18 3-22-5H42c-4 8-14 11-22 5-8-6-7-15-2-21-5-6-6-15 2-21z",
    },
  ];

  const MAX = 99;
  const counts = Object.fromEntries(SHAPES.map(s => [s.id, 0]));
  const $ = id => document.getElementById(id);

  const svgFor = shape => `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="g-${shape.id}" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#ffd98a"/>
          <stop offset="55%" stop-color="#e9a73c"/>
          <stop offset="100%" stop-color="#b8701c"/>
        </radialGradient>
        <filter id="crumb-${shape.id}">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${shape.id.length}"/>
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.25  0 0 0 0 0.05  0 0 0 0.55 0"/>
          <feComposite in2="SourceGraphic" operator="in"/>
          <feBlend in="SourceGraphic" mode="multiply"/>
        </filter>
      </defs>
      <path d="${shape.path}" fill="url(#g-${shape.id})" filter="url(#crumb-${shape.id})"
            stroke="#8a4f12" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;

  // ── Build the four counter cards ──
  const grid = $("grid");
  const tpl = $("cardTpl");
  SHAPES.forEach(shape => {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.shape = shape.id;
    card.querySelector(".shape").innerHTML = svgFor(shape);
    card.querySelector(".name").textContent = shape.name;
    card.querySelector(".minus").setAttribute("aria-label", `Remove a ${shape.name}`);
    card.querySelector(".plus").setAttribute("aria-label", `Add a ${shape.name}`);
    card.querySelector(".minus").addEventListener("click", () => bump(shape.id, -1));
    card.querySelector(".plus").addEventListener("click", () => bump(shape.id, +1));
    // Tapping the nugget itself also adds one.
    card.querySelector(".shape").addEventListener("click", () => bump(shape.id, +1));
    grid.appendChild(card);
  });

  function bump(id, delta) {
    const next = Math.max(0, Math.min(MAX, counts[id] + delta));
    if (next === counts[id]) return;
    counts[id] = next;
    const card = grid.querySelector(`[data-shape="${id}"]`);
    card.querySelector(".count").textContent = next;
    card.classList.toggle("has", next > 0);
    if (delta > 0) {
      card.classList.remove("pop");
      void card.offsetWidth;
      card.classList.add("pop");
    }
    $("fortune").hidden = true;
    render();
  }

  function render() {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    $("total").textContent = `${total} nugget${total === 1 ? "" : "s"} in your box`;
    $("reveal").disabled = total === 0;
  }

  // ── Work out which reading type this box is ──
  const cap = s => s[0].toUpperCase() + s.slice(1);

  function readingType() {
    const present = SHAPES.filter(s => counts[s.id] > 0).map(s => s.id);
    const top = Math.max(...Object.values(counts));
    const leaders = SHAPES.filter(s => counts[s.id] === top).map(s => s.id);

    if (present.length === 1) return { key: `all${cap(present[0])}`, label: `Pure ${present[0]}` };
    if (leaders.length === 4) return { key: "perfectBalance", label: "Perfect balance" };
    if (leaders.length === 1) return { key: `${leaders[0]}Leads`, label: `The ${leaders[0]} leads` };
    if (leaders.length === 2) {
      return { key: `tie${cap(leaders[0])}${cap(leaders[1])}`, label: `${cap(leaders[0])} & ${leaders[1]} tie` };
    }
    const missing = SHAPES.find(s => !leaders.includes(s.id)).id;
    return { key: `threeWayNo${cap(missing)}`, label: `Three-way tie, no ${missing}` };
  }

  // Small stable hash so the same box always gets the same fortune.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function luckyNumbers(seed) {
    const nums = new Set();
    let h = seed;
    while (nums.size < 3) {
      h = hash(String(h));
      nums.add((h % 49) + 1);
    }
    return [...nums].sort((a, b) => a - b);
  }

  let current = null;

  $("reveal").addEventListener("click", () => {
    const key = SHAPES.map(s => counts[s.id]).join("-");
    const type = readingType();
    const pool = (window.FORTUNES && window.FORTUNES[type.key]) || [];
    const seed = hash(key);
    const text = pool.length
      ? pool[seed % pool.length]
      : "The nuggets are silent on this one. Try a different box.";

    current = { label: type.label, text };
    $("fortuneType").textContent = type.label;
    $("fortuneText").textContent = text;
    $("lucky").textContent = `Lucky numbers: ${luckyNumbers(seed).join(" · ")}`;

    const box = $("fortune");
    box.hidden = false;
    box.classList.remove("show");
    void box.offsetWidth;
    box.classList.add("show");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("reset").addEventListener("click", () => {
    SHAPES.forEach(s => {
      counts[s.id] = 0;
      const card = grid.querySelector(`[data-shape="${s.id}"]`);
      card.querySelector(".count").textContent = "0";
      card.classList.remove("has");
    });
    $("fortune").hidden = true;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("share").addEventListener("click", async () => {
    if (!current) return;
    const message = `My Nuggs of Truth reading (${current.label}): "${current.text}"\n${location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Nuggs of Truth", text: message });
        return;
      }
      await navigator.clipboard.writeText(message);
      toast("Copied to your clipboard");
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("Couldn't share. Try copying the text instead.");
    }
  });

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("on"), 2200);
  }

  render();
})();
