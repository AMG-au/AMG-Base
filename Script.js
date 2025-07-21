/* =========================================================
   Autopark Manager v2.1 – полный клиент-ский JS
   Работает без сервера: всё хранится в localStorage
   ========================================================= */

/* ---------- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---------- */
let cars = [];                 // база автомобилей
let history = [];              // глобальная история
let editingCarIndex = -1;      // индекс редактируемого авто
let quickSaleCarIndex = -1;    // индекс авто для «быстрой продажи»
let showArchivedHistory = false;

/* ---------- ИНИЦИАЛИЗАЦИЯ ---------- */
window.addEventListener('load', initialise);

function initialise() {
    loadFromLocalStorage();
    if (cars.length === 0) loadDemoData();
    updateAllDisplays();
    populateFilters();
    setDefaultDates();
    showNotification('Приложение готово', 'success');
}

/* ---------- LOCALSTORAGE ---------- */
function saveToLocalStorage() {
    try {
        localStorage.setItem(
            'autopark_data',
            JSON.stringify({
                cars,
                history,
                version: '2.1',
                saved: new Date().toISOString()
            })
        );
    } catch (e) { showNotification('Ошибка сохранения', 'error'); }
}
function loadFromLocalStorage() {
    try {
        const data = JSON.parse(localStorage.getItem('autopark_data') || '{}');
        cars    = (data.cars    || []).map(migrateCarData);
        history = (data.history || []);
    } catch (e) {
        cars = []; history = [];
    }
}

/* ---------- ДЕМО-ДАННЫЕ ---------- */
function loadDemoData() {
    cars = [{
        brand:'BMW',model:'320i',year:2018,mileage:85000,engineVolume:2.0,power:184,
        driveType:'Задний',transmission:'Автомат',vin:'WBAFR9100XDT11111',
        dateAdded:'2024-01-15',whoAdded:'Альберт',priceToHands:1200000,haggle:'Да',
        priceSalon:1450000,report:'https://example.com/report/bmw320i',
        paints:'Чёрный металлик',additionalInfo:'Сервисная книжка',
        dateSold:'2024-02-01',salePrice:1400000,howSold:'Кредит',whoSold:'Антон',
        margin:200000,status:'sold',
        history:[{date:'2024-02-01',action:'Продан',details:'1400000₽, Кредит'}]
    }];
    history =[{
        timestamp:new Date().toISOString(),
        action:'add',
        description:'Добавлен BMW 320i (WBAFR9100XDT11111)',
        archived:false
    }];
    saveToLocalStorage();
}

/* ---------- МИГРАЦИЯ СТАРЫХ ЗАПИСЕЙ ---------- */
function migrateCarData(c) {
    return {
        brand:c.brand||'', model:c.model||'', year:c.year||'', mileage:c.mileage||null,
        engineVolume:c.engineVolume||null, power:c.power||null, driveType:c.driveType||'',
        transmission:c.transmission||'', vin:c.vin||'', dateAdded:c.dateAdded||'',
        whoAdded:c.whoAdded||'', priceToHands:c.priceToHands||0, haggle:c.haggle||'',
        priceSalon:c.priceSalon||null, report:c.report||'', paints:c.paints||'',
        additionalInfo:c.additionalInfo||'', dateSold:c.dateSold||null,
        salePrice:c.salePrice||null, howSold:c.howSold||'', whoSold:c.whoSold||'',
        margin:c.margin!=null?c.margin:(c.salePrice?c.salePrice-c.priceToHands:null),
        status:c.status||'draft', history:c.history||[]
    };
}

/* ---------- УТИЛИТЫ ---------- */
const $ = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => ctx.querySelectorAll(s);

const fmtPrice = n => n==null?'':new Intl.NumberFormat('ru-RU',
    {style:'currency',currency:'RUB',minimumFractionDigits:0}).format(n);
const fmtNum   = n => n==null?'':new Intl.NumberFormat('ru-RU').format(n);
const fmtDate  = s => s?new Date(s).toLocaleDateString('ru-RU'):'';
const fmtDT    = s => new Date(s).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'});

function linkify(t){
    return t.replace(/(https?:\/\/[^\s]+)/g,'<a target="_blank" href="$1">$1</a>');
}

/* ---------- УВЕДОМЛЕНИЯ ---------- */
function showNotification(msg,type='success'){
    const n = $('#saveNotification');
    n.textContent = msg;
    n.className = `save-notification ${type}`;
    n.classList.remove('hidden');
    setTimeout(()=>n.classList.add('hidden'),3000);
}

/* ---------- ДАТЫ ПО УМОЛЧАНИЮ ДЛЯ АНАЛИТИКИ ---------- */
function setDefaultDates(){
    const d=new Date(), first=new Date(d.getFullYear(),d.getMonth(),1);
    $('#analyticsDateFrom').value = first.toISOString().split('T')[0];
    $('#analyticsDateTo').value   = d.toISOString().split('T')[0];
}

/* ======================================================
   ---------------------- DASHBOARD ---------------------
   ======================================================*/
function updateDashboard(){
    const forSale = cars.filter(c=>c.status==='available').length;
    const now=new Date(), first=new Date(now.getFullYear(),now.getMonth(),1);
    const soldMonth = cars.filter(c=>c.dateSold && new Date(c.dateSold)>=first);

    const group = key => soldMonth.filter(c=>c.howSold===key).length;
    const margins = soldMonth.map(c=>c.margin||0);
    const avg = margins.length?margins.reduce((a,b)=>a+b)/margins.length:0;
    const sum = margins.reduce((a,b)=>a+b,0);

    $('#totalCarsForSale').textContent = forSale;
    $('#soldThisMonth').textContent    = soldMonth.length;
    $('#soldCash').textContent         = group('Наличка');
    $('#soldCredit').textContent       = group('Кредит');
    $('#soldLeasing').textContent      = group('Лизинг');
    $('#soldOther').textContent        = group('Другое');
    $('#avgMargin').textContent        = fmtPrice(avg);
    $('#totalMargin').textContent      = fmtPrice(sum);
}

/* ======================================================
   -------------------- СПИСОК АВТО ---------------------
   ======================================================*/
function createCarCard(car,i){
    const info = [];
    const add=(n,v)=>v!=null&&v!==''?info.push(`<div class="car-info-item">${n}: <span>${v}</span></div>`):0;
    add('Марка',car.brand); add('Модель',car.model); add('Год',car.year);
    add('Пробег',car.mileage?fmtNum(car.mileage)+' км':'');
    add('Объём',car.engineVolume?car.engineVolume+' л':'');
    add('Мощность',car.power?car.power+' л.с.':'');
    add('Привод',car.driveType); add('КПП',car.transmission); add('VIN',car.vin);
    add('Дата пост.',fmtDate(car.dateAdded)); add('Кто поставил',car.whoAdded);
    add('На руки',fmtPrice(car.priceToHands)); add('Торг',car.haggle);
    add('Цена в салоне',fmtPrice(car.priceSalon));
    add('Дата продажи',fmtDate(car.dateSold)); add('Цена продажи',fmtPrice(car.salePrice));
    add('Как продалась',car.howSold); add('Кто продал',car.whoSold);
    if(car.margin!=null){
        info.push(`<div class="car-info-item">Маржа: <span class="${car.margin>=0?'margin-positive':'margin-negative'}">${fmtPrice(car.margin)}</span></div>`);
    }
    const statusTxt={available:'В продаже',warehouse:'На складе',draft:'Черновик',sold:'Продано'}[car.status]||'';

    return `
    <div class="car-card">
        <div class="car-header">
            <div class="car-title">${car.brand} ${car.model}</div>
            <div class="car-status ${'status-'+car.status}" onclick="toggleStatusDropdown(${i})">${statusTxt}</div>
            <div class="status-dropdown-menu" id="statusDropdown${i}">
                <div class="status-dropdown-item" onclick="changeStatus(${i},'available')">В продаже</div>
                <div class="status-dropdown-item" onclick="changeStatus(${i},'warehouse')">На складе</div>
                <div class="status-dropdown-item" onclick="changeStatus(${i},'draft')">Черновик</div>
                <div class="status-dropdown-item" onclick="changeStatus(${i},'sold')">Продано</div>
            </div>
        </div>
        <div class="car-info">${info.join('')}</div>
        ${car.report?`<div class="car-description"><strong>Отчёт:</strong> ${linkify(car.report)}</div>`:''}
        ${car.paints?`<div class="car-description"><strong>Окрасы:</strong> ${car.paints}</div>`:''}
        ${car.additionalInfo?`<div class="car-description"><strong>Дополнительно:</strong> ${car.additionalInfo}</div>`:''}
        <div class="car-actions">
            <button class="btn btn-secondary btn-small" onclick="editCar(${i})">✏️ Редактировать</button>
            <button class="btn btn-history btn-small" onclick="showCarHistory(${i})">📋 История</button>
            <button class="btn btn-secondary btn-small" onclick="deleteCar(${i})" style="background:rgba(220,53,69,.2);color:#dc3545">🗑️ Удалить</button>
        </div>
    </div>`;
}
function displayCars(arr=cars){
    $('#carsList').innerHTML = arr.length?arr.map(createCarCard).join(''):'<div class="no-data"><h3>Ничего нет</h3></div>';
}

/* ---------- смена статуса ---------- */
function toggleStatusDropdown(i){
    const menu=$(`#statusDropdown${i}`);
    const opened=menu.classList.contains('active');
    $$('.status-dropdown-menu').forEach(m=>m.classList.remove('active'));
    if(!opened) menu.classList.add('active');
}
function changeStatus(i,newStatus){
    const car=cars[i], old=car.status;
    $(`#statusDropdown${i}`).classList.remove('active');
    if(newStatus==='sold' && old!=='sold'){
        quickSaleCarIndex=i;
        $('#quickSalePrice').value = car.priceSalon||car.priceToHands;
        $('#quickDateSold').value  = new Date().toISOString().split('T')[0];
        $('#quickSaleModal').classList.add('active');
        return;
    }
    if(old==='sold' && newStatus!=='sold'){ // сброс продажи
        Object.assign(car,{salePrice:null,dateSold:null,howSold:'',whoSold:'',margin:null});
    }
    car.status=newStatus;
    addHistoryRec(car,'Изменён статус',`с "${old}" на "${newStatus}"`);
    saveToLocalStorage(); updateAllDisplays();
}

/* ---------- быстрая продажа ---------- */
function completeQuickSale(e){
    e.preventDefault();
    const car=cars[quickSaleCarIndex];
    Object.assign(car,{
        status:'sold',
        salePrice:+$('#quickSalePrice').value,
        howSold:$('#quickHowSold').value,
        whoSold:$('#quickWhoSold').value,
        dateSold:$('#quickDateSold').value,
        margin:+$('#quickSalePrice').value-car.priceToHands
    });
    addHistoryRec(car,'Продан',fmtPrice(car.salePrice));
    closeQS(); saveToLocalStorage(); updateAllDisplays();
}
function closeQS(){
    $('#quickSaleModal').classList.remove('active');
    $('#quickSaleForm').reset(); quickSaleCarIndex=-1;
}

/* ======================================================
   ---------------------- ИСТОРИЯ ------------------------
   ======================================================*/
function addHistoryRec(car,act,det){
    const rec={timestamp:new Date().toISOString(),action:'status',
        description:`${car.brand} ${car.model} (${car.vin}) – ${act} ${det}`,archived:false};
    history.unshift(rec); if(history.length>1000)history.pop();
}

function displayHistory(){
    const list=$('#historyList');
    const arr=history.filter(h=>showArchivedHistory||!h.archived);
    list.innerHTML = arr.length?arr.map((h,idx)=>`
        <div class="history-item ${h.archived?'archived':''}">
            <button class="history-archive-btn" onclick="toggleArchive(${idx})">${h.archived?'📁':'🗃️'}</button>
            <div class="history-time">${fmtDT(h.timestamp)}</div>
            <div class="history-details">${h.description}</div>
        </div>
    `).join(''):'<div class="no-data"><h3>История пуста</h3></div>';
}
function toggleArchive(i){history[i].archived=!history[i].archived;displayHistory();saveToLocalStorage();}

/* ======================================================
   ----------------------- ФИЛЬТРЫ -----------------------
   ======================================================*/
function populateFilters(){
    const brands=[...new Set(cars.map(c=>c.brand))].sort();
    $('#brandFilter').innerHTML = '<option value="">Все марки</option>'+brands.map(b=>`<option>${b}</option>`).join('');
}
function filterCars(){
    const term=$('#searchInput').value.toLowerCase(),
          brand=$('#brandFilter').value,
          status=$('#statusFilter').value,
          who=$('#whoAddedFilter').value;
    const res=cars.filter(c=>{
        const search=term?(
            (c.brand+c.model+c.vin+(c.paints||'')).toLowerCase().includes(term)):true;
        return search &&
            (!brand||c.brand===brand)&&
            (!status||c.status===status)&&
            (!who||c.whoAdded===who);
    });
    displayCars(res);
}

/* ======================================================
   -------------- ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ -----------
   ======================================================*/
function clearForm(){ $('#carForm').reset(); editingCarIndex=-1; }
function showModal(){ $('#carModal').classList.add('active'); }
function closeModal(){ $('#carModal').classList.remove('active'); clearForm(); }

function showAddForm(){
    clearForm();
    $('#modalTitle').textContent='Добавить автомобиль';
    $('#dateAdded').value=new Date().toISOString().split('T')[0];
    showModal();
}
function editCar(i){
    editingCarIndex=i;
    const c=cars[i]; $('#modalTitle').textContent='Редактировать автомобиль';
    const fill=id=>$('#'+id).value=c[id]==null?'':c[id];
    ['brand','model','year','mileage','engineVolume','power','driveType','transmission',
     'vin','dateAdded','whoAdded','priceToHands','haggle','priceSalon','report','dateSold',
     'salePrice','howSold','whoSold','paints','additionalInfo'].forEach(fill);
    showModal();
}

$('#carForm').addEventListener('submit',saveCar);
function saveCar(e){
    e.preventDefault();
    const g=id=>$('#'+id).value.trim();
    const n=id=>{const v=g(id);return v?v*1:null;};
    const data={
        brand:g('brand'),model:g('model'),year:+g('year'),mileage:n('mileage'),
        engineVolume:n('engineVolume'),power:n('power'),driveType:g('driveType'),
        transmission:g('transmission'),vin:g('vin'),dateAdded:g('dateAdded'),
        whoAdded:g('whoAdded'),priceToHands:+g('priceToHands'),haggle:g('haggle'),
        priceSalon:n('priceSalon'),report:g('report'),paints:g('paints'),
        additionalInfo:g('additionalInfo'),dateSold:g('dateSold')||null,
        salePrice:n('salePrice'),howSold:g('howSold')||'',whoSold:g('whoSold')||'',
        status:'draft',margin:null,history:[]
    };
    if(data.salePrice){data.margin=data.salePrice-data.priceToHands;data.status='sold';}

    if(editingCarIndex===-1){
        if(cars.some(c=>c.vin===data.vin)){alert('Дублирующий VIN');return;}
        cars.push(data); addHistoryRec(data,'Добавлен','');
    }else{
        const car=cars[editingCarIndex];
        car.history.push({date:new Date().toISOString().split('T')[0],action:'Изм.данные',details:''});
        cars[editingCarIndex]=Object.assign(car,data);
        addHistoryRec(data,'Изменён','');
    }
    saveToLocalStorage(); closeModal(); updateAllDisplays(); populateFilters();
}

/* ---------- УДАЛЕНИЕ ---------- */
function deleteCar(i){
    if(!confirm('Удалить автомобиль?'))return;
    cars.splice(i,1); saveToLocalStorage(); updateAllDisplays(); populateFilters();
}

/* ======================================================
   ---------------------- АНАЛИТИКА ----------------------
   ======================================================*/
function updateAnalytics(){
    const from=$('#analyticsDateFrom').value,to=$('#analyticsDateTo').value;
    if(!from||!to)return;
    const added=cars.filter(c=>c.dateAdded>=from&&c.dateAdded<=to);
    const sold =cars.filter(c=>c.dateSold && c.dateSold>=from && c.dateSold<=to);
    const sum  =sold.reduce((s,c)=>s+(c.margin||0),0);

    $('#analyticsAdded').textContent=added.length;
    $('#analyticsSold').textContent =sold.length;
    $('#analyticsMargin').textContent=fmtPrice(sum);

    displayChart('salesMethodChart',groupCount(sold,'howSold'));
    displayChart('salesPersonChart',groupCount(sold,'whoSold'));
}
function groupCount(arr,key){
    const res={}; arr.forEach(o=>{const k=o[key]||'—';res[k]=(res[k]||0)+1;});return res;
}
function displayChart(id,obj){
    const cont=$('#'+id); if(!cont)return;
    if(!Object.keys(obj).length){cont.innerHTML='<div class="no-data">Нет данных</div>';return;}
    const max=Math.max(...Object.values(obj));
    cont.innerHTML = Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
        <div class="chart-bar">
            <div class="chart-label">${k}</div>
            <div class="chart-value-container">
                <div class="chart-value" style="width:${v/max*100}%"></div>
                <span class="chart-count">${v}</span>
            </div>
        </div>`).join('');
}

/* ======================================================
   -------------------- ИСТОРИЯ АВТО ---------------------
   ======================================================*/
function showCarHistory(i){
    const car=cars[i];
    $('#carHistoryTitle').textContent=`История: ${car.brand} ${car.model}`;
    $('#carHistoryContent').innerHTML = car.history.length?car.history.map(h=>`
        <div class="car-history-item">
            <div class="car-history-date">${fmtDate(h.date)}</div>
            <div class="car-history-action">${h.action}</div>
            <div class="car-history-details">${h.details}</div>
        </div>`).join(''):'<p class="no-data">Пусто</p>';
    $('#carHistoryModal').classList.add('active');
}
function closeCarHistoryModal(){ $('#carHistoryModal').classList.remove('active'); }

/* ======================================================
   ------------------- ОБЩИЕ СЛУШАТЕЛИ -------------------
   ======================================================*/
document.addEventListener('click',e=>{
    // закрытие дропдаунов статуса
    if(!e.target.closest('.car-status')) $$('.status-dropdown-menu').forEach(m=>m.classList.remove('active'));
    // закрытие модалок при клике на фон
    if(e.target.classList.contains('modal')) e.target.classList.remove('active');
});
document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
        $$('.modal.active').forEach(m=>m.classList.remove('active'));
        $$('.status-dropdown-menu').forEach(m=>m.classList.remove('active'));
    }
});

/* ======================================================
   ---------------- ПЕРЕКЛЮЧЕНИЕ СЕКЦИЙ ------------------
   ======================================================*/
function showSection(id){
    $$('.section').forEach(s=>s.classList.remove('active'));
    $('#'+id).classList.add('active');
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
    if(id==='dashboard')updateDashboard();
    if(id==='analytics')updateAnalytics();
    if(id==='history')displayHistory();
}
$$('.nav-btn').forEach(btn=>btn.onclick=()=>showSection(btn.dataset.target));

/* ======================================================
   --------------------- ГРУППОВЫЕ КНОПКИ ----------------
   ======================================================*/
$('#toggleArchivedBtn').onclick=()=>{
    showArchivedHistory=!showArchivedHistory;
    $('#toggleArchivedBtn').textContent = showArchivedHistory?'Скрыть архивные':'Показать архивные';
    displayHistory();
};
$('#historyDateFrom').onchange=displayHistory;
$('#historyDateTo').onchange=displayHistory;
$('#historyCarFilter').onchange=displayHistory;

/* ======================================================
   --------------- ПОИСК И ФИЛЬТРАЦИЯ --------------------
   ======================================================*/
$('#searchInput').oninput=filterCars;
$('#brandFilter').onchange=filterCars;
$('#statusFilter').onchange=filterCars;
$('#whoAddedFilter').onchange=filterCars;

/* ======================================================
   -------------------- QUICK SALE -----------------------
   ======================================================*/
$('#quickSaleForm').addEventListener('submit',completeQuickSale);
$('#quickSaleModal .close').onclick=closeQS;

/* ======================================================
   --------------- SAVE / EXPORT / IMPORT ---------------
   ======================================================*/
function forceSave(){saveToLocalStorage();showNotification('Сохранено','success');}
window.exportData   = ()=>{const blob=new Blob([JSON.stringify({cars,history},null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='autopark.json';
    a.click(); URL.revokeObjectURL(a.href); };
window.importData = e=>{
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=ev=>{
        try{const d=JSON.parse(ev.target.result); cars=d.cars||[];history=d.history||[];
            saveToLocalStorage();updateAllDisplays();populateFilters();
        }catch(e){alert('Неверный файл');}
    }; r.readAsText(f); e.target.value='';
};

/* ---------- ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ ---------- */
updateAllDisplays();         // на случай если загрузили данные позже
