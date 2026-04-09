package com.autodismiss;

import android.accessibilityservice.AccessibilityService;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.Arrays;
import java.util.List;

public class AutoClickService extends AccessibilityService {

    private static final String TAG = "AutoClickService";

    // Texty tlacitek, na ktere se ma automaticky kliknout
    private static final List<String> BUTTON_TEXTS = Arrays.asList(
        // Cesky
        "ok",
        "zavřít",
        "zavrít",
        "zavrit",
        "zavřít aplikaci",
        "zavrit aplikaci",
        "přijmout",
        "prijmout",
        "potvrdit",
        "ano",
        "souhlasím",
        "souhlasim",
        // Anglicky
        "close",
        "dismiss",
        "accept",
        "confirm",
        "yes",
        "got it",
        "understood"
    );

    // Balicky, jejichz dialogy se NEMAJI zavirat (bezpecnostni vyjimky)
    private static final List<String> EXCLUDED_PACKAGES = Arrays.asList(
        "com.android.packageinstaller",
        "com.google.android.packageinstaller",
        "android.permission"
    );

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        int eventType = event.getEventType();
        if (eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
            eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            return;
        }

        // Zkontroluj, zda se nejedna o vyjimku
        CharSequence packageName = event.getPackageName();
        if (packageName != null) {
            for (String excluded : EXCLUDED_PACKAGES) {
                if (packageName.toString().contains(excluded)) {
                    Log.d(TAG, "Preskocen vylouceny balik: " + packageName);
                    return;
                }
            }
        }

        // Zkus najit a kliknout na OK/Zavrit tlacitko
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode != null) {
            tryClickDismissButton(rootNode);
            rootNode.recycle();
        }
    }

    private boolean tryClickDismissButton(AccessibilityNodeInfo node) {
        if (node == null) return false;

        // Zkontroluj, zda je aktualni uzel tlacitko s hledanym textem
        CharSequence text = node.getText();
        CharSequence contentDesc = node.getContentDescription();

        if (node.isClickable() && (isMatchingText(text) || isMatchingText(contentDesc))) {
            Log.d(TAG, "Klikam na: " + (text != null ? text : contentDesc));
            boolean clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            if (clicked) {
                Log.d(TAG, "Uspesne kliknuto!");
                return true;
            }
        }

        // Rekurzivne prohledej deti uzlu
        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                boolean clicked = tryClickDismissButton(child);
                child.recycle();
                if (clicked) return true;
            }
        }

        return false;
    }

    private boolean isMatchingText(CharSequence text) {
        if (text == null) return false;
        String lowerText = text.toString().toLowerCase().trim();
        for (String buttonText : BUTTON_TEXTS) {
            if (lowerText.equals(buttonText)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public void onInterrupt() {
        Log.d(TAG, "Sluzba prerusena");
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "AutoClickService pripojena a aktivni");
    }
}
