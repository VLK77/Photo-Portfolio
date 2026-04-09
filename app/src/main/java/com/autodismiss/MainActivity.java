package com.autodismiss;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.accessibility.AccessibilityManager;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.List;

public class MainActivity extends Activity {
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(60, 120, 60, 60);
        layout.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title = new TextView(this);
        title.setText("AutoDismiss");
        title.setTextSize(28);
        title.setTextColor(Color.parseColor("#1976D2"));
        title.setGravity(Gravity.CENTER);
        layout.addView(title);

        TextView sub = new TextView(this);
        sub.setText("Automaticke zavirani chybovych hlasky");
        sub.setTextSize(14);
        sub.setTextColor(Color.GRAY);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(0, 10, 0, 60);
        layout.addView(sub);

        statusText = new TextView(this);
        statusText.setTextSize(15);
        statusText.setGravity(Gravity.CENTER);
        statusText.setPadding(30, 40, 30, 40);
        statusText.setBackgroundColor(Color.parseColor("#F5F5F5"));
        layout.addView(statusText);

        Button btn = new Button(this);
        btn.setText("Otevrit nastaveni pristupnosti");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 40, 0, 0);
        btn.setLayoutParams(lp);
        btn.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        layout.addView(btn);

        TextView help = new TextView(this);
        help.setText("\nJak pouzivat:\n1. Klikni na tlacitko\n2. Najdi AutoDismiss\n3. Zapni prepinac\n4. Hotovo!");
        help.setTextSize(13);
        help.setTextColor(Color.GRAY);
        help.setGravity(Gravity.CENTER);
        help.setPadding(0, 40, 0, 0);
        layout.addView(help);

        setContentView(layout);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isServiceEnabled()) {
            statusText.setText("Sluzba je AKTIVNI - dialogy se zaviraji automaticky.");
            statusText.setTextColor(Color.parseColor("#2E7D32"));
        } else {
            statusText.setText("Sluzba neni aktivni. Klikni nize a povol AutoDismiss.");
            statusText.setTextColor(Color.parseColor("#C62828"));
        }
    }

    private boolean isServiceEnabled() {
        AccessibilityManager am = (AccessibilityManager) getSystemService(ACCESSIBILITY_SERVICE);
        if (am == null) return false;
        List<AccessibilityServiceInfo> services =
            am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
        for (AccessibilityServiceInfo s : services) {
            if (s.getId().contains(getPackageName())) return true;
        }
        return false;
    }
}
