@echo off
setlocal enabledelayedexpansion
cd /d D:\chfpl_deploy

echo =============================================================
echo  This will DELETE:
echo    - api\[...path].js            (old catch-all router)
echo    - api\admin\  (and masters\, staff\ subfolders)
echo    - api\collection\
echo    - api\customer\
echo    - api\dealer\
echo    - api\do\
echo    - api\field-executive\
echo    - api\team-leader\
echo    - api\tele-caller\
echo    - api\users\
echo.
echo  This will KEEP:
echo    - api\admin.js, api\dealer.js, api\customer.js, api\do.js,
echo      api\field-executive.js, api\team-leader.js, api\tele-caller.js,
echo      api\users.js, api\collection.js   (the ?path= aggregators
echo      that vercel.json actually rewrites to)
echo    - api\_lib\   (underscore folder, not counted as a function)
echo.
echo  Make sure you have committed to git first so this is reversible.
echo =============================================================
pause

if exist "api\[...path].js" (
    echo Deleting api\[...path].js ...
    del /f /q "api\[...path].js"
)

for %%D in (admin collection customer dealer do field-executive team-leader tele-caller users) do (
    if exist "api\%%D" (
        echo Deleting folder api\%%D ...
        rmdir /s /q "api\%%D"
    )
)

echo.
echo ===== Remaining contents of api\ =====
dir /b api

echo.
echo ===== Remaining .js file count under api\ (functions Vercel will see) =====
dir /s /b api\*.js | find /c /v ""

echo.
echo Done. Review the list above, then commit and redeploy.
pause
