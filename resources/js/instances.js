const STORAGE_KEY = 'lumex.instances';

export class InstanceService {
  constructor(settingsService) {
    this.settingsService = settingsService;
  }

  async list() {
    try {
      return JSON.parse(await Neutralino.storage.getData(STORAGE_KEY));
    } catch {
      return [];
    }
  }

  async save(instances) {
    await Neutralino.storage.setData(STORAGE_KEY, JSON.stringify(instances));
  }

  async ensureDefaultInstance() {
    const instances = await this.list();
    if (instances.length > 0) return;
    await this.save([
      {
        id: 'default',
        name: 'Default',
        minecraftVersion: '1.21.1',
        loader: 'fabric',
        loaderVersion: 'latest'
      }
    ]);
  }

  async getSelected() {
    const settings = await this.settingsService.load();
    const instances = await this.list();
    return instances.find((i) => i.id === settings.selectedInstanceId) || instances[0] || null;
  }

  async select(id) {
    const instances = await this.list();
    const selected = instances.find((i) => i.id === id);
    if (!selected) throw new Error('Instance not found');
    const settings = await this.settingsService.load();
    settings.selectedInstanceId = id;
    await this.settingsService.save(settings);
    return selected;
  }

  async create({ name, minecraftVersion, loader = 'fabric' }) {
    const instances = await this.list();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const instance = { id, name, minecraftVersion, loader, loaderVersion: 'latest' };
    instances.push(instance);
    await this.save(instances);
    await this.select(id);
    return instance;
  }
}
