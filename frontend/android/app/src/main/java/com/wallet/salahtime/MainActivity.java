package com.wallet.salahtime;

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
        super.onCreate(savedInstanceState);

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
