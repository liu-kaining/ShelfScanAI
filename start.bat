@echo off
echo 🚀 启动 ShelfScanAI...

REM 检查虚拟环境
if not exist "venv" (
    echo ❌ 虚拟环境不存在，正在创建...
    python -m venv venv
    echo ✅ 虚拟环境创建完成
)

REM 激活虚拟环境
echo 🔧 激活虚拟环境...
call venv\Scripts\activate.bat

REM 检查依赖
echo 📦 检查依赖...
pip install -r requirements.txt > nul 2>&1

REM 检查配置文件
if not exist ".env" (
    echo 📝 创建配置文件...
    copy env.example .env
    echo ⚠️  请编辑 .env 文件，配置您的 Qwen API Key
    echo    然后重新运行此脚本
    pause
    exit /b 1
)

REM 启动应用
echo 🌐 启动应用...
python run.py

pause
