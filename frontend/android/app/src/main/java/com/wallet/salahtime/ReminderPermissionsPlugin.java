package com.wallet.salahtime;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Battery-optimisation exemption for reliable azan alarms. OEM battery savers otherwise put
 * the app to sleep after a day or two and Android drops its scheduled alarms.
 */
@CapacitorPlugin(name = "ReminderPermissions")
public class ReminderPermissionsPlugin extends Plugin {

    @PluginMethod
    public void getBatteryOptimizationStatus(PluginCall call) {
        call.resolve(buildStatus());
    }

    @SuppressLint("BatteryLife")
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || isIgnoringBatteryOptimizations()) {
            call.resolve(buildStatus());
            return;
        }

        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));

        try {
            startActivityForResult(call, intent, "onBatteryOptimizationResult");
        } catch (ActivityNotFoundException primaryError) {
            // Some OEM builds drop the direct prompt; fall back to the system list screen.
            try {
                startActivityForResult(
                        call,
                        new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                        "onBatteryOptimizationResult"
                );
            } catch (ActivityNotFoundException fallbackError) {
                call.resolve(buildStatus());
            }
        }
    }

    @ActivityCallback
    private void onBatteryOptimizationResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        call.resolve(buildStatus());
    }

    private JSObject buildStatus() {
        JSObject status = new JSObject();
        status.put("ignoring", isIgnoringBatteryOptimizations());
        // Lets the UI show an Autostart hint on OEMs (Xiaomi, Oppo, Vivo...) that kill background apps.
        status.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase());
        return status;
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return powerManager != null && powerManager.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }
}
