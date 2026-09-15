export class MinecraftService {
  constructor(settingsService, javaService, instanceService) {
    this.settingsService = settingsService;
    this.javaService = javaService;
    this.instanceService = instanceService;
  }

  async launch(instanceId) {
    const instances = await this.instanceService.list();
    const instance = instances.find((item) => item.id === instanceId);
    if (!instance) throw new Error('Instance not found');

    const settings = await this.settingsService.load();
    let javaPath = settings.javaPath;

    if (!javaPath) {
      const detected = await this.javaService.detect();
      if (!detected.found) {
        throw new Error('Java was not found. Install Java or select a Java executable in Settings.');
      }
      javaPath = detected.path;
    }

    if (!instance.minecraftVersion) {
      throw new Error('This instance has no Minecraft version configured.');
    }

    // v0.1 foundation: installation/auth metadata is intentionally not faked.
    // A valid Microsoft/Minecraft authentication flow and downloaded version
    // manifest must be present before a real launch command can be generated.
    const metadata = await this.getLaunchMetadata(instance.id);
    if (!metadata.installed) {
      return {
        launched: false,
        message: `Instance ${instance.name} is configured, but Minecraft ${instance.minecraftVersion} is not installed yet.`
      };
    }

    if (!metadata.authenticated) {
      return {
        launched: false,
        message: 'Microsoft/Minecraft authentication is required before launch.'
      };
    }

    const command = this.buildJavaCommand({
      javaPath,
      maxMemoryMb: settings.maxMemoryMb,
      classpath: metadata.classpath,
      mainClass: metadata.mainClass,
      gameArgs: metadata.gameArgs,
      jvmArgs: metadata.jvmArgs
    });

    const result = await Neutralino.os.spawnProcess(command, settings.minecraftDataDir);
    return {
      launched: true,
      processId: result.id,
      message: `Minecraft started (PID ${result.id}).`
    };
  }

  async getLaunchMetadata(instanceId) {
    // Placeholder contract for the installer/auth modules that will populate
    // verified metadata after downloading official manifests/assets/libraries.
    return {
      instanceId,
      installed: false,
      authenticated: false,
      classpath: [],
      mainClass: '',
      gameArgs: [],
      jvmArgs: []
    };
  }

  buildJavaCommand({ javaPath, maxMemoryMb, classpath, mainClass, gameArgs = [], jvmArgs = [] }) {
    const quote = (value) => `\"${String(value).replace(/\"/g, '\\\"')}\"`;
    const cpSeparator = navigator.userAgent.toLowerCase().includes('windows') ? ';' : ':';
    const args = [
      `-Xmx${maxMemoryMb}M`,
      ...jvmArgs,
      '-cp',
      classpath.join(cpSeparator),
      mainClass,
      ...gameArgs
    ];

    return [quote(javaPath), ...args.map(quote)].join(' ');
  }
}
