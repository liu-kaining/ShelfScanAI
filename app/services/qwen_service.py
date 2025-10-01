import base64
import json
import requests
import os
from typing import List, Dict, Optional
from PIL import Image
import io

class QwenService:
    """Qwen模型服务 - 处理图片识别"""
    
    def __init__(self):
        self.api_key = os.getenv('QWEN_API_KEY')
        self.api_url = os.getenv('QWEN_API_URL', 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation')
        self.model = "qwen-vl-plus"
        
    def recognize_books(self, image_path: str) -> List[Dict]:
        """识别图片中的书籍"""
        if not self.api_key:
            raise ValueError("未配置Qwen API Key")
        
        try:
            # 1. 处理图片
            processed_image = self._process_image(image_path)
            
            # 2. 编码图片
            base64_image = self._encode_image_to_base64(processed_image)
            
            # 3. 构造请求
            payload = self._build_request_payload(base64_image)
            
            # 4. 调用API
            response = self._call_qwen_api(payload)
            
            # 5. 解析结果
            books = self._parse_response(response)
            
            return books
            
        except Exception as e:
            print(f"Qwen识别失败: {e}")
            raise e
    
    def _process_image(self, image_path: str) -> bytes:
        """处理图片 - 压缩和格式转换"""
        try:
            with Image.open(image_path) as img:
                # 转换为RGB模式
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 压缩图片（保持宽高比，最大宽度1920）
                max_width = 1920
                if img.width > max_width:
                    ratio = max_width / img.width
                    new_height = int(img.height * ratio)
                    img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                
                # 转换为字节
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='JPEG', quality=85, optimize=True)
                return img_byte_arr.getvalue()
                
        except Exception as e:
            raise ValueError(f"图片处理失败: {e}")
    
    def _encode_image_to_base64(self, image_bytes: bytes) -> str:
        """将图片编码为Base64"""
        return base64.b64encode(image_bytes).decode('utf-8')
    
    def _build_request_payload(self, base64_image: str) -> Dict:
        """构造请求体"""
        prompt = """你是专业的图书识别专家。请仔细识别图片中的每一本书，并以JSON数组的格式返回结果。

要求：
1. 识别图片中所有清晰可见的书籍
2. 每本书包含以下字段：
   - title: 书名（必填）
   - author: 作者（如果有）
   - publisher: 出版社（如果有）
   - isbn: ISBN号（如果有）
   - confidence: 置信度（0-100的整数）

3. 如果某些信息无法识别，对应字段设为null
4. 只返回JSON数组，不要包含任何解释文字
5. 确保JSON格式正确

示例格式：
[
  {
    "title": "Python编程从入门到实践",
    "author": "Eric Matthes",
    "publisher": "人民邮电出版社",
    "isbn": null,
    "confidence": 95
  }
]"""
        
        return {
            "model": self.model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "image": f"data:image/jpeg;base64,{base64_image}"
                            },
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            },
            "parameters": {
                "temperature": 0.1,
                "max_tokens": 2000
            }
        }
    
    def _call_qwen_api(self, payload: Dict) -> Dict:
        """调用Qwen API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            print(f"调用Qwen API: {self.api_url}")
            print(f"请求头: {headers}")
            print(f"请求体大小: {len(str(payload))} 字符")
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=120  # 增加超时时间
            )
            
            print(f"API响应状态: {response.status_code}")
            print(f"API响应头: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"API错误响应: {response.text}")
                raise ValueError(f"API调用失败: {response.status_code} - {response.text}")
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise ValueError("API调用超时，请稍后重试")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"API调用失败: {e}")
        except Exception as e:
            raise ValueError(f"请求处理失败: {e}")
    
    def _parse_response(self, response: Dict) -> List[Dict]:
        """解析API响应"""
        try:
            # 提取文本内容
            if 'output' in response and 'choices' in response['output']:
                content = response['output']['choices'][0]['message']['content']
            else:
                raise ValueError("响应格式不正确")
            
            # 处理content可能是列表的情况
            if isinstance(content, list):
                # 如果是列表，提取第一个元素的text
                text_content = ""
                for item in content:
                    if isinstance(item, dict) and 'text' in item:
                        text_content += item['text']
                content = text_content
            elif isinstance(content, str):
                # 如果已经是字符串，直接使用
                pass
            else:
                raise ValueError("无法解析响应内容")
            
            # 尝试解析JSON
            try:
                books = json.loads(content)
            except json.JSONDecodeError:
                # 如果直接解析失败，尝试提取JSON部分
                books = self._extract_json_from_text(content)
            
            # 验证和清理数据
            if not isinstance(books, list):
                raise ValueError("返回的不是数组格式")
            
            cleaned_books = []
            for book in books:
                if isinstance(book, dict) and book.get('title'):
                    cleaned_book = {
                        'title': book.get('title', '').strip(),
                        'author': book.get('author', '').strip() if book.get('author') else None,
                        'publisher': book.get('publisher', '').strip() if book.get('publisher') else None,
                        'isbn': book.get('isbn', '').strip() if book.get('isbn') else None,
                        'confidence': int(book.get('confidence', 0)) if book.get('confidence') else 0
                    }
                    cleaned_books.append(cleaned_book)
            
            return cleaned_books
            
        except Exception as e:
            print(f"解析响应失败: {e}")
            print(f"原始响应: {response}")
            raise ValueError(f"解析识别结果失败: {e}")
    
    def _extract_json_from_text(self, text: str) -> List[Dict]:
        """从文本中提取JSON"""
        import re
        
        # 查找JSON数组
        json_pattern = r'\[[\s\S]*?\]'
        matches = re.findall(json_pattern, text)
        
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
        
        raise ValueError("无法从响应中提取有效的JSON")
    
    def validate_api_key(self, api_key: str) -> bool:
        """验证API Key是否有效"""
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            # 发送一个简单的测试请求
            test_payload = {
                "model": self.model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": "Hello"
                        }
                    ]
                },
                "parameters": {
                    "max_tokens": 10,
                    "temperature": 0.1
                }
            }
            
            response = requests.post(
                self.api_url,
                headers=headers,
                json=test_payload,
                timeout=10
            )
            
            print(f"API Key验证响应: {response.status_code}")
            if response.status_code != 200:
                print(f"API Key验证错误: {response.text}")
            
            return response.status_code == 200
            
        except Exception as e:
            print(f"API Key验证失败: {e}")
            return False
