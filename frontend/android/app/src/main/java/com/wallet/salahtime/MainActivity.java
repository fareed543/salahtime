package com.wallet.salahtime;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;

import androidx.appcompat.app.AlertDialog;

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

        getWindow().getDecorView().setOnApplyWindowInsetsListener((view, insets) -> {

            int topInset = insets.getSystemWindowInsetTop();

            // ✅ Apply ONLY top inset
            view.setPadding(
                    view.getPaddingLeft(),
                    topInset,
                    view.getPaddingRight(),
                    view.getPaddingBottom()
            );

            return insets;
        });
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
