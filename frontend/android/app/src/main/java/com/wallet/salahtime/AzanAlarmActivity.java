package com.wallet.salahtime;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import org.json.JSONObject;

import java.lang.ref.WeakReference;

/**
 * CR-017: full-screen azan alarm shown over the lock screen — large time, prayer name, city and one
 * Stop button. Closed by Stop, Back, or when the service stops (1 minute / end of azan).
 */
public class AzanAlarmActivity extends Activity {
    private static WeakReference<AzanAlarmActivity> showing = new WeakReference<>(null);

    static void finishIfShowing() {
        AzanAlarmActivity activity = showing.get();
        if (activity != null) {
            activity.runOnUiThread(activity::finish);
        }
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        setContentView(R.layout.activity_azan_alarm);
        showing = new WeakReference<>(this);

        JSONObject alarm = AzanAlarmService.current;
        if (alarm == null) {
            // Nothing ringing any more (opened late from the notification shade).
            finish();
            return;
        }
        if (!AzanAlarmService.playing) {
            // Fallback path: the receiver could not start the service from the background; we can.
            try {
                AzanAlarmService.start(this, alarm.toString());
            } catch (Exception ignored) {
                // Still show the screen so the user sees the prayer time.
            }
        }

        ((TextView) findViewById(R.id.azan_alarm_prayer)).setText(alarm.optString("title"));
        String city = alarm.optString("city");
        TextView cityView = findViewById(R.id.azan_alarm_city);
        cityView.setText(city);
        cityView.setVisibility(city.isEmpty() ? TextView.GONE : TextView.VISIBLE);

        Button stop = findViewById(R.id.azan_alarm_stop);
        stop.setText(alarm.optString("stopLabel", getString(R.string.azan_alarm_stop)));
        stop.setOnClickListener(view -> stopAndClose());
    }

    @Override
    public void onBackPressed() {
        stopAndClose();
    }

    @Override
    protected void onDestroy() {
        if (showing.get() == this) {
            showing = new WeakReference<>(null);
        }
        super.onDestroy();
    }

    private void stopAndClose() {
        AzanAlarmService.stop(this);
        finish();
    }

    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            // The phone stays locked: the alarm shows over the lock screen and Stop works without unlocking.
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Light status / navigation bar icons on the dark alarm background.
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
    }
}
