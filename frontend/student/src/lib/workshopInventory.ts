export type StockItem = { id:string; name:string; arabic:string; category:string; quantity:number; location:string; condition:"New"|"Used"; purpose:"For Sale"|"For Use"; price?:number; detail:string; source?:"Student Resale"; inspection?:"Tested"|"Not tested"; resaleNote?:string };
export const workshopStock:StockItem[] = [
 {id:"uno",name:"Arduino Uno R3",arabic:"أردوينو أونو",category:"Control Boards",quantity:8,location:"A · Drawer 01",condition:"Used",purpose:"For Sale",price:25,detail:"Compatible board · USB-B"},
 {id:"esp32",name:"ESP32 Development Board",arabic:"لوحة تطوير",category:"Control Boards",quantity:3,location:"A · Drawer 02",condition:"New",purpose:"For Sale",price:35,detail:"38 pins · Micro-USB · CP2102"},
 {id:"ultrasonic",name:"HC-SR04 Ultrasonic Sensor",arabic:"حساس مسافة",category:"Sensors",quantity:2,location:"B · Drawer 03",condition:"New",purpose:"For Sale",price:9,detail:"5V · Trigger / Echo"},
 {id:"dht",name:"DHT11 Temperature Sensor",arabic:"حساس حرارة ورطوبة",category:"Sensors",quantity:12,location:"B · Drawer 01",condition:"New",purpose:"For Sale",price:7,detail:"Temperature & humidity module"},
 {id:"servo",name:"SG90 Micro Servo",arabic:"محرك سيرفو",category:"Motors & Actuators",quantity:0,location:"C · Drawer 02",condition:"Used",purpose:"For Sale",price:8,detail:"Micro servo · 180° variant"},
 {id:"driver",name:"L298N Motor Driver",arabic:"مشغل محركات",category:"Power Drivers",quantity:6,location:"C · Drawer 04",condition:"Used",purpose:"For Sale",price:12,detail:"Dual H-bridge module"},
 {id:"buck",name:"XL4015 DC-DC Converter",arabic:"محول طاقة",category:"Power Drivers",quantity:4,location:"D · Drawer 02",condition:"New",purpose:"For Sale",price:20,detail:"Adjustable buck module · 5A class"},
 {id:"breadboard",name:"Solderless Breadboard",arabic:"لوحة تجارب",category:"Electronic Parts",quantity:15,location:"E · Shelf 01",condition:"Used",purpose:"For Use",detail:"830 tie points · workshop use only"},
 {id:"resistor",name:"220Ω Resistor",arabic:"مقاومة",category:"Electronic Parts",quantity:60,location:"E · Drawer 04",condition:"New",purpose:"For Sale",price:0.5,detail:"¼W · price per resistor"},
 {id:"meter",name:"Digital Multimeter",arabic:"ملتيميتر",category:"Tools",quantity:2,location:"Tool station",condition:"Used",purpose:"For Use",detail:"Return to the tool station after use"},
];
// Local presentation examples, not actual published student listings.
workshopStock.push(
 {id:"resale-uno",name:"Arduino Uno R3",arabic:"أردوينو من طالب سابق",category:"Control Boards",quantity:1,location:"Resale · Tray R01",condition:"Used",purpose:"For Sale",price:18,detail:"Compatible board · USB-B · board only",source:"Student Resale",inspection:"Tested",resaleNote:"Sample inspection: powers on and accepts a test sketch. Light marks on the board."},
 {id:"resale-servo",name:"SG90 Micro Servo",arabic:"سيرفو من طالب سابق",category:"Motors & Actuators",quantity:2,location:"Resale · Tray R02",condition:"Used",purpose:"For Sale",price:6,detail:"180° micro servo · includes one horn",source:"Student Resale",inspection:"Not tested",resaleNote:"Sample listing: from a previous prototype. Ask the assistant to check movement before purchase."},
 {id:"resale-driver",name:"L298N Motor Driver",arabic:"مشغل محركات من طالب سابق",category:"Power Drivers",quantity:1,location:"Resale · Tray R03",condition:"Used",purpose:"For Sale",price:8,detail:"Dual H-bridge · heatsink included",source:"Student Resale",inspection:"Tested",resaleNote:"Sample inspection: both channels tested. Screw terminals show light wear."}
);
export const stockStatus=(item:StockItem)=>item.quantity===0?"Out of Stock":item.quantity<=3?"Low Stock":"In Stock";
export type LocalStore={id:string;name:string;city:string;address:string;phone:string;website:string;note:string;initials:string;tone:string};
export const stores:LocalStore[]=[
 {id:"hit",name:"HIT.PS",city:"Beit Sahour",address:"Al-Iskan 9, Beit Sahour, Bethlehem, Palestine",phone:"+97022776677",website:"https://hit.ps/",note:"Visits by appointment · Mon–Thu, 9:00–17:00",initials:"HIT",tone:"blue"},
 {id:"technolab",name:"Technolab Electronics",city:"Nablus",address:"Near Jorf Super Market, An-Najah Street, Rafidia, Nablus, Palestine",phone:"+97092355329",website:"https://technolab.ps/",note:"Prices from the published catalog · Confirm the exact board variant.",initials:"TL",tone:"purple"},
 {id:"abuzahra",name:"Abu Zahra Electronic",city:"Nablus",address:"Schools Street, near Al-Aishiya Roundabout, Nablus, Palestine",phone:"+970598222289",website:"https://www.facebook.com/382725051757630",note:"Ask about student project components. Phone/address from a July 2026 post reproduced in a public directory; confirm before visiting.",initials:"AZ",tone:"rose"},
 {id:"ghanem",name:"Al-Ghanem Electronics",city:"Jenin",address:"Schools Street, Jenin, Palestine",phone:"+970599886976",website:"https://www.alghanemelc.com/contact",note:"Contact the store for prices and availability.",initials:"AG",tone:"purple"},
];
export type StoreOffer={offerId:string;id:string;storeId:string;name:string;price:number|null;url:string;note:string;availability:"Listed in stock"|"Out of Stock"|"Ask store";checked:string};
export const storeOffers:StoreOffer[]=[
 {offerId:"hit-esp32",id:"esp32",storeId:"hit",name:"ESP32 · 38-pin CP2102",price:47,url:"https://hit.ps/product/esp32-38pin-wifi-bluetooth-development-board-micro-usb-cp2102",note:"Micro-USB · CP2102 · condition not specified",availability:"Listed in stock",checked:"15 Oct 2026"},
 {offerId:"hit-buck",id:"buck",storeId:"hit",name:"XL4015 · 5A buck module",price:29,url:"https://hit.ps/product/xl4015-dc-dc-5a-buck-converter-4-38v-to-1-25-36v-adjustable-step-down-module",note:"Check module variant & included heatsink",availability:"Listed in stock",checked:"15 Oct 2026"},
 {offerId:"tl-esp32",id:"esp32",storeId:"technolab",name:"ESP32 WROOM-32 · 38-pin V3.1",price:38,url:"https://technolab.ps/",note:"SKU TL003849 · Narrow Micro-USB board, without cable · USB chip not confirmed",availability:"Out of Stock",checked:"16 Oct 2026"},
 {offerId:"tl-uno-16u2",id:"uno",storeId:"technolab",name:"Arduino Uno R3 · ATmega16U2",price:40,url:"https://technolab.ps/",note:"SKU TL000001 · ATmega328P / ATmega16U2 · without cable",availability:"Ask store",checked:"16 Oct 2026"},
 {offerId:"tl-uno-ch340",id:"uno",storeId:"technolab",name:"Arduino Uno SMD · CH340",price:28,url:"https://technolab.ps/",note:"SKU TL000198 · SMD / CH340 · without cable · different USB interface",availability:"Ask store",checked:"16 Oct 2026"},
 ...["uno","esp32","ultrasonic","servo","resistor","driver"].map(id=>({offerId:`az-${id}`,id,storeId:"abuzahra",name:workshopStock.find(item=>item.id===id)!.name,price:null,url:"https://www.yasteq.com/PS/Nablus/382725051757630/ابوزهرة-الكترونيك",note:"Advertises this component family; exact model, condition and stock require confirmation.",availability:"Ask store" as const,checked:"16 Oct 2026"})),
];
export const storeForOffer=(offer:StoreOffer)=>stores.find(store=>store.id===offer.storeId)!;
