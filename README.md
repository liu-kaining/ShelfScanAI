# 📚 ShelfScanAI - 智能图书扫描仪

一个基于AI的智能图书识别系统，通过拍摄照片即可快速识别、汇总和深化理解实体书本的核心信息。

## ✨ 功能特性

- 🔍 **智能识别**: 使用Qwen-VL模型识别图片中的书籍信息
- 🌐 **信息丰富**: 自动搜索书籍详细信息（摘要、封面、评分等）
- 📊 **多种导出**: 支持Excel、长图、JSON、CSV等多种格式导出
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🔄 **异步处理**: 后台任务处理，实时进度显示
- 📚 **历史记录**: 完整的扫描历史管理和查询
- ⚙️ **简单配置**: 一键启动，最小化依赖

## 🚀 快速开始

### 环境要求

- Python 3.8+
- 2GB+ 内存
- 10GB+ 可用存储空间

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/ShelfScanAI.git
cd ShelfScanAI
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **配置API Key**
```bash
# 复制配置文件
cp env.example .env

# 编辑配置文件，填入你的Qwen API Key
nano .env
```

4. **一键启动**
```bash
python run.py
```

5. **访问应用**
打开浏览器访问: http://localhost:5006

## ⚙️ 配置说明

### 必需配置

在 `.env` 文件中配置以下参数：

```env
# Qwen API配置（必需）
QWEN_API_KEY=your_qwen_api_key_here
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# 应用配置
SECRET_KEY=your_secret_key_here
FLASK_ENV=development
```

### 可选配置

```env
# Google搜索配置（用于丰富书籍信息）
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# 豆瓣API配置（用于搜索中文书籍）
DOUBAN_API_URL=https://api.douban.com/v2/book/search
```

## 📖 使用指南

### 基本使用

1. **上传图片**: 点击"选择图片"或拖拽图片到上传区域
2. **开始识别**: 点击"开始识别"按钮
3. **查看结果**: 等待识别完成，查看识别结果
4. **导出数据**: 选择导出格式（Excel、长图等）

### 最佳实践

- **图片质量**: 确保书籍封面清晰可见，光线充足
- **拍摄角度**: 尽量垂直拍摄，避免倾斜
- **图片大小**: 建议图片大小在2-10MB之间
- **书籍数量**: 单次识别建议不超过20本书

## 🏗️ 项目结构

```
ShelfScanAI/
├── app/                    # 应用主目录
│   ├── static/            # 静态文件
│   │   ├── css/          # 样式文件
│   │   ├── js/           # JavaScript文件
│   │   └── images/       # 图片资源
│   ├── templates/         # HTML模板
│   ├── models/           # 数据模型
│   ├── services/         # 业务服务
│   ├── utils/            # 工具函数
│   ├── routes.py         # 路由定义
│   └── __init__.py       # 应用初始化
├── temp_images/          # 临时图片存储
├── doc/                  # 文档
├── requirements.txt      # Python依赖
├── run.py               # 启动脚本
├── env.example          # 环境变量示例
└── README.md            # 项目说明
```

## 🔧 技术架构

- **后端**: Flask + SQLite + ThreadPoolExecutor
- **前端**: 原生JavaScript + Bootstrap 5
- **AI模型**: Qwen-VL-Plus/Max
- **数据格式**: JSON
- **文件存储**: 本地文件系统
- **任务处理**: 内存队列

## 📊 API接口

### 核心接口

- `POST /api/upload` - 上传图片
- `POST /api/recognize` - 开始识别任务
- `GET /api/task/<task_id>` - 查询任务状态
- `GET /api/history` - 获取扫描历史
- `POST /api/export/excel` - 导出Excel
- `POST /api/export/image` - 导出长图

详细API文档请参考 [API文档](doc/api.md)

## 🛠️ 开发指南

### 本地开发

1. **安装开发依赖**
```bash
pip install -r requirements.txt
```

2. **启动开发服务器**
```bash
python run.py
```

3. **访问开发界面**
http://localhost:5006

### 添加新功能

1. **后端服务**: 在 `app/services/` 中添加新的服务类
2. **API接口**: 在 `app/routes.py` 中添加新的路由
3. **前端界面**: 在 `app/templates/` 中添加新的模板
4. **样式调整**: 在 `app/static/css/` 中修改样式

## 🔒 安全说明

- API Key采用加密存储，不会以明文形式保存
- 上传的图片存储在临时目录，定期自动清理
- 所有用户输入都经过验证和过滤
- 支持HTTPS部署（生产环境推荐）

## 📝 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🔍 支持Qwen-VL模型识别
- 📊 支持多种格式导出
- 📱 响应式Web界面
- 🔄 异步任务处理

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Qwen](https://github.com/QwenLM/Qwen) - 提供强大的视觉语言模型
- [Flask](https://flask.palletsprojects.com/) - 轻量级Web框架
- [Bootstrap](https://getbootstrap.com/) - 前端UI框架

## 📞 联系方式

- 项目主页: https://github.com/your-username/ShelfScanAI
- 问题反馈: https://github.com/your-username/ShelfScanAI/issues
- 邮箱: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！