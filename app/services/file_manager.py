import os
import shutil
import uuid
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from werkzeug.utils import secure_filename

class FileManager:
    """文件管理器 - 处理图片上传、存储和清理"""
    
    def __init__(self, temp_dir: str = "temp_images"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(exist_ok=True)
        self.session_files: Dict[str, List[Dict]] = {}  # 内存存储会话文件信息
        self.allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def allowed_file(self, filename: str) -> bool:
        """检查文件类型是否允许"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def save_uploaded_file(self, file, session_id: str) -> Dict:
        """保存上传的文件"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # 验证文件
        if not file or file.filename == '':
            raise ValueError("没有选择文件")
        
        if not self.allowed_file(file.filename):
            raise ValueError(f"不支持的文件类型。支持的格式: {', '.join(self.allowed_extensions)}")
        
        # 检查文件大小
        file.seek(0, 2)  # 移动到文件末尾
        file_size = file.tell()
        file.seek(0)  # 重置到开头
        
        if file_size > self.max_file_size:
            raise ValueError(f"文件太大。最大允许 {self.max_file_size // (1024*1024)}MB")
        
        # 生成安全文件名
        file_id = str(uuid.uuid4())
        safe_filename = secure_filename(file.filename)
        file_extension = Path(safe_filename).suffix
        filename = f"{file_id}{file_extension}"
        file_path = self.temp_dir / filename
        
        # 保存文件
        file.save(str(file_path))
        
        # 记录文件信息
        file_info = {
            'file_id': file_id,
            'original_filename': file.filename,
            'safe_filename': safe_filename,
            'filename': filename,
            'file_path': str(file_path),
            'session_id': session_id,
            'uploaded_at': datetime.now().isoformat(),
            'file_size': file_size
        }
        
        # 更新会话文件记录
        if session_id not in self.session_files:
            self.session_files[session_id] = []
        self.session_files[session_id].append(file_info)
        
        return file_info
    
    def get_file_info(self, file_id: str) -> Optional[Dict]:
        """获取文件信息"""
        for session_id, files in self.session_files.items():
            for file_info in files:
                if file_info['file_id'] == file_id:
                    return file_info
        return None
    
    def get_file_path(self, file_id: str) -> Optional[str]:
        """获取文件路径"""
        file_info = self.get_file_info(file_id)
        return file_info['file_path'] if file_info else None
    
    def cleanup_session(self, session_id: str) -> List[str]:
        """清理指定会话的所有文件"""
        if session_id not in self.session_files:
            return []
        
        deleted_files = []
        for file_info in self.session_files[session_id]:
            file_path = Path(file_info['file_path'])
            if file_path.exists():
                try:
                    file_path.unlink()
                    deleted_files.append(file_info['filename'])
                except Exception as e:
                    print(f"删除文件失败 {file_info['filename']}: {e}")
        
        # 清除会话记录
        del self.session_files[session_id]
        return deleted_files
    
    def cleanup_old_files(self, hours: int = 24) -> List[str]:
        """清理超过指定时间的文件"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        deleted_files = []
        
        try:
            for file_path in self.temp_dir.glob('*'):
                if file_path.is_file():
                    file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if file_time < cutoff_time:
                        try:
                            file_path.unlink()
                            deleted_files.append(file_path.name)
                        except Exception as e:
                            print(f"删除过期文件失败 {file_path.name}: {e}")
        except Exception as e:
            print(f"清理过期文件时出错: {e}")
        
        return deleted_files
    
    def get_session_files(self, session_id: str) -> List[Dict]:
        """获取会话中的所有文件"""
        return self.session_files.get(session_id, [])
    
    def get_session_size(self, session_id: str) -> int:
        """获取会话文件总大小（字节）"""
        files = self.get_session_files(session_id)
        return sum(file_info['file_size'] for file_info in files)
    
    def cleanup_all_temp_files(self) -> int:
        """清理所有临时文件"""
        deleted_count = 0
        try:
            for file_path in self.temp_dir.glob('*'):
                if file_path.is_file():
                    try:
                        file_path.unlink()
                        deleted_count += 1
                    except Exception as e:
                        print(f"删除文件失败 {file_path.name}: {e}")
            
            # 清空会话记录
            self.session_files.clear()
            
        except Exception as e:
            print(f"清理所有临时文件时出错: {e}")
        
        return deleted_count
    
    def get_storage_stats(self) -> Dict:
        """获取存储统计信息"""
        try:
            total_files = 0
            total_size = 0
            active_sessions = len(self.session_files)
            
            # 统计所有临时文件
            for file_path in self.temp_dir.glob('*'):
                if file_path.is_file():
                    total_files += 1
                    total_size += file_path.stat().st_size
            
            # 转换为MB
            total_size_mb = round(total_size / (1024 * 1024), 2)
            
            return {
                'total_files': total_files,
                'total_size_mb': total_size_mb,
                'active_sessions': active_sessions
            }
            
        except Exception as e:
            print(f"获取存储统计失败: {e}")
            return {
                'total_files': 0,
                'total_size_mb': 0,
                'active_sessions': 0
            }
    
    def get_storage_info(self) -> Dict:
        """获取存储信息"""
        total_files = 0
        total_size = 0
        
        try:
            for file_path in self.temp_dir.glob('*'):
                if file_path.is_file():
                    total_files += 1
                    total_size += file_path.stat().st_size
        except Exception as e:
            print(f"获取存储信息时出错: {e}")
        
        return {
            'total_files': total_files,
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'active_sessions': len(self.session_files),
            'temp_dir': str(self.temp_dir)
        }

# 全局文件管理器实例
file_manager = FileManager()
