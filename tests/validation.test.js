const { test } = require('node:test');
const assert = require('node:assert/strict');

const { registration, parseDateTime } = require('../src/validators');
const { hashPassword, verifyPassword, hashToken, randomToken } = require('../src/security');

const valid = {
  login: 'user123',
  password: 'password123',
  fullName: 'Иван Иванов',
  phone: '8(999)123-45-67',
  email: 'test@example.com'
};

test('Успешная регистрация пользователя', () => {
  assert.equal(registration(valid).login, 'user123');
});

test('Проверка минимальной длины логина', () => {
  assert.throws(
    () => registration({ ...valid, login: 'test' }),
    /Логин/
  );
});

test('Проверка допустимых символов в логине', () => {
  assert.throws(
    () => registration({ ...valid, login: 'юзер123' }),
    /Логин/
  );
});

test('Проверка минимальной длины пароля', () => {
  assert.throws(
    () => registration({ ...valid, password: '123' }),
    /Пароль/
  );
});

test('Проверка правильности заполнения ФИО', () => {
  assert.throws(
    () => registration({ ...valid, fullName: 'Ivan Ivanov' }),
    /ФИО/
  );
});

test('Проверка формата номера телефона', () => {
  assert.throws(
    () => registration({ ...valid, phone: '+79991234567' }),
    /Телефон/
  );
});

test('Проверка корректности электронной почты', () => {
  assert.throws(
    () => registration({ ...valid, email: 'hello' }),
    /email/
  );
});

test('Преобразование даты в нужный формат', () => {
  assert.equal(
    parseDateTime('15.11.2027 14:30'),
    '2027-11-15 14:30:00'
  );
});

test('Проверка несуществующей даты', () => {
  assert.throws(
    () => parseDateTime('31.02.2027 14:30'),
    /существующие/
  );
});

test('Проверка хеширования и сверки пароля', () => {
  const h = hashPassword('password123');

  assert.equal(verifyPassword('password123', h), true);
  assert.equal(verifyPassword('wrong', h), false);
});

test('Проверка генерации и хеширования токена', () => {
  const t = randomToken();

  assert.equal(t.length, 64);
  assert.equal(hashToken(t).length, 64);
  assert.notEqual(t, hashToken(t));
});
