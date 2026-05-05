package com.filaha;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SmsPackage implements ReactPackage {

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

        public SmsModule(ReactApplicationContext reactContext) {
            super(reactContext);
        }

        @NonNull
        @Override
        public String getName() {
            return "FilahaSms";
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
    }
}
