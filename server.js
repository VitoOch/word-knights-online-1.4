'use strict';
// Word Knights real-time, two-player server. Zero external runtime dependencies.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 3000);
const BASE = __dirname;
const words = [
 ['ash','bow','oak','fog','axe','sun','wolf','moon','king','rose','helm','lily','stag','ring','moss','gale','dawn','iron','sword','stone','shield','fire','rune','star'],
 ['raven','ember','squire','oath','blade','crown','valor','dagger','realm','banner','armor','throne','petal','falcon','castle','golden','warden','chapel','silver','lantern','sparrow','knight','dragon'],
 ['citadel','bastion','wyvern','specter','gauntlet','sorcery','vanguard','warlock','phantom','paladin','grimoire','labyrinth','courtyard','moonlight','watchtower','oakenshield','dawnfire'],
 ['necromancer','dragonfire','shadowbound','runebreaker','spellbinder','dreadknight','battlement','stormbringer','silverbloom','lionhearted'],
 ['transfiguration','malediction','retribution','abysswalker','sanctification','conflagration','chrysanthemum','luminescence','resplendence']
];
const knightIds=['ivory','obsidian','amethyst','rose'];
const rooms=new Map();let eventId=0;
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function send(ws,msg){if(ws&&ws.connected)ws.send(JSON.stringify(msg))}
function emit(room,type,extra={}){room.events.push({id:++eventId,type,...extra});room.events=room.events.slice(-15)}
function member(name,ws){return {name:String(name||'Knight').trim().slice(0,20)||'Knight',ws,knight:'ivory',ready:false,hp:100,zone:'center',word:'',queue:[],used:[],typed:'',hits:0,blockUntil:0,blockReady:0,feedbackUntil:0,feedback:'',strikeAt:0,strikeSide:'center',typingStartedAt:0}}
function nextWord(p){const tier=Math.min(4,Math.floor(p.hits/3));let w,loops=0;do{w=pick(words[tier]);loops++}while(p.used.includes(w)&&loops<40);p.used.push(w);p.used=p.used.slice(-25);return w}
function resetPlayer(p){p.hp=100;p.zone='center';p.typed='';p.hits=0;p.blockUntil=0;p.blockReady=0;p.feedbackUntil=0;p.feedback='';p.strikeAt=0;p.strikeSide='center';p.queue=[];p.used=[];p.typingStartedAt=0;for(let i=0;i<6;i++)p.queue.push(nextWord(p));p.word=p.queue.shift()}
function rollWord(p){p.typed='';p.word=p.queue.shift()||nextWord(p);p.queue.push(nextWord(p));p.typingStartedAt=0}
function snapshotFor(room,i,now){const a=room.members[i],b=room.members[1-i];return {type:'state',code:room.code,roomPhase:room.phase,round:room.round,scores:room.scores.slice(),startAt:room.startAt,nextAt:room.nextAt,finishedWinner:room.finishedWinner,serverNow:now,me:info(a,now),enemy:info(b,now),events:room.events.slice(-10)}}
function info(p,now){if(!p)return {name:'',knight:'obsidian',hp:100,zone:'center',word:'',queue:[],typed:'',hits:0,blockUntil:0,blockReady:0,feedback:'',feedbackUntil:0,typingStartedAt:0};return {name:p.name,knight:p.knight,hp:p.hp,zone:p.zone,word:p.word,queue:p.queue.slice(0,5),typed:p.typed,hits:p.hits,blockUntil:p.blockUntil,blockReady:p.blockReady,feedback:now<p.feedbackUntil?p.feedback:'',feedbackUntil:p.feedbackUntil,typingStartedAt:p.typingStartedAt}}
function broadcasts(room){const now=Date.now();room.members.forEach((p,i)=>send(p.ws,snapshotFor(room,i,now)))}
function startRound(room,index,now){room.round=index;room.phase='intro';room.startAt=now+6500;room.nextAt=0;room.members.forEach(resetPlayer);emit(room,'round_start',{round:index});broadcasts(room)}
function conclude(room,winner,now){room.scores[winner]++;const matchEnd=room.scores[winner]>=2||room.round>=2;room.phase=matchEnd?'finished':'round_end';room.finishedWinner=matchEnd?winner:null;room.nextAt=matchEnd?0:now+3000;emit(room,matchEnd?'match_end':'round_end',{winner,round:room.round});broadcasts(room)}
function strike(room,i,now){const attacker=room.members[i],defender=room.members[1-i];attacker.strikeAt=0;if(room.phase!=='battle')return;
 if(defender.blockUntil>now&&defender.zone===attacker.strikeSide){emit(room,'blocked',{actor:i,target:1-i,zone:attacker.strikeSide});return}
 defender.hp=Math.max(0,defender.hp-12);if(defender.strikeAt&&defender.strikeAt>now){defender.strikeAt=0;emit(room,'interrupted',{actor:i,target:1-i})}else if(defender.typed.length){defender.typed='';defender.typingStartedAt=0;defender.strikeAt=0;emit(room,'interrupted',{actor:i,target:1-i})}
 emit(room,'hit',{actor:i,target:1-i,zone:attacker.strikeSide,damage:12});if(defender.hp<=0)conclude(room,i,now)}
function onAction(room,i,data){if(room.phase!=='battle')return;const now=Date.now(),p=room.members[i];
 if(data.action==='stance') {if(['left','center','right'].includes(data.zone))p.zone=data.zone;return}
 if(data.action==='block') {if(now>=p.blockReady){p.blockUntil=now+2000;p.blockReady=now+5000;emit(room,'guard',{actor:i})}return}
 if(data.action!=='key'||now<p.feedbackUntil||!/^[a-z]$/.test(data.key||''))return;
 const key=data.key,expected=p.word[p.typed.length];
 if('awd'.includes(key) && key!==expected)return;
 if(key!==expected){p.feedback='fail';p.feedbackUntil=now+420;emit(room,'misspell',{actor:i});return}
 if(!p.typed.length)p.typingStartedAt=now;
 p.typed+=key;
 if(p.typed===p.word){p.feedback='success';p.feedbackUntil=now+510;p.strikeAt=now+190;p.strikeSide=p.zone;p.hits++;emit(room,'swing',{actor:i,zone:p.zone})}
}
function onMessage(ws,data){const type=String(data.type||'');const room=ws.room;
 if(type==='create'){
  if(room)return send(ws,{type:'error',message:'Already in a room'});
  let code;do{code=Array.from(crypto.randomBytes(4)).map(b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('')}while(rooms.has(code));
  const r={code,members:[member(data.name,ws)],scores:[0,0],round:0,phase:'lobby',startAt:0,nextAt:0,finishedWinner:null,events:[],createdAt:Date.now()};rooms.set(code,r);ws.room=r;ws.index=0;send(ws,{type:'joined',code,index:0,name:r.members[0].name});broadcasts(r);return;
 }
 if(type==='join'){
  if(room)return send(ws,{type:'error',message:'Already in a room'});
  const code=String(data.code||'').trim().toUpperCase();const r=rooms.get(code);
  if(!r)return send(ws,{type:'error',message:'Room not found. Check the four-letter code.'});
  if(r.members.length>=2)return send(ws,{type:'error',message:'This room already has two knights.'});
  if(r.phase!=='lobby')return send(ws,{type:'error',message:'This duel has already started.'});
  r.members.push(member(data.name,ws));ws.room=r;ws.index=1;send(ws,{type:'joined',code,index:1,name:r.members[1].name});broadcasts(r);return;
 }
 if(!room)return send(ws,{type:'error',message:'Create or join a room first'});
 const p=room.members[ws.index];if(!p)return;
 if(type==='ready'){
  if(room.phase!=='lobby')return;
  if(!knightIds.includes(data.knight))return;
  p.knight=data.knight;p.ready=true;
  emit(room,'ready',{actor:ws.index});
  if(room.members.length===2&&room.members.every(x=>x.ready))startRound(room,0,Date.now());else broadcasts(room);
  return;
 }
 if(type==='action'){onAction(room,ws.index,data);broadcasts(room)}
}
function tick(){const now=Date.now();for(const [code,room] of rooms){
 if(room.phase==='lobby'&&now-room.createdAt>3*60*60*1000){room.members.forEach(m=>m.ws.close());rooms.delete(code);continue}
 if(room.phase==='intro'&&now>=room.startAt)room.phase='battle';
 if(room.phase==='round_end'&&now>=room.nextAt)startRound(room,room.round+1,now);
 if(room.phase==='battle'){
  room.members.forEach((p,i)=>{if(p.strikeAt&&now>=p.strikeAt)strike(room,i,now);if(p.feedbackUntil&&now>=p.feedbackUntil){p.feedbackUntil=0;p.feedback='';rollWord(p)}})
 }
 broadcasts(room)
 }}
setInterval(tick,100);
class Peer{
 constructor(socket){this.socket=socket;this.connected=true;this.buffer=Buffer.alloc(0);this.last=Date.now();socket.on('data',b=>this.read(b));socket.on('close',()=>this.close());socket.on('error',()=>this.close())}
 send(text){if(!this.connected)return;const b=Buffer.from(text);let header;if(b.length<126)header=Buffer.from([0x81,b.length]);else if(b.length<65536){header=Buffer.alloc(4);header[0]=0x81;header[1]=126;header.writeUInt16BE(b.length,2)}else{header=Buffer.alloc(10);header[0]=0x81;header[1]=127;header.writeBigUInt64BE(BigInt(b.length),2)}try{this.socket.write(Buffer.concat([header,b]))}catch(e){this.close()}}
 read(buf){this.buffer=Buffer.concat([this.buffer,buf]);if(this.buffer.length>65536){this.close();return}while(this.buffer.length>=2){const a=this.buffer[0],b=this.buffer[1],opcode=a&15;if(!(a&0x80)){this.close();return}let len=b&127,off=2;if(len===126){if(this.buffer.length<4)return;len=this.buffer.readUInt16BE(2);off=4}else if(len===127){if(this.buffer.length<10)return;const n=this.buffer.readBigUInt64BE(2);if(n>BigInt(65536)){this.close();return}len=Number(n);off=10}if(!(b&128)){this.close();return}if(this.buffer.length<off+4+len)return;const mask=this.buffer.subarray(off,off+4),pay=Buffer.from(this.buffer.subarray(off+4,off+4+len));this.buffer=this.buffer.subarray(off+4+len);for(let i=0;i<pay.length;i++)pay[i]^=mask[i%4];if(opcode===8){this.close();return}if(opcode===9){this.socket.write(Buffer.from([0x8a,pay.length,...pay]));continue}if(opcode!==1)continue;try{onMessage(this,JSON.parse(pay.toString('utf8')))}catch(e){send(this,{type:'error',message:'Malformed request'})}}}
 close(){if(!this.connected)return;this.connected=false;try{this.socket.end()}catch{}if(this.room){const r=this.room;rooms.delete(r.code);r.members.forEach(x=>{if(x.ws!==this)send(x.ws,{type:'disconnected',message:'The other knight disconnected. Your room is closed.'})});this.room=null}}
}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok',rooms:rooms.size}));return}
 if(!['/','/index.html','/assets/woods.webp','/assets/shield-ivory.png','/assets/shield-obsidian.png','/assets/shield-amethyst.png','/assets/shield-rose.png'].includes(u.pathname)){res.writeHead(404);res.end('Not found');return}
 const filename=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'');const file=path.resolve(BASE,filename);if(!file.startsWith(BASE+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end('Not found');return}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.html')?'no-cache':'public, max-age=86400'});res.end(buf)})
});
server.on('upgrade',(req,socket)=>{if(req.headers.upgrade?.toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){socket.destroy();return}const key=req.headers['sec-websocket-key'];const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');new Peer(socket)});
server.listen(PORT,'0.0.0.0',()=>console.log('Word Knights listening on '+PORT));
