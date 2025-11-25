const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const SpeedtestInstaller = require('./installer');
const ServiceManager = require('./service-manager');

let mainWindow;
let installer;
let serviceManager;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        titleBarStyle: 'default',
        show: false // Don't show until ready
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile('dist/index.html');
    }

    // Show window when ready
    mainWindow.once('ready-to-show', async () => {
        mainWindow.show();
        
        // Start backend services
        console.log('Starting backend services...');
        const serviceResult = await serviceManager.startAllServices();
        
        if (serviceResult.success) {
            console.log(`Backend services started. API running on port ${serviceResult.apiPort}`);
            
            // Send the API port to frontend
            mainWindow.webContents.send('api-config', {
                apiPort: serviceResult.apiPort,
                baseUrl: `http://localhost:${serviceResult.apiPort}/api`
            });
        } else {
            console.error('Failed to start backend services:', serviceResult.error);
            
            // Show error dialog
            await dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Backend Services Failed',
                message: 'Failed to start backend services',
                detail: `Error: ${serviceResult.error}\n\nThe application will run in view-only mode with limited functionality.`,
                buttons: ['OK']
            });
        }
        
        // Check if first run and show installer
        if (installer.isFirstRun) {
            const installed = await installer.showWelcomeDialog();
            if (!installed) {
                // Show warning about limited functionality
                await dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    title: 'Limited Functionality',
                    message: 'Running in view-only mode',
                    detail: 'Without the background service, you can only view existing data. No new speedtest data will be collected.\n\nYou can install services later from the Settings menu.',
                    buttons: ['OK']
                });
            }
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.webContents.send('navigate', '/settings');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Install Services...',
                    click: async () => {
                        if (installer.isServiceInstalled()) {
                            const result = await dialog.showMessageBox(mainWindow, {
                                type: 'question',
                                title: 'Services Already Installed',
                                message: 'Background services are already installed.',
                                detail: 'Would you like to reinstall them?',
                                buttons: ['Reinstall', 'Cancel'],
                                defaultId: 1
                            });
                            
                            if (result.response === 0) {
                                await installer.uninstall();
                                await installer.performInstallation();
                            }
                        } else {
                            await installer.showWelcomeDialog();
                        }
                    }
                },
                {
                    label: 'Uninstall Services...',
                    click: () => {
                        installer.uninstall();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => mainWindow.webContents.send('navigate', '/')
                },
                {
                    label: 'Analytics',
                    accelerator: 'CmdOrCtrl+2', 
                    click: () => mainWindow.webContents.send('navigate', '/analytics')
                },
                {
                    label: 'Live Test',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => mainWindow.webContents.send('navigate', '/live')
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow.reload()
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => mainWindow.webContents.toggleDevTools()
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Speedtest Monitor',
                            message: 'Speedtest Monitor v1.0.0',
                            detail: 'A desktop application for monitoring internet speed over time.\n\nBuilt with Electron and React.',
                            buttons: ['OK']
                        });
                    }
                },
                {
                    label: 'Check Service Status',
                    click: async () => {
                        const isRunning = await installer.checkServiceStatus();
                        dialog.showMessageBox(mainWindow, {
                            type: isRunning ? 'info' : 'warning',
                            title: 'Service Status',
                            message: isRunning ? 'Service is running' : 'Service is not running',
                            detail: isRunning 
                                ? 'Background data collection is active.'
                                : 'No speedtest data is being collected. Install services from File menu.',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
    installer = new SpeedtestInstaller();
    serviceManager = new ServiceManager();
    createMenu();
    createWindow();
    
    // Setup IPC handlers
    setupIpcHandlers();
});

app.on('window-all-closed', () => {
    // Stop services before closing
    if (serviceManager) {
        serviceManager.stopAllServices();
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Stop services before quit
    if (serviceManager) {
        serviceManager.stopAllServices();
    }
});

// Setup IPC handlers for frontend communication
function setupIpcHandlers() {
    // Get current API configuration
    ipcMain.handle('get-api-config', () => {
        if (serviceManager && serviceManager.isRunning()) {
            return {
                apiPort: serviceManager.getApiPort(),
                baseUrl: `http://localhost:${serviceManager.getApiPort()}/api`,
                available: true
            };
        }
        return {
            available: false,
            error: 'Backend services not running'
        };
    });
    
    // Get service status
    ipcMain.handle('get-service-status', () => {
        if (serviceManager) {
            return serviceManager.getStatus();
        }
        return {
            apiServer: { running: false },
            collector: { running: false }
        };
    });
    
    // Restart services
    ipcMain.handle('restart-services', async () => {
        if (serviceManager) {
            serviceManager.stopAllServices();
            const result = await serviceManager.startAllServices();
            
            if (result.success && mainWindow) {
                // Send updated config to frontend
                mainWindow.webContents.send('api-config', {
                    apiPort: result.apiPort,
                    baseUrl: `http://localhost:${result.apiPort}/api`
                });
            }
            
            return result;
        }
        return { success: false, error: 'Service manager not available' };
    });
}

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle app protocol for deep linking
app.setAsDefaultProtocolClient('speedtest-monitor');
