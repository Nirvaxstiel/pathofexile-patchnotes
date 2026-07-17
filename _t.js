const fs=require('fs');
const REPO="__REPO__";
const html=fs.readFileSync(REPO+"/index.html","utf8");
const m=html.match(/<script>([\s\S]*)<\/script>/); let js=m[1];
const reg={};
function El(id){
  this.id=id; this.style={}; this._cls=new Set(); this.dataset={}; this._html=""; this._click=null;
  this.classList={add:c=>this._cls.add(c),remove:c=>this._cls.delete(c),toggle:(c,f)=>{if(f===undefined)f=!this._cls.has(c);f?this._cls.add(c):this._cls.delete(c);},contains:c=>this._cls.has(c)};
  this.setAttribute=(k,v)=>{if(k==="data-t")this.dataset.t=v;};
  this.getAttribute=k=>k==="data-t"?this.dataset.t:null;
  this.addEventListener=(ev,fn)=>{if(ev==="click")this._click=fn;};
  Object.defineProperty(this,"innerHTML",{get:()=>this._html,set:v=>{this._html=v;}});
  this.querySelectorAll=sel=>{ if(sel==="#app .row") return reg.app._rows||[]; if(sel==="#app section") return []; if(sel.indexOf(".lg")>=0) return reg.legend._filters; return []; };
  this.querySelector=sel=>reg.legend._clr||new El("x");
  this.closest=()=>null;
}
reg.app=new El("app");
reg.legend=new El("legend");
reg.legend._filters=["buff","nerf","chg","new"].map(c=>{const e=new El("f"+c);e.dataset.filter=c;return e;});
reg.legend._clr=new El("clr");
["meta","mnav","toc","tocSearch","leagueIn","leagueList","leagueDD","lightbox","lbImg","lbStage","h1"].forEach(id=>reg[id]=new El(id));
global.document={getElementById:id=>reg[id]||new El(id),createElement:()=>new El("x"),addEventListener:(ev,fn)=>{if(ev==="click")reg._docClick=fn;},body:new El("x"),querySelector:sel=>reg.h1,querySelectorAll:()=>[]};
global.window={addEventListener:()=>{}};
global.fetch=async(p)=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(REPO+"/"+p,"utf8"))});
const Module=require('module'); const mod=new Module('x'); mod._compile(js,'x.js');
setTimeout(()=>{
  const types=[...reg.app._html.matchAll(/data-t="(\w+)"/g)].map(x=>x[1]);
  const counts={}; types.forEach(t=>counts[t]=(counts[t]||0)+1);
  console.log("rendered rows:",types.length,"types:",JSON.stringify(counts));
  const nerfFilter=reg.legend._filters.find(f=>f.dataset.filter==="nerf");
  nerfFilter._click();
  console.log("after NERF click no throw; off filters:", [...reg.legend._filters].filter(f=>f._cls.has("off")).map(f=>f.dataset.filter));
  process.exit(0);
},80);
