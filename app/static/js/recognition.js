// 识别处理模块
class RecognitionManager {
    constructor() {
        this.currentTaskId = null;
        this.pollInterval = null;
        this.isProcessing = false;
    }
    
    // 开始识别
    async startRecognition() {
        try {
            if (!currentFileId) {
                throw new Error('请先上传图片');
            }
            
            if (this.isProcessing) {
                throw new Error('正在处理中，请稍候');
            }
            
            this.isProcessing = true;
            
            // 显示进度区域
            this.showProgressSection();
            
            // 开始识别任务
            const response = await axios.post('/api/recognize', {
                file_id: currentFileId,
                session_id: currentSessionId
            });
            
            if (response.data.success) {
                this.currentTaskId = response.data.task_id;
                
                // 开始轮询任务状态
                this.startPolling();
                
                ShelfScanAI.showToast('识别任务已开始', 'success');
            } else {
                throw new Error(response.data.error || '启动识别失败');
            }
            
        } catch (error) {
            this.isProcessing = false;
            this.hideProgressSection();
            ShelfScanAI.handleError(error, '启动识别失败');
        }
    }
    
    // 显示进度区域
    showProgressSection() {
        const progressSection = document.getElementById('progressSection');
        const imagePreview = document.getElementById('imagePreview');
        
        if (progressSection) {
            imagePreview.classList.add('d-none');
            progressSection.classList.remove('d-none');
            progressSection.classList.add('fade-in');
        }
        
        this.updateProgress(0, '准备开始识别...');
    }
    
    // 隐藏进度区域
    hideProgressSection() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.classList.add('d-none');
        }
    }
    
    // 更新进度
    updateProgress(progress, message) {
        const progressBar = document.getElementById('progressBar');
        const progressTitle = document.getElementById('progressTitle');
        const progressMessage = document.getElementById('progressMessage');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`;
        }
        
        if (progressTitle) {
            progressTitle.textContent = this.getProgressTitle(progress);
        }
        
        if (progressMessage) {
            progressMessage.textContent = message;
        }
    }
    
    // 获取进度标题
    getProgressTitle(progress) {
        if (progress < 30) return '正在识别图片中的书籍...';
        if (progress < 60) return '正在搜索书籍详细信息...';
        if (progress < 90) return '正在保存识别结果...';
        if (progress < 100) return '即将完成...';
        return '处理完成！';
    }
    
    // 开始轮询
    startPolling() {
        this.pollInterval = setInterval(() => {
            this.checkTaskStatus();
        }, 2000); // 每2秒检查一次
    }
    
    // 停止轮询
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    // 检查任务状态
    async checkTaskStatus() {
        try {
            if (!this.currentTaskId) return;
            
            const response = await axios.get(`/api/task/${this.currentTaskId}`);
            
            if (response.data.success) {
                const task = response.data;
                
                // 更新进度
                this.updateProgress(task.progress, task.current_stage);
                
                if (task.status === 'completed') {
                    this.handleTaskCompleted(task);
                } else if (task.status === 'failed') {
                    this.handleTaskFailed(task);
                } else if (task.status === 'cancelled') {
                    this.handleTaskCancelled();
                }
            }
            
        } catch (error) {
            console.error('检查任务状态失败:', error);
            this.handleTaskError(error);
        }
    }
    
    // 处理任务完成
    handleTaskCompleted(task) {
        this.stopPolling();
        this.isProcessing = false;
        
        // 保存识别结果
        currentBooks = task.result.books || [];
        
        // 隐藏进度区域，显示结果
        this.hideProgressSection();
        this.showResultSection();
        
        ShelfScanAI.showToast(`识别完成！共识别到 ${currentBooks.length} 本书`, 'success');
    }
    
    // 处理任务失败
    handleTaskFailed(task) {
        this.stopPolling();
        this.isProcessing = false;
        
        this.hideProgressSection();
        
        const errorMessage = task.error || '识别失败';
        ShelfScanAI.handleError(new Error(errorMessage), '识别失败');
    }
    
    // 处理任务取消
    handleTaskCancelled() {
        this.stopPolling();
        this.isProcessing = false;
        
        this.hideProgressSection();
        ShelfScanAI.showToast('识别已取消', 'info');
    }
    
    // 处理任务错误
    handleTaskError(error) {
        this.stopPolling();
        this.isProcessing = false;
        
        this.hideProgressSection();
        ShelfScanAI.handleError(error, '任务状态检查失败');
    }
    
    // 显示结果区域
    showResultSection() {
        const resultSection = document.getElementById('resultSection');
        if (resultSection) {
            resultSection.classList.remove('d-none');
            resultSection.classList.add('fade-in');
            
            // 生成书籍表格
            this.generateBooksTable();
        }
    }
    
    // 生成书籍表格
    generateBooksTable() {
        const booksTable = document.getElementById('booksTable');
        if (!booksTable || !currentBooks.length) return;
        
        const tableHtml = `
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th>封面</th>
                        <th>书名</th>
                        <th>作者</th>
                        <th>出版社</th>
                        <th>置信度</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentBooks.map((book, index) => this.generateBookRow(book, index)).join('')}
                </tbody>
            </table>
        `;
        
        booksTable.innerHTML = tableHtml;
    }
    
    // 生成书籍行
    generateBookRow(book, index) {
        const coverUrl = book.cover_url || '';
        const title = book.title || '未知书名';
        const author = book.author || '未知作者';
        const publisher = book.publisher || '未知出版社';
        const confidence = book.confidence || 0;
        
        const confidenceClass = confidence >= 80 ? 'success' : confidence >= 60 ? 'warning' : 'danger';
        
        return `
            <tr>
                <td>
                    <div class="book-cover-container">
                        ${coverUrl ? 
                            `<img src="${coverUrl}" class="book-cover" alt="${title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="book-cover-placeholder" style="display: none;">
                                 <i class="fas fa-book"></i>
                             </div>` :
                            `<div class="book-cover-placeholder">
                                 <i class="fas fa-book"></i>
                             </div>`
                        }
                    </div>
                </td>
                <td>
                    <strong>${title}</strong>
                    ${book.summary ? `<br><small class="text-muted">${book.summary.substring(0, 100)}${book.summary.length > 100 ? '...' : ''}</small>` : ''}
                </td>
                <td>${author}</td>
                <td>${publisher}</td>
                <td>
                    <span class="badge bg-${confidenceClass}">${confidence}%</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="viewBookDetail(${index})" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="copyBookInfo(${index})" title="复制信息">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // 取消识别
    async cancelRecognition() {
        try {
            if (!this.currentTaskId) {
                ShelfScanAI.showToast('没有正在进行的任务', 'warning');
                return;
            }
            
            const confirmed = await ShelfScanAI.confirmDialog('确定要取消当前的识别任务吗？', '取消识别');
            if (!confirmed) return;
            
            const response = await axios.post(`/api/task/${this.currentTaskId}/cancel`);
            
            if (response.data.success) {
                this.handleTaskCancelled();
            } else {
                throw new Error(response.data.error || '取消任务失败');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '取消任务失败');
        }
    }
    
    // 重置所有
    resetAll() {
        this.stopPolling();
        this.isProcessing = false;
        this.currentTaskId = null;
        currentBooks = [];
        
        // 隐藏所有区域
        this.hideProgressSection();
        document.getElementById('resultSection').classList.add('d-none');
        
        // 重置上传
        if (typeof resetUpload === 'function') {
            resetUpload();
        }
        
        ShelfScanAI.showToast('已重置，可以重新开始', 'info');
    }
}

// 全局识别管理器实例
const recognitionManager = new RecognitionManager();

// 导出函数
function startRecognition() {
    // 检查是否有图片处理器实例
    if (typeof window.imageProcessor !== 'undefined') {
        window.imageProcessor.startRecognition();
    } else if (typeof recognitionManager !== 'undefined') {
        recognitionManager.startRecognition();
    } else {
        console.error('没有可用的识别管理器');
    }
}

function cancelRecognition() {
    recognitionManager.cancelRecognition();
}

function resetAll() {
    recognitionManager.resetAll();
}

// 查看书籍详情
function viewBookDetail(index) {
    const book = currentBooks[index];
    if (!book) return;
    
    const detailHtml = `
        <div class="row">
            <div class="col-md-4">
                ${book.cover_url ? 
                    `<img src="${book.cover_url}" class="img-fluid rounded" alt="${book.title}">` :
                    `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 200px;">
                         <i class="fas fa-book fa-3x text-muted"></i>
                     </div>`
                }
            </div>
            <div class="col-md-8">
                <h4>${book.title || '未知书名'}</h4>
                <p><strong>作者:</strong> ${book.author || '未知作者'}</p>
                <p><strong>出版社:</strong> ${book.publisher || '未知出版社'}</p>
                <p><strong>ISBN:</strong> ${book.isbn || '未知'}</p>
                <p><strong>置信度:</strong> <span class="badge bg-${book.confidence >= 80 ? 'success' : book.confidence >= 60 ? 'warning' : 'danger'}">${book.confidence}%</span></p>
                ${book.summary ? `<p><strong>简介:</strong><br>${book.summary}</p>` : ''}
                ${book.rating ? `<p><strong>评分:</strong> ${book.rating}</p>` : ''}
                ${book.pages ? `<p><strong>页数:</strong> ${book.pages}</p>` : ''}
                ${book.pubdate ? `<p><strong>出版日期:</strong> ${book.pubdate}</p>` : ''}
                ${book.price ? `<p><strong>价格:</strong> ${book.price}</p>` : ''}
            </div>
        </div>
    `;
    
    // 这里可以显示模态框或跳转到详情页面
    alert('书籍详情功能将在后续版本中完善');
}

// 复制书籍信息
function copyBookInfo(index) {
    const book = currentBooks[index];
    if (!book) return;
    
    const bookInfo = `书名: ${book.title || '未知'}
作者: ${book.author || '未知'}
出版社: ${book.publisher || '未知'}
ISBN: ${book.isbn || '未知'}
置信度: ${book.confidence || 0}%
${book.summary ? `简介: ${book.summary}` : ''}`;
    
    ShelfScanAI.copyToClipboard(bookInfo);
}
