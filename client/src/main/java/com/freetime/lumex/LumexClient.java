package com.freetime.lumex;

import com.freetime.lumex.module.ModuleManager;
import net.fabricmc.api.ClientModInitializer;

public final class LumexClient implements ClientModInitializer {
    public static final String MOD_ID = "lumexclient";
    public static final ModuleManager MODULES = new ModuleManager();

    @Override
    public void onInitializeClient() {
        MODULES.registerDefaults();
        System.out.println("[Lumex] Client initialized");
    }
}
