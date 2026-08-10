// app.js - English UX, visitor gender selection, remove switch-user concept, click card opens WhatsApp, fake online counter, favorites per visitor
(function(){
  const USER_COUNT = 1000;
  const PER_PAGE = 24;
  const SUPPORT_WHATSAPP = '18325411560'; // support WhatsApp (international format without +)

  const firsts = ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark","Paul","Andrew","Joshua","Kenneth","Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Eric","Jacob"];
  const lasts = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Perez","Thompson"];
  const jobs = ["Software Engineer","Designer","Product Manager","Teacher","Nurse","Photographer","Sales Manager","Data Analyst","Chef","Marketing Specialist","Student","Consultant","Accountant","Lawyer","Entrepreneur"];
  const hobbies = ["hiking","coffee","traveling","reading","live music","gardening","cooking","yoga","photography","running","movies","board games","coding"];

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function pick(arr){ return arr[randInt(0,arr.length-1)]; }
  function makeEmail(name,id){ return `${name.toLowerCase().replace(/\s+/g,'')}${id}@example.com`; }
  function phone(){ return `+1-${randInt(200,999)}-${randInt(200,999)}-${randInt(1000,9999)}`; }

  const K_USERS = 'dm_users_v3';
  const K_FAVS = 'dm_favs_v3';
  const K_VISITOR = 'dm_visitor_v3';

  function seedUsers(){
    let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
    if(users && users.length >= USER_COUNT) return users;
    users = [];
    for(let i=1;i<=USER_COUNT;i++){
      const name = `${pick(firsts)} ${pick(lasts)}`;
      const age = randInt(19,55);
      const job = pick(jobs);
      const hobby = pick(hobbies);
      const imgIndex = (i % 100);
      const gender = (i % 2 === 0) ? 'male' : 'female';
      const photo = `https://randomuser.me/api/portraits/${gender === 'male' ? 'men' : 'women'}/${imgIndex}.jpg`;
      users.push({ id:i, name, age, country:'USA', gender, job, bio:`${job} who likes ${hobby} and meeting new people.`, email:makeEmail(name,i), phone:phone(), photo });
    }
    // admin user (not part of pool)
    users.push({ id: USER_COUNT + 1, name: 'SiteAdmin', age: 30, country:'USA', gender:'male', job:'Administrator', bio:'Site admin', email:'admin@example.com', phone:'+1-832-541-1560', photo: 'https://randomuser.me/api/portraits/men/10.jpg', is_admin:true });
    localStorage.setItem(K_USERS, JSON.stringify(users));
    return users;
  }

  function getFavs(){ return JSON.parse(localStorage.getItem(K_FAVS) || '[]'); }
  function saveFavs(a){ localStorage.setItem(K_FAVS, JSON.stringify(a)); }
  function getVisitor(){ return JSON.parse(localStorage.getItem(K_VISITOR) || 'null'); }
  function saveVisitor(v){ localStorage.setItem(K_VISITOR, JSON.stringify(v)); }

  function toggleFav(id){ const favs = getFavs(); if(favs.includes(id)){ const idx=favs.indexOf(id); favs.splice(idx,1); } else { favs.push(id); } saveFavs(favs); renderFavCount(); }
  function renderFavCount(){ document.getElementById('fav-count').textContent = getFavs().length; }

  function openSupport(visitor, targetId){
    const users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
    const target = users.find(u=>u.id===targetId);
    const visitorText = visitor ? `${visitor.type} visitor` : 'Guest';
    const t = target ? `${target.name} (ID:${target.id})` : `User ${targetId}`;
    const text = encodeURIComponent(`Hello, I am a ${visitorText}. I'm interested in ${t}. Please assist.`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    window.open(url, '_blank');
  }

  // online counter simulation
  function startOnlineCounter(){
    const el = document.getElementById('online-count');
    let base = 1200 + randInt(0,800); // starting online
    el.textContent = base.toLocaleString();
    setInterval(()=>{
      // small random walk
      const delta = randInt(-15,25);
      base = Math.max(50, base + delta);
      el.textContent = base.toLocaleString();
    }, 2000);
  }

  // UI
  const users = seedUsers();
  let page = 1;

  const grid = document.getElementById('profile-grid');
  const pager = document.getElementById('pager');
  const visitorTypeEl = document.getElementById('visitor-type');

  function renderSample(){ const sampleBox = document.getElementById('sample-users'); sampleBox.innerHTML=''; const sample = users.slice(0,24); sample.forEach(u=>{ const b=document.createElement('div'); b.className='me-2 mb-2 small'; b.innerHTML = `<button class="btn btn-sm btn-outline-secondary">${u.id} ${u.name}</button>`; b.querySelector('button').onclick = ()=>{ toggleFav(u.id); alert('Added to favorites'); }; sampleBox.appendChild(b); }); }

  function setVisitor(type){ const v={ type: type === 'male' ? 'Male' : 'Female' }; saveVisitor(v); visitorTypeEl.textContent = v.type; }

  function render(p=1, q=''){ page=p; grid.innerHTML=''; const start=(p-1)*PER_PAGE; const visitor = getVisitor(); let list = users.slice(0,USER_COUNT); if(visitor && visitor.type){ const wanted = visitor.type.toLowerCase() === 'male' ? 'female' : 'male'; list = list.filter(u=>u.gender === wanted); }
    if(q){ const qq=q.toLowerCase(); list = list.filter(u=>u.name.toLowerCase().includes(qq) || u.job.toLowerCase().includes(qq)); }
    const total=list.length; const items=list.slice(start, start+PER_PAGE);
    items.forEach(u=>{
      const col=document.createElement('div'); col.className='col-12 col-sm-6 col-md-4 col-lg-3';
      col.innerHTML = `<div class="profile-card" data-id="${u.id}">
        <img loading="lazy" src="${u.photo}" class="profile-photo" alt="${u.name}">
        <div class="profile-body">
          <div class="d-flex justify-content-between align-items-start">
            <div><div class="profile-name">${u.name}</div><div class="profile-sub">${u.age} • ${u.job} • ${u.country}</div></div>
            <div>
              <button class="btn btn-sm btn-outline-primary btn-like">❤</button>
            </div>
          </div>
          <p class="mt-2 small-muted">${u.bio}</p>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-light btn-view">View</button>
            <button class="btn btn-sm btn-success btn-contact">Contact</button>
          </div>
        </div></div>`;
      // clicking the card opens WhatsApp for that profile
      const card = col.querySelector('.profile-card');
      card.onclick = (e)=>{
        // if clicked on a button, let button handler run
        if(e.target.closest('button')) return;
        const visitor = getVisitor(); openSupport(visitor, u.id);
      };
      col.querySelector('.btn-view').onclick = (ev)=>{ ev.stopPropagation(); openModal(u.id); };
      col.querySelector('.btn-contact').onclick = (ev)=>{ ev.stopPropagation(); openSupport(getVisitor(), u.id); };
      const likeBtn = col.querySelector('.btn-like'); likeBtn.onclick = (ev)=>{ ev.stopPropagation(); toggleFav(u.id); likeBtn.textContent = getFavs().includes(u.id) ? '♥' : '❤'; renderFavCount(); };
      grid.appendChild(col);
    });
    renderPager(total);
    renderFavCount();
  }

  function renderPager(total){ pager.innerHTML=''; const pages = Math.max(1, Math.ceil(total / PER_PAGE)); for(let i=1;i<=pages;i++){ const li=document.createElement('li'); li.className='page-item'+(i===page?' active':''); const a=document.createElement('a'); a.className='page-link'; a.href='#'; a.textContent=i; a.onclick=(e)=>{ e.preventDefault(); render(i, document.getElementById('search-q').value.trim()); }; li.appendChild(a); pager.appendChild(li); if(i>=8 && i<pages){ const more=document.createElement('li'); more.className='page-item disabled'; more.innerHTML='<span class="page-link">...</span>'; pager.appendChild(more); break; } }
  }

  // modal
  const modal = document.getElementById('profileModal');
  function openModal(uid){ const u = users.find(x=>x.id===uid); if(!u) return; document.getElementById('modal-photo').src = u.photo; document.getElementById('modal-name').textContent = `${u.name}, ${u.age}`; document.getElementById('modal-location').textContent = `${u.country} • ${u.job}`; document.getElementById('modal-bio').textContent = u.bio + ' Email: ' + u.email; const actions = document.getElementById('modal-actions'); actions.innerHTML = ''; const likeBtn = document.createElement('button'); likeBtn.className='btn btn-primary btn-like me-2'; likeBtn.textContent='❤ Favorite'; likeBtn.onclick = ()=>{ toggleFav(u.id); alert('Added to favorites'); render(); closeModal(); };
    const contactBtn = document.createElement('button'); contactBtn.className='btn btn-success'; contactBtn.textContent='Contact Support (WhatsApp)'; contactBtn.onclick = ()=>{ openSupport(getVisitor(), u.id); };
    actions.appendChild(likeBtn); actions.appendChild(contactBtn);
    modal.classList.add('show'); }
  function closeModal(){ modal.classList.remove('show'); }

  // events
  document.getElementById('btn-search').onclick = ()=>{ render(1, document.getElementById('search-q').value.trim()); };
  document.getElementById('btn-gender-male').onclick = ()=>{ setVisitor('male'); render(1); };
  document.getElementById('btn-gender-female').onclick = ()=>{ setVisitor('female'); render(1); };
  document.getElementById('btn-contact-support').onclick = ()=>{ openSupport(getVisitor(), null); };
  document.getElementById('close-modal').onclick = closeModal;

  // init
  startOnlineCounter(); renderSample(); render();

  // expose for debugging
  window.dm = { seedUsers, openSupport, toggleFav, getFavs:getFavs, setVisitor, getVisitor };
})();
