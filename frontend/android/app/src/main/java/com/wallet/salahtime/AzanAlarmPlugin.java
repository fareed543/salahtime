package com.wallet.salahtime;

import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * CR-017 bridge: JS hands over the salah azan alarms; Android rings them as alarms (full-screen when
 * locked, heads-up with Stop when in use).
 */
@CapacitorPlugin(name = "AzanAlarm")
public class AzanAlarmPlugin extends Plugin {

    /** { alarms: [{ id, at (ms), title, body, city, timeLabel, sound, stopLabel, swipeLabel }] } — replaces all. */
    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray alarms = call.getArray("alarms", new JSArray());
        AzanAlarmScheduler.replaceAll(getContext(), alarms == null ? new JSONArray() : alarms);
        JSObject result = new JSObject();
        result.put("count", AzanAlarmScheduler.count(getContext()));
        call.resolve(result);
    }

    /** The azan alarms still waiting to ring: [{ id, at, title }]. */
    @PluginMethod
    public void list(PluginCall call) {
        JSONArray stored = AzanAlarmScheduler.stored(getContext());
        JSArray alarms = new JSArray();
        for (int i = 0; i < stored.length(); i++) {
            JSONObject alarm = stored.optJSONObject(i);
            if (alarm != null) {
                JSObject item = new JSObject();
                item.put("id", alarm.optInt("id"));
                item.put("at", alarm.optLong("at"));
                item.put("title", alarm.optString("title"));
                alarms.put(item);
            }
        }
        JSObject result = new JSObject();
        result.put("alarms", alarms);
        call.resolve(result);
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        AzanAlarmScheduler.cancelAll(getContext());
        call.resolve();
    }

    /** Rings one alarm now (Settings → Test azan). */
    @PluginMethod
    public void test(PluginCall call) {
        JSObject alarm = call.getObject("alarm", new JSObject());
        try {
            JSONObject payload = new JSONObject(alarm.toString());
            payload.put("id", 77999);
            payload.put("at", System.currentTimeMillis());
            AzanAlarmService.start(getContext(), payload.toString());
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to start the azan alarm", error);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AzanAlarmService.stop(getContext());
        call.resolve();
    }

    /** Android 14+: whether the app may show the full-screen alarm over the lock screen. */
    @PluginMethod
    public void getFullScreenStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", canUseFullScreenIntent());
        call.resolve(result);
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 34) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                    .setData(Uri.parse("package:" + getContext().getPackageName()))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
            } catch (ActivityNotFoundException error) {
                getContext().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        .setData(Uri.parse("package:" + getContext().getPackageName()))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            }
        }
        call.resolve();
    }

    private boolean canUseFullScreenIntent() {
        if (Build.VERSION.SDK_INT < 34) {
            return true;
        }
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        return manager == null || manager.canUseFullScreenIntent();
    }
}
