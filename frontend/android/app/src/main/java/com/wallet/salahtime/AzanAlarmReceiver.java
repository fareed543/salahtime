package com.wallet.salahtime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import org.json.JSONObject;

/** CR-017: an azan alarm is due — start the ringing service. */
public class AzanAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String json = intent.getStringExtra(AzanAlarmScheduler.EXTRA_ALARM);
        if (json == null) {
            return;
        }
        try {
            AzanAlarmScheduler.forget(context, new JSONObject(json).optInt("id"));
        } catch (Exception ignored) {
            // Bad payload: still try to ring.
        }
        try {
            AzanAlarmService.start(context, json);
        } catch (Exception error) {
            // Android refused a background foreground-service start: show the alarm notification;
            // its full-screen activity starts the sound itself (an activity on screen may start the service).
            Log.w("AzanAlarm", "Foreground service start refused; posting alarm notification", error);
            AzanAlarmService.postAlarmNotificationOnly(context, json);
        }
    }
}
