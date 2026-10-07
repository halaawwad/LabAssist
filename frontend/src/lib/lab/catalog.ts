// Component definitions transcribed from the uploaded Hardware_Catalog.pdf.
import type { PlacedPart } from "./types";
export type PinKind = "power" | "ground" | "digital" | "analog" | "pwm" | "sda" | "scl" | "tx" | "rx" | "spi" | "motor" | "passive";
export interface PinDef { name: string; kind: PinKind; dir: "in" | "out" | "io"; voltage?: number | undefined; maxCurrent?: number | undefined; physicalNumber?: number; label?: string; functions?: string; headerSide?: "left" | "right"; headerRow?: number; internalNet?: string }
export const CATEGORIES = ["Microcontrollers", "Sensors", "Actuators", "Displays & LEDs", "Passive & Input", "Motor Drivers", "Wireless"] as const;
export type Category = typeof CATEGORIES[number];
export interface PartDef { id: string; name: string; category: Category; w: number; d: number; h: number; color: string; vMax: number; draw: number; logic?: number; pins: PinDef[] }
const P = (name: string, kind: PinKind, dir: PinDef["dir"] = "io", voltage?: number, maxCurrent?: number): PinDef => ({ name, kind, dir, voltage, maxCurrent });
const pin = (name: string, logic = 5): PinDef => {
  if (/^(GND\d*|MINUS)$/.test(name)) return P(name, "ground", "in");
  if (/^(5V|3V3|VCC|JD_VCC|VIN|VS|5V_LOGIC|PLUS)$/.test(name)) return P(name, "power", name === "5V" || name === "3V3" ? "out" : "in", name === "3V3" ? 3.3 : 5, 500);
  if (/^(SDA|GPIO2_SDA|SDA_SS)$/.test(name)) return P(name, name === "SDA_SS" ? "spi" : "sda", "io", logic);
  if (/^(SCL|GPIO3_SCL)$/.test(name)) return P(name, "scl", "io", logic);
  if (/^(TX|TXD|D1)$/.test(name)) return P(name, "tx", "out", logic);
  if (/^(RX|RXD|D0)$/.test(name)) return P(name, "rx", "in", logic);
  if (/^(SCK|MOSI|MISO|GPIO10_MOSI|GPIO9_MISO|GPIO11_SCLK|CSB|CSN|CE|IRQ|RST)$/.test(name)) return P(name, "spi", "io", logic);
  if (/^(A[0-5]|AO|A0|OUT)$/.test(name)) return P(name, name === "OUT" ? "digital" : "analog", "io", logic);
  if (/^(OUT[1-4]|COIL_|M[12]|A[+-]|B[+-])/.test(name)) return P(name, "motor", "io");
  if (/^(P[12]|END[12]|WIPER|COM\d*|NO\d*|NC\d*|ANODE|CATHODE|COMMON)$/.test(name)) return P(name, "passive", "io");
  return P(name, /^(ENA|SIGNAL|D[3569]|D10|D11)$/.test(name) ? "pwm" : "digital", "io", logic);
};
const pins = (names: string, logic = 5) => names.split(/\s+/).map(n => pin(n, logic));
const part = (id: string, name: string, category: Category, w: number, d: number, color: string, names: string, vMax = 5.5, draw = 15, logic = 5): PartDef => ({ id, name, category, w, d, h: category === "Microcontrollers" ? 0.25 : 0.4, color, vMax, draw, logic, pins: pins(names, logic) });
const m = "Microcontrollers", s = "Sensors", a = "Actuators", d = "Displays & LEDs", p = "Passive & Input", drv = "Motor Drivers", wi = "Wireless";
const breadboardPins: PinDef[] = [
  ...Array.from({length:63}, (_, column) => "ABCDEFGHIJ".split("").map((row, i): PinDef => ({
    name: `${row}${column + 1}`, kind: "passive", dir: "io",
    internalNet: `${i < 5 ? "AE" : "FJ"}${column + 1}`, functions: `Connected to ${i < 5 ? "A–E" : "F–J"} in column ${column + 1}`,
  }))).flat(),
  ...["TOP+", "TOP-", "BOTTOM+", "BOTTOM-"].flatMap(rail => Array.from({length:50}, (_, i): PinDef => ({
    name: `${rail} ${i + 1}`, kind: "passive", dir: "io", internalNet: rail, functions: `${rail.endsWith("+") ? "Power" : "Ground"} rail · continuous bus`,
  }))),
];
// Standard J8 header. Keep the original eleven array indices for saved wires;
// physicalNumber determines the actual position, independently of storage order.
const piNames = "3V3 5V GPIO2_SDA 5V_2 GPIO3_SCL GND GPIO4 GPIO14_TX GND9 GPIO15_RX GPIO17 GPIO18 GPIO27 GND14 GPIO22 GPIO23 3V3_17 GPIO24 GPIO10_MOSI GND20 GPIO9_MISO GPIO25 GPIO11_SCLK GPIO8_CE0 GND25 GPIO7_CE1 GPIO0_ID_SD GPIO1_ID_SC GPIO5 GND30 GPIO6 GPIO12 GPIO13 GND34 GPIO19 GPIO16 GPIO26 GPIO20 GND39 GPIO21".split(" ");
const piLegacyNumbers = [1, 2, 6, 3, 5, 11, 13, 15, 19, 21, 23];
const piPinOrder = [...piLegacyNumbers, ...Array.from({ length: 40 }, (_, i) => i + 1).filter(n => !piLegacyNumbers.includes(n))];
const raspberryPiPins: PinDef[] = piPinOrder.map(physicalNumber => {
  const name = piNames[physicalNumber - 1]!;
  let kind: PinKind = "digital";
  if (name.startsWith("GND")) kind = "ground";
  else if (/^(3V3|5V)/.test(name)) kind = "power";
  else if (name.includes("SDA")) kind = "sda";
  else if (name.includes("SCL")) kind = "scl";
  else if (name.endsWith("_TX")) kind = "tx";
  else if (name.endsWith("_RX")) kind = "rx";
  else if (/MOSI|MISO|SCLK|CE[01]/.test(name)) kind = "spi";
  return { name, physicalNumber, kind, dir: kind === "ground" ? "in" : kind === "power" || kind === "tx" ? "out" : kind === "rx" ? "in" : "io", voltage: kind === "ground" ? 0 : name.startsWith("5V") ? 5 : 3.3, maxCurrent: kind === "power" ? 500 : kind === "ground" ? undefined : 16 };
});

type HeaderEntry = readonly [name: string, label: string, kind: PinKind, functions: string, inputOnly?: boolean];
function referenceHeader(left: readonly HeaderEntry[], right: readonly HeaderEntry[], legacyNames: string[]): PinDef[] {
  const all = [left, right].flatMap((entries, side) => entries.map(([name, label, kind, functions, inputOnly], headerRow): PinDef => ({
    name, label, kind, functions, headerRow, headerSide: side ? "right" : "left",
    dir: inputOnly || kind === "ground" || kind === "rx" || name === "VIN" || name === "EN" || name === "RST" ? "in" : kind === "power" || kind === "tx" ? "out" : "io",
    voltage: kind === "ground" ? 0 : /^(5V|VIN|VUSB)/.test(name) ? 5 : 3.3,
    maxCurrent: kind === "ground" ? undefined : kind === "power" ? 500 : 12,
  })));
  // Existing saved wires identify pins by array index, so append newly exposed pins.
  return [...legacyNames.map(name => all.find(pin => pin.name === name)!), ...all.filter(pin => !legacyNames.includes(pin.name))];
}
const esp8266Pins = referenceHeader([
  ["A0", "A0", "analog", "ADC0 / TOUT", true], ["GND", "G", "ground", "Ground"], ["VUSB", "VU", "power", "USB 5V"],
  ["GPIO10", "S3", "spi", "SD3 / flash"], ["GPIO9", "S2", "spi", "SD2 / flash"], ["GPIO8", "S1", "spi", "SD1 / MOSI / flash"],
  ["GPIO11", "SC", "spi", "SDCMD / CS / flash"], ["GPIO7", "S0", "spi", "SD0 / MISO / flash"], ["GPIO6", "SK", "spi", "SDCLK / SCLK / flash"],
  ["GND_L10", "G", "ground", "Ground"], ["3V3", "3V", "power", "3.3V"], ["EN", "EN", "digital", "Chip enable"],
  ["RST", "RST", "digital", "Reset"], ["GND_L14", "G", "ground", "Ground"], ["VIN", "VIN", "power", "5V input"],
], [
  ["D0", "D0", "digital", "GPIO16 / WAKE"], ["D1", "D1", "scl", "GPIO5 / I2C SCL"], ["D2", "D2", "sda", "GPIO4 / I2C SDA"],
  ["D3", "D3", "digital", "GPIO0 / FLASH"], ["D4", "D4", "digital", "GPIO2 / TXD1"], ["3V3_R6", "3V", "power", "3.3V"],
  ["GND_R7", "G", "ground", "Ground"], ["D5", "D5", "spi", "GPIO14 / HSCLK"], ["D6", "D6", "spi", "GPIO12 / HMISO"],
  ["D7", "D7", "spi", "GPIO13 / HMOSI / RXD2"], ["D8", "D8", "spi", "GPIO15 / HCS / TXD2"],
  ["RX", "RX", "rx", "GPIO3 / RXD0"], ["TX", "TX", "tx", "GPIO1 / TXD0"], ["GND_R14", "G", "ground", "Ground"], ["3V3_R15", "3V", "power", "3.3V"],
], "3V3 VIN GND A0 D1 D2 D5 D6 D7 D0".split(" "));
const esp32Pins = referenceHeader([
  ["3V3", "3V3", "power", "3.3V"], ["EN", "EN", "digital", "Chip enable / reset"],
  ["GPIO36", "VP", "analog", "ADC1_CH0 / SENSOR_VP", true], ["GPIO39", "VN", "analog", "ADC1_CH3 / SENSOR_VN", true],
  ["GPIO34", "34", "analog", "ADC1_CH6 / input only", true], ["GPIO35", "35", "analog", "ADC1_CH7 / input only", true],
  ["GPIO32", "32", "analog", "ADC1_CH4 / TOUCH9 / 32K_XP"], ["GPIO33", "33", "analog", "ADC1_CH5 / TOUCH8 / 32K_XN"],
  ["GPIO25", "25", "analog", "DAC1 / ADC2_CH8"], ["GPIO26", "26", "analog", "DAC2 / ADC2_CH9"],
  ["GPIO27", "27", "analog", "ADC2_CH7 / TOUCH7"], ["GPIO14", "14", "spi", "HSPI_CLK / ADC2_CH6 / TOUCH6"],
  ["GPIO12", "12", "spi", "HSPI_MISO / ADC2_CH5 / TOUCH5"], ["GND", "GND", "ground", "Ground"],
  ["GPIO13", "13", "spi", "HSPI_MOSI / ADC2_CH4 / TOUCH4"], ["GPIO9", "SD2", "spi", "D2 / SPI flash"],
  ["GPIO10", "SD3", "spi", "D3 / SPI flash"], ["GPIO11", "CMD", "spi", "CMD / SPI flash"], ["5V", "5V", "power", "5V supply"],
], [
  ["GND_R1", "GND", "ground", "Ground"], ["GPIO23", "23", "spi", "VSPI_MOSI"], ["GPIO22", "22", "scl", "I2C SCL"],
  ["GPIO1", "TX", "tx", "UART0 TX"], ["GPIO3", "RX", "rx", "UART0 RX"], ["GPIO21", "21", "sda", "I2C SDA"],
  ["GND_R7", "GND", "ground", "Ground"], ["GPIO19", "19", "spi", "VSPI_MISO"], ["GPIO18", "18", "spi", "VSPI_CLK"],
  ["GPIO5", "5", "spi", "VSPI_CS"], ["GPIO17", "17", "digital", "UART2 TX"], ["GPIO16", "16", "digital", "UART2 RX"],
  ["GPIO4", "4", "analog", "ADC2_CH0 / TOUCH0"], ["GPIO0", "0", "analog", "BOOT / ADC2_CH1 / TOUCH1"],
  ["GPIO2", "2", "analog", "ADC2_CH2 / TOUCH2"], ["GPIO15", "15", "spi", "HSPI_CS / ADC2_CH3 / TOUCH3"],
  ["GPIO8", "SD1", "spi", "D1 / SPI flash"], ["GPIO7", "SD0", "spi", "D0 / SPI flash"], ["GPIO6", "CLK", "spi", "SCK / SPI flash"],
], "3V3 5V GND GPIO21 GPIO22 GPIO34 GPIO35 GPIO18 GPIO19 GPIO23 GPIO25 GPIO26 GPIO27 GPIO32 GPIO33 GPIO5 GPIO16 GPIO17 GPIO4".split(" "));
const nanoLegacy = "D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 D10 D11 D12 D13 A0 A1 A2 A3 A4 A5 5V 3V3 GND1 GND2 VIN".split(" ");
const nanoLeft = "D13 3V3 AREF A0 A1 A2 A3 A4 A5 A6 A7 5V RESET GND1 VIN".split(" ");
const nanoRight = "D12 D11 D10 D9 D8 D7 D6 D5 D4 D3 D2 GND2 RESET2 D0 D1".split(" ");
function arduinoPin(name: string): HeaderEntry {
 const kind: PinKind = name.startsWith("GND") ? "ground" : /^(5V|3V3|VIN)$/.test(name) ? "power" : /^A\d+$/.test(name) ? "analog" : name === "D0" ? "rx" : name === "D1" ? "tx" : /^D(3|5|6|9|10|11)$/.test(name) ? "pwm" : "digital";
 const functions = name === "A4" ? "ADC4 / SDA" : name === "A5" ? "ADC5 / SCL" : name === "D13" ? "GPIO / SCK" : name === "D12" ? "GPIO / MISO" : name === "D11" ? "GPIO / MOSI / PWM" : name === "D10" ? "GPIO / SS / PWM" : name === "D0" ? "UART RX" : name === "D1" ? "UART TX" : name.startsWith("RESET") ? "Reset" : kind === "analog" ? `ADC ${name}` : kind === "pwm" ? "GPIO / PWM" : name;
 return [name, name === "RESET2" ? "RESET" : name.startsWith("GND") ? "GND" : name, kind, functions, name === "A6" || name === "A7"];
}
const nanoPins = referenceHeader(nanoLeft.map(arduinoPin), nanoRight.map(arduinoPin), nanoLegacy).map(p => ({...p, voltage:p.kind === "ground" ? 0 : p.name === "3V3" ? 3.3 : p.name === "VIN" ? 12 : 5}));
const megaNames = [...Array.from({length:54},(_,i)=>`D${i}`),...Array.from({length:16},(_,i)=>`A${i}`),"5V","3V3","VIN","RESET","IOREF","AREF","GND1","GND2","GND3","GND4","SDA","SCL","5V2"];
const megaPins: PinDef[] = megaNames.map(name => {
 const [_,label,baseKind] = arduinoPin(name);
 const n = name.startsWith("D") ? Number(name.slice(1)) : -1;
 const kind: PinKind = name === "SDA" || name === "D20" ? "sda" : name === "SCL" || name === "D21" ? "scl" : [14,16,18].includes(n) ? "tx" : [15,17,19].includes(n) ? "rx" : n >= 50 && n <= 53 ? "spi" : n >= 2 && (n <= 13 || n >= 44 && n <= 46) ? "pwm" : name === "5V2" ? "power" : baseKind;
 return {name,label:name === "5V2" ? "5V" : label,kind,dir:kind === "ground" || kind === "rx" || name === "VIN" || name === "RESET" ? "in" : kind === "power" || kind === "tx" ? "out" : "io",voltage:kind === "ground" ? 0 : name === "3V3" ? 3.3 : name === "VIN" ? 12 : 5,functions:name.startsWith("A") && /^A\d+$/.test(name) ? `ADC${name.slice(1)} / D${54+Number(name.slice(1))}` : n === 50 ? "MISO" : n === 51 ? "MOSI" : n === 52 ? "SCK" : n === 53 ? "SS" : kind === "pwm" ? "GPIO / PWM" : kind};
});
export const CATALOG: PartDef[] = [
  part("arduino-uno", "Arduino Uno", m, 4.2, 3, "#19517d", "D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 D10 D11 D12 D13 A0 A1 A2 A3 A4 A5 5V 3V3 GND1 GND2 VIN RESET AREF", 12, 50),
  { ...part("arduino-nano", "Arduino Nano", m, 0.9, 2.25, "#147c96", "", 12, 50), h: 0.3, pins: nanoPins },
  { ...part("arduino-mega", "Arduino Mega 2560", m, 2.7, 5.1, "#147c96", "", 12, 70), h: 0.5, pins: megaPins },
  { ...part("esp32", "ESP32 DevKit (38 pins)", m, 1.6, 3.4, "#252a2e", "", 5.5, 100, 3.3), h: 0.4, pins: esp32Pins },
  { ...part("esp8266", "ESP8266 NodeMCU LoLin V3", m, 1.65, 3.5, "#22282e", "", 5.5, 80, 3.3), h: 0.4, pins: esp8266Pins },
  { ...part("raspberry-pi-4", "Raspberry Pi 3 Model B+", m, 2.8, 4.25, "#278658", "", 5.25, 600, 3.3), h: 0.7, pins: raspberryPiPins },
  part("hc-sr04", "HC-SR04 Ultrasonic Sensor", s, 2.25, 1, "#1f4fa3", "VCC TRIG ECHO GND"),
  part("dht11", "DHT11 Temperature / Humidity", s, .9, 1.65, "#2b8fd6", "VCC DATA GND"),
  part("dht22", "DHT22 / AM2302", s, 1, 1.9, "#eeeeee", "VCC DATA GND"),
  part("ldr-bare", "Photoresistor / LDR", s, .7, .6, "#b98448", "P1 P2", 0, 0),
  part("pir", "HC-SR501 PIR Motion Sensor", s, 1.3, 1.2, "#2a7d45", "VCC OUT GND", 20),
  part("lm35", "LM35 Temperature Sensor", s, .7, .6, "#282d30", "VS OUT GND", 30),
  part("mpu6050", "MPU-6050 IMU Module", s, 1.1, 1.55, "#277da1", "VCC GND SDA SCL INT XDA XCL AD0", 3.6, 10, 3.3),
  part("bmp280", "BMP280 Pressure Sensor", s, 1.05, 1.05, "#6a4c93", "VCC GND SDA SCL CSB SDO", 3.6, 10, 3.3),
  part("ir-obstacle", "IR Obstacle Sensor", s, 1.9, .85, "#148d9d", "VCC GND OUT"),
  part("flame", "Flame Sensor Module", s, 1.9, .85, "#148d9d", "VCC GND AO DO"),
  part("mq2", "MQ-2 Gas Sensor", s, 1.65, 1, "#167fa4", "VCC GND AO DO", 5.2, 150),
  part("soil", "Soil Moisture Sensor", s, 2.15, 2.6, "#088e9d", "VCC GND AO DO"),
  part("water-level", "Water Level Sensor", s, 1, 2.8, "#ef2028", "VCC GND SIG"),
  part("ldr", "LDR Sensor Module", s, 1.8, .85, "#088e9d", "VCC GND AO DO"),
  part("push-button", "Push Button", p, .7, .7, "#495057", "P1 P2", 0, 0),
  { ...part("breadboard", "Breadboard (830 points)", p, 8.4, 2.85, "#f0eee5", "", 0, 0), h: .19, pins: breadboardPins },
  { ...part("breadboard-400", "Breadboard (400 points)", p, 4.25, 2.85, "#f0eee5", "", 0, 0), h: .19,
    pins: [...breadboardPins.slice(0, 300), ...[0, 1, 2, 3].flatMap(rail => breadboardPins.slice(630 + rail * 50, 655 + rail * 50))] },
  part("sg90", "SG90 Micro Servo", a, 1.3, .7, "#2f6690", "VCC GND SIGNAL", 6, 250),
  part("mg995", "MG995 Servo", a, 1.7, 1.1, "#333b42", "VCC GND SIGNAL", 7.2, 900),
  part("dc-motor", "DC Motor", a, 1.2, .9, "#adb5bd", "M1 M2", 0, 400),
  part("stepper", "28BYJ-48 Stepper Motor", a, 1.45, 1.45, "#c0c0c0", "COIL_A1 COIL_A2 COIL_B1 COIL_B2 VCC", 5.5, 240),
  part("buzzer", "Active Buzzer", a, 1.1, 1, "#212529", "PLUS MINUS", 5.5, 30),
  part("relay", "5 V Relay Module", a, 1.1, 1.65, "#1d4ed8", "VCC GND IN COM NO NC", 5.25, 70),
  part("relay-2", "2 Channel 5 V Relay Module", a, 1.9, 1.9, "#202c35", "VCC GND IN1 IN2 NC1 COM1 NO1 NC2 COM2 NO2 JD_VCC", 5.25, 140),
  part("relay-8", "8 Channel 5 V Relay Module", a, 5.9, 2.1, "#176595", "VCC GND IN1 IN2 IN3 IN4 IN5 IN6 IN7 IN8 NC1 COM1 NO1 NC2 COM2 NO2 NC3 COM3 NO3 NC4 COM4 NO4 NC5 COM5 NO5 NC6 COM6 NO6 NC7 COM7 NO7 NC8 COM8 NO8 JD_VCC", 5.25, 560),
  part("lcd-i2c", "LCD 16×2 I2C", d, 3.2, 1.4, "#2d6a4f", "VCC GND SDA SCL"),
  part("lcd-1602", "LCD 16×2 (16 pins)", d, 3.2, 1.4, "#2d6a4f", "VSS VDD VEE RS RW E D0 D1 D2 D3 D4 D5 D6 D7 LEDA LEDK"),
  part("oled", "0.96 inch OLED SSD1306", d, 1.1, 1.1, "#14213d", "VCC GND SDA SCL", 5),
  part("seven-seg", "Single Digit 7-Segment Display", d, .9, 1.2, "#343a40", "A B C D E F G DP COM COM2", 3.4, 80),
  part("led-red", "Red LED 5 mm", d, .5, .5, "#e63946", "ANODE CATHODE", 2.2, 20),
  part("led-green", "Green LED 5 mm", d, .5, .5, "#2a9d8f", "ANODE CATHODE", 2.4, 20),
  part("led-rgb", "RGB LED", d, .7, .6, "#e9ecef", "R G B COMMON", 3.4, 60),
  part("resistor-220", "220 ohm Resistor", p, 1, .3, "#d4a373", "P1 P2", 0, 0),
  part("resistor-variable", "Resistor (custom value)", p, 1, .3, "#d4a373", "P1 P2", 0, 0),
  { ...part("power-source", "Battery / Adjustable Power Source", p, 1.3, .85, "#355468", "PLUS MINUS", 0, 0), h: .65 },
  { ...part("power-switch", "Power Switch", p, .8, .65, "#252a2e", "IN OUT", 0, 0), h: .4 },
  { ...part("xl4015", "DC-DC Converter XL4015", p, 1.8, .95, "#246ea0", "VIN+ VIN- OUT+ OUT-", 36, 10), h: .5 },
  { ...part("s-60-12", "S-60-12 · 110/220VAC → 12VDC 5A 60W", p, 2.8, 1.6, "#bfc4c7", "L N PE V- V+", 240, 0), h: .7 },
  part("resistor-10k", "10 kohm Resistor", p, 1, .3, "#d4a373", "P1 P2", 0, 0),
  part("potentiometer", "10 kohm Potentiometer", p, .9, .9, "#577590", "END1 WIPER END2", 5, 0),
  part("l298n", "L298N Dual H-Bridge Driver", drv, 1.8, 1.8, "#d62828", "ENA IN1 IN2 OUT1 OUT2 VS 5V_LOGIC GND IN3 IN4 ENB OUT3 OUT4", 35, 36),
  part("tb6600", "TB6600 Stepper Driver", drv, 2, 2.8, "#282d30", "VCC GND PUL+ DIR+ ENA+ A+ A- B+ B- PUL- DIR- ENA-", 42, 50),
  part("uln2003", "ULN2003 Driver Board", drv, 1.4, 1.5, "#2a9d8f", "VCC GND IN1 IN2 IN3 IN4 OUT1 OUT2 OUT3 OUT4 MOTOR_VCC", 12, 10),
  part("esp8266-module", "ESP8266 Wi-Fi Module", wi, 1.5, .9, "#173767", "VCC GND TX RX GPIO0 GPIO2 CH_EN RST", 3.6, 100, 3.3),
  part("rfid-rc522", "MFRC522 RFID Reader", wi, 1.7, 2.5, "#1760a5", "3V3 GND SDA_SS SCK MOSI MISO RST IRQ", 3.6, 20, 3.3),
  part("hc05", "HC-05 Bluetooth Module", wi, 1.9, .85, "#2767a3", "VCC GND TXD RXD KEY STATE", 6, 40, 3.3),
  part("nrf24l01", "nRF24L01+ Radio Module", wi, 1.8, .85, "#171d21", "VCC GND CE CSN SCK MOSI MISO IRQ", 3.6, 15, 3.3),
  part("water-pump", "R385 DC 6–12 V Mini Water Pump", a, 2.7, 1.1, "#ecebd9", "PLUS MINUS", 12, 350),
];
const LEADED = new Set(["dht11", "dht22", "ldr-bare", "lm35", "push-button", "sg90", "mg995", "dc-motor", "stepper", "buzzer", "led-red", "led-green", "led-rgb", "seven-seg", "resistor-220", "resistor-10k", "resistor-variable", "potentiometer", "water-pump"]);
export const isLeaded = (def: PartDef) => LEADED.has(def.id);
export const CATALOG_MAP: Record<string, PartDef> = Object.fromEntries(CATALOG.map(c => [c.id, c]));
export function placedDefinition(placed: PlacedPart): PartDef {
  const base = CATALOG_MAP[placed.type]!;
  const voltage = placed.voltage ?? (placed.type === "xl4015" ? 12 : 5);
  if (placed.type === "power-source") return { ...base, name: `Power Source · ${voltage} V`, pins: base.pins.map(pin => ({ ...pin, kind: pin.name === "PLUS" ? "power" : "ground", dir: pin.name === "PLUS" ? "out" : "in", voltage: pin.name === "PLUS" ? voltage : 0, maxCurrent: 5000 })) };
  if (placed.type === "resistor-variable" || placed.type.startsWith("resistor-")) return { ...base, name: `Resistor · ${placed.resistance ?? (placed.type === "resistor-10k" ? 10000 : 220)} Ω` };
  if (placed.type === "power-switch") return { ...base, pins: base.pins.map(pin => ({ ...pin, kind: "passive", internalNet: placed.enabled !== false ? "switch" : undefined } as PinDef)) };
  if (placed.type === "xl4015" || placed.type === "s-60-12") return { ...base, pins: base.pins.map(pin => {
    const ground = ["VIN-", "OUT-", "V-", "PE"].includes(pin.name), output = ["OUT+", "V+"].includes(pin.name);
    return { ...pin, kind: ground ? "ground" : "power", dir: output ? "out" : "in", voltage: ground ? 0 : output ? placed.type === "s-60-12" ? 12 : voltage : undefined, maxCurrent: output ? 5000 : undefined };
  }) };
  return base;
}
const segmentNumbers: Record<string, number> = { E: 1, D: 2, COM: 3, C: 4, DP: 5, B: 6, A: 7, COM2: 8, F: 9, G: 10 };
CATALOG_MAP["seven-seg"]!.pins.forEach(pin => { pin.physicalNumber = segmentNumbers[pin.name]!; pin.label = pin.name === "COM2" ? "COM" : pin.name; });
CATALOG_MAP["lcd-1602"]!.pins.forEach((pin, i) => {
  pin.physicalNumber = i + 1;
  if (["VSS", "LEDK"].includes(pin.name)) { pin.kind = "ground"; pin.dir = "in"; }
  else if (["VDD", "LEDA"].includes(pin.name)) { pin.kind = "power"; pin.dir = "in"; pin.voltage = 5; }
  else if (pin.name === "VEE") { pin.kind = "analog"; pin.dir = "in"; pin.functions = "LCD contrast"; }
  else { pin.kind = "digital"; pin.dir = /^D\d$/.test(pin.name) ? "io" : "in"; }
});
export const PIN_COLORS: Record<PinKind, string> = { power: "#e5484d", ground: "#2b2f33", digital: "#12a594", analog: "#f5a524", pwm: "#3e9bf0", sda: "#8e4ec6", scl: "#d6409f", tx: "#0091ff", rx: "#30a46c", spi: "#ad7f58", motor: "#f76b15", passive: "#a1a1aa" };
/** Shared positions for visible sockets, pin targets and wiring. */
export function pinLocal(def: PartDef, index: number): [number, number, number] {
  if (def.id === "power-source") return [(index - .5) * .4, .22, .57];
  if (def.id === "power-switch") return [(index - .5) * .3, .12, .46];
  if (def.id === "xl4015") return [index < 2 ? -.8 : .8, .2, index % 2 ? .2 : -.2];
  if (def.id === "s-60-12") return [-.85 + index * .35, .24, .7];
  if (def.id === "breadboard" || def.id === "breadboard-400") {
    const compact = def.id === "breadboard-400", columns = compact ? 30 : 63, railHoles = compact ? 25 : 50;
    if (index < columns * 10) {
      const row = index % 10, column = Math.floor(index / 10);
      return [(column - (columns - 1) / 2) * .125, .192, row < 5 ? -.73 + row * .125 : .23 + (row - 5) * .125];
    }
    const n = index - columns * 10, rail = Math.floor(n / railHoles), hole = n % railHoles;
    return [(compact ? -1.81 : -3.87) + (hole + Math.floor(hole / 5) * .9) * .133, .192, [-1.19, -1.03, 1.03, 1.19][rail]!];
  }
  const name = def.pins[index]!.name;
  if (def.id === "l298n") {
    if (/^OUT[12]$/.test(name)) return [-.69, .34, name === "OUT1" ? .04 : .24];
    if (/^OUT[34]$/.test(name)) return [.69, .34, name === "OUT4" ? .04 : .24];
    const power = ["VS", "GND", "5V_LOGIC"].indexOf(name);
    return power >= 0 ? [-.59 + power * .2, .34, .67] : [.08 + ["ENA", "IN1", "IN2", "IN3", "IN4", "ENB"].indexOf(name) * .12, .24, .67];
  }
  if (def.id === "tb6600") {
    const n = ["ENA-", "ENA+", "DIR-", "DIR+", "PUL-", "PUL+", "B-", "B+", "A-", "A+", "GND", "VCC"].indexOf(name);
    return [.93, .41, -.95 + n * .18 + (n >= 6 ? .07 : 0)];
  }
  if (def.id === "uln2003") {
    if (/^IN/.test(name)) return [-.46, .24, -.43 + (Number(name.slice(2)) - 1) * .15];
    if (/^OUT/.test(name) || name === "MOTOR_VCC") return [.36, .27, -.48 + (name === "MOTOR_VCC" ? 0 : Number(name.slice(3))) * .14];
    return [name === "GND" ? -.28 : -.08, .24, .57];
  }
  if (def.id === "esp8266-module" || def.id === "nrf24l01") {
    const order = def.id === "esp8266-module" ? ["GND", "TX", "GPIO2", "CH_EN", "GPIO0", "RST", "RX", "VCC"] : ["GND", "VCC", "CE", "CSN", "SCK", "MOSI", "MISO", "IRQ"];
    const n = order.indexOf(name), esp = def.id === "esp8266-module";
    return [esp ? .43 + n % 2 * .16 : -.73 + n % 2 * .16, .25, .27 - Math.floor(n / 2) * .18];
  }
  if (def.id === "hc05") return [1.04, .16, -.32 + ["KEY", "VCC", "GND", "TXD", "RXD", "STATE"].indexOf(name) * .13];
  if (def.id === "rfid-rc522") return [-.53 + ["SDA_SS", "SCK", "MOSI", "MISO", "IRQ", "GND", "RST", "3V3"].indexOf(name) * .15, .25, 1.08];
  if (def.id === "oled") {
    const order = ["GND", "VCC", "SCL", "SDA"];
    return [(order.indexOf(def.pins[index]!.name) - 1.5) * .14, .23, -.46];
  }
  if (def.id === "lcd-i2c") return [-def.w / 2 - .13, .16, (index - 1.5) * .16];
  if (def.id === "lcd-1602") return [-1.35 + index * .14, .22, -.6];
  if (def.id === "seven-seg") {
    const numbers: Record<string, number> = { E: 1, D: 2, COM: 3, C: 4, DP: 5, B: 6, A: 7, COM2: 8, F: 9, G: 10 };
    const n = numbers[def.pins[index]!.name]!;
    return [(n <= 5 ? n - 3 : 8 - n) * .16, .09, n <= 5 ? .74 : -.74];
  }
  if (def.id.startsWith("relay")) {
    const name = def.pins[index]!.name, channels = def.id === "relay-8" ? 8 : def.id === "relay-2" ? 2 : 1;
    const contact = /^(NC|COM|NO)(\d+)?$/.exec(name);
    if (contact) {
      const channel = Number(contact[2] ?? 1) - 1, slot = ["NC", "COM", "NO"].indexOf(contact[1]!);
      return [(channel - (channels - 1) / 2) * .7 + (slot - 1) * .2, .35, -def.d / 2 + .16];
    }
    const controls = channels === 1 ? ["VCC", "GND", "IN"] : ["GND", ...Array.from({length:channels},(_,i)=>`IN${i+1}`), "VCC", "JD_VCC"];
    return [(controls.indexOf(name) - (controls.length - 1) / 2) * .14, .24, def.d / 2 - .12];
  }
  if (def.id === "sg90" || def.id === "mg995") {
    const order = ["SIGNAL", "VCC", "GND"];
    return [-def.w / 2 - .45, .14, (order.indexOf(def.pins[index]!.name) - 1) * .14];
  }
  if (def.id === "stepper") return [(index - 2) * .14, .15, .95];
  if (def.id === "water-pump") return [1.25, .42, index === 0 ? -.2 : .2];
  if (def.id === "dc-motor") return [.62, .28, index === 0 ? -.22 : .22];
  if (def.id === "buzzer") return [index === 0 ? .12 : -.12, .12, .69];
  if (def.id === "mq2" || def.id === "ldr") {
    const order = def.id === "mq2" ? ["AO", "DO", "GND", "VCC"] : ["VCC", "DO", "GND", "AO"];
    return [def.w / 2 + .13, .14, (order.indexOf(def.pins[index]!.name) - 1.5) * .18];
  }
  if (def.id === "soil") {
    const order = ["AO", "DO", "GND", "VCC"];
    return [-.67 + (order.indexOf(def.pins[index]!.name) - 1.5) * .18, .14, .7];
  }
  if (def.id === "water-level") {
    const order = ["SIG", "VCC", "GND"];
    return [(order.indexOf(def.pins[index]!.name) - 1) * .18, .14, -def.d / 2 - .13];
  }
  // Physical order is independent of stored pin indices, preserving existing wires.
  if (def.id === "mpu6050" || def.id === "bmp280") {
    const order = def.id === "mpu6050" ? ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"] : ["VCC", "GND", "SCL", "SDA", "CSB", "SDO"];
    return [-def.w / 2 + .1, .27, (order.indexOf(def.pins[index]!.name) - (order.length - 1) / 2) * .18];
  }
  if (def.id === "ir-obstacle" || def.id === "flame") {
    const order = def.id === "flame" ? ["AO", "DO", "GND", "VCC"] : ["VCC", "GND", "OUT"];
    return [def.id === "flame" ? -def.w / 2 - .13 : def.w / 2 + .13, .14, (order.indexOf(def.pins[index]!.name) - (order.length - 1) / 2) * .18];
  }
  if (def.id === "pir") return [(index - 1) * .2, .16, def.d / 2 + .13];
  if (def.id === "arduino-nano") {
    const pin = def.pins[index]!;
    return [pin.headerSide === "left" ? -0.36 : 0.36, 0.2, -0.93 + pin.headerRow! * 0.13];
  }
  if (def.id === "arduino-mega") {
    const name = def.pins[index]!.name;
    const n = /^D\d+$/.test(name) ? Number(name.slice(1)) : -1;
    if (n >= 22) return [-1.1 + Math.floor((n - 22) / 2) * 0.137, 0.25, n % 2 ? 2.36 : 2.22];
    const right = ["SCL", "SDA", "AREF", "GND3", ...Array.from({length:14},(_,i)=>`D${13-i}`), ...Array.from({length:8},(_,i)=>`D${14+i}`)];
    const left = ["IOREF", "RESET", "3V3", "5V", "GND1", "GND2", "VIN", ...Array.from({length:16},(_,i)=>`A${i}`)];
    if (right.includes(name)) return [1.2, 0.25, -1.48 + right.indexOf(name) * 0.137];
    if (left.includes(name)) return [-1.2, 0.25, -1.35 + left.indexOf(name) * 0.15];
    return [name === "5V2" ? -1.1 : 1.1, 0.25, 2.07];
  }
  if (["dht11", "dht22", "hc-sr04"].includes(def.id)) {
    const pitch = def.id === "hc-sr04" ? 0.19 : 0.22;
    return [(index - (def.pins.length - 1) / 2) * pitch, 0.14, def.d / 2 + 0.17];
  }
  if (def.id === "esp32" || def.id === "esp8266") {
    const pin = def.pins[index]!;
    const pitch = def.id === "esp32" ? 0.145 : 0.175;
    return [pin.headerSide === "left" ? -def.w / 2 + 0.11 : def.w / 2 - 0.11, 0.27, (def.id === "esp32" ? -1.4 : -1.05) + pin.headerRow! * pitch];
  }
  if (def.id === "raspberry-pi-4") {
    const number = def.pins[index]!.physicalNumber!;
    return [number % 2 ? 1.06 : 1.19, 0.32, -1.77 + Math.floor((number - 1) / 2) * 0.13];
  }
  if (def.id === "arduino-uno") {
    if (index < 14) return [-1.72 + index * .26, .2, -1.34];
    if (index < 20) return [.53 + (index - 14) * .23, .2, 1.34];
    return [-1.68 + (index - 20) * .23, .2, 1.34];
  }
  const n = def.pins.length;
  const twoRows = n > 8;
  const perRow = twoRows ? Math.ceil(n / 2) : n;
  const row = twoRows && index >= perRow ? 1 : 0;
  const i = row ? index - perRow : index;
  const count = row ? n - perRow : perRow;
  const span = def.w - .3;
  const x = count === 1 ? 0 : -span / 2 + span * i / (count - 1);
  if (isLeaded(def)) return [x, .07, def.d / 2 + .18 + row * .25];
  return [x, .2, row ? -def.d / 2 + .15 : def.d / 2 - .15];
}
