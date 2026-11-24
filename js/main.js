(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // i18n: English lives in the HTML; other languages override it from translations/lang-xx.json
  const textNodes = [...document.querySelectorAll('[data-i18n]')];
  const attrNodes = [...document.querySelectorAll('[data-i18n-attr]')].map(n => {
    const [attr, key] = n.dataset.i18nAttr.split(':');
    return { n, attr, key, base: n.getAttribute(attr) };
  });
  const base = new Map(textNodes.map(n => [n, n.textContent]));
  const cache = {};
  const store = {
    get: () => { try { return localStorage.getItem('lang'); } catch { return null; } },
    set: v => { try { localStorage.setItem('lang', v); } catch {} }
  };

  async function setLang(lang) {
    let dict = {};
    if (lang !== 'en') {
      try { dict = cache[lang] ??= await (await fetch('translations/lang-' + lang + '.json')).json(); }
      catch { lang = 'en'; }
    }
    textNodes.forEach(n => { n.textContent = dict[n.dataset.i18n] ?? base.get(n); });
    attrNodes.forEach(a => a.n.setAttribute(a.attr, dict[a.key] ?? a.base));
    root.lang = lang;
    document.querySelector('link[rel=canonical]').href = 'https://captina.dev/' + (lang === 'fr' ? '?lang=fr' : '');
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
  }

  const param = new URLSearchParams(location.search).get('lang');
  const initial = (param === 'fr' || param === 'en') ? param : store.get() || (/^fr\b/i.test(navigator.language || '') ? 'fr' : 'en');
  if (initial !== 'en') setLang(initial);
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    store.set(b.dataset.lang);
    setLang(b.dataset.lang);
  }));

  // Address assembled at runtime to keep it away from harvesters
  document.querySelectorAll('[data-u]').forEach(el => {
    const addr = el.dataset.u + '@' + el.dataset.d;
    if (el.tagName === 'A') el.href = 'mailto:' + addr;
    else el.textContent = addr;
  });

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', false); }
  });

  const bar = document.querySelector('.topbar');
  const onScroll = () => bar.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-stagger]').forEach(c => [...c.children].forEach((el, i) => el.style.setProperty('--i', i)));

  // Scroll progress and hero parallax, batched per frame
  const hero = document.querySelector('.hero');

  // Gutter trace: one continuous path that jogs out toward every section head, with a branch stub and a via
  const svg = document.querySelector('.page-trace');
  const NS = 'http://www.w3.org/2000/svg';
  let trace = null;
  const buildTrace = () => {
    trace = null;
    svg.replaceChildren();
    svg.removeAttribute('height');
    if (getComputedStyle(svg).display === 'none') return;
    const top = el => el.getBoundingClientRect().top + scrollY;
    // Centre the trace between the viewport edge and the start of the text column
    const wrap = document.querySelector('.wrap');
    const left = wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft);
    const X0 = Math.round(left / 2), J = Math.round(Math.min(44, left * 0.2)), X1 = X0 + J, XS = left - 22;
    const H = document.documentElement.scrollHeight;
    const pts = [[X0, hero.offsetTop + hero.offsetHeight - 80]];
    const heads = [...document.querySelectorAll('.section-head, .contact-in')].map(el => top(el) + 8);
    heads.forEach(y => pts.push([X0, y - J], [X1, y], [X1, y + 70], [X0, y + 70 + J]));
    pts.push([X0, top(document.querySelector('.footer')) - 40]);
    let cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const d = 'M' + pts.map(p => p[0] + ' ' + p[1].toFixed(1)).join('L');
    svg.setAttribute('viewBox', '0 0 ' + left + ' ' + H);
    svg.setAttribute('width', left);
    svg.setAttribute('height', H);
    const mk = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    mk('path', { class: 'base', d });
    const live = mk('path', { class: 'live', d });
    const L = cum[cum.length - 1];
    live.style.strokeDasharray = L;
    const branches = heads.map(y => {
      const g = mk('g', {});
      mk('path', { class: 'stub', d: 'M' + X1 + ' ' + y + 'H' + (XS - 6) }, g);
      mk('circle', { class: 'via', cx: XS, cy: y, r: 6 }, g);
      return { g, y };
    });
    const start = mk('circle', { class: 'via on', cx: X0, cy: pts[0][1], r: 7 });
    const head = mk('circle', { class: 'head', r: 5.5 });
    trace = { pts, cum, L, live, head, branches, start };
  };
  const updateTrace = () => {
    if (!trace) return;
    const { pts, cum, L, live, head, branches } = trace;
    const y = scrollY + innerHeight * 0.55;
    let len = 0, px = pts[0][0], py = pts[0][1];
    if (y >= pts[pts.length - 1][1]) { len = L; [px, py] = pts[pts.length - 1]; }
    else for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      if (y < y2) { const t = Math.max(0, (y - y1) / (y2 - y1)); len = cum[i - 1] + t * (cum[i] - cum[i - 1]); px = x1 + t * (x2 - x1); py = y1 + t * (y2 - y1); break; }
    }
    live.style.strokeDashoffset = L - len;
    head.setAttribute('cx', px); head.setAttribute('cy', Math.max(py, pts[0][1]));
    branches.forEach(b => b.g.classList.toggle('on', y >= b.y));
  };
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { buildTrace(); updateTrace(); }, 150); });
  addEventListener('load', () => { buildTrace(); updateTrace(); });
  document.fonts?.ready.then(() => { buildTrace(); updateTrace(); });
  let ticking = false;
  const frame = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    root.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : 0);
    if (!reduced) hero.style.setProperty('--sy', Math.min(scrollY, hero.offsetHeight));
    updateTrace();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();

  // Jump index: scroll to the matching tag and flash it
  const words = [...document.querySelectorAll('.tags li, .pins dt, .spec-head h3')];
  document.querySelectorAll('[data-jump]').forEach(a => a.addEventListener('click', e => {
    const w = a.dataset.jump.toLowerCase();
    const re = new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'i');
    const el = words.find(n => n.textContent.trim().toLowerCase() === w) || words.find(n => re.test(n.textContent));
    if (!el) return;
    e.preventDefault();
    el.closest('[data-stagger]')?.classList.add('in');
    el.closest('.reveal')?.classList.add('in');
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    el.classList.remove('flash');
    setTimeout(() => el.classList.add('flash'), reduced ? 0 : 500);
    setTimeout(() => el.classList.remove('flash'), 2200);
  }));

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, [data-stagger]').forEach(el => io.observe(el));
})();
