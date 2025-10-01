from flask import Blueprint, request, jsonify, render_template, send_file, session
import uuid
import os
import json
from datetime import datetime

from .models.database import db
from .services.file_manager import file_manager
from .services.task_manager import task_manager
from .services.export_service import ExportService
from .services.qwen_service import QwenService

# 创建蓝图
main = Blueprint('main', __name__)

# 初始化服务
export_service = ExportService()
qwen_service = QwenService()

@main.route('/')
def index():
    """主页"""
    return render_template('index.html')

@main.route('/settings')
def settings():
    """设置页面"""
    return render_template('settings.html')

@main.route('/history')
def history():
    """历史记录页面"""
    return render_template('history.html')

@main.route('/book/<book_id>')
def book_detail(book_id):
    """书籍详情页面"""
    # 这里可以从数据库查询书籍详情
    return render_template('book_detail.html', book_id=book_id)

# ============ API 路由 ============

@main.route('/api/upload', methods=['POST'])
def upload_image():
    """上传图片"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': '没有上传图片'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        # 获取或创建会话ID
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # 保存文件
        file_info = file_manager.save_uploaded_file(file, session_id)
        
        return jsonify({
            'success': True,
            'file_id': file_info['file_id'],
            'session_id': session_id,
            'message': '图片上传成功'
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"上传图片失败: {e}")
        return jsonify({'error': '上传失败'}), 500

@main.route('/api/recognize', methods=['POST'])
def start_recognition():
    """开始识别任务"""
    try:
        data = request.get_json()
        file_id = data.get('file_id')
        session_id = data.get('session_id')
        
        if not file_id:
            return jsonify({'error': '缺少file_id'}), 400
        
        if not session_id:
            return jsonify({'error': '缺少session_id'}), 400
        
        # 检查文件是否存在
        if not file_manager.get_file_path(file_id):
            return jsonify({'error': '文件不存在'}), 404
        
        # 创建识别任务
        task_id = task_manager.create_task(file_id, session_id)
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'status': 'pending',
            'message': '识别任务已开始'
        })
        
    except Exception as e:
        print(f"创建识别任务失败: {e}")
        return jsonify({'error': '创建任务失败'}), 500

@main.route('/api/task/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """获取任务状态"""
    try:
        task = task_manager.get_task_status(task_id)
        if not task:
            return jsonify({'error': '任务不存在'}), 404
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'status': task['status'],
            'progress': task['progress'],
            'current_stage': task['current_stage'],
            'result': task.get('result'),
            'error': task.get('error'),
            'created_at': task['created_at'],
            'completed_at': task.get('completed_at')
        })
        
    except Exception as e:
        print(f"获取任务状态失败: {e}")
        return jsonify({'error': '获取任务状态失败'}), 500

@main.route('/api/task/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id):
    """取消任务"""
    try:
        success = task_manager.cancel_task(task_id)
        if success:
            return jsonify({
                'success': True,
                'message': '任务已取消'
            })
        else:
            return jsonify({'error': '任务不存在或无法取消'}), 404
            
    except Exception as e:
        print(f"取消任务失败: {e}")
        return jsonify({'error': '取消任务失败'}), 500

@main.route('/api/cleanup', methods=['POST'])
def cleanup_files():
    """清理临时文件"""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        
        deleted_files = []
        
        if session_id:
            # 清理指定会话的文件
            deleted_files = file_manager.cleanup_session(session_id)
        else:
            # 清理所有临时文件
            deleted_files = file_manager.cleanup_old_files(hours=0)  # 清理所有文件
        
        return jsonify({
            'success': True,
            'message': f'已清理 {len(deleted_files)} 个文件',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        print(f"清理文件失败: {e}")
        return jsonify({'error': f'清理文件失败: {str(e)}'}), 500

@main.route('/api/history', methods=['GET'])
def get_scan_history():
    """获取扫描历史"""
    try:
        session_id = request.args.get('session_id')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        offset = (page - 1) * limit
        records = db.get_scan_history(session_id, limit, offset)
        
        return jsonify({
            'success': True,
            'records': records,
            'page': page,
            'limit': limit
        })
        
    except Exception as e:
        print(f"获取历史记录失败: {e}")
        return jsonify({'error': '获取历史记录失败'}), 500

@main.route('/api/history/<scan_id>', methods=['GET'])
def get_scan_detail(scan_id):
    """获取扫描详情"""
    try:
        scan_detail = db.get_scan_detail(scan_id)
        if not scan_detail:
            return jsonify({'error': '记录不存在'}), 404
        
        return jsonify({
            'success': True,
            'scan_detail': scan_detail
        })
        
    except Exception as e:
        print(f"获取扫描详情失败: {e}")
        return jsonify({'error': '获取扫描详情失败'}), 500

@main.route('/api/config', methods=['GET'])
def get_config():
    """获取配置"""
    try:
        configs = db.get_all_configs()
        # 不返回API Key
        safe_configs = {k: v for k, v in configs.items() if k != 'api_key'}
        
        return jsonify({
            'success': True,
            'configs': safe_configs
        })
        
    except Exception as e:
        print(f"获取配置失败: {e}")
        return jsonify({'error': '获取配置失败'}), 500

@main.route('/api/config', methods=['POST'])
def save_config():
    """保存配置"""
    try:
        data = request.get_json()
        
        # 保存API Key
        if 'api_key' in data:
            db.save_config('api_key', data['api_key'])
            # 设置环境变量
            os.environ['QWEN_API_KEY'] = data['api_key']
        
        # 保存Prompt
        if 'prompt' in data:
            db.save_config('prompt', data['prompt'])
        
        return jsonify({
            'success': True,
            'message': '配置保存成功'
        })
        
    except Exception as e:
        print(f"保存配置失败: {e}")
        return jsonify({'error': '保存配置失败'}), 500

@main.route('/api/config/validate', methods=['POST'])
def validate_api_key():
    """验证API Key"""
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({'error': '缺少API Key'}), 400
        
        # 验证API Key
        is_valid = qwen_service.validate_api_key(api_key)
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'message': 'API Key有效' if is_valid else 'API Key无效'
        })
        
    except Exception as e:
        print(f"验证API Key失败: {e}")
        return jsonify({
            'success': False,
            'error': f'验证API Key失败: {str(e)}',
            'valid': False
        }), 500

@main.route('/api/export/excel', methods=['POST'])
def export_excel():
    """导出Excel文件"""
    try:
        data = request.get_json()
        books = data.get('books', [])
        
        if not books:
            return jsonify({'error': '没有数据可导出'}), 400
        
        # 生成Excel文件
        excel_buffer = export_service.export_to_excel(books)
        
        return send_file(
            excel_buffer,
            as_attachment=True,
            download_name=f'books_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        print(f"导出Excel失败: {e}")
        return jsonify({'error': '导出Excel失败'}), 500

@main.route('/api/export/image', methods=['POST'])
def export_image():
    """导出为图片"""
    try:
        data = request.get_json()
        books = data.get('books', [])
        
        if not books:
            return jsonify({'error': '没有数据可导出'}), 400
        
        # 生成HTML内容
        html_content = export_service.generate_books_html(books)
        
        return jsonify({
            'success': True,
            'html_content': html_content,
            'message': 'HTML内容已生成，请在前端转换为图片'
        })
        
    except Exception as e:
        print(f"导出图片失败: {e}")
        return jsonify({'error': '导出图片失败'}), 500

@main.route('/api/stats', methods=['GET'])
def get_stats():
    """获取统计信息"""
    try:
        # 获取任务统计
        task_stats = task_manager.get_task_statistics()
        
        # 获取存储统计
        storage_info = file_manager.get_storage_info()
        
        # 获取数据库统计
        history_records = db.get_scan_history(limit=1000)  # 获取最近1000条记录
        total_scans = len(history_records)
        total_books = sum(record.get('books_count', 0) for record in history_records)
        
        return jsonify({
            'success': True,
            'stats': {
                'tasks': task_stats,
                'storage': storage_info,
                'scans': {
                    'total_scans': total_scans,
                    'total_books': total_books
                }
            }
        })
        
    except Exception as e:
        print(f"获取统计信息失败: {e}")
        return jsonify({'error': '获取统计信息失败'}), 500

@main.route('/api/stats', methods=['GET'])
def get_system_stats():
    """获取系统统计信息"""
    try:
        # 获取存储统计
        storage_stats = file_manager.get_storage_stats()
        
        # 获取任务统计
        task_stats = task_manager.get_task_statistics()
        
        return jsonify({
            'success': True,
            'stats': {
                'storage': storage_stats,
                'tasks': task_stats
            }
        })
        
    except Exception as e:
        print(f"获取系统统计失败: {e}")
        return jsonify({'error': '获取系统统计失败'}), 500

# 错误处理
@main.errorhandler(413)
def too_large(e):
    return jsonify({'error': '文件太大，请选择小于10MB的图片'}), 413

@main.errorhandler(404)
def not_found(e):
    return jsonify({'error': '请求的资源不存在'}), 404

@main.errorhandler(500)
def internal_error(e):
    return jsonify({'error': '服务器内部错误'}), 500
