@echo off
REM Create directories
if not exist "src\auth\guards" mkdir "src\auth\guards"
if not exist "src\auth\decorators" mkdir "src\auth\decorators"
if not exist "src\users\dto" mkdir "src\users\dto"
if not exist "src\colleges" mkdir "src\colleges"
if not exist "src\colleges\dto" mkdir "src\colleges\dto"
if not exist "src\applications" mkdir "src\applications"
if not exist "src\applications\dto" mkdir "src\applications\dto"

REM Move files
move "src\auth\jwt-auth.guard.ts" "src\auth\guards\jwt-auth.guard.ts"
move "src\auth\roles.guard.ts" "src\auth\guards\roles.guard.ts"
move "src\auth\roles.decorator.ts" "src\auth\decorators\roles.decorator.ts"
move "src\auth\current-user.decorator.ts" "src\auth\decorators\current-user.decorator.ts"

echo All directories and files created successfully!
