// 历史记录管理模块
class HistoryManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalRecords = 0;
        this.filters = {
            search: '',
            date: '',
            books: ''
        };
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadHistory();
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 搜索输入框
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', ShelfScanAI.debounce(() => {
                this.filters.search = searchInput.value.trim();
                this.applyFilters();
            }, 500));
        }
        
        // 日期筛选
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filters.date = dateFilter.value;
                this.applyFilters();
            });
        }
        
        // 书籍数量筛选
        const booksFilter = document.getElementById('booksFilter');
        if (booksFilter) {
            booksFilter.addEventListener('change', () => {
                this.filters.books = booksFilter.value;
                this.applyFilters();
            });
        }
        
        // 筛选按钮
        const filterBtn = document.querySelector('button[onclick="applyFilters()"]');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }
        
        // 刷新按钮
        const refreshBtn = document.querySelector('button[onclick="refreshHistory()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshHistory();
            });
        }
        
        // 清空历史按钮
        const clearBtn = document.querySelector('button[onclick="clearAllHistory()"]');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllHistory();
            });
        }
    }
    
    // 加载历史记录
    async loadHistory(page = 1) {
        try {
            this.currentPage = page;
            
            // 显示加载状态
            this.showLoadingState();
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize
            });
            
            const response = await axios.get(`/api/history?${params}`);
            
            if (response.data.success) {
                this.totalRecords = response.data.total || 0;
                this.renderHistoryTable(response.data.records);
                this.renderPagination();
                this.hideEmptyState();
            } else {
                throw new Error(response.data.error || '加载历史记录失败');
            }
            
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.showEmptyState('加载失败，请重试');
        }
    }
    
    // 渲染历史记录表格
    renderHistoryTable(records) {
        const tbody = document.getElementById('historyTableBody');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');
        
        if (!tbody) return;
        
        // 隐藏加载状态
        if (loadingState) loadingState.classList.add('d-none');
        
        if (!records || records.length === 0) {
            tbody.innerHTML = '';
            this.showEmptyState();
            return;
        }
        
        tbody.innerHTML = records.map(record => this.generateHistoryRow(record)).join('');
    }
    
    // 生成历史记录行
    generateHistoryRow(record) {
        const scanTime = ShelfScanAI.formatDateTime(record.created_at);
        const relativeTime = ShelfScanAI.formatRelativeTime(record.created_at);
        const processingTime = record.processing_time ? `${record.processing_time}s` : '-';
        const statusClass = this.getStatusClass(record.status);
        const statusText = this.getStatusText(record.status);
        
        return `
            <tr>
                <td>
                    <div>
                        <strong>${scanTime}</strong><br>
                        <small class="text-muted">${relativeTime}</small>
                    </div>
                </td>
                <td>
                    <span class="badge bg-info">${record.model_used || 'qwen'}</span>
                </td>
                <td>
                    <span class="badge bg-primary">${record.books_count || 0} 本</span>
                </td>
                <td>${processingTime}</td>
                <td>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="viewScanDetail('${record.id}')" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="exportScanResult('${record.id}')" title="导出结果">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteScanRecord('${record.id}')" title="删除记录">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // 获取状态样式类
    getStatusClass(status) {
        const statusClasses = {
            'completed': 'success',
            'failed': 'danger',
            'processing': 'warning',
            'pending': 'info',
            'cancelled': 'secondary'
        };
        return statusClasses[status] || 'secondary';
    }
    
    // 获取状态文本
    getStatusText(status) {
        const statusTexts = {
            'completed': '已完成',
            'failed': '失败',
            'processing': '处理中',
            'pending': '等待中',
            'cancelled': '已取消'
        };
        return statusTexts[status] || '未知';
    }
    
    // 渲染分页
    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // 上一页按钮
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // 页码按钮
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        // 下一页按钮
        paginationHtml += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHtml;
    }
    
    // 显示加载状态
    showLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const tbody = document.getElementById('historyTableBody');
        
        if (loadingState) loadingState.classList.remove('d-none');
        if (emptyState) emptyState.classList.add('d-none');
        if (tbody) tbody.innerHTML = '';
    }
    
    // 显示空状态
    showEmptyState(message = '暂无扫描记录') {
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');
        const tbody = document.getElementById('historyTableBody');
        
        if (loadingState) loadingState.classList.add('d-none');
        if (emptyState) {
            emptyState.classList.remove('d-none');
            const emptyMessage = emptyState.querySelector('h5');
            if (emptyMessage) emptyMessage.textContent = message;
        }
        if (tbody) tbody.innerHTML = '';
    }
    
    // 隐藏空状态
    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.classList.add('d-none');
    }
    
    // 应用筛选
    applyFilters() {
        this.currentPage = 1;
        this.loadHistory();
    }
    
    // 刷新历史记录
    refreshHistory() {
        this.loadHistory(this.currentPage);
    }
    
    // 清空所有历史记录
    async clearAllHistory() {
        try {
            const confirmed = await ShelfScanAI.confirmDialog(
                '确定要清空所有历史记录吗？这个操作不可撤销。',
                '清空历史记录'
            );
            
            if (!confirmed) return;
            
            ShelfScanAI.showLoading('清空历史记录', '正在删除所有历史记录...');
            
            // 这里需要实现清空历史记录的API
            // 由于当前API没有提供这个功能，我们显示提示
            ShelfScanAI.showToast('清空历史记录功能将在后续版本中提供', 'info');
            
        } catch (error) {
            ShelfScanAI.handleError(error, '清空历史记录失败');
        }
    }
}

// 全局历史记录管理器实例
const historyManager = new HistoryManager();

// 导出函数
function refreshHistory() {
    historyManager.refreshHistory();
}

function clearAllHistory() {
    historyManager.clearAllHistory();
}

function applyFilters() {
    historyManager.applyFilters();
}

function goToPage(page) {
    historyManager.loadHistory(page);
}

// 查看扫描详情
async function viewScanDetail(scanId) {
    try {
        ShelfScanAI.showLoading('加载详情', '正在加载扫描详情...');
        
        const response = await axios.get(`/api/history/${scanId}`);
        
        if (response.data.success) {
            const scanDetail = response.data.scan_detail;
            showScanDetailModal(scanDetail);
        } else {
            throw new Error(response.data.error || '加载详情失败');
        }
        
    } catch (error) {
        ShelfScanAI.handleError(error, '加载详情失败');
    }
}

// 显示扫描详情模态框
function showScanDetailModal(scanDetail) {
    const modal = document.getElementById('detailModal');
    const detailContent = document.getElementById('detailContent');
    
    if (!modal || !detailContent) return;
    
    const books = scanDetail.books || [];
    
    const detailHtml = `
        <div class="mb-3">
            <h6>扫描信息</h6>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>扫描时间:</strong> ${ShelfScanAI.formatDateTime(scanDetail.created_at)}</p>
                    <p><strong>使用模型:</strong> <span class="badge bg-info">${scanDetail.model_used}</span></p>
                </div>
                <div class="col-md-6">
                    <p><strong>书籍数量:</strong> <span class="badge bg-primary">${scanDetail.books_count} 本</span></p>
                    <p><strong>处理时间:</strong> ${scanDetail.processing_time || 0}秒</p>
                </div>
            </div>
        </div>
        
        <div class="mb-3">
            <h6>识别结果</h6>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>书名</th>
                            <th>作者</th>
                            <th>出版社</th>
                            <th>置信度</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${book.title || '未知书名'}</td>
                                <td>${book.author || '未知作者'}</td>
                                <td>${book.publisher || '未知出版社'}</td>
                                <td><span class="badge bg-${book.confidence >= 80 ? 'success' : book.confidence >= 60 ? 'warning' : 'danger'}">${book.confidence || 0}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    detailContent.innerHTML = detailHtml;
    
    // 保存当前扫描详情到全局变量，供导出使用
    window.currentScanDetail = scanDetail;
    
    // 显示模态框
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// 导出扫描结果
function exportScanResult(scanId) {
    // 先获取扫描详情，然后导出
    viewScanDetail(scanId);
}

// 从详情模态框导出
function exportFromDetail() {
    const scanDetail = window.currentScanDetail;
    if (!scanDetail || !scanDetail.books) {
        ShelfScanAI.showToast('没有可导出的数据', 'warning');
        return;
    }
    
    // 设置当前书籍数据并导出
    window.currentBooks = scanDetail.books;
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('detailModal'));
    if (modal) modal.hide();
    
    // 显示导出选项
    showExportOptions();
}

// 显示导出选项
function showExportOptions() {
    const options = [
        { name: 'Excel文件', action: () => exportToExcel() },
        { name: '长图', action: () => exportToImage() },
        { name: 'JSON文件', action: () => exportToJson() }
    ];
    
    let message = '请选择导出格式：\n';
    options.forEach((option, index) => {
        message += `${index + 1}. ${option.name}\n`;
    });
    
    const choice = prompt(message);
    const choiceIndex = parseInt(choice) - 1;
    
    if (choiceIndex >= 0 && choiceIndex < options.length) {
        options[choiceIndex].action();
    }
}

// 删除扫描记录
async function deleteScanRecord(scanId) {
    try {
        const confirmed = await ShelfScanAI.confirmDialog(
            '确定要删除这条扫描记录吗？这个操作不可撤销。',
            '删除记录'
        );
        
        if (!confirmed) return;
        
        ShelfScanAI.showLoading('删除记录', '正在删除扫描记录...');
        
        // 这里需要实现删除记录的API
        // 由于当前API没有提供这个功能，我们显示提示
        ShelfScanAI.showToast('删除记录功能将在后续版本中提供', 'info');
        
    } catch (error) {
        ShelfScanAI.handleError(error, '删除记录失败');
    }
}
