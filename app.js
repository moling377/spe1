// app.js - 改进：游客可浏览、每人带照片、点击卡片可联系客服（WhatsApp）、更真实的假人资料
(function(){
  const USER_COUNT = 1000;
  const PER_PAGE = 24;
  const SUPPORT_WHATSAPP = '18325411560'; // 客服 WhatsApp

  const firsts = ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark","Paul","Andrew","Joshua","Kenneth","Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Eric","Jacob"];
  const lasts = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Perez","Thompson"];
  const jobs = ["Software Engineer","Designer","Product Manager","Teacher","Nurse","Photographer","Sales Manager","Data Analyst","Chef","Marketing Specialist","Student","Consultant","Accountant","Lawyer","Entrepreneur"];
  const hobbies = ["hiking","coffee","traveling","reading","live music","gardening","cooking","yoga","photography","running","movies","board games","coding"];

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function pick(arr){ return arr[randInt(0,arr.length-1)]; }
  function makeEmail(name,id){ return `${name.toLowerCase().replace(/\s+/g,'')}${id}@example.com`; }
  function phone(){ return `+1-${randInt(200,999)}-${randInt(200,999)}-${randInt(1000,9999)}`; }

  const K_USERS = 'dm_users_v2';
  const K_LIKES = 'dm_likes_v2';
  const K_MATCHES = 'dm_matches_v2';
  const K_ME = 'dm_me_v2';

  function seedUsers(){
    let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
    if(users && users.length >= USER_COUNT) return users;
    users = [];
    for(let i=1;i<=USER_COUNT;i++){
      const name = `${pick(firsts)} ${pick(lasts)}`;
      const age = randInt(19,55);
      const job = pick(jobs);
      const hobby = pick(hobbies);
      // use randomuser portraits (0-99) and alternate gender
      const imgIndex = (i % 100);
      const gender = (i % 2 === 0) ? 'men' : 'women';
      const photo = `https://randomuser.me/api/portraits/${gender}/${imgIndex}.jpg`;
      users.push({ id:i, name, age, city:'USA', job, bio:`${job} who likes ${hobby} and meeting new people.`, email:makeEmail(name,i), phone:phone(), photo });
    }
    // add admin user (not shown among first 1000)
    users.push({ id: USER_COUNT + 1, name: 'SiteAdmin', age: 30, city:'USA', job:'Administrator', bio:'Site admin', email:'admin@example.com', phone:'+1-832-541-1560', photo: 'https://randomuser.me/api/portraits/men/10.jpg', is_admin:true });
    localStorage.setItem(K_USERS, JSON.stringify(users));
    return users;
  }

  function getLikes(){ return JSON.parse(localStorage.getItem(K_LIKES) || '{}'); }
  function saveLikes(o){ localStorage.setItem(K_LIKES, JSON.stringify(o)); }
  function getMatches(){ return JSON.parse(localStorage.getItem(K_MATCHES) || '[]'); }
  function saveMatches(a){ localStorage.setItem(K_MATCHES, JSON.stringify(a)); }
  function setMe(id){ localStorage.setItem(K_ME, String(id)); }
  function getMe(){ const v = localStorage.getItem(K_ME); return v?parseInt(v,10):null; }

  function likeUser(likerId, likedId){
    if(!likerId) return false;
    if(likerId===likedId) return false;
    const likes = getLikes();
    likes[likerId] = likes[likerId] || [];
    if(likes[likerId].includes(likedId)){
      likes[likerId] = likes[likerId].filter(x=>x!==likedId);
    } else {
      likes[likerId].push(likedId);
    }
    saveLikes(likes);
    const likedLikes = likes[likedId] || [];
    if(likes[likerId].includes(likedId) && likedLikes.includes(likerId)){
      const a = Math.min(likerId, likedId), b=Math.max(likerId, likedId);
      const matches = getMatches(); const key = `${a}-${b}`;
      if(!matches.includes(key)){ matches.push(key); saveMatches(matches); }
      return true;
    }
    return false;
  }

  function isMatched(a,b){ const key = `${Math.min(a,b)}-${Math.max(a,b)}`; return getMatches().includes(key); }

  function openSupport(requesterId, targetId){
    const users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
    const requester = users.find(u=>u.id===requesterId);
    const target = users.find(u=>u.id===targetId);
    const r = requester ? `${requester.name} (ID:${requester.id})` : 'Guest';
    const t = target ? `${target.name} (ID:${target.id})` : `User ${targetId}`;
    const text = encodeURIComponent(`您好，我是${r}，我想索要 ${t} 的联系方式，请协助。`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    window.open(url, '_blank');
  }

  // UI
  const users = seedUsers();
  let page = 1;

  const grid = document.getElementById('profile-grid');
  const pager = document.getElementById('pager');
  const sampleBox = document.getElementById('sample-users');
  const currentUserSpan = document.getElementById('current-user');

  function renderSample(){ sampleBox.innerHTML = ''; const sample = users.slice(0,24); sample.forEach(u=>{
    const btn = document.createElement('button'); btn.className='btn btn-sm btn-outline-secondary'; btn.textContent=`${u.id} ${u.name}`;
    btn.onclick = ()=>{ setMe(u.id); renderCurrent(); alert('切换为用户 ' + u.id); render(); };
    sampleBox.appendChild(btn);
  }); }

  function renderCurrent(){ const me = getMe(); currentUserSpan.textContent = me ? `ID ${me}` : '游客'; }

  function render(p=1, q=''){ page = p; grid.innerHTML = ''; const start=(p-1)*PER_PAGE; let list = users.slice(0,USER_COUNT); // exclude admin at the end
    if(q){ const qq=q.toLowerCase(); list = list.filter(u=>u.name.toLowerCase().includes(qq) || u.city.toLowerCase().includes(qq) || u.job.toLowerCase().includes(qq)); }
    const total = list.length; const items = list.slice(start, start+PER_PAGE);
    items.forEach(u=>{
      const col = document.createElement('div'); col.className='col-12 col-sm-6 col-md-4 col-lg-3';
      col.innerHTML = `<div class="profile-card">
        <img loading="lazy" src="${u.photo}" class="profile-photo" alt="${u.name}">
        <div class="profile-body">
          <div class="d-flex justify-content-between align-items-start">
            <div><div class="profile-name">${u.name}</div><div class="profile-sub">${u.age} • ${u.job} • ${u.city}</div></div>
            <div>
              <button class="btn btn-sm btn-outline-primary btn-like">❤</button>
            </div>
          </div>
          <p class="mt-2 small-muted">${u.bio}</p>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-light btn-view">查看</button>
            <button class="btn btn-sm btn-success btn-contact">联系客服</button>
          </div>
        </div></div>`;
      grid.appendChild(col);
      // bind
      col.querySelector('.btn-view').onclick = ()=>{ openModal(u.id); };
      col.querySelector('.btn-contact').onclick = ()=>{ openSupport(getMe(), u.id); };
      const likeBtn = col.querySelector('.btn-like'); likeBtn.onclick = ()=>{ const me=getMe(); if(!me){ alert('请先切换为用户以使用喜欢功能（或继续以游客身份浏览）。'); return; } const matched = likeUser(me, u.id); likeBtn.textContent = matched ? '♥' : '❤'; if(matched) alert('已匹配！'); };
    });
    renderPager(total);
  }

  function renderPager(total){ pager.innerHTML=''; const pages = Math.max(1, Math.ceil(total / PER_PAGE)); for(let i=1;i<=pages;i++){ const li=document.createElement('li'); li.className='page-item'+(i===page?' active':''); const a=document.createElement('a'); a.className='page-link'; a.href='#'; a.textContent=i; a.onclick=(e)=>{e.preventDefault(); render(i, document.getElementById('search-q').value.trim());}; li.appendChild(a); pager.appendChild(li); if(i>=8 && i<pages){ const more=document.createElement('li'); more.className='page-item disabled'; more.innerHTML='<span class="page-link">...</span>'; pager.appendChild(more); break; } }
  }

  // modal logic
  const modal = document.getElementById('profileModal');
  function openModal(uid){ const u = users.find(x=>x.id===uid); if(!u) return; document.getElementById('modal-photo').src = u.photo; document.getElementById('modal-name').textContent = `${u.name}, ${u.age}`; document.getElementById('modal-location').textContent = `${u.city} • ${u.job}`; document.getElementById('modal-bio').textContent = u.bio + ' Email: ' + u.email; const actions = document.getElementById('modal-actions'); actions.innerHTML = ''; const likeBtn = document.createElement('button'); likeBtn.className='btn btn-primary btn-like me-2'; likeBtn.textContent='❤ 喜欢'; likeBtn.onclick = ()=>{ const me=getMe(); if(!me){ alert('请先切换用户以使用喜欢功能。'); return; } const matched = likeUser(me, u.id); if(matched) alert('已匹配！'); render(); closeModal(); };
    const contactBtn = document.createElement('button'); contactBtn.className='btn btn-success'; contactBtn.textContent='联系客服'; contactBtn.onclick = ()=>{ openSupport(getMe(), u.id); };
    actions.appendChild(likeBtn); actions.appendChild(contactBtn);
    modal.classList.add('show'); }
  function closeModal(){ modal.classList.remove('show'); }

  // events
  document.getElementById('btn-search').onclick = ()=>{ render(1, document.getElementById('search-q').value.trim()); };
  document.getElementById('btn-show-login').onclick = ()=>{ document.getElementById('input-user-id').scrollIntoView({behavior:'smooth'}); };
  document.getElementById('btn-contact-support').onclick = ()=>{ const me=getMe(); openSupport(me, null); };
  document.getElementById('btn-login').onclick = ()=>{ const v = Number(document.getElementById('input-user-id').value); if(!v || !users.find(u=>u.id===v)){ alert('请输入有效用户 ID'); return; } setMe(v); renderCurrent(); alert('已切换为用户 ' + v); render(); };
  document.getElementById('close-modal').onclick = closeModal;

  // init
  renderSample(); renderCurrent(); render();

  // expose for debugging
  window.dm = { seedUsers, openSupport, likeUser, getLikes:getLikes, getMatches:()=>getMatches(), setMe, getMe };
})();
