export type ComponentDocument = {
  title: string;
  publisher: string;
  url: string;
  format: "PDF" | "Web";
  scope: "Board" | "Sensor" | "Chip" | "Vendor variant" | "Related model";
  note: string;
};
const document = (title: string, publisher: string, url: string, format: ComponentDocument["format"], scope: ComponentDocument["scope"], note: string): ComponentDocument => ({ title, publisher, url, format, scope, note });
const comparator = document("LM393 comparator datasheet", "Texas Instruments", "https://www.ti.com/lit/ds/symlink/lm393.pdf", "PDF", "Chip", "مرجع للشريحة فقط، إذا كانت وحدتك تستخدم LM393. لا يحدد حساس الوحدة أو ترتيب أطراف البورد.");

// Primary-source documents researched on 2026-10-05. A chip document is never
// presented as a datasheet for an unidentified breakout board or generic part.
export const componentDocuments: Record<string, ComponentDocument[]> = {
  arduino_uno: [document("Arduino UNO R3 documentation", "Arduino", "https://docs.arduino.cc/hardware/uno-rev3/", "Web", "Board", "صفحة Arduino الأصلية، وفيها الداتا شيت ومخطط التوصيل. المرجع لنسخة UNO R3 الأصلية.")],
  arduino_nano: [document("Arduino Nano documentation", "Arduino", "https://docs.arduino.cc/hardware/nano/", "Web", "Board", "للـ Nano الكلاسيكي، وليس Nano Every أو Nano 33. تشمل الداتا شيت ومخطط البورد.")],
  esp32_devkit_v1: [document("ESP32-WROOM-32 datasheet", "Espressif", "https://documentation.espressif.com/esp32-wroom-32_datasheet_en.html", "Web", "Chip", "مرجع وحدة WROOM-32 داخل البورد؛ راجع اسم الوحدة المطبوع عليها. ليس مخطط DOIT DevKit V1 أو ترتيب أطرافه.")],
  esp8266_nodemcu: [document("NodeMCU DevKit V1.0 hardware", "NodeMCU", "https://github.com/nodemcu/nodemcu-devkit-v1.0", "Web", "Board", "ملفات التصميم الأصلية لـ DevKit V1.0. نسخ LoLin وAmica قد تختلف في المقاس وتوزيع الأطراف."), document("ESP8266EX datasheet", "Espressif", "https://documentation.espressif.com/0a-esp8266ex_datasheet_en.html", "Web", "Chip", "مواصفات شريحة ESP8266، وليست مدخل التغذية USB/VIN للبورد.")],
  raspberry_pi_4: [document("Raspberry Pi 4 Model B product brief", "Raspberry Pi", "https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-product-brief.pdf", "PDF", "Board", "ملخص المواصفات الرسمي لـ Raspberry Pi 4 Model B.")],
  hc_sr04: [document("HC-SR04 module datasheet", "ELECFREAKS", "https://www.elecfreaks.com/download/HC-SR04.pdf", "PDF", "Vendor variant", "مرجع وحدة HC-SR04 من ELECFREAKS؛ تحقق من نسخة وحدتك عند مقارنة المواصفات.")],
  dht11: [document("DHT11 product documentation", "Aosong / ASAIR", "https://www.aosong.com/en/Products/info.aspx?itemid=2257", "Web", "Sensor", "صفحة الشركة الأصلية مع خيار طلب الداتا شيت. مقاومة السحب وتغذية بورد الحساس تعتمد على الوحدة.")],
  dht22: [document("AM2302 / DHT22 sensor manual", "Aosong / ASAIR", "https://www.aosong.com/uploadfiles/2025/04/20250417105409216.pdf", "PDF", "Sensor", "دليل AM2302 من Aosong لعائلة DHT22. تحقق من تغليف الحساس وعدد أطراف نسختك.")],
  pir_hc_sr501: [document("SEN-HC-SR501 datasheet", "Joy-IT", "https://joy-it.net/files/files/Produkte/SEN-HC-SR501/SEN-HC-SR501-Datasheet-23.09.2020.pdf", "PDF", "Vendor variant", "داتا شيت نسخة Joy-IT من HC-SR501؛ مواضع الجمبر وضبط الحساسية قد تختلف بين الوحدات.")],
  lm35: [document("LM35 datasheet and documentation", "Texas Instruments", "https://www.ti.com/product/LM35", "Web", "Sensor", "الداتا شيت الأصلية؛ اختَر اللاحقة والتغليف المطابقين للحساس لمعرفة ترتيب الأطراف والدقة.")],
  mpu6050: [document("MPU-6000 / MPU-6050 product specification", "TDK / InvenSense", "https://product.tdk.com/system/files/dam/doc/product/sensor/mortion-inertial/imu/data_sheet/mpu-6000-datasheet1.pdf", "PDF", "Chip", "للشريحة نفسها. منظم الجهد ومقاومات I2C وترتيب أطراف GY-521 ليست جزءاً من هذه الداتا شيت.")],
  bmp280: [document("BMP280 datasheet", "Bosch Sensortec", "https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp280-ds001.pdf", "PDF", "Sensor", "لحساس BMP280 نفسه، وليس BME280. تغذية البورد تعتمد على وجود منظم جهد وتحويل مستويات.")],
  mq2_gas: [document("MQ-2 sensor manual", "Winsen", "https://www.winsen-sensor.com/d/files/newpdf/mq-2-%28ver1_6%29---manual.pdf", "PDF", "Sensor", "دليل حساس الغاز الأصلي، بما فيه التسخين والمعايرة. لا يصف دائرة المقارن أو أطراف وحدة MQ-2 كاملة.")],
  ir_obstacle: [comparator],
  flame_sensor: [comparator],
  soil_moisture: [comparator],
  ldr_module: [comparator],
  servo_sg90: [document("SG90 Digital official specifications", "Tower Pro", "https://towerpro.com.tw/product/sg90-7/", "Web", "Vendor variant", "المواصفات الأصلية لنسخة SG90 Digital؛ نسخ analog و360° والنسخ الأخرى قد تختلف.")],
  servo_mg995: [document("MG996R successor specifications", "Tower Pro", "https://towerpro.com.tw/product/mg996R/", "Web", "Related model", "هذا MG996R، الإصدار المطوّر من MG995، وليس داتا شيت MG995 المطابقة. لم يتم تأكيد رابط أصلي للموديل القديم.")],
  stepper_28byj48: [document("Gear stepper motor documentation", "Seeed Studio", "https://wiki.seeedstudio.com/Gear_Stepper_Motor_Driver_Pack/", "Web", "Vendor variant", "توثيق حزمة Seeed مع ملفات الداتا شيت؛ توجد نسخ 5V و12V ومقاومات ملفات مختلفة، فطابق رقم نسختك.")],
  relay_5v: [document("SRD (T73) relay datasheet", "Songle", "https://de.songlerelay.com/upload/8670/srd-t73-relay-290486.pdf", "PDF", "Chip", "للريليه SRD من Songle إذا كان هذا رقم القطعة على وحدتك. لا يصف مدخل IN أو دائرة التفعيل في البورد.")],
  lcd1602_i2c: [document("PCF8574 I²C expander datasheet", "Texas Instruments", "https://www.ti.com/lit/ds/symlink/pcf8574.pdf", "PDF", "Chip", "للـ PCF8574 إذا كان مستخدماً في محوّل I2C الخلفي، وليس للشاشة كاملة. نسخة PCF8574A تختلف في العنوان.")],
  oled_096: [document("SSD1306 official product documentation", "Solomon Systech", "https://www.solomon-systech.com/product/ssd1306/", "Web", "Chip", "صفحة الشركة الأصلية مع طلب الداتا شيت. المرجع لمتحكم SSD1306، وليس جهد تغذية بورد شاشة 0.96 بوصة كاملة.")],
  l298n: [document("L298 dual full-bridge driver datasheet", "STMicroelectronics", "https://www.st.com/resource/en/datasheet/l298.pdf", "PDF", "Chip", "للشريحة L298. جمابر ENA/ENB ومنظم 5V وتغذية البورد تحتاج مخطط الوحدة المستخدمة.")],
  tb6600: [document("TB6600HG datasheet", "Toshiba", "https://toshiba.semicon-storage.com/info/TB6600HG_datasheet_en_20160610.pdf?did=14683&prodName=TB6600HG", "PDF", "Chip", "للشريحة TB6600HG فقط. بعض صناديق TB6600 تستخدم شرائح مختلفة؛ جدول DIP وتغذية الصندوق لا يؤخذان من هذا الملف.")],
  uln2003: [document("ULN2003A datasheet", "Texas Instruments", "https://www.ti.com/lit/gpn/ULN2003A", "PDF", "Chip", "للشريحة ULN2003A. موصل المحرك وترتيب IN1–IN4 يعتمدان على بورد القيادة.")],
  esp8266_module: [document("ESP8266EX datasheet", "Espressif", "https://documentation.espressif.com/0a-esp8266ex_datasheet_en.html", "Web", "Chip", "للشريحة داخل وحدة ESP-01. ليس مخطط الأطراف الثمانية أو منظم تغذية الوحدة.")],
  rfid_rc522: [document("MFRC522 datasheet", "NXP", "https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf", "PDF", "Chip", "للشريحة MFRC522، بما فيها السجلات والواجهات. راجع مخطط بورد القارئ للأطراف الخارجية.")],
  hc05_bluetooth: [document("HC-05 six-pin module specifications", "DSD TECH", "https://www.deshide.com/product-details_HC-05.html", "Web", "Vendor variant", "صفحة الشركة لوحدة DSD TECH ذات ستة أطراف، وليست مرجعاً لكل نسخ HC-05. جهد VCC لا يعني أن RX يتحمل نفس الجهد.")],
  nrf24l01: [document("nRF24L01+ product specification", "Nordic Semiconductor", "https://docs-be.nordicsemi.com/bundle/nRF24L01P_PS_v1.0/raw/resource/enus/nRF24L01P_PS_v1.0.pdf", "PDF", "Chip", "للشريحة nRF24L01+؛ الوحدات المزودة بمضخم PA/LNA تحتاج مواصفات إضافية من مصنّع البورد.")],
};

export function documentationStatus(key: string) {
  const documents = componentDocuments[key] ?? [];
  if (!documents.length) return "يلزم اسم الشركة ورقم الموديل المطبوع على القطعة لتحديد الداتا شيت الأصلية المطابقة؛ اسم القطعة أو قيمتها وحدهما لا يكفيان.";
  if (documents.every(item => item.scope === "Related model")) return "المتاح حالياً مرجع لموديل مرتبط؛ الداتا شيت الأصلية المطابقة لهذا الموديل غير مؤكدة.";
  return null;
}
