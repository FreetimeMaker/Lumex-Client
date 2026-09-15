import { initRouter } from './router.js';
import { SettingsService } from './settings.js';
import { JavaService } from './java.js';
import { InstanceService } from './instances.js';
import { MinecraftService } from './minecraft.js';
import { MinecraftInstaller } from './installer.js';
import { AuthService } from './auth.js';

Neutralino.init();
const settingsService = new SettingsService();
const javaService = new JavaService();
const instanceService = new InstanceService(settingsService);
const installer = new MinecraftInstaller(settingsService);
const authService = new AuthService();
const minecraftService = new MinecraftService(settingsService, javaService, instanceService, installer, authService);
const $ = id => document.getElementById(id);

async function renderPlatform(){const i=await Neutralino.computer.getOSInfo();$('platformLabel').textContent=`${i.name} ${i.version??''}`.trim();}
async function renderSettings(){const s=await settingsService.load();$('ramInput').value=s.maxMemoryMb;$('javaPathInput').value=s.javaPath||'';$('minecraftPathInput').value=s.minecraftDataDir;$('microsoftClientIdInput').value=s.microsoftClientId||'';$('pathsPreview').textContent=JSON.stringify(await settingsService.getResolvedPaths(),null,2);}
async function renderAccount(){const s=await authService.getSession();$('accountStatus').textContent=s?.profile?.name?`${s.profile.name}`:'Not signed in';$('logoutBtn').style.display=s?'inline-block':'none';}
async function renderInstances(){const a=await instanceService.list(),selected=await instanceService.getSelected(),select=$('instanceSelect'),list=$('instancesList');select.innerHTML='';list.innerHTML='';for(const i of a){const o=document.createElement('option');o.value=i.id;o.textContent=i.name;o.selected=i.id===selected?.id;select.appendChild(o);const r=document.createElement('div');r.className='card instance-row';r.innerHTML=`<div><h3>${i.name}</h3><div class="muted">Minecraft ${i.minecraftVersion||'not set'} · ${i.loader||'fabric'}</div></div><button class="secondary" data-select-instance="${i.id}">Select</button>`;list.appendChild(r);}if(selected){$('homeInstanceName').textContent=selected.name;$('homeInstanceMeta').textContent=`Minecraft ${selected.minecraftVersion||'not configured'} · ${selected.loader||'fabric'}`;$('launchVersion').textContent=`Version: ${selected.minecraftVersion||'not configured'}`;$('launchLoader').textContent=`Loader: ${selected.loader||'fabric'}`;}}
async function detectJava(target=$('javaStatus')){target.textContent='Checking…';const r=await javaService.detect();if(r.found){target.textContent=r.version||'Java detected';const s=await settingsService.load();s.javaPath=r.path;await settingsService.save(s);$('javaPathInput').value=r.path;}else target.textContent='Java not found';}
async function launchSelected(){const b=$('launchBtn'),status=$('launchStatus');b.disabled=true;status.textContent='Checking installation…';try{const i=await instanceService.select($('instanceSelect').value);const result=await minecraftService.launch(i.id,m=>status.textContent=m);status.textContent=result.message;}catch(e){console.error(e);status.textContent=`Launch failed: ${e.message||e}`;}finally{b.disabled=false;}}
async function bindEvents(){
 $('detectJavaBtn').addEventListener('click',()=>detectJava());$('detectJavaSettingsBtn').addEventListener('click',()=>detectJava($('settingsStatus')));$('launchBtn').addEventListener('click',launchSelected);$('homePlayBtn').addEventListener('click',()=>document.querySelector('[data-route="play"]').click());
 $('loginBtn').addEventListener('click',async()=>{try{const s=await settingsService.load();$('accountStatus').textContent='Waiting for Microsoft…';await authService.loginWithDeviceCode(s.microsoftClientId,d=>{$('loginCode').textContent=`Open ${d.verification_uri} and enter code ${d.user_code}`;});$('loginCode').textContent='';await renderAccount();}catch(e){$('accountStatus').textContent=`Login failed: ${e.message||e}`;}});
 $('logoutBtn').addEventListener('click',async()=>{await authService.logout();await renderAccount();});
 $('saveSettingsBtn').addEventListener('click',async()=>{const s=await settingsService.load();s.maxMemoryMb=Number($('ramInput').value||4096);s.javaPath=$('javaPathInput').value.trim();s.minecraftDataDir=$('minecraftPathInput').value.trim();s.microsoftClientId=$('microsoftClientIdInput').value.trim();await settingsService.save(s);$('settingsStatus').textContent='Settings saved.';await renderSettings();});
 $('newInstanceBtn').addEventListener('click',async()=>{const name=prompt('Instance name','New Instance');if(!name)return;const version=prompt('Minecraft version','1.21.1')||'1.21.1';await instanceService.create({name,minecraftVersion:version,loader:'fabric'});await renderInstances();});
 $('instanceSelect').addEventListener('change',async e=>{await instanceService.select(e.target.value);await renderInstances();});document.addEventListener('click',async e=>{const b=e.target.closest('[data-select-instance]');if(!b)return;await instanceService.select(b.dataset.selectInstance);await renderInstances();});
}
async function bootstrap(){initRouter();await settingsService.ensureBaseDirectories();await instanceService.ensureDefaultInstance();await Promise.all([renderPlatform(),renderSettings(),renderInstances(),renderAccount()]);await bindEvents();}
bootstrap().catch(e=>console.error('Lumex bootstrap failed',e));
