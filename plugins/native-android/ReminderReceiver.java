package com.filaha;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Receives daily-reminder broadcasts scheduled by AlarmManager.
 * Fires a notification with the configured title/body.
 *
 * Registered in AndroidManifest.xml via the withFilahaSms plugin.
 */
public class ReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "FilahaReminder";
    private static final String CHANNEL_ID = "filaha_reminders";
    private static final String CHANNEL_NAME = "Filaha Flock Daily Reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            int id = intent.getIntExtra("notifId", 7000);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager nm = (NotificationManager)
                        context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    NotificationChannel ch = new NotificationChannel(
                            CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT);
                    ch.setDescription("Daily routine reminders from Filaha Flock");
                    ch.enableVibration(true);
                    ch.setLightColor(Color.BLUE);
                    nm.createNotificationChannel(ch);
                }
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_popup_reminder)
                    .setColor(Color.parseColor("#3b82f6"))
                    .setContentTitle(title == null ? "Filaha Flock" : title)
                    .setContentText(body == null ? "" : body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setAutoCancel(true);

            // Open app on tap
            Intent openIntent = context.getPackageManager()
                    .getLaunchIntentForPackage(context.getPackageName());
            if (openIntent != null) {
                int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                        : PendingIntent.FLAG_UPDATE_CURRENT;
                PendingIntent openPending = PendingIntent.getActivity(context, 1, openIntent, piFlags);
                builder.setContentIntent(openPending);
            }

            NotificationManagerCompat nmc = NotificationManagerCompat.from(context);
            if (nmc.areNotificationsEnabled()) {
                nmc.notify(id, builder.build());
                Log.i(TAG, "Reminder fired: " + title);
            }
        } catch (Exception e) {
            Log.e(TAG, "ReminderReceiver error", e);
        }
    }
}
