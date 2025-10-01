import pandas as pd
import io
import base64
from typing import List, Dict
from flask import send_file
import json

class ExportService:
    """导出服务 - 处理Excel和图片导出"""
    
    def __init__(self):
        pass
    
    def export_to_excel(self, books: List[Dict], filename: str = "books.xlsx") -> io.BytesIO:
        """导出为Excel文件"""
        try:
            # 准备数据
            export_data = []
            for i, book in enumerate(books, 1):
                export_data.append({
                    '序号': i,
                    '书名': book.get('title', ''),
                    '作者': book.get('author', ''),
                    '出版社': book.get('publisher', ''),
                    'ISBN': book.get('isbn', ''),
                    '摘要': book.get('summary', ''),
                    '置信度': book.get('confidence', 0),
                    '评分': book.get('rating', ''),
                    '页数': book.get('pages', ''),
                    '出版日期': book.get('pubdate', ''),
                    '价格': book.get('price', ''),
                    '封面链接': book.get('cover_url', '')
                })
            
            # 创建DataFrame
            df = pd.DataFrame(export_data)
            
            # 创建Excel文件
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='书籍列表', index=False)
                
                # 获取工作表对象进行格式设置
                worksheet = writer.sheets['书籍列表']
                
                # 设置列宽
                column_widths = {
                    'A': 8,   # 序号
                    'B': 30,  # 书名
                    'C': 20,  # 作者
                    'D': 20,  # 出版社
                    'E': 15,  # ISBN
                    'F': 50,  # 摘要
                    'G': 10,  # 置信度
                    'H': 10,  # 评分
                    'I': 10,  # 页数
                    'J': 12,  # 出版日期
                    'K': 10,  # 价格
                    'L': 40   # 封面链接
                }
                
                for col, width in column_widths.items():
                    worksheet.column_dimensions[col].width = width
                
                # 设置标题行样式
                from openpyxl.styles import Font, PatternFill, Alignment
                
                header_font = Font(bold=True, color="FFFFFF")
                header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
                header_alignment = Alignment(horizontal="center", vertical="center")
                
                for cell in worksheet[1]:
                    cell.font = header_font
                    cell.fill = header_fill
                    cell.alignment = header_alignment
            
            output.seek(0)
            return output
            
        except Exception as e:
            print(f"Excel导出失败: {e}")
            raise e
    
    def export_to_image(self, books: List[Dict]) -> str:
        """导出为长图（返回base64编码的图片）"""
        try:
            # 这里使用html2canvas在前端实现
            # 后端只负责准备数据
            return json.dumps({
                'books': books,
                'total_count': len(books),
                'export_time': pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')
            }, ensure_ascii=False)
            
        except Exception as e:
            print(f"图片导出失败: {e}")
            raise e
    
    def generate_books_html(self, books: List[Dict]) -> str:
        """生成书籍列表的HTML（用于前端转换为图片）"""
        html_content = f"""
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>书籍扫描结果</title>
            <style>
                body {{
                    font-family: 'Microsoft YaHei', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                }}
                .container {{
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    font-weight: 300;
                }}
                .header p {{
                    margin: 10px 0 0 0;
                    opacity: 0.9;
                    font-size: 16px;
                }}
                .books-list {{
                    padding: 30px;
                }}
                .book-item {{
                    border-bottom: 1px solid #eee;
                    padding: 20px 0;
                    display: flex;
                    align-items: flex-start;
                }}
                .book-item:last-child {{
                    border-bottom: none;
                }}
                .book-cover {{
                    width: 80px;
                    height: 100px;
                    background: #f5f5f5;
                    border-radius: 8px;
                    margin-right: 20px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: #999;
                    text-align: center;
                }}
                .book-info {{
                    flex: 1;
                }}
                .book-title {{
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                    margin-bottom: 8px;
                    line-height: 1.4;
                }}
                .book-author {{
                    color: #666;
                    margin-bottom: 5px;
                    font-size: 14px;
                }}
                .book-publisher {{
                    color: #888;
                    font-size: 13px;
                    margin-bottom: 10px;
                }}
                .book-summary {{
                    color: #555;
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 10px;
                }}
                .book-meta {{
                    display: flex;
                    gap: 15px;
                    font-size: 12px;
                    color: #888;
                }}
                .meta-item {{
                    background: #f8f9fa;
                    padding: 4px 8px;
                    border-radius: 4px;
                }}
                .confidence {{
                    background: #e8f5e8;
                    color: #2d5a2d;
                }}
                .rating {{
                    background: #fff3cd;
                    color: #856404;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #888;
                    font-size: 12px;
                    border-top: 1px solid #eee;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📚 书籍扫描结果</h1>
                    <p>共识别到 {len(books)} 本书籍</p>
                </div>
                <div class="books-list">
        """
        
        for i, book in enumerate(books, 1):
            cover_url = book.get('cover_url', '')
            title = book.get('title', '未知书名')
            author = book.get('author', '未知作者')
            publisher = book.get('publisher', '未知出版社')
            summary = book.get('summary', '暂无简介')
            confidence = book.get('confidence', 0)
            rating = book.get('rating', '')
            pages = book.get('pages', '')
            pubdate = book.get('pubdate', '')
            
            # 限制摘要长度
            if len(summary) > 150:
                summary = summary[:150] + '...'
            
            cover_html = f'<img src="{cover_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">' if cover_url else '📖'
            
            html_content += f"""
                    <div class="book-item">
                        <div class="book-cover">
                            {cover_html}
                        </div>
                        <div class="book-info">
                            <div class="book-title">{title}</div>
                            <div class="book-author">👤 {author}</div>
                            <div class="book-publisher">🏢 {publisher}</div>
                            <div class="book-summary">{summary}</div>
                            <div class="book-meta">
                                <span class="meta-item confidence">置信度: {confidence}%</span>
                                {f'<span class="meta-item rating">⭐ {rating}</span>' if rating else ''}
                                {f'<span class="meta-item">📄 {pages}页</span>' if pages else ''}
                                {f'<span class="meta-item">📅 {pubdate}</span>' if pubdate else ''}
                            </div>
                        </div>
                    </div>
            """
        
        html_content += """
                </div>
                <div class="footer">
                    由 ShelfScanAI 生成 | 扫描时间: """ + pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S') + """
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    def export_to_json(self, books: List[Dict]) -> str:
        """导出为JSON格式"""
        export_data = {
            'scan_info': {
                'total_books': len(books),
                'export_time': pd.Timestamp.now().isoformat(),
                'version': '1.0'
            },
            'books': books
        }
        
        return json.dumps(export_data, ensure_ascii=False, indent=2)
    
    def export_to_csv(self, books: List[Dict]) -> str:
        """导出为CSV格式"""
        try:
            # 准备数据
            export_data = []
            for book in books:
                export_data.append({
                    '书名': book.get('title', ''),
                    '作者': book.get('author', ''),
                    '出版社': book.get('publisher', ''),
                    'ISBN': book.get('isbn', ''),
                    '摘要': book.get('summary', ''),
                    '置信度': book.get('confidence', 0),
                    '评分': book.get('rating', ''),
                    '页数': book.get('pages', ''),
                    '出版日期': book.get('pubdate', ''),
                    '价格': book.get('price', ''),
                    '封面链接': book.get('cover_url', '')
                })
            
            # 创建DataFrame并转换为CSV
            df = pd.DataFrame(export_data)
            csv_content = df.to_csv(index=False, encoding='utf-8-sig')
            
            return csv_content
            
        except Exception as e:
            print(f"CSV导出失败: {e}")
            raise e
