import { initRouter } from './router.js';
import { SettingsService } from './settings.js';
import { JavaService } from './java.js';
import { InstanceService } from './instances.js';
import { MinecraftService } from './minecraft.js';

Neutralino.init();

const settingsService = new SettingsService();
const javaService = new JavaService();
const instanceService = new InstanceService(settingsService);
const minecraftService = new MinecraftService(settingsService, javaService, instanceService);

const $ = (id) => document.getElementById(id);

async function renderPlatform() {
  const info = await Neutralino.computer.getOSInfo();
  $('platformLabel').textContent = `${info.name} ${info.version ?? ''}`.trim();
}

async function renderSettings() {
  const settings = await settingsService.load();
  $('ramInput').value = settings.maxMemoryMb;
  $('javaPathInput').value = settings.javaPath || '';
  $('minecraftPathInput').value = settings.minecraftDataDir;
  $('pathsPreview').textContent = JSON.stringify(await settingsService.getResolvedPaths(), null, 2);
}

async function renderInstances() {
  const instances = await instanceService.list();
  const selected = await instanceService.getSelected();
  const select = $('instanceSelect');
  const list = $('instancesList');
  select.innerHTML = '';
  list.innerHTML = '';

  for (const instance of instances) {
    const option = document.createElement('option');
    option.value = instance.id;
    option.textContent = instance.name;
    option.selected = instance.id === selected?.id;
    select.appendChild(option);

    const row = document.createElement('div');
    row.className = 'card instance-row';
    row.innerHTML = `
      <div>
        <h3>${instance.name}</h3>
        <div class="muted">Minecraft ${instance.minecraftVersion || 'not set'} · ${instance.loader || 'fabric'}</div>
      </div>
      <button class="secondary" data-select-instance="${instance.id}">Select</button>
    `;
    list.appendChild(row);
  }

  if (selected) {
    $('homeInstanceName').textContent = selected.name;
    $('homeInstanceMeta').textContent = `Minecraft ${selected.minecraftVersion || 'not configured'} · ${selected.loader || 'fabric'}`;
    $('launchVersion').textContent = `Version: ${selected.minecraftVersion || 'not configured'}`;
    $('launchLoader').textContent = `Loader: ${selected.loader || 'fabric'}`;
  }
}

async function detectJava(targetStatus = $('javaStatus')) {
  targetStatus.textContent = 'Checking…';
  const result = await javaService.detect();
  if (result.found) {
    targetStatus.textContent = result.version || 'Java detected';
    const settings = await settingsService.load();
    settings.javaPath = result.path;
    await settingsService.save(settings);
    $('javaPathInput').value = result.path;
  } else {
    targetStatus.textContent = 'Java not found';
  }
}

async function launchSelected() {
  const button = $('launchBtn');
  const status = $('launchStatus');
  button.disabled = true;
  status.textContent = 'Preparing launch…';
  try {
    const instance = await instanceService.select($('instanceSelect').value);
    const result = await minecraftService.launch(instance.id);
    status.textContent = result.message;
  } catch (error) {
    console.error(error);
    status.textContent = `Launch failed: ${error.message || error}`;
  } finally {
    button.disabled = false;
  }
}

async function bindEvents() {
  $('detectJavaBtn').addEventListener('click', () => detectJava());
  $('detectJavaSettingsBtn').addEventListener('click', () => detectJava($('settingsStatus')));
  $('launchBtn').addEventListener('click', launchSelected);
  $('homePlayBtn').addEventListener('click', () => document.querySelector('[data-route="play"]').click());

  $('saveSettingsBtn').addEventListener('click', async () => {
    const settings = await settingsService.load();
    settings.maxMemoryMb = Number($('ramInput').value || 4096);
    settings.javaPath = $('javaPathInput').value.trim();
    settings.minecraftDataDir = $('minecraftPathInput').value.trim();
    await settingsService.save(settings);
    $('settingsStatus').textContent = 'Settings saved.';
    await renderSettings();
  });

  $('newInstanceBtn').addEventListener('click', async () => {
    const name = window.prompt('Instance name', 'New Instance');
    if (!name) return;
    const version = window.prompt('Minecraft version', '1.21.1') || '1.21.1';
    await instanceService.create({ name, minecraftVersion: version, loader: 'fabric' });
    await renderInstances();
  });

  $('instanceSelect').addEventListener('change', async (event) => {
    await instanceService.select(event.target.value);
    await renderInstances();
  });

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-select-instance]');
    if (!button) return;
    await instanceService.select(button.dataset.selectInstance);
    await renderInstances();
  });
}

async function bootstrap() {
  initRouter();
  await settingsService.ensureBaseDirectories();
  await instanceService.ensureDefaultInstance();
  await Promise.all([renderPlatform(), renderSettings(), renderInstances()]);
  await bindEvents();
}

bootstrap().catch((error) => {
  console.error('Lumex bootstrap failed', error);
});
