'use strict';
let configHandle = null, configSnapshot = '';
function configData() {
  // 保存当前选中提示词的编辑内容。
  const items = prompts.map(p => ({name:p.name,category:p.category,body:p === selected ? $('instruction').value : p.body}));
  return {version:1,api:{baseURL:$('base').value.trim(),model:$('model').value.trim(),key:$('key').value},prompts:items};
}
function validateConfig(data) {
  if (!data || data.version !== 1 || !data.api || !Array.isArray(data.prompts) || !data.prompts.length) throw Error('不是有效的 v1 配置文件');
  for (const k of ['baseURL','model','key']) if (typeof data.api[k] !== 'string') throw Error(`api.${k} 必须是字符串`);
  const url = new URL(data.api.baseURL);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error('接口地址必须使用 HTTPS（本机除外）');
  if (url.username || url.password || url.search || url.hash) throw Error('接口地址不能包含认证、参数或片段');
  for (const p of data.prompts) if (!p || typeof p.name !== 'string' || !p.name.trim() || typeof p.body !== 'string' || typeof p.category !== 'string') throw Error('每个提示词须包含 name、category、body 字符串');
  return data;
}
async function importConfig(file,newHandle) {
  if (controller) return status('请先停止正在进行的回答，再导入配置。');
  if (file.size > 5 * 1024 * 1024) throw Error('配置文件不能超过 5 MB');
  const data = validateConfig(JSON.parse(await file.text()));
  if (controller) return status('请先停止正在进行的回答，再导入配置。');
  if (!confirm(`将载入 ${data.prompts.length} 个提示词并替换当前配置。密钥仅发送到：\n${data.api.baseURL}\n\n请确认这是你信任的接口。继续？`)) return;
  $('base').value = data.api.baseURL; $('model').value = data.api.model; $('key').value = data.api.key;
  prompts = data.prompts.map(p => ({name:p.name,category:p.category,body:p.body})); selected = prompts[0];
  $('instruction').value = selected.body; $('activeName').textContent = selected.name; $('search').value = ''; list();
  configHandle = newHandle; configSnapshot = JSON.stringify(configData());
  $('configFileName').textContent = file.name; status('已从本地载入配置；没有上传配置文件。');
}
$('openConfig').onclick = async () => {
  if (controller) return status('请先停止正在进行的回答。');
  try {
    if (!window.showOpenFilePicker) { $('configInput').click(); return; }
    const [h] = await showOpenFilePicker({types:[{description:'Prompt Desk 配置',accept:{'application/json':['.json']}}]});
    await importConfig(await h.getFile(),h);
  } catch(e) { if(e.name !== 'AbortError') status(`配置读取失败：${e.message}`); }
};
$('configInput').onchange = async e => {
  try { if(e.target.files[0]) await importConfig(e.target.files[0],null); }
  catch(err) { status(`配置读取失败：${err.message}`); } finally { e.target.value = ''; }
};
async function saveConfig(asNew = false) {
  const data = configData();
  try {
    validateConfig(data);
    const text = JSON.stringify(data,null,2) + '\n';
    if (window.showSaveFilePicker) {
      const h = (!asNew && configHandle) || await showSaveFilePicker({suggestedName:'prompt-desk.private.json',types:[{description:'含明文密钥的本地配置',accept:{'application/json':['.json']}}]});
      const writer = await h.createWritable(); await writer.write(text); await writer.close();
      configHandle = h; configSnapshot = JSON.stringify(data); $('configFileName').textContent = h.name;
      status('配置已保存到你选择的本地文件。');
    } else {
      const url = URL.createObjectURL(new Blob([text],{type:'application/json'})); const a = document.createElement('a');
      a.href = url; a.download = 'prompt-desk.private.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),10000);
      status('已发起配置下载，请确认完成；下次打开网页需重新导入。');
    }
  } catch(e) { if(e.name !== 'AbortError') status(`配置保存失败：${e.message}`); }
}
$('saveConfig').onclick = () => saveConfig();
$('saveConfigAs').onclick = () => saveConfig(true);
// 切换提示词时保留当前编辑，便于写入同一个配置文件。
$('instruction').addEventListener('input', () => { selected.body = $('instruction').value; });
window.addEventListener('beforeunload', e => {
  if (configSnapshot && JSON.stringify(configData()) !== configSnapshot) { e.preventDefault(); e.returnValue = ''; }
});
