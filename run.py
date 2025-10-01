#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShelfScanAI 启动脚本
一键启动智能图书扫描仪应用
"""

import os
import sys
import threading
import time
from pathlib import Path

def setup_environment():
    """设置环境"""
    print("🔧 正在初始化环境...")
    
    # 创建必要的目录
    directories = [
        "temp_images",
        "logs",
        "app/static/css",
        "app/static/js",
        "app/static/images",
        "app/templates",
        "app/models",
        "app/services",
        "app/utils"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"   ✓ 创建目录: {directory}")
    
    # 检查环境变量文件
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if not env_file.exists() and env_example.exists():
        print("📝 创建环境变量文件...")
        with open(env_example, 'r', encoding='utf-8') as f:
            content = f.read()
        
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("   ✓ 已创建 .env 文件，请编辑其中的配置")
    
    # 设置环境变量
    os.environ.setdefault('FLASK_ENV', 'development')
    os.environ.setdefault('FLASK_DEBUG', 'True')
    
    if not os.environ.get('SECRET_KEY'):
        os.environ['SECRET_KEY'] = 'dev-secret-key-' + str(int(time.time()))
        print("   ✓ 已设置默认SECRET_KEY")
    
    print("✅ 环境初始化完成")

def cleanup_old_files():
    """定期清理旧文件"""
    from app.services.file_manager import file_manager
    
    while True:
        try:
            time.sleep(3600)  # 每小时清理一次
            deleted = file_manager.cleanup_old_files()
            if deleted:
                print(f"🧹 清理了 {len(deleted)} 个过期文件")
        except Exception as e:
            print(f"❌ 清理任务出错: {e}")

def check_dependencies():
    """检查依赖"""
    print("📦 检查依赖包...")
    
    required_packages = [
        ('flask', 'flask'),
        ('requests', 'requests'),
        ('pillow', 'PIL'),
        ('pandas', 'pandas'),
        ('openpyxl', 'openpyxl'),
        ('cryptography', 'cryptography'),
        ('python-dotenv', 'dotenv')
    ]
    
    missing_packages = []
    
    for package_name, import_name in required_packages:
        try:
            __import__(import_name)
            print(f"   ✓ {package_name}")
        except ImportError:
            missing_packages.append(package_name)
            print(f"   ❌ {package_name} (缺失)")
    
    if missing_packages:
        print(f"\n❌ 缺少以下依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装依赖:")
        print("pip install -r requirements.txt")
        return False
    
    print("✅ 所有依赖包检查完成")
    return True

def load_environment():
    """加载环境变量"""
    from dotenv import load_dotenv
    
    env_file = Path(".env")
    if env_file.exists():
        load_dotenv(env_file)
        print("📄 已加载环境变量文件")
        
        # 检查关键配置
        qwen_api_key = os.getenv('QWEN_API_KEY')
        if not qwen_api_key or qwen_api_key == 'your_qwen_api_key_here':
            print("⚠️  警告: 未配置QWEN_API_KEY，请在.env文件中设置")
        else:
            print("✅ Qwen API Key 已配置")
    else:
        print("⚠️  警告: 未找到.env文件，将使用默认配置")

def start_cleanup_task():
    """启动清理任务"""
    print("🔄 启动后台清理任务...")
    cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
    cleanup_thread.start()
    print("   ✓ 清理任务已启动")

def main():
    """主函数"""
    print("=" * 60)
    print("🚀 ShelfScanAI - 智能图书扫描仪")
    print("=" * 60)
    
    try:
        # 1. 设置环境
        setup_environment()
        
        # 2. 检查依赖
        if not check_dependencies():
            sys.exit(1)
        
        # 3. 加载环境变量
        load_environment()
        
        # 4. 启动清理任务
        start_cleanup_task()
        
        # 5. 导入并启动应用
        print("\n🌐 启动Web应用...")
        from app import create_app
        
        app = create_app()
        
        print("\n" + "=" * 60)
        print("✅ ShelfScanAI 启动成功!")
        print("📱 访问地址: http://localhost:5006")
        print("📚 功能: 智能图书识别、信息搜索、导出管理")
        print("⚙️  配置: 请访问 http://localhost:5006/settings 配置API Key")
        print("🛑 停止: 按 Ctrl+C 停止服务")
        print("=" * 60)
        
        # 启动Flask应用
        app.run(
            host='0.0.0.0',
            port=5006,
            debug=True,
            threaded=True
        )
        
    except KeyboardInterrupt:
        print("\n\n🛑 收到停止信号，正在关闭服务...")
        print("✅ 服务已停止")
        
    except Exception as e:
        print(f"\n❌ 启动失败: {e}")
        print("\n请检查以下事项:")
        print("1. Python版本是否为3.8+")
        print("2. 是否安装了所有依赖包")
        print("3. 端口5006是否被占用")
        print("4. 网络连接是否正常")
        sys.exit(1)

if __name__ == '__main__':
    main()
