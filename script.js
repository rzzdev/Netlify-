document.addEventListener('DOMContentLoaded', function() {
    const deployForm = document.getElementById('deployForm');
    const htmlFilesInput = document.getElementById('htmlFiles');
    const fileList = document.getElementById('fileList');
    const deployBtn = document.getElementById('deployBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progress');
    const progressText = document.getElementById('progressText');
    const resultContainer = document.getElementById('resultContainer');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const siteUrl = document.getElementById('siteUrl');
    const rocketContainer = document.getElementById('rocketContainer');
    
    let uploadedFiles = [];
    
    // Create stars in the night sky
    createStars();
    
    // File upload handling
    htmlFilesInput.addEventListener('change', handleFileSelect);
    
    // Form submission
    deployForm.addEventListener('submit', handleFormSubmit);
    
    // Drag and drop
    const fileLabel = document.querySelector('.file-label');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileLabel.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileLabel.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileLabel.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        fileLabel.classList.add('highlight');
    }
    
    function unhighlight() {
        fileLabel.classList.remove('highlight');
    }
    
    fileLabel.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }
    
    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }
    
    function handleFiles(files) {
        // Convert FileList to array
        const filesArray = Array.from(files);
        
        // Check if all files are HTML
        const nonHtmlFiles = filesArray.filter(file => {
            const fileName = file.name.toLowerCase();
            return !fileName.endsWith('.html') && !fileName.endsWith('.htm');
        });
        
        // If there are non-HTML files, show error and don't add any files
        if (nonHtmlFiles.length > 0) {
            showError('Hanya file HTML (.html atau .htm) yang diizinkan untuk diunggah.');
            
            // Clear the file input
            htmlFilesInput.value = '';
            
            // Don't update the file list
            return;
        }
        
        // If all files are HTML, update the uploaded files array
        uploadedFiles = [...filesArray];
        displayFiles();
    }
    
    function displayFiles() {
        fileList.innerHTML = '';
        
        if (uploadedFiles.length === 0) {
            return;
        }
        
        uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileIcon = getFileIcon(file.type);
            
            fileItem.innerHTML = `
                <i class="${fileIcon}"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <i class="fas fa-times remove-file" data-index="${index}"></i>
            `;
            
            fileList.appendChild(fileItem);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                uploadedFiles.splice(index, 1);
                displayFiles();
            });
        });
    }
    
    function getFileIcon(fileType) {
        if (fileType.includes('html')) return 'fas fa-code';
        if (fileType.includes('css')) return 'fas fa-palette';
        if (fileType.includes('javascript')) return 'fas fa-file-code';
        if (fileType.includes('image')) return 'fas fa-image';
        return 'fas fa-file';
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const siteName = document.getElementById('siteName').value.trim();
        
        if (!siteName) {
            showError('Nama web harus diisi');
            return;
        }
        
        if (uploadedFiles.length === 0) {
            showError('Pilih setidaknya satu file HTML untuk diunggah');
            return;
        }
        
        // Launch rocket animation
        launchRocket();
        
        // Show progress
        showProgress('Mempersiapkan file...');
        
        // Create FormData
        const formData = new FormData();
        formData.append('siteName', siteName);
        
        uploadedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            // Update progress
            updateProgress(25, 'Mengunggah file...');
            
            // Send request to backend
            const response = await fetch('/.netlify/functions/deploy', {
                method: 'POST',
                body: formData
            });
            
            updateProgress(75, 'Mendeploy ke Netlify...');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Terjadi kesalahan saat mendeploy');
            }
            
            const data = await response.json();
            
            updateProgress(100, 'Deploy berhasil!');
            
            // Show success message
            setTimeout(() => {
                hideProgress();
                showSuccess(data.url);
            }, 500);
            
        } catch (error) {
            console.error('Error:', error);
            hideProgress();
            showError(error.message || 'ada kesalahan di bagian backend, harap bersabar');
        }
    }
    
    function showProgress(text) {
        progressContainer.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        progressText.textContent = text;
        deployBtn.disabled = true;
    }
    
    function updateProgress(percent, text) {
        progressFill.style.width = `${percent}%`;
        progressText.textContent = text;
    }
    
    function hideProgress() {
        progressContainer.classList.add('hidden');
        deployBtn.disabled = false;
    }
    
    function showSuccess(url) {
        resultContainer.classList.remove('hidden');
        successMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        siteUrl.href = url;
        siteUrl.textContent = url;
    }
    
    function showError(message) {
        resultContainer.classList.remove('hidden');
        successMessage.classList.add('hidden');
        errorMessage.classList.remove('hidden');
        errorText.textContent = message;
    }
    
    // Create stars for night sky background
    function createStars() {
        const starsContainer = document.getElementById('stars');
        const starsCount = 200;
        
        for (let i = 0; i < starsCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random position
            const x = Math.floor(Math.random() * 100);
            const y = Math.floor(Math.random() * 100);
            
            // Random size
            const size = Math.random() * 3;
            
            // Random animation delay
            const delay = Math.random() * 4;
            
            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.animationDelay = `${delay}s`;
            
            starsContainer.appendChild(star);
        }
    }
    
    // Launch rocket animation
    function launchRocket() {
        rocketContainer.classList.remove('launch');
        void rocketContainer.offsetWidth; // Trigger reflow
        rocketContainer.classList.add('launch');
        
        // Reset animation after it completes
        setTimeout(() => {
            rocketContainer.classList.remove('launch');
        }, 3000);
    }
});