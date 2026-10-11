@echo off
chcp 65001 >nul
title تشغيل واجهة الموقع - UI Prototype

cd /d "%~dp0"
if exist "frontend" cd /d "%~dp0frontend"

echo =======================================================
echo   جاري تشغيل الخادم المحلي وفتح الموقع في المتصفح...
echo   الرابط: http://localhost:5500/ui-prototype.html
echo =======================================================
echo.
echo   [ملاحظة] لا تغلق هذه النافذة طالما أنك تتصفح الموقع.
echo   عند الانتهاء، يمكنك إغلاق هذه النافذة لإيقاف السيرفر.
echo.

start "" "http://localhost:5500/ui-prototype.html"

python -m http.server 5500
if %errorlevel% neq 0 (
    py -m http.server 5500
)

pause
