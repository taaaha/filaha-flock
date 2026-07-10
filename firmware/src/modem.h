// ════════════════════════════════════════════════════════════════
//  modem.h — SIMCom A7670G boot, network attach, and SMS send.
// ════════════════════════════════════════════════════════════════
#pragma once
#include <Arduino.h>
#include <TinyGsmClient.h>   // TINY_GSM_MODEM_SIM7600 is set in platformio.ini

bool modem_begin();                                       // power, init, network attach
bool modem_is_network_attached();
bool modem_send_sms(const char* number, const String& body);
void modem_loop();                                        // periodic housekeeping
int  modem_rssi_dbm();                                    // signal strength (0 if unknown)

// Shared modem instance — net.cpp layers GPRS + MQTT on top of this.
TinyGsm& modem_instance();

// Write raw bytes straight to the modem UART — used to feed a binary MQTT
// payload after the A7670 returns its '>' prompt (AT+CMQTTPAYLOAD).
size_t modem_write_raw(const uint8_t* buf, size_t len);

// Emergency voice call (rings the farmer's phone). Returns true if the modem
// accepted the dial. Some A7670 variants are data-only — check the log on first
// flash; if dialing fails the critical SMS still goes out as the lifeline.
bool modem_place_call(const char* number, unsigned long ring_ms);

// Recover a wedged modem: soft restart → re-attach; hard power-cycle if that
// fails. Called by net.cpp after repeated connect failures. Returns attached.
bool modem_recover();
