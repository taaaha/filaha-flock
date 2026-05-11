package com.filaha;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Persistent foreground service that keeps Filaha Flock alive while monitoring.
 * Shows a low-priority persistent notification so Android does NOT kill the
 * process. SMS broadcasts and alarms continue to fire normally because the
 * app is never put into "stopped" state.
 */
public class FilahaMonitorService extends Service {
    private static final String TAG = "FilahaMonitor";
    private static final String CHANNEL_ID = "filaha_monitor";
    private static final String CHANNEL_NAME = "Filaha Flock Monitoring";
    private static final int NOTIFICATION_ID = 9000;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null ? intent.getStringExtra("title") : null;
        String body = intent != null ? intent.getStringExtra("body") : null;
        startForeground(NOTIFICATION_ID, buildNotification(title, body));
        // START_STICKY: if the system kills us, restart with a null intent
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private Notification buildNotification(String title, String body) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager)
                    getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("Background monitoring keeps the app alert-ready");
                ch.setShowBadge(false);
                ch.enableVibration(false);
                nm.createNotificationChannel(ch);
            }
        }

        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent openPending = null;
        if (openIntent != null) {
            int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                    : PendingIntent.FLAG_UPDATE_CURRENT;
            openPending = PendingIntent.getActivity(this, 0, openIntent, piFlags);
        }

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_view)
                .setColor(Color.parseColor("#3b82f6"))
                .setContentTitle(title == null ? "Filaha Flock" : title)
                .setContentText(body == null ? "Monitoring is active" : body)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setOngoing(true)
                .setShowWhen(false);
        if (openPending != null) b.setContentIntent(openPending);
        return b.build();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Re-schedule self so we survive swipe-from-recents on some vendors
        Intent restart = new Intent(getApplicationContext(), FilahaMonitorService.class);
        restart.setPackage(getPackageName());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getApplicationContext().startForegroundService(restart);
        } else {
            getApplicationContext().startService(restart);
        }
        super.onTaskRemoved(rootIntent);
    }
}
