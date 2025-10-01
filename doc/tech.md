## 智能图书扫描仪 - 技术架构设计文档

### 1\. 系统架构

本系统采用经典的前后端分离架构，通过 RESTful API 进行通信。

  * **前端 (Client)**：负责用户界面展示、用户交互、图片上传和结果渲染。
  * **后端 (Backend)**：负责业务逻辑处理，包括接收图片、调用大模型、调用搜索引擎、数据处理和 API 接口提供。
  * **第三方服务 (3rd-Party Services)**：包括 Qwen 和 DeepSeek 的大模型 API，以及用于信息丰富的搜索引擎 API。

#### 架构图

```
+----------------+      (1) Upload Image      +---------------+      (3) Call LLM API       +--------------------+
|                | ------------------------>  |               | ------------------------> |                    |
|   用户浏览器     |                            |  Flask Backend  |                           | Qwen / DeepSeek API|
| (HTML/CSS/JS)  |      (2) Return JSON     | (Python)      | <-----------------------  |                    |
|                | <------------------------  |               |      (4) Return JSON      +--------------------+
+----------------+                            +-------+-------+
                                                     |
                                                     | (5) Search Book Info
                                                     v
                                             +--------------------+
                                             |                    |
                                             |  Search Engine API |
                                             |                    |
                                             +--------------------+
```

### 2\. 技术选型（简化版）

| 模块 | 技术 | 备注 |
| :--- | :--- | :--- |
| **后端框架** | **Flask** | 轻量、灵活，满足本项目需求。零配置启动。 |
| **前端技术** | **原生 JavaScript + CSS** | 无框架依赖，使用原生技术实现所有功能。 |
| **CSS 库** | **Bootstrap 5** | 快速实现响应式布局和美观的UI。 |
| **数据存储** | **SQLite** | 文件数据库，零配置，满足所有存储需求。 |
| **数据格式** | **JSON** | 所有数据传输和存储使用标准JSON格式。 |
| **任务处理** | **ThreadPoolExecutor** | 内存任务队列，无需外部消息队列。 |
| **文件存储** | **本地文件系统** | 临时图片存储在本地目录，简单可靠。 |
| **大语言模型** | **Qwen-VL-Plus/Max** | 阿里云通义千问视觉模型，具备强大的Vision to Text能力。 |
| **信息搜索** | **Google Custom Search API** | 提供稳定的API来搜索书籍信息。 |
| **Python 依赖** | `requests`: API 调用<br>`Pillow`: 图像处理<br>`pandas`, `openpyxl`: Excel文件生成<br>`cryptography`: API Key 加密 | 最小依赖集合。 |
| **部署方式** | **单文件启动** | `python run.py` 一键启动所有服务。 |

### 3\. 核心流程设计

#### 3.1 图片识别与信息处理流程（优化版）

1.  **前端预处理**：
      * 用户选择图片后，前端进行图片预处理（压缩、格式转换、质量检查）
      * 显示图片预览，允许用户调整和确认
      * 通过 `axios` 将处理后的图片以 `multipart/form-data` 格式 POST 到后端 `/api/recognize` 接口
      * 附带参数：`quality=high|medium|low`

2.  **后端异步处理**：
      * 在 `/api/recognize` 路由中接收图片文件和参数
      * **立即返回任务ID**，避免前端超时
      * 启动异步任务处理图片识别
      * 图片预处理：旋转检测、亮度调整、格式标准化

3.  **大模型调用**：
      * 从加密配置读取API Key和Prompt
      * 图片Base64编码，构造请求体
      * **优化Prompt**：
        ```json
        {
          "model": "qwen-vl-plus",
          "messages": [
            {
              "role": "user",
              "content": [
                { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,{base64_encoded_image}" } },
                { "type": "text", "text": "你是专业的图书识别专家。请仔细识别图片中的每一本书，返回JSON数组格式，每本书包含：title(书名), author(作者), publisher(出版社), isbn(ISBN,如果有), confidence(置信度0-1)。如果信息不完整，请尽力识别，字段值可为null。请确保JSON格式正确，不要包含任何解释文字。" }
              ]
            }
          ],
          "temperature": 0.1
        }
        ```
      * 调用大模型API，获取识别结果
      * 数据清洗和置信度验证

4.  **信息丰富化（并行处理）**：
      * 使用线程池并行处理每本书的信息搜索
      * 调用搜索引擎API获取：摘要、封面URL、出版日期、页数等
      * 实现缓存机制，避免重复搜索
      * 错误处理和重试机制

5.  **结果返回**：
      * 通过WebSocket或轮询方式返回处理进度
      * 完成后返回完整结果，包含置信度评分

#### 3.2 数据导出流程

  * **导出为 Excel**：
    1.  前端提供“导出Excel”按钮，点击后向后端 `/api/export/excel` 发送 POST 请求，请求体为当前表格中的 JSON 数据。
    2.  后端使用 `pandas` 将 JSON 数据转换成 DataFrame。
    3.  使用 `io.BytesIO` 在内存中生成 Excel 文件。
    4.  通过 Flask 的 `send_file` 方法，将文件流作为附件返回给前端，触发浏览器下载。
  * **导出为长图**：
    1.  这是一个**纯前端**实现的功能。
    2.  当用户点击“导出长图”按钮时，调用 `html2canvas` 库。
    3.  `html2canvas` 会读取渲染好的表格区域的 DOM，并将其绘制到一个 HTML `<canvas>` 元素上。
    4.  最后，将 `<canvas>` 的内容转换为 PNG 图片的 Data URL，并创建一个 `<a>` 标签来触发下载。

#### 3.3 配置与安全设计

1.  **前端**：设置页面提供三个输入框：模型选择（下拉框）、API Key（`type="password"`）和 Prompt（`textarea`）。
2.  **后端**：
      * 创建一个 `/api/config` 路由，接收 POST 请求。
      * 从 `.env` 文件中读取一个主密钥 `SECRET_KEY`。
      * 使用 `cryptography.fernet` 库，通过主密钥加密用户提交的 API Key。
      * 将加密后的 Key、选择的模型和 Prompt 存入一个配置文件中（如 `config.ini` 或 `config.json`）。
      * 当识别流程需要使用 Key 时，从配置文件读取加密的 Key，再用主密钥进行解密后使用。**解密后的 Key 只在内存中存在，绝不落盘或返回前端**。

### 4\. API 接口设计（优化版）

| 接口路径 | HTTP 方法 | 功能描述 | 请求体/参数 | 成功响应 (200) | 失败响应 (4xx/5xx) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/recognize` | `POST` | 上传图片并开始识别任务 | `multipart/form-data`: `image`, `quality` | `{"task_id": "uuid", "status": "processing"}` | `{"error": "message"}` |
| `/api/task/<task_id>` | `GET` | 查询任务状态和结果 | URL参数 `task_id` | `{"status": "completed", "result": [...], "progress": 85}` | `{"error": "message"}` |
| `/api/export/excel` | `POST` | 导出 Excel 文件 | `application/json` - 书籍信息数组 | Excel 文件流 | `{"error": "message"}` |
| `/api/export/image` | `POST` | 导出长图文件 | `application/json` - 书籍信息数组 | PNG 文件流 | `{"error": "message"}` |
| `/api/history` | `GET` | 获取扫描历史记录 | 查询参数: `page`, `limit` | `{"records": [...], "total": 100}` | `{"error": "message"}` |
| `/api/history/<record_id>` | `GET` | 获取单次扫描详情 | URL参数 `record_id` | `{"books": [...], "timestamp": "..."}` | `404 Not Found` |
| `/book/<uuid:book_id>` | `GET` | 展示单本书的知识卡片页 | URL参数 `book_id` | `text/html` - 渲染好的知识卡片页面 | `404 Not Found` |
| `/api/config` | `POST` | 保存用户配置 | `application/json` - `{"api_key": "...", "prompt": "..."}` | `{"status": "success"}` | `{"error": "message"}` |
| `/api/config` | `GET` | 获取当前配置（不含Key） | 无 | `{"prompt": "..."}` | `{"error": "message"}` |
| `/api/config/validate` | `POST` | 验证API Key有效性 | `application/json` - `{"api_key": "..."}` | `{"valid": true}` | `{"valid": false, "error": "message"}` |
| `/api/upload` | `POST` | 上传图片到临时存储 | `multipart/form-data`: `image` 文件 | `{"file_id": "uuid", "session_id": "uuid"}` | `{"error": "message"}` |
| `/api/cleanup` | `POST` | 一键清空临时图片 | `application/json` - `{"session_id": "uuid"}` | `{"message": "清理完成", "deleted_files": []}` | `{"error": "message"}` |
| `/api/task/<task_id>/cancel` | `POST` | 取消正在执行的任务 | URL参数 `task_id` | `{"status": "cancelled"}` | `{"error": "message"}` |

### 5\. 项目结构建议 (优化版)

```
/shelf-scan-ai
|-- /app
|   |-- /static
|   |   |-- /css
|   |   |   |-- main.css
|   |   |   |-- components.css
|   |   |-- /js
|   |   |   |-- main.js
|   |   |   |-- image-processor.js
|   |   |   |-- api-client.js
|   |   |   |-- export-utils.js
|   |   |-- /images
|   |   |   |-- icons/
|   |   |   |-- logos/
|   |   |-- /fonts
|   |-- /templates
|   |   |-- base.html          # 基础模板
|   |   |-- index.html         # 主页
|   |   |-- card.html          # 知识卡片页
|   |   |-- settings.html      # 设置页
|   |   |-- history.html       # 历史记录页
|   |   |-- loading.html       # 加载页面
|   |-- /models
|   |   |-- book.py            # 书籍数据模型
|   |   |-- task.py            # 任务数据模型
|   |   |-- config.py          # 配置数据模型
|   |-- /services
|   |   |-- llm_service.py     # LLM调用服务
|   |   |-- search_service.py  # 搜索引擎服务
|   |   |-- image_service.py   # 图片处理服务
|   |   |-- cache_service.py   # 缓存服务
|   |   |-- export_service.py  # 导出服务
|   |   |-- task_service.py    # 任务管理服务
|   |   |-- temp_storage_service.py  # 临时存储服务
|   |   |-- history_service.py # 历史记录服务
|   |-- /utils
|   |   |-- image_utils.py     # 图片处理工具
|   |   |-- text_utils.py      # 文本处理工具
|   |   |-- validators.py      # 数据验证工具
|   |   |-- decorators.py      # 装饰器
|   |-- __init__.py
|   |-- routes.py              # Flask 路由
|   |-- config_manager.py      # 配置管理
|   |-- database.py            # 数据库初始化
|   |-- celery_app.py          # 异步任务配置
|-- /tests
|   |-- test_api.py
|   |-- test_services.py
|   |-- test_utils.py
|-- /docs
|   |-- api.md                 # API文档
|   |-- deployment.md          # 部署文档
|-- run.py                     # 启动文件
|-- celery_worker.py           # Celery工作进程
|-- config.ini.encrypted       # 加密后的配置文件
|-- temp_images/               # 临时图片存储目录
|-- .env                       # 环境变量
|-- requirements.txt           # Python依赖
|-- package.json               # 前端依赖
|-- Dockerfile
|-- docker-compose.yml         # Docker编排
|-- nginx.conf                 # Nginx配置
|-- README.md
|-- .gitignore
```

### 6\. 核心功能详细设计

#### 6.1 异步任务系统（简化版）

**任务状态管理**：
- `PENDING`: 等待处理
- `PROCESSING`: 处理中  
- `COMPLETED`: 已完成
- `FAILED`: 失败
- `CANCELLED`: 已取消

**任务流程**：
1. 用户上传图片 → 创建任务 → 返回task_id
2. 前端轮询任务状态 → 显示进度
3. 任务完成后 → 返回识别结果
4. 支持任务取消和重试机制

**技术实现**：
- 使用ThreadPoolExecutor实现内存任务队列
- 任务状态存储在内存字典中，支持实时查询
- 任务结果持久化到SQLite数据库
- 支持任务进度实时更新

**核心代码结构**：
```python
class SimpleTaskManager:
    def __init__(self, max_workers=3):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.tasks = {}  # 内存存储任务状态
        self.lock = threading.Lock()
    
    def create_task(self, image_path, model_config, session_id):
        # 创建任务并启动异步处理
        pass
    
    def get_task_status(self, task_id):
        # 获取任务状态和进度
        pass
```

#### 6.2 临时图片存储与清理

**存储策略**：
- 图片上传到本地临时目录 `temp_images/`
- 按会话ID组织文件，支持会话管理
- 自动清理超过24小时的图片
- 识别完成后支持一键清空功能

**会话管理**：
- 每个用户会话分配唯一ID
- 会话内所有图片关联到同一ID
- 支持批量清理会话内所有图片
- 提供清理确认和撤销机制

**安全考虑**：
- 文件类型验证和大小限制
- 定期清理过期文件
- 防止路径遍历攻击
- 图片内容安全检查

**核心代码结构**：
```python
class FileManager:
    def __init__(self, temp_dir="temp_images"):
        self.temp_dir = Path(temp_dir)
        self.session_files = {}  # 内存存储会话文件信息
    
    def save_file(self, file, session_id):
        # 保存上传文件到临时目录
        pass
    
    def cleanup_session(self, session_id):
        # 清理指定会话的所有文件
        pass
```

#### 6.3 历史记录系统

**数据模型**：
- `ScanRecord`: 扫描记录（时间、模型、处理时间等）
- `BookRecord`: 书籍记录（书名、作者、摘要等）
- 支持按时间、模型、书籍数量筛选

**功能特性**：
- 完整的扫描历史记录
- 支持历史结果重新导出
- 提供搜索和分页功能
- 支持历史记录删除和管理

**性能优化**：
- 数据库索引优化查询性能
- 分页加载减少内存占用
- 缓存热门查询结果
- 异步数据清理和归档

**核心代码结构**：
```python
class SimpleDB:
    def __init__(self, db_path="shelf_scan.db"):
        self.db_path = db_path
        self.init_db()
    
    def save_scan_result(self, scan_data):
        # 保存扫描结果到SQLite
        pass
    
    def get_scan_history(self, session_id=None, limit=20):
        # 获取扫描历史记录
        pass
```

#### 6.4 Qwen模型集成

**API调用流程**：
1. 图片Base64编码
2. 构造Qwen-VL请求体
3. 调用阿里云API
4. 解析返回结果
5. 数据清洗和验证

**核心代码结构**：
```python
def recognize_books_with_qwen(image_path, api_key):
    # 1. 图片编码
    base64_image = encode_image_to_base64(image_path)
    
    # 2. 构造请求
    payload = {
        "model": "qwen-vl-plus",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                    {"type": "text", "text": "识别图片中的书籍信息..."}
                ]
            }
        ]
    }
    
    # 3. 调用API
    response = requests.post(qwen_api_url, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
    
    # 4. 解析结果
    return parse_qwen_response(response.json())
```

#### 6.5 全网搜索集成

**搜索策略**：
- 主要使用Google Custom Search API
- 辅助使用豆瓣图书API
- 并行搜索多个源
- 结果合并和去重

**核心代码结构**：
```python
def enrich_book_info(books):
    enriched_books = []
    for book in books:
        # 并行搜索多个源
        google_info = search_with_google(book['title'], book['author'])
        douban_info = search_with_douban(book['title'], book['author'])
        
        # 合并结果
        enriched_book = {**book, **google_info, **douban_info}
        enriched_books.append(enriched_book)
    
    return enriched_books
```

### 7\. 部署与启动

#### 7.1 环境要求
- **Python**: 3.8+
- **操作系统**: Windows/macOS/Linux
- **内存**: 建议2GB以上
- **存储**: 建议10GB以上可用空间

#### 7.2 安装依赖
```bash
# 克隆项目
git clone https://github.com/your-username/ShelfScanAI.git
cd ShelfScanAI

# 安装Python依赖
pip install -r requirements.txt
```

#### 7.3 配置设置
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑配置文件
nano .env
```

`.env` 文件内容：
```env
# Qwen API配置
QWEN_API_KEY=your_qwen_api_key_here
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# Google搜索配置（可选）
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# 豆瓣API配置（可选）
DOUBAN_API_URL=https://api.douban.com/v2/book/search

# 应用配置
SECRET_KEY=your_secret_key_here
FLASK_ENV=development
```

#### 7.4 一键启动
```bash
# 启动应用
python run.py
```

启动成功后，访问：`http://localhost:5000`

#### 7.5 目录结构
```
ShelfScanAI/
├── app/                    # 应用主目录
│   ├── static/            # 静态文件
│   ├── templates/         # HTML模板
│   ├── models/           # 数据模型
│   ├── services/         # 业务服务
│   ├── utils/            # 工具函数
│   ├── routes.py         # 路由定义
│   └── __init__.py       # 应用初始化
├── temp_images/          # 临时图片存储
├── shelf_scan.db         # SQLite数据库
├── config.ini.encrypted  # 加密配置文件
├── requirements.txt      # Python依赖
├── run.py               # 启动脚本
└── README.md            # 项目说明
```

#### 7.6 功能验证
1. **访问主页**: `http://localhost:5000`
2. **配置API Key**: 进入设置页面，输入Qwen API Key
3. **上传图片**: 选择一张包含书籍的图片
4. **查看结果**: 等待识别完成，查看识别结果
5. **导出功能**: 测试Excel和长图导出
6. **历史记录**: 查看扫描历史

#### 7.7 故障排除
- **端口占用**: 修改 `run.py` 中的端口号
- **API调用失败**: 检查API Key是否正确
- **图片识别失败**: 确保图片清晰，书籍信息可见
- **数据库错误**: 删除 `shelf_scan.db` 重新创建

### 8\. 开发指南

#### 8.1 项目结构说明
- **app/**: 主要应用代码
- **static/**: 前端静态资源（CSS、JS、图片）
- **templates/**: HTML模板文件
- **models/**: 数据模型定义
- **services/**: 业务逻辑服务
- **utils/**: 通用工具函数

#### 8.2 核心服务
- **TaskManager**: 任务管理和异步处理
- **FileManager**: 文件上传和临时存储管理
- **SimpleDB**: SQLite数据库操作
- **QwenService**: Qwen模型API调用
- **SearchService**: 全网搜索服务

#### 8.3 扩展开发
- **添加新的搜索源**: 在 `SearchService` 中添加新的API
- **自定义识别Prompt**: 在配置页面修改Prompt模板
- **添加新的导出格式**: 在 `ExportService` 中添加新格式
- **扩展数据模型**: 在 `models/` 中定义新的数据表