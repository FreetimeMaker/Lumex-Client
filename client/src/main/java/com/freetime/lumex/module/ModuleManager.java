package com.freetime.lumex.module;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class ModuleManager {
    private final List<ClientModule> modules = new ArrayList<>();

    public void registerDefaults() {
        if (!modules.isEmpty()) return;
        modules.add(new SimpleModule("FPS", ModuleCategory.HUD, true));
        modules.add(new SimpleModule("Coordinates", ModuleCategory.HUD, true));
        modules.add(new SimpleModule("CPS", ModuleCategory.HUD, false));
        modules.add(new SimpleModule("Ping", ModuleCategory.HUD, false));
        modules.add(new SimpleModule("Keystrokes", ModuleCategory.HUD, false));
        modules.add(new SimpleModule("Zoom", ModuleCategory.GAMEPLAY, false));
        modules.add(new SimpleModule("Toggle Sprint", ModuleCategory.GAMEPLAY, false));
    }

    public List<ClientModule> getModules() {
        return Collections.unmodifiableList(modules);
    }

    private static final class SimpleModule extends ClientModule {
        private SimpleModule(String name, ModuleCategory category, boolean enabledByDefault) {
            super(name, category, enabledByDefault);
        }
    }
}
