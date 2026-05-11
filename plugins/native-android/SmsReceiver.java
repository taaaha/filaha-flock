package com.filaha;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.telephony.SmsManager;
import android.telephony.SmsMessage;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Receives SMS broadcasts. Whether the app is in foreground, background, or
 * killed entirely, this receiver runs and fires the full alert pipeline:
 *  - shows heads-up notification
 *  - sends SMS to emergency contact (if configured)
 *  - places a direct phone call (if configured)
 *
 * Configuration is read from SharedPreferences, written by JS via setAlertConfig.
 */
public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "FilahaSmsReceiver";
    private static final String FILAHA_PREFIX = "FILAHA";
    private static final String QUEUE_KEY = "filaha_sms_queue";
    static final String PREFS_NAME = "filaha_prefs";
    private static final String CHANNEL_ID = "filaha_alerts";
    private static final String CHANNEL_NAME = "Filaha Flock Alerts";

    private static final long DANGER_COOLDOWN_MS = 10 * 60 * 1000L; // 10 min

    private static ReactApplicationContext sReactContext;

    public static void setReactContext(ReactApplicationContext context) {
        sReactContext = context;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        // Hold a wake lock during processing so the device stays on
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        try {
            if (pm != null) {
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Filaha:SmsAlert");
                try { wl.acquire(30_000L); } catch (Exception ignored) {}
            }
            handleSms(context, intent);
        } catch (Exception e) {
            Log.e(TAG, "onReceive error", e);
        } finally {
            if (wl != null && wl.isHeld()) {
                try { wl.release(); } catch (Exception ignored) {}
            }
        }
    }

    private void handleSms(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        String format = bundle.getString("format");
        StringBuilder bodyBuilder = new StringBuilder();
        String sender = null;
        long smsTimestamp = 0;

        for (Object pduObj : pdus) {
            if (pduObj == null) continue;
            SmsMessage smsMessage;
            if (format != null) {
                smsMessage = SmsMessage.createFromPdu((byte[]) pduObj, format);
            } else {
                smsMessage = SmsMessage.createFromPdu((byte[]) pduObj);
            }
            if (smsMessage == null) continue;
            if (sender == null) sender = smsMessage.getOriginatingAddress();
            if (smsTimestamp == 0) smsTimestamp = smsMessage.getTimestampMillis();
            String part = smsMessage.getMessageBody();
            if (part != null) bodyBuilder.append(part);
        }

        String message = bodyBuilder.toString();
        if (message.isEmpty() || !message.startsWith(FILAHA_PREFIX)) return;

        long timestamp = smsTimestamp > 0 ? smsTimestamp : System.currentTimeMillis();

        boolean isAlert = message.contains("|ALERT|");
        boolean isClear = message.contains("|CLEAR|");
        boolean isPowerCut = message.contains("|POWER_CUT|");
        boolean isData = message.endsWith("|OK") && !isAlert && !isClear;

        // Persist to queue for JS to drain when it wakes
        persistToQueue(context, message, sender, timestamp);

        // Suppress system SMS notification for plain data SMS
        if (isData && isOrderedBroadcast()) {
            try { abortBroadcast(); } catch (Exception ignored) {}
        }

        // ── FIRE THE NATIVE ALERT PIPELINE (works even when app is killed) ──
        runAlertPipeline(context, message, isData, isAlert, isClear, isPowerCut);

        // Push to JS for live UI update (mark as already handled)
        emitToJS(message, sender, timestamp, isAlert || isClear);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Native alert pipeline
    // ──────────────────────────────────────────────────────────────────────

    private void runAlertPipeline(Context context, String message,
                                  boolean isData, boolean isAlert,
                                  boolean isClear, boolean isPowerCut) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String contact = prefs.getString("emergency_contact", "").trim();
        boolean autoCall = prefs.getBoolean("auto_call_on_danger", false);
        boolean autoSms = prefs.getBoolean("auto_sms_on_danger", false);
        boolean autoCallPower = prefs.getBoolean("auto_call_on_power_cut", false);

        String deviceId = extractDeviceId(message);

        if (isData) {
            // Threshold check from SharedPreferences
            String thresholdsJson = prefs.getString("thresholds_json", null);
            if (thresholdsJson == null) return;

            Map<String, Double> values = parseSensorValues(message);
            ArrayList<String> dangerLines = new ArrayList<>();
            try {
                JSONObject thresholds = new JSONObject(thresholdsJson);
                String[] keys = {"co2", "nh3", "temp", "hum"};
                String[] units = {"ppm", "ppm", "°C", "%"};
                for (int i = 0; i < keys.length; i++) {
                    String key = keys[i];
                    Double v = values.get(key);
                    if (v == null) continue;
                    JSONObject t = thresholds.optJSONObject(key);
                    if (t == null) continue;
                    double dangerLimit = t.optDouble("danger", Double.MAX_VALUE);
                    if (v >= dangerLimit) {
                        if (cooldownPassed(prefs, deviceId + "-" + key)) {
                            dangerLines.add(label(key) + " " + formatNum(v) + units[i]
                                    + " (≥" + formatNum(dangerLimit) + ")");
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "threshold parse error", e);
            }

            if (!dangerLines.isEmpty()) {
                String alertLabel = prefs.getString("i18n_alertLabel", "DANGER");
                String whatToDo = prefs.getString("i18n_whatToDoLabel", "What to do");
                String checkNow = prefs.getString("i18n_checkNowLabel", "Check the coop NOW");

                // Build action steps based on which sensor breached first
                String primarySensor = dangerLines.size() > 0
                        ? extractFirstSensor(dangerLines.get(0))
                        : "generic";
                String action = actionFor(prefs, primarySensor);

                String body = join(dangerLines, "\n")
                        + "\n\n▶ " + whatToDo + ":\n" + action;
                String title = "🚨 " + deviceId + " — " + alertLabel;
                showAlertNotification(context, title, body, contact, true);

                if (!contact.isEmpty()) {
                    String smsBody = buildSmsBody(deviceId, dangerLines, action, whatToDo);
                    if (autoSms) sendSmsBackground(context, contact, smsBody);
                    if (autoCall) placeBackgroundCall(context, contact);
                }
            }
            return;
        }

        if (isAlert) {
            if (!cooldownPassed(prefs, deviceId + "-alert")) return;
            String subType = parseAlertSubtype(message);
            String sensorKey = parseAlertSensorKey(message);
            String action = actionFor(prefs, sensorKey);
            String whatToDo = prefs.getString("i18n_whatToDoLabel", "What to do");
            String body = subType + "\n\n▶ " + whatToDo + ":\n" + action;

            showAlertNotification(context, "⚠️ " + deviceId + " — " + subType,
                    body, contact, true);
            if (!contact.isEmpty()) {
                boolean shouldCall = isPowerCut ? autoCallPower : autoCall;
                String smsBody = "🚨 Filaha Flock\n"
                        + deviceId + ": " + subType + "\n"
                        + "▶ " + whatToDo + ": " + action + "\n"
                        + new SimpleDateFormat("HH:mm", Locale.US).format(new Date());
                if (autoSms) sendSmsBackground(context, contact, smsBody);
                if (shouldCall) placeBackgroundCall(context, contact);
            }
            return;
        }

        if (isClear) {
            showAlertNotification(context, "✅ " + deviceId,
                    "Sensor readings returned to normal", "", false);
        }
    }

    private static String extractFirstSensor(String dangerLine) {
        // dangerLine format: "CO₂ 3500ppm (≥2500)"
        String lower = dangerLine.toLowerCase();
        if (lower.contains("co₂") || lower.contains("co2")) return "co2";
        if (lower.contains("nh₃") || lower.contains("nh3") || lower.contains("ammon")) return "nh3";
        if (lower.contains("temp")) return "temp";
        if (lower.contains("hum")) return "hum";
        return "generic";
    }

    private static String parseAlertSensorKey(String message) {
        if (message.contains("|NH3|")) return "nh3";
        if (message.contains("|CO2|")) return "co2";
        if (message.contains("|TEMP|")) return "temp";
        if (message.contains("|HUM|")) return "hum";
        if (message.contains("|POWER_CUT|")) return "power_cut";
        if (message.contains("|BATTERY|")) return "battery";
        return "generic";
    }

    private static String actionFor(SharedPreferences prefs, String sensorKey) {
        // Fallback English action steps so notifications always have content
        // even if the JS layer never synced its translations.
        String prefKey;
        String fallback;
        switch (sensorKey == null ? "generic" : sensorKey) {
            case "co2":
                prefKey = "i18n_actionCo2";
                fallback = "Open all vents NOW. Turn on fans. Check ventilation.";
                break;
            case "nh3":
                prefKey = "i18n_actionNh3";
                fallback = "Open vents. Replace wet litter. Reduce density.";
                break;
            case "temp":
                prefKey = "i18n_actionTemp";
                fallback = "Spray roof, run fans, add electrolytes to water.";
                break;
            case "temp_low":
                prefKey = "i18n_actionTempLow";
                fallback = "Turn on heating, close doors, check young chicks.";
                break;
            case "hum":
                prefKey = "i18n_actionHum";
                fallback = "Increase ventilation, fix water leaks, dry litter.";
                break;
            case "power_cut":
                prefKey = "i18n_actionPowerCut";
                fallback = "POWER CUT! Start generator NOW. Watch temperature.";
                break;
            case "battery":
                prefKey = "i18n_actionBattery";
                fallback = "Sensor battery low — replace soon.";
                break;
            default:
                prefKey = "i18n_actionGeneric";
                fallback = "Check the coop immediately.";
        }
        return prefs.getString(prefKey, fallback);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Notification (heads-up + full-screen for emergencies)
    // ──────────────────────────────────────────────────────────────────────

    private static void showAlertNotification(Context context, String title, String body,
                                              String contact, boolean withCallAction) {
        try {
            ensureChannel(context);
            NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
            if (!nmc.areNotificationsEnabled()) {
                Log.w(TAG, "Notifications disabled by user");
                return;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_alert)
                    .setColor(Color.parseColor("#ef4444"))
                    .setContentTitle(title == null ? "Filaha Flock Alert" : title)
                    .setContentText(body == null ? "" : body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true)
                    .setVibrate(new long[]{0, 400, 200, 400, 200, 400})
                    .setLights(Color.RED, 500, 500)
                    .setDefaults(NotificationCompat.DEFAULT_SOUND);

            // Tap → open app
            Intent openIntent = context.getPackageManager()
                    .getLaunchIntentForPackage(context.getPackageName());
            if (openIntent != null) {
                int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                        : PendingIntent.FLAG_UPDATE_CURRENT;
                builder.setContentIntent(PendingIntent.getActivity(context, 1, openIntent, piFlags));
            }

            // "Call Now" action + full-screen intent fallback
            if (withCallAction && contact != null && !contact.isEmpty()) {
                Intent callIntent = new Intent(Intent.ACTION_CALL,
                        Uri.parse("tel:" + contact));
                callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_IMMUTABLE : 0;
                PendingIntent callPending = PendingIntent.getActivity(
                        context, (int) (System.currentTimeMillis() % 10000),
                        callIntent, piFlags);
                builder.addAction(android.R.drawable.ic_menu_call, "Call Now", callPending);
                // Full-screen pops up a heads-up overlay even on lock screen
                builder.setFullScreenIntent(callPending, true);
            }

            int notifId = (int) (System.currentTimeMillis() % 9000) + 100;
            nmc.notify(notifId, builder.build());
            Log.i(TAG, "Notification posted: " + title);
        } catch (Exception e) {
            Log.e(TAG, "notification failed", e);
        }
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager)
                    context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Filaha Flock — poultry farm sensor alerts");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
            ch.enableLights(true);
            ch.setLightColor(Color.RED);
            ch.setShowBadge(true);
            ch.setBypassDnd(true);
            nm.createNotificationChannel(ch);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Background SMS + call
    // ──────────────────────────────────────────────────────────────────────

    private static void sendSmsBackground(Context context, String number, String body) {
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "SEND_SMS not granted, cannot send");
                return;
            }
            String cleaned = number.replaceAll("[^\\d+]", "");
            if (cleaned.isEmpty()) return;

            SmsManager sm;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                sm = context.getSystemService(SmsManager.class);
            } else {
                sm = SmsManager.getDefault();
            }
            if (sm == null) return;

            ArrayList<String> parts = sm.divideMessage(body);
            if (parts.size() == 1) {
                sm.sendTextMessage(cleaned, null, body, null, null);
            } else {
                sm.sendMultipartTextMessage(cleaned, null, parts, null, null);
            }
            Log.i(TAG, "Background SMS sent to " + cleaned);
        } catch (Exception e) {
            Log.e(TAG, "background SMS failed", e);
        }
    }

    private static void placeBackgroundCall(Context context, String number) {
        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "CALL_PHONE not granted, cannot call");
                return;
            }
            String cleaned = number.replaceAll("[^\\d+]", "");
            if (cleaned.isEmpty()) return;
            Intent intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + cleaned));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            Log.i(TAG, "Background call placed to " + cleaned);
        } catch (Exception e) {
            Log.e(TAG, "background call failed", e);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────

    private static Map<String, Double> parseSensorValues(String message) {
        Map<String, Double> result = new HashMap<>();
        String[] parts = message.split("\\|");
        for (String part : parts) {
            int colon = part.indexOf(':');
            if (colon > 0 && colon < part.length() - 1) {
                String key = part.substring(0, colon).toLowerCase().trim();
                String val = part.substring(colon + 1).trim();
                try {
                    result.put(key, Double.parseDouble(val));
                } catch (NumberFormatException ignored) {}
            }
        }
        return result;
    }

    private static boolean cooldownPassed(SharedPreferences prefs, String key) {
        try {
            String json = prefs.getString("last_alerts_json", "{}");
            JSONObject obj = new JSONObject(json);
            long last = obj.optLong(key, 0);
            long now = System.currentTimeMillis();
            if (now - last < DANGER_COOLDOWN_MS) return false;
            obj.put(key, now);
            prefs.edit().putString("last_alerts_json", obj.toString()).apply();
            return true;
        } catch (Exception e) {
            return true;
        }
    }

    private static String parseAlertSubtype(String message) {
        if (message.contains("|NH3|")) return "Ammonia critical";
        if (message.contains("|CO2|")) return "CO2 critical";
        if (message.contains("|TEMP|")) return "Temperature critical";
        if (message.contains("|HUM|")) return "Humidity critical";
        if (message.contains("|POWER_CUT|")) return "Power cut";
        if (message.contains("|BATTERY|")) return "Battery low";
        return "Sensor alert";
    }

    private static String label(String key) {
        switch (key) {
            case "co2": return "CO₂";
            case "nh3": return "NH₃";
            case "temp": return "Temp";
            case "hum": return "Humidity";
            default: return key;
        }
    }

    private static String formatNum(double d) {
        if (d == Math.floor(d) && !Double.isInfinite(d)) {
            return Long.toString((long) d);
        }
        return String.format(Locale.US, "%.1f", d);
    }

    private static String join(ArrayList<String> list, String sep) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(sep);
            sb.append(list.get(i));
        }
        return sb.toString();
    }

    private static String buildSmsBody(String deviceId, ArrayList<String> dangerLines,
                                       String action, String whatToDo) {
        StringBuilder sb = new StringBuilder("🚨 Filaha Flock\n");
        sb.append(deviceId).append(":\n");
        sb.append(join(dangerLines, "\n"));
        sb.append("\n\n▶ ").append(whatToDo == null ? "Action" : whatToDo).append(":\n");
        sb.append(action == null ? "Check the coop now." : action);
        sb.append("\n").append(new SimpleDateFormat("HH:mm", Locale.US).format(new Date()));
        return sb.toString();
    }

    private static String extractDeviceId(String message) {
        try {
            String[] parts = message.split("\\|");
            if (parts.length > 1) return parts[1];
        } catch (Exception ignored) {}
        return "Unknown";
    }

    private void persistToQueue(Context context, String message, String sender, long timestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString(QUEUE_KEY, "[]");
            JSONArray queue;
            try { queue = new JSONArray(existing); } catch (Exception e) { queue = new JSONArray(); }
            JSONObject item = new JSONObject();
            item.put("message", message);
            item.put("sender", sender == null ? "" : sender);
            item.put("timestamp", timestamp);
            queue.put(item);
            while (queue.length() > 200) queue.remove(0);
            prefs.edit().putString(QUEUE_KEY, queue.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "queue persist", e);
        }
    }

    private void emitToJS(String message, String sender, long timestamp, boolean isAlert) {
        if (sReactContext == null) return;
        try {
            WritableMap params = Arguments.createMap();
            params.putString("message", message);
            params.putString("sender", sender == null ? "" : sender);
            params.putDouble("timestamp", (double) timestamp);
            params.putBoolean("nativeHandled", true);
            String eventName = isAlert ? "FilahaSmsAlert" : "FilahaSmsData";
            sReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "emit", e);
        }
    }

    public static String drainQueue(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String queue = prefs.getString(QUEUE_KEY, "[]");
            prefs.edit().remove(QUEUE_KEY).apply();
            return queue;
        } catch (Exception e) {
            return "[]";
        }
    }
}
