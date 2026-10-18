## Запуск проекта

**1. Установка зависимостей:**
```powershell
npm install
```

**2. Создание базы данных в PostgreSQL:**
```sql
CREATE DATABASE conferences_rf;
```

**3. Создание файла `.env`:**
```powershell
New-Item -Path .env -ItemType File
```

**4. Настройка `.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conferences_rf
DB_USER=ЛОГИН
DB_PASSWORD=ПАРОЛЬ
PORT=3000
```

**5. Инициализация базы данных:**
```powershell
npm run init-db
```

**6. Запуск сервера:**
```powershell
npm start
```

**7. Открыть ссылку:** 
http://127.0.0.1:3000

## Доступ администратора
```powershell
Логин:Conf2027
Пароль:Demo77
```
## Повторный запуск
```powershell
npm start
```