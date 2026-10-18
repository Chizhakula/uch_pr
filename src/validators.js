const LOGIN = /^[A-Za-z0-9]{6,}$/;
const NAME = /^[А-Яа-яЁё]+(?: [А-Яа-яЁё]+)*$/u;
const PHONE = /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function registration(body = {}) {
  const login = String(body.login || '').trim();
  const password = String(body.password || '');
  const fullName = String(body.fullName || '').trim().replace(/\s+/g, ' ');
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  if (!LOGIN.test(login)) throw new Error('Логин: латиница и цифры, минимум 6 символов.');
  if (password.length < 8) throw new Error('Пароль должен содержать минимум 8 символов.');
  if (!NAME.test(fullName)) throw new Error('ФИО: только кириллица и пробелы.');
  if (!PHONE.test(phone)) throw new Error('Телефон должен иметь формат 8(XXX)XXX-XX-XX.');
  if (!EMAIL.test(email) || email.length > 254) throw new Error('Укажите корректный email.');
  return { login, password, fullName, phone, email };
}
function parseDateTime(input) {
  if (typeof input !== 'string') throw new Error('Введите дату и время в формате ДД.ММ.ГГГГ ЧЧ:ММ.');
  const m = input.trim().match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) throw new Error('Дата должна иметь формат ДД.ММ.ГГГГ ЧЧ:ММ.');
  const [, dd, mm, yyyy, hh, min] = m.map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd || d.getUTCHours() !== hh || d.getUTCMinutes() !== min) {
    throw new Error('Укажите существующие дату и время.');
  }
  return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')} ${String(hh).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`;
}
const METHODS = ['in_person', 'sbp'];
const STATUSES = ['new', 'scheduled', 'completed'];
module.exports = { registration, parseDateTime, METHODS, STATUSES };
