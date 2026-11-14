package com.wallet.salahtime;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/**
 * CR-017: rings one azan alarm. Plays the azan at alarm volume, shows the alarm notification (full-screen
 * alarm when the phone is locked, heads-up with Stop when in use) and stops after 1 minute, on Stop,
 * on swipe or when the notification is tapped.
 */
public class AzanAlarmService extends Service {
    private static final String TAG = "AzanAlarm";
    public static final String CHANNEL_ID = "salah_alarm_v1";
    public static final int NOTIFICATION_ID = 77001;
    private static final long AUTO_STOP_MS = 60_000L;

    private static final String ACTION_START = "com.wallet.salahtime.AZAN_ALARM_START";
    public static final String ACTION_STOP = "com.wallet.salahtime.AZAN_ALARM_STOP";
    private static final String EXTRA_JSON = "json";
    /** True when stopped by the user; false when it timed out (the notification then stays, silent). */
    private static final String EXTRA_BY_USER = "byUser";

    /** The alarm currently ringing, or null. Read by AzanAlarmActivity. */
    @Nullable
    static volatile JSONObject current;
    /** True while the service is playing the azan. */
    static volatile boolean playing;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable autoStop = () -> stopAlarm(false);
    @Nullable private MediaPlayer player;
    @Nullable private PowerManager.WakeLock wakeLock;

    public static void start(Context context, String alarmJson) {
        Intent intent = new Intent(context, AzanAlarmService.class)
                .setAction(ACTION_START)
                .putExtra(EXTRA_JSON, alarmJson);
        ContextCompat.startForegroundService(context, intent);
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, AzanAlarmService.class)
                .setAction(ACTION_STOP)
                .putExtra(EXTRA_BY_USER, true);
        try {
            context.startService(intent);
        } catch (Exception error) {
            // Service not running and app in background: just clear what is on screen.
            cancelNotification(context);
            current = null;
            AzanAlarmActivity.finishIfShowing();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopAlarm(intent.getBooleanExtra(EXTRA_BY_USER, true));
            return START_NOT_STICKY;
        }

        JSONObject alarm = parse(intent == null ? null : intent.getStringExtra(EXTRA_JSON));
        if (alarm == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        // A new alarm replaces one still ringing.
        releasePlayer();
        handler.removeCallbacks(autoStop);
        current = alarm;

        Notification notification = buildAlarmNotification(this, alarm, true);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);

        acquireWakeLock();
        play(alarm.optString("sound"));
        handler.postDelayed(autoStop, AUTO_STOP_MS);
        return START_NOT_STICKY;
    }

    private void stopAlarm(boolean byUser) {
        handler.removeCallbacks(autoStop);
        releasePlayer();
        JSONObject alarm = current;
        current = null;
        AzanAlarmActivity.finishIfShowing();

        if (byUser || alarm == null) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
            cancelNotification(this);
        } else {
            // Timed out: keep a silent "time has started" notification the user can still read.
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, buildAlarmNotification(this, alarm, false));
            }
        }
        releaseWakeLock();
        stopSelf();
    }

    private void play(String soundName) {
        int resId = soundName.isEmpty() ? 0 : getResources().getIdentifier(soundName, "raw", getPackageName());
        if (resId == 0) {
            resId = getResources().getIdentifier("adhan_makkah", "raw", getPackageName());
        }
        try {
            MediaPlayer mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            mediaPlayer.setDataSource(this, Uri.parse("android.resource://" + getPackageName() + "/" + resId));
            mediaPlayer.setOnCompletionListener(mp -> stopAlarm(false));
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopAlarm(false);
                return true;
            });
            mediaPlayer.prepare();
            mediaPlayer.start();
            player = mediaPlayer;
            playing = true;
        } catch (Exception error) {
            Log.w(TAG, "Unable to play azan", error);
        }
    }

    private void releasePlayer() {
        playing = false;
        if (player != null) {
            try {
                player.stop();
            } catch (IllegalStateException ignored) {
                // Already stopped.
            }
            player.release();
            player = null;
        }
    }

    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null && wakeLock == null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "salahtime:azanAlarm");
            wakeLock.acquire(AUTO_STOP_MS + 10_000L);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(autoStop);
        releasePlayer();
        releaseWakeLock();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /* ------------------------------------------------------------------ */
    /* Notification                                                         */
    /* ------------------------------------------------------------------ */

    /** Fallback when the service may not start: the full-screen activity starts the sound itself. */
    static void postAlarmNotificationOnly(Context context, String alarmJson) {
        JSONObject alarm = parse(alarmJson);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (alarm == null || manager == null) {
            return;
        }
        current = alarm;
        manager.notify(NOTIFICATION_ID, buildAlarmNotification(context, alarm, true));
    }

    static Notification buildAlarmNotification(Context context, JSONObject alarm, boolean ringing) {
        ensureChannel(context);
        String title = alarm.optString("title", "Salah");
        String time = alarm.optString("timeLabel");
        String stopLabel = alarm.optString("stopLabel", "Stop");
        String swipeLabel = alarm.optString("swipeLabel", "Swipe to stop");

        PendingIntent stopIntent = PendingIntent.getService(
                context, 1,
                new Intent(context, AzanAlarmService.class).setAction(ACTION_STOP).putExtra(EXTRA_BY_USER, true),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        // Tapping the body opens the app; MainActivity stops the alarm when it sees this action.
        PendingIntent openIntent = PendingIntent.getActivity(
                context, 2,
                new Intent(context, MainActivity.class)
                        .setAction(ACTION_STOP)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_salah)
                .setColor(Color.parseColor("#195147"))
                .setContentTitle(title)
                .setContentIntent(openIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setShowWhen(false);

        if (ringing) {
            PendingIntent fullScreen = PendingIntent.getActivity(
                    context, 3,
                    new Intent(context, AzanAlarmActivity.class)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            builder.setContentText(time.isEmpty() ? swipeLabel : time + " · " + swipeLabel)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setOngoing(false)
                    .setAutoCancel(true)
                    .setDeleteIntent(stopIntent)
                    .setFullScreenIntent(fullScreen, true)
                    .addAction(0, stopLabel, stopIntent);
        } else {
            builder.setContentText(alarm.optString("body"))
                    .setCategory(NotificationCompat.CATEGORY_REMINDER)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setOnlyAlertOnce(true)
                    .setSilent(true)
                    .setAutoCancel(true);
        }
        return builder.build();
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
            return;
        }
        // Silent channel: the azan is played by MediaPlayer so Stop can end it at once.
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, context.getString(R.string.azan_alarm_channel_name), NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(context.getString(R.string.azan_alarm_channel_description));
        channel.setSound(null, null);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 400, 300, 400});
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setBypassDnd(true);
        manager.createNotificationChannel(channel);
    }

    static void cancelNotification(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.cancel(NOTIFICATION_ID);
        }
    }

    @Nullable
    private static JSONObject parse(@Nullable String json) {
        if (json == null) {
            return null;
        }
        try {
            return new JSONObject(json);
        } catch (Exception error) {
            return null;
        }
    }
}
