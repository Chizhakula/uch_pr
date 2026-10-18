# Запускать в PowerShell из папки проекта после создания БД и заполнения .env.
if (!(Test-Path '.env')) { Copy-Item '.env.example' '.env'; Write-Host 'Заполните DB_PASSWORD в .env и запустите скрипт повторно.'; exit 1 }
if (!(Test-Path 'node_modules')) { Write-Host 'Не найдены зависимости. Выполните npm install ДО экзамена или перенесите node_modules.'; exit 1 }
npm run init-db
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm start
