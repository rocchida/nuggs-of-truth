(() => {
  // ── The four constellations. Stars are [x, y, size] in a 100×100 box;
  //    lines join stars in order around the outline, plus any extras. ──
  const SHAPES = [
    {
      id: "boot", name: "Boot",
      stars: [[32,12,3.2],[52,18,2.2],[56,52,2.6],[80,60,2],[88,76,3],[60,86,2],[34,86,2.4],[18,70,2],[20,32,2.2]],
      extra: [],
    },
    {
      id: "ball", name: "Ball",
      stars: [[50,12,3],[76,22,2],[88,48,2.6],[80,74,2],[54,88,3.2],[26,80,2],[12,54,2.4],[22,24,2],[50,50,1.6]],
      loop: 8, extra: [],
    },
    {
      id: "bell", name: "Bell",
      stars: [[50,10,3.2],[64,26,2],[68,50,2.4],[86,76,2.6],[50,80,1.8],[14,76,2.6],[32,50,2.4],[36,26,2],[50,94,2.8]],
      loop: 8, extra: [[3,4],[4,5],[4,8]],
    },
    {
      id: "bone", name: "Bone",
      stars: [[12,28,2.6],[26,16,2],[40,32,2.2],[60,32,2.2],[74,16,2],[88,28,2.6],[82,50,3],[88,72,2.6],[74,84,2],[60,68,2.2],[40,68,2.2],[26,84,2],[12,72,2.6],[18,50,3]],
      extra: [],
    },
  ];

  const MAX = 99;
  const counts = Object.fromEntries(SHAPES.map(s => [s.id, 0]));
  const $ = id => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Shared glow filter for every star.
  document.body.insertAdjacentHTML("beforeend", `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
        <feGaussianBlur stdDeviation="1.6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </svg>`);

  function constellationSVG(shape) {
    const pts = shape.stars;
    const n = shape.loop ?? pts.length;
    const pairs = [];
    for (let i = 0; i < n; i++) pairs.push([i, (i + 1) % n]);
    pairs.push(...shape.extra);
    const lines = pairs.map(([a, b]) =>
      `<line class="edge" x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}"/>`).join("");
    const stars = pts.map(([x, y, r]) =>
      `<circle class="star" cx="${x}" cy="${y}" r="${r}" style="--tw:${rand(2.2, 4.5).toFixed(2)}s;--td:-${rand(0, 4).toFixed(2)}s"/>`).join("");
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g class="figure">${lines}${stars}</g></svg>`;
  }

  // ── Build the cards ──
  const grid = $("grid");
  const tpl = $("cardTpl");
  SHAPES.forEach(shape => {
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.dataset.shape = shape.id;
    const btn = card.querySelector(".shape");
    btn.innerHTML = constellationSVG(shape);
    btn.setAttribute("aria-label", `Add a ${shape.name}`);
    card.querySelector(".name").textContent = shape.name;
    card.querySelector(".minus").setAttribute("aria-label", `Remove a ${shape.name}`);
    card.querySelector(".plus").setAttribute("aria-label", `Add a ${shape.name}`);
    card.querySelector(".minus").addEventListener("click", () => bump(shape.id, -1));
    card.querySelector(".plus").addEventListener("click", () => bump(shape.id, +1));
    btn.addEventListener("click", () => bump(shape.id, +1));
    grid.appendChild(card);
  });

  // ── Animations. Never the same one twice in a row. ──
  const ADD_ANIMS = {
    spin: [
      [{ transform: "rotate(0) scale(1)" }, { transform: "rotate(200deg) scale(1.15)" }, { transform: "rotate(360deg) scale(1)" }],
      { duration: 700, easing: "cubic-bezier(.3,1.4,.5,1)" }],
    supernova: [
      [{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.35)", filter: "brightness(2.2) drop-shadow(0 0 12px #f6d58a)" }, { transform: "scale(1)", filter: "brightness(1)" }],
      { duration: 550, easing: "ease-out" }],
    hover: [
      [{ transform: "translateY(0)" }, { transform: "translateY(-18px) rotate(-6deg)" }, { transform: "translateY(4px) rotate(3deg)" }, { transform: "translateY(0)" }],
      { duration: 800, easing: "ease-in-out" }],
    wobble: [
      [{ transform: "rotate(0)" }, { transform: "rotate(-14deg) scale(1.08)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-6deg)" }, { transform: "rotate(0)" }],
      { duration: 650, easing: "ease-out" }],
    flip: [
      [{ transform: "perspective(400px) rotateY(0)" }, { transform: "perspective(400px) rotateY(180deg) scale(1.1)" }, { transform: "perspective(400px) rotateY(360deg)" }],
      { duration: 750, easing: "ease-in-out" }],
    warp: [
      [{ transform: "scale(1, 1)" }, { transform: "scale(1.3, .75)" }, { transform: "scale(.85, 1.25)" }, { transform: "scale(1.08, .95)" }, { transform: "scale(1, 1)" }],
      { duration: 600, easing: "ease-out" }],
    trace: null, // redraws the constellation lines one by one
  };

  const SUB_ANIMS = {
    implode: [
      [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.6) rotate(-20deg)", opacity: .4 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 550, easing: "ease-in-out" }],
    flicker: [
      [{ opacity: 1 }, { opacity: .15 }, { opacity: .9 }, { opacity: .25 }, { opacity: 1 }],
      { duration: 500, easing: "steps(1, end)" }],
    sink: [
      [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(16px)", opacity: .35 }, { transform: "translateY(0)", opacity: 1 }],
      { duration: 600, easing: "ease-in-out" }],
    shiver: [
      [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }],
      { duration: 450, easing: "ease-out" }],
    eclipse: [
      [{ filter: "brightness(1)" }, { filter: "brightness(.15) blur(2px)" }, { filter: "brightness(1)" }],
      { duration: 650, easing: "ease-in-out" }],
  };

  let lastAnim = null;

  function pick(pool, last) {
    const options = Object.keys(pool).filter(k => k !== last);
    return options[Math.floor(Math.random() * options.length)];
  }

  function animate(card, delta) {
    if (reduceMotion) return;
    const pool = delta > 0 ? ADD_ANIMS : SUB_ANIMS;
    const name = pick(pool, lastAnim);
    lastAnim = name;
    const fig = card.querySelector(".figure");
    fig.getAnimations().forEach(a => a.cancel());
    fig.style.transformOrigin = "50px 50px";

    if (name === "trace") {
      card.querySelectorAll(".edge").forEach((line, i) => {
        const len = Math.hypot(line.x2.baseVal.value - line.x1.baseVal.value, line.y2.baseVal.value - line.y1.baseVal.value);
        line.style.strokeDasharray = len;
        line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: 260, delay: i * 55, easing: "ease-out", fill: "backwards" });
      });
      card.querySelectorAll(".star").forEach((s, i) =>
        s.animate([{ opacity: .1 }, { opacity: 1 }], { duration: 300, delay: i * 55, fill: "backwards" }));
    } else {
      const [frames, opts] = pool[name];
      fig.animate(frames, opts);
    }
    sparks(card, delta);
  }

  const SPARK_COLORS = ["#f6d58a", "#8fe3ff", "#b89cff", "#ffffff", "#ffb3e6"];

  function sparks(card, delta) {
    const n = delta > 0 ? 14 : 7;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.style.setProperty("--c", SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]);
      card.appendChild(s);
      const ang = rand(0, Math.PI * 2);
      const dist = delta > 0 ? rand(40, 90) : rand(30, 55);
      const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
      const frames = delta > 0
        ? [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${x}px,${y}px) scale(0)`, opacity: 0 }]
        : [{ transform: `translate(${x}px,${y}px) scale(.8)`, opacity: .9 }, { transform: "translate(0,0) scale(0)", opacity: 0 }];
      s.animate(frames, { duration: rand(500, 900), easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => s.remove();
    }
  }

  // ── Sounds, made on the fly with Web Audio. Also never the same twice in a row. ──
  let audio = null;
  let muted = false;
  try { muted = localStorage.getItem("nuggs-muted") === "1"; } catch (e) {}

  function ctx() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  // Pentatonic scale so random notes always sound pleasant.
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const freq = (semi, base = 523.25) => base * Math.pow(2, semi / 12);

  function tone(ac, f, start, dur, { type = "sine", vol = .18, slideTo = null } = {}) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(master(ac));
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  let bus = null;
  function master(ac) {
    if (!bus) {
      bus = ac.createGain();
      bus.gain.value = 0.8;
      // A little echo for a cosmic, spacious feel.
      const delay = ac.createDelay();
      delay.delayTime.value = 0.22;
      const fb = ac.createGain();
      fb.gain.value = 0.32;
      bus.connect(ac.destination);
      bus.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(ac.destination);
    }
    return bus;
  }

  const ADD_SOUNDS = {
    chime(ac, t, lift) {
      const f = freq(SCALE[2 + lift % 6]);
      tone(ac, f, t, 1.2, { vol: .2 });
      tone(ac, f * 2, t, .8, { vol: .07 });
    },
    sparkle(ac, t, lift) {
      [0, 2, 4].forEach((step, i) => tone(ac, freq(SCALE[(lift + step) % SCALE.length]), t + i * .06, .5, { type: "triangle", vol: .12 }));
    },
    harp(ac, t, lift) {
      [0, 1, 2, 3, 4].forEach(i => tone(ac, freq(SCALE[(lift + i * 2) % SCALE.length], 392), t + i * .035, .7, { type: "triangle", vol: .09 }));
    },
    glimmer(ac, t) {
      for (let i = 0; i < 5; i++) tone(ac, freq(SCALE[Math.floor(Math.random() * SCALE.length)], 1046.5), t + Math.random() * .2, .35, { vol: .06 });
    },
    swoosh(ac, t, lift) {
      tone(ac, freq(SCALE[lift % 5], 261.6), t, .45, { vol: .14, slideTo: freq(SCALE[lift % 5] + 12, 261.6) });
      tone(ac, freq(SCALE[(lift + 4) % SCALE.length]), t + .18, .8, { vol: .12 });
    },
  };

  const SUB_SOUNDS = {
    fall(ac, t) { tone(ac, 660, t, .5, { vol: .14, slideTo: 220 }); },
    dim(ac, t) { tone(ac, freq(7), t, .3, { vol: .12 }); tone(ac, freq(0), t + .12, .6, { vol: .12 }); },
    plink(ac, t) { tone(ac, freq(4, 261.6), t, .4, { type: "triangle", vol: .16 }); },
    void(ac, t) { tone(ac, 180, t, .6, { vol: .2, slideTo: 70 }); },
  };

  let lastSound = null;

  function play(pool, lift = 0) {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const name = pick(pool, lastSound);
    lastSound = name;
    pool[name](ac, ac.currentTime + 0.01, lift);
  }

  function playReveal() {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime + 0.02;
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(ac, freq(s, 329.6), t + i * .09, 1.8, { type: "triangle", vol: .1 }));
    tone(ac, freq(0, 164.8), t, 2.4, { vol: .14 });
    for (let i = 0; i < 10; i++) tone(ac, freq(SCALE[Math.floor(Math.random() * SCALE.length)], 1318.5), t + .5 + Math.random() * .8, .4, { vol: .04 });
  }

  const muteBtn = $("mute");
  function syncMute() {
    muteBtn.setAttribute("aria-pressed", String(muted));
    muteBtn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
  }
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem("nuggs-muted", muted ? "1" : "0"); } catch (e) {}
    syncMute();
  });
  syncMute();

  // ── Counting ──
  function bump(id, delta) {
    const next = Math.max(0, Math.min(MAX, counts[id] + delta));
    if (next === counts[id]) return;
    counts[id] = next;
    const card = grid.querySelector(`[data-shape="${id}"]`);
    card.querySelector(".count").textContent = next;
    card.classList.toggle("lit", next > 0);
    animate(card, delta);
    play(delta > 0 ? ADD_SOUNDS : SUB_SOUNDS, next);
    $("fortune").hidden = true;
    render();
  }

  function render() {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    $("reveal").disabled = total === 0;
  }

  // ── Work out which reading type this box is ──
  const cap = s => s[0].toUpperCase() + s.slice(1);

  function readingKey() {
    const present = SHAPES.filter(s => counts[s.id] > 0).map(s => s.id);
    const top = Math.max(...Object.values(counts));
    const leaders = SHAPES.filter(s => counts[s.id] === top).map(s => s.id);

    if (present.length === 1) return `all${cap(present[0])}`;
    if (leaders.length === 4) return "perfectBalance";
    if (leaders.length === 1) return `${leaders[0]}Leads`;
    if (leaders.length === 2) return `tie${cap(leaders[0])}${cap(leaders[1])}`;
    return `threeWayNo${cap(SHAPES.find(s => !leaders.includes(s.id)).id)}`;
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

  let current = null;

  // Count an event in GoatCounter (shows under "Events" on the dashboard).
  // Does nothing if analytics is blocked or not loaded yet.
  function track(name) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: name, title: name, event: true });
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  $("reveal").addEventListener("click", () => {
    const pool = (window.FORTUNES && window.FORTUNES[readingKey()]) || [];
    const seed = hash(SHAPES.map(s => counts[s.id]).join("-"));
    current = pool.length ? pool[seed % pool.length] : "The stars are silent on this one. Try a different box.";

    const el = $("fortuneText");
    el.innerHTML = "";
    current.split(" ").forEach((word, i) => {
      const w = document.createElement("span");
      w.className = "w";
      w.textContent = word;
      w.style.animationDelay = `${0.25 + i * 0.07}s`;
      el.append(w, " ");
    });

    const box = $("fortune");
    box.hidden = false;
    if (!reduceMotion) {
      box.querySelector(".scroll").animate(
        [{ opacity: 0, transform: "scale(.85)", filter: "blur(8px)" }, { opacity: 1, transform: "scale(1)", filter: "blur(0)" }],
        { duration: 700, easing: "cubic-bezier(.2,.9,.3,1.1)" });
      sky.burst();
    }
    playReveal();
    track(`reveal-${readingKey()}`);
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("reset").addEventListener("click", () => {
    SHAPES.forEach(s => {
      counts[s.id] = 0;
      const card = grid.querySelector(`[data-shape="${s.id}"]`);
      card.querySelector(".count").textContent = "0";
      card.classList.remove("lit");
    });
    $("fortune").hidden = true;
    play(SUB_SOUNDS);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("share").addEventListener("click", async () => {
    if (!current) return;
    track("share");
    const message = `The nuggets have spoken: "${current}"\n${location.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Nuggs of Truth", text: message });
        return;
      }
      await navigator.clipboard.writeText(message);
      toast("Copied");
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("Couldn't share");
    }
  });

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("on"), 1800);
  }

  // ── Twinkling starfield with the occasional shooting star ──
  const sky = (() => {
    const canvas = $("sky");
    const c = canvas.getContext("2d");
    let w, h, stars = [], shooters = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
      const n = Math.round((innerWidth * innerHeight) / 2600);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rand(.3, 1.3) * dpr, p: rand(0, Math.PI * 2), s: rand(.5, 2),
      }));
    }

    function shoot(fast) {
      shooters.push({
        x: rand(0, w), y: rand(0, h * .5),
        vx: rand(6, 12) * dpr * (fast ? 1.5 : 1) * (Math.random() < .5 ? -1 : 1),
        vy: rand(2, 5) * dpr, life: 1,
      });
    }

    function frame(t) {
      c.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = reduceMotion ? .7 : .45 + .55 * Math.sin(t / 1000 * s.s + s.p);
        c.globalAlpha = Math.max(0, a);
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fill();
      }
      if (!reduceMotion && Math.random() < 0.004) shoot();
      shooters = shooters.filter(m => m.life > 0);
      for (const m of shooters) {
        const g = c.createLinearGradient(m.x, m.y, m.x - m.vx * 10, m.y - m.vy * 10);
        g.addColorStop(0, `rgba(255,248,220,${m.life})`);
        g.addColorStop(1, "rgba(255,248,220,0)");
        c.globalAlpha = 1;
        c.strokeStyle = g;
        c.lineWidth = 1.6 * dpr;
        c.beginPath();
        c.moveTo(m.x, m.y);
        c.lineTo(m.x - m.vx * 10, m.y - m.vy * 10);
        c.stroke();
        m.x += m.vx; m.y += m.vy; m.life -= 0.015;
      }
      requestAnimationFrame(frame);
    }

    addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
    return { burst: () => { for (let i = 0; i < 4; i++) setTimeout(() => shoot(true), i * 140); } };
  })();

  render();
})();
