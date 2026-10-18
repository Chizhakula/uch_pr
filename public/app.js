'use strict';
const state = { user: null, rooms: [] };
const $ = id => document.getElementById(id);
const text = value => String(value ?? '');
const el = (tag, content='', className='') => {
  const node=document.createElement(tag);node.textContent=text(content);if(className)node.className=className;return node;
};
function notice(message, isError=false) { const n=$('notice');n.textContent=message;n.className=`notice${isError?' error':''}`;window.scrollTo({top:0,behavior:'instant'}); }
function clearNotice(){ $('notice').className='notice hidden'; }
async function api(url,options={}) {
  const response=await fetch('/api'+url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});
  let data;try{data=await response.json();}catch{throw new Error('Сервер вернул некорректный ответ.');}
  if(!response.ok)throw new Error(data.error||'Ошибка запроса.');
  return data;
}
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
const STATUS={new:'Новая',scheduled:'Мероприятие назначено',completed:'Завершено'};
const PAYMENT={in_person:'При очном посещении',sbp:'Переводом по СБП'};
const TYPES={auditorium:'Аудитория',coworking:'Коворкинг',cinema:'Кинозал'};
function fmtDate(value) {
  if(!value)return '';
  const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return match?`${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`:text(value);
}
function navLink(label,hash) {const a=el('a',label);a.href='#'+hash;return a;}
function renderNav() {
  const n=$('nav');n.replaceChildren();
  if(!state.user) {n.append(navLink('Вход','login'),navLink('Регистрация','register'));return;}
  if(state.user.role==='admin')n.append(navLink('Все заявки','admin'));
  else n.append(navLink('Помещения','rooms'),navLink('Новая заявка','create'),navLink('Мои заявки','bookings'));
  n.append(el('span',state.user.login,'muted'));
  const logout=el('button','Выйти','secondary');logout.type='button';logout.addEventListener('click',async()=>{
    try {await api('/logout',{method:'POST'});state.user=null;renderNav();location.hash='login';showView();notice('Вы вышли из системы.');}
    catch(e){notice(e.message,true);}
  });n.append(logout);
}
async function showView() {
  const available=state.user?(state.user.role==='admin'?['admin']:['rooms','create','bookings']):['login','register'];
  let name=location.hash.slice(1);
  if(!available.includes(name)){name=available[0];history.replaceState(null,'','#'+name);}
  for(const view of document.querySelectorAll('.view'))view.classList.toggle('hidden',view.id!==name+'-view');
  clearNotice();
  try {
    if(name==='rooms'||name==='create')await loadRooms();
    if(name==='bookings')await loadMine();
    if(name==='admin')await loadAdmin();
  }catch(e){notice(e.message,true);}
}
async function loadRooms() {
  state.rooms=(await api('/rooms')).rooms;
  const options=$('room-options');options.replaceChildren();
  state.rooms.forEach(r=>{const option=document.createElement('option');option.value=r.name;options.append(option);});
  renderRooms();
}
function renderRooms() {
  const value=$('room-search').value.trim().toLowerCase();const list=$('rooms-list');list.replaceChildren();
  const rooms=state.rooms.filter(r=>r.name.toLowerCase().includes(value));
  if(!rooms.length)list.append(el('p','Помещения не найдены.'));
  for(const r of rooms){
    const card=el('div','','room');card.append(el('h3',r.name),el('p',`${TYPES[r.room_type]}. Вместимость: ${r.capacity} чел.`),el('p',r.description));
    const btn=el('button','Забронировать');btn.addEventListener('click',()=>{$('room-name').value=r.name;location.hash='create';});card.append(btn);list.append(card);
  }
}
async function loadMine() {
  const list=$('my-bookings');list.replaceChildren();const rows=(await api('/bookings')).bookings;
  if(!rows.length){list.append(el('div','У вас пока нет заявок.','card'));return;}
  for(const b of rows){
    const card=el('article','','card booking');card.append(el('h2',`Заявка №${b.id} - ${b.room_name}`));
    card.append(el('p',`Начало: ${fmtDate(b.starts_at)}`),el('p',`Оплата: ${PAYMENT[b.payment_method]}`),el('p',`Статус: ${STATUS[b.status]}`));
    if(b.review_id)card.append(el('p',`Ваш отзыв: ${b.rating}/5 - ${b.comment}`));
    else if(b.status==='completed'){
      const form=document.createElement('form');form.className='review-form';
      const ratingLabel=el('label','Оценка');const select=document.createElement('select');select.name='rating';
      for(let i=5;i>=1;i--){const opt=document.createElement('option');opt.value=i;opt.textContent=`${i} из 5`;select.append(opt);}ratingLabel.append(select);
      const commentLabel=el('label','Отзыв');const input=document.createElement('textarea');input.name='comment';input.required=true;input.maxLength=1000;commentLabel.append(input);
      const btn=el('button','Отправить отзыв');form.append(ratingLabel,commentLabel,btn);
      form.addEventListener('submit',async ev=>{ev.preventDefault();try{await api(`/bookings/${b.id}/review`,{method:'POST',body:JSON.stringify(formData(form))});await loadMine();notice('Отзыв сохранён.');}catch(e){notice(e.message,true);}});
      card.append(form);
    }
    list.append(card);
  }
}
async function loadAdmin() {
  const data=await api('/admin/bookings'),stats=$('stats'),body=$('admin-bookings');stats.replaceChildren();body.replaceChildren();
  for(const [label,value] of [['Всего',data.stats.total],['Новые',data.stats.new_count],['Назначено',data.stats.scheduled_count],['Завершено',data.stats.completed_count]]){
    const card=el('div','','stat');card.append(el('span',label),el('b',value));stats.append(card);
  }
  if(!data.bookings.length){const tr=document.createElement('tr');const td=el('td','Заявок пока нет.');td.colSpan=8;tr.append(td);body.append(tr);}
  for(const b of data.bookings){
    const tr=document.createElement('tr');
    for(const value of [b.id,b.login,b.full_name,b.room_name,fmtDate(b.starts_at),PAYMENT[b.payment_method],STATUS[b.status]])tr.append(el('td',value));
    const actions=document.createElement('td');const select=document.createElement('select');
    for(const status of ['new','scheduled','completed']){const opt=document.createElement('option');opt.value=status;opt.textContent=STATUS[status];opt.selected=b.status===status;select.append(opt);}
    const save=el('button','Сохранить');save.className='secondary';save.style.marginTop='8px';
    save.addEventListener('click',async()=>{
      try{await api(`/admin/bookings/${b.id}`,{method:'PATCH',body:JSON.stringify({status:select.value})});await loadAdmin();notice('Статус обновлён.');}
      catch(e){notice(e.message,true);}
    });actions.append(select,save);tr.append(actions);body.append(tr);
  }
}
$('login-form').addEventListener('submit',async ev=>{
  ev.preventDefault();try{const d=await api('/login',{method:'POST',body:JSON.stringify(formData(ev.target))});state.user=d.user;ev.target.reset();renderNav();location.hash=d.user.role==='admin'?'admin':'rooms';await showView();notice('Вы успешно вошли в систему.');}
  catch(e){notice(e.message,true);}
});
$('register-form').addEventListener('submit',async ev=>{
  ev.preventDefault();try{await api('/register',{method:'POST',body:JSON.stringify(formData(ev.target))});ev.target.reset();location.hash='login';await showView();notice('Регистрация завершена. Войдите в систему.');}
  catch(e){notice(e.message,true);}
});
$('create-form').addEventListener('submit',async ev=>{
  ev.preventDefault();try{await api('/bookings',{method:'POST',body:JSON.stringify(formData(ev.target))});ev.target.reset();location.hash='bookings';await showView();notice('Заявка отправлена администратору.');}
  catch(e){notice(e.message,true);}
});
$('room-search').addEventListener('input',renderRooms);
window.addEventListener('hashchange',showView);
(async()=>{try{state.user=(await api('/me')).user;}catch(e){notice(e.message,true);}renderNav();await showView();})();
