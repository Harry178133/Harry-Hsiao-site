@echo off
chcp 65001 > nul
title 知識分享區自動更新器
echo 正在為您更新個人網站的知識分享區...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update_knowledge.ps1"

echo.
if %errorlevel% equ 0 (
    echo [成功] 網站知識分享區已成功更新！
) else (
    echo [失敗] 更新過程中發生錯誤，請確認錯誤訊息。
)
echo.
echo 請按任意鍵結束...
pause > nul
