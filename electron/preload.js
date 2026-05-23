const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Navigation
    navigate: (route) => ipcRenderer.send('navigate', route),
    
    // Service management
    installServices: () => ipcRenderer.invoke('install-services'),
    uninstallServices: () => ipcRenderer.invoke('uninstall-services'),
    checkServiceStatus: () => ipcRenderer.invoke('check-service-status'),
    getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
    restartServices: () => ipcRenderer.invoke('restart-services'),
    
    // API configuration
    getApiConfig: () => ipcRenderer.invoke('get-api-config'),
    
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    
    // File operations
    selectFile: () => ipcRenderer.invoke('select-file'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    
    // System info
    getPlatform: () => process.platform,
    getArch: () => process.arch,
    
    // Event listeners
    onNavigate: (callback) => ipcRenderer.on('navigate', callback),
    onApiConfig: (callback) => ipcRenderer.on('api-config', callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
