import requests
import json
import os
import time
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class SearchService:
    """搜索服务 - 丰富书籍信息"""
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_search_engine_id = os.getenv('GOOGLE_SEARCH_ENGINE_ID')
        self.douban_api_url = os.getenv('DOUBAN_API_URL', 'https://api.douban.com/v2/book/search')
        self.cache = {}  # 简单的内存缓存
        self.cache_lock = threading.Lock()
        self.max_workers = 3
    
    def enrich_books(self, books: List[Dict]) -> List[Dict]:
        """丰富书籍信息"""
        if not books:
            return []
        
        enriched_books = []
        
        # 使用线程池并行处理
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交所有搜索任务
            future_to_book = {
                executor.submit(self._enrich_single_book, book): book 
                for book in books
            }
            
            # 收集结果
            for future in as_completed(future_to_book):
                try:
                    enriched_book = future.result()
                    enriched_books.append(enriched_book)
                except Exception as e:
                    original_book = future_to_book[future]
                    print(f"搜索书籍信息失败 {original_book.get('title', 'Unknown')}: {e}")
                    # 如果搜索失败，返回原始信息
                    enriched_books.append(original_book)
        
        return enriched_books
    
    def _enrich_single_book(self, book: Dict) -> Dict:
        """丰富单本书的信息"""
        title = book.get('title', '')
        author = book.get('author', '')
        
        if not title:
            return book
        
        # 检查缓存
        cache_key = f"{title}_{author}".lower()
        with self.cache_lock:
            if cache_key in self.cache:
                cached_info = self.cache[cache_key]
                return {**book, **cached_info}
        
        # 并行搜索多个源
        search_results = {}
        
        try:
            # 搜索豆瓣
            douban_info = self._search_douban(title, author)
            if douban_info:
                search_results.update(douban_info)
            
            # 搜索Google（如果配置了）
            if self.google_api_key and self.google_search_engine_id:
                google_info = self._search_google(title, author)
                if google_info:
                    search_results.update(google_info)
            
        except Exception as e:
            print(f"搜索书籍信息时出错 {title}: {e}")
        
        # 合并结果
        enriched_book = {**book}
        
        # 添加搜索到的信息
        if 'summary' in search_results:
            enriched_book['summary'] = search_results['summary']
        if 'cover_url' in search_results:
            enriched_book['cover_url'] = search_results['cover_url']
        if 'pages' in search_results:
            enriched_book['pages'] = search_results['pages']
        if 'rating' in search_results:
            enriched_book['rating'] = search_results['rating']
        if 'pubdate' in search_results:
            enriched_book['pubdate'] = search_results['pubdate']
        if 'price' in search_results:
            enriched_book['price'] = search_results['price']
        
        # 缓存结果
        with self.cache_lock:
            self.cache[cache_key] = {
                'summary': enriched_book.get('summary', ''),
                'cover_url': enriched_book.get('cover_url', ''),
                'pages': enriched_book.get('pages', ''),
                'rating': enriched_book.get('rating', ''),
                'pubdate': enriched_book.get('pubdate', ''),
                'price': enriched_book.get('price', '')
            }
        
        return enriched_book
    
    def _search_douban(self, title: str, author: str = '') -> Optional[Dict]:
        """使用豆瓣API搜索书籍信息"""
        try:
            search_query = f'{title} {author}'.strip()
            params = {
                'q': search_query,
                'count': 1
            }
            
            response = requests.get(
                self.douban_api_url,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('books'):
                    book = data['books'][0]
                    return {
                        'summary': book.get('summary', ''),
                        'cover_url': book.get('image', ''),
                        'pages': book.get('pages', ''),
                        'rating': book.get('rating', {}).get('average', ''),
                        'pubdate': book.get('pubdate', ''),
                        'price': book.get('price', ''),
                        'publisher': book.get('publisher', ''),
                        'author': book.get('author', [])
                    }
            
        except Exception as e:
            print(f"豆瓣搜索失败 {title}: {e}")
        
        return None
    
    def _search_google(self, title: str, author: str = '') -> Optional[Dict]:
        """使用Google Custom Search API搜索书籍信息"""
        try:
            search_query = f'"{title}" {author} 书籍 简介 摘要'
            
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'cx': self.google_search_engine_id,
                'q': search_query,
                'num': 3
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'items' in data and data['items']:
                    # 提取第一个结果的摘要
                    first_item = data['items'][0]
                    return {
                        'summary': first_item.get('snippet', ''),
                        'cover_url': '',  # Google搜索通常不提供封面
                        'pages': '',
                        'rating': '',
                        'pubdate': '',
                        'price': ''
                    }
            
        except Exception as e:
            print(f"Google搜索失败 {title}: {e}")
        
        return None
    
    def _search_openlibrary(self, title: str, author: str = '') -> Optional[Dict]:
        """使用Open Library API搜索书籍信息（备用方案）"""
        try:
            search_query = f'{title} {author}'.strip()
            
            # 搜索API
            search_url = "https://openlibrary.org/search.json"
            params = {
                'title': title,
                'author': author,
                'limit': 1
            }
            
            response = requests.get(search_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if 'docs' in data and data['docs']:
                    book = data['docs'][0]
                    
                    # 获取详细信息
                    work_key = book.get('key')
                    if work_key:
                        work_url = f"https://openlibrary.org{work_key}.json"
                        work_response = requests.get(work_url, timeout=10)
                        
                        if work_response.status_code == 200:
                            work_data = work_response.json()
                            description = work_data.get('description', '')
                            
                            if isinstance(description, dict):
                                description = description.get('value', '')
                            
                            return {
                                'summary': description[:500] if description else '',  # 限制长度
                                'cover_url': f"https://covers.openlibrary.org/b/id/{book.get('cover_i', '')}-L.jpg" if book.get('cover_i') else '',
                                'pages': book.get('number_of_pages_median', ''),
                                'rating': '',
                                'pubdate': book.get('first_publish_year', ''),
                                'price': ''
                            }
            
        except Exception as e:
            print(f"Open Library搜索失败 {title}: {e}")
        
        return None
    
    def clear_cache(self):
        """清空缓存"""
        with self.cache_lock:
            self.cache.clear()
    
    def get_cache_info(self) -> Dict:
        """获取缓存信息"""
        with self.cache_lock:
            return {
                'cache_size': len(self.cache),
                'cached_books': list(self.cache.keys())
            }
