// Система управления автопарком v2.1 - оптимизировано для GitHub Pages
'use strict';

// Глобальные переменные
let cars = [];
let history = [];
let editingCarIndex = -1;
let quickSaleCarIndex = -1;
let showArchivedHistory = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    try {
        loadFromLocalStorage();
        if (cars.length === 0) {
            loadDemoData();
            saveToLocalStorage();
        }
        updateAllDisplays();
        populateFilters();
        setDefaultDates();
        initializeEventListeners();
        showNotification('Приложение загружено успешно', 'success');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

// Демонстрационные данные
function loadDemoData() {
    cars = [{
        brand: 'BMW',
        model: '320i',
        year: 2018,
        mileage: 85000,
        engineVolume: 2.0,
        power: 184,
        driveType: 'Задний',
        transmission: 'Автомат',
        vin: 'WBAFR9100XDT11111',
        dateAdded: '2024-01-15',
        whoAdded: 'Альберт',
        priceToHands: 1200000,
        haggle: 'Да',
        priceSalon: 1450000,
        report: 'Отличное состояние, один владелец. Сервисная книжка: https://example.com/service',
        dateSold: '2024-02-01',
        salePrice: 1400000,
        howSold: 'Кредит',
        whoSold: 'Антон',
        margin: 200000,
        paints: 'Черный металлик, глянцевое покрытие без сколов',
        additionalInfo: 'Полная комплектация, зимняя резина в комплекте',
        status: 'sold',
        history: [
            {date: '2024-01-15', action: 'Добавлен', details: 'Первоначальное добавление'},
            {date: '2024-02-01', action: 'Продан', details: 'Продан в кредит за 1,400,000₽'}
        ]
    }, {
        brand: 'Mercedes-Benz',
        model: 'C200',
        year: 2019,
        mileage: 65000,
        engineVolume: 1.5,
        power: 156,
        driveType: 'Задний',
        transmission: 'Автомат',
        vin: 'X9FB1110000000001',
        dateAdded: '2024-01-10',
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
            {date: '2024-01-10', action: 'Добавлен', details: 'Первоначальное добавление'}
        ]
    }, {
        brand: 'Audi',
        model: 'A4',
        year: 2020,
        mileage: 45000,
        engineVolume: 2.0,
        power: 190,
        driveType: 'Полный',
        transmission: 'Робот',
        vin: 'JH6DA3340MS000001',
        dateAdded: '2024-02-05',
        whoAdded: 'Олег',
        priceToHands: 1800000,
        haggle: 'Да',
        priceSalon: 2100000,
        report: 'Как новый',
        dateSold: null,
        salePrice: null,
        howSold: null,
        whoSold: null,
        margin: null,
        paints: 'Белый перламутр',
        additionalInfo: 'Панорамная крыша, кожаный салон',
        status: 'warehouse',
        history: [
            {date: '2024-02-05', action: 'Добавлен', details: 'Первоначальное добавление'}
        ]
    }];
    
    history = [
        {timestamp: new Date().toISOString(), action: 'add', description: 'Загружены демонстрационные данные', archived: false}
    ];
}

// Функции локального хранилища
function saveToLocalStorage() {
    try {
        const dataToSave = {
            cars: cars,
            history: history,
            lastSaved: new Date().toISOString(),
            version: '2.1'
        };
        localStorage.setItem('autopark_data', JSON.stringify(dataToSave));
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
    
    const filters = ['brandFilter', 'statusFilter', 'whoAddedFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', filterCars);
        }
    });

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

    // Закрытие модальных окон при клике вне них
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
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

// Обновление всех дисплеев
function updateAllDisplays() {
    updateDashboard();
    displayCars();
    displayHistory();
    updateAnalytics();
}

// Обновление панели управления
function updateDashboard() {
    const totalCarsForSale = cars.filter(car => car.status === 'available').length;
    
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const soldThisMonth = cars.filter(car => {
        if (!car.dateSold) return false;
        const soldDate = new Date(car.dateSold);
        return soldDate >= firstDayOfMonth && soldDate <= currentDate;
    });
    
    const soldCash = soldThisMonth.filter(car => car.howSold === 'Наличка').length;
    const soldCredit = soldThisMonth.filter(car => car.howSold === 'Кредит').length;
    const soldLeasing = soldThisMonth.filter(car => car.howSold === 'Лизинг').length;
    const soldOther = soldThisMonth.filter(car => car.howSold === 'Другое').length;
    
    const margins = soldThisMonth.map(car => car.margin || 0);
    const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    const totalMargin = margins.reduce((a, b) => a + b, 0);
    
    updateElementText('totalCarsForSale', totalCarsForSale);
    updateElementText('soldThisMonth', soldThisMonth.length);
    updateElementText('soldCash', soldCash);
    updateElementText('soldCredit', soldCredit);
    updateElementText('soldLeasing', soldLeasing);
    updateElementText('soldOther', soldOther);
    updateElementText('avgMargin', formatPrice(avgMargin));
    updateElementText('totalMargin', formatPrice(totalMargin));
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

function createCarCard(car, index) {
    const fields = [];
    
    if (car.brand) fields.push(`Марка: <span>${car.brand}</span>`);
    if (car.model) fields.push(`Модель: <span>${car.model}</span>`);
    if (car.year) fields.push(`Год: <span>${car.year}</span>`);
    if (car.mileage) fields.push(`Пробег: <span>${formatNumber(car.mileage)} км</span>`);
    if (car.engineVolume) fields.push(`Объём: <span>${car.engineVolume} л</span>`);
    if (car.power) fields.push(`Мощность: <span>${car.power} л.с.</span>`);
    if (car.driveType) fields.push(`Привод: <span>${car.driveType}</span>`);
    if (car.transmission) fields.push(`КПП: <span>${car.transmission}</span>`);
    if (car.vin) fields.push(`VIN: <span>${car.vin}</span>`);
    if (car.dateAdded) fields.push(`Дата постановки: <span>${formatDate(car.dateAdded)}</span>`);
    if (car.whoAdded) fields.push(`Кто поставил: <span>${car.whoAdded}</span>`);
    if (car.priceToHands) fields.push(`На руки: <span>${formatPrice(car.priceToHands)}</span>`);
    if (car.haggle) fields.push(`Торг: <span>${car.haggle}</span>`);
    if (car.priceSalon) fields.push(`Цена в салоне: <span>${formatPrice(car.priceSalon)}</span>`);
    if (car.dateSold) fields.push(`Дата продажи: <span>${formatDate(car.dateSold)}</span>`);
    if (car.salePrice) fields.push(`Цена продажи: <span>${formatPrice(car.salePrice)}</span>`);
    if (car.howSold) fields.push(`Как продалась: <span>${car.howSold}</span>`);
    if (car.whoSold) fields.push(`Кто продал: <span>${car.whoSold}</span>`);
    if (car.margin !== null && car.margin !== undefined) {
        const marginClass = car.margin >= 0 ? 'margin-positive' : 'margin-negative';
        fields.push(`Маржа: <span class="${marginClass}">${formatPrice(car.margin)}</span>`);
    }
    
    const infoHTML = fields.map(field => `<div class="car-info-item">${field}</div>`).join('');
    
    return `
        <div class="car-card">
            <div class="car-header">
                <div class="car-title">${car.brand} ${car.model}</div>
                <div class="car-status-dropdown">
                    <button class="car-status status-${car.status}" onclick="toggleStatusDropdown(${index})">
                        ${getStatusText(car.status)}
                    </button>
                    <div class="status-dropdown-menu" id="statusDropdown${index}">
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'available')">В продаже</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'warehouse')">На складе</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'draft')">Черновик</div>
                        <div class="status-dropdown-item" onclick="changeCarStatus(${index}, 'sold')">Продано</div>
                    </div>
                </div>
            </div>
            <div class="car-info">
                ${infoHTML}
            </div>
            ${car.report ? `<div class="car-description"><strong>Отчёт:</strong> ${convertLinksToClickable(car.report)}</div>` : ''}
            ${car.paints ? `<div class="car-description"><strong>Окрасы:</strong> ${car.paints}</div>` : ''}
            ${car.additionalInfo ? `<div class="car-description"><strong>Дополнительно:</strong> ${car.additionalInfo}</div>` : ''}
            <div class="car-actions">
                <button class="btn btn-secondary btn-small" onclick="editCar(${index})">
                    ✏️ Редактировать
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
    
    if (oldStatus === 'sold' && newStatus !== 'sold') {
        car.salePrice = null;
        car.dateSold = null;
        car.howSold = null;
        car.whoSold = null;
        car.margin = null;
    }
    
    car.status = newStatus;
    
    if (!car.history) car.history = [];
    car.history.push({
        date: new Date().toISOString().split('T')[0],
        action: 'Изменен статус',
        details: `Статус изменён с "${getStatusText(oldStatus)}" на "${getStatusText(newStatus)}"`
    });
    
    addToHistory('status', `Изменён статус автомобиля ${car.brand} ${car.model} (${car.vin}) на "${getStatusText(newStatus)}"`);
    
    saveToLocalStorage();
    updateAllDisplays();
    showNotification(`Статус изменён на "${getStatusText(newStatus)}"`, 'success');
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
    
    if (!salePrice || !howSold || !whoSold) {
        showNotification('Заполните все обязательные поля', 'warning');
        return;
    }
    
    car.status = 'sold';
    car.salePrice = salePrice;
    car.howSold = howSold;
    car.whoSold = whoSold;
    car.dateSold = dateSold;
    car.margin = salePrice - car.priceToHands;
    
    if (!car.history) car.history = [];
    car.history.push({
        date: dateSold,
        action: 'Продан',
        details: `Продан за ${formatPrice(salePrice)} (${howSold}, ${whoSold})`
    });
    
    addToHistory('status', `Продан автомобиль ${car.brand} ${car.model} (${car.vin}) за ${formatPrice(salePrice)}`);
    
    closeModal('quickSaleModal');
    saveToLocalStorage();
    updateAllDisplays();
    showNotification('Автомобиль продан', 'success');
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
        'additionalInfo': car.additionalInfo || ''
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) element.value = value;
    });
    
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
    
    saveToLocalStorage();
    closeModal('carModal');
    updateAllDisplays();
    populateFilters();
}

function deleteCar(index) {
    const car = cars[index];
    if (!car) return;
    
    if (confirm(`Удалить автомобиль ${car.brand} ${car.model} (${car.vin})?`)) {
        cars.splice(index, 1);
        addToHistory('delete', `Удален автомобиль ${car.brand} ${car.model} (${car.vin})`);
        
        saveToLocalStorage();
        updateAllDisplays();
        populateFilters();
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

// Поиск и фильтрация
function filterCars() {
    const searchTerm = getElementValue('searchInput').toLowerCase();
    const brandFilter = getElementValue('brandFilter');
    const statusFilter = getElementValue('statusFilter');
    const whoAddedFilter = getElementValue('whoAddedFilter');
    
    const filteredCars = cars.filter(car => {
        const matchesSearch = !searchTerm || 
            car.brand.toLowerCase().includes(searchTerm) ||
            car.model.toLowerCase().includes(searchTerm) ||
            car.vin.toLowerCase().includes(searchTerm) ||
            (car.paints && car.paints.toLowerCase().includes(searchTerm));
            
        const matchesBrand = !brandFilter || car.brand === brandFilter;
        const matchesStatus = !statusFilter || car.status === statusFilter;
        const matchesWhoAdded = !whoAddedFilter || car.whoAdded === whoAddedFilter;
        
        return matchesSearch && matchesBrand && matchesStatus && matchesWhoAdded;
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
        saveToLocalStorage();
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
    if (modalId === 'carModal') clearForm();
    if (modalId === 'quickSaleModal') {
        const form = document.getElementById('quickSaleForm');
        if (form) form.reset();
        quickSaleCarIndex = -1;
    }
}

function clearForm() {
    const form = document.getElementById('carForm');
    if (form) form.reset();
    editingCarIndex = -1;
}

// Экспорт и импорт
function exportData() {
    try {
        const dataToExport = {
            cars: cars,
            history: history,
            exportDate: new Date().toISOString(),
            version: '2.1'
        };
        
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `autopark_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Данные успешно экспортированы', 'success');
        addToHistory('export', 'Выполнен экспорт данных в JSON');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showNotification('Ошибка при экспорте данных', 'error');
    }
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
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
                
                saveToLocalStorage();
                updateAllDisplays();
                populateFilters();
                
                showNotification(`Успешно импортированы данные: ${cars.length} автомобилей`, 'success');
                addToHistory('import', `Импортированы данные из файла: ${cars.length} автомобилей`);
            }
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка при импорте данных. Проверьте формат файла.', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function forceSave() {
    if (saveToLocalStorage()) {
        showNotification('Данные принудительно сохранены', 'success');
        addToHistory('save', 'Выполнено принудительное сохранение данных');
    }
}

// Экспорт в Excel (упрощенная версия для GitHub Pages)
function exportToExcel() {
    try {
        showNotification('Экспорт в Excel недоступен в веб-версии. Используйте экспорт JSON.', 'warning');
    } catch (error) {
        console.error('Ошибка экспорта в Excel:', error);
        showNotification('Ошибка экспорта в Excel', 'error');
    }
}

function exportReport() {
    try {
        showNotification('Экспорт отчета недоступен в веб-версии. Используйте экспорт JSON.', 'warning');
    } catch (error) {
        console.error('Ошибка экспорта отчёта:', error);
        showNotification('Ошибка экспорта отчёта', 'error');
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
        'sold': 'Продано'
    };
    return statusTexts[status] || 'Неизвестно';
}

function getActionName(action) {
    const actionNames = {
        'add': '➕ Добавление',
        'edit': '✏️ Редактирование', 
        'delete': '🗑️ Удаление',
        'status': '🔄 Изменение статуса',
        'export': '📁 Экспорт данных',
        'import': '📂 Импорт данных',
        'save': '💾 Сохранение'
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
window.toggleStatusDropdown = toggleStatusDropdown;
window.changeCarStatus = changeCarStatus;
window.completeQuickSale = completeQuickSale;
window.closeModal = () => closeModal('carModal');
window.closeCarHistoryModal = () => closeModal('carHistoryModal');
window.closeQuickSaleModal = () => closeModal('quickSaleModal');
window.toggleArchivedHistory = toggleArchivedHistory;
window.toggleHistoryArchive = toggleHistoryArchive;
window.updateAnalytics = updateAnalytics;
window.exportData = exportData;
window.exportToExcel = exportToExcel;
window.exportReport = exportReport;
window.forceSave = forceSave;
