package com.autodismiss;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            // Sluzba se spousti automaticky pres AccessibilityService
            // (pokud je povolena v nastaveni, Android ji spusti sam)
            Log.d("BootReceiver", "Zarizeni spusteno - AccessibilityService bude aktivovana automaticky");
        }
    }
}
