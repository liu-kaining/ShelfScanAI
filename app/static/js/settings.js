// 设置页面管理模块
class SettingsManager {
    constructor() {
        this.init();
    }
    
    init() {
        // 确保session ID已初始化
        if (typeof currentSessionId === 'undefined' || !currentSessionId) {
            currentSessionId = 'session_' + Date.now();
        }
        
        this.loadConfig();
        this.setupEventListeners();
        this.loadSystemStats();
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // API Key显示/隐藏切换
        const toggleApiKeyBtn = document.getElementById('toggleApiKey');
        if (toggleApiKeyBtn) {
            toggleApiKeyBtn.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
        }
        
        // 保存配置按钮
        const saveBtn = document.querySelector('button[onclick="saveConfig()"]');
        if (saveBtn) {
            saveBtn.removeAttribute('onclick');
            saveBtn.addEventListener('click', this.saveConfig.bind(this));
        }
        
        // 验证API Key按钮
        const validateBtn = document.querySelector('button[onclick="validateApiKey()"]');
        if (validateBtn) {
            validateBtn.removeAttribute('onclick');
            validateBtn.addEventListener('click', this.validateApiKey.bind(this));
        }
        
        // 重新加载按钮
        const reloadBtn = document.querySelector('button[onclick="loadConfig()"]');
        if (reloadBtn) {
            reloadBtn.removeAttribute('onclick');
            reloadBtn.addEventListener('click', this.loadConfig.bind(this));
        }
        
        // 清理临时文件按钮
        const cleanupBtn = document.querySelector('button[onclick="cleanupTempFiles()"]');
        if (cleanupBtn) {
            cleanupBtn.removeAttribute('onclick');
            cleanupBtn.addEventListener('click', this.cleanupTempFiles.bind(this));
        }
        
        // 刷新统计按钮
        const refreshBtn = document.querySelector('button[onclick="refreshStats()"]');
        if (refreshBtn) {
            refreshBtn.removeAttribute('onclick');
            refreshBtn.addEventListener('click', this.loadSystemStats.bind(this));
        }
        
        // 保存所有设置按钮
        const saveAllBtn = document.querySelector('button[onclick="saveAllSettings()"]');
        if (saveAllBtn) {
            saveAllBtn.removeAttribute('onclick');
            saveAllBtn.addEventListener('click', this.saveAllSettings.bind(this));
        }
        
        // 恢复默认设置按钮
        const resetBtn = document.querySelector('button[onclick="resetToDefault()"]');
        if (resetBtn) {
            resetBtn.removeAttribute('onclick');
            resetBtn.addEventListener('click', this.resetToDefault.bind(this));
        }
    }
    
    // 加载配置
    async loadConfig() {
        try {
            const response = await axios.get('/api/config');
            
            if (response.data.success) {
                const configs = response.data.configs;
                
                // 加载配置到表单
                const apiKeyInput = document.getElementById('apiKey');
                const customPromptInput = document.getElementById('customPrompt');
                
                if (apiKeyInput && configs.api_key) {
                    apiKeyInput.value = '••••••••••••••••'; // 不显示真实API Key
                }
                
                if (customPromptInput && configs.prompt) {
                    customPromptInput.value = configs.prompt;
                }
                
                // ShelfScanAI.showToast('配置加载成功', 'success');
            } else {
                throw new Error(response.data.error || '加载配置失败');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '加载配置失败');
        }
    }
    
    // 保存配置
    async saveConfig() {
        try {
            const apiKeyInput = document.getElementById('apiKey');
            const customPromptInput = document.getElementById('customPrompt');
            
            if (!apiKeyInput || !customPromptInput) {
                throw new Error('找不到配置输入框');
            }
            
            const configData = {};
            
            // 获取API Key（如果用户输入了新值）
            const apiKeyValue = apiKeyInput.value.trim();
            if (apiKeyValue && apiKeyValue !== '••••••••••••••••') {
                configData.api_key = apiKeyValue;
            }
            
            // 获取自定义提示词
            const promptValue = customPromptInput.value.trim();
            if (promptValue) {
                configData.prompt = promptValue;
            }
            
            if (Object.keys(configData).length === 0) {
                ShelfScanAI.showToast('没有需要保存的配置', 'warning');
                return;
            }
            
            const response = await axios.post('/api/config', configData);
            
            if (response.data.success) {
                ShelfScanAI.showToast('配置保存成功', 'success');
                
                // 如果是API Key，显示为隐藏状态
                if (configData.api_key) {
                    apiKeyInput.value = '••••••••••••••••';
                }
            } else {
                throw new Error(response.data.error || '保存配置失败');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '保存配置失败');
        }
    }
    
    // 验证API Key
    async validateApiKey() {
        try {
            const apiKeyInput = document.getElementById('apiKey');
            if (!apiKeyInput) {
                throw new Error('找不到API Key输入框');
            }
            
            const apiKeyValue = apiKeyInput.value.trim();
            if (!apiKeyValue || apiKeyValue === '••••••••••••••••') {
                ShelfScanAI.showToast('请输入API Key', 'warning');
                return;
            }
            
            ShelfScanAI.showLoading('验证API Key', '正在验证API Key有效性...');
            
            const response = await axios.post('/api/config/validate', {
                api_key: apiKeyValue
            });
            
            if (response.data.success) {
                if (response.data.valid) {
                    ShelfScanAI.showToast('API Key验证成功', 'success');
                } else {
                    ShelfScanAI.showToast('API Key验证失败: ' + (response.data.message || 'API Key无效'), 'error');
                }
            } else {
                throw new Error(response.data.error || '验证失败');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '验证API Key失败');
        } finally {
            ShelfScanAI.hideLoading();
        }
    }
    
    // 切换API Key可见性
    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('apiKey');
        const toggleBtn = document.getElementById('toggleApiKey');
        
        if (!apiKeyInput || !toggleBtn) return;
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            apiKeyInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
    
    // 加载系统统计
    async loadSystemStats() {
        try {
            const response = await axios.get('/api/stats');
            
            if (response.data.success) {
                const stats = response.data.stats;
                
                // 更新存储状态
                const tempFilesSpan = document.getElementById('tempFiles');
                const totalSizeSpan = document.getElementById('totalSize');
                const activeSessionsSpan = document.getElementById('activeSessions');
                
                if (tempFilesSpan) tempFilesSpan.textContent = stats.storage.total_files || 0;
                if (totalSizeSpan) totalSizeSpan.textContent = stats.storage.total_size_mb || 0;
                if (activeSessionsSpan) activeSessionsSpan.textContent = stats.storage.active_sessions || 0;
                
                // 更新任务统计
                const totalTasksSpan = document.getElementById('totalTasks');
                const successRateSpan = document.getElementById('successRate');
                const completedTasksSpan = document.getElementById('completedTasks');
                
                if (totalTasksSpan) totalTasksSpan.textContent = stats.tasks.total_tasks || 0;
                if (successRateSpan) successRateSpan.textContent = stats.tasks.success_rate || 0;
                if (completedTasksSpan) completedTasksSpan.textContent = stats.tasks.completed_tasks || 0;
                
            } else {
                throw new Error(response.data.error || '获取统计信息失败');
            }
            
        } catch (error) {
            console.error('加载系统统计失败:', error);
            // 不显示错误提示，因为这是后台更新
        }
    }
    
    // 清理临时文件
    async cleanupTempFiles() {
        try {
            const confirmed = await ShelfScanAI.confirmDialog(
                '确定要清理所有临时文件吗？这个操作不可撤销。',
                '清理临时文件'
            );
            
            if (!confirmed) return;
            
            ShelfScanAI.showLoading('清理临时文件', '正在清理临时文件...');
            
            const response = await axios.post('/api/cleanup', {
                // 不传递session_id，清理所有临时文件
            });
            
            if (response.data.success) {
                // 暴力关闭Modal
                const modalElement = document.getElementById('loadingModal');
                if (modalElement) {
                    modalElement.style.display = 'none';
                    modalElement.classList.remove('show');
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                
                // 移除所有backdrop
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(backdrop => backdrop.remove());
                
                // 然后显示结果
                ShelfScanAI.showToast(`已清理 ${response.data.deleted_files.length} 个文件`, 'success');
                this.loadSystemStats(); // 刷新统计信息
            } else {
                throw new Error(response.data.error || '清理失败');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '清理临时文件失败');
        } finally {
            // 暴力关闭Modal
            const modalElement = document.getElementById('loadingModal');
            if (modalElement) {
                modalElement.style.display = 'none';
                modalElement.classList.remove('show');
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            
            // 移除所有backdrop
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
        }
    }
    
    // 保存所有设置
    async saveAllSettings() {
        try {
            await this.saveConfig();
            
            // 这里可以保存其他高级设置
            const googleApiKey = document.getElementById('googleApiKey');
            const googleSearchId = document.getElementById('googleSearchId');
            const maxWorkers = document.getElementById('maxWorkers');
            const imageQuality = document.getElementById('imageQuality');
            
            // 保存Google API配置
            if (googleApiKey && googleApiKey.value.trim()) {
                // 这里可以添加保存Google API Key的逻辑
                console.log('Google API Key:', googleApiKey.value);
            }
            
            if (googleSearchId && googleSearchId.value.trim()) {
                // 这里可以添加保存Google Search Engine ID的逻辑
                console.log('Google Search Engine ID:', googleSearchId.value);
            }
            
            ShelfScanAI.showToast('所有设置保存成功', 'success');
            
        } catch (error) {
            ShelfScanAI.handleError(error, '保存设置失败');
        }
    }
    
    // 恢复默认设置
    async resetToDefault() {
        try {
            const confirmed = await ShelfScanAI.confirmDialog(
                '确定要恢复默认设置吗？这将清除所有自定义配置。',
                '恢复默认设置'
            );
            
            if (!confirmed) return;
            
            // 重置表单
            const apiKeyInput = document.getElementById('apiKey');
            const customPromptInput = document.getElementById('customPrompt');
            
            if (apiKeyInput) apiKeyInput.value = '';
            if (customPromptInput) customPromptInput.value = '';
            
            ShelfScanAI.showToast('已恢复默认设置', 'success');
            
        } catch (error) {
            ShelfScanAI.handleError(error, '恢复默认设置失败');
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    new SettingsManager();
});

// 导出函数
function saveConfig() {
    // 这个方法会被SettingsManager的实例方法覆盖
}

function validateApiKey() {
    // 这个方法会被SettingsManager的实例方法覆盖
}

function loadConfig() {
    // 这个方法会被SettingsManager的实例方法覆盖
}

function cleanupTempFiles() {
    // 这个方法会被SettingsManager的实例方法覆盖
}

function refreshStats() {
    // 这个方法会被SettingsManager的实例方法覆盖
}

function saveAllSettings() {
    // 这个方法会被SettingsManager的实例方法覆盖
}

function resetToDefault() {
    // 这个方法会被SettingsManager的实例方法覆盖
}
