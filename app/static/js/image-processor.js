// 图片处理模块
class ImageProcessor {
    constructor() {
        this.currentFile = null;
        this.compressedFile = null;
        this.init();
    }
    
    init() {
        this.setupFileInput();
        this.setupDragAndDrop();
    }
    
    // 设置文件输入
    setupFileInput() {
        const fileInput = document.getElementById('imageInput');
        if (fileInput) {
            // 移除之前的事件监听器，避免重复绑定
            if (this.handleFileInputChange) {
                fileInput.removeEventListener('change', this.handleFileInputChange);
            }
            
            // 创建新的事件处理函数
            this.handleFileInputChange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileSelect(file);
                }
            };
            
            fileInput.addEventListener('change', this.handleFileInputChange);
        }
    }
    
    // 设置拖拽上传
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;
        
        // 移除之前的事件监听器，避免重复绑定
        uploadArea.removeEventListener('dragover', this.handleDragOver);
        uploadArea.removeEventListener('dragleave', this.handleDragLeave);
        uploadArea.removeEventListener('drop', this.handleDrop);
        uploadArea.removeEventListener('click', this.handleUploadClick);
        
        // 定义事件处理函数
        this.handleDragOver = (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        };
        
        this.handleDragLeave = (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        };
        
        this.handleDrop = (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        };
        
        this.handleUploadClick = () => {
            document.getElementById('imageInput').click();
        };
        
        // 绑定事件
        uploadArea.addEventListener('dragover', this.handleDragOver);
        uploadArea.addEventListener('dragleave', this.handleDragLeave);
        uploadArea.addEventListener('drop', this.handleDrop);
        uploadArea.addEventListener('click', this.handleUploadClick);
    }
    
    // 处理文件选择
    async handleFileSelect(file) {
        // 防止重复处理
        if (this.isProcessing) {
            console.log('正在处理中，忽略重复请求');
            return;
        }
        
        try {
            this.isProcessing = true;
            console.log('开始处理文件:', file.name);
            
            // 验证文件
            ShelfScanAI.validateImageFile(file);
            
            // 重置状态
            this.currentFile = file;
            this.compressedFile = null;
            
            // 显示加载
            ShelfScanAI.showLoading('处理图片...', '正在压缩和预览图片');
            
            // 压缩图片
            this.compressedFile = await ShelfScanAI.compressImage(file, 0.85);
            console.log('图片压缩完成');
            
            // 上传文件
            await this.uploadFile();
            console.log('文件上传完成');
            
            // 显示预览
            this.showPreview();
            
            ShelfScanAI.showToast('图片上传成功', 'success');
            
            // 不自动启动识别，等待用户确认
            
        } catch (error) {
            console.error('文件处理失败:', error);
            ShelfScanAI.handleError(error, '图片处理失败');
        } finally {
            // 重置处理状态
            this.isProcessing = false;
            
            // 重置文件输入，避免重复处理
            const fileInput = document.getElementById('imageInput');
            if (fileInput) {
                fileInput.value = '';
            }
        }
    }
    
    // 上传文件
    async uploadFile() {
        try {
            if (!this.compressedFile) {
                throw new Error('没有可上传的文件');
            }
            
            const formData = new FormData();
            formData.append('image', this.compressedFile, this.compressedFile.name || 'image.jpg');
            
            const response = await axios.post('/api/upload', formData, {
                headers: {
                    'X-Session-ID': currentSessionId || 'session_' + Date.now()
                }
            });
            
            if (response.data && response.data.success) {
                currentFileId = response.data.file_id;
                currentSessionId = response.data.session_id;
            } else {
                throw new Error(response.data?.error || '上传失败');
            }
            
        } catch (error) {
            console.error('上传文件错误:', error);
            throw new Error(`上传失败: ${error.message}`);
        }
    }
    
    // 显示预览
    showPreview() {
        const uploadSection = document.getElementById('uploadSection');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const imageInfo = document.getElementById('imageInfo');
        
        if (!uploadSection || !imagePreview || !previewImg || !imageInfo) return;
        
        // 创建预览URL
        const previewUrl = URL.createObjectURL(this.currentFile);
        
        // 设置图片
        previewImg.src = previewUrl;
        
        // 设置信息
        const fileSize = ShelfScanAI.formatFileSize(this.currentFile.size);
        const compressedSize = ShelfScanAI.formatFileSize(this.compressedFile.size);
        const compressionRatio = Math.round((1 - this.compressedFile.size / this.currentFile.size) * 100);
        
        imageInfo.innerHTML = `
            <strong>${this.currentFile.name}</strong><br>
            <small class="text-muted">
                原始大小: ${fileSize}<br>
                压缩后: ${compressedSize} (节省 ${compressionRatio}%)<br>
                格式: ${this.currentFile.type}
            </small>
        `;
        
        // 显示识别按钮
        const recognizeBtn = document.getElementById('recognizeBtn');
        if (recognizeBtn) {
            recognizeBtn.style.display = 'block';
        }
        
        // 显示预览区域
        uploadSection.classList.add('d-none');
        imagePreview.classList.remove('d-none');
        imagePreview.classList.add('fade-in');
        
        // 清理URL对象
        previewImg.onload = () => {
            URL.revokeObjectURL(previewUrl);
        };
    }
    
    // 重置上传
    resetUpload() {
        const uploadSection = document.getElementById('uploadSection');
        const imagePreview = document.getElementById('imagePreview');
        const fileInput = document.getElementById('imageInput');
        
        // 重置文件
        this.currentFile = null;
        this.compressedFile = null;
        currentFileId = null;
        
        // 重置UI
        if (uploadSection) uploadSection.classList.remove('d-none');
        if (imagePreview) imagePreview.classList.add('d-none');
        if (fileInput) fileInput.value = '';
        
        // 移除预览图片
        const previewImg = document.getElementById('previewImg');
        if (previewImg) previewImg.src = '';
    }
    
    // 获取当前文件信息
    getCurrentFile() {
        return {
            original: this.currentFile,
            compressed: this.compressedFile,
            fileId: currentFileId
        };
    }
    
    // 启动识别任务
    async startRecognition() {
        try {
            if (!currentFileId) {
                throw new Error('没有可识别的文件');
            }
            
            // 检查是否有识别管理器
            if (typeof window.recognitionManager !== 'undefined') {
                await window.recognitionManager.startRecognition();
            } else {
                // 如果没有识别管理器，直接调用API
                ShelfScanAI.showLoading('开始识别', '正在分析图片中的书籍...');
                
                const response = await axios.post('/api/recognize', {
                    file_id: currentFileId,
                    session_id: currentSessionId
                });
                
                if (response.data.success) {
                    ShelfScanAI.hideLoading();
                    ShelfScanAI.showToast('识别任务已启动', 'success');
                    
                    // 开始轮询任务状态
                    this.pollTaskStatus(response.data.task_id);
                } else {
                    throw new Error(response.data.error || '启动识别失败');
                }
            }
            
        } catch (error) {
            ShelfScanAI.hideLoading();
            console.error('启动识别失败:', error);
            ShelfScanAI.handleError(error, '启动识别失败');
        }
    }
    
    // 轮询任务状态
    async pollTaskStatus(taskId) {
        try {
            const response = await axios.get(`/api/task/${taskId}`);
            
            if (response.data.success) {
                const task = response.data;
                
                console.log('任务状态:', task.status, '进度:', task.progress, '阶段:', task.current_stage);
                
                if (task.status === 'completed') {
                    ShelfScanAI.hideLoading();
                    ShelfScanAI.showToast('识别完成', 'success');
                    // 这里可以显示识别结果
                    console.log('识别结果:', task.result);
                } else if (task.status === 'failed') {
                    ShelfScanAI.hideLoading();
                    ShelfScanAI.showToast('识别失败: ' + (task.error || '未知错误'), 'error');
                } else if (task.status === 'processing' || task.status === 'pending') {
                    // 更新进度显示
                    ShelfScanAI.showLoading('识别中...', `${task.current_stage || '正在处理...'} (${task.progress || 0}%)`);
                    
                    // 继续轮询
                    setTimeout(() => this.pollTaskStatus(taskId), 2000);
                } else {
                    // 其他状态，继续轮询
                    setTimeout(() => this.pollTaskStatus(taskId), 2000);
                }
            }
            
        } catch (error) {
            ShelfScanAI.hideLoading();
            console.error('轮询任务状态失败:', error);
        }
    }
    
    // 重置上传状态
    resetUpload() {
        this.isProcessing = false;
        this.currentFile = null;
        this.compressedFile = null;
        
        // 重置文件输入
        const fileInput = document.getElementById('imageInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        console.log('上传状态已重置');
    }
}

// 全局图片处理器实例 - 防止重复初始化
if (typeof window.imageProcessor === 'undefined') {
    window.imageProcessor = new ImageProcessor();
}
const imageProcessor = window.imageProcessor;

// 导出函数
function resetUpload() {
    imageProcessor.resetUpload();
}
