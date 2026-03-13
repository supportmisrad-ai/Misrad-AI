@echo off
setlocal enabledelayedexpansion

for /f "tokens=1* delims==" %%a in (.env.prod_backup) do (
    if "%%a"=="DATABASE_URL" (
        set "DATABASE_URL=%%b"
        goto :found
    )
)

echo DATABASE_URL not found
exit /b 1

:found
echo Found DATABASE_URL
set DATABASE_URL=%DATABASE_URL%
npx prisma db push --accept-data-loss --skip-generate
