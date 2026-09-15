package com.freetime.lumex.module;

public abstract class ClientModule {
    private final String name;
    private final ModuleCategory category;
    private boolean enabled;

    protected ClientModule(String name, ModuleCategory category, boolean enabledByDefault) {
        this.name = name;
        this.category = category;
        this.enabled = enabledByDefault;
    }

    public String getName() {
        return name;
    }

    public ModuleCategory getCategory() {
        return category;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        if (this.enabled == enabled) return;
        this.enabled = enabled;
        if (enabled) onEnable(); else onDisable();
    }

    public void toggle() {
        setEnabled(!enabled);
    }

    protected void onEnable() {}
    protected void onDisable() {}
}
