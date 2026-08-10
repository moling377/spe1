// app.js - improved matching by interests, better UI behavior, English text, hero, load more
(function(){
  const USER_COUNT = 1000;
  const PAGE_SIZE = 24;
  const SUPPORT_WHATSAPP = '18325411560';

  // simple data pools
  const firsts = ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark","Paul","Andrew","Joshua","Kenneth","Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Eric","Jacob"];
  const lasts = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Perez","Thompson"];
  const jobs = ["Software Engineer","Designer","Product Manager","Teacher","Nurse","Photographer","Sales Manager","Data Analyst","Chef","Marketing Specialist","Student","Consultant","Accountant","Lawyer","Entrepreneur"];
  const interestsPool = ["hiking","coffee","travel","reading","music","gardening","cooking","yoga","photography","running","movies","games","coding","tech","art","sports","traveling","pets","fashion","fitness"];

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function pick(arr){ return arr[randInt(0,arr.length-1)]; }

  // localStorage keys
  const K_USERS = 'dm_users_v4';
  const K_VISITOR = 'dm_visitor_v4';
  const K_FAVS = 'dm_favs_v4';

  function seedUsers(){
    let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
    if(users && users.length >= USER_COUNT) return users;
    users = [];
    for(let i=1;i<=USER_COUNT;i++){
      const name = `${pick(firsts)} ${pick(lasts)}`;
      const age = randInt(20,50);
      const job = pick(jobs);
      const photoIndex = i % 100;
      const gender = (i % 2 === 0) ? 'male' : 'female';
      // interests: pick 2-6 unique tags
      let ints = [];
      const count = randInt(2,6);
      while(ints.length < count){ const t = pick(interestsPool); if(!ints.includes(t)) ints.push(t); }
      const photo = `https://randomuser.me/api/portraits/${gender === 'male' ? 'men' : 'women'}/${photoIndex}.jpg`;
      users.push({ id:i, name, age, job, country:'USA', gender, interests: ints, bio: `${job} who likes ${ints.slice(0,3).join(', ')}.`, email:`${name.toLowerCase().replace(/\s+/g,'')}${i}@example.com`, phone:`+1-${randInt(200,999)}-${randInt(200,999)}-${randInt(1000,9999)}`, photo});
    }
    users.push({ id: USER_COUNT + 1, name: 'SiteAdmin', age: 30, job:'Administrator', country:'USA', gender:'male', interests:['support'], bio:'Site admin', email:'admin@example.com', phone:'+1-832-541-1560', photo:'https://randomuser.me/api/portraits/men/10.jpg', is_admin:true});
    localStorage.setItem(K_USERS, JSON.stringify(users));
    return users;
  }

  // state helpers
  function getVisitor(){ return JSON.parse(localStorage.getItem(K_VISITOR) || 'null'); }
  function saveVisitor(v){ localStorage.setItem(K_VISITOR, JSON.stringify(v)); }
  function getFavs(){ return JSON.parse(localStorage.getItem(K_FAVS) || '[]'); }
  function saveFavs(a){ localStorage.setItem(K_FAVS, JSON.stringify(a)); }

  function toggleFav(id){ const favs = getFavs(); const idx = favs.indexOf(id); if(idx>=0){ favs.splice(idx,1); } else { favs.push(id); } saveFavs(favs); renderFavCount(); }
  function renderFavCount(){ document.getElementById('fav-count').textContent = getFavs().length; }

  // matching logic
  function scoreProfile(profile, visitorInterests){
    if(!visitorInterests || visitorInterests.length===0) return 0;
    const shared = profile.interests.filter(x=>visitorInterests.includes(x));
    const sharedCount = shared.length;
    const score = Math.round((sharedCount / visitorInterests.length) * 100);
    return { score, shared, sharedCount };
  }

  // WhatsApp opener
  function openWhatsApp(visitor, profile, match){
    const visitorText = visitor ? `${visitor.type} visitor` : 'Guest';
    const interestsText = visitor && visitor.interests && visitor.interests.length ? `Interests: ${visitor.interests.join(', ')}` : '';
    const matchText = match && match.sharedCount ? `Shared interests: ${match.shared.join(', ')}` : '';
    const text = encodeURIComponent(`Hello, I am a ${visitorText}. I'm interested in ${profile.name} (ID:${profile.id}). ${interestsText} ${matchText}`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    window.open(url, '_blank');
  }

  // UI rendering
  const users = seedUsers();
  let page = 1;
  let currentList = [];

  // interest chips in hero
  function renderHeroInterests(){
    const container = document.getElementById('hero-interests'); container.innerHTML = '';
    const pool = interestsPool.slice(0,18);
    pool.forEach(tag=>{
      const btn = document.createElement('button'); btn.className='btn btn-sm btn-outline-light'; btn.textContent = tag; btn.onclick = ()=>{ toggleHeroInterest(tag, btn); };
      container.appendChild(btn);
    });
  }

  function getVisitorInterests(){ const v = getVisitor(); return v && v.interests ? v.interests : []; }
  function toggleHeroInterest(tag, btn){ let v = getVisitor(); if(!v) v = { type:null, interests:[] };
    const idx = v.interests.indexOf(tag);
    if(idx>=0){ v.interests.splice(idx,1); btn.classList.remove('active'); } else {
      if(v.interests.length >= 5) { alert('You can choose up to 5 interests'); return; }
      v.interests.push(tag); btn.classList.add('active'); }
    saveVisitor(v); render(); renderMatchSummary(); }

  function setVisitorType(type){ let v = getVisitor() || { type:null, interests:[] }; v.type = type; saveVisitor(v); renderMatchSummary(); render(); }

  function renderMatchSummary(){ const visitor = getVisitor(); const el = document.getElementById('match-summary'); if(visitor && visitor.interests && visitor.interests.length){ el.textContent = `Showing profiles matched by interests: ${visitor.interests.join(', ')}`; } else { el.textContent = 'Choose interests to see tailored recommendations.'; } }

  function renderGrid(reset=false){
    if(reset) page = 1; const grid = document.getElementById('profile-grid'); if(reset) grid.innerHTML = '';
    const visitor = getVisitor(); let list = users.slice(0,USER_COUNT);
    // filter by opposite gender if visitor set
    if(visitor && visitor.type){ const wanted = visitor.type.toLowerCase() === 'male' ? 'female' : 'male'; list = list.filter(u=>u.gender === wanted); }
    // compute scores
    const vInterests = visitor && visitor.interests ? visitor.interests : [];
    const scored = list.map(p=>{ const s = scoreProfile(p, vInterests); return Object.assign({}, p, { matchScore: s.score, shared: s.shared, sharedCount: s.sharedCount }); });
    // prefer those with sharedCount>0, sort by score desc then random
    scored.sort((a,b)=>{ if(a.matchScore===b.matchScore) return Math.random()-0.5; return b.matchScore - a.matchScore; });
    currentList = scored;
    const start = (page-1)*PAGE_SIZE; const items = scored.slice(start, start+PAGE_SIZE);
    items.forEach(p=>{ const col = document.createElement('div'); col.className='col-12 col-sm-6 col-md-4 col-lg-3'; const sharedHtml = p.shared && p.shared.length ? `<div class="mt-2">${p.shared.map(t=>`<span class="tag-chip match">${t}</span>`).join(' ')}</div>` : '';
      col.innerHTML = `<div class="profile-card" data-id="${p.id}">
        <img loading="lazy" src="${p.photo}" class="profile-photo" alt="${p.name}">
        <div class="profile-body">
          <div class="d-flex justify-content-between align-items-start">
            <div><div class="profile-name">${p.name}</div><div class="profile-sub">${p.age} • ${p.job} • ${p.country}</div></div>
            <div><div class="match-score">${p.matchScore}%</div></div>
          </div>
          <p class="mt-2 small-muted">${p.bio}</p>
          <div class="d-flex flex-wrap gap-2 mt-2">${p.interests.map(t=>`<span class="tag-chip ${getVisitorInterests().includes(t)?'match':''}">${t}</span>`).join(' ')}</div>
          ${sharedHtml}
        </div></div>`;
      // event handlers
      const card = col.querySelector('.profile-card');
      card.onclick = (e)=>{ if(e.target.closest('button')) return; openProfileModal(p.id); };
      grid.appendChild(col);
    });
  }

  function openProfileModal(id){ const p = users.find(x=>x.id===id); if(!p) return; const visitor = getVisitor(); const match = scoreProfile(p, visitor && visitor.interests ? visitor.interests : []); document.getElementById('modal-photo').src = p.photo; document.getElementById('modal-name').textContent = `${p.name}`; document.getElementById('modal-meta').textContent = `${p.age} • ${p.job} • ${p.country}`; document.getElementById('modal-bio').textContent = p.bio + ' Email: ' + p.email; const tags = document.getElementById('modal-tags'); tags.innerHTML = p.interests.map(t=>`<span class="tag-chip ${visitor && visitor.interests && visitor.interests.includes(t)?'match':''}">${t}</span>`).join(' ');
    const actions = document.getElementById('modal-actions'); actions.innerHTML = '';
    const contactBtn = document.createElement('button'); contactBtn.className='btn btn-success me-2'; contactBtn.textContent = 'Contact Support (WhatsApp)'; contactBtn.onclick = ()=>{ openWhatsApp(visitor, p, match); };
    const favBtn = document.createElement('button'); favBtn.className='btn btn-outline-primary'; favBtn.textContent = getFavs().includes(p.id)?'♥ Favorited':'♡ Favorite'; favBtn.onclick = ()=>{ toggleFav(p.id); favBtn.textContent = getFavs().includes(p.id)?'♥ Favorited':'♡ Favorite'; };
    actions.appendChild(contactBtn); actions.appendChild(favBtn);
    document.getElementById('profileModal').classList.add('show'); }
  function closeModal(){ document.getElementById('profileModal').classList.remove('show'); }

  function loadMore(){ page++; const total = currentList.length; const maxPage = Math.ceil(total / PAGE_SIZE); if(page > maxPage) { document.getElementById('btn-load-more').disabled = true; return; } renderGrid(); }

  // online counter
  function startOnline(){ const el = document.getElementById('online-count'); let base = 1400 + randInt(0,600); el.textContent = base.toLocaleString(); setInterval(()=>{ const delta = randInt(-10,20); base = Math.max(80, base + delta); el.textContent = base.toLocaleString(); }, 2000); }

  // bind UI
  document.getElementById('hero-male').onclick = ()=>{ setVisitorType('male'); document.getElementById('hero-male').classList.add('active'); document.getElementById('hero-female').classList.remove('active'); };
  document.getElementById('hero-female').onclick = ()=>{ setVisitorType('female'); document.getElementById('hero-female').classList.add('active'); document.getElementById('hero-male').classList.remove('active'); };
  document.getElementById('btn-search').onclick = ()=>{ render(1, document.getElementById('search-q').value.trim()); };
  document.getElementById('cta-browse').onclick = ()=>{ window.scrollTo({ top: document.getElementById('results').offsetTop - 20, behavior:'smooth' }); };
  document.getElementById('cta-how').onclick = ()=>{ window.scrollTo({ top: document.querySelector('.how-it-works').offsetTop - 20, behavior:'smooth' }); };
  document.getElementById('btn-load-more').onclick = ()=>{ loadMore(); };
  document.getElementById('close-modal').onclick = ()=>{ closeModal(); };

  // initial render
  renderHeroInterests(); startOnline(); renderMatchSummary(); renderGrid(true); renderFavCount();

  // expose for debug
  window.dm = { seedUsers, renderGrid, getVisitor, saveVisitor };
})();
