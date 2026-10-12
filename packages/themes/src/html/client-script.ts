/**
 * The two small vanilla scripts every rendered template page carries.
 *
 * They are emitted as strings because the page they run in is the template's
 * own document, not an Astro/Preact one (and Invariant #8 keeps storefront JS
 * framework-free). Both are a few hundred bytes gzipped.
 */

export interface RuntimeConfig {
  mode: "preview" | "draft" | "live";
  checkoutUrl: string;
}

/** `postMessage` envelope shared with the dashboard's theme editor. */
export const TEMPLATE_BRIDGE_SOURCE = "gocom-template";

/**
 * Runs before any template script. A template page is sandboxed into an opaque
 * origin, where touching `localStorage`, `sessionStorage` or `document.cookie`
 * throws; third-party sliders and menus do exactly that on start-up. Give them
 * harmless in-memory stand-ins so the page renders the same as on its own site.
 */
export function buildBootScript(): string {
  return `(function(){
function mem(){var d={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}
["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("_")}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}});
try{document.cookie}catch(e){try{Object.defineProperty(document,"cookie",{get:function(){return""},set:function(){},configurable:true})}catch(_){}}
})();`;
}

/**
 * Runs after the template's own markup.
 *
 * - Every order / buy / cart control and every form leads to the store's real
 *   checkout page (the template's own forms post to the site it came from).
 * - In `preview` and `draft` nothing navigates away; a toast explains instead.
 * - In `draft` it is also the editor bridge: clicking a text or image tells the
 *   dashboard which field to open, and edits made there are applied in place.
 */
export function buildRuntimeScript(config: RuntimeConfig): string {
  const cfg = JSON.stringify(config).replace(/</g, "\\u003c");
  return `(function(){
var C=${cfg},SRC=${JSON.stringify(TEMPLATE_BRIDGE_SOURCE)},live=C.mode==="live",draft=C.mode==="draft";
var ORDER=/(অর্ডার|কিনুন|ক্রয়|কার্ট|order|buy|add to cart|checkout|shop now|purchase)/i;
var ORDER_CLASS=/(add[_-]to[_-]cart|checkout|place[_-]order|buy[_-]now|order[_-]now)/i;
function toast(t){var n=document.createElement("div");n.textContent=t;n.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#0f172a;color:#fff;padding:10px 18px;border-radius:10px;font:500 13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:90vw;text-align:center";document.body.appendChild(n);setTimeout(function(){n.remove()},2600)}
function checkout(){if(live){location.href=C.checkoutUrl}else{toast("প্রিভিউ মোড — লাইভ স্টোরে এই বাটন চেকআউট পেজে নিয়ে যাবে")}}
function isSearch(f){return f.getAttribute("role")==="search"||/search/i.test(f.className||"")||!!f.querySelector('input[type=search],input[name=s],input[name=q]')}
function send(m){m.source=SRC;try{parent.postMessage(m,"*")}catch(e){}}

document.addEventListener("submit",function(e){e.preventDefault();e.stopPropagation();if(!isSearch(e.target))checkout()},true);

document.addEventListener("click",function(e){
var t=e.target;if(!t||!t.closest)return;
if(draft){var s=t.closest("[data-gc],[data-gc-i]");if(s){var img=s.hasAttribute("data-gc-i");send({type:"select",kind:img?"image":"text",id:img?s.getAttribute("data-gc-i"):s.getAttribute("data-gc").split(" ")[0]})}}
var a=t.closest("a[href]");
if(a){var h=a.getAttribute("href")||"";
if(a.hasAttribute("data-gc-cta")){e.preventDefault();e.stopPropagation();if(!draft)checkout();return}
if(h==="#"){e.preventDefault();return}
if(h.charAt(0)==="#")return;
if(draft||(!live&&/^https?:/i.test(h)&&a.host!==location.host)){e.preventDefault();e.stopPropagation()}
return}
var b=t.closest("button,[role=button],input[type=submit],input[type=button]");
if(b&&!b.closest("form")&&(ORDER.test(b.textContent||b.value||"")||ORDER_CLASS.test(b.className||""))){e.preventDefault();e.stopPropagation();if(!draft)checkout()}
},true);

if(!draft)return;
var st=document.createElement("style");st.textContent="[data-gc]:hover,[data-gc-i]:hover{outline:2px dashed #2563eb!important;outline-offset:2px;cursor:pointer!important}.gc-flash{outline:3px solid #2563eb!important;outline-offset:3px;transition:outline-color .2s}";document.head.appendChild(st);
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function textEl(id){var l=document.querySelectorAll("[data-gc]");for(var i=0;i<l.length;i++){if(l[i].getAttribute("data-gc").split(" ").indexOf(id)>=0)return l[i]}return null}
function flash(el){if(!el)return;el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.add("gc-flash");setTimeout(function(){el.classList.remove("gc-flash")},1400)}
window.addEventListener("message",function(e){
var m=e.data;if(!m||m.source!==SRC||e.source!==parent)return;
if(m.type==="focus"){flash(m.kind==="image"?document.querySelector('[data-gc-i="'+m.id+'"]'):textEl(m.id));return}
if(m.type!=="apply")return;
if(m.kind==="image"){var im=document.querySelectorAll('[data-gc-i="'+m.id+'"]');for(var i=0;i<im.length;i++){["srcset","data-srcset","data-lazy-srcset","sizes","data-src","data-lazy-src","data-original"].forEach(function(n){im[i].removeAttribute(n)});im[i].src=m.value}return}
var el=textEl(m.id);if(!el)return;
var ids=el.getAttribute("data-gc").split(" ");
if(ids.length===1&&!el.querySelector("*:not(br):not(b):not(strong):not(i):not(em):not(u)")){el.innerHTML=esc(m.value).replace(/\\r?\\n/g,"<br>");return}
var k=ids.indexOf(m.id),n=0;for(var c=el.firstChild;c;c=c.nextSibling){if(c.nodeType===3&&/[\\p{L}\\p{N}]/u.test(c.nodeValue)){if(n===k){c.nodeValue=m.value;return}n++}}
});
send({type:"ready"});
})();`;
}
