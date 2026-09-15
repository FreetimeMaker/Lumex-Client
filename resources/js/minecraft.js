export class MinecraftService {
  constructor(settingsService, javaService, instanceService, installer, authService) { Object.assign(this,{settingsService,javaService,instanceService,installer,authService}); }

  async launch(instanceId,onProgress=()=>{}) {
    const instance=(await this.instanceService.list()).find(x=>x.id===instanceId);if(!instance)throw new Error('Instance not found');
    const settings=await this.settingsService.load();let javaPath=settings.javaPath;
    if(!javaPath){const d=await this.javaService.detect();if(!d.found)throw new Error('Java was not found. Install Java or select it in Settings.');javaPath=d.path;}
    if(!instance.minecraftVersion)throw new Error('This instance has no Minecraft version configured.');
    let install=await this.installer.readInstall(instance);
    if(!install){onProgress(`Installing Minecraft ${instance.minecraftVersion} and ${instance.loader||'vanilla'}…`);install=await this.installer.install(instance);}
    const session=await this.authService.getSession();
    if(!session?.accessToken||!session?.profile)throw new Error('Sign in with Microsoft before launching Minecraft.');
    if(session.expiresAt&&Date.now()>=session.expiresAt)throw new Error('Minecraft session expired. Sign in again.');

    // The installer now downloads the client and Java libraries and resolves Fabric.
    // Assets and native-library extraction are the remaining install stage before
    // spawning Minecraft; refusing here avoids launching a known-broken game.
    if(!install.assetsReady||!install.nativesReady){
      return {launched:false,message:'Core game + Fabric installed. Asset/native installation is the next required stage before first launch.'};
    }

    const args=this.buildGameArgs(install,instance,session,settings);
    const command=this.buildJavaCommand({javaPath,maxMemoryMb:settings.maxMemoryMb,classpath:install.classpath,mainClass:install.mainClass,gameArgs:args.gameArgs,jvmArgs:args.jvmArgs});
    onProgress('Starting Minecraft…');
    const result=await Neutralino.os.spawnProcess(command,settings.minecraftDataDir);
    return {launched:true,processId:result.id,message:`Minecraft started (PID ${result.id}).`};
  }

  buildGameArgs(install,instance,session,settings){
    const v=install.vanilla;const replacements={
      '${auth_player_name}':session.profile.name,'${version_name}':instance.minecraftVersion,'${game_directory}':settings.minecraftDataDir,
      '${assets_root}':`${settings.minecraftDataDir}/assets`,'${assets_index_name}':v.assetIndex?.id||v.assets||'',
      '${auth_uuid}':session.profile.id,'${auth_access_token}':session.accessToken,'${clientid}':'','${auth_xuid}':'','${user_type}':'msa','${version_type}':'release'
    };
    const replace=s=>Object.entries(replacements).reduce((x,[a,b])=>x.split(a).join(String(b)),String(s));
    const raw=v.arguments?.game||v.minecraftArguments?.split(' ')||[];
    const gameArgs=[];for(const arg of raw){if(typeof arg==='string')gameArgs.push(replace(arg));}
    return {gameArgs,jvmArgs:[]};
  }

  buildJavaCommand({javaPath,maxMemoryMb,classpath,mainClass,gameArgs=[],jvmArgs=[]}){
    const quote=v=>`\"${String(v).replace(/\"/g,'\\\"')}\"`;const sep=navigator.userAgent.toLowerCase().includes('windows')?';':':';
    return [quote(javaPath),quote(`-Xmx${maxMemoryMb}M`),...jvmArgs.map(quote),'-cp',quote(classpath.join(sep)),quote(mainClass),...gameArgs.map(quote)].join(' ');
  }
}
