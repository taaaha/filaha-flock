package com.filaha;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Restarts the foreground monitoring service after a device reboot (or an
 * app update) so Filaha keeps watching without the farmer having to open
 * the app.
 *
 * Note: the SMS alert pipeline (SmsReceiver) is a static manifest receiver
 * and ALREADY survives reboot on its own — Android delivers SMS_RECEIVED to
 * it even with the app killed. This receiver brings back the persistent
 * watchdog service; the smart daily digest is re-armed by JS on next open.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "FilahaBoot";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String action = intent != null ? intent.getAction() : null;
            if (action == null) return;
            if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                    && !"android.intent.action.QUICKBOOT_POWERON".equals(action)
                    && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
                return;
            }

            Intent svc = new Intent(context, FilahaMonitorService.class);
            svc.putExtra("title", "Filaha Flock");
            svc.putExtra("body", "");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(svc);
            } else {
                context.startService(svc);
            }
            Log.i(TAG, "Monitoring service restarted after: " + action);
        } catch (Exception e) {
            Log.e(TAG, "BootReceiver error", e);
        }
    }
}
