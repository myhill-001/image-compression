if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    alert('您的浏览器不支持文件API，请使用现代浏览器');
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成');
    
    // 检查元素是否存在
    const elements = {
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        uploadBtn: document.querySelector('.upload-btn'),
        previewSection: document.getElementById('previewSection'),
        qualitySlider: document.getElementById('quality'),
        qualityValue: document.getElementById('qualityValue'),
        downloadAllBtn: document.getElementById('downloadAllBtn'),
        imagesGrid: document.getElementById('imagesGrid')
    };
    
    console.log('页面元素状态:', elements);

    let imageItems = [];

    // 确保这些元素都能正确获取
    console.log('按钮状态:', {
        fileInput: !!elements.fileInput,
        uploadBtn: !!elements.uploadBtn,
        dropZone: !!elements.dropZone
    });

    // 修改上传按钮点击事件，添加错误处理
    elements.uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            elements.fileInput.click();
        } catch (error) {
            console.error('点击上传按钮时出错:', error);
        }
    });

    // 确保文件输入支持多选
    if (elements.fileInput) {
        elements.fileInput.multiple = true;
    }

    // 文件拖放处理
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.style.borderColor = '#007AFF';
    });

    elements.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        elements.dropZone.style.borderColor = '#DEDEDE';
    });

    elements.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropZone.style.borderColor = '#DEDEDE';
        const files = e.dataTransfer.files;
        handleFiles(Array.from(files));
    });

    // 文件选择处理
    elements.fileInput.addEventListener('change', (e) => {
        handleFiles(Array.from(e.target.files));
    });

    // 质量滑块变化事件
    elements.qualitySlider.addEventListener('input', (e) => {
        const quality = e.target.value;
        elements.qualityValue.textContent = `${quality}%`;
        imageItems.forEach(item => {
            compressImage(item.originalFile, quality / 100, item);
        });
    });

    // 下载所有图片
    elements.downloadAllBtn.addEventListener('click', async () => {
        if (imageItems.length === 0) return;

        const zip = new JSZip();
        
        // 等待所有图片压缩完成
        const promises = imageItems.map(item => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    zip.file(item.compressedName, reader.result.split(',')[1], {base64: true});
                    resolve();
                };
                reader.readAsDataURL(item.compressedBlob);
            });
        });

        await Promise.all(promises);
        
        // 生成并下载zip文件
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'compressed_images.zip';
        link.click();
    });

    // 处理多个文件
    function handleFiles(files) {
        console.log('接收到文件:', files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        console.log('图片文件:', imageFiles);
        
        if (imageFiles.length === 0) {
            alert('请上传图片文件！');
            return;
        }

        elements.previewSection.style.display = 'block';
        
        imageFiles.forEach(file => {
            console.log('处理文件:', file.name, file.type, file.size);
            const imageItem = createImageItem(file);
            imageItems.push(imageItem);
            elements.imagesGrid.appendChild(imageItem.element);
            compressImage(file, elements.qualitySlider.value / 100, imageItem);
        });
    }

    // 创建图片项
    function createImageItem(file) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'image-item';
        
        itemDiv.innerHTML = `
            <div class="image-container">
                <img class="preview" alt="图片预览">
            </div>
            <div class="image-name">${file.name}</div>
            <div class="image-info">
                <div class="size-info">
                    <div>原始：<span class="original-size">计算中...</span></div>
                    <div>压缩后：<span class="compressed-size">处理中...</span></div>
                    <div>压缩率：<span class="compression-ratio">处理中...</span></div>
                </div>
                <button class="item-download-btn">下载</button>
            </div>
        `;

        const imageItem = {
            element: itemDiv,
            originalFile: file,
            preview: itemDiv.querySelector('.preview'),
            originalSize: itemDiv.querySelector('.original-size'),
            compressedSize: itemDiv.querySelector('.compressed-size'),
            compressionRatio: itemDiv.querySelector('.compression-ratio'),
            downloadBtn: itemDiv.querySelector('.item-download-btn'),
            compressedBlob: null,
            compressedName: `compressed_${file.name}`
        };

        // 显示原始图片
        const reader = new FileReader();
        reader.onload = (e) => {
            imageItem.preview.src = e.target.result;
            imageItem.originalSize.textContent = formatFileSize(file.size);
        };
        reader.readAsDataURL(file);

        return imageItem;
    }

    // 压缩图片
    function compressImage(file, quality, imageItem) {
        const reader = new FileReader();
        reader.onerror = (error) => {
            console.error('读取文件时出错:', error);
        };
        
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = (error) => {
                console.error('加载图片时出错:', error);
            };
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            console.error('压缩失败，未生成blob');
                            return;
                        }
                        imageItem.compressedBlob = blob;
                        imageItem.compressedSize.textContent = formatFileSize(blob.size);
                        
                        // 计算压缩率
                        const ratio = ((file.size - blob.size) / file.size * 100).toFixed(1);
                        imageItem.compressionRatio.textContent = `${ratio}%`;
                        imageItem.compressionRatio.className = 'compression-ratio' + 
                            (ratio < 0 ? ' negative-ratio' : '');

                        // 设置下载按钮
                        imageItem.downloadBtn.onclick = () => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = imageItem.compressedName;
                            link.click();
                        };
                    }, file.type, quality);
                } catch (error) {
                    console.error('压缩过程出错:', error);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 