// Frontend GameShelf — consomme l'API qui, elle, exploite les 4 bases.
const api = (path) => fetch(path).then((r) => r.json());
const $ = (sel) => document.querySelector(sel);

// --- Navigation entre vues ---
document.querySelectorAll('nav a').forEach((a) => {
  a.onclick = (e) => {
    e.preventDefault();
    document.querySelectorAll('nav a').forEach((x) => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
    $('#view-' + a.dataset.view).classList.remove('hidden');
    loaders[a.dataset.view]?.();
  };
});

// --- État de santé des 4 bases ---
async function loadHealth() {
  try {
    const h = await api('/api/health');
    const ok = Object.values(h).every((v) => v === 'ok');
    $('#health').textContent = (ok ? '🟢' : '🔴') + ' SQL·Mongo·Redis·Neo4j';
  } catch { $('#health').textContent = '🔴 hors-ligne'; }
}

// --- Vue Jeux (MongoDB + Redis) ---
async function loadGames() {
  const q = $('#search').value.trim();
  const genre = $('#genreFilter').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (genre) params.set('genre', genre);
  const games = await api('/api/games?' + params);
  $('#gamesGrid').innerHTML = games.map(gameCard).join('');
  document.querySelectorAll('.card').forEach((c) => (c.onclick = () => openGame(c.dataset.id)));
}
function gameCard(g) {
  const year = (g.releaseDate || '').slice(0, 4);
  return `<div class="card" data-id="${g._id}">
    <div class="cover">🎮</div>
    <div class="body">
      <div class="title">${g.title}</div>
      <div class="meta">${year} · ${(g.genres || [])[0] || ''}</div>
    </div></div>`;
}
async function loadGenres() {
  const stats = await api('/api/games/stats/by-genre');
  $('#genreFilter').innerHTML = '<option value="">Tous les genres</option>' +
    stats.map((s) => `<option value="${s._id}">${s._id} (${s.count})</option>`).join('');
}
$('#search').oninput = debounce(loadGames, 300);
$('#genreFilter').onchange = loadGames;

async function openGame(id) {
  const { game, source, views } = await api('/api/games/' + id);
  const reviews = await api('/api/reviews/game/' + id);
  $('#modalCard').innerHTML = `
    <h2>${game.title} <span class="source-pill">via ${source}</span></h2>
    <p>${game.description || ''}</p>
    <dl class="kv">
      <dt>Sortie</dt><dd>${game.releaseDate || '—'}</dd>
      <dt>Développeur</dt><dd>${game.developer || '—'}</dd>
      <dt>Genres</dt><dd>${(game.genres || []).join(', ')}</dd>
      <dt>Plateformes</dt><dd>${(game.platforms || []).join(', ')}</dd>
      <dt>PEGI</dt><dd>${game.pegi ?? '—'}</dd>
      <dt>Vues (Redis)</dt><dd>${views}</dd>
    </dl>
    <div>${(game.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    <h3>Reviews (PostgreSQL)</h3>
    ${reviews.length ? reviews.map((r) => `<div class="feed"><li>
        <span class="who">${r.username}</span> ${'★'.repeat(Math.round(r.rating))}
        ${r.liked ? '❤️' : ''}<br>${r.body || ''}</li></div>`).join('')
      : '<p style="color:var(--muted)">Aucune review.</p>'}`;
  $('#modal').classList.remove('hidden');
}

// --- Vue Classements (Redis) ---
async function loadLeaderboard() {
  const [top, most, trend] = await Promise.all([
    api('/api/leaderboard/top-rated'),
    api('/api/leaderboard/most-reviewed'),
    api('/api/leaderboard/trending'),
  ]);
  $('#topRated').innerHTML = top.map(rankItem).join('');
  $('#mostReviewed').innerHTML = most.map(rankItem).join('');
  $('#trending').innerHTML = trend.games.map(rankItem).join('');
  const days = Math.round((trend.ttlSeconds || 0) / 86400);
  $('#trendTtl').textContent = `(TTL ~${days}j)`;
}
const rankItem = (x) => `<li>${x.title}<span class="score">${x.score}</span></li>`;

// --- Vue Activité (MongoDB) ---
async function loadFeed() {
  const events = await api('/api/feed');
  $('#feed').innerHTML = events.map(feedItem).join('');
}
function feedItem(e) {
  const when = new Date(e.createdAt).toLocaleString('fr-FR');
  let txt = '';
  if (e.type === 'review') txt = `a noté <b>${e.gameTitle}</b> ${'★'.repeat(Math.round(e.rating))}`;
  else if (e.type === 'status_change') txt = `est passé de <i>${e.from}</i> à <i>${e.to}</i> sur <b>${e.gameTitle}</b>`;
  else if (e.type === 'list_add') txt = `a ajouté <b>${e.gameTitle}</b> à la liste « ${e.listName} »`;
  else if (e.type === 'follow') txt = `suit désormais <b>${e.targetUsername}</b>`;
  else txt = e.type;
  return `<li><span class="badge">${e.type}</span> <span class="who">${e.username}</span> ${txt}
    <div class="when">${when}</div></li>`;
}

// --- Vue Social (Neo4j) ---
async function loadSocial() {
  const id = $('#userSelect').value;
  const [sugg, reco] = await Promise.all([
    api(`/api/social/${id}/suggestions`),
    api(`/api/social/${id}/recommendations`),
  ]);
  $('#suggestions').innerHTML = sugg.length
    ? sugg.map((s) => `<li><span class="who">${s.username}</span> · ${s.mutual} en commun</li>`).join('')
    : '<li style="color:var(--muted)">Aucune suggestion.</li>';
  $('#recommendations').innerHTML = reco.length
    ? reco.map((r) => `<li><b>${r.title}</b> <span class="score">${r.score}★</span> · ${r.endorsements} recommandation(s)</li>`).join('')
    : '<li style="color:var(--muted)">Aucune reco (notez des jeux !).</li>';
}
$('#userSelect').onchange = loadSocial;

// --- Utilitaires ---
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const loaders = { games: loadGames, leaderboard: loadLeaderboard, feed: loadFeed, social: loadSocial };

// Init
loadHealth();
loadGenres();
loadGames();
