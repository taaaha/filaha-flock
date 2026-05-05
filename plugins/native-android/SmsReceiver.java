package com.filaha;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONArray;
import org.json.JSONObject;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "FilahaSmsReceiver";
    private static final String FILAHA_PREFIX = "FILAHA";
    private static final String QUEUE_KEY = "filaha_sms_queue";
    private static final String PREFS_NAME = "filaha_prefs";

    private static ReactApplicationContext sReactContext;

    public static void setReactContext(ReactApplicationContext context) {
        sReactContext = context;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            Bundle bundle = intent.getExtras();
            if (bundle == null) {
                return;
            }

            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus == null || pdus.length == 0) {
                return;
            }

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

                if (sender == null) {
                    sender = smsMessage.getOriginatingAddress();
                }
                if (smsTimestamp == 0) {
                    smsTimestamp = smsMessage.getTimestampMillis();
                }
                String part = smsMessage.getMessageBody();
                if (part != null) {
                    bodyBuilder.append(part);
                }
            }

            String message = bodyBuilder.toString();
            if (message.isEmpty()) {
                return;
            }
            if (!message.startsWith(FILAHA_PREFIX)) {
                return;
            }

            long timestamp = smsTimestamp > 0 ? smsTimestamp : System.currentTimeMillis();
            boolean isData = message.endsWith("|OK");
            boolean isAlertOrClear = message.contains("|ALERT|") || message.contains("|CLEAR|");

            // Persist to queue first so JS can recover even if app was killed
            persistToQueue(context, message, sender, timestamp);

            // Suppress system notification only for ordinary data SMS
            if (isData && !isAlertOrClear && isOrderedBroadcast()) {
                try {
                    abortBroadcast();
                } catch (Exception ignored) {
                    // Some Android variants do not allow aborting; ignore
                }
            }

            // Emit to JS if React context is available
            emitToJS(message, sender, timestamp, isAlertOrClear);

        } catch (Exception e) {
            Log.e(TAG, "Error processing SMS", e);
        }
    }

    private void persistToQueue(Context context, String message, String sender, long timestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString(QUEUE_KEY, "[]");
            JSONArray queue;
            try {
                queue = new JSONArray(existing);
            } catch (Exception e) {
                queue = new JSONArray();
            }

            JSONObject item = new JSONObject();
            item.put("message", message);
            item.put("sender", sender == null ? "" : sender);
            item.put("timestamp", timestamp);
            queue.put(item);

            // Cap queue at 200 entries
            while (queue.length() > 200) {
                queue.remove(0);
            }

            prefs.edit().putString(QUEUE_KEY, queue.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error persisting SMS to queue", e);
        }
    }

    private void emitToJS(String message, String sender, long timestamp, boolean isAlert) {
        if (sReactContext == null) {
            return;
        }
        try {
            WritableMap params = Arguments.createMap();
            params.putString("message", message);
            params.putString("sender", sender == null ? "" : sender);
            params.putDouble("timestamp", (double) timestamp);

            String eventName = isAlert ? "FilahaSmsAlert" : "FilahaSmsData";
            sReactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Error emitting SMS event to JS", e);
        }
    }

    public static String drainQueue(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String queue = prefs.getString(QUEUE_KEY, "[]");
            prefs.edit().remove(QUEUE_KEY).apply();
            return queue;
        } catch (Exception e) {
            Log.e(TAG, "Error draining queue", e);
            return "[]";
        }
    }
}
