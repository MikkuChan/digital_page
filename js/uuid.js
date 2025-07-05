// UUIDv1 generator (timestamp + random) [Not 100% RFC but OK for most use]
function uuidV1() {
  const now = Date.now();
  let timestampHex = now.toString(16).padStart(12, '0');
  let random = '';
  for(let i=0;i<20;i++) random += Math.floor(Math.random()*16).toString(16);
  return (
    timestampHex.slice(0,8) + '-' +
    timestampHex.slice(8,12) + '-' +
    '1' + random.slice(0,3) + '-' +
    random.slice(3,7) + '-' +
    random.slice(7,19)
  );
}

// UUIDv4 generator (RFC4122)
function uuidV4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// UUIDv7 (epoch millis + randomness) pseudo (Not final RFC but good for demo)
function uuidV7() {
  // 48bit timestamp millis, 12 random hex, RFC draft
  const now = Date.now();
  const ts = now.toString(16).padStart(12,'0');
  let rand = '';
  for(let i=0;i<20;i++) rand += Math.floor(Math.random()*16).toString(16);
  return (
    ts.slice(0,8) + '-' +
    ts.slice(8,12) + '-' +
    '7' + rand.slice(0,3) + '-' +
    rand.slice(3,7) + '-' +
    rand.slice(7,19)
  );
}

// Helper
function setValAndCopy(id, val) {
  document.getElementById(id).value = val;
  document.getElementById(id).focus();
}

function copyToClipboard(id, showToast=true) {
  const el = document.getElementById(id);
  el.select(); el.setSelectionRange(0, 99);
  document.execCommand("copy");
  if(showToast) showCopiedToast();
}

// Nice copy toast
function showCopiedToast() {
  let toast = document.createElement("div");
  toast.className = "position-fixed bottom-0 start-50 translate-middle-x mb-4 px-4 py-2 fw-semibold text-white rounded-pill shadow-lg";
  toast.style.background = "linear-gradient(90deg,#2062f7,#19c37d 70%,#fbbf24 100%)";
  toast.style.fontSize = "1.08rem";
  toast.style.zIndex = 9999;
  toast.innerHTML = '<i class="bi bi-clipboard-check me-2"></i>Copied!';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = 0; }, 1300);
  setTimeout(() => { toast.remove(); }, 1700);
}

document.addEventListener('DOMContentLoaded', function(){
  // v1
  document.getElementById('genV1').onclick = () => {
    setValAndCopy('uuidV1', uuidV1());
  };
  document.getElementById('copyV1').onclick = () => {
    copyToClipboard('uuidV1');
  };
  // v4
  document.getElementById('genV4').onclick = () => {
    setValAndCopy('uuidV4', uuidV4());
  };
  document.getElementById('copyV4').onclick = () => {
    copyToClipboard('uuidV4');
  };
  // v7
  document.getElementById('genV7').onclick = () => {
    setValAndCopy('uuidV7', uuidV7());
  };
  document.getElementById('copyV7').onclick = () => {
    copyToClipboard('uuidV7');
  };
});
