#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShelfScanAI 功能测试脚本
"""

import sys
import os
from pathlib import Path

def test_imports():
    """测试所有必要的导入"""
    print("🔍 测试导入...")
    
    try:
        # 测试Flask相关
        from flask import Flask
        print("   ✓ Flask")
        
        # 测试数据库
        from app.models.database import SimpleDB
        print("   ✓ 数据库模块")
        
        # 测试服务
        from app.services.file_manager import FileManager
        from app.services.task_manager import TaskManager
        from app.services.qwen_service import QwenService
        from app.services.search_service import SearchService
        from app.services.export_service import ExportService
        print("   ✓ 服务模块")
        
        # 测试第三方库
        import requests
        print("   ✓ requests")
        
        from PIL import Image
        print("   ✓ Pillow")
        
        import pandas as pd
        print("   ✓ pandas")
        
        import openpyxl
        print("   ✓ openpyxl")
        
        from cryptography.fernet import Fernet
        print("   ✓ cryptography")
        
        from dotenv import load_dotenv
        print("   ✓ python-dotenv")
        
        return True
        
    except ImportError as e:
        print(f"   ❌ 导入失败: {e}")
        return False

def test_database():
    """测试数据库功能"""
    print("🗄️ 测试数据库...")
    
    try:
        from app.models.database import SimpleDB
        
        # 创建测试数据库
        test_db = SimpleDB("test.db")
        print("   ✓ 数据库初始化")
        
        # 测试配置保存
        test_db.save_config('test_key', 'test_value')
        print("   ✓ 配置保存")
        
        # 测试配置读取
        value = test_db.get_config('test_key')
        assert value == 'test_value'
        print("   ✓ 配置读取")
        
        # 清理测试数据库
        if Path("test.db").exists():
            Path("test.db").unlink()
        print("   ✓ 数据库清理")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 数据库测试失败: {e}")
        return False

def test_file_manager():
    """测试文件管理器"""
    print("📁 测试文件管理器...")
    
    try:
        from app.services.file_manager import FileManager
        
        # 创建测试文件管理器
        fm = FileManager("test_temp")
        print("   ✓ 文件管理器初始化")
        
        # 测试目录创建
        assert fm.temp_dir.exists()
        print("   ✓ 临时目录创建")
        
        # 测试文件类型验证
        assert fm.allowed_file("test.jpg")
        assert fm.allowed_file("test.png")
        assert not fm.allowed_file("test.txt")
        print("   ✓ 文件类型验证")
        
        # 清理测试目录
        import shutil
        if fm.temp_dir.exists():
            shutil.rmtree(fm.temp_dir)
        print("   ✓ 文件管理器清理")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 文件管理器测试失败: {e}")
        return False

def test_export_service():
    """测试导出服务"""
    print("📊 测试导出服务...")
    
    try:
        from app.services.export_service import ExportService
        
        # 创建导出服务
        es = ExportService()
        print("   ✓ 导出服务初始化")
        
        # 测试JSON导出
        test_books = [
            {
                'title': '测试书籍',
                'author': '测试作者',
                'publisher': '测试出版社',
                'confidence': 95
            }
        ]
        
        json_result = es.export_to_json(test_books)
        assert '测试书籍' in json_result
        print("   ✓ JSON导出功能")
        
        # 测试HTML生成
        html_result = es.generate_books_html(test_books)
        assert '测试书籍' in html_result
        print("   ✓ HTML生成功能")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 导出服务测试失败: {e}")
        return False

def test_flask_app():
    """测试Flask应用"""
    print("🌐 测试Flask应用...")
    
    try:
        from app import create_app
        
        # 创建应用
        app = create_app()
        print("   ✓ Flask应用创建")
        
        # 测试路由
        with app.test_client() as client:
            # 测试主页
            response = client.get('/')
            assert response.status_code == 200
            print("   ✓ 主页路由")
            
            # 测试设置页面
            response = client.get('/settings')
            assert response.status_code == 200
            print("   ✓ 设置页面路由")
            
            # 测试历史页面
            response = client.get('/history')
            assert response.status_code == 200
            print("   ✓ 历史页面路由")
            
            # 测试API配置接口
            response = client.get('/api/config')
            assert response.status_code == 200
            print("   ✓ API配置接口")
            
        return True
        
    except Exception as e:
        print(f"   ❌ Flask应用测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 60)
    print("🧪 ShelfScanAI 功能测试")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_database,
        test_file_manager,
        test_export_service,
        test_flask_app
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"   ❌ 测试异常: {e}")
            print()
    
    print("=" * 60)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("✅ 所有测试通过！应用可以正常启动")
        print("🚀 运行 'python run.py' 启动应用")
    else:
        print("❌ 部分测试失败，请检查依赖安装")
        print("💡 运行 'pip install -r requirements.txt' 安装依赖")
    
    print("=" * 60)
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
