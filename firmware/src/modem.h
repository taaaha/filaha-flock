// ════════════════════════════════════════════════════════════════
//  modem.h — SIMCom A7670G boot, network attach, and SMS send.
// ════════════════════════════════════════════════════════════════
#pragma once
#include <Arduino.h>

bool modem_begin();                                       // power, init, network attach
bool modem_is_network_attached();
bool modem_send_sms(const char* number, const String& body);
void modem_loop();                                        // periodic housekeeping
int  modem_rssi_dbm();                                    // signal strength (0 if unknown)
