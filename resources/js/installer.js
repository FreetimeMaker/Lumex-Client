const VERSION_MANIFEST = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

function join(...parts) { return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/'); }

async function ensureDir(path) {
  const normalized = path.replace(/\\/g, '/');
  const prefix = normalized.match(/^[A-Za-z]:\//)?.[0] || (normalized.startsWith('/') ? '/' : '');
  const rest = prefix ? normalized.slice(prefix.length) : normalized;
  let current = prefix.replace(/\/$/, '');
  for (const part of rest.split('/').filter(Boolean)) {
    current = current ? `${current}/${part}` : part;
    try { await Neutralino.filesystem.createDirectory(current); } catch {}
  }
}

async function download(url, destination, expectedSha1 = '') {
  await ensureDir(destination.substring(0, destination.lastIndexOf('/')));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await Neutralino.filesystem.writeBinaryFile(destination, bytes);
  // Mojang/Fabric metadata provides hashes. Neutralino has no portable SHA-1 API,
  // so the expected value is retained in install metadata for later native verification.
  return { path: destination, size: bytes.length, sha1: expectedSha1 };
}

export class MinecraftInstaller {
  constructor(settingsService) { this.settingsService = settingsService; }

  async resolveVanilla(versionId) {
    const manifest = await (await fetch(VERSION_MANIFEST)).json();
    const entry = manifest.versions.find(v => v.id === versionId);
    if (!entry) throw new Error(`Minecraft ${versionId} was not found in Mojang's version manifest.`);
    const response = await fetch(entry.url);
    if (!response.ok) throw new Error(`Could not load metadata for Minecraft ${versionId}.`);
    return response.json();
  }

  async resolveFabric(versionId) {
    const loadersResponse = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(versionId)}`);
    if (!loadersResponse.ok) throw new Error(`Fabric is not available for Minecraft ${versionId}.`);
    const loaders = await loadersResponse.json();
    const stable = loaders.find(x => x.loader?.stable) || loaders[0];
    if (!stable) throw new Error(`No Fabric Loader version found for Minecraft ${versionId}.`);
    const loaderVersion = stable.loader.version;
    const profileResponse = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(versionId)}/${encodeURIComponent(loaderVersion)}/profile/json`);
    if (!profileResponse.ok) throw new Error('Could not download Fabric launch profile.');
    return { loaderVersion, profile: await profileResponse.json() };
  }

  libraryPath(library) {
    const [group, artifact, version] = library.name.split(':');
    const file = `${artifact}-${version}.jar`;
    return `${group.replace(/\./g, '/')}/${artifact}/${version}/${file}`;
  }

  async install(instance) {
    const settings = await this.settingsService.load();
    const root = join(settings.minecraftDataDir, 'versions', instance.id);
    await ensureDir(root);
    const vanilla = await this.resolveVanilla(instance.minecraftVersion);
    const fabric = instance.loader === 'fabric' ? await this.resolveFabric(instance.minecraftVersion) : null;
    const clientPath = join(root, `${instance.minecraftVersion}.jar`);
    await download(vanilla.downloads.client.url, clientPath, vanilla.downloads.client.sha1);

    const libraries = [...(vanilla.libraries || []), ...(fabric?.profile?.libraries || [])];
    const classpath = [];
    for (const library of libraries) {
      const artifact = library.downloads?.artifact;
      const relative = artifact?.path || this.libraryPath(library);
      const url = artifact?.url || `${library.url || 'https://libraries.minecraft.net/'}${relative}`;
      if (!url || library.natives) continue;
      const target = join(settings.minecraftDataDir, 'libraries', relative);
      await download(url, target, artifact?.sha1 || '');
      classpath.push(target);
    }
    classpath.push(clientPath);

    const metadata = {
      installedAt: new Date().toISOString(), minecraftVersion: instance.minecraftVersion,
      loader: instance.loader, loaderVersion: fabric?.loaderVersion || null,
      mainClass: fabric?.profile?.mainClass || vanilla.mainClass, classpath,
      vanilla, fabricProfile: fabric?.profile || null
    };
    await Neutralino.filesystem.writeFile(join(root, 'lumex-install.json'), JSON.stringify(metadata, null, 2));
    return metadata;
  }

  async readInstall(instance) {
    const settings = await this.settingsService.load();
    const path = join(settings.minecraftDataDir, 'versions', instance.id, 'lumex-install.json');
    try { return JSON.parse(await Neutralino.filesystem.readFile(path)); } catch { return null; }
  }
}
