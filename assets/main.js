{
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header background after scrolling */
  const header = document.querySelector('.site-header');
  const solidAlways = document.body.hasAttribute('data-solid');
  const setHeader = () => header.classList.toggle('solid', solidAlways || window.scrollY > 24);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  /* mobile menu */
  const burger = document.querySelector('.burger');
  burger.addEventListener('click', () => {
    const open = root.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => {
    root.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* reveal on scroll */
  const items = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    items.forEach(el => revealObserver.observe(el));
  } else {
    items.forEach(el => el.classList.add('in'));
  }

  /* figure lightbox */
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Enlarged figure');
  lb.innerHTML = '<img alt=""><p></p>';
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('p');
  const closeLb = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
  document.querySelectorAll('.fig .frame').forEach(frame => {
    frame.setAttribute('tabindex', '0');
    frame.setAttribute('role', 'button');
    const open = () => {
      const img = frame.querySelector('img');
      const cap = frame.parentElement.querySelector('figcaption');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = cap ? cap.textContent : '';
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    frame.addEventListener('click', open);
    frame.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  /* home: the aircraft turns as you scroll */
  const flight = document.querySelector('.flight');
  if (flight) {
    const stage = flight.querySelector('.flight-stage');
    const video = stage.querySelector('video');
    const copy = flight.querySelector('.flight-copy > .wrap');
    const endCap = flight.querySelector('.flight-end');
    const src = video.dataset.src;

    if (reduce) {
      stage.style.setProperty('--shift', '24vh');
      if (endCap) { endCap.style.opacity = '1'; endCap.style.transform = 'none'; }
      video.src = src;
      video.loop = true;
      video.play().catch(() => {});
      stage.classList.add('ready');
    } else {
      let target = 0, shown = 0, duration = 0, ticking = false;

      const HOLD = 0.2; // the title stays put for the first bit of scrolling
      const raw = () => {
        const r = flight.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        return Math.min(1, Math.max(0, -r.top / total));
      };
      const progress = () => Math.max(0, (raw() - HOLD) / (1 - HOLD));

      const render = () => {
        shown += (target - shown) * 0.14;
        if (Math.abs(target - shown) < 0.0005) shown = target;
        let behind = false;
        if (duration) {
          const t = shown * (duration - 0.05);
          behind = Math.abs(video.currentTime - t) > 0.01;
          if (behind && !video.seeking) video.currentTime = t;
        }
        const p = progress();
        const fade = Math.min(1, p / 0.4);
        copy.style.opacity = String(1 - fade);
        copy.style.transform = 'translateY(' + (-fade * 40) + 'px)';
        stage.style.setProperty('--shift', (24 * (1 - fade)).toFixed(2) + 'vh');
        if (endCap) {
          const e = Math.min(1, Math.max(0, (shown - 0.72) / 0.2));
          endCap.style.opacity = String(e);
          endCap.style.transform = 'translateY(' + (16 * (1 - e)) + 'px)';
        }
        if (shown !== target || behind) requestAnimationFrame(render); else ticking = false;
      };

      const onScroll = () => {
        target = progress();
        if (!ticking) { ticking = true; requestAnimationFrame(render); }
      };

      let started = false;
      const ready = () => {
        if (started || !video.duration) return;
        started = true;
        duration = video.duration;
        try { video.currentTime = 0.001; } catch (e) {}
        stage.classList.add('ready');
        onScroll();
      };
      const start = url => {
        video.preload = 'auto';
        video.muted = true;
        video.setAttribute('muted', '');
        video.src = url;
        ['loadedmetadata', 'loadeddata', 'canplay'].forEach(ev => video.addEventListener(ev, ready));
        video.load();
        /* phones (iOS Safari) only decode frames after the video has played once */
        const p = video.play();
        if (p && p.then) p.then(() => { video.pause(); ready(); }).catch(() => {});
      };

      fetch(src).then(r => r.blob()).then(b => start(URL.createObjectURL(b))).catch(() => start(src));
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  }
}

/* ---------- section animations ---------- */
{
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onView = (el, fn, opts) => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const viewObserver = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { fn(); viewObserver.disconnect(); } });
    }, opts || { threshold: 0.35 });
    viewObserver.observe(el);
  };

  /* numbers count up each time the row comes into view */
  const counters = [...document.querySelectorAll('[data-count]')];
  const statsRow = document.querySelector('.stats');
  if (counters.length && statsRow && !reduce && 'IntersectionObserver' in window) {
    const fmt = (el, v) => { el.textContent = v.toFixed((el.dataset.count.split('.')[1] || '').length); };
    const run = () => counters.forEach((el, i) => {
      const to = parseFloat(el.dataset.count);
      const from = el.dataset.from ? parseFloat(el.dataset.from) : 0;
      fmt(el, from);
      const t0 = performance.now() + 250 + i * 120, dur = 1800;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur));
        fmt(el, from + (to - from) * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    counters.forEach(el => fmt(el, el.dataset.from ? parseFloat(el.dataset.from) : 0));
    let seen = false;
    const countObserver = new IntersectionObserver(es => {
      es.forEach(en => {
        if (en.isIntersecting && !seen) { seen = true; run(); }
        else if (!en.isIntersecting) { seen = false; }
      });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0.4 });
    countObserver.observe(statsRow);
  }

  /* motor layout bars grow into place */
  const bars = document.querySelector('.bars');
  if (bars) {
    const fill = () => bars.querySelectorAll('.bar').forEach((b, i) => {
      const f = b.querySelector('.fill');
      setTimeout(() => { f.style.width = b.dataset.w + '%'; }, reduce ? 0 : i * 90);
    });
    onView(bars, fill);
  }

  /* mission profile is flown as you scroll */
  const profile = document.querySelector('.profile');
  if (profile) {
    const charts = [...profile.querySelectorAll('svg')].map(svg => ({
      svg,
      flown: svg.querySelector('.flown-path'),
      plane: svg.querySelector('.plane'),
      halo: svg.querySelector('.halo'),
      segs: [...svg.querySelectorAll('.seg')],
      len: 0
    }));
    const draw = p => {
      charts.forEach(c => {
        if (!c.svg.getBoundingClientRect().width) return;
        if (!c.len) { c.len = c.flown.getTotalLength(); c.flown.style.strokeDasharray = c.len; }
        c.flown.style.strokeDashoffset = String(c.len * (1 - p));
        const pt = c.flown.getPointAtLength(c.len * p);
        c.plane.setAttribute('cx', pt.x); c.plane.setAttribute('cy', pt.y);
        c.halo.setAttribute('cx', pt.x); c.halo.setAttribute('cy', pt.y);
        c.segs.forEach(s => s.classList.toggle('on', p >= parseFloat(s.dataset.at)));
      });
    };
    if (reduce) { draw(1); window.addEventListener('resize', () => draw(1)); }
    else {
      let queued = false;
      const update = () => {
        queued = false;
        const r = profile.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.85 - vh * 0.2 + r.height * 0.2)));
        draw(p);
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      update();
    }
  }

  /* one design picked out of a thousand */
  const dotsBox = document.querySelector('.dots');
  if (dotsBox) {
    const c = dotsBox.querySelector('canvas');
    const ctx = c.getContext('2d');
    const cols = 40, rows = 25, chosen = 13 * cols + 27;
    const born = Array.from({ length: cols * rows }, () => Math.random() * 900);
    let start = null, w = 0, h = 0;
    const size = () => {
      const r = dotsBox.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height; c.width = Math.round(w * d); c.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const paint = now => {
      const t = start === null ? 1e9 : now - start;
      ctx.clearRect(0, 0, w, h);
      const gx = w / cols, gy = h / rows, r = Math.min(gx, gy) * 0.2;
      const dim = Math.min(1, Math.max(0, (t - 1300) / 900));
      for (let i = 0; i < cols * rows; i++) {
        const x = (i % cols + 0.5) * gx, y = (Math.floor(i / cols) + 0.5) * gy;
        const a = Math.min(1, Math.max(0, (t - born[i]) / 300));
        if (i === chosen) continue;
        ctx.globalAlpha = a * (0.85 - 0.65 * dim);
        ctx.fillStyle = '#9aa1aa';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
      const x = (chosen % cols + 0.5) * gx, y = (Math.floor(chosen / cols) + 0.5) * gy;
      ctx.globalAlpha = 1;
      ctx.fillStyle = dim > 0 ? '#e0362c' : '#9aa1aa';
      ctx.beginPath(); ctx.arc(x, y, r * (1 + 1.2 * dim), 0, 6.2832); ctx.fill();
      if (dim > 0) {
        ctx.globalAlpha = 0.5 * dim; ctx.strokeStyle = '#e0362c'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, r * (1 + 1.2 * dim) + 7 * dim, 0, 6.2832); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (t < 2400) requestAnimationFrame(paint);
    };
    size(); paint(0);
    window.addEventListener('resize', () => { size(); paint(performance.now()); });
    if (!reduce) onView(dotsBox, () => { start = performance.now(); requestAnimationFrame(paint); }, { threshold: 0.5 });
  }

  /* the design-space animation plays each time it comes into view */
  const mlv = document.querySelector('.mlvid video');
  if (mlv) {
    if (reduce) {
      mlv.addEventListener('loadedmetadata', () => { mlv.currentTime = mlv.duration - 0.05; }, { once: true });
      mlv.load();
    } else if ('IntersectionObserver' in window) {
      const mlObserver = new IntersectionObserver(es => {
        es.forEach(e => {
          if (e.isIntersecting) { mlv.currentTime = 0; mlv.play().catch(() => {}); }
          else mlv.pause();
        });
      }, { threshold: 0.6 });
      mlObserver.observe(mlv);
    }
  }

  /* project: the figure on the left follows the stage you are reading */
  const steps = document.querySelectorAll('.step');
  const stackImgs = document.querySelectorAll('.steps .stack img');
  const counter = document.querySelector('.steps .count');
  const stack = document.querySelector('.steps .stack');
  if (steps.length && stackImgs.length) {
    let current = -1, queued = false;
    const setActive = i => {
      if (i === current) return;
      current = i;
      steps.forEach((s, j) => s.classList.toggle('on', j === i));
      stackImgs.forEach((img, j) => img.classList.toggle('on', j === i));
      stack.classList.toggle('dark', stackImgs[i].classList.contains('photo'));
      if (counter) counter.textContent = 'Stage ' + (i + 1) + ' of ' + steps.length;
    };
    const pick = () => {
      queued = false;
      const mid = window.innerHeight / 2;
      let best = 0, bestD = Infinity;
      steps.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      setActive(best);
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    pick();
  }
}
