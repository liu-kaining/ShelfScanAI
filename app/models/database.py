import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

class SimpleDB:
    """SQLite数据库管理器"""
    
    def __init__(self, db_path: str = "shelf_scan.db"):
        self.db_path = Path(db_path)
        self.init_database()
    
    def init_database(self):
        """初始化数据库表"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建扫描记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scan_records (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                created_at TEXT,
                model_used TEXT,
                books_count INTEGER,
                processing_time REAL,
                status TEXT,
                result_json TEXT
            )
        ''')
        
        # 创建书籍记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS book_records (
                id TEXT PRIMARY KEY,
                scan_record_id TEXT,
                title TEXT,
                author TEXT,
                publisher TEXT,
                isbn TEXT,
                summary TEXT,
                cover_url TEXT,
                confidence INTEGER,
                created_at TEXT,
                FOREIGN KEY (scan_record_id) REFERENCES scan_records (id)
            )
        ''')
        
        # 创建配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS configs (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            )
        ''')
        
        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_scan_records_session_id ON scan_records(session_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_scan_records_created_at ON scan_records(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_book_records_scan_id ON book_records(scan_record_id)')
        
        conn.commit()
        conn.close()
    
    def save_scan_result(self, scan_data: Dict) -> str:
        """保存扫描结果"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 保存扫描记录
            cursor.execute('''
                INSERT INTO scan_records 
                (id, session_id, created_at, model_used, books_count, processing_time, status, result_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                scan_data['id'],
                scan_data['session_id'],
                scan_data['created_at'],
                scan_data['model_used'],
                scan_data['books_count'],
                scan_data['processing_time'],
                scan_data['status'],
                json.dumps(scan_data['result'], ensure_ascii=False)
            ))
            
            # 保存书籍记录
            for book in scan_data['result']['books']:
                cursor.execute('''
                    INSERT INTO book_records 
                    (id, scan_record_id, title, author, publisher, isbn, summary, cover_url, confidence, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    book.get('id', str(uuid.uuid4())),
                    scan_data['id'],
                    book.get('title', ''),
                    book.get('author', ''),
                    book.get('publisher', ''),
                    book.get('isbn', ''),
                    book.get('summary', ''),
                    book.get('cover_url', ''),
                    book.get('confidence', 0),
                    datetime.now().isoformat()
                ))
            
            conn.commit()
            return scan_data['id']
            
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def get_scan_history(self, session_id: Optional[str] = None, limit: int = 20, offset: int = 0) -> List[Dict]:
        """获取扫描历史"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if session_id:
            cursor.execute('''
                SELECT id, session_id, created_at, model_used, books_count, processing_time, status
                FROM scan_records 
                WHERE session_id = ? 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            ''', (session_id, limit, offset))
        else:
            cursor.execute('''
                SELECT id, session_id, created_at, model_used, books_count, processing_time, status
                FROM scan_records 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            ''', (limit, offset))
        
        records = cursor.fetchall()
        conn.close()
        
        # 转换为字典格式
        columns = ['id', 'session_id', 'created_at', 'model_used', 'books_count', 'processing_time', 'status']
        return [dict(zip(columns, record)) for record in records]
    
    def get_scan_detail(self, scan_id: str) -> Optional[Dict]:
        """获取扫描详情"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 获取扫描记录
        cursor.execute('SELECT * FROM scan_records WHERE id = ?', (scan_id,))
        record = cursor.fetchone()
        
        if not record:
            conn.close()
            return None
        
        columns = ['id', 'session_id', 'created_at', 'model_used', 'books_count', 'processing_time', 'status', 'result_json']
        scan_data = dict(zip(columns, record))
        
        # 获取书籍记录
        cursor.execute('''
            SELECT id, title, author, publisher, isbn, summary, cover_url, confidence, created_at
            FROM book_records WHERE scan_record_id = ?
            ORDER BY created_at
        ''', (scan_id,))
        
        books = cursor.fetchall()
        book_columns = ['id', 'title', 'author', 'publisher', 'isbn', 'summary', 'cover_url', 'confidence', 'created_at']
        scan_data['books'] = [dict(zip(book_columns, book)) for book in books]
        
        # 解析JSON结果
        if scan_data['result_json']:
            scan_data['result'] = json.loads(scan_data['result_json'])
        
        conn.close()
        return scan_data
    
    def save_config(self, key: str, value: str) -> bool:
        """保存配置"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO configs (key, value, updated_at)
                VALUES (?, ?, ?)
            ''', (key, value, datetime.now().isoformat()))
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def get_config(self, key: str) -> Optional[str]:
        """获取配置"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT value FROM configs WHERE key = ?', (key,))
        result = cursor.fetchone()
        
        conn.close()
        return result[0] if result else None
    
    def get_all_configs(self) -> Dict[str, str]:
        """获取所有配置"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT key, value FROM configs')
        results = cursor.fetchall()
        
        conn.close()
        return dict(results)
    
    def delete_scan_record(self, scan_id: str) -> bool:
        """删除扫描记录"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # 删除关联的书籍记录
            cursor.execute('DELETE FROM book_records WHERE scan_record_id = ?', (scan_id,))
            # 删除扫描记录
            cursor.execute('DELETE FROM scan_records WHERE id = ?', (scan_id,))
            
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

# 全局数据库实例
db = SimpleDB()
