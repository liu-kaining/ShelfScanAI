import threading
import time
import uuid
from datetime import datetime
from typing import Dict, Optional, List
from concurrent.futures import ThreadPoolExecutor
import traceback

from .file_manager import file_manager
from .qwen_service import QwenService
from .search_service import SearchService
from ..models.database import db

class TaskManager:
    """任务管理器 - 处理异步任务"""
    
    def __init__(self, max_workers: int = 3):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.tasks: Dict[str, Dict] = {}  # 内存存储任务状态
        self.lock = threading.Lock()
        self.qwen_service = QwenService()
        self.search_service = SearchService()
        
        # 启动清理任务
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """启动定期清理任务"""
        def cleanup_old_tasks():
            while True:
                try:
                    time.sleep(3600)  # 每小时清理一次
                    self._cleanup_old_tasks()
                except Exception as e:
                    print(f"清理旧任务时出错: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_old_tasks, daemon=True)
        cleanup_thread.start()
    
    def _cleanup_old_tasks(self):
        """清理超过24小时的旧任务"""
        cutoff_time = datetime.now().timestamp() - 24 * 3600  # 24小时前
        
        with self.lock:
            old_tasks = []
            for task_id, task_data in self.tasks.items():
                created_time = datetime.fromisoformat(task_data['created_at']).timestamp()
                if created_time < cutoff_time:
                    old_tasks.append(task_id)
            
            for task_id in old_tasks:
                del self.tasks[task_id]
    
    def create_task(self, file_id: str, session_id: str) -> str:
        """创建新的识别任务"""
        # 获取文件路径
        file_path = file_manager.get_file_path(file_id)
        if not file_path:
            raise ValueError("文件不存在")
        
        task_id = str(uuid.uuid4())
        
        task_data = {
            'task_id': task_id,
            'file_id': file_id,
            'session_id': session_id,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'progress': 0,
            'current_stage': '准备开始识别...',
            'result': None,
            'error': None,
            'completed_at': None
        }
        
        with self.lock:
            self.tasks[task_id] = task_data
        
        # 提交任务到线程池
        future = self.executor.submit(self._process_task, task_id)
        
        return task_id
    
    def _process_task(self, task_id: str):
        """处理任务的核心逻辑"""
        try:
            with self.lock:
                if task_id not in self.tasks:
                    return
                self.tasks[task_id]['status'] = 'processing'
                self.tasks[task_id]['progress'] = 10
                self.tasks[task_id]['current_stage'] = '初始化识别服务...'
            
            task_data = self.tasks[task_id]
            file_path = file_manager.get_file_path(task_data['file_id'])
            
            if not file_path:
                raise ValueError("文件不存在")
            
            # 第一阶段：图片识别
            with self.lock:
                self.tasks[task_id]['progress'] = 30
                self.tasks[task_id]['current_stage'] = '识别图片中的书籍...'
            
            print(f"开始识别任务 {task_id}, 文件: {file_path}")
            books = self.qwen_service.recognize_books(file_path)
            print(f"识别完成，找到 {len(books)} 本书")
            
            if not books:
                raise ValueError("未能识别出任何书籍，请尝试更清晰的图片")
            
            # 第二阶段：信息丰富化
            with self.lock:
                self.tasks[task_id]['progress'] = 60
                self.tasks[task_id]['current_stage'] = f'搜索 {len(books)} 本书的详细信息...'
            
            enriched_books = self.search_service.enrich_books(books)
            
            # 第三阶段：保存结果
            with self.lock:
                self.tasks[task_id]['progress'] = 90
                self.tasks[task_id]['current_stage'] = '保存识别结果...'
            
            # 计算处理时间
            start_time = datetime.fromisoformat(task_data['created_at'])
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # 保存到数据库
            scan_data = {
                'id': task_id,
                'session_id': task_data['session_id'],
                'created_at': task_data['created_at'],
                'model_used': 'qwen-vl-plus',
                'books_count': len(enriched_books),
                'processing_time': processing_time,
                'status': 'completed',
                'result': {
                    'books': enriched_books,
                    'total_books': len(enriched_books),
                    'processing_time': processing_time
                }
            }
            
            db.save_scan_result(scan_data)
            
            # 完成任务
            with self.lock:
                self.tasks[task_id]['status'] = 'completed'
                self.tasks[task_id]['progress'] = 100
                self.tasks[task_id]['current_stage'] = '处理完成'
                self.tasks[task_id]['result'] = scan_data['result']
                self.tasks[task_id]['completed_at'] = datetime.now().isoformat()
                
        except Exception as e:
            error_msg = str(e)
            error_traceback = traceback.format_exc()
            
            with self.lock:
                if task_id in self.tasks:
                    self.tasks[task_id]['status'] = 'failed'
                    self.tasks[task_id]['error'] = error_msg
                    self.tasks[task_id]['completed_at'] = datetime.now().isoformat()
            
            print(f"任务 {task_id} 处理失败: {error_msg}")
            print(f"错误详情: {error_traceback}")
    
    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """获取任务状态"""
        with self.lock:
            return self.tasks.get(task_id)
    
    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        with self.lock:
            if task_id in self.tasks and self.tasks[task_id]['status'] in ['pending', 'processing']:
                self.tasks[task_id]['status'] = 'cancelled'
                self.tasks[task_id]['completed_at'] = datetime.now().isoformat()
                return True
            return False
    
    def get_active_tasks(self) -> List[Dict]:
        """获取活跃任务列表"""
        with self.lock:
            active_tasks = []
            for task_data in self.tasks.values():
                if task_data['status'] in ['pending', 'processing']:
                    active_tasks.append({
                        'task_id': task_data['task_id'],
                        'status': task_data['status'],
                        'progress': task_data['progress'],
                        'current_stage': task_data['current_stage'],
                        'created_at': task_data['created_at']
                    })
            return active_tasks
    
    def get_task_statistics(self) -> Dict:
        """获取任务统计信息"""
        with self.lock:
            total_tasks = len(self.tasks)
            pending_tasks = sum(1 for t in self.tasks.values() if t['status'] == 'pending')
            processing_tasks = sum(1 for t in self.tasks.values() if t['status'] == 'processing')
            completed_tasks = sum(1 for t in self.tasks.values() if t['status'] == 'completed')
            failed_tasks = sum(1 for t in self.tasks.values() if t['status'] == 'failed')
            
            return {
                'total_tasks': total_tasks,
                'pending_tasks': pending_tasks,
                'processing_tasks': processing_tasks,
                'completed_tasks': completed_tasks,
                'failed_tasks': failed_tasks,
                'success_rate': round(completed_tasks / max(total_tasks, 1) * 100, 2)
            }
    
    def cleanup_task(self, task_id: str) -> bool:
        """清理指定任务"""
        with self.lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                return True
            return False

# 全局任务管理器实例
task_manager = TaskManager()
