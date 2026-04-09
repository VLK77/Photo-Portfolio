package com.autodismiss;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.view.accessibility.AccessibilityManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.util.List;

public class MainActivity extends AppCompatActivity {

    private TextView statusText;
    private Button enableButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        statusText = findViewById(R.id.statusText);
        enableButton = findViewById(R.id.enableButton);

        enableButton.setOnClickListener(v -> {
            // Otevri nastaveni pristupnosti
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivity(intent);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateStatus();
    }

    private void updateStatus() {
        if (isServiceEnabled()) {
            statusText.setText("✓ Sluzba je AKTIVNI\nAutomaticke zavirani dialogu bezi.");
            statusText.setTextColor(getColor(android.R.color.holo_green_dark));
            enableButton.setText("Nastaveni pristupnosti");
        } else {
            statusText.setText("✗ Sluzba je NEAKTIVNI\n\nKlikni na tlacitko nize a povol 'AutoDismiss' v nastaveni pristupnosti.");
            statusText.setTextColor(getColor(android.R.color.holo_red_dark));
            enableButton.setText("Povolit sluzbu");
        }
    }

    private boolean isServiceEnabled() {
        AccessibilityManager am = (AccessibilityManager) getSystemService(ACCESSIBILITY_SERVICE);
        if (am == null) return false;

        List<AccessibilityServiceInfo> enabledServices =
            am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);

        for (AccessibilityServiceInfo service : enabledServices) {
            if (service.getId().contains(getPackageName())) {
                return true;
            }
        }
        return false;
    }
}
