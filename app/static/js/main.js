// 全局变量
let currentSessionId = null;
let currentFileId = null;
let currentTaskId = null;
let currentBooks = [];

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    // 生成会话ID
    currentSessionId = generateSessionId();
    
    // 设置Axios默认配置
    axios.defaults.timeout = 30000;
    axios.defaults.headers.common['X-Session-ID'] = currentSessionId;
    
    // 添加请求拦截器 - 暂时禁用自动loading
    axios.interceptors.request.use(
        function (config) {
            // 暂时禁用自动loading，避免卡住问题
            // if (config.url && config.url.includes('/api/') && !config._loadingShown) {
            //     config._loadingShown = true;
            //     showLoading('处理中...', '请稍候');
            // }
            return config;
        },
        function (error) {
            hideLoading();
            return Promise.reject(error);
        }
    );
    
    // 添加响应拦截器
    axios.interceptors.response.use(
        function (response) {
            // if (response.config._loadingShown) {
            //     hideLoading();
            // }
            return response;
        },
        function (error) {
            // if (error.config && error.config._loadingShown) {
            //     hideLoading();
            // }
            console.error('请求失败:', error);
            if (error.response && error.response.status >= 500) {
                showToast('服务器错误，请稍后重试', 'error');
            } else if (error.code === 'ECONNABORTED') {
                showToast('请求超时，请检查网络连接', 'error');
            }
            return Promise.reject(error);
        }
    );
}

// 生成会话ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 显示加载提示
function showLoading(title = '处理中...', message = '请稍候') {
    const modalElement = document.getElementById('loadingModal');
    document.getElementById('loadingTitle').textContent = title;
    document.getElementById('loadingMessage').textContent = message;
    
    // 先隐藏已存在的实例
    const existingModal = bootstrap.Modal.getInstance(modalElement);
    if (existingModal) {
        existingModal.hide();
    }
    
    // 创建新实例并显示
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// 隐藏加载提示
function hideLoading() {
    const modalElement = document.getElementById('loadingModal');
    
    // 直接操作DOM强制隐藏
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // 移除所有backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // 移除body的modal相关类
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// 显示Toast提示
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    
    const toastId = 'toast_' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="fas fa-${getToastIcon(type)} me-2"></i>
                <strong class="me-auto">${getToastTitle(type)}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: duration });
    toast.show();
    
    // 自动清理
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// 获取Toast图标
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// 获取Toast标题
function getToastTitle(type) {
    const titles = {
        'success': '成功',
        'error': '错误',
        'warning': '警告',
        'info': '提示'
    };
    return titles[type] || '提示';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时间
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 格式化相对时间
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return formatDateTime(dateString);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
    } catch (err) {
        // 备用方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('已复制到剪贴板', 'success');
    }
}

// 下载文件
function downloadFile(data, filename, type = 'application/octet-stream') {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// 验证图片文件
function validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
        throw new Error('不支持的文件格式。请选择 JPG、PNG、GIF 或 WEBP 格式的图片。');
    }
    
    if (file.size > maxSize) {
        throw new Error('文件太大。请选择小于 10MB 的图片。');
    }
    
    return true;
}

// 压缩图片
function compressImage(file, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // 计算新尺寸（保持宽高比）
            const maxWidth = 1920;
            const maxHeight = 1080;
            
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 转换为Blob
            canvas.toBlob((blob) => {
                // 给Blob添加name属性
                blob.name = file.name.replace(/\.[^/.]+$/, '.jpg');
                resolve(blob);
            }, 'image/jpeg', quality);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// 获取文件扩展名
function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

// 生成唯一ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 错误处理
function handleError(error, defaultMessage = '操作失败') {
    console.error('Error:', error);
    
    let message = defaultMessage;
    
    if (error.response) {
        // 服务器响应错误
        message = error.response.data?.error || error.response.data?.message || defaultMessage;
    } else if (error.request) {
        // 网络错误
        message = '网络连接失败，请检查网络设置';
    } else {
        // 其他错误
        message = error.message || defaultMessage;
    }
    
    showToast(message, 'error');
}

// 确认对话框
function confirmDialog(message, title = '确认') {
    return new Promise((resolve) => {
        // 这里可以集成更美观的确认对话框组件
        const result = confirm(`${title}\n\n${message}`);
        resolve(result);
    });
}

// 导出所有功能到全局
window.ShelfScanAI = {
    showToast,
    showLoading,
    hideLoading,
    formatFileSize,
    formatDateTime,
    formatRelativeTime,
    copyToClipboard,
    downloadFile,
    validateImageFile,
    compressImage,
    handleError,
    confirmDialog,
    generateUniqueId,
    debounce,
    throttle
};
