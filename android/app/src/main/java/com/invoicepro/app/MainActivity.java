package com.invoicepro.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(InvoiceProPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
