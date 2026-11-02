(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IMAFinance=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function defaults(){return {rev:95,vcr:.9,r:.08,tax:.25,p:100,n:10,subYear:1,A:{capex:2.4,om:.12,salv:.12,emis:5.8},B:{capex:3.9,om:.07,salv:.195,emis:2.3,sub:.2}};}
  function validate(c){
    const errors=[];const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
    for(const k of ['rev','vcr','r','tax','p','n','subYear'])if(!finite(c[k]))errors.push('请完整填写所有数值。');
    if(c.rev<0||c.p<0)errors.push('收入和碳价不能为负数。');
    if(c.r<0||c.r>1)errors.push('折现率请填写 0 至 1（0%—100%）。');
    if(c.vcr<0||c.vcr>1||c.tax<0||c.tax>1)errors.push('成本率和所得税率必须在 0 至 1 之间。');
    if(!Number.isInteger(c.n)||c.n<1||c.n>50)errors.push('年限须为 1—50 的整数。');
    if(!Number.isInteger(c.subYear)||c.subYear<0||c.subYear>c.n)errors.push('补贴到账年份须在第 0 年至期末之间。');
    for(const side of ['A','B']){const o=c[side]||{};for(const k of ['capex','om','salv','emis'])if(!finite(o[k])||o[k]<0)errors.push(side+' 方案各项金额和排放须完整填写为非负数。');if(o.capex<=0)errors.push(side+' 初始投资必须大于 0。');if(o.salv>o.capex)errors.push(side+' 残值不能高于初始投资（本教学模型采用直线折旧）。');if(o.sub!==undefined&&(!finite(o.sub)||o.sub<0))errors.push(side+' 补贴须为非负数。');}
    return [...new Set(errors)];
  }
  function annuity(r,n){return r===0?n:-Math.expm1(-n*Math.log1p(r))/r;}
  function scenario(c,o,p){
    const dep=(o.capex-o.salv)/c.n,carbon=o.emis*p/10000,margin=c.rev*(1-c.vcr);
    const ebit=margin-o.om-carbon-dep,tax=ebit*c.tax,ocf=ebit-tax+dep;
    const rows=[];let cumulative=0,npv=0,payback=null;
    for(let year=0;year<=c.n;year++){
      const investment=year===0?-o.capex:0,operating=year>0?ocf:0,subsidy=year===c.subYear?(o.sub||0):0,residual=year===c.n?o.salv:0;
      const cf=investment+operating+subsidy+residual,discounted=cf/Math.pow(1+c.r,year),before=cumulative;
      cumulative+=cf;npv+=discounted;
      if(year===0&&cumulative>=0)payback=0;
      if(year>0&&payback===null&&before<0&&cumulative>=0&&cf>0)payback=year-1+(-before/cf);
      rows.push({year,investment,operating,subsidy,residual,cf,discounted,cumulative});
    }
    return {dep,carbon,margin,ebit,tax,ocf,npv,payback,rows};
  }
  function calculate(c){
    const errors=validate(c);if(errors.length)return {errors};
    const A0=scenario(c,c.A,0),B0=scenario(c,c.B,0),A1=scenario(c,c.A,c.p),B1=scenario(c,c.B,c.p);
    const gap0=A0.npv-B0.npv,gap=A1.npv-B1.npv,slope=(c.A.emis-c.B.emis)/10000*(1-c.tax)*annuity(c.r,c.n);
    let threshold;
    if(Math.abs(slope)<1e-12)threshold={kind:Math.abs(gap0)<1e-9?'equal':'none',value:null};
    else{const value=gap0/slope;threshold=value>=0?{kind:'crossing',value}:{kind:'negative',value:null};}
    return {errors:[],A0,B0,A1,B1,gap0,gap,slope,threshold,af:annuity(c.r,c.n)};
  }
  return {defaults,validate,annuity,scenario,calculate};
});
