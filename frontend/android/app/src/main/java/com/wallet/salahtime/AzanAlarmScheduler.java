package com.wallet.salahtime;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * CR-017: stores the azan alarms set from JS and arms them with AlarmManager. The list is kept in
 * SharedPreferences so AlarmBootReceiver can arm them again after a reboot, app update or clock change.
 */
public final class AzanAlarmScheduler {
    private static final String TAG = "AzanAlarm";
    private static final String PREFS = "azan_alarms";
    private static final String KEY_ALARMS = "alarms";
    /** Kept so cancelAll() can cancel PendingIntents even after the stored list was replaced. */
    private static final String KEY_ARMED_IDS = "armed_ids";

    public static final String EXTRA_ALARM = "azanAlarm";

    private AzanAlarmScheduler() {}

    /** Replaces every stored alarm with {@code alarms} and arms the future ones. */
    public static synchronized void replaceAll(Context context, JSONArray alarms) {
        cancelArmed(context);
        long now = System.currentTimeMillis();
        JSONArray kept = new JSONArray();
        JSONArray armedIds = new JSONArray();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject alarm = alarms.optJSONObject(i);
            if (alarm == null || alarm.optLong("at") <= now) {
                continue;
            }
            arm(context, alarm);
            kept.put(alarm);
            armedIds.put(alarm.optInt("id"));
        }
        prefs(context).edit()
                .putString(KEY_ALARMS, kept.toString())
                .putString(KEY_ARMED_IDS, armedIds.toString())
                .apply();
    }

    public static synchronized void cancelAll(Context context) {
        cancelArmed(context);
        prefs(context).edit().remove(KEY_ALARMS).remove(KEY_ARMED_IDS).apply();
    }

    /** Arms the stored alarms again (boot, app update, time / time zone change). */
    public static synchronized void rearm(Context context) {
        replaceAll(context, stored(context));
    }

    /** Drops an alarm from the stored list once it has rung. */
    public static synchronized void forget(Context context, int id) {
        JSONArray all = stored(context);
        JSONArray kept = new JSONArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject alarm = all.optJSONObject(i);
            if (alarm != null && alarm.optInt("id") != id) {
                kept.put(alarm);
            }
        }
        prefs(context).edit().putString(KEY_ALARMS, kept.toString()).apply();
    }

    public static int count(Context context) {
        return stored(context).length();
    }

    private static void arm(Context context, JSONObject alarm) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        PendingIntent pending = pendingIntent(context, alarm.optInt("id"), alarm.toString());
        long at = alarm.optLong("at");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
                // Without "Alarms & reminders" the azan may be a few minutes late, but it still rings in Doze.
                manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            } else {
                manager.setExact(AlarmManager.RTC_WAKEUP, at, pending);
            }
        } catch (SecurityException error) {
            Log.w(TAG, "Exact alarm refused; using inexact", error);
            manager.set(AlarmManager.RTC_WAKEUP, at, pending);
        }
    }

    private static void cancelArmed(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) {
            return;
        }
        try {
            JSONArray ids = new JSONArray(prefs(context).getString(KEY_ARMED_IDS, "[]"));
            for (int i = 0; i < ids.length(); i++) {
                PendingIntent pending = pendingIntent(context, ids.optInt(i), null);
                manager.cancel(pending);
                pending.cancel();
            }
        } catch (JSONException ignored) {
            // Corrupt list: nothing to cancel.
        }
    }

    private static PendingIntent pendingIntent(Context context, int id, String alarmJson) {
        Intent intent = new Intent(context, AzanAlarmReceiver.class);
        intent.setAction("com.wallet.salahtime.AZAN_ALARM_" + id);
        if (alarmJson != null) {
            intent.putExtra(EXTRA_ALARM, alarmJson);
        }
        return PendingIntent.getBroadcast(
                context, id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static JSONArray stored(Context context) {
        try {
            return new JSONArray(prefs(context).getString(KEY_ALARMS, "[]"));
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
