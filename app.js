(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, attrs = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) n.append(c);
    return n;
  };
  const svg = (markup, size = 18) => {
    const t = document.createElement('template');
    t.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markup}</svg>`;
    return t.content.firstChild;
  };
  const ICON = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    list: '<path d="M4 6h11M4 12h11M4 18h7M17 14v6l4-3z"/>',
  };

  // ---------- Data ----------
  const YT_ID = /^[A-Za-z0-9_-]{11}$/;
  const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; } };
  function loadData() {
    const raw = $('#portfolio-data');
    let data;
    try { data = JSON.parse(raw ? raw.textContent : '{}'); } catch (e) { console.error('[portfolio] library data is not valid JSON', e); data = {}; }
    const videos = (Array.isArray(data.videos) ? data.videos : []).filter((v, i) => {
      const ok = v && YT_ID.test(v.youtubeId || '') && safeUrl(v.url) && (v.title || '').trim();
      if (!ok) console.warn(`[portfolio] skipping film #${i + 1}: needs title, a valid youtubeId and url`, v);
      return ok;
    }).map((v, i) => ({ ...v, key: 'v' + i, client: (v.client || '').trim(), title: v.title.trim(), url: safeUrl(v.url) }));
    return { profile: data.profile || {}, videos, previewSeconds: Math.max(3, Math.min(30, Number(data.previewSeconds) || 10)) };
  }

  // ---------- Thumbnails: best available YouTube still ----------
  const THUMBS = ['maxresdefault', 'sddefault', 'hqdefault'];
  function setThumb(img, id, i = 0) {
    img.onerror = () => { if (i < THUMBS.length - 1) setThumb(img, id, i + 1); };
    // Missing sizes come back as a 120px grey placeholder.
    img.onload = () => { if (img.naturalWidth <= 120 && i < THUMBS.length - 1) setThumb(img, id, i + 1); };
    img.src = `https://i.ytimg.com/vi/${id}/${THUMBS[i]}.jpg`;
  }

  // ---------- Profile ----------
  function renderProfile(p, videos) {
    const name = p.name || 'Portfolio';
    const initials = p.initials || name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    $$('[data-slot="name"]').forEach((n) => (n.textContent = name));
    $$('[data-slot="initials"]').forEach((n) => (n.textContent = initials));
    $('[data-slot="subline"]').textContent = p.headline || p.location || 'Portfolio';
    $('[data-slot="headline"]').textContent = p.headline || '';
    if (p.location) { $('[data-slot="location"]').textContent = p.location; $('[data-slot="location-row"]').hidden = false; }

    const contacts = [];
    if (p.email) contacts.push({ type: 'mail', label: p.email, href: 'mailto:' + p.email });
    if (p.phone) contacts.push({ type: 'phone', label: p.phone, href: 'tel:' + p.phone.replace(/\s/g, '') });
    (p.links || []).forEach((l) => { const href = safeUrl(l.url); if (href) contacts.push({ type: ICON[l.type] ? l.type : 'web', label: l.label || href.replace(/^https?:\/\/(www\.)?/, ''), href }); });
    $('[data-slot="contacts"]').replaceChildren(...contacts.map((c) => el('a', { class: 'contact', href: c.href, ...(c.type === 'mail' || c.type === 'phone' ? {} : { target: '_blank', rel: 'noopener' }) }, [
      el('span', { class: 'contact-ico' }, svg(ICON[c.type])), el('span', { text: c.label }),
    ])));

    const cta = $('[data-slot="cta"]');
    if (p.email) { cta.href = 'mailto:' + p.email; cta.hidden = false; }

    const cover = $('[data-slot="cover"]');
    if (videos[0]) { setThumb(cover, videos[0].youtubeId); cover.hidden = false; }

    $('[data-slot="project-count"]').textContent = videos.length;
    $('[data-slot="client-count"]').textContent = new Set(videos.map((v) => v.client.toLowerCase()).filter(Boolean)).size;
  }

  // ---------- Grid + client filter ----------
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function renderTiles(videos) {
    return videos.map((v) => {
      const img = el('img', { class: 'thumb', alt: '', loading: 'lazy', decoding: 'async' });
      setThumb(img, v.youtubeId);
      const badge = v.playlistCount
        ? el('span', { class: 'badge' }, [svg(ICON.list, 14), el('span', { text: `Playlist · ${v.playlistCount}` })])
        : el('span', { class: 'badge' }, [svg(ICON.youtube, 14), el('span', { text: 'YouTube' })]);
      const a = el('a', {
        class: 'tile', href: v.url, target: '_blank', rel: 'noopener',
        'aria-label': `Watch ${v.title}${v.client ? ' for ' + v.client : ''} on YouTube (opens in a new tab)`,
        'data-key': v.key, 'data-client': slug(v.client || 'other'),
      }, [
        el('span', { class: 'media' }, [img, el('span', { class: 'player' }), el('span', { class: 'watch' }, el('span', {}, [svg(ICON.play, 14), document.createTextNode(v.playlistCount ? 'Watch playlist' : 'Watch on YouTube')])), badge]),
        el('span', { class: 'tile-meta' }, [el('span', { class: 'tile-title', text: v.title }), el('span', { class: 'tile-sub', text: v.client })]),
      ]);
      a._video = v;
      return a;
    });
  }

  function setupFilter(videos, tiles, onChange) {
    const clients = [];
    videos.forEach((v) => { if (v.client && !clients.some((c) => c.slug === slug(v.client))) clients.push({ name: v.client, slug: slug(v.client) }); });
    const count = (s) => videos.filter((v) => slug(v.client) === s).length;
    const chips = [{ name: 'All', slug: 'all', n: videos.length }, ...clients.map((c) => ({ ...c, n: count(c.slug) }))].map((c) =>
      el('button', { type: 'button', class: 'chip', 'data-slug': c.slug, 'aria-pressed': 'false' }, [el('span', { text: c.name }), el('span', { class: 'chip-n', text: String(c.n) })]));
    const bar = $('[data-slot="chips"]');
    bar.replaceChildren(...chips);
    bar.hidden = clients.length < 2;

    const apply = (s, push) => {
      if (!chips.some((c) => c.dataset.slug === s)) s = 'all';
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.slug === s)));
      tiles.forEach((t) => { t.hidden = s !== 'all' && t.dataset.client !== s; });
      if (push) history.replaceState(null, '', s === 'all' ? location.pathname + location.search : '#' + s);
      onChange();
    };
    bar.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) apply(c.dataset.slug, true); });
    window.addEventListener('hashchange', () => apply(location.hash.slice(1) || 'all', false));
    apply(location.hash.slice(1) || 'all', false); // shareable filtered links, e.g. /#abhibus
  }

  // ---------- 10-second muted previews (YouTube IFrame API) ----------
  function createPreviews(tiles, seconds) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) return { refresh() {} };

    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const MAX = canHover ? 4 : 2; // concurrent previews; keeps the page light on phones
    const visible = new Map(); // tile -> intersection ratio
    const active = new Map();  // tile -> { player, timer }
    const failed = new WeakSet();
    let hovered = null, apiPromise = null, raf = 0;

    const loadApi = () => apiPromise || (apiPromise = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { apiPromise = null; reject(new Error('YouTube player could not load')); };
      document.head.append(s);
    }));

    function start(tile) {
      if (active.has(tile) || failed.has(tile)) return;
      const slot = { player: null, timer: 0, cancelled: false };
      active.set(tile, slot);
      loadApi().then((YT) => {
        if (slot.cancelled) return;
        const host = document.createElement('div');
        tile.querySelector('.player').replaceChildren(host);
        slot.player = new YT.Player(host, {
          host: 'https://www.youtube-nocookie.com',
          videoId: tile._video.youtubeId,
          playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, start: 0, origin: location.origin },
          events: {
            onReady: (e) => { if (slot.cancelled) return; e.target.mute(); e.target.playVideo(); },
            onStateChange: (e) => {
              if (slot.cancelled) return;
              if (e.data === YT.PlayerState.PLAYING) {
                tile.classList.add('playing');
                clearInterval(slot.timer);
                slot.timer = setInterval(() => {
                  try { if (slot.player.getCurrentTime() >= seconds) slot.player.seekTo(0, true); } catch (err) { /* player gone */ }
                }, 200);
              } else if (e.data === YT.PlayerState.ENDED) {
                e.target.seekTo(0, true); e.target.playVideo();
              }
            },
            onError: () => { failed.add(tile); stop(tile); }, // e.g. embedding disabled: keep the thumbnail
          },
        });
      }).catch(() => { tiles.forEach((t) => failed.add(t)); stop(tile); });
    }

    function stop(tile) {
      const slot = active.get(tile);
      if (!slot) return;
      slot.cancelled = true;
      clearInterval(slot.timer);
      try { slot.player && slot.player.destroy(); } catch (e) { /* already gone */ }
      tile.classList.remove('playing');
      tile.querySelector('.player').replaceChildren();
      active.delete(tile);
    }

    // Decide which tiles should be previewing: the hovered tile first, then the most visible on-screen tiles.
    function refresh() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (document.hidden) { [...active.keys()].forEach(stop); return; }
        const want = new Set();
        if (hovered && !hovered.hidden && !failed.has(hovered)) want.add(hovered);
        [...visible.entries()]
          .filter(([t, r]) => r >= 0.6 && !t.hidden && !failed.has(t))
          .sort((a, b) => a[0].getBoundingClientRect().top - b[0].getBoundingClientRect().top || a[0].getBoundingClientRect().left - b[0].getBoundingClientRect().left)
          .forEach(([t]) => { if (want.size < MAX) want.add(t); });
        [...active.keys()].forEach((t) => { if (!want.has(t)) stop(t); });
        want.forEach(start);
      });
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) visible.set(en.target, en.intersectionRatio); else visible.delete(en.target); });
      refresh();
    }, { threshold: [0, 0.6, 1] });
    tiles.forEach((t) => {
      io.observe(t);
      if (canHover) {
        t.addEventListener('mouseenter', () => { hovered = t; refresh(); });
        t.addEventListener('mouseleave', () => { if (hovered === t) hovered = null; refresh(); });
      }
    });
    document.addEventListener('visibilitychange', refresh);
    return { refresh };
  }

  // ---------- Boot ----------
  function boot() {
    const { profile, videos, previewSeconds } = loadData();
    renderProfile(profile, videos);
    const grid = $('[data-slot="grid"]');
    $('[data-slot="empty"]').hidden = videos.length > 0;
    const tiles = renderTiles(videos);
    grid.replaceChildren(...tiles);
    const previews = createPreviews(tiles, previewSeconds);
    setupFilter(videos, tiles, () => previews.refresh());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
