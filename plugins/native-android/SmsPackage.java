package com.filaha;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.ViewManager;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SmsPackage implements ReactPackage {
    private static final String TAG = "FilahaSmsPackage";

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        SmsReceiver.setReactContext(reactContext);
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SmsModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    public static class SmsModule extends ReactContextBaseJavaModule {
        private static final String CHANNEL_ID = "filaha_alerts";
        private static final String CHANNEL_NAME = "Filaha Flock Alerts";

        public SmsModule(ReactApplicationContext reactContext) {
            super(reactContext);
        }

        @NonNull
        @Override
        public String getName() {
            return "FilahaSms";
        }

        // Bump this string whenever native code changes so JS can detect
        // when the installed APK is older than the JS code expects.
        private static final String NATIVE_VERSION = "v4-2026-05-06";

        @ReactMethod
        public void getNativeVersion(Promise promise) {
            promise.resolve(NATIVE_VERSION);
        }

        @ReactMethod
        public void drainQueue(Promise promise) {
            try {
                String queue = SmsReceiver.drainQueue(getReactApplicationContext());
                promise.resolve(queue);
            } catch (Exception e) {
                promise.reject("DRAIN_ERROR", e.getMessage());
            }
        }

        @ReactMethod
        public void isIgnoringBatteryOptimizations(Promise promise) {
            try {
                Context context = getReactApplicationContext();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(context.getPackageName());
                    promise.resolve(ignoring);
                } else {
                    promise.resolve(true);
                }
            } catch (Exception e) {
                promise.reject("BATTERY_CHECK_ERROR", e.getMessage());
            }
        }

        @ReactMethod
        public void requestIgnoreBatteryOptimizations(Promise promise) {
            try {
                Context context = getReactApplicationContext();
                Intent intent = new Intent();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                } else {
                    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("BATTERY_OPT_ERROR", e.getMessage());
            }
        }

        /**
         * Directly initiate a phone call (no dialer UI). Requires CALL_PHONE permission.
         */
        @ReactMethod
        public void makeDirectCall(String number, Promise promise) {
            try {
                Context context = getReactApplicationContext();
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE)
                        != PackageManager.PERMISSION_GRANTED) {
                    promise.reject("PERMISSION_DENIED", "CALL_PHONE not granted");
                    return;
                }
                String cleaned = number.replaceAll("[^\\d+]", "");
                if (cleaned.isEmpty()) {
                    promise.reject("INVALID_NUMBER", "Phone number is empty");
                    return;
                }
                Intent intent = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + cleaned));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                Activity activity = getCurrentActivity();
                if (activity != null) {
                    activity.startActivity(intent);
                } else {
                    context.startActivity(intent);
                }
                Log.i(TAG, "makeDirectCall: dialed " + cleaned);
                promise.resolve(true);
            } catch (Exception e) {
                Log.e(TAG, "makeDirectCall failed", e);
                promise.reject("CALL_ERROR", e.getMessage());
            }
        }

        /**
         * Send an SMS via SmsManager. Requires SEND_SMS permission.
         */
        @ReactMethod
        public void sendSms(String number, String message, Promise promise) {
            try {
                Context context = getReactApplicationContext();
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
                        != PackageManager.PERMISSION_GRANTED) {
                    promise.reject("PERMISSION_DENIED", "SEND_SMS not granted");
                    return;
                }
                String cleaned = number.replaceAll("[^\\d+]", "");
                if (cleaned.isEmpty()) {
                    promise.reject("INVALID_NUMBER", "Phone number is empty");
                    return;
                }
                if (message == null) message = "";

                SmsManager smsManager;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    smsManager = context.getSystemService(SmsManager.class);
                } else {
                    smsManager = SmsManager.getDefault();
                }
                if (smsManager == null) {
                    promise.reject("SMS_MANAGER_NULL", "SmsManager unavailable");
                    return;
                }

                ArrayList<String> parts = smsManager.divideMessage(message);
                if (parts.size() == 1) {
                    smsManager.sendTextMessage(cleaned, null, message, null, null);
                } else {
                    smsManager.sendMultipartTextMessage(cleaned, null, parts, null, null);
                }
                Log.i(TAG, "sendSms: sent to " + cleaned + " (" + parts.size() + " parts)");
                promise.resolve(true);
            } catch (Exception e) {
                Log.e(TAG, "sendSms failed", e);
                promise.reject("SMS_SEND_ERROR", e.getMessage());
            }
        }

        @ReactMethod
        public void saveEmergencyContact(String number, Promise promise) {
            try {
                SharedPreferences prefs = getReactApplicationContext()
                        .getSharedPreferences(SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString("emergency_contact", number == null ? "" : number.trim()).apply();
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("SAVE_CONTACT_ERROR", e.getMessage());
            }
        }

        /**
         * Syncs all alert config (thresholds + settings) to SharedPreferences
         * so SmsReceiver can use them when SMS arrives — even when app is killed.
         */
        @ReactMethod
        public void setAlertConfig(ReadableMap config, Promise promise) {
            try {
                Context context = getReactApplicationContext();
                SharedPreferences prefs = context.getSharedPreferences(
                        SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();

                if (config.hasKey("emergencyContact") && !config.isNull("emergencyContact")) {
                    editor.putString("emergency_contact",
                            config.getString("emergencyContact"));
                }
                if (config.hasKey("autoCallOnDanger")) {
                    editor.putBoolean("auto_call_on_danger",
                            config.getBoolean("autoCallOnDanger"));
                }
                if (config.hasKey("autoSmsOnDanger")) {
                    editor.putBoolean("auto_sms_on_danger",
                            config.getBoolean("autoSmsOnDanger"));
                }
                if (config.hasKey("autoCallOnPowerCut")) {
                    editor.putBoolean("auto_call_on_power_cut",
                            config.getBoolean("autoCallOnPowerCut"));
                }
                if (config.hasKey("thresholds") && !config.isNull("thresholds")) {
                    ReadableMap thresholds = config.getMap("thresholds");
                    JSONObject json = new JSONObject();
                    String[] keys = {"co2", "nh3", "temp", "hum"};
                    for (String key : keys) {
                        if (thresholds.hasKey(key) && !thresholds.isNull(key)) {
                            ReadableMap sensor = thresholds.getMap(key);
                            JSONObject sensorJson = new JSONObject();
                            if (sensor.hasKey("warn"))
                                sensorJson.put("warn", sensor.getDouble("warn"));
                            if (sensor.hasKey("danger"))
                                sensorJson.put("danger", sensor.getDouble("danger"));
                            json.put(key, sensorJson);
                        }
                    }
                    editor.putString("thresholds_json", json.toString());
                }
                editor.apply();
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("CONFIG_ERROR", e.getMessage());
            }
        }

        @ReactMethod
        public void areNotificationsEnabled(Promise promise) {
            try {
                Context context = getReactApplicationContext();
                NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
                promise.resolve(nmc.areNotificationsEnabled());
            } catch (Exception e) {
                promise.resolve(false);
            }
        }

        /**
         * Posts a heads-up notification triggered from JS.
         */
        @ReactMethod
        public void showAlertNotification(String title, String body, boolean withCallAction, Promise promise) {
            try {
                Context context = getReactApplicationContext();

                // Ensure channel is created
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationManager nm = (NotificationManager)
                            context.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        NotificationChannel ch = new NotificationChannel(
                                CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
                        ch.setDescription("Filaha Flock — poultry farm sensor alerts");
                        ch.enableVibration(true);
                        ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
                        ch.enableLights(true);
                        ch.setLightColor(Color.RED);
                        ch.setShowBadge(true);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            ch.setAllowBubbles(true);
                        }
                        nm.createNotificationChannel(ch);
                    }
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

                if (withCallAction) {
                    SharedPreferences prefs = context.getSharedPreferences(
                            SmsReceiver.PREFS_NAME, Context.MODE_PRIVATE);
                    String contact = prefs.getString("emergency_contact", "").trim();
                    if (!contact.isEmpty()) {
                        Intent callIntent = new Intent(Intent.ACTION_CALL,
                                Uri.parse("tel:" + contact));
                        callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                                ? PendingIntent.FLAG_IMMUTABLE : 0;
                        PendingIntent callPending = PendingIntent.getActivity(
                                context, (int) (System.currentTimeMillis() % 10000),
                                callIntent, piFlags);
                        builder.addAction(android.R.drawable.ic_menu_call,
                                "Call Now", callPending);
                    }
                }

                Intent openIntent = context.getPackageManager()
                        .getLaunchIntentForPackage(context.getPackageName());
                if (openIntent != null) {
                    int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                            ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                            : PendingIntent.FLAG_UPDATE_CURRENT;
                    PendingIntent openPending = PendingIntent.getActivity(
                            context, 1, openIntent, piFlags);
                    builder.setContentIntent(openPending);
                }

                NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
                if (!nmc.areNotificationsEnabled()) {
                    Log.w(TAG, "Notifications are disabled by user");
                    promise.reject("NOTIFICATIONS_DISABLED", "User has disabled notifications");
                    return;
                }
                int notifId = (int) (System.currentTimeMillis() % 9000) + 2000;
                nmc.notify(notifId, builder.build());
                Log.i(TAG, "showAlertNotification: posted '" + title + "'");
                promise.resolve(true);
            } catch (Exception e) {
                Log.e(TAG, "showAlertNotification failed", e);
                promise.reject("NOTIFICATION_ERROR", e.getMessage());
            }
        }
    }
}
