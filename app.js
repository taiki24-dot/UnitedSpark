
(function(){
"use strict";
var HRS=[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
var DOW="日月火水木金土";
var $=function(s){return document.querySelector(s)};
var now=new Date();
var S={bulk:{dows:[],weeks:4,start:19,end:23,kind:"g"},bulkOpen:false,bmsg:"",noconn:false,sn:"",sa:"",smsg:"",ml:false,mFresh:false,metaFresh:false,chat:[],msgSel:"",lastRead:0,stick:false,enterCh:false,maybe:{},auth:{},al:false,pend:"",pmsg:"",amsg:"",cf:null,admins:[],rsvp:{},editId:"",events:[],form:{type:"practice",date:"",start:19,end:22,title:"",note:""},msg:"",tab:"in",y:now.getFullYear(),m:now.getMonth(),sel:null,rsel:null,me:"",roster:[],avail:{},days:{},daysFor:"",db:null,rl:false,err:""};
function key(y,m,d){return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0")}
var todayK=key(now.getFullYear(),now.getMonth(),now.getDate());
function lab(k){var p=k.split("-");var dt=new Date(+p[0],+p[1]-1,+p[2]);return (+p[1])+"/"+(+p[2])+"（"+DOW[dt.getDay()]+"）"}
function ls(a,k,v){try{if(a==="g")return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function nameOf(id){for(var i=0;i<S.roster.length;i++)if(S.roster[i].id===id)return S.roster[i].name;return ""}

/* ---- save: safe, retrying ---- */
var timer=null,busy=false,again=false,stText="",rt=null,rn=0,dirty=false;
function setSt(t,ok){stText=t;var e=$("#st");if(e){e.textContent=t;e.className="st"+(ok?" ok":"")}}
function clean(o){var r={};Object.keys(o).forEach(function(k){if(o[k]&&o[k].length)r[k]=o[k]});return r}
function stash(){try{localStorage.setItem("us-pend",JSON.stringify({id:S.me,days:clean(S.days),maybe:clean(S.maybe)}))}catch(e){}}
function unstash(){try{localStorage.removeItem("us-pend")}catch(e){}}
function save(){
  if(!S.me)return;
  dirty=true;stash();
  if(!S.db){setSt("つながってないよ。つながったら自動で保存するね");return}
  setSt("保存待ち…");clearTimeout(timer);timer=setTimeout(flush,400)
}
function flush(){
  if(!S.db||!S.me||!dirty)return;
  if(busy){again=true;return}
  busy=true;clearTimeout(timer);clearTimeout(rt);
  var id=S.me;setSt("保存中…");
  S.db.doc("avail/"+id).set({days:clean(S.days),maybe:clean(S.maybe),updated:Date.now()}).then(function(){
    rn=0;if(!again){dirty=false;unstash()}setSt("保存したよ ✓",true)
  },function(){
    rn++;setSt("保存できなかった。自動でやり直すよ（"+rn+"回目）");rt=setTimeout(flush,Math.min(30000,2000*rn))
  }).then(function(){busy=false;if(again){again=false;flush()}})
}
function initDays(id){
  S.days=JSON.parse(JSON.stringify(memberDays(id)));S.maybe=JSON.parse(JSON.stringify(memberMaybe(id)));S.daysFor=id;
  try{var p=JSON.parse(localStorage.getItem("us-pend")||"null");if(p&&p.id===id){S.days=p.days||{};S.maybe=p.maybe||{};save()}}catch(e){}
}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden"&&dirty)flush()});
window.addEventListener("pagehide",function(){if(dirty)flush()});
window.addEventListener("online",function(){if(dirty)flush()});

/* ---- data helpers ---- */
function memberDays(id){var a=S.avail[id];return a&&a.days?a.days:{}}
function memberMaybe(id){var a=S.avail[id];return a&&a.maybe?a.maybe:{}}
function mdays(m){return m.id===S.me?S.days:memberDays(m.id)}
function mmaybe(m){return m.id===S.me?S.maybe:memberMaybe(m.id)}
function inputDays(m,fut){
  var g=mdays(m),b=mmaybe(m),u={};
  Object.keys(g).forEach(function(k){if(g[k].length)u[k]=1});Object.keys(b).forEach(function(k){if(b[k].length)u[k]=1});
  return Object.keys(u).filter(function(k){return !fut||k>=todayK})
}
function slots(k){
  var o={};HRS.forEach(function(x){o[x]={g:[],m:[]}});
  S.roster.forEach(function(m){
    var g=(mdays(m)[k]||[]),b=(mmaybe(m)[k]||[]);
    g.forEach(function(x){if(o[x])o[x].g.push(m.name)});
    b.forEach(function(x){if(o[x]&&g.indexOf(x)<0)o[x].m.push(m.name)})
  });
  return o
}
function score(c){return c.g.length+c.m.length*0.5}
function dayMax(k){var o=slots(k),s=0,g=0;HRS.forEach(function(x){var v=score(o[x]);if(v>s){s=v;g=o[x].g.length}});return{s:s,g:g}}
function best(){
  var res=[],dates={};
  S.roster.forEach(function(m){inputDays(m,true).forEach(function(k){dates[k]=1})});
  Object.keys(dates).sort().forEach(function(k){
    var o=slots(k),run=null;
    HRS.concat([99]).forEach(function(x){
      var c=o[x],has=!!(c&&(c.g.length||c.m.length)),sig=has?c.g.slice().sort().join("|")+"#"+c.m.slice().sort().join("|"):"";
      if(run&&has&&sig===run.sig&&x===run.end+1){run.end=x;return}
      if(run)res.push(run);
      run=has?{k:k,start:x,end:x,sig:sig,g:c.g.slice().sort(),m:c.m.slice().sort()}:null
    })
  });
  function sc(r){return r.g.length+r.m.length*0.5}
  res.sort(function(a,b){return sc(b)-sc(a)||b.g.length-a.g.length||(b.end-b.start)-(a.end-a.start)||(a.k<b.k?-1:1)});
  return res.slice(0,3)
}

/* ---- calendar ---- */
function calHTML(mode){
  var first=new Date(S.y,S.m,1).getDay(),dim=new Date(S.y,S.m+1,0).getDate(),N=S.roster.length;
  var h='<div class="mh"><button data-nav="-1" aria-label="前の月">‹</button><b>'+S.y+"年"+(S.m+1)+'月</b><button data-nav="1" aria-label="次の月">›</button></div><div class="cal">',i;
  for(i=0;i<7;i++)h+='<div class="dow">'+DOW[i]+"</div>";
  for(i=0;i<first;i++)h+="<div></div>";
  var sel=mode==="in"?S.sel:S.rsel,evd={};S.events.forEach(function(e){evd[e.date]=1});
  for(var d=1;d<=dim;d++){
    var k=key(S.y,S.m,d),past=k<todayK,cls="d"+(k===todayK?" today":"")+(k===sel?" sel":"")+(evd[k]?" ev":""),st="",inner=d;
    if(mode==="in"){if((S.days[k]&&S.days[k].length)||(S.maybe[k]&&S.maybe[k].length))cls+=" has"}
    else{var mx=dayMax(k);if(mx.s>0){var a=N?Math.min(1,mx.s/N):0;st=' style="background:rgba(255,224,51,'+(0.14+a*0.86).toFixed(2)+');color:'+(a>0.55?"#241a00":"var(--ink)")+';border-color:var(--y2)"';inner=d+"<small>"+(mx.g||"△")+(mx.g&&mx.s>mx.g?"+":"")+"</small>"}}
    h+='<button class="'+cls+'" data-k="'+k+'"'+st+(past&&mode==="in"?" disabled":"")+">"+inner+"</button>"
  }
  return h+"</div>"
}
function twoWeeks(){
  var N=S.roster.length||1,h='<div class="chart">';
  for(var i=0;i<14;i++){
    var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i),k=key(d.getFullYear(),d.getMonth(),d.getDate()),o=slots(k),bs=-1,bg=0,bm=0;
    HRS.forEach(function(x){var s=score(o[x]);if(s>bs){bs=s;bg=o[x].g.length;bm=o[x].m.length}});
    h+='<button class="bc'+(k===S.rsel?" on":"")+'" data-k="'+k+'" aria-label="'+lab(k)+" 最大 ○"+bg+"人 △"+bm+'人"><div class="col"><div class="sy" style="height:'+(bg/N*100)+'%"></div><div class="sg" style="height:'+(bm/N*100)+'%"></div></div><span class="dn">'+d.getDate()+'</span><span class="dw">'+DOW[d.getDay()]+"</span></button>"
  }
  return h+"</div>"
}
function wkHTML(){
  var W=[[],[],[],[],[],[],[]],mx=0,any=false,dates={};
  S.roster.forEach(function(m){inputDays(m,true).forEach(function(k){dates[k]=1})});
  Object.keys(dates).forEach(function(k){
    var p=k.split("-"),dw=new Date(+p[0],+p[1]-1,+p[2]).getDay(),o=slots(k);
    HRS.forEach(function(x){var s=score(o[x]);if(s){any=true;W[dw][x]=(W[dw][x]||0)+s;if(W[dw][x]>mx)mx=W[dw][x]}})
  });
  if(!any)return"";
  var h='<div class="card"><p class="sub">曜日 × 時間の集まりやすさ（明るいほど集まりやすい）</p><div class="wk"><div></div>';
  HRS.forEach(function(x){h+='<div class="l">'+(x%4===0||x===23?x:"")+"</div>"});
  for(var d=0;d<7;d++){h+='<div class="l">'+DOW[d]+"</div>";HRS.forEach(function(x){var v=W[d][x]||0;h+='<div class="c"'+(v?' style="background:rgba(255,224,51,'+(0.15+0.85*v/mx).toFixed(2)+')"':"")+"></div>"})}
  return h+"</div></div>"
}
function pgHTML(){
  if(!S.roster.length)return"";
  var cnt=S.roster.map(function(m){return{n:m.name,c:inputDays(m,true).length}}),mx=Math.max.apply(null,cnt.map(function(x){return x.c}).concat([1]));
  var h='<div class="card"><p class="sub">入力状況（これから先の入力済み日数）</p>';
  cnt.forEach(function(x){h+='<div class="pg"><span>'+esc(x.n)+'</span><div class="b"><div class="f" style="width:'+(x.c/mx*100)+'%"></div></div><span class="n">'+(x.c?x.c+"日":"まだ")+"</span></div>"});
  return h+"</div>"
}

/* ---- render ---- */
var rsT=0;
function renderSoon(){if(rsT)return;rsT=1;var f=function(){rsT=0;render()};if(window.requestAnimationFrame)window.requestAnimationFrame(f);else setTimeout(f,16)}
function render(){
  try{renderInner()}catch(e){
    try{console.error(e);$("#app").innerHTML='<div class="card"><p class="sub">表示でエラーが出たよ（タブは押せるよ）</p><p style="margin:0;font-size:12px;word-break:break-all">'+esc(String(e&&e.message||e))+"</p></div>"}catch(e2){}
  }
}
function renderInner(){
  var isL=isAdmin();
  if(S.tab==="ld"&&!isL)S.tab="in";
  var h="";
  $("#t-in").setAttribute("aria-selected",S.tab==="in");$("#t-out").setAttribute("aria-selected",S.tab==="out");$("#t-ld").setAttribute("aria-selected",S.tab==="ld");$("#t-ld").hidden=!isL;
  $("#t-ch").setAttribute("aria-selected",S.tab==="ch");
  var nb=nearBottom(),un=unread();
  $("#t-ch").innerHTML="チャット"+(un&&S.tab!=="ch"?'<em class="ub">'+(un>9?"9+":un)+"</em>":"");
  $("#cbar").hidden=!(S.tab==="ch"&&S.me&&nameOf(S.me));
  document.body.className=S.tab==="ch"?"chatm":"";
  renderNext();
  if(S.err)h+='<div class="card">'+esc(S.err)+"</div>";
  if(S.noconn&&!S.mFresh)h+='<div class="card"><p class="sub">⚠ Firebaseのサーバーにつながれてないよ</p><p style="margin:0;font-size:13px;line-height:1.7">次を確認してね：<br>① Firestore Database を作成した（Firebaseの「データ」タブが見える）<br>② config.js の値が自分のプロジェクトのもの（projectId など）<br>③ ルールを貼って「公開」した<br>④ スマホの通信状況</p></div>';
  if((!S.rl||!S.al||!S.ml)&&!S.err){$("#app").innerHTML='<p class="empty">読み込み中…</p>';return}
  if(S.db&&S.mFresh&&S.metaFresh&&!S.roster.length&&!S.admins.length){$("#app").innerHTML=h+setupHTML();$("#cbar").hidden=true;return}
  if(S.tab==="in"||S.tab==="out")h+=evHTML();
  if(S.tab==="in"){
    if(!S.me||!nameOf(S.me)){
      if(S.pend&&nameOf(S.pend)){
        h+='<div class="card"><p class="sub">'+esc(nameOf(S.pend))+'さんの合言葉を入れてね</p><div class="add"><input type="password" id="pwin" maxlength="20" placeholder="合言葉" autocomplete="off"><button data-act="pwok">OK</button></div><div class="st" style="color:var(--pkt)">'+esc(S.pmsg)+'</div><div class="row"><button class="dng" data-act="pwback">戻る</button></div></div>'
      }else{
        h+='<div class="card"><p class="sub">自分の名前を選んでね</p>';
        if(S.roster.length){h+='<div class="chips">';S.roster.forEach(function(m){h+='<button class="chip" data-pick="'+m.id+'">'+esc(m.name)+(S.auth[m.id]?" 🔒":"")+"</button>"});h+="</div>"}
        else h+='<p class="empty">まだメンバーがいないよ。管理者に追加してもらってね</p>';
        h+='<p class="sub" style="margin-top:6px">名前がない時は、管理者にメンバー追加を頼んでね</p></div>'
      }
    }else{
      h+='<div class="card"><div class="who-bar"><b>'+esc(nameOf(S.me))+'</b><button class="lnk" data-act="switch">名前を変える</button></div></div>';
      h+='<div class="card"><p class="sub">日付をタップして、行ける時間を選んでね</p>'+calHTML("in")+'<div class="row" style="margin-top:12px"><button data-act="cpweek">📋 先週と同じにする</button></div><p class="sub" style="margin:6px 0 0">選んだ日の週（未選択なら今週）に、先週の入力をコピーするよ</p>';
      if(S.sel){
        var gs=S.days[S.sel]||[],ms=S.maybe[S.sel]||[];
        h+='<p class="sub" style="margin-top:14px"><b style="color:var(--ink);font-size:16px">'+lab(S.sel)+'</b>　時間をタップ：○ → △ → なし</p><div class="lg"><span><i class="ly"></i>○ 行ける</span><span><i class="lc"></i>△ 行けるかも</span></div><div class="hrs">';
        HRS.forEach(function(x){var st=gs.indexOf(x)>=0?"g":ms.indexOf(x)>=0?"m":"";h+='<button class="h '+st+'" data-h="'+x+'" aria-label="'+x+'時 '+(st==="g"?"行ける":st==="m"?"行けるかも":"未選択")+'">'+x+":00<small>"+(st==="g"?"○":st==="m"?"△":"")+"</small></button>"});
        h+='</div><div class="bands"><button data-band="8|12">午前○</button><button data-band="12|18">午後○</button><button data-band="18|24">夜○</button></div><div class="row"><button data-act="all">終日○</button><button data-act="clr">この日をクリア</button></div>'
      }else h+='<p class="empty" style="margin-top:12px">まず日付を選んでね</p>';
      h+='<div class="st'+(stText.indexOf("✓")>0?" ok":"")+'" id="st">'+esc(stText)+"</div></div>"+bulkHTML()
    }
  }else if(S.tab==="out"){
    var N=S.roster.length,list=best(),done=0;
    S.roster.forEach(function(m){if(inputDays(m).length)done++});
    h+='<div class="card"><p class="sub">入力済み：'+done+"/"+N+"人　ベスト3</p>";
    if(!N)h+='<p class="empty">メンバーがまだ登録されてないよ。管理者に追加してもらってね</p>';
    else if(!list.length)h+='<p class="empty">これから先の日程の入力がまだないよ</p>';
    else list.forEach(function(r){
      var all=r.g.concat(r.m),miss=S.roster.map(function(m){return m.name}).filter(function(n){return all.indexOf(n)<0});
      h+='<button class="top" data-k="'+r.k+'"><span class="big">'+lab(r.k)+" "+r.start+":00–"+(r.end+1)+':00</span><br>○ '+r.g.length+"/"+N+"人"+(r.m.length?"　△ "+r.m.length+"人":"")+(r.m.length?'<br><span class="ms">行けるかも：'+esc(r.m.join("、"))+"</span>":"")+(miss.length?'<br><span class="ms">来れない：'+esc(miss.join("、"))+"</span>":(r.m.length?"":'<br><span class="ms">全員そろう！</span>'))+"</button>"+(isL?'<div class="row" style="margin-top:6px"><button data-decide="'+r.k+"|"+r.start+"|"+(r.end+1)+'">この日に決定する</button></div>':"")
    });
    h+="</div>";
    if(N){
      h+='<div class="card"><p class="sub">これから2週間（その日のベスト時間帯の人数）</p><div class="lg"><span><i class="ly"></i>○ 行ける</span><span><i class="lc"></i>△ 行けるかも</span></div>'+twoWeeks()+'<p class="sub" style="margin:8px 0 0">棒が満タン＝全員そろう。タップで日付の詳細が下に出るよ</p></div>';
      h+='<div class="card"><p class="sub">カレンダー（明るい日ほど集まれる。数字は行ける人数、＋は行けるかも込み）</p>'+calHTML("out");
      if(S.rsel){
        var o=slots(S.rsel);
        h+='<p class="sub" style="margin-top:14px"><b style="color:var(--ink);font-size:16px">'+lab(S.rsel)+"</b></p>";
        HRS.forEach(function(x){var c=o[x],g=c.g.length,mb=c.m.length;h+='<div class="bar"><div class="t">'+x+':00</div><div class="b"><div class="f" style="width:'+(g/N*100)+'%"></div><div class="fm" style="left:'+(g/N*100)+"%;width:"+(mb/N*100)+'%"></div><div class="c">'+(g||mb?g+(mb?"+"+mb+"△":""):"")+"</div></div></div>"+((g||mb)?'<div class="who">'+(g?"○ "+esc(c.g.join("、")):"")+(mb?(g?"　":"")+"△ "+esc(c.m.join("、")):"")+"</div>":"")})
      }
      h+="</div>"+wkHTML()+pgHTML()
    }
  }else if(S.tab==="ch"){h+=chatHTML()}else{h+=leaderHTML()}
  $("#app").innerHTML=h;
  if(S.tab==="ch"){
    if(S.chat.length){S.lastRead=Math.max(S.lastRead,S.chat[S.chat.length-1].t);ls("s","us-read",S.lastRead)}
    if(S.stick||nb||S.enterCh){window.scrollTo(0,10000000);S.stick=false;S.enterCh=false}
  }
}

/* ---- events & leader ---- */
function evList(){return S.events.filter(function(e){return e.date>=todayK}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:a.start-b.start})}
function findEv(id){for(var i=0;i<S.events.length;i++)if(S.events[i].id===id)return S.events[i];return null}
function p2(n){return String(n).padStart(2,"0")}
function gdt(date,h){var p=date.split("-"),d=new Date(+p[0],+p[1]-1,+p[2],h,0,0);return d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+"T"+p2(d.getHours())+"0000"}
function gcal(e){return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent("United Spark："+e.title)+"&dates="+gdt(e.date,e.start)+"/"+gdt(e.date,e.end)+"&details="+encodeURIComponent(e.note||"")+"&ctz=Asia%2FTokyo"}
function dstr(t){var d=new Date(t);return (d.getMonth()+1)+"/"+d.getDate()}
function histHTML(e){return (e.hist||[]).slice(-2).reverse().map(function(x){return '<div class="hs">🔄 '+dstr(x.t)+"　"+esc(x.x)+"</div>"}).join("")}
function rsvpLine(e){
  var go=[],no=[],un=[];
  S.roster.forEach(function(m){var r=S.rsvp[e.id+"_"+m.id];if(r&&r.v==="go")go.push(m.name);else if(r&&r.v==="no")no.push(m.name);else un.push(m.name)});
  function ln(c,l,a){return '<b class="'+c+'">'+l+" "+a.length+"</b>"+(a.length?esc(a.join("、")):"")}
  return '<div class="rs">'+ln("g","行く",go)+"<br>"+ln("n","行けない",no)+"<br>"+ln("u","未回答",un)+"</div>"
}
function evCard(e,first,ld){
  var c=e.status==="cancel",ty=typeOf(e.type);
  var h='<div class="ev1'+(c?" cx":"")+'" style="--tc:'+ty.c+(first?";border-top:0;margin-top:0;padding-top:0":"")+'"><div class="evr"><div class="evd">'+lab(e.date)+"<br><small>"+e.start+":00–"+e.end+':00</small></div><div class="evt"><b>'+(c?'<em class="bd">中止</em> ':"")+'<em class="bd tp">'+ty.n+"</em> "+esc(e.title)+"</b>"+((e.hist&&e.hist.length&&!c)?' <em class="bd b2">変更あり</em>':"")+(e.note?"<br><span>"+esc(e.note)+"</span>":"")+"</div></div>"+histHTML(e);
  if(!c){
    var mine=S.me&&nameOf(S.me)?(S.rsvp[e.id+"_"+S.me]||{}).v:"";
    if(S.me&&nameOf(S.me))h+='<div class="rsb"><button class="go" data-rsvp="'+e.id+'|go" aria-pressed="'+(mine==="go")+'">行く</button><button class="no" data-rsvp="'+e.id+'|no" aria-pressed="'+(mine==="no")+'">行けない</button></div>';
    h+=rsvpLine(e);
    if(!ld)h+='<div class="cb"><a href="'+esc(gcal(e))+'" target="_blank" rel="noopener">📅 カレンダーに入れる</a><button data-copy="'+e.id+'">文字をコピー</button></div>'
  }
  if(ld)h+='<div class="eb"><button data-evedit="'+e.id+'">編集</button><button data-evcancel="'+e.id+'">'+(c?"再開":"中止にする")+'</button><button class="dl" data-evdel="'+e.id+'">削除</button></div>';
  return h+"</div>"
}
function evHTML(){
  var l=evList();if(!l.length)return"";
  var h='<div class="card evc"><p class="sub">⚡ 決定事項</p>';
  l.forEach(function(e,i){h+=evCard(e,i===0,false)});
  if(!(S.me&&nameOf(S.me)))h+='<p class="sub" style="margin-top:10px">名前を選ぶと出欠を入れられるよ</p>';
  return h+"</div>"
}
function opts(a,b,sel){var o="";for(var i=a;i<=b;i++)o+='<option value="'+i+'"'+(i===sel?" selected":"")+">"+i+":00</option>";return o}
function isAdmin(){return !!(S.me&&nameOf(S.me)&&S.admins.indexOf(S.me)>=0)}
function hashPw(id,pw){
  if(!(window.crypto&&crypto.subtle))return Promise.reject(new Error("nosubtle"));
  return crypto.subtle.digest("SHA-256",new TextEncoder().encode("united-spark:"+id+":"+pw)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,"0")}).join("")})
}
function validateMe(){
  if(S.me&&S.auth[S.me]&&ls("g","us-ok")!==S.auth[S.me]){S.me="";S.daysFor="";S.days={};S.maybe={};ls("s","us-me","")}
}
function ask(msg,fn){
  S.cf=fn;
  $("#cf").innerHTML='<div class="cfo"><div class="cfb" role="dialog"><p>'+esc(msg)+'</p><div class="row"><button data-cf="ok">OK</button><button class="dng" data-cf="no">やめる</button></div></div></div>'
}
function leaderHTML(){
  var f=S.form,ed=!!S.editId,h='<div class="card"><p class="sub">管理者メニュー：'+(ed?"決定事項を変更":"決定事項を追加")+"</p>";
  h+='<div class="fld"><label>種類</label><div class="tys">'+TYPES.map(function(t){return '<button style="--tc:'+t.c+'" data-type="'+t.id+'" aria-pressed="'+(f.type===t.id)+'">'+t.n+"</button>"}).join("")+"</div></div>";
  h+='<div class="fld"><label for="fd">日付</label><input type="date" id="fd" min="'+todayK+'" value="'+esc(f.date)+'"></div>';
  h+='<div class="fld two"><div><label for="fs">開始</label><select id="fs">'+opts(8,23,f.start)+'</select></div><div><label for="fe">終了</label><select id="fe">'+opts(9,24,f.end)+"</select></div></div>";
  h+='<div class="fld"><label for="ft">決定事項</label><input type="text" id="ft" maxlength="30" placeholder="例：チーム練習" value="'+esc(f.title)+'"></div>';
  h+='<div class="fld"><label for="fn">メモ（任意）</label><input type="text" id="fn" maxlength="60" placeholder="集合場所・持ち物など" value="'+esc(f.note)+'"></div>';
  h+='<div class="row"><button data-act="addev">'+(ed?"変更を保存":"決定事項を追加")+"</button>"+(ed?'<button class="dng" data-act="canceledit">編集をやめる</button>':"")+'</div><div class="st'+(S.msg.indexOf("✓")>0?" ok":"")+'">'+esc(S.msg)+"</div></div>";
  var l=evList();
  h+='<div class="card"><p class="sub">追加した決定事項</p>';
  if(!l.length)h+='<p class="empty">まだないよ</p>';
  l.forEach(function(e,i){h+=evCard(e,i===0,true)});
  h+="</div>";
  var miss=S.roster.filter(function(m){return !inputDays(m).length});
  h+='<div class="card"><p class="sub">まだ入力してない人</p>';
  h+=miss.length?miss.map(function(m){return '<span class="nm1">'+esc(m.name)+"</span>"}).join(""):'<p class="empty">全員入力済み！</p>';
  h+='</div><div class="card"><p class="sub">メンバー管理（合言葉・管理者・追加・削除）</p>';
  h+='<div class="st'+(S.amsg.indexOf("✓")>0?" ok":"")+'">'+esc(S.amsg||"合言葉は管理者が決めて、本人に教えてね。未設定の人は誰でもその名前で入れちゃうよ")+"</div>";
  S.roster.forEach(function(m){
    var a=S.admins.indexOf(m.id)>=0,pw=!!S.auth[m.id];
    h+='<div class="mrow"><div class="mn">'+esc(m.name)+(a?' <em class="bd">管理者</em>':"")+' <span>'+(pw?"🔒":"🔓")+'</span></div><div class="pw"><input type="text" id="pw-'+m.id+'" maxlength="20" placeholder="'+(pw?"新しい合言葉に変更":"合言葉を設定")+'" autocomplete="off"><button data-pwset="'+m.id+'">設定</button></div><div class="sm">'+(pw?'<button data-pwclr="'+m.id+'">合言葉を解除</button>':"")+'<button data-adm="'+m.id+'">'+(a?"管理者を外す":"管理者にする")+'</button><button data-mdel="'+m.id+'" style="color:var(--pkt)">削除</button></div></div>'
  });
  return h+'<p class="sub" style="margin-top:14px">メンバーを追加</p><div class="add"><input type="text" id="addn" maxlength="12" placeholder="名前" autocomplete="off"><button data-act="add">追加</button></div></div>'
}
function copyText(txt,btn){
  var old=btn.textContent;
  function done(ok){btn.textContent=ok?"コピーした ✓":"コピーできなかった";setTimeout(function(){btn.textContent=old},1600)}
  function fb(){try{var ta=document.createElement("textarea");ta.value=txt;ta.style.cssText="position:fixed;opacity:0";document.body.appendChild(ta);ta.select();var ok=document.execCommand("copy");document.body.removeChild(ta);done(ok)}catch(e){done(false)}}
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){done(true)},fb)}else fb()}catch(e){fb()}
}

/* ---- copy last week ---- */
function weekStart(k){var p=k.split("-"),d=new Date(+p[0],+p[1]-1,+p[2]);d.setDate(d.getDate()-d.getDay());return d}
function addDays(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function dkey(d){return key(d.getFullYear(),d.getMonth(),d.getDate())}
function copyWeek(){
  var base=weekStart(S.sel||todayK),pairs=[],i;
  for(i=0;i<7;i++){
    var to=addDays(base,i),from=addDays(to,-7),tk=dkey(to),fk=dkey(from);
    if(tk>=todayK&&((S.days[fk]||[]).length||(S.maybe[fk]||[]).length))pairs.push([fk,tk])
  }
  if(!pairs.length){setSt("コピーできる日がないよ（先週に入力がない、または今週分がもう過ぎてるよ）");return}
  var src=lab(dkey(addDays(base,-7)))+"〜"+lab(dkey(addDays(base,-1))),dst=lab(dkey(base))+"〜"+lab(dkey(addDays(base,6)));
  ask("先週（"+src+"）の入力がある"+pairs.length+"日分を、この週（"+dst+"）にコピーする？ 同じ日にもう入れていた分は上書きされるよ。",function(){
    pairs.forEach(function(pr){S.days[pr[1]]=(S.days[pr[0]]||[]).slice();S.maybe[pr[1]]=(S.maybe[pr[0]]||[]).slice()});
    render();save()
  })
}

/* ---- types, countdown, chat ---- */
var TYPES=[{id:"practice",n:"練習",c:"#ffe033"},{id:"match",n:"大会",c:"#ff5fa8"},{id:"meet",n:"ミーティング",c:"#3fe0ff"},{id:"other",n:"その他",c:"#5dffa0"}];
var PAL=["#ffe033","#3fe0ff","#ff5fa8","#5dffa0","#ff8a3d","#8b6bff"];
function typeOf(id){for(var i=0;i<TYPES.length;i++)if(TYPES[i].id===id)return TYPES[i];return TYPES[0]}
function colOf(mid){for(var i=0;i<S.roster.length;i++)if(S.roster[i].id===mid)return PAL[i%PAL.length];return "#a9a5c4"}
function nextEv(){
  var best=null,bt=1e18,n=Date.now();
  S.events.forEach(function(e){
    if(e.status==="cancel"||!e.date)return;
    var p=e.date.split("-"),st=new Date(+p[0],+p[1]-1,+p[2],e.start,0,0).getTime(),en=new Date(+p[0],+p[1]-1,+p[2],e.end,0,0).getTime();
    if(en<=n)return;
    if(st<bt){bt=st;best={e:e,st:st}}
  });
  return best
}
function renderNext(){
  var box=$("#nx"),b=nextEv();
  if(!b){box.innerHTML="";return}
  var n=Date.now(),e=b.e,ty=typeOf(e.type),left,p=e.date.split("-");
  if(b.st<=n)left='<small>いま</small><b style="font-size:26px">開催中</b>';
  else{
    var t0=new Date();t0.setHours(0,0,0,0);
    var dd=Math.round((new Date(+p[0],+p[1]-1,+p[2])-t0)/864e5),ms=b.st-n;
    if(dd<=0){
      if(ms>=36e5)left='<small>あと</small><b>'+Math.floor(ms/36e5)+"</b><span>時間</span>";
      else left='<small>あと</small><b>'+Math.max(1,Math.ceil(ms/6e4))+"</b><span>分</span>"
    }else if(dd===1)left='<small>あした</small><b style="font-size:30px">明日</b>';
    else left='<small>あと</small><b>'+dd+"</b><span>日</span>"
  }
  box.style.setProperty&&box.style.setProperty("--tc",ty.c);
  box.innerHTML='<div class="nxn">'+left+'</div><div class="nxt"><em class="bd tp" style="--tc:'+ty.c+'">'+esc(ty.n)+"</em><b> "+esc(e.title)+"</b><span>"+lab(e.date)+" "+e.start+":00–"+e.end+":00</span></div>"
}
function nearBottom(){try{var de=document.documentElement;return (window.innerHeight||0)+(window.scrollY||0)>=((de&&de.scrollHeight)||0)-140}catch(e){return false}}
function unread(){var n=0;S.chat.forEach(function(c){if(c.t>S.lastRead&&c.mid!==S.me)n++});return n}
function chatHTML(){
  if(!(S.me&&nameOf(S.me)))return '<div class="card"><p class="sub">チャットは名前を選ぶと使えるよ</p><div class="row"><button data-goin="1">名前を選びに行く</button></div></div>';
  var h="",l=S.chat.slice(-150),lastD="";
  if(!l.length)h+='<p class="empty" style="text-align:center">まだメッセージがないよ。最初の一言をどうぞ！</p>';
  l.forEach(function(c){
    var d=new Date(c.t),ds=(d.getMonth()+1)+"/"+d.getDate()+"（"+DOW[d.getDay()]+"）";
    if(ds!==lastD){h+='<div class="dsep"><span>'+ds+"</span></div>";lastD=ds}
    var mine=c.mid===S.me,tm=p2(d.getHours())+":"+p2(d.getMinutes()),nm=nameOf(c.mid)||"（退会）",col=colOf(c.mid);
    h+='<div class="msg'+(mine?" me":"")+'">';
    if(!mine)h+='<div class="av" style="--c:'+col+'">'+esc(nm.charAt(0))+"</div>";
    h+='<div class="mb">'+(mine?"":'<div class="mn2" style="--c:'+col+'">'+esc(nm)+"</div>")+'<div class="row2"><button class="bub" data-msg="'+c.id+'">'+esc(c.text).replace(/\n/g,"<br>")+'</button><span class="tm">'+tm+"</span></div>"+(S.msgSel===c.id&&(mine||isAdmin())?'<button class="mdl" data-mdelmsg="'+c.id+'">削除</button>':"")+"</div></div>"
  });
  return '<div class="chat">'+h+"</div>"
}

function setupHTML(){
  var dn=S.sn||"ピカトモ\n絶ラティ\nあずき\nポケユナすき\n小麦粉ワニ\nイワガブ",da=S.sa||"イワガブ";
  return '<div class="card"><p class="sub">初期設定（最初の1回だけ）</p><div class="fld"><label for="sn">メンバーの名前（1行に1人）</label><textarea id="sn" rows="7">'+esc(dn)+'</textarea></div><div class="fld"><label for="sa">管理者になる人の名前（上の中から1人）</label><input type="text" id="sa" value="'+esc(da)+'"></div><div class="row"><button data-act="setup">この内容ではじめる</button></div><div class="st">'+esc(S.smsg)+"</div></div>"
}
function bulkHTML(){
  var b=S.bulk;
  if(!S.bulkOpen)return '<div class="card"><button class="bt" data-act="btoggle">⚡ まとめて入力（毎週同じ時間ならこれが速い） ▼</button></div>';
  var h='<div class="card"><button class="bt" data-act="btoggle">⚡ まとめて入力 ▲</button>';
  h+='<p class="sub" style="margin-top:12px">① 曜日（いくつでもOK）</p><div class="dw7">'+DOW.split("").map(function(d,i){return '<button data-bdow="'+i+'" aria-pressed="'+(b.dows.indexOf(i)>=0)+'">'+d+"</button>"}).join("")+"</div>";
  h+='<p class="sub" style="margin-top:12px">② 時間</p><div class="bands"><button data-bband="8|12">午前</button><button data-bband="12|18">午後</button><button data-bband="18|24">夜</button><button data-bband="8|24">終日</button></div>';
  h+='<div class="fld two"><div><label for="bs">開始</label><select id="bs">'+opts(8,23,b.start)+'</select></div><div><label for="be">終了</label><select id="be">'+opts(9,24,b.end)+"</select></div></div>";
  h+='<p class="sub" style="margin-top:12px">③ 期間と種類</p><div class="fld two"><div><select id="bw" aria-label="期間">'+[1,2,4,8,12].map(function(w){return '<option value="'+w+'"'+(w===b.weeks?" selected":"")+">今日から"+w+"週間</option>"}).join("")+'</select></div><div class="bk2"><button data-bkind="g" aria-pressed="'+(b.kind==="g")+'">○ 行ける</button><button data-bkind="m" aria-pressed="'+(b.kind==="m")+'">△ かも</button></div></div>';
  h+='<div class="row"><button data-act="bapply">この内容で入力</button><button class="dng" data-act="bclear">その曜日・時間を消す</button></div><div class="st'+(S.bmsg.indexOf("✓")>0?" ok":"")+'">'+esc(S.bmsg)+"</div></div>";
  return h
}
/* ---- events ---- */
function pick(id){
  S.me=id;ls("s","us-me",id);S.sel=null;initDays(id);stText="";render()
}
$("#t-in").onclick=function(){S.tab="in";render()};
$("#t-out").onclick=function(){S.tab="out";render()};
$("#t-ld").onclick=function(){S.tab="ld";render()};
$("#t-ch").onclick=function(){S.tab="ch";S.enterCh=true;render()};
document.addEventListener("click",function(e){
  var t=e.target.closest("button");if(!t)return;
  var ds=t.dataset;
  if(ds.nav){S.m+=+ds.nav;if(S.m<0){S.m=11;S.y--}if(S.m>11){S.m=0;S.y++}render();return}
  if(ds.type){S.form.type=ds.type;render();return}
  if(ds.goin){S.tab="in";render();return}
  if(ds.msg){S.msgSel=S.msgSel===ds.msg?"":ds.msg;render();return}
  if(ds.mdelmsg){var mid2=ds.mdelmsg;ask("このメッセージを削除する？",function(){S.db.doc("chat/"+mid2).delete().catch(function(){})});return}
  if(ds.act==="csend"){
    var ci=$("#cmsg"),tx=ci?ci.value.trim():"";
    if(!tx||!S.db||!S.me)return;
    ci.value="";S.stick=true;
    var cid="c"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    S.db.doc("chat/"+cid).set({mid:S.me,text:tx.slice(0,300),t:Date.now()}).catch(function(){ci.value=tx});
    return
  }
  if(ds.act==="setup"){
    var ta=$("#sn"),ai=$("#sa");if(!ta||!ai||!S.db)return;
    S.sn=ta.value;S.sa=ai.value;
    var seen={},names=ta.value.split(/\r?\n/).map(function(x){return x.trim().slice(0,12)}).filter(function(x){if(!x||seen[x])return false;seen[x]=1;return true});
    var an=ai.value.trim();
    if(!names.length){S.smsg="メンバーの名前を入れてね";render();return}
    if(names.indexOf(an)<0){S.smsg="管理者の名前は、メンバーの中の1人にしてね";render();return}
    var base=Date.now().toString(36),ids=names.map(function(n,i){return "m"+(i+1)+base});
    S.smsg="作成中…";render();
    Promise.all(names.map(function(n,i){return S.db.doc("members/"+ids[i]).set({name:n,t:Date.now()+i})})).then(function(){return S.db.doc("meta/admins").set({ids:[ids[names.indexOf(an)]]})}).then(function(){S.smsg=""},function(){S.smsg="作成できなかった。Firebaseの設定とルールを確認してね";render()});
    return
  }
  if(ds.act==="btoggle"){S.bulkOpen=!S.bulkOpen;render();return}
  if(ds.bdow){var dn=+ds.bdow,bi=S.bulk.dows.indexOf(dn);if(bi>=0)S.bulk.dows.splice(bi,1);else S.bulk.dows.push(dn);render();return}
  if(ds.bband){var bp=ds.bband.split("|");S.bulk.start=+bp[0];S.bulk.end=+bp[1];render();return}
  if(ds.bkind){S.bulk.kind=ds.bkind;render();return}
  if(ds.act==="bapply"||ds.act==="bclear"){
    var bk=S.bulk,clr=ds.act==="bclear",by3=function(p,r){return p-r},bn=0;
    if(!bk.dows.length){S.bmsg="曜日を選んでね";render();return}
    if(bk.end<=bk.start){S.bmsg="終了は開始より後にしてね";render();return}
    var bh2=HRS.filter(function(x){return x>=bk.start&&x<bk.end});
    for(var bj=0;bj<bk.weeks*7;bj++){
      var dd=new Date();dd.setDate(dd.getDate()+bj);
      if(bk.dows.indexOf(dd.getDay())<0)continue;
      var kk=key(dd.getFullYear(),dd.getMonth(),dd.getDate()),g3=(S.days[kk]||[]).slice(),m3=(S.maybe[kk]||[]).slice();
      bh2.forEach(function(x){
        g3=g3.filter(function(y){return y!==x});m3=m3.filter(function(y){return y!==x});
        if(!clr){(bk.kind==="g"?g3:m3).push(x)}
      });
      g3.sort(by3);m3.sort(by3);S.days[kk]=g3;S.maybe[kk]=m3;bn++
    }
    S.bmsg=bn+"日分を"+(clr?"消したよ ✓":"入力したよ ✓");render();save();return
  }
  if(ds.band){
    var bq=ds.band.split("|"),bh=HRS.filter(function(x){return x>=+bq[0]&&x<+bq[1]}),g2=(S.days[S.sel]||[]).slice(),m2=(S.maybe[S.sel]||[]).slice(),by2=function(p,r){return p-r};
    var allin=bh.every(function(x){return g2.indexOf(x)>=0});
    if(allin){g2=g2.filter(function(x){return bh.indexOf(x)<0})}else{bh.forEach(function(x){if(g2.indexOf(x)<0)g2.push(x);m2=m2.filter(function(y){return y!==x})})}
    g2.sort(by2);S.days[S.sel]=g2;S.maybe[S.sel]=m2;render();save();return
  }
  if(ds.cf){var cfn=S.cf;S.cf=null;$("#cf").innerHTML="";if(ds.cf==="ok"&&cfn)cfn();return}
  if(ds.pick){if(S.auth[ds.pick]){S.pend=ds.pick;S.pmsg="";render();var pi=$("#pwin");if(pi)pi.focus()}else{ls("s","us-ok","");pick(ds.pick)}return}
  if(ds.act==="cpweek"){copyWeek();return}
  if(ds.act==="pwback"){S.pend="";S.pmsg="";render();return}
  if(ds.act==="pwok"){
    var pin=$("#pwin"),pid=S.pend;if(!pin||!pid)return;
    hashPw(pid,pin.value.trim()).then(function(hh){
      if(hh===S.auth[pid]){ls("s","us-ok",hh);S.pend="";pick(pid)}else{S.pmsg="合言葉が違うよ";render()}
    },function(){S.pmsg="この端末では合言葉を使えないみたい";render()});
    return
  }
  if(ds.pwset){
    var qid=ds.pwset,qi=$("#pw-"+qid),qp=qi?qi.value.trim():"";
    if(!isAdmin()||!S.db)return;
    if(qp.length<3){S.amsg="合言葉は3文字以上にしてね";render();return}
    hashPw(qid,qp).then(function(hh){return S.db.doc("auth/"+qid).set({h:hh}).then(function(){if(qid===S.me)ls("s","us-ok",hh);S.amsg=nameOf(qid)+"の合言葉を設定したよ ✓";render()})}).catch(function(){S.amsg="設定できなかった";render()});
    return
  }
  if(ds.pwclr){var cid=ds.pwclr;if(!isAdmin())return;ask(nameOf(cid)+"の合言葉を解除する？（誰でもその名前で入れるようになるよ）",function(){S.db.doc("auth/"+cid).delete().then(function(){if(cid===S.me)ls("s","us-ok","");S.amsg=nameOf(cid)+"の合言葉を解除したよ ✓";render()},function(){})});return}
  if(ds.adm){
    var aid=ds.adm;if(!isAdmin())return;
    var has=S.admins.indexOf(aid)>=0,ids=has?S.admins.filter(function(x){return x!==aid}):S.admins.concat([aid]);
    if(!ids.length){S.amsg="管理者は最低1人必要だよ";render();return}
    var go=function(){S.db.doc("meta/admins").set({ids:ids}).then(function(){S.amsg=nameOf(aid)+(has?"を管理者から外したよ ✓":"を管理者にしたよ ✓");render()},function(){})};
    if(has&&aid===S.me)ask("自分を管理者から外す？（この画面は見られなくなるよ）",go);else go();
    return
  }
  if(ds.mdel){
    var did=ds.mdel;if(!isAdmin())return;
    if(S.admins.indexOf(did)>=0&&S.admins.length===1){S.amsg="最後の管理者は削除できないよ";render();return}
    ask(nameOf(did)+"を削除する？ 入力した予定も消えるよ",function(){
      S.db.doc("avail/"+did).delete().catch(function(){});S.db.doc("auth/"+did).delete().catch(function(){});
      if(S.admins.indexOf(did)>=0)S.db.doc("meta/admins").set({ids:S.admins.filter(function(x){return x!==did})}).catch(function(){});
      S.db.doc("members/"+did).delete().catch(function(){});
      if(did===S.me){S.me="";ls("s","us-me","")}
      S.amsg="削除したよ ✓";render()
    });
    return
  }
  if(ds.decide){var z=ds.decide.split("|");S.form.date=z[0];S.form.start=+z[1];S.form.end=Math.min(24,+z[2]);S.editId="";S.form.title="";S.form.note="";S.msg="";S.tab="ld";render();window.scrollTo(0,0);return}
  if(ds.act==="addev"){
    var f=S.form;
    if(!S.db)return;
    if(!f.date||!f.title.trim()){S.msg="日付と決定事項を入れてね";render();return}
    if(f.end<=f.start){S.msg="終了は開始より後にしてね";render();return}
    var old=S.editId?findEv(S.editId):null;
    if(old){
      var ch=[];
      if(old.date!==f.date||old.start!==f.start||old.end!==f.end)ch.push("日時 "+lab(old.date)+" "+old.start+":00–"+old.end+":00 → "+lab(f.date)+" "+f.start+":00–"+f.end+":00");
      if(old.title!==f.title.trim())ch.push("内容 「"+old.title+"」→「"+f.title.trim()+"」");
      if((old.type||"practice")!==(f.type||"practice"))ch.push("種類 "+typeOf(old.type).n+" → "+typeOf(f.type).n);
      if((old.note||"")!==f.note.trim())ch.push("メモを更新");
      if(!ch.length){S.msg="変更がないよ";render();return}
      var hist=(old.hist||[]).concat([{t:Date.now(),x:ch.join("／")}]).slice(-10);
      S.db.doc("events/"+old.id).set({date:f.date,start:f.start,end:f.end,title:f.title.trim(),note:f.note.trim(),type:f.type||"practice",t:old.t,status:old.status||"on",hist:hist}).then(function(){S.msg="変更を保存したよ ✓";S.editId="";S.form.title="";S.form.note="";render()},function(){S.msg="保存できなかった。共有設定（編集可）を確認してね";render()});
      return
    }
    var eid="e"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
    S.db.doc("events/"+eid).set({date:f.date,start:f.start,end:f.end,title:f.title.trim(),note:f.note.trim(),type:f.type||"practice",t:Date.now(),status:"on",hist:[]}).then(function(){S.msg="追加したよ ✓";S.form.title="";S.form.note="";render()},function(){S.msg="追加できなかった。共有設定（編集可）を確認してね";render()});
    return
  }
  if(ds.act==="canceledit"){S.editId="";S.form.title="";S.form.note="";S.msg="";render();return}
  if(ds.evedit){var ee=findEv(ds.evedit);if(!ee)return;S.form={type:ee.type||"practice",date:ee.date,start:ee.start,end:ee.end,title:ee.title,note:ee.note||""};S.editId=ee.id;S.msg="";S.tab="ld";render();window.scrollTo(0,0);return}
  if(ds.evcancel){
    var ev=findEv(ds.evcancel);if(!ev||!S.db)return;
    var cx=ev.status==="cancel";
    ask(cx?"この予定を再開する？":"この予定を中止にする？（みんなの画面に「中止」と出るよ）",function(){S.db.doc("events/"+ev.id).set({date:ev.date,start:ev.start,end:ev.end,title:ev.title,note:ev.note||"",type:ev.type||"practice",t:ev.t,status:cx?"on":"cancel",hist:(ev.hist||[]).concat([{t:Date.now(),x:cx?"再開します":"中止になりました"}]).slice(-10)}).catch(function(){})});
    return
  }
  if(ds.rsvp){
    var pr=ds.rsvp.split("|");
    if(!S.db||!S.me||!nameOf(S.me))return;
    var rk=pr[0]+"_"+S.me,cur=S.rsvp[rk];
    if(cur&&cur.v===pr[1])S.db.doc("rsvp/"+rk).delete().catch(function(){});
    else S.db.doc("rsvp/"+rk).set({eid:pr[0],mid:S.me,v:pr[1]}).catch(function(){});
    return
  }
  if(ds.copy){var e2=findEv(ds.copy);if(!e2)return;copyText("⚡United Spark 決定事項\n"+lab(e2.date)+" "+e2.start+":00–"+e2.end+":00\n"+e2.title+(e2.note?"\n"+e2.note:""),t);return}
  if(ds.evdel){ask("この決定事項を削除する？",function(){S.db.doc("events/"+ds.evdel).delete().catch(function(){})});return}
  if(ds.k&&t.classList.contains("top")){S.rsel=ds.k;var q=ds.k.split("-");S.y=+q[0];S.m=+q[1]-1;render();return}
  if(ds.k&&S.tab==="in"){S.sel=ds.k;render();return}
  if(ds.k&&S.tab==="out"){S.rsel=ds.k;var q2=ds.k.split("-");S.y=+q2[0];S.m=+q2[1]-1;render();return}
  if(ds.h){
    var x=+ds.h,g=(S.days[S.sel]||[]).slice(),mb=(S.maybe[S.sel]||[]).slice(),gi=g.indexOf(x),mi=mb.indexOf(x);
    if(gi>=0){g.splice(gi,1);mb.push(x)}else if(mi>=0){mb.splice(mi,1)}else{g.push(x)}
    var by=function(p,r){return p-r};g.sort(by);mb.sort(by);S.days[S.sel]=g;S.maybe[S.sel]=mb;render();save();return
  }
  if(ds.act==="all"){S.days[S.sel]=HRS.slice();S.maybe[S.sel]=[];render();save();return}
  if(ds.act==="clr"){S.days[S.sel]=[];S.maybe[S.sel]=[];render();save();return}
  if(ds.act==="switch"){S.me="";S.pend="";ls("s","us-me","");render();return}
  if(ds.act==="add"){
    var inp=$("#addn"),nm=inp?inp.value.trim():"";if(!nm||!S.db||!isAdmin())return;
    if(S.roster.some(function(m){return m.name===nm})){S.err="";inp.value="";return}
    var id="m"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
    S.db.doc("members/"+id).set({name:nm,t:Date.now()}).catch(function(){S.err="追加できなかった。共有設定（編集可）を確認してね";render()});
    inp.value="";return
  }

});

function onField(e){
  var t=e.target,f=S.form;
  if(t.id==="fd")f.date=t.value;else if(t.id==="fs")f.start=+t.value;else if(t.id==="fe")f.end=+t.value;else if(t.id==="ft")f.title=t.value;else if(t.id==="fn")f.note=t.value;else if(t.id==="bs")S.bulk.start=+t.value;else if(t.id==="be")S.bulk.end=+t.value;else if(t.id==="bw")S.bulk.weeks=+t.value
}
document.addEventListener("keydown",function(e){if(e.key==="Enter"&&e.target&&e.target.id==="pwin"){e.preventDefault();var b=document.querySelector("[data-act=pwok]");if(b)b.click()}});
document.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.isComposing&&e.keyCode!==229&&e.target&&e.target.id==="cmsg"){e.preventDefault();var b=document.querySelector("[data-act=csend]");if(b)b.click()}});
document.addEventListener("input",onField);document.addEventListener("change",onField);
/* ---- boot ---- */
function applyTheme(t){document.documentElement.setAttribute("data-theme",t);var b=$("#thm");if(b)b.innerHTML=t==="light"?"🌙 ブラック":"☀️ ホワイト";ls("s","us-theme",t)}
$("#thm").onclick=function(){applyTheme(document.documentElement.getAttribute("data-theme")==="light"?"dark":"light")};
applyTheme(ls("g","us-theme")==="light"?"light":"dark");
S.me=ls("g","us-me")||"";
var lr0=ls("g","us-read");S.lastRead=lr0?+lr0:Date.now();if(!lr0)ls("s","us-read",S.lastRead);
setInterval(renderNext,30000);
render();
if(window.getDb){
  window.getDb().then(function(db){
    if(!db){S.err="共有データにつながっていません。Firebaseの設定（config.js）と通信を確認してね";render();return}
    S.db=db;
    setTimeout(function(){if(!S.mFresh){S.noconn=true;render()}},8000);
    db.collection("members").onSnapshot(function(q){
      S.roster=q.docs.map(function(x){var d=x.data()||{};return{id:x.id,name:d.name||"",t:d.t||0}}).sort(function(a,b){return a.t-b.t});
      S.rl=true;S.mFresh=q.fromCache!==true;
      if(S.me&&S.daysFor!==S.me&&nameOf(S.me)){initDays(S.me)}
      renderSoon()
    },function(e){S.err="メンバーを読み込めなかった（"+((e&&e.code)||"unknown")+"）";renderSoon()});
    db.collection("avail").onSnapshot(function(q){
      var all={};q.docs.forEach(function(x){all[x.id]=x.data()});S.avail=all;
      if(S.me&&S.daysFor!==S.me&&nameOf(S.me)){initDays(S.me)}
      if(S.tab==="out"||!S.me)renderSoon()
    },function(e){S.err="みんなの予定を読み込めなかった（"+((e&&e.code)||"unknown")+"）";renderSoon()});
    db.collection("events").onSnapshot(function(q){
      S.events=q.docs.map(function(x){var d=x.data()||{};return{id:x.id,date:d.date||"",start:d.start||0,end:d.end||0,title:d.title||"",note:d.note||"",t:d.t||0,type:d.type||"practice",status:d.status||"on",hist:d.hist||[]}}).filter(function(e){return e.date});
      renderSoon()
    },function(){});
    db.collection("rsvp").onSnapshot(function(q){
      var r={};q.docs.forEach(function(x){r[x.id]=x.data()||{}});S.rsvp=r;renderSoon()
    },function(){});
    db.collection("chat").onSnapshot(function(q){
      S.chat=q.docs.map(function(x){var d=x.data()||{};return{id:x.id,mid:d.mid||"",text:d.text||"",t:d.t||0}}).sort(function(a,b){return a.t-b.t});renderSoon()
    },function(){});
    db.collection("meta").onSnapshot(function(q){
      var ad=null,lg="";q.docs.forEach(function(x){var d=x.data()||{};if(x.id==="admins")ad=d.ids||[];if(x.id==="leader")lg=d.id||""});
      S.admins=ad!==null?ad:(lg?[lg]:[]);S.ml=true;S.metaFresh=q.fromCache!==true;renderSoon()
    },function(e){S.ml=true;S.err="管理者情報を読み込めなかった（"+((e&&e.code)||"unknown")+"）";renderSoon()});
    db.collection("auth").onSnapshot(function(q){
      var a={};q.docs.forEach(function(x){a[x.id]=(x.data()||{}).h||""});S.auth=a;S.al=true;validateMe();renderSoon()
    },function(e){S.al=true;S.err="合言葉情報を読み込めなかった（"+((e&&e.code)||"unknown")+"）";renderSoon()})
  })
}else{S.err="共有データにつながっていません";renderSoon()}
})();
