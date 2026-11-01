'use strict';
const API_REFERENCES = [
  {name:'DeepSeek',base:'https://api.deepseek.com',model:'deepseek-flash',url:'https://api-docs.deepseek.com/',note:'官方 OpenAI 兼容接口；另有 deepseek-v4-pro。模型权限以账户为准。'},
  {name:'Kimi（国际平台）',base:'https://api.moonshot.ai/v1',model:'kimi-k3',url:'https://www.kimi.ai/help/kimi-api/api-troubleshooting',note:'国际平台示例；地区账户与密钥不可混用。思考模型的首字延迟可能较长。'},
  {name:'通义千问（北京）',base:'https://dashscope.aliyuncs.com/compatible-mode/v1',model:'qwen-plus',url:'https://help.aliyun.com/en/model-studio/model-calling-in-sub-workspace',note:'百炼北京地域示例；其他地域请按官方说明修改地址并使用对应密钥。'}
];
const refPanel = $('apiReferences');
$('referenceButton').onclick = () => { refPanel.hidden=!refPanel.hidden; $('referenceButton').setAttribute('aria-expanded',String(!refPanel.hidden)); };
for(const ref of API_REFERENCES) {
  const card=document.createElement('div');card.className='reference-card';
  const title=document.createElement('b');title.textContent=ref.name;
  const code=document.createElement('pre');code.textContent=`Base URL: ${ref.base}\n模型 ID: ${ref.model}`;
  const note=document.createElement('p');note.textContent=ref.note;
  const link=document.createElement('a');link.href=ref.url;link.textContent='官方文档 ↗';link.target='_blank';link.rel='noopener noreferrer';
  const apply=document.createElement('button');apply.textContent='填入参考配置';apply.onclick=()=>{
    if(controller)return configStatus('请先停止正在进行的回答。');
    if(!confirm(`切换到 ${ref.name}，替换接口地址和模型，并清空当前密钥。继续？`))return;
    $('base').value=ref.base;$('model').value=ref.model;$('key').value='';scheduleConfigSave();$('key').focus();
  };
  card.append(title,code,note,apply,link);refPanel.append(card);
}
