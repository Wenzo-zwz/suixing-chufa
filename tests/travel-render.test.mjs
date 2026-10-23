import test from 'node:test';
import assert from 'node:assert/strict';
import { renderApp } from '../prototype/render.mjs';
import { presetFilters } from '../prototype/client-model.mjs';
const destination = {id:'test',kind:'city',name:'测试城',province:'测试省',city:'测试城',description:'城市介绍',foods:['面条'],foodGuide:[{name:'面条',description:'手工面配当地汤底'}],localTransport:'地铁与步行衔接老城',travel:'从当地铁路站换乘公共交通',seasons:['春秋'],climate:'夏季多雨',itinerary:[{title:'第一天',description:'沿河走进老城'}],tips:['先核对预约安排'],localBudget:null,verifiedAt:'2026-10-21',sources:[{label:'官方旅游资料',url:'https://example.org/guide'},{label:'旅行指南贡献者',url:'https://en.wikivoyage.org/wiki/Test',license:'CC BY-SA 4.0',attribution:'Wikivoyage contributors'}]};
const state = item => ({screen:'result',destination:item,detailExpanded:true,filters:presetFilters('explore'),catalog:{},saved:[],journeys:[],history:[]});
test('result exposes useful food, local transport, itinerary and every attributed source', () => {
  const html = renderApp(state(destination));
  for (const text of ['手工面配当地汤底','地铁与步行衔接老城','沿河走进老城','先核对预约安排','2026-10-21','https://example.org/guide','CC BY-SA 4.0','https://www.12306.cn']) assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/¥\d+|演示资料|示例资料/);
});
test('untrusted source labels and food facts cannot inject HTML or executable links', () => {
  const html = renderApp(state({...destination,foodGuide:[{name:'<img src=x onerror=alert(1)>',description:'<script>bad()</script>'}],sources:[{label:'<b>恶意来源</b>',url:'javascript:alert(1)'}]}));
  assert.ok(html.includes('&lt;img'));
  assert.doesNotMatch(html,/<script>bad|href="javascript:|<b>恶意来源/);
});
