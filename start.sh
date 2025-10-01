#!/bin/bash
# ShelfScanAI 启动脚本

echo "🚀 启动 ShelfScanAI..."

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "❌ 虚拟环境不存在，正在创建..."
    python -m venv venv
    echo "✅ 虚拟环境创建完成"
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 检查依赖
echo "📦 检查依赖..."
pip install -r requirements.txt > /dev/null 2>&1

# 检查配置文件
if [ ! -f ".env" ]; then
    echo "📝 创建配置文件..."
    cp env.example .env
    echo "⚠️  请编辑 .env 文件，配置您的 Qwen API Key"
    echo "   然后重新运行此脚本"
    exit 1
fi

# 启动应用
echo "🌐 启动应用..."
python run.py
