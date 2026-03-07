// PEREKUP 2077 — static data v3.0.5
export var comments = [
  "Не бита, не крашена, бабушка в церковь ездила","Масло не жрёт, просто любит","Пробег реальный, земля плоская",
  "Один хозяин, не считая пятерых","Двигатель шепчет","ДТП не было, забор сам выпрыгнул",
  "Расход 6л в мечтах","Коробка хрустит для музыки","Кондей был заправлен в 2008",
  "Зимой заводится с толкача","Тачка огонь, раз горела","Движок миллионник, осталось 999к",
  "Срочно — жена узнала","Пацан к пацану, зверь машина","Торг у капота, капот не открывать"
];

export var scamComments = [
  "Срочно улетаю, отдам за копейки","Торга нет, цена смешная уже","Документы у брата, завтра привезу",
  "Пробег 30к, дед не ездил вообще","Только предоплата, машина в другом городе"
];

export var legendaryComments = [
  "Коллекционный экземпляр, один из ста","Гаражное хранение 20 лет, как новая",
  "Дедушка был гонщиком, машина легенда","Полный сток, ни одной замены"
];

export var cars = [
  {id:"klassika-2107",n:"Классика 2107",e:"🚗",min:30000,max:80000},
  {id:"hetchbek-narodnyy",n:"Хэтчбек Народный",e:"🚙",min:50000,max:150000},
  {id:"sedan-ekonom",n:"Седан Эконом",e:"🚗",min:150000,max:400000},
  {id:"sedan-komfort",n:"Седан Комфорт",e:"🚙",min:400000,max:900000},
  {id:"taksi-sedan",n:"Такси-Седан",e:"🚕",min:300000,max:800000},
  {id:"gorodskoy-kompakt",n:"Городской Компакт",e:"🚗",min:350000,max:900000},
  {id:"biznes-sedan",n:"Бизнес-Седан",e:"🚘",min:500000,max:2000000},
  {id:"sportkupe",n:"Спорткупе",e:"🏎️",min:400000,max:2500000},
  {id:"premium-sedan",n:"Премиум-Седан",e:"🚘",min:600000,max:3500000},
  {id:"lyuks-krossover",n:"Люкс-Кроссовер",e:"🏎️",min:1500000,max:7000000},
  {id:"krossover",n:"Кроссовер",e:"🚙",min:800000,max:2500000}
];

export var names = ["Ашот","Рустам","Серёга","Дядя Вова","Гена","Армен","Борис","Саня","Тимур","Мага"];
export var scamNames = ["Артём777","Дмитрий_Авто","Срочно_Продам","ЧестныйПродавец"];
export var legendaryNames = ["Коллекционер Иван","Дед Михалыч","Гараж №7"];
export var avas = ["👨","🧔","👴","🧑","😎","🥸"];
export var scamAvas = ["🕵️","👤","🤖","👻"];
export var legendaryAvas = ["👑","🎩","🧐"];
export var locs = ["ВДНХ","Выхино","Марьино","Тушино","Химки","Бутово","Митино","Люблино","Строгино","Медведково"];

export var CAR_STORY_TAGS = {
  clean: [
    { key:'one_owner', label:'1 владелец', value:1.08, rep:1 },
    { key:'service_book', label:'Сервисная книга', value:1.10, rep:1 },
    { key:'garage_kept', label:'Гаражное хранение', value:1.12, rep:1 },
    { key:'dealer_service', label:'Обслуживание у дилера', value:1.09, rep:1 }
  ],
  risky: [
    { key:'taxi_past', label:'Бывшее такси', value:0.88, rep:-1 },
    { key:'flooded', label:'Утопленник', value:0.74, rep:-3 },
    { key:'rollback', label:'Скрученный пробег', value:0.82, rep:-2 },
    { key:'many_owners', label:'Много владельцев', value:0.90, rep:-1 },
    { key:'auction_import', label:'Аукционный импорт', value:0.86, rep:-1 }
  ],
  legendary: [
    { key:'cult_project', label:'Культовый проект', value:1.22, rep:2 },
    { key:'rare_trim', label:'Редкая комплектация', value:1.18, rep:1 },
    { key:'retro_capsule', label:'Капсула времени', value:1.25, rep:2 },
    { key:'corp_fleet', label:'Корпоративный спецлот', value:1.15, rep:1 }
  ]
};

export var BLACK_MARKET_PREFIX = ['Теневой', 'Нелегальный', 'Серый', 'Подпольный'];

// Расширенная система повреждений с визуализацией
// ВИДИМЫЕ повреждения (бесплатно) - то что видно глазами
export var VISIBLE_DAMAGE_PARTS = [
  // Кузов
  {key:'hood',name:'Капот',zone:'front',chance:0.22,icon:'🔲',repairCost:15000,desc:'Вмятина на капоте'},
  {key:'bumper_f',name:'Бампер передний',zone:'front',chance:0.28,icon:'▬',repairCost:8000,desc:'Трещина бампера'},
  {key:'bumper_r',name:'Бампер задний',zone:'rear',chance:0.25,icon:'▬',repairCost:8000,desc:'Царапина бампера'},
  {key:'fender_l',name:'Крыло левое',zone:'left',chance:0.20,icon:'◢',repairCost:12000,desc:'Вмятина на крыле'},
  {key:'fender_r',name:'Крыло правое',zone:'right',chance:0.20,icon:'◣',repairCost:12000,desc:'Помятое крыло'},
  {key:'door_fl',name:'Дверь передняя Л',zone:'left',chance:0.18,icon:'🚪',repairCost:18000,desc:'Царапина двери'},
  {key:'door_fr',name:'Дверь передняя П',zone:'right',chance:0.18,icon:'🚪',repairCost:18000,desc:'Вмятина двери'},
  {key:'door_rl',name:'Дверь задняя Л',zone:'left',chance:0.15,icon:'🚪',repairCost:16000,desc:'Скол на двери'},
  {key:'door_rr',name:'Дверь задняя П',zone:'right',chance:0.15,icon:'🚪',repairCost:16000,desc:'Ржавчина двери'},
  {key:'trunk',name:'Багажник',zone:'rear',chance:0.12,icon:'📦',repairCost:14000,desc:'Вмятина багажника'},
  {key:'roof',name:'Крыша',zone:'top',chance:0.08,icon:'⬜',repairCost:25000,desc:'Вмятина крыши'},
  // Стёкла
  {key:'windshield',name:'Лобовое стекло',zone:'front',chance:0.15,icon:'🪟',repairCost:12000,desc:'Трещина лобового'},
  {key:'glass_rear',name:'Заднее стекло',zone:'rear',chance:0.10,icon:'🪟',repairCost:8000,desc:'Скол заднего'},
  {key:'glass_l',name:'Стекло левое',zone:'left',chance:0.08,icon:'▫',repairCost:5000,desc:'Царапина стекла'},
  {key:'glass_r',name:'Стекло правое',zone:'right',chance:0.08,icon:'▫',repairCost:5000,desc:'Скол стекла'},
  // Оптика
  {key:'headlight_l',name:'Фара левая',zone:'front',chance:0.18,icon:'💡',repairCost:7000,desc:'Разбитая фара'},
  {key:'headlight_r',name:'Фара правая',zone:'front',chance:0.18,icon:'💡',repairCost:7000,desc:'Мутная фара'},
  {key:'taillight_l',name:'Фонарь левый',zone:'rear',chance:0.14,icon:'🔴',repairCost:4000,desc:'Треснутый фонарь'},
  {key:'taillight_r',name:'Фонарь правый',zone:'rear',chance:0.14,icon:'🔴',repairCost:4000,desc:'Разбитый фонарь'},
  {key:'mirror_l',name:'Зеркало левое',zone:'left',chance:0.12,icon:'🔳',repairCost:3000,desc:'Сломано зеркало'},
  {key:'mirror_r',name:'Зеркало правое',zone:'right',chance:0.12,icon:'🔳',repairCost:3000,desc:'Треснуто зеркало'},
  // Шины (видно)
  {key:'tires',name:'Шины',zone:'under',chance:0.22,icon:'⭕',repairCost:20000,desc:'Изношенные шины'}
];

// СКРЫТЫЕ повреждения (только после диагностики) - внутренние системы
export var HIDDEN_DAMAGE_PARTS = [
  // Двигатель
  {key:'engine_oil',name:'Утечка масла',zone:'engine',chance:0.15,icon:'🛢️',repairCost:8000,desc:'Подтёки масла двигателя'},
  {key:'engine_knock',name:'Стук двигателя',zone:'engine',chance:0.08,icon:'⚙️',repairCost:45000,desc:'Посторонний стук мотора'},
  {key:'engine_timing',name:'Цепь ГРМ',zone:'engine',chance:0.06,icon:'⛓️',repairCost:35000,desc:'Растянута цепь ГРМ'},
  {key:'engine_cooling',name:'Система охлаждения',zone:'engine',chance:0.12,icon:'🌡️',repairCost:18000,desc:'Течь антифриза'},
  // Топливная система
  {key:'fuel_pump',name:'Топливный насос',zone:'fuel',chance:0.10,icon:'⛽',repairCost:22000,desc:'Слабое давление топлива'},
  {key:'fuel_injectors',name:'Форсунки',zone:'fuel',chance:0.12,icon:'💉',repairCost:28000,desc:'Забиты форсунки'},
  {key:'fuel_filter',name:'Топливный фильтр',zone:'fuel',chance:0.18,icon:'🔸',repairCost:5000,desc:'Засорён фильтр'},
  // Трансмиссия
  {key:'gearbox',name:'Коробка передач',zone:'trans',chance:0.07,icon:'🔄',repairCost:55000,desc:'Хруст при переключении'},
  {key:'clutch',name:'Сцепление',zone:'trans',chance:0.12,icon:'⚡',repairCost:25000,desc:'Пробуксовка сцепления'},
  // Подвеска
  {key:'shock_absorbers',name:'Амортизаторы',zone:'under',chance:0.15,icon:'📍',repairCost:28000,desc:'Пробиты амортизаторы'},
  {key:'bearings',name:'Ступичные подшипники',zone:'under',chance:0.12,icon:'🔩',repairCost:15000,desc:'Гул подшипников'},
  // Тормоза
  {key:'brake_discs',name:'Тормозные диски',zone:'brakes',chance:0.14,icon:'🛑',repairCost:18000,desc:'Биение дисков'},
  {key:'brake_pads',name:'Колодки',zone:'brakes',chance:0.20,icon:'▪️',repairCost:8000,desc:'Износ колодок'},
  // Электрика
  {key:'battery',name:'Аккумулятор',zone:'electr',chance:0.16,icon:'🔋',repairCost:12000,desc:'Слабый аккумулятор'},
  {key:'alternator',name:'Генератор',zone:'electr',chance:0.08,icon:'⚡',repairCost:18000,desc:'Не заряжает'},
  {key:'sensors',name:'Датчики',zone:'electr',chance:0.14,icon:'📡',repairCost:8000,desc:'Ошибки датчиков'},
  // Выхлоп
  {key:'exhaust_leak',name:'Выхлопная система',zone:'exhaust',chance:0.12,icon:'💨',repairCost:12000,desc:'Прогар глушителя'},
  {key:'catalyst',name:'Катализатор',zone:'exhaust',chance:0.06,icon:'🧱',repairCost:35000,desc:'Забит катализатор'}
];

// Совместимость со старым кодом
export var DAMAGE_PARTS = VISIBLE_DAMAGE_PARTS;

// Расширенные услуги
export var srvs = [
  // Базовые
  {id:"wash",n:"Мойка",d:"Чистка кузова",p:2000,i:"🧽",e:{c:3,vm:1.02},cat:'basic'},
  {id:"polish",n:"Полировка",d:"Блеск кузова",p:5000,i:"✨",e:{c:5,vm:1.04},cat:'basic'},
  {id:"oil",n:"Замена масла",d:"Свежее масло",p:5000,i:"🛢️",e:{c:8,vm:1.03,fixPart:'engine_oil'},cat:'basic'},
  {id:"filter",n:"Фильтры",d:"Воздушный+топливный",p:4000,i:"🌀",e:{c:4,vm:1.02,fixPart:'fuel_filter'},cat:'basic'},
  // Кузовной ремонт
  {id:"dent",n:"PDR вмятины",d:"Без покраски",p:8000,i:"🔨",e:{c:10,vm:1.05,fixZone:'any'},cat:'body'},
  {id:"paint_local",n:"Локальная покраска",d:"1 элемент",p:15000,i:"🎨",e:{c:15,vm:1.08,fixZone:'any'},cat:'body'},
  {id:"paint_full",n:"Полная покраска",d:"Весь кузов",p:80000,i:"🖌️",e:{c:35,vm:1.20,fixAll:true},cat:'body'},
  {id:"rust",n:"Антикор",d:"Обработка днища",p:12000,i:"🛡️",e:{c:12,vm:1.06},cat:'body'},
  // Механика — Двигатель
  {id:"engine",n:"Капремонт двигателя",d:"Полная переборка",p:80000,i:"⚙️",e:{c:40,vm:1.18,fixPart:'engine_knock'},cat:'mech'},
  {id:"engine_timing",n:"Замена ГРМ",d:"Цепь/ремень ГРМ",p:35000,i:"⛓️",e:{c:20,vm:1.10,fixPart:'engine_timing'},cat:'mech'},
  {id:"cooling",n:"Система охлаждения",d:"Радиатор+помпа",p:18000,i:"🌡️",e:{c:12,vm:1.06,fixPart:'engine_cooling'},cat:'mech'},
  // Механика — Топливная система
  {id:"fuel_pump",n:"Топливный насос",d:"Замена насоса",p:22000,i:"⛽",e:{c:14,vm:1.08,fixPart:'fuel_pump'},cat:'mech'},
  {id:"injectors",n:"Чистка форсунок",d:"Ультразвук",p:15000,i:"💉",e:{c:10,vm:1.06,fixPart:'fuel_injectors'},cat:'mech'},
  // Механика — Трансмиссия
  {id:"transmission",n:"Ремонт КПП",d:"Коробка передач",p:55000,i:"🔄",e:{c:25,vm:1.12,fixPart:'gearbox'},cat:'mech'},
  {id:"clutch",n:"Замена сцепления",d:"Диск+корзина",p:25000,i:"⚡",e:{c:15,vm:1.08,fixPart:'clutch'},cat:'mech'},
  // Механика — Подвеска
  {id:"suspension",n:"Ремонт подвески",d:"Стойки+рычаги",p:25000,i:"🔧",e:{c:18,vm:1.08,fixPart:'suspension_arm'},cat:'mech'},
  {id:"shocks",n:"Замена амортизаторов",d:"4 шт",p:28000,i:"📍",e:{c:15,vm:1.07,fixPart:'shock_absorbers'},cat:'mech'},
  {id:"bearings",n:"Ступичные подшипники",d:"Замена",p:15000,i:"🔩",e:{c:10,vm:1.05,fixPart:'bearings'},cat:'mech'},
  // Механика — Тормоза
  {id:"brakes",n:"Ремонт тормозов",d:"Колодки+диски",p:18000,i:"🛑",e:{c:12,vm:1.06,fixPart:'brake_discs'},cat:'mech'},
  {id:"brake_pads",n:"Замена колодок",d:"Передние+задние",p:8000,i:"▪️",e:{c:6,vm:1.03,fixPart:'brake_pads'},cat:'mech'},
  {id:"brake_fluid",n:"Тормозная жидкость",d:"Замена",p:3000,i:"💧",e:{c:3,vm:1.01,fixPart:'brake_fluid'},cat:'mech'},
  // Механика — Электрика
  {id:"battery",n:"Новый аккумулятор",d:"AGM 70Ah",p:12000,i:"🔋",e:{c:5,vm:1.04,fixPart:'battery'},cat:'mech'},
  {id:"alternator",n:"Ремонт генератора",d:"Перемотка",p:18000,i:"⚡",e:{c:10,vm:1.06,fixPart:'alternator'},cat:'mech'},
  {id:"sensors",n:"Диагностика датчиков",d:"Сброс ошибок",p:8000,i:"📡",e:{c:5,vm:1.03,fixPart:'sensors'},cat:'mech'},
  // Механика — Выхлоп
  {id:"exhaust",n:"Ремонт выхлопа",d:"Глушитель",p:12000,i:"💨",e:{c:8,vm:1.04,fixPart:'exhaust_leak'},cat:'mech'},
  {id:"catalyst",n:"Замена катализатора",d:"Новый кат",p:35000,i:"🧱",e:{c:15,vm:1.10,fixPart:'catalyst'},cat:'mech'},
  {id:"tires",n:"Новые шины",d:"Комплект R16",p:20000,i:"⭕",e:{c:10,vm:1.05,fixPart:'tires'},cat:'mech'},
  // Стёкла и оптика
  {id:"windshield",n:"Замена лобового",d:"Новое стекло",p:12000,i:"🪟",e:{c:8,vm:1.04,fixPart:'windshield'},cat:'glass'},
  {id:"headlights",n:"Ремонт фар",d:"Полировка+замена",p:8000,i:"💡",e:{c:6,vm:1.03,fixZone:'front'},cat:'glass'},
  {id:"taillights",n:"Ремонт фонарей",d:"Задняя оптика",p:5000,i:"🔴",e:{c:4,vm:1.02,fixZone:'rear'},cat:'glass'},
  // Специальные
  {id:"diag",n:"Диагностика",d:"Комп. проверка",p:3000,i:"💻",e:{r:1,vm:1.02},cat:'special'},
  {id:"mileage",n:"Корректировка",d:"Пробег -50000км 🤫",p:15000,i:"📊",e:{m:-50000,vm:1.03},cat:'special'},
  {id:"detailing",n:"Детейлинг",d:"Полная химчистка",p:25000,i:"🧹",e:{c:15,vm:1.10},cat:'special'},
  {id:"tuning",n:"Чип-тюнинг",d:"+20% мощности",p:35000,i:"🚀",e:{c:5,vm:1.15},cat:'special'}
];

// Категории услуг
export var SERVICE_CATS = [
  {id:'basic',name:'Базовое',icon:'🧽'},
  {id:'body',name:'Кузов',icon:'🎨'},
  {id:'mech',name:'Механика',icon:'⚙️'},
  {id:'glass',name:'Стёкла',icon:'🪟'},
  {id:'special',name:'Особые',icon:'⭐'}
];

export var DAILY_EVENTS = [
  {id:'svc_sale',w:14,t:'🛠️ Скидка в сервисе',d:'Все услуги -20%',run:function(ctx){ctx.G.mods.srvDiscount=0.2;}},
  {id:'parts_sale',w:10,t:'📦 Дешёвые запчасти',d:'Ремонт кузова -30%',run:function(ctx){ctx.G.mods.bodyDiscount=0.3;}},
  {id:'taxi_boom',w:14,t:'🚕 Бум такси',d:'Такси платит +25%',run:function(ctx){ctx.G.mods.taxiMult=1.25;}},
  {id:'taxi_dead',w:8,t:'🚕 Такси в минусе',d:'Такси -20%',run:function(ctx){ctx.G.mods.taxiMult=0.8;}},
  {id:'market_hot',w:12,t:'🔥 Горячий рынок',d:'Цены +15%',run:function(ctx){ctx.G.mods.apMult=1.15;}},
  {id:'market_cool',w:12,t:'🥶 Холодный рынок',d:'Цены -10%',run:function(ctx){ctx.G.mods.apMult=0.9;}},
  {id:'buyer_rush',w:10,t:'💰 Наплыв покупателей',d:'Продажи +20%',run:function(ctx){ctx.G.mods.sellMult=1.2;}},
  {id:'inspection',w:8,t:'👮 Проверка ГИБДД',d:'Штраф за нарушения',run:function(ctx){var fine=ctx.rnd(2000,8000);ctx.G.m-=fine;ctx.toast('👮 Штраф '+ctx.fmt(fine)+'₽!','error');}},
  {id:'parking_up',w:8,t:'📈 Дорогие стоянки',d:'Расходы +40%',run:function(ctx){ctx.G.mods.upkeepMult=1.4;}},
  {id:'blogger',w:6,t:'📸 Блогер снял обзор',d:'Репутация ++',run:function(ctx){ctx.G.rep+=ctx.rnd(3,8);}},
  {id:'rain',w:10,t:'🌧️ Дождливый день',d:'Меньше клиентов',run:function(ctx){ctx.G.mods.taxiMult=0.7;ctx.G.mods.sellMult=0.85;}},
  {id:'sunny',w:10,t:'☀️ Солнечный день',d:'Все хотят тачки',run:function(ctx){ctx.G.mods.apMult=1.08;ctx.G.mods.sellMult=1.1;}}
];

export var TAXI_DAILY_LIMIT = 10;

// Дополнительные локации для такси
export var TAXI_ROUTES = [
  {from:"Центр",to:"Аэропорт",basePay:2500,distance:45},
  {from:"Вокзал",to:"Отель",basePay:800,distance:8},
  {from:"ТЦ Мега",to:"Жилой район",basePay:600,distance:12},
  {from:"Офис",to:"Ресторан",basePay:400,distance:5},
  {from:"Клуб",to:"Дом",basePay:1200,distance:20}
];
