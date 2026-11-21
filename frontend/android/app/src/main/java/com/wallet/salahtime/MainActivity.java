package com.wallet.salahtime;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AlertDialog;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private AlertDialog exitConfirmationDialog;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        registerPlugin(UpdateInstallerPlugin.class);
        registerPlugin(ReminderPermissionsPlugin.class);
        registerPlugin(AzanAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        stopAzanIfRequested(getIntent());

        // Android 15+ draws the app edge to edge (targetSdk 35+): keep the web view clear of the status bar,
        // the navigation bar (Back / Home / Recents buttons or the gesture bar), side bars in landscape and
        // the keyboard. Each phone reports its own sizes, so gesture phones lose only a thin strip.
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, insets) -> {
            Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return insets;
        });
        // The strip behind the navigation bar shows the white window background: dark buttons on it.
        WindowCompat.getInsetsController(getWindow(), decorView).setAppearanceLightNavigationBars(true);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        stopAzanIfRequested(intent);
    }

    /** CR-017: tapping the azan alarm notification opens the app and stops the azan. */
    private void stopAzanIfRequested(Intent intent) {
        if (intent != null && AzanAlarmService.ACTION_STOP.equals(intent.getAction())) {
            AzanAlarmService.stop(this);
        }
    }

    @Override
    public void onBackPressed() {
        showExitConfirmationDialog();
    }

    private void showExitConfirmationDialog() {
        if (isFinishing() || isDestroyed()
                || (exitConfirmationDialog != null && exitConfirmationDialog.isShowing())) {
            return;
        }

        // Use a complete dialog theme so splash/activity backgrounds cannot leak into its views.
        exitConfirmationDialog = new AlertDialog.Builder(this, R.style.AppTheme_ExitDialog)
                .setTitle(R.string.exit_app_title)
                .setMessage(R.string.exit_app_message)
                .setPositiveButton(R.string.exit_app_yes, (dialog, which) -> finish())
                .setNegativeButton(R.string.exit_app_no, (dialog, which) -> dialog.dismiss())
                .create();
        exitConfirmationDialog.setOnDismissListener(dialog -> exitConfirmationDialog = null);
        exitConfirmationDialog.show();
    }

    @Override
    public void onDestroy() {
        if (exitConfirmationDialog != null) {
            exitConfirmationDialog.dismiss();
        }
        super.onDestroy();
    }
}
