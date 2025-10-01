from flask import Flask
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 配置
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['UPLOAD_FOLDER'] = 'temp_images'
    
    # 注册路由
    from .routes import main
    app.register_blueprint(main)
    
    return app
