const el = id => document.getElementById(id);
const search = el("search");
let posts = [];
function image(url, label) {
  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = label;
  img.referrerPolicy = "no-referrer";
  img.onerror = () => {
    const note = document.createElement("span");
    note.className = "fail";
    note.textContent = label + " · 图片暂时无法加载";
    img.replaceWith(note);
  };
  img.src = url;
  return img;
}
function list() {
  const query = search.value.trim().toLocaleLowerCase();
  const matches = posts.filter(post => post.title.toLocaleLowerCase().includes(query));
  el("status").textContent = matches.length ? matches.length + " 篇帖子" : "没有匹配的帖子";
  el("grid").replaceChildren(...matches.map(post => {
    const link = document.createElement("a");
    link.className = "card";
    link.href = "#post/" + post.id;
    const heading = document.createElement("h2");
    heading.textContent = post.title;
    link.append(image(post.main, "主图"), heading);
    return link;
  }));
}
function route() {
  const post = posts.find(p => "#post/" + p.id === location.hash);
  el("catalog").hidden = Boolean(post);
  el("detail").hidden = !post;
  el("pictures").replaceChildren();
  document.title = post ? post.title + " · 影像目录" : "影像目录";
  if (!post) { list(); return; }
  el("title").textContent = post.title;
  el("share-link").href = post.downloadUrl || post.shareUrl;
  el("share-link").textContent = post.downloadUrl ? "直接下载 ↗" : "打开百度网盘 ↗";
  el("share-code").textContent = post.extractionCode;
  for (let i = 0; i <= post.count; i++) {
    const label = i ? "第 " + i + " 张" : "主图";
    const url = i ? post.first.replace(/_001(?=\.[^./?#]+(?:[?#]|$))/, "_" + String(i).padStart(3,"0")) : post.main;
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    caption.textContent = label;
    figure.append(caption,image(url,label));
    el("pictures").append(figure);
  }
  window.scrollTo(0,0);
}
search.addEventListener("input",list);
function bytes(encoded) {
  return Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
}
el("gate").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  if (button.disabled) return;
  button.disabled = true;
  try {
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(el("password").value), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      {name:"PBKDF2", salt:bytes(sealed.salt), iterations:600000, hash:"SHA-256"},
      material, {name:"AES-GCM", length:256}, false, ["decrypt"]
    );
    const batches = await Promise.all([sealed, ...(sealed.parts || [])].map(async part => {
      const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:bytes(part.iv)}, key, bytes(part.data));
      return JSON.parse(new TextDecoder().decode(plain));
    }));
    posts = batches.flat();
    el("password").value = "";
    el("gate").hidden = true;
    window.addEventListener("hashchange", route);
    route();
  } catch {
    el("message").textContent = "无法解锁，请检查访问密码。";
    el("password").select();
  } finally {
    button.disabled = false;
  }
});
