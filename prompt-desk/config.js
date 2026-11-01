'use strict';
const CONFIG_NAME = 'prompt-desk.private.json';
const CONFIG_PICKER = {id:'prompt-desk-config',startIn:'downloads',types:[{description:'Prompt Desk 配置（含明文密钥）',accept:{'application/json':['.json']}}]};
let configHandle = null, configSnapshot = '', configTimer, configWriting = false, configLoading = false, configTouched = false, configReady = false;
function configData() {
  return {version:1,api:{baseURL:$('base').value.trim(),model:$('model').value.trim(),key:$('key').value},
    prompts:prompts.map(p => ({name:p.name,category:p.category,body:p === selected ? $('instruction').value : p.body})),
    preferences:{activePrompt:prompts.indexOf(selected),includeFile:$('context').checked}};
}
function validateConfig(data) {
  if (!data || data.version !== 1 || !data.api || !Array.isArray(data.prompts) || !data.prompts.length) throw Error('不是有效的 v1 配置文件');
  for (const k of ['baseURL','model','key']) if (typeof data.api[k] !== 'string') throw Error(`api.${k} 必须是字符串`);
  const url = new URL(data.api.baseURL);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error('接口地址必须使用 HTTPS（本机除外）');
  if (url.username || url.password || url.search || url.hash) throw Error('接口地址不能包含认证、参数或片段');
  for (const p of data.prompts) if (!p || typeof p.name !== 'string' || !p.name.trim() || typeof p.body !== 'string' || typeof p.category !== 'string') throw Error('每个提示词须包含 name、category、body 字符串');
  if (data.preferences && (!Number.isInteger(data.preferences.activePrompt) || data.preferences.activePrompt < 0 || data.preferences.activePrompt >= data.prompts.length || typeof data.preferences.includeFile !== 'boolean')) throw Error('preferences 配置无效');
  return data;
}
function configStatus(text) { $('configState').textContent = text; }
// IndexedDB 仅记住所选文件的句柄；配置内容与密钥仍只保存在该文件。
async function handleStore(mode, value) {
  if (!window.indexedDB) return null;
  const db = await new Promise((resolve,reject) => {
    const request = window.indexedDB.open('prompt-desk-file',1);
    request.onupgradeneeded = () => request.result.createObjectStore('handles');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  try { return await new Promise((resolve,reject) => {
    const tx = db.transaction('handles',mode === 'get' ? 'readonly':'readwrite');
    const req = mode === 'get' ? tx.objectStore('handles').get('config') : tx.objectStore('handles').put(value,'config');
    tx.oncomplete = () => resolve(req.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
async function rememberHandle() {
  try { if(configHandle) await handleStore('put',configHandle); }
  catch { configStatus('当前文件可用；浏览器未能记住文件，下次需重新打开。'); }
}
async function importConfig(file,newHandle,remembered = false) {
  if (controller || configWriting) return configStatus('请等待回答或配置保存完成。');
  if (file.size > 5*1024*1024) throw Error('配置文件不能超过 5 MB');
  const data = validateConfig(JSON.parse(await file.text()));
  if (remembered && configTouched) return configStatus('检测到页面已编辑，未覆盖当前配置；可点击“沿用上次配置”重新载入。');
  if (controller || configWriting) return configStatus('请等待当前操作结束。');
  if (!remembered && !confirm(`将载入 ${data.prompts.length} 个提示词并替换当前配置。密钥仅发送到：\n${data.api.baseURL}\n请确认这是你信任的接口。继续？`)) return;
  clearTimeout(configTimer); configLoading = true;
  $('base').value=data.api.baseURL; $('model').value=data.api.model; $('key').value=data.api.key;
  prompts=data.prompts.map(p=>({name:p.name,category:p.category,body:p.body})); selected=prompts[data.preferences?.activePrompt ?? 0];
  $('context').checked=data.preferences?.includeFile ?? false;
  $('instruction').value=selected.body; $('activeName').textContent=selected.name; $('search').value=''; list();
  configHandle=newHandle; configSnapshot=JSON.stringify(configData()); configLoading=false; configReady=true; configTouched=false;
  $('configFileName').textContent=file.name;
  configStatus(newHandle ? '已载入同一配置文件；修改后自动保存。' : '已导入；本浏览器需点击保存配置下载更新副本。');
  await rememberHandle();
}
async function reuseConfig() {
  if (controller || configWriting) return configStatus('请等待当前操作结束。');
  // 用户手势内请求权限，不在后台弹授权。
  try {
    if (!configHandle) return $('openConfig').onclick();
    if (configTouched && !confirm('重新载入文件会替换页面中的配置，是否继续？')) return;
    if (configHandle.requestPermission && await configHandle.requestPermission({mode:'readwrite'}) !== 'granted') return configStatus('未获授权；当前配置保留。');
    await importConfig(await configHandle.getFile(),configHandle,false);
  } catch(e) { configStatus(`无法沿用：${e.message}。请重新打开配置文件。`); }
}
$('reuseConfig').onclick=reuseConfig;
$('openConfig').onclick=async()=>{
  if(controller || configWriting) return configStatus('请等待当前操作结束。');
  try {
    if(!window.showOpenFilePicker) { $('configInput').click(); return; }
    const [h]=await showOpenFilePicker(CONFIG_PICKER); await importConfig(await h.getFile(),h);
  } catch(e) { if(e.name!=='AbortError') configStatus(`配置读取失败：${e.message}`); }
};
$('configInput').onchange=async e=>{try{if(e.target.files[0])await importConfig(e.target.files[0],null);}catch(err){configStatus(`配置读取失败：${err.message}`);}finally{e.target.value='';}};
async function saveConfig(asNew=false, automatic=false) {
  if(configWriting) { scheduleConfigSave(); return; }
  clearTimeout(configTimer);
  try {
    const data=validateConfig(configData()), snapshot=JSON.stringify(data), text=JSON.stringify(data,null,2)+'\n';
    configWriting=true;
    if(window.showSaveFilePicker) {
      if(automatic && (!configHandle || !configReady)) return;
      const h=(!asNew && configHandle) || await showSaveFilePicker({...CONFIG_PICKER,suggestedName:CONFIG_NAME});
      if(h.requestPermission && (automatic ? await h.queryPermission({mode:'readwrite'}) : await h.requestPermission({mode:'readwrite'})) !== 'granted') {
        configStatus('配置有未保存修改，请点击保存配置授予写入权限。'); return;
      }
      const writer=await h.createWritable(); await writer.write(text); await writer.close();
      configHandle=h; configSnapshot=snapshot; configReady=true; $('configFileName').textContent=h.name;
      configStatus('已保存到同一配置文件 · '+new Date().toLocaleTimeString()); await rememberHandle();
    } else if(!automatic) {
      const url=URL.createObjectURL(new Blob([text],{type:'application/json'})), a=document.createElement('a');
      a.href=url; a.download=CONFIG_NAME; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10000);
      configStatus('已下载配置。浏览器不支持原位写回；请替换下载目录中的同名文件。');
    }
  } catch(e) { if(e.name!=='AbortError') configStatus(`保存失败：${e.message}；页面配置仍在，请重试。`); }
  finally { configWriting=false; if(configHandle && JSON.stringify(configData())!==configSnapshot && configSnapshot) configStatus('有未保存修改；请保存或检查文件权限。'); }
}
function scheduleConfigSave() {
  if(configLoading) return;
  configTouched=true; clearTimeout(configTimer);
  configStatus(configHandle ? '配置已修改，等待写入同一文件…' : '配置仅在页面中，请先创建或打开下载目录中的配置文件。');
  if(configHandle && configReady) configTimer=setTimeout(async()=>{await saveConfig(false,true);},700);
}
$('saveConfig').onclick=()=>saveConfig(); $('saveConfigAs').onclick=()=>saveConfig(true);
$('instruction').addEventListener('input',()=>{selected.body=$('instruction').value;});
for(const id of ['base','model','key','instruction','context']) $(id).addEventListener('input',scheduleConfigSave);
$('prompts').addEventListener('click',scheduleConfigSave); $('addPrompt').addEventListener('click',scheduleConfigSave);
$('restorePresets').onclick=()=>{
  if(!confirm('将补充新版讲解 / 命名提示词，同名条目保持你的版本。继续？'))return;
  for(const p of window.PROMPTS) if(!prompts.some(x=>x.name===p.name))prompts.push({...p});
  list(); scheduleConfigSave();
};
window.addEventListener('beforeunload',e=>{if(configWriting || (configTouched && JSON.stringify(configData())!==configSnapshot)){e.preventDefault();e.returnValue='';}});
(async()=>{
  try {
    const h=await handleStore('get'); if(!h)return;
    // 不覆盖本次手动打开的文件；恢复期间用户已修改时保留页面内容。
    if(configHandle)return; configHandle=h; $('configFileName').textContent=h.name;
    if(await h.queryPermission({mode:'read'})==='granted')await importConfig(await h.getFile(),h,true);
    else configStatus('已记住上次文件，请点击“沿用上次配置”授权读取。');
  }catch{configStatus('无法恢复上次文件；可重新打开下载目录中的配置。');}
})();
