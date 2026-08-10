// app.js - onboarding + preference-based matching (seeking enforced, age range 35-65), WhatsApp CTA preserved
(function(){
  const USER_COUNT = 1000;
  const PAGE_SIZE = 24;
  const SUPPORT_WHATSAPP = '18325411560';

  // data pools
  const firsts = ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark","Paul","Andrew","Joshua","Kenneth","Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Eric","Jacob"];
  const lasts = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Perez","Thompson"];
  const jobs = ["Software Engineer","Designer","Product Manager","Teacher","Nurse","Photographer","Sales Manager","Data Analyst","Chef","Marketing Specialist","Student","Consultant","Accountant","Lawyer","Entrepreneur"];
  const interestsPool = ["hiking","coffee","travel","reading","music","gardening","cooking","yoga","photography","running","movies","games","coding","tech","art","sports","traveling","pets","fashion","fitness"];

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function pick(arr){ return arr[randInt(0,arr.length-1)]; }

  // localStorage keys
  const K_USERS = 'dm_users_v5_localpics';
  const K_VISITOR = 'dm_visitor_v4';
  const K_FAVS = 'dm_favs_v4';

  // seed users with lastActive & popularity
  function seedUsers(){
    let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
    if(users && users.length >= USER_COUNT) return users;
    users = [];
    for(let i=1;i<=USER_COUNT;i++){
      const name = `${pick(firsts)} ${pick(lasts)}`;
      // expand age to 22-75
      const age = randInt(22,75);
      const job = pick(jobs);
      const photoIndex = (i % 12) + 1;
      const gender = (i % 2 === 0) ? 'male' : 'female';
      let ints = [];
      const count = randInt(2,6);
      while(ints.length < count){ const t = pick(interestsPool); if(!ints.includes(t)) ints.push(t); }
      const localPhoto = `images/portrait${photoIndex}.svg`;
      const remotePhoto = `https://source.unsplash.com/600x600/?portrait,face,person&sig=${i}`;
      // simulate lastActive (minutes ago) and popularity
      const lastActiveMins = randInt(1,60*24*7); // up to 1 week
      const popularity = randInt(0,5000);
      users.push({ id:i, name, age, job, country:'USA', gender, interests: ints, bio: `${job} who likes ${ints.slice(0,3).join(', ')}.`, email:`${name.toLowerCase().replace(/\s+/g,'')}${i}@example.com`, phone:`+1-${randInt(200,999)}-${randInt(200,999)}-${randInt(1000,9999)}`, photo: localPhoto, remotePhoto, lastActiveMins, popularity});
    }
    users.push({ id: USER_COUNT + 1, name: 'SiteAdmin', age: 30, job:'Administrator', country:'USA', gender:'male', interests:['support'], bio:'Site admin', email:'admin@example.com', phone:'+1-832-541-1560', photo:'images/portrait1.svg', is_admin:true, lastActiveMins:1, popularity:9999});
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

  // matching algorithm
  // weights (tunable)
  const WEIGHTS = { interests:0.5, recency:0.15, popularity:0.1, random:0.1 };

  function scoreProfile(profile, visitor){
    // visitor: { type, seeking, interests[], ageRange:[min,max] }
    const vInterests = (visitor && Array.isArray(visitor.interests)) ? visitor.interests : [];
    // hard filters
    if(visitor && visitor.seeking && visitor.seeking !== 'any'){
      if(profile.gender !== visitor.seeking) return { score: -1, reason:'seeking_mismatch', shared: [], sharedCount:0 };
    }
    if(visitor && visitor.ageRange){ const [amin,amax] = visitor.ageRange; if(profile.age < amin || profile.age > amax) return { score:-1, reason:'age_mismatch', shared: [], sharedCount:0 }; }

    // interest overlap
    const shared = profile.interests.filter(x=>vInterests.includes(x));
    const sharedCount = shared.length;
    const interestScore = vInterests.length ? (sharedCount / vInterests.length) : 0;

    // recency: more recent (smaller lastActiveMins) is better
    const recency = Math.max(0, 1 - Math.min(profile.lastActiveMins, 60*24*7) / (60*24*7)); // 0..1

    // popularity normalized
    const popNorm = Math.tanh(profile.popularity / 1000); // 0..~1

    // randomness floor
    const rand = Math.random() * 0.2; // up to 0.2

    // weighted sum
    const weighted = (interestScore * WEIGHTS.interests) + (recency * WEIGHTS.recency) + (popNorm * WEIGHTS.popularity) + (rand * WEIGHTS.random);
    const raw = weighted / (WEIGHTS.interests + WEIGHTS.recency + WEIGHTS.popularity + WEIGHTS.random);
    const score = Math.round(Math.min(1, raw) * 100);
    return { score, shared, sharedCount, interestScore, recency, popNorm };
  }

  // UI helpers
  function formatLastActive(mins){ if(mins<60) return `${mins}m ago`; if(mins<60*24) return `${Math.round(mins/60)}h ago`; return `${Math.round(mins/(60*24))}d ago`; }

  // WhatsApp opener (preserve)
  function openWhatsApp(visitor, profile, match){
    const visitorText = visitor ? `${visitor.type} visitor` : 'Guest';
    const interestsText = visitor && visitor.interests && visitor.interests.length ? `Interests: ${visitor.interests.join(', ')}` : '';
    const matchText = match && match.sharedCount ? `Shared interests: ${match.shared.join(', ')}` : '';
    const text = encodeURIComponent(`Hello, I am a ${visitorText}. I'm interested in ${profile.name} (ID:${profile.id}). ${interestsText} ${matchText}`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    window.open(url, '_blank');
  }

  // render
  const users = seedUsers();
  let page = 1; let currentList = [];

  function renderHeroControls(){ document.getElementById('btn-open-onboard').onclick = ()=>{ openOnboard(); }; }

  // onboarding UI
  function renderOnboardChips(){ const c = document.getElementById('onboard-interests'); c.innerHTML=''; interestsPool.slice(0,18).forEach(tag=>{ const b = document.createElement('button'); b.className='chip'; b.textContent = tag; b.onclick = ()=>{ b.classList.toggle('active'); }; c.appendChild(b); }); }
  function openOnboard(){ const m = document.getElementById('onboardModal'); m.classList.add('show'); renderOnboardChips(); bindOnboard(); }
  function closeOnboard(){ const m = document.getElementById('onboardModal'); m.classList.remove('show'); }

  function bindOnboard(){
    document.getElementById('ob-cancel').onclick = ()=>{ closeOnboard(); };
    document.getElementById('ob-save').onclick = ()=>{
      const type = document.querySelector('#onboardModal #ob-male.active') ? 'male' : document.querySelector('#onboardModal #ob-female.active') ? 'female' : 'other';
      let seeking = 'any'; if(document.querySelector('#onboardModal #seek-male.active')) seeking='male'; if(document.querySelector('#onboardModal #seek-female.active')) seeking='female';
      const amin = parseInt(document.getElementById('age-min').value||35,10); const amax = parseInt(document.getElementById('age-max').value||65,10);
      const chips = Array.from(document.querySelectorAll('#onboard-interests .chip.active')).map(x=>x.textContent);
      if(chips.length===0){ alert('Please choose at least one interest'); return; }
      const visitor = { type, seeking, interests: chips.slice(0,5), ageRange:[amin,amax], createdAt: Date.now() };
      saveVisitor(visitor); closeOnboard(); renderMatchSummary(); renderGrid(true);
    };
    // toggle seekers and type buttons
    ['ob-male','ob-female','ob-other'].forEach(id=>{ const el=document.getElementById(id); el.onclick=()=>{ ['ob-male','ob-female','ob-other'].forEach(i=>document.getElementById(i).classList.remove('active')); el.classList.add('active'); }; });
    ['seek-male','seek-female','seek-any'].forEach(id=>{ const el=document.getElementById(id); el.onclick=()=>{ ['seek-male','seek-female','seek-any'].forEach(i=>document.getElementById(i).classList.remove('active')); el.classList.add('active'); }; });
  }

  function getVisitorInterests(){ const v = getVisitor(); return v && v.interests ? v.interests : []; }

  function renderMatchSummary(){ const visitor = getVisitor(); const el = document.getElementById('match-summary'); if(visitor && visitor.interests && visitor.interests.length){ el.textContent = `Showing matches for ${visitor.seeking==='any'? 'all' : visitor.seeking} aged ${visitor.ageRange?visitor.ageRange.join('-'):'any'} with interests: ${visitor.interests.join(', ')}`; } else { el.textContent = 'Create a quick visitor profile to see personalized recommendations.'; } }

  function renderGrid(reset=false){ if(reset) page=1; const grid = document.getElementById('profile-grid'); if(reset) grid.innerHTML=''; const visitor = getVisitor(); let list = users.slice(); // copy
    // apply matching and scoring
    const scored = list.map(p=>{ const s = scoreProfile(p, visitor||{}); return Object.assign({}, p, { matchScore: s.score, shared: s.shared, sharedCount: s.sharedCount, mismatch: s.score === -1 ? s.reason : null }); });
    // filter out mismatches
    const filtered = scored.filter(p=>p.mismatch===null);
    filtered.sort((a,b)=>{ if(a.matchScore===b.matchScore) return b.popularity - a.popularity; return b.matchScore - a.matchScore; });
    currentList = filtered;
    const start = (page-1)*PAGE_SIZE; const items = filtered.slice(start, start+PAGE_SIZE);
    items.forEach(p=>{ const col = document.createElement('div'); col.className='col-12 col-sm-6 col-md-4 col-lg-3'; const sharedHtml = p.shared && p.shared.length ? `<div class="mt-2">${p.shared.map(t=>`<span class="tag-chip match">${t}</span>`).join(' ')}</div>` : '';
      const safeScore = (typeof p.matchScore === 'number' && !isNaN(p.matchScore)) ? p.matchScore : 0;
      const lastActive = formatLastActive(p.lastActiveMins);
      const imgSrc = p.photo || p.remotePhoto;
      const imgHtml = `<img loading="lazy" src="${imgSrc}" class="profile-photo" alt="${p.name}">`;
      col.innerHTML = `<div class="profile-card" data-id="${p.id}">
        ${imgHtml}
        <div class="profile-body">
          <div class="d-flex justify-content-between align-items-start">
            <div><div class="profile-name">${p.name}</div><div class="profile-sub">${p.age} • ${p.job} • ${p.country}</div></div>
            <div class="text-end"><div class="match-score">${safeScore}%</div><div class="small-muted">${p.sharedCount? p.sharedCount+' shared':''}</div></div>
          </div>
          <p class="mt-2 small-muted">${p.bio}</p>
          <div class="d-flex flex-wrap gap-2 mt-2">${p.interests.map(t=>`<span class="tag-chip ${getVisitorInterests().includes(t)?'match':''}">${t}</span>`).join(' ')}</div>
          ${sharedHtml}
          <div class="mt-2 small-muted">Active: ${lastActive} • Popularity: ${p.popularity}</div>
        </div></div>`;
      const card = col.querySelector('.profile-card');
      card.onclick = ()=>{ openProfileModal(p.id); };
      grid.appendChild(col);
    });
  }

  function openProfileModal(id){ const p = users.find(x=>x.id===id); if(!p) return; const visitor = getVisitor(); const match = scoreProfile(p, visitor||{});
    const modalPhotoEl = document.getElementById('modal-photo'); modalPhotoEl.src = p.photo || p.remotePhoto; document.getElementById('modal-name').textContent = `${p.name}`; document.getElementById('modal-meta').textContent = `${p.age} • ${p.job} • ${p.country}`; document.getElementById('modal-bio').textContent = p.bio + ' Email: ' + p.email; const tags = document.getElementById('modal-tags'); tags.innerHTML = p.interests.map(t=>`<span class="tag-chip ${visitor && visitor.interests && visitor.interests.includes(t)?'match':''}">${t}</span>`).join(' ');
    const actions = document.getElementById('modal-actions'); actions.innerHTML = '';
    const contactBtn = document.createElement('button'); contactBtn.className='btn btn-success me-2'; contactBtn.textContent = 'Contact Support (WhatsApp)'; contactBtn.onclick = ()=>{ openWhatsApp(visitor, p, match); };
    const favBtn = document.createElement('button'); favBtn.className='btn btn-outline-primary'; favBtn.textContent = getFavs().includes(p.id)?'♥ Favorited':'♡ Favorite'; favBtn.onclick = ()=>{ toggleFav(p.id); favBtn.textContent = getFavs().includes(p.id)?'♥ Favorited':'♡ Favorite'; };
    actions.appendChild(contactBtn); actions.appendChild(favBtn);
    document.getElementById('profileModal').classList.add('show'); }
  function closeModal(){ document.getElementById('profileModal').classList.remove('show'); }

  function loadMore(){ page++; const total = currentList.length; const maxPage = Math.ceil(total / PAGE_SIZE); if(page > maxPage) { document.getElementById('btn-load-more').disabled = true; return; } renderGrid(); }

  function startOnline(){ const el = document.getElementById('online-count'); let base = 1400 + randInt(0,600); el.textContent = base.toLocaleString(); setInterval(()=>{ const delta = randInt(-10,20); base = Math.max(80, base + delta); el.textContent = base.toLocaleString(); }, 2000); }

  // bind UI
  document.getElementById('cta-browse').onclick = ()=>{ window.scrollTo({ top: document.getElementById('results').offsetTop - 20, behavior:'smooth' }); };
  document.getElementById('cta-how').onclick = ()=>{ window.scrollTo({ top: document.querySelector('.how-it-works').offsetTop - 20, behavior:'smooth' }); };
  document.getElementById('btn-search').onclick = ()=>{ renderGrid(true); };
  document.getElementById('btn-load-more').onclick = ()=>{ loadMore(); };
  document.getElementById('close-modal').onclick = ()=>{ closeModal(); };

  // initial
  renderHeroControls(); renderOnboardChips(); startOnline(); renderMatchSummary(); renderGrid(true); renderFavCount();

  // expose debug
  window.dm = { seedUsers, renderGrid, getVisitor, saveVisitor, scoreProfile };
})();
