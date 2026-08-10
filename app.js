// app.js - 纯前端实现（修改版）
// 修改内容：联系客服直接跳转 WhatsApp（18325411560）；虚拟用户只显示 USA，不显示具体城市
(function () {
  // config
  const USER_COUNT = 1000;
  const PER_PAGE = 20;
  const SUPPORT_WHATSAPP = '18325411560'; // 客服 WhatsApp

  // helper: simple fake data generator (no外部依赖)
  const firsts = ["James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles","Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Joshua","Kenneth","Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan"];
  const lasts = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin"];
  const cities = ["New York","Los Angeles","Chicago","Houston","Phoenix","San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville","Fort Worth","Columbus","San Francisco","Charlotte","Indianapolis"];

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function makeEmail(name, id){ return `${name.toLowerCase().replace(/\s+/g,'')}${id}@example.com`; }
  function phone(){ return `${randInt(200,999)}-${randInt(200,999)}-${randInt(1000,9999)}`; }

  // storage keys
  const K_USERS = 'dm_users_v1';
  const K_LIKES = 'dm_likes_v1'; // object: { likerId: [likedId,...], ... }
  const K_MATCHES = 'dm_matches_v1'; // array of "min-max" strings
  const K_ME = 'dm_me_v1'; // current user id

  // load/generate users
  function seedUsers() {
    let users = JSON.parse(localStorage.getItem(K_USERS) || 'null');
    if (users && users.length >= USER_COUNT) return users;
    users = [];
    for (let i=1;i<=USER_COUNT;i++){
      const name = `${firsts[randInt(0,firsts.length-1)]} ${lasts[randInt(0,lasts.length-1)]}`;
      users.push({
        id: i,
        name,
        age: randInt(18,60),
        city: 'USA', // 只显示在美国，不显示具体城市
        bio: `Hi, I'm ${name}. I enjoy hiking, coffee, and meeting new people.`,
        email: makeEmail(name,i),
        phone: phone()
      });
    }
    // add a SiteAdmin as id=1001 for convenience (仍然存在，但不用于工单审批流程)
    users.push({ id: USER_COUNT+1, name: "SiteAdmin", age: 30, city: "USA", bio: "Administrator", email: "admin@example.com", phone: "000-000-0000", is_admin:true});
    localStorage.setItem(K_USERS, JSON.stringify(users));
    return users;
  }

  // data helpers
  function getLikes(){ return JSON.parse(localStorage.getItem(K_LIKES) || '{}'); }
  function saveLikes(o){ localStorage.setItem(K_LIKES, JSON.stringify(o)); }
  function getMatches(){ return JSON.parse(localStorage.getItem(K_MATCHES) || '[]'); }
  function saveMatches(a){ localStorage.setItem(K_MATCHES, JSON.stringify(a)); }
  function setMe(id){ localStorage.setItem(K_ME, String(id)); }
  function getMe(){ const v = localStorage.getItem(K_ME); return v ? parseInt(v,10): null; }

  // business logic
  function likeUser(likerId, likedId) {
    if (likerId===likedId) return;
    const likes = getLikes();
    likes[likerId] = likes[likerId] || [];
    if (likes[likerId].includes(likedId)){
      // unlike
      likes[likerId] = likes[likerId].filter(x=>x!==likedId);
    } else {
      likes[likerId].push(likedId);
    }
    saveLikes(likes);
    // check mutual
    const likedLikes = likes[likedId] || [];
    if (likes[likerId].includes(likedId) && likedLikes.includes(likerId)) {
      // create match pair (store min-max string)
      const a = Math.min(likerId, likedId), b = Math.max(likerId, likedId);
      const matches = getMatches();
      const key = `${a}-${b}`;
      if (!matches.includes(key)){ matches.push(key); saveMatches(matches); }
      return true;
    }
    return false;
  }

  function isMatched(a,b){
    const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
    return getMatches().includes(key);
  }

  // 新：联系客服 -> 直接打开 WhatsApp（带上简单说明）
  function openSupportWhatsApp(requesterId, targetId){
    const users = JSON.parse(localStorage.getItem(K_USERS) || '[]');
    const requester = users.find(u=>u.id===requesterId);
    const target = users.find(u=>u.id===targetId);
    const rName = requester ? requester.name : `User ${requesterId}`;
    const tName = target ? target.name : `User ${targetId}`;
    const text = encodeURIComponent(`您好，我(${rName}, ID:${requesterId})想索要 ${tName} (ID:${targetId}) 的联系方式，请帮忙。`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    window.open(url, '_blank');
    return true;
  }

  // UI rendering
  const users = seedUsers();
  let currentPage = 1;

  function renderSampleUsers(){
    const box = document.getElementById('sample-users');
    box.innerHTML = '';
    const sample = users.slice(0,50);
    sample.forEach(u=>{
      const a = document.createElement('a');
      a.href='#';
      a.className = 'list-group-item list-group-item-action';
      a.textContent = `${u.id} - ${u.name} (${u.city})`;
      a.onclick = (e)=>{ e.preventDefault(); document.getElementById('input-user-id').value = u.id; document.getElementById('btn-login').click(); }
      box.appendChild(a);
    });
  }

  function renderProfiles(page=1, q=''){
    currentPage = page;
    const start = (page-1)*PER_PAGE;
    let list = users.filter(u=>u.id !== getMe());
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter(u=>u.name.toLowerCase().includes(qq) || u.city.toLowerCase().includes(qq));
    }
    const total = list.length;
    const pageItems = list.slice(start, start+PER_PAGE);

    const container = document.getElementById('profile-list');
    container.innerHTML = '';
    const likes = getLikes();
    const meId = getMe();

    pageItems.forEach(u=>{
      const col = document.createElement('div');
      col.className = 'col-md-6 mb-3';
      col.innerHTML = `<div class="card profile-card"><div class="card-body">
        <h5>${u.name} <small class="text-muted">(${u.age})</small></h5>
        <p>${u.city}</p>
        <p>${u.bio}</p>
        <div>
          <button class="btn btn-sm btn-outline-primary btn-like" data-id="${u.id}">❤ 喜欢</button>
          <button class="btn btn-sm btn-link btn-view" data-id="${u.id}">查看</button>
          <span class="ms-2 badge bg-success d-none match-badge">已匹配</span>
        </div>
      </div></div>`;
      container.appendChild(col);
      // set button state
      const btnLike = col.querySelector('.btn-like');
      const liked = meId && (likes[meId]||[]).includes(u.id);
      btnLike.textContent = liked ? '♥ 已喜欢' : '❤ 喜欢';
      btnLike.onclick = ()=>{ if(!meId){ alert('请先登录/选择用户'); return; } const matched = likeUser(meId, u.id); if(matched) alert('恭喜！已匹配🎉'); renderProfiles(currentPage, document.getElementById('search-q')?.value || ''); renderPager(total); }

      const btnView = col.querySelector('.btn-view');
      btnView.onclick = ()=>{ showProfileModal(u.id); }

      // show match badge if matched
      if (meId && isMatched(meId, u.id)){
        col.querySelector('.match-badge').classList.remove('d-none');
      }
    });

    renderPager(total);
  }

  function renderPager(total){
    const pager = document.getElementById('pager');
    pager.innerHTML = '';
    const pages = Math.max(1, Math.ceil(total / PER_PAGE));
    for (let i=1;i<=pages;i++){
      const li = document.createElement('li');
      li.className = 'page-item' + (i===currentPage ? ' active' : '');
      const a = document.createElement('a');
      a.className = 'page-link';
      a.href = '#';
      a.textContent = i;
      a.onclick = (e)=>{ e.preventDefault(); renderProfiles(i, document.getElementById('search-q')?.value || ''); }
      li.appendChild(a);
      pager.appendChild(li);
      if (i>=10 && i<pages) { // avoid too many pages in UI, show first 10 then stop (simple)
        const more = document.createElement('li'); more.className='page-item disabled'; more.innerHTML='<span class="page-link">...</span>'; pager.appendChild(more); break;
      }
    }
  }

  // modal
  const modal = document.getElementById('profileModal');
  function showProfileModal(uid){
    const u = users.find(x=>x.id===uid);
    if (!u) return;
    document.getElementById('modal-name').textContent = `${u.name} (${u.age})`;
    document.getElementById('modal-city').textContent = u.city;
    document.getElementById('modal-bio').textContent = u.bio;
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = '';
    const me = getMe();
    const liked = me && (getLikes()[me]||[]).includes(u.id);
    const likeBtn = document.createElement('button');
    likeBtn.className = 'btn btn-primary me-2';
    likeBtn.textContent = liked ? '取消喜欢' : '❤ 喜欢';
    likeBtn.onclick = ()=>{
      if(!me){ alert('请先登录'); return; }
      const matched = likeUser(me, u.id);
      if (matched) alert('恭喜！已匹配🎉');
      closeModal(); renderProfiles(currentPage, document.getElementById('search-q')?.value || '');
    };
    actions.appendChild(likeBtn);

    if (me && isMatched(me, u.id)){
      const reqBtn = document.createElement('button');
      reqBtn.className = 'btn btn-success';
      reqBtn.textContent = '联系客服索要联系方式';
      reqBtn.onclick = ()=>{
        openSupportWhatsApp(me, u.id);
        closeModal();
      };
      actions.appendChild(reqBtn);
    }

    // 不再显示工单信息（已移除工单流程）
    document.getElementById('modal-ticket').innerHTML = '';

    modal.classList.add('show');
  }
  function closeModal(){ modal.classList.remove('show'); }

  // 将原来的管理员按钮改为直接打开客服 WhatsApp（因为不再有工单审批流程）
  function openSupportFromHeader(){
    // 若已登录则包含请求者信息，否则不带 requester
    const me = getMe();
    const requesterText = me ? `我(用户ID:${me})` : '我';
    const text = encodeURIComponent(`您好，${requesterText} 需要客服协助。`);
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
    window.open(url, '_blank');
  }

  // init and events
  document.getElementById('btn-show-login').onclick = ()=>{
    document.getElementById('login-area').scrollIntoView({behavior:'smooth'});
  };
  document.getElementById('btn-admin').onclick = openSupportFromHeader; // 改为直接联系客服
  document.getElementById('close-modal').onclick = closeModal;

  document.getElementById('btn-login').onclick = ()=>{
    const v = Number(document.getElementById('input-user-id').value);
    if (!v || !users.find(u=>u.id===v)){ alert('请输入有效用户 ID'); return; }
    setMe(v);
    alert('已切换为用户 ID ' + v);
    renderProfiles(1);
    renderSampleUsers();
  };

  // initial UI: search box
  const searchRow = document.createElement('div');
  searchRow.className = 'mb-3 row';
  searchRow.innerHTML = `<div class="col-auto"><input id="search-q" class="form-control" placeholder="搜索名字或城市"></div>
    <div class="col-auto"><button id="btn-search" class="btn btn-secondary">搜索</button></div>`;
  document.querySelector('main.container').insertBefore(searchRow, document.getElementById('profile-list'));
  document.getElementById('btn-search').onclick = ()=>{ renderProfiles(1, document.getElementById('search-q').value.trim()); };

  // render initial
  renderSampleUsers();
  renderProfiles(1);

  // expose some helpers for debugging (optional)
  window.dm = { users, seedUsers, getLikes, getMatches, submitSupport: openSupportWhatsApp, setMe, getMe };
})();
