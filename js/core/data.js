// PEREKUP 2077 — static data v4.0.2
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
  {id:"klassika-2107",n:"Классика 2107",e:"🚗",min:30000,max:80000,segment:'mass',liquidity:0.92,risk:0.18,maintenance:0.05,traits:['cheap','fragile','flip-fast']},
  {id:"hetchbek-narodnyy",n:"Хэтчбек Народный",e:"🚙",min:50000,max:150000,segment:'mass',liquidity:0.95,risk:0.16,maintenance:0.04,traits:['city','cheap-service','mass-market']},
  {id:"sedan-ekonom",n:"Седан Эконом",e:"🚗",min:150000,max:400000,segment:'mass',liquidity:0.97,risk:0.14,maintenance:0.05,traits:['liquid','safe-margin','mass-market']},
  {id:"sedan-komfort",n:"Седан Комфорт",e:"🚙",min:400000,max:900000,segment:'comfort',liquidity:0.86,risk:0.19,maintenance:0.06,traits:['balanced','mainstream-plus']},
  {id:"taksi-sedan",n:"Такси-Седан",e:"🚕",min:300000,max:800000,segment:'mass',liquidity:0.89,risk:0.22,maintenance:0.07,traits:['high-mileage','workhorse','demand-spikes']},
  {id:"gorodskoy-kompakt",n:"Городской Компакт",e:"🚗",min:350000,max:900000,segment:'mass',liquidity:0.91,risk:0.15,maintenance:0.04,traits:['urban','fuel-efficient']},
  {id:"biznes-sedan",n:"Бизнес-Седан",e:"🚘",min:500000,max:2000000,segment:'business',liquidity:0.66,risk:0.28,maintenance:0.09,traits:['prestige','slow-turnover','high-margin']},
  {id:"sportkupe",n:"Спорткупе",e:"🏎️",min:400000,max:2500000,segment:'collector',liquidity:0.54,risk:0.34,maintenance:0.11,traits:['emotional-buy','high-risk','high-margin']},
  {id:"premium-sedan",n:"Премиум-Седан",e:"🚘",min:600000,max:3500000,segment:'premium',liquidity:0.48,risk:0.37,maintenance:0.12,traits:['elite','slow-burn','reputation-gated']},
  {id:"krossover",n:"Кроссовер",e:"🚙",min:1500000,max:7000000,segment:'business',liquidity:0.78,risk:0.21,maintenance:0.08,traits:['seasonal-demand','popular','strong-winter-sales']}
];

export var names = ["Ашот","Рустам","Серёга","Дядя Вова","Гена","Армен","Борис","Саня","Тимур","Мага"];
export var scamNames = ["Артём777","Дмитрий_Авто","Срочно_Продам","ЧестныйПродавец"];
export var legendaryNames = ["Коллекционер Иван","Дед Михалыч","Гараж №7"];
export var avas = ["👨","🧔","👴","🧑","😎","🥸"];
export var scamAvas = ["🕵️","👤","🤖","👻"];
export var legendaryAvas = ["👑","🎩","🧐"];
export var locs = ["ВДНХ","Выхино","Марьино","Тушино","Химки","Бутово","Митино","Люблино","Строгино","Медведково"];

// Расширенная система повреждений с визуализацией
export var DAMAGE_PARTS = [
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
  {key:'roof',name:'Крыша',zone:'top',chance:0.08,icon:'⬜',repairCost:25000,desc:'Вмятина крыши (град)'},
  // Стёкла
  {key:'windshield',name:'Лобовое стекло',zone:'front',chance:0.15,icon:'🪟',repairCost:12000,desc:'Трещина лобового'},
  {key:'glass_rear',name:'Заднее стекло',zone:'rear',chance:0.10,icon:'🪟',repairCost:8000,desc:'Скол заднего стекла'},
  {key:'glass_l',name:'Стекло левое',zone:'left',chance:0.08,icon:'▫',repairCost:5000,desc:'Царапина стекла'},
  {key:'glass_r',name:'Стекло правое',zone:'right',chance:0.08,icon:'▫',repairCost:5000,desc:'Скол стекла'},
  // Оптика
  {key:'headlight_l',name:'Фара левая',zone:'front',chance:0.18,icon:'💡',repairCost:7000,desc:'Разбитая фара'},
  {key:'headlight_r',name:'Фара правая',zone:'front',chance:0.18,icon:'💡',repairCost:7000,desc:'Мутная фара'},
  {key:'taillight_l',name:'Фонарь левый',zone:'rear',chance:0.14,icon:'🔴',repairCost:4000,desc:'Треснутый фонарь'},
  {key:'taillight_r',name:'Фонарь правый',zone:'rear',chance:0.14,icon:'🔴',repairCost:4000,desc:'Разбитый фонарь'},
  {key:'mirror_l',name:'Зеркало левое',zone:'left',chance:0.12,icon:'🔳',repairCost:3000,desc:'Сломано зеркало'},
  {key:'mirror_r',name:'Зеркало правое',zone:'right',chance:0.12,icon:'🔳',repairCost:3000,desc:'Треснуто зеркало'},
  // Механика (видно при осмотре)
  {key:'suspension',name:'Подвеска',zone:'under',chance:0.20,icon:'🔧',repairCost:25000,desc:'Стук подвески'},
  {key:'exhaust',name:'Выхлоп',zone:'under',chance:0.15,icon:'💨',repairCost:10000,desc:'Прогар выхлопа'},
  {key:'brakes',name:'Тормоза',zone:'under',chance:0.18,icon:'🛑',repairCost:15000,desc:'Скрип тормозов'},
  {key:'tires',name:'Шины',zone:'under',chance:0.22,icon:'⭕',repairCost:20000,desc:'Изношенные шины'}
];

// Расширенные услуги
export var srvs = [
  // Базовые
  {id:"wash",n:"Мойка",d:"Чистка кузова",p:2000,i:"🧽",e:{c:3,vm:1.02},cat:'basic'},
  {id:"polish",n:"Полировка",d:"Блеск кузова",p:5000,i:"✨",e:{c:5,vm:1.04},cat:'basic'},
  {id:"oil",n:"Замена масла",d:"Свежее масло",p:5000,i:"🛢️",e:{c:8,vm:1.03},cat:'basic'},
  {id:"filter",n:"Фильтры",d:"Воздушный+салон",p:3000,i:"🌀",e:{c:4,vm:1.02},cat:'basic'},
  {id:"battery",n:"Новый аккумулятор",d:"Холодный пуск без сюрпризов",p:7000,i:"🔋",e:{c:5,vm:1.03},cat:'basic'},
  {id:"alignment",n:"Развал-схождение",d:"Руль ровно, резину не ест",p:6000,i:"📐",e:{c:5,vm:1.03,fixPart:'tires'},cat:'basic'},
  {id:"fluids",n:"Техжидкости",d:"Антифриз, тормозная, ГУР",p:6500,i:"🧪",e:{c:6,vm:1.03},cat:'basic'},
  {id:"ozone",n:"Озонация салона",d:"Убирает запах и сырость",p:4500,i:"🌬️",e:{c:4,vm:1.03},cat:'basic'},

  // Кузовной ремонт
  {id:"dent",n:"PDR вмятины",d:"Без покраски",p:8000,i:"🔨",e:{c:10,vm:1.05,fixZone:'any'},cat:'body'},
  {id:"paint_local",n:"Локальная покраска",d:"1 элемент",p:15000,i:"🎨",e:{c:15,vm:1.08,fixZone:'any'},cat:'body'},
  {id:"paint_full",n:"Полная покраска",d:"Весь кузов",p:80000,i:"🖌️",e:{c:35,vm:1.20,fixAll:true},cat:'body'},
  {id:"rust",n:"Антикор",d:"Обработка днища",p:12000,i:"🛡️",e:{c:12,vm:1.06},cat:'body'},
  {id:"bumper_front",n:"Передний бампер",d:"Подгонка и окрас",p:11000,i:"🧱",e:{c:9,vm:1.05,fixPart:'bumper_f'},cat:'body'},
  {id:"bumper_rear",n:"Задний бампер",d:"Восстановление пластика",p:10500,i:"🧱",e:{c:8,vm:1.04,fixPart:'bumper_r'},cat:'body'},
  {id:"doorsmart",n:"Дверной SMART-ремонт",d:"Сколы и лёгкие вмятины",p:14500,i:"🚪",e:{c:12,vm:1.06,fixZone:'left'},cat:'body'},
  {id:"panel_right",n:"Правый борт",d:"Крыло + двери справа",p:16500,i:"🪛",e:{c:13,vm:1.07,fixZone:'right'},cat:'body'},
  {id:"roof_restore",n:"Крыша без града",d:"Выправление и полироль",p:18000,i:"⬜",e:{c:14,vm:1.06,fixPart:'roof'},cat:'body'},
  {id:"trunk_restore",n:"Багажник в линию",d:"Подгонка задней геометрии",p:14000,i:"📦",e:{c:10,vm:1.05,fixPart:'trunk'},cat:'body'},

  // Механика
  {id:"engine",n:"Ремонт двигателя",d:"Капремонт",p:80000,i:"⚙️",e:{c:40,vm:1.18},cat:'mech'},
  {id:"transmission",n:"Ремонт КПП",d:"Коробка передач",p:45000,i:"🔄",e:{c:25,vm:1.12},cat:'mech'},
  {id:"suspension",n:"Ремонт подвески",d:"Стойки+рычаги",p:25000,i:"🔧",e:{c:18,vm:1.08,fixPart:'suspension'},cat:'mech'},
  {id:"brakes",n:"Ремонт тормозов",d:"Колодки+диски",p:15000,i:"🛑",e:{c:12,vm:1.06,fixPart:'brakes'},cat:'mech'},
  {id:"exhaust",n:"Ремонт выхлопа",d:"Глушитель",p:10000,i:"💨",e:{c:8,vm:1.04,fixPart:'exhaust'},cat:'mech'},
  {id:"tires",n:"Новые шины",d:"Комплект R16",p:20000,i:"⭕",e:{c:10,vm:1.05,fixPart:'tires'},cat:'mech'},
  {id:"cooling",n:"Система охлаждения",d:"Радиатор + патрубки",p:17000,i:"❄️",e:{c:12,vm:1.05},cat:'mech'},
  {id:"starter",n:"Стартер/генератор",d:"Запуск без капризов",p:13000,i:"⚡",e:{c:10,vm:1.04},cat:'mech'},
  {id:"steering",n:"Рулевое управление",d:"Тяги и рейка",p:21000,i:"🛞",e:{c:14,vm:1.06},cat:'mech'},
  {id:"ac_service",n:"Кондиционер",d:"Комфорт в салоне",p:9000,i:"🧊",e:{c:6,vm:1.03},cat:'mech'},
  {id:"fuel_system",n:"Топливная система",d:"Форсунки и насос",p:19500,i:"⛽",e:{c:14,vm:1.06},cat:'mech'},
  {id:"timing",n:"ГРМ сервис",d:"Ремень/цепь под контроль",p:26000,i:"⏱️",e:{c:18,vm:1.07},cat:'mech'},

  // Стёкла и оптика
  {id:"windshield",n:"Замена лобового",d:"Новое стекло",p:12000,i:"🪟",e:{c:8,vm:1.04,fixPart:'windshield'},cat:'glass'},
  {id:"headlights",n:"Ремонт фар",d:"Полировка+замена",p:8000,i:"💡",e:{c:6,vm:1.03,fixZone:'front'},cat:'glass'},
  {id:"taillights",n:"Ремонт фонарей",d:"Задняя оптика",p:5000,i:"🔴",e:{c:4,vm:1.02,fixZone:'rear'},cat:'glass'},
  {id:"rear_glass",n:"Заднее стекло",d:"Без трещин и сколов",p:9000,i:"🪞",e:{c:6,vm:1.03,fixPart:'glass_rear'},cat:'glass'},
  {id:"side_glass",n:"Боковые стёкла",d:"Левая и правая сторона",p:8500,i:"▫️",e:{c:6,vm:1.03,fixPart:'glass_l'},cat:'glass'},
  {id:"mirrors",n:"Зеркала комплект",d:"Оба зеркала в сборе",p:6000,i:"🔳",e:{c:5,vm:1.03},cat:'glass'},
  {id:"optics_pack",n:"Пакет оптики",d:"Фары + фонари + мелочи",p:14000,i:"🔦",e:{c:10,vm:1.05,fixZone:'front'},cat:'glass'},

  // Специальные
  {id:"diag",n:"Диагностика",d:"Комп. проверка",p:3000,i:"💻",e:{r:1,vm:1.02},cat:'special'},
  {id:"mileage",n:"Корректировка",d:"Пробег -50000км 🤫",p:15000,i:"📊",e:{m:-50000,vm:1.03},cat:'special'},
  {id:"detailing",n:"Детейлинг",d:"Полная химчистка",p:25000,i:"🧹",e:{c:15,vm:1.10},cat:'special'},
  {id:"tuning",n:"Чип-тюнинг",d:"+20% мощности",p:35000,i:"🚀",e:{c:5,vm:1.15},cat:'special'},
  {id:"presale_pack",n:"Предпродажный пакет",d:"Фото, блеск, запах, мелочи",p:18000,i:"📸",e:{c:9,vm:1.08,fixZone:'any'},cat:'special'},
  {id:"vin_clean",n:"Юр. сопровождение",d:"Проверка истории и чистый отчёт",p:12000,i:"📑",e:{r:1,vm:1.04},cat:'special'},
  {id:"express_flip",n:"Express Flip",d:"Быстрый комплект для витрины",p:22000,i:"⚡",e:{c:10,vm:1.09},cat:'special'},
  {id:"premium_photo",n:"Premium listing",d:"Контент для дорогой продажи",p:14000,i:"🌆",e:{c:3,vm:1.07},cat:'special'}
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
