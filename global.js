console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// var navLinks = $$("nav a")

// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname,
//   );

// currentLink?.classList.add('current');

let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact'},
    { url: 'resume/index.html', title: 'Resume'},
    { url: 'https://github.com/jyepez26', title: 'Github Profile'}
    // add the rest of your pages here
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages){
    let url = p.url;
    let title = p.title;
    const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "/"                  // Local server
      : "/portolio/";         // GitHub Pages repo name
    url = !url.startsWith('http') ? BASE_PATH + url : url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname,
    );
    if (a.host != location.host){
      a.target = "_blank";
    }
    nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`,
);

let select = document.querySelector('select');

// if ("colorScheme" in localStorage){
//   document.documentElement.style.setProperty('color-scheme', "colorScheme");
// }

select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  document.documentElement.style.setProperty('color-scheme', event.target.value);
  localStorage.setItem('colorScheme', event.target.value);
});

document.addEventListener('DOMContentLoaded', function (event) {
  const stored_val = localStorage.getItem('colorScheme')
  if (stored_val){
    document.documentElement.style.setProperty('color-scheme', stored_val);
    select.value = stored_val;
  }
});