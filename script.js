// Система управления автопарком v3.2 - полная версия со всеми функциями
'use strict';

// Глобальные переменные
let cars = [];
let history = [];
let editingCarIndex = -1;
let quickSaleCarIndex = -1;
let returnCarIndex = -1;
let detailCarIndex = -1;
let showArchivedHistory = false;
let expandedView = false;
let isOnline = false;
let hasUnsavedChanges = false;
let syncInterval;
let autoSyncEnabled = true;
let syncTimer = null;

// Настройки GitHub репозитория
const GITHUB_REPO_URL = window.location.hostname.includes('github.io') ? 
    `https://${window.location.hostname}/${window.location.pathname.split('/')[1]}/data.json` : 
    './data.json';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        updateConnectionStatus('syncing', '🔄 Загрузка данных...');
        
        // Пытаемся загрузить данные с GitHub
        const loaded = await loadFromGitHub();
        
        if (!loaded) {
            // Если не удалось загрузить с GitHub, загружаем локально
            loadFromLocalStorage();
            if (cars.length === 0) {
                loadDemoData();
                saveToLocalStorage();
            }
            updateConnectionStatus('offline', '📱 Локальные данные');
        } else {
            // Данные загружены с GitHub
            updateConnectionStatus('online', '🌐 Синхронизировано');
            saveToLocalStorage(); // Сохраняем локально как кэш
        }
        
        updateAllDisplays();
        populateFilters();
        setDefaultDates();
        initializeEventListeners();
        
        // Показываем секцию автомобилей по умолчанию
        showSection('cars');
        
        // Запускаем автоматическую синхронизацию
        startAutoSync();
        
        showNotification('Приложение загружено успешно', 'success');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        updateConnectionStatus('offline', '❌ Ошибка загрузки');
        showNotification('Ошибка загрузки приложения', 'error');
        
        // Fallback на локальные данные
        loadFromLocalStorage();
        if (cars.length === 0) {
            loadDemoData();
            saveToLocalStorage();
        }
        updateAllDisplays();
        populateFilters();
        setDefaultDates();
        initializeEventListeners();
        showSection('cars');
    }
}

// Загрузка данных с GitHub
async function loadFromGitHub() {
    try {
        const response = await fetch(GITHUB_REPO_URL + '?v=' + Date.now(), {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.cars && Array.isArray(data.cars)) {
            cars = data.cars.map(car => migrateCarData(car));
            history = data.history || [];
            isOnline = true;
            hasUnsavedChanges = false;
            hideSyncIndicator();
            console.log('Данные загружены с GitHub:', cars.length, 'автомобилей');
            return true;
        }
        
        throw new Error('Неверная структура данных');
    } catch (error) {
        console.error('Ошибка загрузки с GitHub:', error);
        isOnline = false;
        return false;
    }
}

// Обновление статуса подключения
function updateConnectionStatus(status, text) {
    const statusElement = document.getElementById('connectionStatus');
    const textElement = document.getElementById('connectionText');
    
    if (statusElement) {
        statusElement.className = `connection-status ${status}`;
    }
    
    if (textElement) {
        textElement.textContent = text;
    }
}

// Автоматическая синхронизация (фоновая)
function startAutoSync() {
    // Проверяем обновления каждые 2 минуты
    syncInterval = setInterval(async () => {
        await checkForUpdates();
    }, 120000); // 2 минуты
}

// Проверка обновлений
async function checkForUpdates() {
    try {
        const response = await fetch(GITHUB_REPO_URL + '?v=' + Date.now(), {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (response.ok) {
            const newData = await response.json();
            const newTimestamp = new Date(newData.lastSaved || 0);
            const currentTimestamp = new Date(localStorage.getItem('autopark_last_saved') || 0);
            
            // Если данные на GitHub новее наших
            if (newTimestamp > currentTimestamp) {
                if (hasUnsavedChanges) {
                    // Есть локальные изменения - спрашиваем пользователя
                    if (confirm('На сервере есть более новые данные, но у вас есть несохраненные изменения. Загрузить данные с сервера? (Ваши изменения будут потеряны)')) {
                        cars = newData.cars.map(car => migrateCarData(car));
                        history = newData.history || [];
                        hasUnsavedChanges = false;
                        saveToLocalStorage();
                        updateAllDisplays();
                        showNotification('Данные обновлены с сервера', 'success');
                        return true;
                    }
                } else {
                    // Нет локальных изменений - обновляем
                    cars = newData.cars.map(car => migrateCarData(car));
                    history = newData.history || [];
                    saveToLocalStorage();
                    updateAllDisplays();
                    showNotification('Данные обновлены с сервера', 'success');
                    return true;
                }
            }
            
            // Проверяем статус подключения
            if (!isOnline) {
                isOnline = true;
                if (!hasUnsavedChanges) {
                    updateConnectionStatus('online', '🌐 Синхронизировано');
                }
            }
            
            return false;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка проверки обновлений:', error);
        if (isOnline) {
            isOnline = false;
            updateConnectionStatus('offline', '📱 Автономный режим');
        }
        return false;
    }
}

// Функция показа индикатора
function showSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (indicator && autoSyncEnabled) {
        const status = indicator.querySelector('#syncStatus');
        if (status) {
            status.textContent = '🔄 Есть несохраненные изменения';
        }
        indicator.classList.remove('hidden');
    }
}

// Функция скрытия индикатора
function hideSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
    
    if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
    }
}

// Отметка изменений для синхронизации
function markDataAsChanged() {
    hasUnsavedChanges = true;
    saveToLocalStorage();
    
    // Показываем индикатор только если включена автосинхронизация
    if (autoSyncEnabled) {
        showSyncIndicator();
        // Запускаем таймер автосинхронизации через 10 секунд
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(autoSync, 10000);
    }
}

// Автоматическая синхронизация
async function autoSync() {
    if (!hasUnsavedChanges) {
        hideSyncIndicator();
        return;
    }
    
    updateConnectionStatus('syncing', '🔄 Автосинхронизация...');
    
    try {
        // Создаем файл data.json для обновления в репозитории
        await downloadDataJson();
        
        // Показываем уведомление о необходимости обновления
        showNotification('Создан файл data.json. Обновите его в GitHub репозитории.', 'warning');
        
        // Скрываем индикатор через 3 секунды
        setTimeout(() => {
            hideSyncIndicator();
            updateConnectionStatus('offline', '📁 Требуется обновление в GitHub');
        }, 3000);
        
    } catch (error) {
        console.error('Ошибка автосинхронизации:', error);
        setTimeout(() => {
            hideSyncIndicator();
            updateConnectionStatus('offline', '❌ Ошибка синхронизации');
        }, 3000);
    }
}

// Функция скачивания data.json
async function downloadDataJson() {
    try {
        const dataToSave = {
            cars: cars,
            history: history,
            lastSaved: new Date().toISOString(),
            version: '3.2',
            application: 'Autopark Management System'
        };
        
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Отмечаем что файл создан, но данные еще не синхронизированы
        localStorage.setItem('data_json_created', new Date().toISOString());
        
        showNotification('Файл data.json скачан. Загрузите его в корень GitHub репозитория.', 'success');
        addToHistory('sync', 'Создан файл data.json для синхронизации');
        
        return true;
    } catch (error) {
        console.error('Ошибка создания файла data.json:', error);
        showNotification('Ошибка создания файла синхронизации', 'error');
        return false;
    }
}

// Принудительная синхронизация
async function forceSync() {
    updateConnectionStatus('syncing', '🔄 Синхронизация...');
    showSyncIndicator();
    
    try {
        if (hasUnsavedChanges) {
            // Создаем и скачиваем файл data.json
            await downloadDataJson();
        }
        
        // Проверяем обновления с GitHub
        const updated = await checkForUpdates();
        
        if (updated) {
            updateConnectionStatus('online', '🌐 Обновлено с сервера');
            hasUnsavedChanges = false;
            hideSyncIndicator();
        } else {
            updateConnectionStatus('offline', '📁 Обновите data.json в GitHub');
            // Не скрываем индикатор, так как данные еще не синхронизированы
        }
        
    } catch (error) {
        console.error('Ошибка принудительной синхронизации:', error);
        updateConnectionStatus('offline', '❌ Ошибка синхронизации');
        showNotification('Ошибка синхронизации', 'error');
    }
}

// Управление автосинхронизацией
function toggleAutoSync() {
    autoSyncEnabled = !autoSyncEnabled;
    
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        const status = indicator.querySelector('#syncStatus');
        if (status) {
            status.textContent = autoSyncEnabled ? '🔄 Автосинхронизация включена' : '⏸️ Автосинхронизация отключена';
        }
    }
    
    if (!autoSyncEnabled) {
        hideSyncIndicator();
        if (syncTimer) {
            clearTimeout(syncTimer);
            syncTimer = null;
        }
    }
    
    showNotification(
        autoSyncEnabled ? 'Автосинхронизация включена' : 'Автосинхронизация отключена', 
        'success'
    );
}

// Демонстрационные данные
function loadDemoData() {
    cars = [{
        brand: 'BMW',
        model: '320i',
        year: 2018,
        color: 'Черный металлик',
        mileage: 85000,
        engineVolume: 2.0,
        power: 184,
        driveType: 'Задний',
        transmission: 'Автомат',
        vin: 'WBAFR9100XDT11111',
        dateAdded: '2024-07-01',
        whoAdded: 'Альберт',
        priceToHands: 1200000,
        haggle: 'Да',
        priceSalon: 1450000,
        report: 'Отличное состояние, один владелец. Сервисная книжка: https://example.com/service',
        dateSold: '2024-07-15',
        salePrice: 1400000,
        howSold: 'Кредит',
        whoSold: 'Антон',
        margin: 200000,
        paints: 'Черный металлик, глянцевое покрытие без сколов',
        additionalInfo: 'Полная комплектация, зимняя резина в комплекте',
        saleComment: 'Клиент доволен покупкой',
        creditBank: 'Сбербанк',
        creditOverprice: 'Да',
        creditDownPayment: 400000,
        creditAmount: 1000000,
        creditReward: 0.15,
        status: 'sold',
        history: [
            {date: '2024-07-01', action: 'Добавлен', details: 'Первоначальное добавление'},
            {date: '2024-07-15', action: 'Продан', details: 'Продан в кредит за 1,400,000₽'}
        ]
    }, {
        brand: 'Mercedes-Benz',
        model: 'C200',
        year: 2019,
        color: 'Серебристый',
        mileage: 65000,
        engineVolume: 1.5,
        power: 156,
        driveType: 'Задний',
        transmission: 'Автомат',
        vin: 'X9FB1110000000001',
        dateAdded: '2024-07-10',
        whoAdded: 'АМГ',
        priceToHands: 1500000,
        haggle: 'Нет',
        priceSalon: 1750000,
        report: 'Полная комплектация, сервисная книжка',
        dateSold: null,
        salePrice: null,
        howSold: null,
        whoSold: null,
        margin: null,
        paints: 'Серебристый металлик',
        additionalInfo: 'Гарантия до 2025 года',
        status: 'available',
        history: [
            {date: '2024-07-10', action: 'Добавлен', details: 'Первоначальное добавление'}
        ]
    }, {
        brand: 'Audi',
        model: 'A4',
        year: 2020,
        color: 'Белый',
        mileage: 45000,
        engineVolume: 2.0,
        power: 190,
        driveType: 'Полный',
        transmission: 'Робот',
        vin: 'JH6DA3340MS000001',
        dateAdded: '2024-07-05',
        whoAdded: 'Олег',
        priceToHands: 1800000,
        haggle: 'Да',
        priceSalon: 2100000,
        report: 'Как новый',
        dateSold: '2024-07-20',
        salePrice: 2050000,
        howSold: 'Наличка',
        whoSold: 'Никита',
        margin: 250000,
        paints: 'Белый перламутр',
        additionalInfo: 'Панорамная крыша, кожаный салон',
        saleComment: 'Быстрая сделка',
        status: 'sold',
        history: [
            {date: '2024-07-05', action: 'Добавлен', details: 'Первоначальное добавление'},
            {date: '2024-07-20', action: 'Продан', details: 'Продан за наличку за 2,050,000₽'}
        ]
    }];
    
    history = [
        {timestamp: new Date().toISOString(), action: 'init', description: 'Загружены демонстрационные данные', archived: false}
    ];
}

// Функции локального хранилища
function saveToLocalStorage() {
    try {
        const dataToSave = {
            cars: cars,
            history: history,
            lastSaved: new Date().toISOString(),
            version: '3.2'
        };
        localStorage.setItem('autopark_data', JSON.stringify(dataToSave));
        localStorage.setItem('autopark_last_saved', dataToSave.lastSaved);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения данных', 'error');
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('autopark_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            cars = (parsedData.cars || []).map(migrateCarData);
            history = parsedData.history || [];
            console.log('Данные загружены локально:', cars.length, 'автомобилей');
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        cars = [];
        history = [];
    }
}

// Миграция старых данных
function migrateCarData(car) {
    return {
        brand: car.brand || '',
        model: car.model || '',
        year: car.year || new Date().getFullYear(),
        color: car.color || '',
        mileage: car.mileage || null,
        engineVolume: car.engineVolume || null,
        power: car.power || null,
        driveType: car.driveType || '',
        transmission: car.transmission || '',
        vin: car.vin || '',
        dateAdded: car.dateAdded || new Date().toISOString().split('T')[0],
        whoAdded: car.whoAdded || '',
        priceToHands: car.priceToHands || 0,
        haggle: car.haggle || '',
        priceSalon: car.priceSalon || null,
        report: car.report || '',
        dateSold: car.dateSold || null,
        salePrice: car.salePrice || null,
        howSold: car.howSold || '',
        whoSold: car.whoSold || '',
        margin: car.margin !== null ? car.margin : (car.salePrice && car.priceToHands ? car.salePrice - car.priceToHands : null),
        paints: car.paints || '',
        additionalInfo: car.additionalInfo || '',
        saleComment: car.saleComment || '',
        creditBank: car.creditBank || '',
        creditOverprice: car.creditOverprice || '',
        creditDownPayment: car.creditDownPayment || null,
        creditAmount: car.creditAmount || null,
        creditReward: car.creditReward || null,
        returnDate: car.returnDate || null,
        returnReason: car.returnReason || '',
        returnComment: car.returnComment || '',
        status: car.status || 'draft',
        history: car.history || [],
        archived: car.archived || false
    };
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            showSection(target);
        });
    });

    // Поиск и фильтры
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterCars);
    }
    
    const filters = ['brandFilter', 'whoAddedFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', filterCars);
        }
    });

    // Чекбокс фильтры статусов
    document.querySelectorAll('.status-checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', filterCars);
    });

    // Селектор месяца для статистики
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector) {
        monthSelector.addEventListener('change', updateDashboard);
    }

    // Форма автомобиля
    const carForm = document.getElementById('carForm');
    if (carForm) {
        carForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCar(e);
        });
    }

    // Форма быстрой продажи
    const quickSaleForm = document.getElementById('quickSaleForm');
    if (quickSaleForm) {
        quickSaleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            completeQuickSale(e);
        });
    }

    // Форма возврата
    const returnForm = document.getElementById('returnForm');
    if (returnForm) {
        returnForm.addEventListener('submit', function(e) {
            e.preventDefault();
            completeReturn(e);
        });
    }

    // История
    const historyFilters = ['historyCarFilter', 'historyDateFrom', 'historyDateTo'];
    historyFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', displayHistory);
        }
    });

    // Импорт файлов
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', importData);
    }

    // Кнопка принудительной синхронизации в индикаторе
    const forceSyncBtn = document.getElementById('forceSyncBtn');
    if (forceSyncBtn) {
        forceSyncBtn.addEventListener('click', forceSync);
    }

    // Закрытие модальных окон при клике вне них
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
        
        // Закрытие дропдаунов статуса
        if (!e.target.closest('.car-status-dropdown')) {
            document.querySelectorAll('.status-dropdown-menu').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.querySelectorAll('.status-dropdown-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
}

// Навигация между секциями
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === sectionName) {
            btn.classList.add('active');
        }
    });
    
    switch(sectionName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'cars':
            displayCars();
            break;
        case 'history':
            displayHistory();
            break;
        case 'analytics':
            updateAnalytics();
            break;
    }
}

// Переключение вида отображения автомобилей (ИСПРАВЛЕНО)
function toggleViewMode() {
    expandedView = !expandedView;
    const btn = document.getElementById('viewToggleBtn');
    if (btn) {
        btn.textContent = expandedView ? '📋 Свернуть всё' : '📋 Развернуть всё';
    }
    
    // Применяем фильтры заново для корректного отображения
    filterCars();
}

// Обновление всех дисплеев
function updateAllDisplays() {
    updateDashboard();
    displayCars();
    displayHistory();
    updateAnalytics();
    populateFilters();
}

// Обновление панели управления с исправленной статистикой
function updateDashboard() {
    const totalCarsForSale = cars.filter(car => car.status === 'available').length;
    
    // Получаем выбранный месяц
    const monthSelector = document.getElementById('monthSelector');
    const selectedMonth = monthSelector ? monthSelector.value : 'current';
    
    let startDate, endDate;
    
    if (selectedMonth === 'current') {
        const currentDate = new Date();
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = currentDate;
    } else {
        const [year, month] = selectedMonth.split('-');
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDate = new Date(parseInt(year), parseInt(month), 0);
    }
    
    const soldInPeriod = cars.filter(car => {
        if (!car.dateSold) return false;
        const soldDate = new Date(car.dateSold);
        return soldDate >= startDate && soldDate <= endDate;
    });
    
    // Подсчитываем количества и суммы по способам продажи
    const cashCars = soldInPeriod.filter(car => car.howSold === 'Наличка');
    const creditCars = soldInPeriod.filter(car => car.howSold === 'Кредит');
    const leasingCars = soldInPeriod.filter(car => car.howSold === 'Лизинг');
    const otherCars = soldInPeriod.filter(car => car.howSold === 'Другое');
    
    const soldCashSum = cashCars.reduce((sum, car) => sum + (car.salePrice || 0), 0);
    const soldCreditSum = creditCars.reduce((sum, car) => sum + (car.salePrice || 0), 0);
    const soldLeasingSum = leasingCars.reduce((sum, car) => sum + (car.salePrice || 0), 0);
    const soldOtherSum = otherCars.reduce((sum, car) => sum + (car.salePrice || 0), 0);
    
    const totalSalesSum = soldCashSum + soldCreditSum + soldLeasingSum + soldOtherSum;
    
    // Обновляем основные показатели
    updateElementText('totalCarsForSale', totalCarsForSale);
    updateElementText('soldThisMonth', soldInPeriod.length);
    updateElementText('totalSalesSum', formatPrice(totalSalesSum));
    
    // Обновляем детали по количеству
    updateElementText('soldCashCount', `${cashCars.length} шт`);
    updateElementText('soldCreditCount', `${creditCars.length} шт`);
    updateElementText('soldLeasingCount', `${leasingCars.length} шт`);
    updateElementText('soldOtherCount', `${otherCars.length} шт`);
    
    // Обновляем детали по суммам
    updateElementText('soldCashSum', formatPrice(soldCashSum));
    updateElementText('soldCreditSum', formatPrice(soldCreditSum));
    updateElementText('soldLeasingSum', formatPrice(soldLeasingSum));
    updateElementText('soldOtherSum', formatPrice(soldOtherSum));
}

// Отображение списка автомобилей
function displayCars() {
    const carsList = document.getElementById('carsList');
    if (!carsList) return;
    
    if (cars.length === 0) {
        carsList.innerHTML = `
            <div class="no-data">
                <h3>Нет автомобилей в базе</h3>
                <p>Добавьте первый автомобиль, чтобы начать работу</p>
            </div>
        `;
        return;
    }
    
    carsList.innerHTML = cars.map((car, index) => createCarCard(car, index)).join('');
}

// Создание карточки автомобиля (ОБНОВЛЕНО)
function createCarCard(car, index) {
    // Обновленные поля для компактного отображения (включая год)
    const compactFields = [
        car.brand ? `Марка: <span>${car.brand}</span>` : null,
        car.model ? `Модель: <span>${car.model}</span>` : null,
        car.year ? `Год: <span>${car.year}</span>` : null,
        car.engineVolume ? `Объём: <span>${car.engineVolume} л</span>` : null,
        car.vin ? `VIN: <span>${car.vin}</span>` : null,
        car.priceSalon ? `Цена в салоне: <span>${formatPrice(car.priceSalon)}</span>` : null,
        car.salePrice ? `Цена продажи: <span>${formatPrice(car.salePrice)}</span>` : null
    ].filter(Boolean);

    const allFields = [];
    if (car.brand) allFields.push(`Марка: <span>${car.brand}</span>`);
    if (car.model) allFields.push(`Модель: <span>${car.model}</span>`);
    if (car.year) allFields.push(`Год: <span>${car.year}</span>`);
    if (car.color) allFields.push(`Цвет: <span>${car.color}</span>`);
    if (car.mileage) allFields.push(`Пробег: <span>${formatNumber(car.mileage)} км</span>`);
    if (car.engineVolume) allFields.push(`Объём: <span>${car.engineVolume} л</span>`);
    if (car.power) allFields.push(`Мощность: <span>${car.power} л.с.</span>`);
    if (car.driveType) allFields.push(`Привод: <span>${car.driveType}</span>`);
    if (car.transmission) allFields.push(`КПП: <span>${car.transmission}</span>`);
    if (car.vin) allFields.push(`VIN: <span>${car.vin}</span>`);
    if (car.dateAdded) allFields.push(`Дата постановки: <span>${formatDate(car.dateAdded)}</span>`);
    if (car.whoAdded) allFields.push(`Кто поставил: <span>${car.whoAdded}</span>`);
    if (car.haggle) allFields.push(`Торг: <span>${car.haggle}</span>`);
    if (car.priceSalon) allFields.push(`Цена в салоне: <span>${formatPrice(car.priceSalon)}</span>`);
    if (car.dateSold) allFields.push(`Дата продажи: <span>${formatDate(car.dateSold)}</span>`);
    if (car.salePrice) allFields.push(`Цена продажи: <span>${formatPrice(car.salePrice)}</span>`);
    if (car.howSold) allFields.push(`Как продалась: <span>${car.howSold}</span>`);
    if (car.whoSold) allFields.push(`Кто продал: <span>${car.whoSold}</span>`);
    if (car.returnDate) allFields.push(`Дата возврата: <span>${formatDate(car.returnDate)}</span>`);
    if (car.returnReason) allFields.push(`Причина возврата: <span>${car.returnReason}</span>`);

    const fields = expandedView ? allFields : compactFields;
    const infoHTML = fields.map(field => `<div class="car-info-item">${field}</div>`).join('');
    const cardClass = expandedView ? '' : 'compact';
    const infoClass = expandedView ? '' : 'compact';
    
    // Обновленный заголовок (марка, модель, год, КПП, объём)
    const title = `${car.brand} ${car.model} ${car.year} ${car.transmission} ${car.engineVolume ? car.engineVolume+'л' : ''}`.trim();
    
    return `
        <div class="car-card ${cardClass}">
            <div class="car-header">
                <div class="car-title" onclick="openDetail(${index})">${title}</div>
                <div class="car-status-dropdown">
                    <button class="car-status status-${car.status}" onclick="toggleStatusDropdown(${index})">
                        ${getStatusText(car.status)}
                    </button>
                    <div class="status-dropdown-menu" id="statusDropdown${index}">
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'available')">В продаже</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'warehouse')">На складе</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'draft')">Черновик</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'sold')">Продано</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'return')">Возврат</div>
                    </div>
                </div>
            </div>
            <div class="car-info ${infoClass}">
                ${infoHTML}
            </div>
            ${expandedView && car.report ? `<div class="car-description"><strong>Отчёт:</strong> ${convertLinksToClickable(car.report)}</div>` : ''}
            ${expandedView && car.paints ? `<div class="car-description"><strong>Окрасы:</strong> ${car.paints}</div>` : ''}
            ${expandedView && car.additionalInfo ? `<div class="car-description"><strong>Дополнительно:</strong> ${car.additionalInfo}</div>` : ''}
            ${expandedView && car.returnComment ? `<div class="car-description"><strong>Комментарий возврата:</strong> ${car.returnComment}</div>` : ''}
            <div class="car-actions">
                <button class="btn btn-secondary btn-small" onclick="editCar(${index})">
                    ✏️ Редактировать
                </button>
                <button class="btn btn-confidential btn-small" onclick="showConfidential(${index})">
                    🔐 Конфиденц.
                </button>
                <button class="btn btn-history btn-small" onclick="showCarHistory(${index})">
                    📋 История
                </button>
                <button class="btn btn-secondary btn-small" onclick="deleteCar(${index})" style="background: rgba(220, 53, 69, 0.2); color: #dc3545;">
                    🗑️ Удалить
                </button>
            </div>
        </div>
    `;
}

// Открытие детальной карточки автомобиля (НОВОЕ)
function openDetail(index) {
    const car = cars[index];
    if (!car) return;
    
    detailCarIndex = index;
    
    const title = document.getElementById('carDetailTitle');
    if (title) title.textContent = `${car.brand} ${car.model} ${car.year}`;
    
    const content = document.getElementById('carDetailContent');
    if (content) {
        const details = [
            ['Марка', car.brand],
            ['Модель', car.model],
            ['Год', car.year],
            ['Цвет', car.color],
            ['Пробег', car.mileage ? formatNumber(car.mileage) + ' км' : ''],
            ['Объём двигателя', car.engineVolume ? car.engineVolume + ' л' : ''],
            ['Мощность', car.power ? car.power + ' л.с.' : ''],
            ['Привод', car.driveType],
            ['КПП', car.transmission],
            ['VIN', car.vin],
            ['Дата постановки', car.dateAdded ? formatDate(car.dateAdded) : ''],
            ['Кто поставил', car.whoAdded],
            ['Торг', car.haggle],
            ['Цена в салоне', car.priceSalon ? formatPrice(car.priceSalon) : ''],
            ['Статус', getStatusText(car.status)],
            ['Дата продажи', car.dateSold ? formatDate(car.dateSold) : ''],
            ['Цена продажи', car.salePrice ? formatPrice(car.salePrice) : ''],
            ['Как продалась', car.howSold],
            ['Кто продал', car.whoSold],
            ['Дата возврата', car.returnDate ? formatDate(car.returnDate) : ''],
            ['Причина возврата', car.returnReason],
            ['Отчёт', car.report ? convertLinksToClickable(car.report) : ''],
            ['Окрасы', car.paints],
            ['Дополнительная информация', car.additionalInfo],
            ['Комментарий к продаже', car.saleComment],
            ['Комментарий к возврату', car.returnComment]
        ].filter(item => item[1]); // Убираем пустые значения
        
        content.innerHTML = details.map(([label, value]) => `
            <div class="confidential-item">
                <label>${label}:</label>
                <span>${value}</span>
            </div>
        `).join('');
    }
    
    showModal('carDetailModal');
}

function editCarFromDetail() {
    closeModal('carDetailModal');
    editCar(detailCarIndex);
}

function showConfidentialInfoFromDetail() {
    closeModal('carDetailModal');
    showConfidential(detailCarIndex);
}

// Показ конфиденциальной информации
function showConfidential(index) {
    const car = cars[index];
    if (!car) return;

    const title = document.getElementById('confidentialTitle');
    if (title) title.textContent = `Конфиденциальная информация: ${car.brand} ${car.model}`;

    // Заполняем основную информацию
    updateElementText('conf-priceToHands', formatPrice(car.priceToHands));
    updateElementText('conf-priceSalon', car.priceSalon ? formatPrice(car.priceSalon) : 'Не указано');
    updateElementText('conf-salePrice', car.salePrice ? formatPrice(car.salePrice) : 'Не продано');

    // Маржа с цветовым кодированием
    const marginElement = document.getElementById('conf-margin');
    if (marginElement) {
        if (car.margin !== null && car.margin !== undefined) {
            marginElement.textContent = formatPrice(car.margin);
            marginElement.className = `margin-value ${car.margin >= 0 ? 'positive' : 'negative'}`;
        } else {
            marginElement.textContent = 'Не рассчитана';
            marginElement.className = 'margin-value';
        }
    }

    // Комиссия (условно 5% от маржи)
    const commission = car.margin ? Math.round(car.margin * 0.05) : 0;
    updateElementText('conf-commission', formatPrice(commission));

    // Информация по кредиту
    const creditInfo = document.getElementById('conf-creditInfo');
    if (creditInfo) {
        if (car.howSold === 'Кредит' && (car.creditBank || car.creditAmount)) {
            creditInfo.style.display = 'block';
            updateElementText('conf-creditBank', car.creditBank || 'Не указан');
            updateElementText('conf-creditOverprice', car.creditOverprice || 'Не указано');
            updateElementText('conf-creditDownPayment', car.creditDownPayment ? formatPrice(car.creditDownPayment) : 'Не указан');
            updateElementText('conf-creditAmount', car.creditAmount ? formatPrice(car.creditAmount) : 'Не указана');
            updateElementText('conf-creditReward', car.creditReward ? car.creditReward : 'Не указан');
        } else {
            creditInfo.style.display = 'none';
        }
    }

    // Комментарий к продаже
    const saleCommentItem = document.getElementById('conf-saleCommentItem');
    if (saleCommentItem) {
        if (car.saleComment) {
            saleCommentItem.style.display = 'block';
            updateElementText('conf-saleComment', car.saleComment);
        } else {
            saleCommentItem.style.display = 'none';
        }
    }

    showModal('confidentialModal');
}

// Управление статусом автомобиля
function toggleStatusDropdown(index) {
    const dropdown = document.getElementById(`statusDropdown${index}`);
    if (!dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    document.querySelectorAll('.status-dropdown-menu').forEach(menu => {
        menu.classList.remove('active');
    });
    
    if (!isActive) {
        dropdown.classList.add('active');
    }
}

function changeCarStatus(index, newStatus) {
    const car = cars[index];
    if (!car) return;
    
    const oldStatus = car.status;
    
    const dropdown = document.getElementById(`statusDropdown${index}`);
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    
    if (newStatus === 'sold' && oldStatus !== 'sold') {
        quickSaleCarIndex = index;
        const quickSalePriceInput = document.getElementById('quickSalePrice');
        const quickDateSoldInput = document.getElementById('quickDateSold');
        if (quickSalePriceInput) quickSalePriceInput.value = car.priceSalon || car.priceToHands;
        if (quickDateSoldInput) quickDateSoldInput.value = new Date().toISOString().split('T')[0];
        showModal('quickSaleModal');
        return;
    }
    
    if (newStatus === 'return') {
        returnCarIndex = index;
        const returnDateInput = document.getElementById('returnDate');
        if (returnDateInput) returnDateInput.value = new Date().toISOString().split('T')[0];
        showModal('returnModal');
        return;
    }
    
    if (oldStatus === 'sold' && newStatus !== 'sold') {
        car.salePrice = null;
        car.dateSold = null;
        car.howSold = null;
        car.whoSold = null;
        car.margin = null;
        car.saleComment = '';
        car.creditBank = '';
        car.creditOverprice = '';
        car.creditDownPayment = null;
        car.creditAmount = null;
        car.creditReward = null;
    }
    
    car.status = newStatus;
    
    if (!car.history) car.history = [];
    car.history.push({
        date: new Date().toISOString().split('T')[0],
        action: 'Изменен статус',
        details: `Статус изменён с "${getStatusText(oldStatus)}" на "${getStatusText(newStatus)}"`
    });
    
    addToHistory('status', `Изменён статус автомобиля ${car.brand} ${car.model} (${car.vin}) на "${getStatusText(newStatus)}"`);
    
    markDataAsChanged();
    updateAllDisplays();
    showNotification(`Статус изменён на "${getStatusText(newStatus)}"`, 'success');
}

// Переключение полей кредита
function toggleCreditFields() {
    const howSold = document.getElementById('howSold');
    const creditFields = document.getElementById('creditFields');
    
    if (howSold && creditFields) {
        creditFields.style.display = howSold.value === 'Кредит' ? 'block' : 'none';
    }
}

function toggleQuickCreditFields() {
    const quickHowSold = document.getElementById('quickHowSold');
    const quickCreditFields = document.getElementById('quickCreditFields');
    
    if (quickHowSold && quickCreditFields) {
        quickCreditFields.style.display = quickHowSold.value === 'Кредит' ? 'block' : 'none';
    }
}

// Быстрая продажа
function completeQuickSale(event) {
    event.preventDefault();
    
    if (quickSaleCarIndex === -1) {
        showNotification('Ошибка: автомобиль не выбран', 'error');
        return;
    }
    
    const car = cars[quickSaleCarIndex];
    if (!car) return;
    
    const salePrice = parseInt(document.getElementById('quickSalePrice').value);
    const howSold = document.getElementById('quickHowSold').value;
    const whoSold = document.getElementById('quickWhoSold').value;
    const dateSold = document.getElementById('quickDateSold').value;
    const saleComment = document.getElementById('quickSaleComment').value;
    
    if (!salePrice || !howSold || !whoSold) {
        showNotification('Заполните все обязательные поля', 'warning');
        return;
    }
    
    car.status = 'sold';
    car.salePrice = salePrice;
    car.howSold = howSold;
    car.whoSold = whoSold;
    car.dateSold = dateSold || new Date().toISOString().split('T')[0];
    car.margin = salePrice - car.priceToHands;
    car.saleComment = saleComment;
    
    // Дополнительные поля для кредита
    if (howSold === 'Кредит') {
        car.creditBank = document.getElementById('quickCreditBank').value || '';
        car.creditOverprice = document.getElementById('quickCreditOverprice').value || '';
        car.creditDownPayment = document.getElementById('quickCreditDownPayment').value ? 
            parseInt(document.getElementById('quickCreditDownPayment').value) : null;
        car.creditAmount = document.getElementById('quickCreditAmount').value ? 
            parseInt(document.getElementById('quickCreditAmount').value) : null;
        car.creditReward = document.getElementById('quickCreditReward').value ? 
            parseFloat(document.getElementById('quickCreditReward').value) : null;
    }
    
    if (!car.history) car.history = [];
    car.history.push({
        date: car.dateSold,
        action: 'Продан',
        details: `Продан за ${formatPrice(salePrice)} (${howSold}, ${whoSold})`
    });
    
    addToHistory('sale', `Продан автомобиль ${car.brand} ${car.model} (${car.vin}) за ${formatPrice(salePrice)}`);
    
    closeModal('quickSaleModal');
    const quickSaleForm = document.getElementById('quickSaleForm');
    if (quickSaleForm) quickSaleForm.reset();
    quickSaleCarIndex = -1;
    
    markDataAsChanged();
    updateAllDisplays();
    showNotification('Автомобиль продан', 'success');
}

// Возврат автомобиля (НОВОЕ)
function completeReturn(event) {
    event.preventDefault();
    
    if (returnCarIndex === -1) {
        showNotification('Ошибка: автомобиль не выбран', 'error');
        return;
    }
    
    const car = cars[returnCarIndex];
    if (!car) return;
    
    const returnDate = document.getElementById('returnDate').value;
    const returnReason = document.getElementById('returnReason').value;
    const returnComment = document.getElementById('returnComment').value;
    
    if (!returnDate || !returnComment) {
        showNotification('Заполните обязательные поля', 'warning');
        return;
    }
    
    car.status = 'return';
    car.returnDate = returnDate;
    car.returnReason = returnReason;
    car.returnComment = returnComment;
    
    if (!car.history) car.history = [];
    car.history.push({
        date: returnDate,
        action: 'Возврат',
        details: `Причина: ${returnReason}. ${returnComment}`
    });
    
    addToHistory('return', `Возврат автомобиля ${car.brand} ${car.model} (${car.vin}). Причина: ${returnReason}`);
    
    closeModal('returnModal');
    const returnForm = document.getElementById('returnForm');
    if (returnForm) returnForm.reset();
    returnCarIndex = -1;
    
    markDataAsChanged();
    updateAllDisplays();
    showNotification('Возврат оформлен', 'success');
}

// Добавление и редактирование автомобилей
function showAddForm() {
    editingCarIndex = -1;
    const modalTitle = document.getElementById('modalTitle');
    const dateAddedInput = document.getElementById('dateAdded');
    
    if (modalTitle) modalTitle.textContent = 'Добавить автомобиль';
    if (dateAddedInput) dateAddedInput.value = new Date().toISOString().split('T')[0];
    
    clearForm();
    showModal('carModal');
}

function editCar(index) {
    editingCarIndex = index;
    const car = cars[index];
    if (!car) return;
    
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = 'Редактировать автомобиль';
    
    const fields = {
        'brand': car.brand || '',
        'model': car.model || '',
        'year': car.year || '',
        'color': car.color || '',
        'mileage': car.mileage || '',
        'engineVolume': car.engineVolume || '',
        'power': car.power || '',
        'driveType': car.driveType || '',
        'transmission': car.transmission || '',
        'vin': car.vin || '',
        'dateAdded': car.dateAdded || '',
        'whoAdded': car.whoAdded || '',
        'priceToHands': car.priceToHands || '',
        'haggle': car.haggle || '',
        'priceSalon': car.priceSalon || '',
        'report': car.report || '',
        'dateSold': car.dateSold || '',
        'salePrice': car.salePrice || '',
        'howSold': car.howSold || '',
        'whoSold': car.whoSold || '',
        'paints': car.paints || '',
        'additionalInfo': car.additionalInfo || '',
        'saleComment': car.saleComment || '',
        'creditBank': car.creditBank || '',
        'creditOverprice': car.creditOverprice || '',
        'creditDownPayment': car.creditDownPayment || '',
        'creditAmount': car.creditAmount || '',
        'creditReward': car.creditReward || ''
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) element.value = value;
    });
    
    // Показываем поля кредита если нужно
    toggleCreditFields();
    
    showModal('carModal');
}

function saveCar(event) {
    event.preventDefault();
    
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };
    
    const getNumberValue = (id) => {
        const value = getValue(id);
        return value ? parseFloat(value) : null;
    };
    
    const formData = {
        brand: getValue('brand'),
        model: getValue('model'),
        year: parseInt(getValue('year')) || new Date().getFullYear(),
        color: getValue('color'),
        mileage: getNumberValue('mileage'),
        engineVolume: getNumberValue('engineVolume'),
        power: getNumberValue('power'),
        driveType: getValue('driveType'),
        transmission: getValue('transmission'),
        vin: getValue('vin'),
        dateAdded: getValue('dateAdded'),
        whoAdded: getValue('whoAdded'),
        priceToHands: parseInt(getValue('priceToHands')) || 0,
        haggle: getValue('haggle'),
        priceSalon: getNumberValue('priceSalon'),
        report: getValue('report'),
        dateSold: getValue('dateSold') || null,
        salePrice: getNumberValue('salePrice'),
        howSold: getValue('howSold') || null,
        whoSold: getValue('whoSold') || null,
        paints: getValue('paints'),
        additionalInfo: getValue('additionalInfo'),
        saleComment: getValue('saleComment'),
        creditBank: getValue('creditBank'),
        creditOverprice: getValue('creditOverprice'),
        creditDownPayment: getNumberValue('creditDownPayment'),
        creditAmount: getNumberValue('creditAmount'),
        creditReward: getNumberValue('creditReward'),
        status: 'draft'
    };
    
    if (formData.salePrice && formData.priceToHands) {
        formData.margin = formData.salePrice - formData.priceToHands;
        formData.status = 'sold';
    } else {
        formData.margin = null;
    }
    
    if (!formData.brand || !formData.model || !formData.vin || !formData.dateAdded || !formData.whoAdded) {
        alert('Заполните все обязательные поля (отмечены звездочкой)');
        return;
    }
    
    if (editingCarIndex === -1) {
        if (cars.some(car => car.vin === formData.vin)) {
            alert('Автомобиль с таким VIN уже существует!');
            return;
        }
        formData.history = [{
            date: new Date().toISOString().split('T')[0],
            action: 'Добавлен',
            details: 'Первоначальное добавление'
        }];
    }
    
    const changeDescription = `${formData.brand} ${formData.model} (${formData.vin})`;
    
    if (editingCarIndex === -1) {
        cars.push(formData);
        addToHistory('add', `Добавлен автомобиль ${changeDescription}`);
        showNotification('Автомобиль добавлен', 'success');
    } else {
        const oldCar = cars[editingCarIndex];
        
        if (!oldCar.history) oldCar.history = [];
        oldCar.history.push({
            date: new Date().toISOString().split('T')[0],
            action: 'Отредактирован',
            details: 'Изменены данные автомобиля'
        });
        
        cars[editingCarIndex] = { ...formData, history: oldCar.history };
        addToHistory('edit', `Отредактирован автомобиль ${changeDescription}`);
        showNotification('Изменения сохранены', 'success');
    }
    
    markDataAsChanged();
    closeModal('carModal');
    updateAllDisplays();
}

function deleteCar(index) {
    const car = cars[index];
    if (!car) return;
    
    if (confirm(`Удалить автомобиль ${car.brand} ${car.model} (${car.vin})?`)) {
        cars.splice(index, 1);
        addToHistory('delete', `Удален автомобиль ${car.brand} ${car.model} (${car.vin})`);
        
        markDataAsChanged();
        updateAllDisplays();
        showNotification('Автомобиль удален', 'success');
    }
}

// История автомобиля
function showCarHistory(index) {
    const car = cars[index];
    if (!car) return;
    
    const title = document.getElementById('carHistoryTitle');
    const content = document.getElementById('carHistoryContent');
    
    if (title) title.textContent = `История: ${car.brand} ${car.model} (${car.vin})`;
    
    if (!car.history || car.history.length === 0) {
        if (content) content.innerHTML = '<div class="no-data"><p>История изменений пуста</p></div>';
    } else {
        if (content) {
            content.innerHTML = car.history
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(item => `
                    <div class="car-history-item">
                        <div class="car-history-date">${formatDate(item.date)}</div>
                        <div class="car-history-action">${item.action}</div>
                        <div class="car-history-details">${item.details}</div>
                    </div>
                `).join('');
        }
    }
    
    showModal('carHistoryModal');
}

// Поиск и фильтрация (ИСПРАВЛЕНО с чекбоксами)
function filterCars() {
    const searchTerm = getElementValue('searchInput').toLowerCase();
    const brandFilter = getElementValue('brandFilter');
    const whoAddedFilter = getElementValue('whoAddedFilter');
    
    // Получаем выбранные статусы из чекбоксов
    const selectedStatuses = [];
    document.querySelectorAll('.status-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
        selectedStatuses.push(checkbox.value);
    });
    
    const filteredCars = cars.filter(car => {
        const matchesSearch = !searchTerm || 
            car.brand.toLowerCase().includes(searchTerm) ||
            car.model.toLowerCase().includes(searchTerm) ||
            car.vin.toLowerCase().includes(searchTerm) ||
            (car.color && car.color.toLowerCase().includes(searchTerm)) ||
            (car.paints && car.paints.toLowerCase().includes(searchTerm));
            
        const matchesBrand = !brandFilter || car.brand === brandFilter;
        const matchesWhoAdded = !whoAddedFilter || car.whoAdded === whoAddedFilter;
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(car.status);
        
        return matchesSearch && matchesBrand && matchesWhoAdded && matchesStatus;
    });
    
    displayFilteredCars(filteredCars);
}

function displayFilteredCars(filteredCars) {
    const carsList = document.getElementById('carsList');
    if (!carsList) return;
    
    if (filteredCars.length === 0) {
        carsList.innerHTML = `
            <div class="no-data">
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить критерии поиска</p>
            </div>
        `;
        return;
    }
    
    carsList.innerHTML = filteredCars.map((car) => {
        const index = cars.findIndex(c => c.vin === car.vin);
        return createCarCard(car, index);
    }).join('');
}

function populateFilters() {
    const brands = [...new Set(cars.map(car => car.brand).filter(Boolean))].sort();
    const brandFilter = document.getElementById('brandFilter');
    if (brandFilter) {
        brandFilter.innerHTML = '<option value="">Все марки</option>' +
            brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
    }
    
    const historyCarFilter = document.getElementById('historyCarFilter');
    if (historyCarFilter) {
        historyCarFilter.innerHTML = '<option value="">Все автомобили</option>' +
            cars.map(car => `<option value="${car.vin}">${car.brand} ${car.model} (${car.vin})</option>`).join('');
    }
}

// История изменений
function addToHistory(action, description) {
    history.unshift({
        timestamp: new Date().toISOString(),
        action: action,
        description: description,
        archived: false
    });
    
    if (history.length > 1000) {
        history = history.slice(0, 1000);
    }
    
    markDataAsChanged();
}

function displayHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    const filteredHistory = getFilteredHistory();
    
    if (filteredHistory.length === 0) {
        historyList.innerHTML = `
            <div class="no-data">
                <h3>История пуста</h3>
                <p>Здесь будут отображаться все изменения в автопарке</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = filteredHistory.map((item) => {
        const originalIndex = history.indexOf(item);
        return `
            <div class="history-item ${item.archived ? 'archived' : ''}">
                <button class="history-archive-btn" onclick="toggleHistoryArchive(${originalIndex})">
                    ${item.archived ? '📁 Разархивировать' : '🗃️ Архивировать'}
                </button>
                <div class="history-time">${formatDateTime(item.timestamp)}</div>
                <div class="history-action">${getActionName(item.action)}</div>
                <div class="history-details">${item.description}</div>
            </div>
        `;
    }).join('');
}

function getFilteredHistory() {
    const carFilter = getElementValue('historyCarFilter');
    const dateFrom = getElementValue('historyDateFrom');
    const dateTo = getElementValue('historyDateTo');
    
    return history.filter(item => {
        if (!showArchivedHistory && item.archived) return false;
        
        if (carFilter && !item.description.includes(carFilter)) return false;
        
        const itemDate = item.timestamp.split('T')[0];
        if (dateFrom && itemDate < dateFrom) return false;
        if (dateTo && itemDate > dateTo) return false;
        
        return true;
    });
}

function toggleArchivedHistory() {
    showArchivedHistory = !showArchivedHistory;
    const btn = document.getElementById('toggleArchivedBtn');
    if (btn) {
        btn.textContent = showArchivedHistory ? 'Скрыть архивные' : 'Показать архивные';
    }
    displayHistory();
}

function toggleHistoryArchive(index) {
    if (history[index]) {
        history[index].archived = !history[index].archived;
        markDataAsChanged();
        displayHistory();
    }
}

// Аналитика
function updateAnalytics() {
    const dateFrom = getElementValue('analyticsDateFrom');
    const dateTo = getElementValue('analyticsDateTo');
    
    if (!dateFrom || !dateTo) {
        return;
    }
    
    const addedCars = cars.filter(car => {
        const carDate = car.dateAdded;
        return carDate >= dateFrom && carDate <= dateTo;
    });
    
    const soldCars = cars.filter(car => {
        const soldDate = car.dateSold;
        return soldDate && soldDate >= dateFrom && soldDate <= dateTo;
    });
    
    const totalMargin = soldCars.reduce((sum, car) => sum + (car.margin || 0), 0);
    
    updateElementText('analyticsAdded', addedCars.length);
    updateElementText('analyticsSold', soldCars.length);
    updateElementText('analyticsMargin', formatPrice(totalMargin));
    
    displaySalesMethodChart(soldCars);
    displaySalesPersonChart(soldCars);
}

function displaySalesMethodChart(soldCars) {
    const methodCounts = {};
    soldCars.forEach(car => {
        const method = car.howSold || 'Не указано';
        methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    
    displayChart('salesMethodChart', methodCounts);
}

function displaySalesPersonChart(soldCars) {
    const personCounts = {};
    soldCars.forEach(car => {
        const person = car.whoSold || 'Не указано';
        personCounts[person] = (personCounts[person] || 0) + 1;
    });
    
    displayChart('salesPersonChart', personCounts);
}

function displayChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const maxCount = Math.max(...Object.values(data), 1);
    
    if (Object.keys(data).length === 0) {
        container.innerHTML = '<div class="no-data"><p>Нет данных для отображения</p></div>';
        return;
    }
    
    container.innerHTML = Object.entries(data)
        .sort(([,a], [,b]) => b - a)
        .map(([label, count]) => `
            <div class="chart-bar">
                <div class="chart-label">${label}</div>
                <div class="chart-value-container">
                    <div class="chart-value" style="width: ${(count / maxCount) * 100}%"></div>
                    <span class="chart-count">${count}</span>
                </div>
            </div>
        `).join('');
}

// Модальные окна
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    
    if (modalId === 'carModal') {
        clearForm();
    }
    if (modalId === 'quickSaleModal') {
        const form = document.getElementById('quickSaleForm');
        if (form) form.reset();
        quickSaleCarIndex = -1;
    }
    if (modalId === 'returnModal') {
        const form = document.getElementById('returnForm');
        if (form) form.reset();
        returnCarIndex = -1;
    }
}

function clearForm() {
    const form = document.getElementById('carForm');
    if (form) form.reset();
    editingCarIndex = -1;
    
    // Скрываем поля кредита
    const creditFields = document.getElementById('creditFields');
    if (creditFields) creditFields.style.display = 'none';
}

// Экспорт и импорт с полной поддержкой Excel
function exportToExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            showNotification('Библиотека Excel не загружена', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();
        
        // Подготавливаем данные для экспорта
        const exportData = cars.map(car => ({
            'Марка': car.brand,
            'Модель': car.model,
            'Год': car.year,
            'Цвет': car.color || '',
            'Пробег': car.mileage || '',
            'Объём двигателя': car.engineVolume || '',
            'Мощность (л.с.)': car.power || '',
            'Привод': car.driveType || '',
            'КПП': car.transmission || '',
            'VIN': car.vin,
            'Дата постановки': car.dateAdded,
            'Кто поставил': car.whoAdded,
            'На руки (цена)': car.priceToHands,
            'Торг': car.haggle || '',
            'Цена в салоне': car.priceSalon || '',
            'Отчёт': car.report || '',
            'Дата продажи': car.dateSold || '',
            'Цена продажи': car.salePrice || '',
            'Как продалась': car.howSold || '',
            'Кто продал': car.whoSold || '',
            'Маржа': car.margin || '',
            'Окрасы': car.paints || '',
            'Дополнительная информация': car.additionalInfo || '',
            'Комментарий к продаже': car.saleComment || '',
            'Банк': car.creditBank || '',
            'С завышением': car.creditOverprice || '',
            'Первоначальный взнос': car.creditDownPayment || '',
            'Сумма кредита': car.creditAmount || '',
            'КВ': car.creditReward || '',
            'Дата возврата': car.returnDate || '',
            'Причина возврата': car.returnReason || '',
            'Комментарий возврата': car.returnComment || '',
            'Статус': getStatusText(car.status)
        }));
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Устанавливаем ширину колонок
        const colWidths = [
            {wch: 15}, {wch: 15}, {wch: 8}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 10},
            {wch: 12}, {wch: 20}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 8},
            {wch: 12}, {wch: 30}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, 
            {wch: 12}, {wch: 15}, {wch: 30}, {wch: 20}, {wch: 15}, {wch: 10}, 
            {wch: 15}, {wch: 15}, {wch: 8}, {wch: 12}, {wch: 15}, {wch: 20}, {wch: 12}
        ];
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'База автомобилей');
        
        const fileName = `autopark_database_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showNotification('База данных экспортирована в Excel', 'success');
        addToHistory('export', 'Выполнен экспорт базы данных в Excel');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showNotification('Ошибка экспорта в Excel', 'error');
    }
}

function exportReport() {
    try {
        if (typeof XLSX === 'undefined') {
            showNotification('Библиотека Excel не загружена', 'error');
            return;
        }

        const dateFrom = document.getElementById('analyticsDateFrom').value;
        const dateTo = document.getElementById('analyticsDateTo').value;
        
        if (!dateFrom || !dateTo) {
            showNotification('Выберите период для отчёта', 'warning');
            return;
        }
        
        const wb = XLSX.utils.book_new();
        
        // Фильтруем данные по периоду
        const periodCars = cars.filter(car => {
            const carDate = car.dateAdded;
            return carDate >= dateFrom && carDate <= dateTo;
        });
        
        const soldInPeriod = cars.filter(car => {
            const soldDate = car.dateSold;
            return soldDate && soldDate >= dateFrom && soldDate <= dateTo;
        });
        
        // Лист 1: Общая статистика
        const summaryData = [
            ['Период отчёта', `${dateFrom} - ${dateTo}`],
            ['', ''],
            ['ПОСТАВЛЕНО АВТОМОБИЛЕЙ', ''],
            ['Всего поставлено', periodCars.length],
            ['По поставщикам:', ''],
            ...getGroupedData(periodCars, 'whoAdded').map(([key, count]) => [`  ${key}`, count]),
            ['', ''],
            ['ПРОДАНО АВТОМОБИЛЕЙ', ''],
            ['Всего продано', soldInPeriod.length],
            ['По способам продажи:', ''],
            ...getGroupedData(soldInPeriod, 'howSold').map(([key, count]) => [`  ${key}`, count]),
            ['По продавцам:', ''],
            ...getGroupedData(soldInPeriod, 'whoSold').map(([key, count]) => [`  ${key}`, count]),
            ['', ''],
            ['ФИНАНСОВЫЕ ПОКАЗАТЕЛИ', ''],
            ['Общая маржа', soldInPeriod.reduce((sum, car) => sum + (car.margin || 0), 0)],
            ['Средняя маржа', soldInPeriod.length > 0 ? Math.round(soldInPeriod.reduce((sum, car) => sum + (car.margin || 0), 0) / soldInPeriod.length) : 0],
            ['Общая сумма продаж', soldInPeriod.reduce((sum, car) => sum + (car.salePrice || 0), 0)]
        ];
        
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = [{wch: 30}, {wch: 15}];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Сводка');
        
        // Лист 2: Детализация по автомобилям
        const detailData = [...periodCars, ...soldInPeriod.filter(car => !periodCars.includes(car))]
            .map(car => ({
                'Марка': car.brand,
                'Модель': car.model,
                'Год': car.year,
                'VIN': car.vin,
                'Дата постановки': car.dateAdded,
                'Кто поставил': car.whoAdded,
                'На руки': car.priceToHands,
                'Цена в салоне': car.priceSalon || '',
                'Дата продажи': car.dateSold || '',
                'Цена продажи': car.salePrice || '',
                'Как продалась': car.howSold || '',
                'Кто продал': car.whoSold || '',
                'Маржа': car.margin || '',
                'Статус': getStatusText(car.status)
            }));
            
        const detailWs = XLSX.utils.json_to_sheet(detailData);
        detailWs['!cols'] = Array(14).fill({wch: 12});
        XLSX.utils.book_append_sheet(wb, detailWs, 'Детализация');
        
        const fileName = `autopark_report_${dateFrom}_${dateTo}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showNotification('Отчёт экспортирован в Excel', 'success');
        addToHistory('export', `Выполнен экспорт отчёта за период ${dateFrom} - ${dateTo}`);
    } catch (error) {
        console.error('Ошибка экспорта отчёта:', error);
        showNotification('Ошибка экспорта отчёта', 'error');
    }
}

function getGroupedData(data, field) {
    const grouped = {};
    data.forEach(item => {
        const value = item[field] || 'Не указано';
        grouped[value] = (grouped[value] || 0) + 1;
    });
    return Object.entries(grouped).sort(([,a], [,b]) => b - a);
}

function exportData() {
    try {
        const dataToExport = {
            cars: cars,
            history: history,
            exportDate: new Date().toISOString(),
            version: '3.2'
        };
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json'; // Название файла изменено на data.json
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Данные успешно экспортированы в data.json', 'success');
        addToHistory('export', 'Выполнен экспорт данных в data.json');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showNotification('Ошибка при экспорте данных', 'error');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.json')) {
        importJSON(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        importExcel(file);
    } else {
        showNotification('Поддерживаются только файлы JSON и Excel', 'error');
    }
    
    event.target.value = '';
}

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.cars || !Array.isArray(importedData.cars)) {
                throw new Error('Неверная структура файла');
            }
            
            if (confirm(`Импортировать данные? Текущие данные будут заменены.\n\nВ файле: ${importedData.cars.length} автомобилей\nТекущих: ${cars.length} автомобилей`)) {
                cars = importedData.cars.map(car => migrateCarData(car));
                history = importedData.history || [];
                
                markDataAsChanged();
                updateAllDisplays();
                
                showNotification(`Успешно импортированы данные: ${cars.length} автомобилей`, 'success');
                addToHistory('import', `Импортированы данные из JSON файла: ${cars.length} автомобилей`);
            }
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка при импорте данных. Проверьте формат файла.', 'error');
        }
    };
    
    reader.readAsText(file);
}

function importExcel(file) {
    if (typeof XLSX === 'undefined') {
        showNotification('Библиотека Excel не загружена', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showNotification('Файл Excel пуст или имеет неверную структуру', 'error');
                return;
            }
            
            if (confirm(`Импортировать ${jsonData.length} записей из Excel? Текущие данные будут заменены.`)) {
                const importedCars = jsonData.map(row => ({
                    brand: row['Марка'] || '',
                    model: row['Модель'] || '',
                    year: parseInt(row['Год']) || new Date().getFullYear(),
                    color: row['Цвет'] || '',
                    mileage: parseInt(row['Пробег']) || null,
                    engineVolume: parseFloat(row['Объём двигателя']) || null,
                    power: parseInt(row['Мощность (л.с.)']) || null,
                    driveType: row['Привод'] || '',
                    transmission: row['КПП'] || '',
                    vin: row['VIN'] || '',
                    dateAdded: row['Дата постановки'] || new Date().toISOString().split('T')[0],
                    whoAdded: row['Кто поставил'] || '',
                    priceToHands: parseInt(row['На руки (цена)']) || 0,
                    haggle: row['Торг'] || '',
                    priceSalon: parseInt(row['Цена в салоне']) || null,
                    report: row['Отчёт'] || '',
                    dateSold: row['Дата продажи'] || null,
                    salePrice: parseInt(row['Цена продажи']) || null,
                    howSold: row['Как продалась'] || '',
                    whoSold: row['Кто продал'] || '',
                    margin: parseInt(row['Маржа']) || null,
                    paints: row['Окрасы'] || '',
                    additionalInfo: row['Дополнительная информация'] || '',
                    saleComment: row['Комментарий к продаже'] || '',
                    creditBank: row['Банк'] || '',
                    creditOverprice: row['С завышением'] || '',
                    creditDownPayment: parseInt(row['Первоначальный взнос']) || null,
                    creditAmount: parseInt(row['Сумма кредита']) || null,
                    creditReward: parseFloat(row['КВ']) || null,
                    returnDate: row['Дата возврата'] || null,
                    returnReason: row['Причина возврата'] || '',
                    returnComment: row['Комментарий возврата'] || '',
                    status: row['Статус'] === 'Продано' ? 'sold' : 
                           (row['Статус'] === 'В продаже' ? 'available' : 
                           (row['Статус'] === 'Возврат' ? 'return' : 'draft')),
                    history: []
                }));
                
                cars = importedCars.map(car => migrateCarData(car));
                history = [{
                    timestamp: new Date().toISOString(),
                    action: 'import',
                    description: `Импортированы данные из Excel файла: ${cars.length} автомобилей`,
                    archived: false
                }];
                
                markDataAsChanged();
                updateAllDisplays();
                
                showNotification(`Успешно импортированы данные из Excel: ${cars.length} автомобилей`, 'success');
            }
        } catch (error) {
            console.error('Ошибка импорта Excel:', error);
            showNotification('Ошибка при импорте Excel файла. Проверьте формат.', 'error');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function forceSave() {
    if (saveToLocalStorage()) {
        showNotification('Данные принудительно сохранены', 'success');
        addToHistory('save', 'Выполнено принудительное сохранение данных');
    }
}

// Утилиты
function showNotification(message, type = 'success') {
    const notification = document.getElementById('saveNotification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `save-notification ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('hidden');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const analyticsDateFrom = document.getElementById('analyticsDateFrom');
    const analyticsDateTo = document.getElementById('analyticsDateTo');
    
    if (analyticsDateFrom) analyticsDateFrom.value = firstDayOfMonth.toISOString().split('T')[0];
    if (analyticsDateTo) analyticsDateTo.value = today.toISOString().split('T')[0];
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function formatNumber(number) {
    return new Intl.NumberFormat('ru-RU').format(number);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function convertLinksToClickable(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function getStatusText(status) {
    const statusTexts = {
        'available': 'В продаже',
        'warehouse': 'На складе',
        'draft': 'Черновик',
        'sold': 'Продано',
        'return': 'Возврат'
    };
    return statusTexts[status] || 'Неизвестно';
}

function getActionName(action) {
    const actionNames = {
        'add': '➕ Добавление',
        'edit': '✏️ Редактирование', 
        'delete': '🗑️ Удаление',
        'status': '🔄 Изменение статуса',
        'sale': '💰 Продажа',
        'return': '↩️ Возврат',
        'export': '📁 Экспорт данных',
        'import': '📂 Импорт данных',
        'save': '💾 Сохранение',
        'init': '🚀 Инициализация',
        'sync': '🔄 Синхронизация'
    };
    return actionNames[action] || '❓ Неизвестное действие';
}

function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}

function getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

// Глобальные функции для onclick обработчиков
window.showAddForm = showAddForm;
window.editCar = editCar;
window.deleteCar = deleteCar;
window.showCarHistory = showCarHistory;
window.showConfidential = showConfidential;
window.toggleStatusDropdown = toggleStatusDropdown;
window.changeCarStatus = changeCarStatus;
window.completeQuickSale = completeQuickSale;
window.completeReturn = completeReturn;
window.toggleCreditFields = toggleCreditFields;
window.toggleQuickCreditFields = toggleQuickCreditFields;
window.toggleViewMode = toggleViewMode;
window.toggleAutoSync = toggleAutoSync;
window.closeModal = closeModal;
window.toggleArchivedHistory = toggleArchivedHistory;
window.toggleHistoryArchive = toggleHistoryArchive;
window.updateAnalytics = updateAnalytics;
window.exportData = exportData;
window.exportToExcel = exportToExcel;
window.exportReport = exportReport;
window.forceSave = forceSave;
window.forceSync = forceSync;
window.openDetail = openDetail;
window.editCarFromDetail = editCarFromDetail;
window.showConfidentialInfoFromDetail = showConfidentialInfoFromDetail;
