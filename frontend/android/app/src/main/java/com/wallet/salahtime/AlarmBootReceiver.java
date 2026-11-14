package com.wallet.salahtime;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** CR-017: AlarmManager forgets alarms on reboot and app update; arm the stored azan alarms again. */
public class AlarmBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        AzanAlarmScheduler.rearm(context);
    }
}
