const express = require('express');
const path = require('node:path');
const env = require('./config');
const Database = require('./database');
const { UserRepository, BookingRepository } = require('./repositories');
const { registration, parseDateTime, METHODS, STATUSES } = require('./validators');
const { hashPassword, verifyPassword, randomToken, hashToken } = require('./security');
const db = new Database();
const users = new UserRepository(db);
const bookings = new BookingRepository(db);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, '../public'), { index: 'index.html', extensions: ['html'] }));
function error(message, status=400) { const e=new Error(message); e.status=status; throw e; }
function setCookie(res, token, expire=false) {
  res.cookie('session',token,{ httpOnly:true,sameSite:'strict',secure:env.secureCookie,path:'/',maxAge:expire?0:7*86400*1000 });
}
async function session(req,res,next) {
  try {
    const raw = (req.headers.cookie || '').split(';').map(p=>p.trim()).find(p=>p.startsWith('session='));
    const token = raw?.slice(8);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const rows = await db.query(`SELECT u.id,u.login,u.full_name,u.role FROM sessions s
        JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hashToken(token)]);
      req.user = rows.rows[0] || null;
      req.sessionToken = token;
    }
    next();
  } catch(e) { next(e); }
}
app.use('/api', (req,res,next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method) && req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      const expected = `${req.protocol}://${req.get('host')}`;
      if (origin.origin !== expected) return res.status(403).json({ error:'Недопустимый источник запроса.' });
    } catch { return res.status(403).json({ error:'Недопустимый источник запроса.' }); }
  }
  next();
});
app.use('/api',session);
function auth(req,res,next) { if (!req.user) return res.status(401).json({error:'Требуется авторизация.'}); next(); }
function admin(req,res,next) { if (req.user?.role!=='admin') return res.status(403).json({error:'Доступ только администратору.'}); next(); }
app.get('/api/me', (req,res)=>res.json({user:req.user||null}));
app.post('/api/register', async(req,res,next)=>{
  try {
    const data=registration(req.body);
    const user=await users.create(data,hashPassword(data.password));
    res.status(201).json({message:'Пользователь создан.',user});
  } catch(e) { if(e.code==='23505') return res.status(409).json({error:'Этот логин уже используется.'}); next(e); }
});
app.post('/api/login', async(req,res,next)=>{
  try {
    const login=String(req.body?.login||'');
    const pass=String(req.body?.password||'');
    const user=await users.byLogin(login);
    if(!user || !verifyPassword(pass,user.password_hash)) return res.status(401).json({error:'Неверный логин или пароль.'});
    const token=randomToken();
    await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')`,[hashToken(token),user.id]);
    setCookie(res,token);
    res.json({user:{id:user.id,login:user.login,full_name:user.full_name,role:user.role}});
  } catch(e) {next(e);}
});
app.post('/api/logout',auth,async(req,res,next)=>{
  try {await db.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(req.sessionToken)]);setCookie(res,'',true);res.json({message:'Вы вышли из системы.'});}
  catch(e){next(e);}
});
app.get('/api/rooms',auth,async(req,res,next)=>{
  try {const search=String(req.query.search||'').slice(0,120);res.json({rooms:(await bookings.rooms(search)).rows});}
  catch(e){next(e);}
});
app.get('/api/bookings',auth,async(req,res,next)=>{
  try {res.json({bookings:(await bookings.my(req.user.id)).rows});}catch(e){next(e);}
});
app.post('/api/bookings',auth,async(req,res,next)=>{
  try {
    if(req.user.role==='admin') error('Администратор не может создавать заявки.',403);
    const roomName=String(req.body?.roomName||'').trim();
    if(!roomName || roomName.length>120) error('Укажите название помещения.');
    const room=await bookings.room(roomName);
    if(!room) error('Такое помещение не найдено в каталоге.');
    const startsAt=parseDateTime(req.body?.startsAt);
    if(new Date(startsAt.replace(' ','T')+'Z').getTime() < Date.now()-86400000) error('Дата мероприятия не может быть в прошлом.');
    const payment=String(req.body?.paymentMethod||'');
    if(!METHODS.includes(payment)) error('Выберите способ оплаты.');
    const created=await bookings.create(req.user.id,room.id,startsAt,payment);
    res.status(201).json({booking:created,message:'Заявка отправлена администратору.'});
  }catch(e){next(e);}
});
app.post('/api/bookings/:id/review',auth,async(req,res,next)=>{
  try {
    const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<1) error('Неверный номер заявки.');
    const rating=Number(req.body?.rating); if(!Number.isInteger(rating)||rating<1||rating>5) error('Оценка должна быть от 1 до 5.');
    const comment=String(req.body?.comment||'').trim(); if(!comment || comment.length>1000) error('Отзыв должен содержать от 1 до 1000 символов.');
    const review=await bookings.addReview(req.user.id,id,rating,comment);
    res.status(201).json({review,message:'Отзыв сохранён.'});
  }catch(e){ if(e.code==='23505') return res.status(409).json({error:'Отзыв на эту заявку уже оставлен.'}); next(e); }
});
app.get('/api/admin/bookings',admin,async(req,res,next)=>{
  try {res.json({bookings:(await bookings.all()).rows,stats:await bookings.stats()});}catch(e){next(e);}
});
app.patch('/api/admin/bookings/:id',admin,async(req,res,next)=>{
  try {
    const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<1) error('Неверный номер заявки.');
    const status=String(req.body?.status||''); if(!STATUSES.includes(status)||status==='new') error('Выберите статус «Мероприятие назначено» или «Завершено».');
    const value=await bookings.changeStatus(id,status);
    if(!value) error('Заявка не найдена.',404);
    res.json({booking:value,message:'Статус заявки изменён.'});
  }catch(e){next(e);}
});
app.use('/api',(req,res)=>res.status(404).json({error:'API-маршрут не найден.'}));
app.use((err,req,res,next)=>{
  if(err.type==='entity.parse.failed') return res.status(400).json({error:'Некорректный JSON.'});
  if(err.code==='23503'||err.code==='23514'||err.code==='22P02') return res.status(400).json({error:'Некорректные данные.'});
  const known=Boolean(err.status) || (!err.code && err instanceof Error && !/connect|query|database|postgres/i.test(err.message));
  if(!known) console.error(err);
  res.status(err.status || (known?400:500)).json({error:known?err.message:'Внутренняя ошибка сервера.'});
});
if(require.main===module) {
  db.query('SELECT 1').then(()=>app.listen(env.port,env.host,()=>console.log(`Портал: http://${env.host}:${env.port}`)))
    .catch(e=>{console.error('Ошибка PostgreSQL:',e.message);process.exitCode=1;db.close();});
}
module.exports=app;