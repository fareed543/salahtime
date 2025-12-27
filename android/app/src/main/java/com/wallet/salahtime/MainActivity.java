package com.wallet.salahtime;

import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
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
}
