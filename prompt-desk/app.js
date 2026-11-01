'use strict';
const $ = id => document.getElementById(id);
let prompts = window.PROMPTS.map(p => ({...p})), selected = prompts[0], controller, answer = '', target = null, complete = false;
let handle = null, fileName = '未命名.md', dirty = false, history = [], renderTimer;
const editor = $('editor');
function status(s) { $('status').textContent = s; }
function render() {
  $('raw').textContent = answer;
  $('output').textContent = answer;
  if (window.renderMathInElement) window.renderMathInElement($('output'), {delimiters: [
    {left:'$$',right:'$$',display:true},{left:'\\[',right:'\\]',display:true},
    {left:'\\(',right:'\\)',display:false},{left:'$',right:'$',display:false}
  ], throwOnError:false, trust:false, maxExpand:1000});
}
function list() {
  $('prompts').replaceChildren();
  const q = $('search').value.toLowerCase();
  for (const p of prompts.filter(p => `${p.name} ${p.category} ${p.body}`.toLowerCase().includes(q))) {
    const b = document.createElement('button'); b.textContent = p.name;
    const s = document.createElement('small'); s.textContent = p.category; b.append(s);
    b.classList.toggle('active', p === selected);
    b.onclick = () => { selected = p; $('activeName').textContent = p.name; $('instruction').value = p.body; list(); };
    $('prompts').append(b);
  }
}
$('instruction').value = selected.body; $('activeName').textContent = selected.name; list();
$('search').oninput = list;
$('addPrompt').onclick = () => {
  const name = $('customName').value.trim(), body = $('customBody').value.trim();
  if (!name || !body) return status('请填写提示词名称和内容。');
  prompts.push({name,body,category:'临时'}); list(); $('customName').value = $('customBody').value = '';
};
$('settingsToggle').onclick = () => { $('settings').open = !$('settings').open; };
async function run(selectionMode = false) {
  if (controller) return;
  const key = $('key').value.trim(), model = $('model').value.trim(), question = $('question').value.trim();
  if (!key || !model || !question) { $('settings').open = true; return status('请填写 API Key、模型 ID 和问题 / 修改要求。'); }
  let url;
  try { url = new URL($('base').value.trim().replace(/\/+$/, '') + '/chat/completions');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw Error();
    if (url.username || url.password || url.search || url.hash) throw Error();
  } catch { return status('API Base URL 必须是 HTTPS 地址（本机服务可用 HTTP），不要包含参数。'); }
  target = null;
  let content = question;
  if (selectionMode) {
    const start = editor.selectionStart, end = editor.selectionEnd;
    if (start === end) return status('请先在文件编辑器中选中要优化的文字。');
    target = {start,end,snapshot:editor.value};
    content += '\n\n待修改选区：\n' + editor.value.slice(start,end);
  } else if ($('context').checked) content += '\n\n文件内容：\n' + editor.value;
  answer = ''; complete = false; render(); $('apply').disabled = true;
  controller = new AbortController(); const signal = controller.signal;
  $('send').disabled = $('editSelection').disabled = true; $('stop').disabled = false;
  const startTime = performance.now(); let first = true, done = false, finishReason = null;
  status('已发送，等待首字…');
  function receive(payload) {
    if (payload === '[DONE]') { done = true; return; }
    const data = JSON.parse(payload);
    if (data.error) throw Error(data.error.message || '接口返回错误');
    const choice = data.choices?.[0];
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    const token = choice?.delta?.content;
    if (typeof token === 'string' && token) {
      answer += token;
      if (first) { first = false; status(`正在输出 · 首字 ${((performance.now()-startTime)/1000).toFixed(2)} 秒`); render(); }
      if (!renderTimer) renderTimer = setTimeout(() => { renderTimer = null; render(); }, 80);
    }
  }
  try {
    const response = await fetch(url, {method:'POST',signal,redirect:'error',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,stream:true,messages:[{role:'system',content:$('instruction').value + (selectionMode ? '\n仅返回替换选区的完整文本，不加代码围栏、说明或前后缀。' : '')},{role:'user',content}]})});
    if (!response.ok) throw Error(`HTTP ${response.status}：${(await response.text()).slice(0,400)}`);
    if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw Error('接口没有返回 SSE 流，请确认支持 stream:true。');
    const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', eventData = [];
    function line(s) {
      if (!s) { if (eventData.length) { receive(eventData.join('\n')); eventData = []; } }
      else if (s.startsWith('data:')) eventData.push(s.slice(5).replace(/^ /,''));
    }
    try {
      while (!done) {
        const chunk = await reader.read(); buffer += decoder.decode(chunk.value, {stream:!chunk.done});
        let pos; while ((pos = buffer.indexOf('\n')) >= 0) { line(buffer.slice(0,pos).replace(/\r$/,'')); buffer = buffer.slice(pos+1); }
        if (chunk.done) { if (buffer) line(buffer.replace(/\r$/,'')); line(''); break; }
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    complete = Boolean(answer) && (done || finishReason === 'stop') && (!finishReason || finishReason === 'stop');
    status(complete ? `回答完成 · ${((performance.now()-startTime)/1000).toFixed(1)} 秒` : '输出未完整结束或被截断；已保留收到的内容，不能直接替换选区。');
  } catch (e) {
    status(e.name === 'AbortError' ? '已停止，保留已有输出。' : `请求失败：${e.message}。网络错误请检查地址、CORS 和网络连接。`);
  } finally {
    clearTimeout(renderTimer); renderTimer = null; render(); controller = null;
    $('send').disabled = $('editSelection').disabled = false; $('stop').disabled = true;
    $('apply').disabled = !(target && complete);
  }
}
$('send').onclick = () => run(); $('editSelection').onclick = () => run(true);
$('stop').onclick = () => controller?.abort();
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(answer); status('已复制原始回答。'); } catch { status('复制失败，请从“原始文本”中手动复制。'); } };
$('clear').onclick = () => { if (controller) return; answer = ''; target = null; complete = false; $('apply').disabled = true; render(); status('已清空。'); };
function changed() { dirty = true; $('filename').textContent = fileName + ' · 未保存'; }
editor.oninput = changed;
$('apply').onclick = () => {
  if (!complete || !target) return;
  if (editor.value !== target.snapshot) return status('文件在生成后发生变化，请重新选择并生成，避免替换错位。');
  history.push(editor.value); editor.setRangeText(answer,target.start,target.end,'select'); target = null; $('apply').disabled = true; changed(); status('已替换原选区，可撤销；尚未保存文件。');
};
$('undo').onclick = () => { if (history.length) { editor.value = history.pop(); changed(); } else status('没有可撤销的 AI 替换。'); };
function mayDiscard() { return !dirty || confirm('有未保存内容。继续会丢弃这些内容，是否继续？'); }
function load(text,name,newHandle) { editor.value = text; fileName = name; handle = newHandle; dirty = false; history = []; target = null; $('apply').disabled = true; $('filename').textContent = fileName; }
$('new').onclick = () => { if (mayDiscard()) load('','未命名.md',null); };
$('open').onclick = async () => {
  if (!mayDiscard()) return;
  if (!window.showOpenFilePicker) { $('fileInput').click(); return; }
  try { const [h] = await showOpenFilePicker(); const file = await h.getFile(); load(await file.text(),file.name,h); }
  catch(e) { if(e.name !== 'AbortError') status(`打开失败：${e.message}`); }
};
$('fileInput').onchange = async e => { try { const file = e.target.files[0]; if(file) load(await file.text(),file.name,null); } catch(e) { status(`读取失败：${e.message}`); } finally { e.target.value = ''; } };
$('save').onclick = async () => {
  const text = editor.value;
  try {
    if (window.showSaveFilePicker) {
      const h = handle || await showSaveFilePicker({suggestedName:fileName});
      const writable = await h.createWritable(); await writable.write(text); await writable.close(); handle = h; fileName = h.name;
      dirty = editor.value !== text; $('filename').textContent = fileName + (dirty ? ' · 未保存' : ''); status('文件已保存。');
    } else {
      const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); setTimeout(() => URL.revokeObjectURL(url),10000); status('已发起副本下载，请确认下载完成；原文件未改动。');
    }
  } catch(e) { if(e.name !== 'AbortError') status(`保存失败：${e.message}`); }
};
window.addEventListener('beforeunload', e => { if(dirty || controller) { e.preventDefault(); e.returnValue = ''; } });
