// 导出工具模块
class ExportManager {
    constructor() {
        this.init();
    }
    
    init() {
        // 初始化导出功能
    }
    
    // 导出为Excel
    async exportToExcel() {
        try {
            if (!currentBooks || currentBooks.length === 0) {
                ShelfScanAI.showToast('没有数据可导出', 'warning');
                return;
            }
            
            ShelfScanAI.showLoading('导出Excel', '正在生成Excel文件...');
            
            const response = await axios.post('/api/export/excel', {
                books: currentBooks
            }, {
                responseType: 'blob'
            });
            
            // 创建下载链接
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `books_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            ShelfScanAI.showToast('Excel文件导出成功', 'success');
            
        } catch (error) {
            ShelfScanAI.handleError(error, '导出Excel失败');
        }
    }
    
    // 导出为长图
    async exportToImage() {
        try {
            if (!currentBooks || currentBooks.length === 0) {
                ShelfScanAI.showToast('没有数据可导出', 'warning');
                return;
            }
            
            ShelfScanAI.showLoading('导出图片', '正在生成图片...');
            
            // 获取HTML内容
            const response = await axios.post('/api/export/image', {
                books: currentBooks
            });
            
            if (response.data.success) {
                // 创建新窗口显示HTML
                const newWindow = window.open('', '_blank');
                newWindow.document.write(response.data.html_content);
                newWindow.document.close();
                
                // 等待页面加载完成后转换为图片
                newWindow.onload = () => {
                    this.convertHtmlToImage(newWindow);
                };
                
                ShelfScanAI.showToast('请在新窗口中右键保存图片', 'info');
            } else {
                throw new Error(response.data.error || '生成图片失败');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '导出图片失败');
        }
    }
    
    // 转换HTML为图片
    convertHtmlToImage(window) {
        try {
            // 这里可以使用html2canvas库进行转换
            // 由于我们没有引入外部库，这里提供一个简单的实现
            
            // 滚动到顶部
            window.scrollTo(0, 0);
            
            // 提示用户手动截图
            setTimeout(() => {
                alert('请使用浏览器的截图功能或打印为PDF功能保存图片');
            }, 1000);
            
        } catch (error) {
            console.error('转换图片失败:', error);
            ShelfScanAI.showToast('转换图片失败，请手动截图', 'warning');
        }
    }
    
    // 导出为JSON
    exportToJson() {
        try {
            if (!currentBooks || currentBooks.length === 0) {
                ShelfScanAI.showToast('没有数据可导出', 'warning');
                return;
            }
            
            const exportData = {
                export_info: {
                    total_books: currentBooks.length,
                    export_time: new Date().toISOString(),
                    version: '1.0'
                },
                books: currentBooks
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `books_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            ShelfScanAI.showToast('JSON文件导出成功', 'success');
            
        } catch (error) {
            ShelfScanAI.handleError(error, '导出JSON失败');
        }
    }
    
    // 导出为CSV
    async exportToCsv() {
        try {
            if (!currentBooks || currentBooks.length === 0) {
                ShelfScanAI.showToast('没有数据可导出', 'warning');
                return;
            }
            
            ShelfScanAI.showLoading('导出CSV', '正在生成CSV文件...');
            
            // 构造CSV内容
            const headers = ['书名', '作者', '出版社', 'ISBN', '摘要', '置信度', '评分', '页数', '出版日期', '价格', '封面链接'];
            const csvContent = [
                headers.join(','),
                ...currentBooks.map(book => [
                    this.escapeCsvField(book.title || ''),
                    this.escapeCsvField(book.author || ''),
                    this.escapeCsvField(book.publisher || ''),
                    this.escapeCsvField(book.isbn || ''),
                    this.escapeCsvField(book.summary || ''),
                    book.confidence || 0,
                    this.escapeCsvField(book.rating || ''),
                    this.escapeCsvField(book.pages || ''),
                    this.escapeCsvField(book.pubdate || ''),
                    this.escapeCsvField(book.price || ''),
                    this.escapeCsvField(book.cover_url || '')
                ].join(','))
            ].join('\n');
            
            // 添加BOM以支持中文
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `books_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            ShelfScanAI.showToast('CSV文件导出成功', 'success');
            
        } catch (error) {
            ShelfScanAI.handleError(error, '导出CSV失败');
        }
    }
    
    // 转义CSV字段
    escapeCsvField(field) {
        if (field === null || field === undefined) {
            return '';
        }
        
        const stringField = String(field);
        
        // 如果字段包含逗号、引号或换行符，需要用引号包围并转义引号
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        
        return stringField;
    }
    
    // 打印结果
    printResults() {
        try {
            if (!currentBooks || currentBooks.length === 0) {
                ShelfScanAI.showToast('没有数据可打印', 'warning');
                return;
            }
            
            // 创建打印内容
            const printContent = this.generatePrintContent();
            
            // 创建新窗口进行打印
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // 等待内容加载完成后打印
            printWindow.onload = () => {
                printWindow.print();
                printWindow.close();
            };
            
        } catch (error) {
            ShelfScanAI.handleError(error, '打印失败');
        }
    }
    
    // 生成打印内容
    generatePrintContent() {
        const printHtml = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>书籍扫描结果</title>
                <style>
                    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .book-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                    .book-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
                    .book-info { margin-bottom: 5px; }
                    .book-summary { margin-top: 10px; color: #666; }
                    @media print {
                        body { margin: 0; }
                        .book-item { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📚 书籍扫描结果</h1>
                    <p>扫描时间: ${new Date().toLocaleString('zh-CN')}</p>
                    <p>共识别到 ${currentBooks.length} 本书</p>
                </div>
                
                ${currentBooks.map((book, index) => `
                    <div class="book-item">
                        <div class="book-title">${index + 1}. ${book.title || '未知书名'}</div>
                        <div class="book-info"><strong>作者:</strong> ${book.author || '未知作者'}</div>
                        <div class="book-info"><strong>出版社:</strong> ${book.publisher || '未知出版社'}</div>
                        <div class="book-info"><strong>ISBN:</strong> ${book.isbn || '未知'}</div>
                        <div class="book-info"><strong>置信度:</strong> ${book.confidence || 0}%</div>
                        ${book.rating ? `<div class="book-info"><strong>评分:</strong> ${book.rating}</div>` : ''}
                        ${book.pages ? `<div class="book-info"><strong>页数:</strong> ${book.pages}</div>` : ''}
                        ${book.pubdate ? `<div class="book-info"><strong>出版日期:</strong> ${book.pubdate}</div>` : ''}
                        ${book.summary ? `<div class="book-summary"><strong>简介:</strong> ${book.summary}</div>` : ''}
                    </div>
                `).join('')}
            </body>
            </html>
        `;
        
        return printHtml;
    }
    
    // 分享结果
    shareResults() {
        try {
            if (!currentBooks || currentBooks.length === 0) {
                ShelfScanAI.showToast('没有数据可分享', 'warning');
                return;
            }
            
            const shareText = `我刚刚使用ShelfScanAI识别了${currentBooks.length}本书！\n\n` +
                currentBooks.slice(0, 3).map(book => `📖 ${book.title || '未知书名'} - ${book.author || '未知作者'}`).join('\n') +
                (currentBooks.length > 3 ? `\n...还有${currentBooks.length - 3}本书` : '');
            
            if (navigator.share) {
                // 使用Web Share API
                navigator.share({
                    title: 'ShelfScanAI扫描结果',
                    text: shareText,
                    url: window.location.origin
                });
            } else {
                // 复制到剪贴板
                ShelfScanAI.copyToClipboard(shareText);
                ShelfScanAI.showToast('分享内容已复制到剪贴板', 'success');
            }
            
        } catch (error) {
            ShelfScanAI.handleError(error, '分享失败');
        }
    }
}

// 全局导出管理器实例
const exportManager = new ExportManager();

// 导出函数
function exportToExcel() {
    exportManager.exportToExcel();
}

function exportToImage() {
    exportManager.exportToImage();
}

function exportToJson() {
    exportManager.exportToJson();
}

function exportToCsv() {
    exportManager.exportToCsv();
}

function printResults() {
    exportManager.printResults();
}

function shareResults() {
    exportManager.shareResults();
}
