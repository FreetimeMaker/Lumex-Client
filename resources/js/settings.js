const STORAGE_KEY = 'lumex.settings';

function join(...parts) {
  return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

export class SettingsService {
  async getResolvedPaths() {
    const env = await Neutralino.os.getEnv('HOME').catch(() => '');
    const userProfile = await Neutralino.os.getEnv('USERPROFILE').catch(() => '');
    const appData = await Neutralino.os.getEnv('APPDATA').catch(() => '');
    const xdgData = await Neutralino.os.getEnv('XDG_DATA_HOME').catch(() => '');
    const flatpakId = await Neutralino.os.getEnv('FLATPAK_ID').catch(() => '');
    const info = await Neutralino.computer.getOSInfo();
    const isWindows = String(info.name || '').toLowerCase().includes('windows');
    const home = isWindows ? userProfile : env;
    let dataRoot;
    if (flatpakId) dataRoot = join(home, '.var', 'app', 'com.freetime.lumexclient', 'data', 'lumex-client');
    else if (isWindows) dataRoot = join(appData || home, 'LumexClient');
    else dataRoot = join(xdgData || join(home, '.local', 'share'), 'lumex-client');
    return { platform: isWindows ? 'windows' : 'linux', flatpak: Boolean(flatpakId), dataRoot, instancesDir: join(dataRoot, 'instances'), runtimesDir: join(dataRoot, 'runtimes'), cacheDir: join(dataRoot, 'cache'), logsDir: join(dataRoot, 'logs') };
  }

  async defaults() {
    const paths = await this.getResolvedPaths();
    return { maxMemoryMb: 4096, javaPath: '', minecraftDataDir: join(paths.dataRoot, 'minecraft'), selectedInstanceId: 'default', microsoftClientId: '' };
  }

  async load() {
    const defaults = await this.defaults();
    try { return { ...defaults, ...JSON.parse(await Neutralino.storage.getData(STORAGE_KEY)) }; } catch { return defaults; }
  }

  async save(settings) { await Neutralino.storage.setData(STORAGE_KEY, JSON.stringify(settings)); }

  async ensureBaseDirectories() {
    const paths = await this.getResolvedPaths();
    for (const path of Object.values(paths)) {
      if (typeof path !== 'string' || !path.includes('/')) continue;
      try { await Neutralino.filesystem.createDirectory(path); } catch {}
    }
    const settings = await this.load();
    try { await Neutralino.filesystem.createDirectory(settings.minecraftDataDir); } catch {}
  }
}
