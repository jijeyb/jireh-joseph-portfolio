/* Jireh Joseph — site behavior (v2). No dependencies. */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/* ---- Loader: load → gather → pulse → open ---------------------------------
   1. A line fills with real progress (fonts, the hero portrait, page load),
      never faster than ~1.4s so the sequence reads; capped at 6s.
   2. At 100 the line gathers into a centre dot (ease-in-out, it moves on screen).
   3. The dot pulses out two rings (ease-out).
   4. The black opens as a growing circle from the dot; the hero's own entrance
      (portrait rise, name writing) starts as it opens.
   Reduced motion: the counter still runs, then the black simply fades.     */
(() => {
  const root = document.documentElement;
  const loader = document.querySelector('[data-loader]');
  if (!loader) return;
  if (!root.classList.contains('is-loading')) { loader.remove(); return; }
  const fill = loader.querySelector('[data-loader-fill]');
  const count = loader.querySelector('[data-loader-count]');
  const line = loader.querySelector('.loader__line');
  const dot = loader.querySelector('.loader__dot');
  const rings = [...loader.querySelectorAll('.loader__ring')];
  const texts = [...loader.querySelectorAll('.loader__name, .loader__label, .loader__count')];
  const still = reducedMotion.matches;
  const MIN = still ? 700 : 1400; const MAX = 6000;
  const inOut = 'cubic-bezier(.77, 0, .175, 1)'; const out = 'cubic-bezier(.23, 1, .32, 1)';

  // Real progress: fonts 30%, hero portrait 40%, everything else 30%.
  let real = 0;
  const part = (weight) => { let done = false; return () => { if (!done) { done = true; real = Math.min(1, real + weight); } }; };
  const fonts = part(.3); const portrait = part(.4); const page = part(.3);
  if (document.fonts?.ready) document.fonts.ready.then(fonts, fonts); else fonts();
  const img = document.querySelector('.hero__portrait img');
  if (!img || (img.complete && img.naturalWidth)) portrait(); else { img.addEventListener('load', portrait, { once: true }); img.addEventListener('error', portrait, { once: true }); }
  if (document.readyState === 'complete') page(); else window.addEventListener('load', page, { once: true });

  const done = () => {
    try { sessionStorage.setItem('jj-entered', '1'); } catch {}
    loader.remove();
  };

  const open = () => {
    loader.classList.add('is-open');
    root.classList.remove('is-loading'); // scrolling and the hero's entrance resume now
    if (still) { loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease', fill: 'forwards' }).finished.then(done); return; }
    const max = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40;
    const t0 = performance.now(); const D = 950;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / D);
      const e = t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
      const r = (e * max).toFixed(1);
      const mask = `radial-gradient(circle at 50% 50%, transparent ${r}px, #000 ${(+r + 1).toFixed(1)}px)`;
      loader.style.webkitMaskImage = mask; loader.style.maskImage = mask;
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  };

  const finish = () => {
    if (still) { setTimeout(open, 150); return; }
    texts.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: out, fill: 'forwards' }));
    // Gather: the line pulls into the centre…
    line.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 450, easing: inOut, fill: 'forwards' });
    // …becomes a dot…
    dot.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.25)', offset: .55 }, { transform: 'scale(1)' }], { duration: 420, delay: 340, easing: out, fill: 'forwards' });
    // …which pulses out two rings, then the black opens from it.
    rings.forEach((ring, i) => ring.animate([{ transform: 'scale(.03)', opacity: .9 }, { transform: 'scale(1)', opacity: 0 }], { duration: 1000, delay: 620 + i * 160, easing: out, fill: 'forwards' }));
    setTimeout(open, 860);
  };

  const t0 = performance.now(); let shown = 0;
  const tick = (now) => {
    const elapsed = now - t0;
    const goal = elapsed > MAX ? 1 : Math.min(real, elapsed / MIN, 1);
    shown += (goal - shown) * .14;
    if (goal - shown < .003) shown = goal;
    fill.style.transform = `scaleX(${shown.toFixed(4)})`;
    count.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    if (shown >= 1) finish(); else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ---- Navigation rail: sliding indicator + scroll spy ------------------- */
(() => {
  const rail = document.querySelector('.rail');
  if (!rail) return;
  const indicator = rail.querySelector('.rail__indicator');
  const links = [...rail.querySelectorAll('.rail__link')];
  const horizontal = window.matchMedia('(max-width: 1023px)');
  let current = links[0];

  const place = (link) => {
    if (!link) return;
    current = link;
    links.forEach((item) => {
      if (item === link) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
    // Offsets are relative to the rail; the indicator itself sits at a 6px inset.
    indicator.style.setProperty('--indicator-x', `${link.offsetLeft - 6}px`);
    indicator.style.setProperty('--indicator-y', `${link.offsetTop - 6}px`);
  };

  links.forEach((link) => link.addEventListener('click', () => place(link)));
  horizontal.addEventListener('change', () => place(current));
  window.addEventListener('resize', () => place(current), { passive: true });

  // Highlight the section that crosses the middle band of the viewport.
  const sections = links
    .map((link) => document.getElementById(link.dataset.spy))
    .filter(Boolean);
  const byId = new Map(links.map((link) => [link.dataset.spy, link]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) place(byId.get(entry.target.id)); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((section) => observer.observe(section));
  // Lead-ins that belong to a section (the ink drop before About) light up its link too.
  document.querySelectorAll('[data-spy-for]').forEach((el) => { byId.set(el.id = el.id || `${el.dataset.spyFor}-intro`, byId.get(el.dataset.spyFor)); observer.observe(el); });

  // Pages without spy sections (the archive) preset aria-current in the markup.
  place(links.find((link) => link.getAttribute('aria-current') === 'true') || links[0]);
})();

/* ---- Hero: layered pointer parallax on one spring ---------------------- */
(() => {
  const hero = document.querySelector('[data-hero]');
  const portrait = hero?.querySelector('[data-portrait]');
  const portraitImage = portrait?.querySelector('img');
  if (!hero || !portrait || !portraitImage) return;

  // data-depth = pixels at full cursor offset. Negative layers sit behind the pivot
  // and drift against the cursor. `translate` is used so entry animations keep `transform`.
  const layers = [...hero.querySelectorAll('[data-depth]')].map((element) => ({ element, depth: parseFloat(element.dataset.depth) || 0 }));
  const spring = { stiffness: 150, damping: 21 }; // damping ratio ~0.86: no wobble
  const state = { x: 0, y: 0, lift: 0, vx: 0, vy: 0, vlift: 0, tx: 0, ty: 0, tlift: 0 };
  let frame;
  let last;

  // Scroll zoom: while the pinned hero scrolls past, the portrait grows toward the
  // viewer and the name falls back. p runs 0 → 1 across the extra pinned height.
  const pin = hero.querySelector('.hero__pin');
  const title = hero.querySelector('.hero__title');
  const fading = [...hero.querySelectorAll('.hero__statement, .hero__actions, .hero__horizon > p')];
  let p = 0;
  const readScroll = () => {
    const pinned = pin && getComputedStyle(pin).position === 'sticky';
    if (!pinned) { p = 0; return; }
    const rect = hero.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    p = travel > 0 ? Math.max(0, Math.min(1, -rect.top / travel)) : 0;
  };

  // One writer for every hero transform, so pointer and scroll never fight.
  const apply = () => {
    const ease = p * p * (3 - 2 * p); // smoothstep: gentle start and finish
    const lift = window.innerHeight * .1 * ease;
    layers.forEach(({ element, depth }) => {
      const scrollY = element === title ? -lift * 1.4 : 0;
      element.style.translate = `${(state.x * depth).toFixed(2)}px ${(state.y * depth * .55 + scrollY).toFixed(2)}px`;
    });
    title.style.opacity = (1 - ease * .82).toFixed(3);
    portrait.style.translate = `${(state.x * 16).toFixed(2)}px ${(state.y * 10 - lift * .35).toFixed(2)}px`;
    portrait.style.scale = (1 + ease * .32).toFixed(4);
    fading.forEach((element) => { element.style.opacity = Math.max(0, 1 - p * 2.6).toFixed(3); });
    portraitImage.style.transform = `rotateX(${(state.y * -5).toFixed(3)}deg) rotateY(${(state.x * 6).toFixed(3)}deg) scale(${(1 + state.lift * .02).toFixed(4)})`;
  };

  let scrollFrame;
  const onScroll = () => {
    scrollFrame ??= requestAnimationFrame(() => { scrollFrame = undefined; readScroll(); apply(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  const step = (target, value, velocity, dt) => {
    velocity += ((target - value) * spring.stiffness - velocity * spring.damping) * dt;
    return [value + velocity * dt, velocity];
  };

  const render = (time) => {
    const dt = Math.min((time - (last ?? time)) / 1000, .032);
    last = time;
    [state.x, state.vx] = step(state.tx, state.x, state.vx, dt);
    [state.y, state.vy] = step(state.ty, state.y, state.vy, dt);
    [state.lift, state.vlift] = step(state.tlift, state.lift, state.vlift, dt);

    apply();
    const settled = [state.tx - state.x, state.ty - state.y, state.tlift - state.lift, state.vx, state.vy, state.vlift].every((v) => Math.abs(v) < .002);
    if (settled) { frame = undefined; last = undefined; } else { frame = requestAnimationFrame(render); }
  };
  const queue = () => { frame ??= requestAnimationFrame(render); };

  const clamp = (v) => Math.max(-1, Math.min(1, v));
  const onMove = (event) => {
    if (event.pointerType === 'touch') return;
    const rect = portrait.getBoundingClientRect();
    state.tx = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
    state.ty = clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
    state.tlift = portraitImage.contains(event.target) ? 1 : 0;
    queue();
  };
  const onLeave = () => { state.tx = 0; state.ty = 0; state.tlift = 0; queue(); };

  const sync = () => {
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    onLeave();
    if (!finePointer.matches || reducedMotion.matches) return;
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
  };
  sync();
  onScroll(); // a reload mid-page should land in the right zoom state
  finePointer.addEventListener('change', sync);
  reducedMotion.addEventListener('change', sync);
})();

/* ---- Helpers ----------------------------------------------------------- */
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arrowIcon = '<svg class="tile__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

/* ---- Covers --------------------------------------------------------------
   Four kinds, picked from the data so every card gets a deliberate frame:
   case   → case studies: headline result + the numbered flow or a screenshot
   board  → tall presentation boards: framed at the top, scroll through on hover
   video  → poster image; a muted preview plays while hovered
   image  → plain cover image                                                  */
const coverKind = (p) => {
  if (p.discipline !== 'design') return 'case';
  if (p.cover.video) return 'video';
  return p.cover.h / p.cover.w > 1.5 ? 'board' : 'image';
};
// Card width relative to its height in the horizontal rail.
const coverRatio = (p, kind) => {
  if (kind === 'case') return 1.3;
  if (kind === 'board') return .82;
  const r = p.cover.w / p.cover.h;
  return r > 1.2 ? 1.5 : r < .9 ? .8 : 1;
};

const imageHTML = (cover, extra = '') => {
  const style = [cover.focus ? `object-position:${cover.focus}` : '', cover.bg ? `background:${cover.bg}` : ''].filter(Boolean).join(';');
  return `<img src="${esc(cover.src)}" alt="" width="${cover.w}" height="${cover.h}" loading="lazy" decoding="async"${extra}${style ? ` style="${style}"` : ''} />`;
};

const caseHTML = (p) => {
  const stat = p.results?.[0];
  const flow = p.cover.diagram
    ? `<ol class="case__flow">${p.cover.diagram.map((step, i) => `<li style="--i:${i}"><span>${String(i + 1).padStart(2, '0')}</span>${esc([].concat(step).join(' + '))}</li>`).join('')}</ol>`
    : `<span class="case__shot">${imageHTML(p.cover, ' data-drift')}</span>`;
  return `<span class="case" aria-hidden="true">
      <span class="case__head"><span>${p.discipline === 'ai' ? 'AI system' : 'Automation'}</span><span>Case study</span></span>
      ${stat ? `<span class="case__stat"><strong>${esc(stat.value)}</strong><span>${esc(stat.label)}</span></span>` : ''}
      ${flow}
    </span>`;
};

const coverHTML = (p, kind) => {
  if (kind === 'case') return caseHTML(p);
  if (kind === 'board') return `<span class="board">${imageHTML(p.cover)}</span>`;
  if (kind === 'video') return `${imageHTML(p.cover, ' data-drift')}<video muted loop playsinline preload="none" aria-hidden="true" tabindex="-1" data-drift><source src="${esc(p.cover.video)}" type="video/mp4" /></video>`;
  return imageHTML(p.cover, ' data-drift');
};

const tagsHTML = (p) => `<span class="tile__tags" aria-hidden="true">${(p.tools || []).slice(0, 3).map((t, i) => `<span class="tile__tag"><span style="--i:${i}">${esc(t)}</span></span>`).join('')}</span>`;

/* ---- Work grid + filters ------------------------------------------------ */
const workGrid = document.querySelector('[data-work-grid]');
const projects = window.PROJECTS || [];
const scoped = workGrid?.dataset.scope === 'featured' ? projects.filter((p) => p.featured) : projects;

const layoutTiles = () => {
  // Archive grid rhythm: wide, narrow, narrow, wide… on the visible tiles only.
  // Every visible card also gets its running number (01, 02…).
  const pattern = ['wide', 'narrow', 'narrow', 'wide'];
  const visible = [...workGrid.children].filter((tile) => !tile.hidden);
  visible.forEach((tile, index) => {
    tile.dataset.size = pattern[index % 4];
    const n = tile.querySelector('.tile__index');
    if (n) n.textContent = String(index + 1).padStart(2, '0');
  });
  workGrid.dispatchEvent(new CustomEvent('layout', { detail: visible.length }));
};

if (workGrid && scoped.length) {
  workGrid.innerHTML = scoped.map((p) => {
    const kind = coverKind(p);
    return `
    <li class="tile" data-discipline="${esc(p.discipline)}" data-cover="${kind}" style="--ratio:${coverRatio(p, kind)}" data-reveal>
      <a class="tile__link" href="projects.html#${esc(p.id)}" data-open="${esc(p.id)}">
        <span class="tile__top" aria-hidden="true"><span class="tile__index"></span><span>${esc(p.kind)}</span></span>
        <span class="tile__media">${coverHTML(p, kind)}${kind === 'case' ? '' : tagsHTML(p)}</span>
        <span class="tile__caption">
          <h3 class="tile__title"><span class="roll"><span>${esc(p.title)}</span><span class="outline" aria-hidden="true">${esc(p.title)}</span></span></h3>
          <span class="tile__meta">${esc(p.tagline)}</span>
          ${arrowIcon}
        </span>
      </a>
    </li>`;
  }).join('');
  layoutTiles();

  // Hover previews: video covers play muted only while the card is hovered.
  workGrid.querySelectorAll('.tile[data-cover="video"]').forEach((tile) => {
    const video = tile.querySelector('video');
    tile.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return;
      video.play().then(() => tile.classList.add('is-playing')).catch(() => {});
    });
    tile.addEventListener('pointerleave', () => { video.pause(); tile.classList.remove('is-playing'); });
  });

  const filters = [...document.querySelectorAll('[data-filter]')];
  filters.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.filter;
    const apply = () => {
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      [...workGrid.children].forEach((tile) => { tile.hidden = value !== 'all' && tile.dataset.discipline !== value; tile.classList.add('is-in'); });
      layoutTiles();
    };
    // View Transitions morph tiles into their new places where supported; otherwise swap instantly.
    if (document.startViewTransition && !reducedMotion.matches) document.startViewTransition(apply); else apply();
  }));
}

/* ---- Work rail: vertical scroll drives the projects sideways ------------
   Desktop: the section is made as tall as the sideways travel, its frame is
   pinned (sticky), and scroll progress maps to the track's x position, eased
   toward the target each frame. It is direct manipulation (it only moves while
   you scroll), so it stays on under reduced motion, just without easing or drift.
   Below 1024px the same track is a native swipe carousel with scroll snap.   */
(() => {
  const section = document.querySelector('[data-work]');
  const viewport = section?.querySelector('[data-work-viewport]');
  const track = viewport?.querySelector('[data-work-grid]');
  if (!section || !track || !track.children.length) return;
  const wide = window.matchMedia('(min-width: 1024px)');
  const currentLabel = section.querySelector('[data-work-current]');
  const totalLabel = section.querySelector('[data-work-total]');
  const bar = section.querySelector('[data-work-bar]');
  const docTop = (el) => { let top = 0; for (let n = el; n; n = n.offsetParent) top += n.offsetTop; return top; };

  // Vertical scroll needed per pixel of sideways travel: higher = calmer, one card at a time.
  const SLOW = 2.2;
  let pinned = false; let distance = 0; let start = 0; let x = 0; let target = 0; let frame; let last; let idle;
  let cards = [];

  const measure = () => {
    pinned = wide.matches;
    section.classList.toggle('is-pinned', pinned);
    cards = [...track.children].filter((tile) => !tile.hidden).map((tile) => ({ tile, drift: tile.querySelectorAll('[data-drift]'), left: tile.offsetLeft, width: tile.offsetWidth }));
    if (totalLabel) totalLabel.textContent = String(cards.length).padStart(2, '0');
    if (!pinned) { section.style.height = ''; track.style.translate = ''; cards.forEach(({ drift }) => drift.forEach((el) => { el.style.translate = ''; })); return; }
    distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
    // Extra 12vh at the end holds the last card for a beat before the page moves on.
    section.style.height = `${Math.round(window.innerHeight * 1.12 + distance * SLOW)}px`;
    start = docTop(section);
    readScroll();
    x = target;
  };

  const readScroll = () => {
    const p = distance ? Math.max(0, Math.min(1, (window.scrollY - start) / (distance * SLOW))) : 0;
    target = p * distance;
  };

  const paint = () => {
    track.style.translate = `${(-x).toFixed(2)}px 0`;
    const vw = viewport.clientWidth;
    let current = 0;
    cards.forEach(({ tile, drift, left, width }, i) => {
      const screenLeft = left - x;
      if (screenLeft <= cards[0].left + 12) current = i; // the card at the front of the row
      if (reducedMotion.matches || screenLeft > vw || screenLeft + width < 0) return;
      // -1 entering on the right → 1 leaving on the left; the picture lags behind its frame.
      const t = ((screenLeft + width / 2) - vw / 2) / (vw / 2 + width / 2);
      drift.forEach((el) => { el.style.translate = `${(t * 7).toFixed(2)}% 0`; });
    });
    if (distance && x >= distance - 1) current = cards.length - 1; // the end reads 10 / 10
    if (currentLabel) currentLabel.textContent = String(current + 1).padStart(2, '0');
    if (bar) bar.style.scale = `${distance ? (x / distance).toFixed(4) : 0} 1`;
  };

  const tick = (time) => {
    const dt = Math.min((time - (last ?? time)) / 1000, .05);
    last = time;
    const follow = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 9); // frame-rate independent ease
    x += (target - x) * follow;
    if (Math.abs(target - x) < .3) x = target;
    paint();
    if (x !== target) frame = requestAnimationFrame(tick); else { frame = undefined; last = undefined; }
  };
  const queue = () => { if (!pinned) return; readScroll(); frame ??= requestAnimationFrame(tick); };

  // Keyboard: focusing a card that sits off to the side scrolls the page to it.
  track.addEventListener('focusin', (event) => {
    if (!pinned) return;
    const tile = event.target.closest('.tile');
    const card = cards.find((c) => c.tile === tile);
    if (!card) return;
    const vw = viewport.clientWidth;
    if (card.left - x >= 0 && card.left - x + card.width <= vw) return;
    const goal = Math.max(0, Math.min(distance, card.left - (vw - card.width) / 2));
    window.scrollTo({ top: start + goal * SLOW, behavior: 'instant' });
    readScroll(); x = target; paint();
  });

  // Phones: update the counter as the carousel is swiped.
  viewport.addEventListener('scroll', () => {
    if (pinned) return;
    const i = cards.findIndex(({ left, width }) => left + width / 2 > viewport.scrollLeft + 1);
    if (currentLabel) currentLabel.textContent = String(Math.max(0, i) + 1).padStart(2, '0');
    if (bar) bar.style.scale = `${(viewport.scrollLeft / Math.max(1, viewport.scrollWidth - viewport.clientWidth)).toFixed(4)} 1`;
  }, { passive: true });

  // Filtering changes the track length: re-measure and return to the first card.
  track.addEventListener('layout', () => {
    requestAnimationFrame(() => {
      measure();
      if (pinned && window.scrollY > start) window.scrollTo({ top: start, behavior: 'instant' });
      viewport.scrollLeft = 0;
      readScroll(); x = target; paint();
    });
  });

  // When scrolling stops inside the rail, glide on to the next card in the
  // direction you were scrolling, so one wheel click moves exactly one card.
  let lastY = window.scrollY; let dir = 0; let gliding = false;
  const settle = () => {
    if (gliding) { gliding = false; dir = 0; return; } // our own glide just finished: stay on this card
    if (!pinned || !distance || !cards.length) return;
    const y = window.scrollY; const end = start + distance * SLOW;
    if (y <= start + 2 || y >= end - 2) return;
    const now = ((y - start) / (distance * SLOW)) * distance;
    const first = cards[0].left;
    const stops = [...new Set(cards.map((c) => Math.min(distance, Math.round(c.left - first))))];
    let goal;
    if (dir > 0) goal = stops.find((v) => v > now + 2);
    else if (dir < 0) goal = [...stops].reverse().find((v) => v < now - 2);
    if (goal === undefined) goal = stops.reduce((a, v) => (Math.abs(v - now) < Math.abs(a - now) ? v : a));
    if (Math.abs(goal - now) < 3) return;
    gliding = true;
    window.scrollTo({ top: Math.round(start + goal * SLOW), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  window.addEventListener('scroll', () => {
    queue();
    const y = window.scrollY;
    if (!gliding && y !== lastY) dir = Math.sign(y - lastY);
    lastY = y;
    clearTimeout(idle); idle = setTimeout(settle, 160);
  }, { passive: true });
  window.addEventListener('resize', () => { measure(); paint(); }, { passive: true });
  window.addEventListener('load', () => { measure(); paint(); });
  wide.addEventListener('change', () => { measure(); paint(); });
  measure();
  paint();
})();

/* ---- Project viewer ----------------------------------------------------- */
(() => {
  const viewer = document.querySelector('[data-viewer]');
  if (!viewer || !projects.length) return;
  const body = viewer.querySelector('[data-viewer-body]');
  const count = viewer.querySelector('[data-viewer-count]');
  let list = [];
  let index = 0;
  let opener = null;

  const mediaHTML = (m) => m.type === 'video'
    ? `<figure><video controls playsinline preload="none" poster="${esc(m.poster)}" width="${m.w}" height="${m.h}" aria-label="${esc(m.alt)}"${m.h > m.w ? ' data-portrait' : ''}><source src="${esc(m.src)}" type="video/mp4" /></video></figure>`
    : `<figure><img src="${esc(m.src)}" alt="${esc(m.alt)}" width="${m.w}" height="${m.h}" loading="lazy" decoding="async" /></figure>`;

  const render = (p) => {
    const flow = p.flow ? `<div class="viewer__block"><h3>${p.discipline === 'design' ? 'What I made' : 'How it works'}</h3><ol class="viewer__flow">${p.flow.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : '';
    const problem = p.problem ? `<div class="viewer__block"><h3>The problem</h3><p>${esc(p.problem)}</p></div>` : '';
    const results = p.results ? `<div class="viewer__block"><h3>Results</h3><div class="viewer__results">${p.results.map((r) => `<p><strong>${esc(r.value)}</strong><span>${esc(r.label)}</span></p>`).join('')}</div></div>` : '';
    const tools = p.tools ? `<div class="viewer__block"><h3>Tools</h3><ul class="viewer__tools">${p.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
    const link = p.link ? `<a class="text-link" href="${esc(p.link.href)}" target="_blank" rel="noreferrer"><span>${esc(p.link.label)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>` : '';
    body.innerHTML = `
      <div class="viewer__text">
        <p class="viewer__kind">${esc(p.kind)}</p>
        <h2 class="viewer__title" id="viewer-title">${esc(p.title)}</h2>
        <p class="viewer__summary">${esc(p.summary)}</p>
        ${problem}${flow}${results}${tools}${link}
      </div>
      <div class="viewer__media">${p.media.map(mediaHTML).join('')}</div>`;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    viewer.scrollTop = 0;
    history.replaceState(null, '', `#${p.id}`);
  };

  const pauseMedia = () => viewer.querySelectorAll('video').forEach((v) => v.pause());

  const show = (next) => {
    const dir = next > index ? 1 : -1;
    index = (next + list.length) % list.length;
    pauseMedia();
    if (reducedMotion.matches || !viewer.open) { render(list[index]); return; }
    // Sideways, like the work rail: out against the direction of travel, in from the other side.
    body.style.setProperty('--swap-x', `${dir * -40}px`);
    body.classList.add('is-swapping');
    setTimeout(() => {
      render(list[index]);
      body.style.transition = 'none';
      body.style.setProperty('--swap-x', `${dir * 40}px`);
      void body.offsetWidth; // commit the start position before animating in
      body.style.transition = '';
      body.classList.remove('is-swapping');
    }, 180);
  };

  const open = (id, trigger) => {
    // Navigate within what the visitor is looking at (respects the active filter).
    const visible = workGrid ? [...workGrid.children].filter((t) => !t.hidden).map((t) => t.querySelector('[data-open]').dataset.open) : [];
    list = (visible.length ? visible : projects.map((p) => p.id)).map((pid) => projects.find((p) => p.id === pid)).filter(Boolean);
    index = Math.max(0, list.findIndex((p) => p.id === id));
    opener = trigger || null;
    render(list[index]);
    document.documentElement.classList.add('is-locked');
    viewer.showModal();
    viewer.querySelector('[data-viewer-close]').focus();
  };

  const close = () => {
    if (!viewer.open) return;
    pauseMedia();
    const finish = () => {
      viewer.classList.remove('is-closing');
      viewer.close();
      document.documentElement.classList.remove('is-locked');
      history.replaceState(null, '', location.pathname + location.search);
      opener?.focus();
    };
    if (reducedMotion.matches) { finish(); return; }
    viewer.classList.add('is-closing');
    setTimeout(finish, 180);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open]');
    if (!trigger) return;
    event.preventDefault();
    open(trigger.dataset.open, trigger);
  });
  viewer.querySelector('[data-viewer-prev]').addEventListener('click', () => show(index - 1));
  viewer.querySelector('[data-viewer-next]').addEventListener('click', () => show(index + 1));
  viewer.querySelector('[data-viewer-close]').addEventListener('click', close);
  viewer.addEventListener('cancel', (event) => { event.preventDefault(); close(); }); // Esc animates out too
  viewer.addEventListener('keydown', (event) => {
    if (event.target.closest('video, input, textarea')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
  });

  // Deep link: /#kain or projects.html#kain opens that project.
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (projects.some((p) => p.id === fromHash)) open(fromHash);
})();

/* ---- Scroll reveals ----------------------------------------------------- */
(() => {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  items.forEach((el) => io.observe(el));
})();

/* ---- Client ticker: duplicate the set for a seamless loop, pause off-screen */
(() => {
  const ticker = document.querySelector('[data-ticker]');
  const set = ticker?.querySelector('.ticker__set');
  if (!set) return;
  const clone = set.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
  ticker.append(clone);
  const sets = ticker.querySelectorAll('.ticker__set');
  // WCAG 2.2.2: moving content needs a pause control that works without a mouse.
  const toggle = document.querySelector('[data-ticker-toggle]');
  toggle?.addEventListener('click', () => {
    const paused = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Play' : 'Pause';
    ticker.classList.toggle('is-paused', paused);
  });
  new IntersectionObserver(([entry]) => {
    sets.forEach((s) => { s.style.animationPlayState = entry.isIntersecting ? '' : 'paused'; });
  }).observe(ticker);
})();

/* ---- About: the portrait frame follows the step in view ------------------ */
(() => {
  const frames = [...document.querySelectorAll('[data-frames] img')];
  const steps = document.querySelectorAll('[data-frame-step]');
  if (!frames.length || !steps.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const n = Number(entry.target.dataset.frameStep);
      frames.forEach((img, i) => img.classList.toggle('is-on', i === n));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach((step) => io.observe(step));
})();

/* ---- Copy email --------------------------------------------------------- */
document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copy); } catch { return; }
    button.textContent = 'Copied';
    button.classList.add('is-done');
    setTimeout(() => { button.textContent = 'Copy'; button.classList.remove('is-done'); }, 1600);
  });
});

/* ---- Contact form ------------------------------------------------------- */
(() => {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[type="submit"]');
  const label = form.querySelector('[data-submit-label]');
  const EMAIL = 'jijey.deezigns@gmail.com';
  const messages = {
    name: 'Add your name so I know who I am talking to.',
    email: 'Add an email address I can reply to, like name@company.com.',
    message: 'Tell me a little about the project, even one sentence helps.',
  };

  const check = (field) => {
    const error = form.querySelector(`#${field.id}-err`);
    let text = '';
    if (field.validity.valueMissing) text = messages[field.name];
    else if (field.validity.typeMismatch) text = messages.email;
    field.setAttribute('aria-invalid', String(Boolean(text)));
    if (error) error.textContent = text;
    return !text;
  };
  const fields = [...form.querySelectorAll('input[required], textarea[required]')];
  fields.forEach((field) => {
    field.addEventListener('blur', () => { if (field.value) check(field); });
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') check(field); });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const invalid = fields.filter((field) => !check(field));
    if (invalid.length) { invalid[0].focus(); status.textContent = ''; return; }
    const data = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;

    if (!endpoint) {
      // No form service yet: hand the visitor a ready-to-send email instead.
      const subject = `Project inquiry: ${data.service}`;
      const bodyText = `Hi Jireh,\n\n${data.message}\n\n${data.name}\n${data.email}`;
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      status.textContent = `Your email app should open with the message ready to send. If nothing opens, email ${EMAIL} directly.`;
      return;
    }

    submit.setAttribute('aria-busy', 'true');
    label.textContent = 'Sending…';
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      status.textContent = `Thanks, ${data.name}. Your message is on its way.`;
    } catch {
      status.textContent = `That did not send. Check your connection and try again, or email ${EMAIL} directly.`;
    } finally {
      submit.removeAttribute('aria-busy');
      label.textContent = 'Send message';
    }
  });
})();

/* ---- Ink drop: falls, splashes, ripples, floods the screen black ---------
   Every phase is a slice of scroll progress p (0 → 1 across the pinned stage),
   so scrolling back up rewinds it. Eased toward the scroll each frame; under
   reduced motion it tracks the scroll exactly (it only moves while you scroll).
     0   – .20  the drop falls, stretching as it speeds up (gravity: ease-in)
     .20 – .26  impact: it squashes into the surface
     .20 – .66  three ripple rings spread and fade; droplets splash up and fall
     .24 – .80  ink floods out with a liquid edge until the screen is black
     .78 – .97  "About me." writes itself in, like the hero name             */
(() => {
  const drop = document.querySelector('[data-drop]');
  const svg = drop?.querySelector('[data-drop-svg]');
  if (!drop || !svg) return;
  const ripples = [...svg.querySelectorAll('.drop__ripples circle')];
  const flood = svg.querySelector('.drop__flood');
  const bead = svg.querySelector('.drop__bead');
  const splash = [...svg.querySelectorAll('.drop__splash circle')];
  const lines = [...drop.querySelectorAll('.drop__line > span')];
  const stage = drop.querySelector('.drop__stage');

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
  let w = 0; let h = 0; let top = 0; let travel = 0; let p = 0; let target = 0; let frame; let last;

  const measure = () => {
    w = drop.clientWidth; h = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    top = 0; for (let n = drop; n; n = n.offsetParent) top += n.offsetTop;
    travel = drop.offsetHeight - h;
  };
  const read = () => { target = travel > 0 ? clamp01((window.scrollY - top) / travel) : 0; };

  // A circle whose radius is bent by three sine waves: reads as liquid, settles as it grows.
  const blob = (cx, cy, R, wobble, phase) => {
    let d = '';
    for (let i = 0; i <= 72; i += 1) {
      const a = (i / 72) * Math.PI * 2;
      const r = R * (1 + wobble * (Math.sin(a * 3 + phase) * .5 + Math.sin(a * 5 - phase * 1.3) * .32 + Math.sin(a * 8 + phase * .7) * .18));
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
    }
    return `${d}Z`;
  };
  // Teardrop with its round bottom centred on (x, y); sx/sy stretch it.
  const tear = (x, y, r, sx, sy) => {
    const tip = y - r * 2.2 * sy;
    return `M${x} ${tip}C${x + r * .5 * sx} ${y - r * 1.3 * sy} ${x + r * sx} ${y - r * .6 * sy} ${x + r * sx} ${y}A${r * sx} ${r * sy} 0 0 1 ${x - r * sx} ${y}C${x - r * sx} ${y - r * .6 * sy} ${x - r * .5 * sx} ${y - r * 1.3 * sy} ${x} ${tip}Z`;
  };

  const paint = () => {
    const cx = w / 2;
    const cy = h * .56;
    const r = Math.max(9, Math.min(18, Math.min(w, h) * .018));

    // Fall, then squash on impact.
    const fall = seg(p, 0, .2);
    const hit = seg(p, .2, .26);
    let sx = 1 - .14 * fall; let sy = 1 + .4 * fall;
    if (hit > 0) { sx = .86 + .9 * easeOut(hit); sy = 1.4 - 1.05 * easeOut(hit); }
    const y = fall < 1 ? -h * .1 + (cy - r * sy + h * .1) * fall * fall : cy - r * sy;
    bead.setAttribute('d', p > 0 && hit < 1 ? tear(cx, y, r, sx, sy) : '');

    ripples.forEach((ring, k) => {
      const s = seg(p, .2 + k * .05, .56 + k * .05);
      const on = s > 0 && s < 1;
      ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
      ring.setAttribute('r', on ? (r + easeOut(s) * Math.min(w, h) * .44 * (1 - k * .14)).toFixed(1) : 0);
      ring.style.opacity = on ? ((1 - s) * .75).toFixed(3) : 0;
      ring.style.strokeWidth = (.6 + (1 - s) * 1.6).toFixed(2);
    });

    const fly = seg(p, .2, .38);
    splash.forEach((dot, j) => {
      const on = fly > 0 && fly < 1;
      const a = -Math.PI * (.16 + .68 * (j / (splash.length - 1)));
      const reach = r * (5 + (j % 3) * 2.4);
      dot.setAttribute('cx', (cx + Math.cos(a) * reach * fly).toFixed(1));
      dot.setAttribute('cy', (cy + Math.sin(a) * reach * 1.5 * fly + fly * fly * r * 7).toFixed(1));
      dot.setAttribute('r', on ? (r * (.26 + (j % 2) * .1) * (1 - fly * .7)).toFixed(2) : 0);
    });

    // Flood: slow to start, then fast; the edge calms down as it grows.
    const s = seg(p, .24, .8);
    stage.style.background = s >= 1 ? '#0A0A0A' : '';
    if (s >= 1) flood.setAttribute('d', `M0 0H${w}V${h}H0Z`);
    else if (s <= 0) flood.setAttribute('d', '');
    else {
      const R = r * 1.2 + s ** 1.8 * Math.hypot(w, h) * .62;
      flood.setAttribute('d', blob(cx, cy, R, .075 * (1 - s) ** 1.2 + .008, p * 16));
    }

    lines.forEach((line, i) => {
      const t = seg(p, .78 + i * .05, .95 + i * .02);
      line.style.translate = `0 ${(105 * (1 - easeOut(seg(t, 0, .6)))).toFixed(2)}%`;
      const pos = `${(100 * (1 - easeInOut(t))).toFixed(2)}% 0`;
      line.style.webkitMaskPosition = pos; line.style.maskPosition = pos;
    });
  };

  const tick = (time) => {
    const dt = Math.min((time - (last ?? time)) / 1000, .05);
    last = time;
    p += (target - p) * (reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 10));
    if (Math.abs(target - p) < .0005) p = target;
    paint();
    if (p !== target) frame = requestAnimationFrame(tick); else { frame = undefined; last = undefined; }
  };
  const queue = () => { read(); frame ??= requestAnimationFrame(tick); };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', () => { measure(); read(); p = target; paint(); }, { passive: true });
  window.addEventListener('load', () => { measure(); read(); p = target; paint(); });
  measure(); read(); p = target; paint();
})();

/* ---- About stage: floating facts, then the portrait moves aside ----------
   Desktop only (the pinned stage). Scroll position q runs through three parts:
     arrive   the facts fly in from deep behind the screen, one after another
     hold     they float (a slow bob), drift by depth, and tilt with the mouse;
              the portrait slowly pushes in
     aside    the facts scatter toward the viewer and fade while the portrait
              glides from the centre into the left column for "What I do"
   data-float="z,order": z is the resting depth in px (positive = nearer).
   Reduced motion: no flight, bob or tilt; facts fade in and out in place.  */
(() => {
  const about = document.querySelector('[data-about]');
  const pin = about?.querySelector('[data-about-pin]');
  const person = about?.querySelector('[data-about-person]');
  const room = about?.querySelector('.about__room');
  if (!about || !pin || !person || !room) return;
  const ghost = about.querySelector('.about__ghost');
  const items = [...about.querySelectorAll('[data-float]')].map((el) => {
    const [z, order] = el.dataset.float.split(',').map(Number);
    return { el, z, order, centred: el.classList.contains('about__stats') };
  });
  const wide = window.matchMedia('(min-width: 1024px)');
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const seg = (v, a, b) => clamp01((v - a) / (b - a));
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
  const easeOut = (t) => 1 - (1 - t) ** 3;

  let total = 0; let top = 0; let roomH = 0; let vh = 0; let toCentre = 0; let zoom = 1;
  let q = 0; let target = 0; let visible = false; let frame; let last;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const reset = () => {
    person.style.transform = '';
    if (ghost) ghost.style.transform = '';
    items.forEach(({ el }) => { el.style.transform = ''; el.style.opacity = ''; });
  };

  const measure = () => {
    if (!wide.matches) { reset(); return; }
    vh = window.innerHeight;
    top = 0; for (let n = about; n; n = n.offsetParent) top += n.offsetTop;
    roomH = room.offsetHeight;
    total = about.offsetHeight;
    // From the side column to the screen centre, and how far to zoom in there.
    const w = person.offsetWidth; const h = person.offsetHeight;
    toCentre = (pin.clientWidth - w) / 2 - person.offsetLeft;
    zoom = Math.min(1.7, (vh * .78) / h); // centred: large, with room for the facts around it
  };
  const read = () => { target = window.scrollY - top; };

  const paint = (time) => {
    const still = reducedMotion.matches;
    const arrive = seg(q, -vh * .55, vh * .35);
    const hold = seg(q, 0, roomH - vh * .8);
    const aside = easeInOut(seg(q, roomH - vh * 1.05, roomH - vh * .3));

    // Portrait: centre + zoom (with a slow push-in) → side column at natural size.
    const s = zoom * (1 + hold * .05);
    // Beside "What I do" and "Tools I use": the portrait rises and pushes in slowly
    // while the text scrolls at full speed (parallax).
    const rest = still ? 0 : seg(q, roomH - vh * .3, total - vh);
    const scale = (s + (1 - s) * aside) * (1 + rest * .05);
    const lift = (1 - aside) * vh * .06 - rest * vh * .06; // centred, it stands on the screen's bottom edge
    person.style.transform = `translate3d(${(toCentre * (1 - aside)).toFixed(1)}px, ${lift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    if (ghost) ghost.style.transform = `translate3d(${(-hold * window.innerWidth * .18).toFixed(1)}px, 0, 0)`;

    const t = time / 1000;
    items.forEach(({ el, z, order, centred }) => {
      const mine = easeOut(seg(arrive * 1.5 - order * .06, 0, .9));
      const gone = seg(aside, order * .03, .55 + order * .03);
      const opacity = mine * (1 - gone);
      el.style.opacity = opacity.toFixed(3);
      if (still) { el.style.transform = centred ? '' : 'translateY(-50%)'; return; }
      const depth = (z + 300) / 300; // nearer layers move further
      const rest = z * .6;
      const flyZ = (1 - mine) * -1100 + gone * (600 + order * 60);
      const drift = -hold * depth * 50;
      const bob = Math.sin(t * .9 + order * 1.7) * 7;
      const dx = pointer.x * depth * 18 + gone * (order % 2 ? 1 : -1) * 160;
      const dy = pointer.y * depth * 12 + drift + bob;
      const tiltY = pointer.x * 6 + Math.sin(t * .5 + order) * 1.5;
      const tiltX = -pointer.y * 5;
      el.style.transform = `${centred ? '' : 'translateY(-50%) '}translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, ${(rest + flyZ).toFixed(1)}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    });
  };

  const tick = (time) => {
    frame = undefined;
    const dt = Math.min((time - (last ?? time)) / 1000, .05);
    last = time;
    const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
    q += (target - q) * ease;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 5);
    paint(time);
    // Keep running while on screen so the facts can float.
    if (visible && wide.matches) frame = requestAnimationFrame(tick); else last = undefined;
  };
  const start = () => { frame ??= requestAnimationFrame(tick); };

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { read(); start(); } }).observe(about);
  window.addEventListener('scroll', read, { passive: true });
  about.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || reducedMotion.matches) return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  about.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  const refresh = () => { measure(); read(); q = target; if (wide.matches) paint(performance.now()); };
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh);
  wide.addEventListener('change', refresh);
  refresh();
})();

/* ---- About stop points: catch hard flicks -------------------------------
   A fast fling down used to fly straight past the About stage. When the page
   crosses one of these moments faster than about 2.5 screens per second, it
   stops there and holds for ~0.7s, absorbing the rest of the fling. Normal
   scrolling and scrolling up never trigger it. Desktop only.               */
(() => {
  const marks = [...document.querySelectorAll('.about__snap, .about__step')];
  if (!marks.length) return;
  const wide = window.matchMedia('(min-width: 1024px)');
  let stops = []; let lastY = window.scrollY; let lastT = performance.now(); let holdUntil = 0; let held = null;
  const measure = () => {
    stops = marks.map((el) => {
      const r = el.getBoundingClientRect();
      // The facts marker stops at the top; a step stops with its content centred.
      return Math.round(el.classList.contains('about__snap') ? r.top + window.scrollY : r.top + window.scrollY + el.offsetHeight / 2 - window.innerHeight / 2);
    });
  };
  const jump = (y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y); document.documentElement.style.scrollBehavior = ''; };
  window.addEventListener('scroll', () => {
    const now = performance.now(); const y = window.scrollY;
    if (!wide.matches) { lastY = y; lastT = now; return; }
    if (held !== null && now < holdUntil) { if (y > held + 2) jump(held); lastY = held; lastT = now; return; }
    held = null;
    const speed = (y - lastY) / Math.max(1, now - lastT) * 1000; // px per second, + is down
    if (speed > window.innerHeight * 2.5) {
      const crossed = stops.find((stop) => lastY < stop - 4 && y > stop + 4);
      if (crossed !== undefined) { held = crossed; holdUntil = now + 700; jump(crossed); lastY = crossed; lastT = now; return; }
    }
    lastY = y; lastT = now;
  }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  measure();
})();

/* ---- Scroll engine: continuous parallax across the page ------------------
   Every [data-parallax] element moves in proportion to where it sits in the
   viewport (-1 entering at the bottom → 0 centred → 1 leaving at the top).
   Values: "x:-8vw", "y:-120", "y:-8%" (percent of the element's own size).
   Uses the `translate` property so reveal/hover transforms keep working, and
   measures with offsetTop (ignores transforms) so motion never feeds back.   */
(() => {
  if (reducedMotion.matches) return;

  // Tag the page: titles slide, outlined words counter-slide, images drift inside frames.
  // The work title lives in the pinned rail frame, so it stays put.
  document.querySelectorAll('.section__title:not(#work-title):not(#about-title), .book__title').forEach((title, i) => {
    title.dataset.parallax ??= `x:${i % 2 ? 5 : -5}vw`;
  });
  // Staggered lift; the step's top padding leaves room so numbers never cross its rule.
  document.querySelectorAll('.step__n').forEach((n, i) => { n.dataset.parallax = `y:${-8 - i * 10}`; });
  // The cut-out has no frame to crop it, so it drifts without being scaled up.
  // On ink: headings lift faster than their text (the About stage drives itself).
  document.querySelectorAll('.about__step h3').forEach((el) => { el.dataset.parallax = 'y:-60'; });
  document.querySelectorAll('.services dt').forEach((el) => { el.dataset.parallax = 'y:-28'; });

  const parse = (spec) => {
    const [axis, raw] = spec.split(':');
    const value = parseFloat(raw);
    const unit = raw.endsWith('vw') ? 'vw' : raw.endsWith('%') ? '%' : 'px';
    return { axis, value, unit };
  };
  const docTop = (el) => { let top = 0; for (let n = el; n; n = n.offsetParent) top += n.offsetTop; return top; };

  let items = [];
  const measure = () => {
    // Archive grid only (the home rail drives its own cards sideways). Tagged here
    // because the grid re-lays out on filter.
    document.querySelectorAll('.work-grid .tile').forEach((tile) => {
      const narrow = tile.dataset.size === 'narrow' && window.innerWidth > 1023;
      if (narrow) tile.dataset.parallax = 'y:-90'; else { delete tile.dataset.parallax; tile.style.translate = ''; }
      tile.querySelectorAll('img[data-drift], video[data-drift]').forEach((img) => { img.dataset.parallax = 'y:-6%'; });
    });
    items = [...document.querySelectorAll('[data-parallax]')].map((el) => {
      // Measure from the nearest stable box: an image's frame, or the element itself.
      const box = el.matches('img, video') ? el.parentElement : el;
      return { el, spec: parse(el.dataset.parallax), top: docTop(box), height: box.offsetHeight, last: '' };
    });
  };

  const update = () => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const y = window.scrollY;
    items.forEach((item) => {
      const center = item.top + item.height / 2 - y;
      if (center < -vh || center > vh * 2) return; // off-screen: skip the write
      const t = Math.max(-1.2, Math.min(1.2, (vh / 2 - center) / (vh / 2 + item.height / 2)));
      const { axis, value, unit } = item.spec;
      // Sideways drift only on wide screens; on phones titles already fill the width.
      const amount = axis === 'x' && vw < 1024 ? 0 : unit === 'vw' ? (value * vw) / 100 : value;
      const v = `${(t * amount).toFixed(2)}${unit === '%' ? '%' : 'px'}`;
      const next = axis === 'x' ? `${v} 0` : `0 ${v}`;
      if (next !== item.last) { item.el.style.translate = next; item.last = next; }
    });
  };

  // Ticker: drifts on its own, speeds up with scroll velocity, and follows scroll direction.
  const ticker = document.querySelector('[data-ticker]');
  const sets = ticker ? [...ticker.querySelectorAll('.ticker__set')] : [];
  let offset = 0; let direction = 1; let velocity = 0; let lastY = window.scrollY; let hovering = false;
  if (ticker) {
    ticker.classList.add('is-driven');
    ticker.addEventListener('pointerenter', () => { hovering = true; });
    ticker.addEventListener('pointerleave', () => { hovering = false; });
  }
  const driveTicker = (dt) => {
    if (!sets.length) return;
    const dy = window.scrollY - lastY; lastY = window.scrollY;
    if (dy) direction = Math.sign(dy);
    velocity += (Math.min(Math.abs(dy), 120) * 14 - velocity) * Math.min(1, dt * 6); // eased boost, px/s
    const paused = hovering || ticker.classList.contains('is-paused');
    const speed = paused ? 0 : 60 + velocity;
    const width = sets[0].offsetWidth;
    offset = (offset - direction * speed * dt) % width;
    if (offset > 0) offset -= width;
    sets.forEach((set) => { set.style.translate = `${offset.toFixed(2)}px 0`; });
  };

  let lastTime;
  const loop = (time) => {
    const dt = Math.min(((time - (lastTime ?? time)) / 1000), .05);
    lastTime = time;
    update();
    driveTicker(dt);
    requestAnimationFrame(loop);
  };

  measure();
  window.addEventListener('resize', () => { measure(); update(); }, { passive: true });
  window.addEventListener('load', measure);
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => setTimeout(measure, 60)));
  requestAnimationFrame(loop);
})();
