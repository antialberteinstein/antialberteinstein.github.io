const typingText = [
    "I'm a third-year student",
    "I am passionate about AI development",
    "I am obsessed with pursuit of True AI"
];
let count = 0;
let index = 0;
let currentText = "";
let letter = "";

// Typing Effect
(function type() {
    if (count === typingText.length) {
        count = 0;
    }
    currentText = typingText[count];
    letter = currentText.slice(0, ++index);

    const typingElement = document.getElementById("typing-element");
    if (typingElement) {
        typingElement.textContent = letter;
    }

    if (letter.length === currentText.length) {
        count++;
        index = 0;
        setTimeout(type, 2000);
    } else {
        setTimeout(type, 100);
    }
})();

// Mobile Navigation
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links li');

burger.addEventListener('click', () => {
    // Toggle Nav
    nav.classList.toggle('nav-active');

    // Animate Links
    navLinks.forEach((link, index) => {
        if (link.style.animation) {
            link.style.animation = '';
        } else {
            link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
        }
    });

    // Burger Animation
    burger.classList.toggle('toggle');
});

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });

        // Close mobile menu if open
        if (nav.classList.contains('nav-active')) {
            nav.classList.remove('nav-active');
            navLinks.forEach((link) => {
                link.style.animation = '';
            });
            burger.classList.remove('toggle');
        }
    });
});

// Header Background on Scroll
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    header.classList.toggle('scrolled', window.scrollY > 50);
});

/* ── News Panel ─────────────────────────────────────────────── */
const NEWS_SOURCES = {
    technologyreview: { rss: 'https://www.technologyreview.com/feed/' },
    huggingface:      { rss: 'https://huggingface.co/blog/feed.xml' },
    towardsdatascience: { rss: 'https://machinelearningmastery.com/blog/feed/' },
};

const MAX_ITEMS = 8;

/* CORS proxy list — tried in order until one succeeds.
   allorigins /get returns JSON { contents: "<xml>..." } to avoid binary encoding issues. */
const CORS_PROXIES = [
    async url => {
        const res = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(7000) }
        );
        if (!res.ok) return null;
        const json = await res.json();
        return json.contents ?? null;
    },
    async url => {
        const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(7000) }
        );
        if (!res.ok) return null;
        return res.text();
    },
    async url => {
        const res = await fetch(
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(7000) }
        );
        if (!res.ok) return null;
        return res.text();
    },
];

/** Render skeleton placeholder rows while loading */
function renderSkeleton(container) {
    container.innerHTML = Array.from({ length: 4 }, () => `
        <div class="news-skeleton">
            <div class="news-skeleton-line"></div>
            <div class="news-skeleton-line short"></div>
        </div>
    `).join('');
}

/** Format a date string to a readable short date */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Extract <item> or <entry> nodes from a parsed RSS/Atom XML document */
function parseRssXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    /* Support both RSS 2.0 (<item>) and Atom (<entry>) */
    const items = [...doc.querySelectorAll('item, entry')].slice(0, MAX_ITEMS);

    return items.map(el => {
        const getText = tag => el.querySelector(tag)?.textContent?.trim() ?? '';
        const link = el.querySelector('link')?.getAttribute('href')
            || el.querySelector('link')?.textContent?.trim()
            || '';
        return {
            title: getText('title'),
            link,
            pubDate: getText('pubDate') || getText('published') || getText('updated'),
        };
    }).filter(i => i.title && i.link);
}

/** Try each CORS proxy in sequence; return items array on first success */
async function fetchRssItems(rssUrl) {
    for (const proxy of CORS_PROXIES) {
        try {
            const text = await proxy(rssUrl);
            if (!text) continue;
            const items = parseRssXml(text);
            if (items.length) return items;
        } catch (_) {
            /* try next proxy */
        }
    }
    return [];
}

/** Fetch and render news for a given source key */
async function loadNews(sourceKey) {
    const container = document.getElementById(`news-${sourceKey}`);
    if (!container || container.dataset.loaded) return;

    renderSkeleton(container);

    const items = await fetchRssItems(NEWS_SOURCES[sourceKey].rss);

    if (!items.length) {
        container.innerHTML = `
            <div class="news-item">
                <span class="news-item-title" style="color:rgba(255,255,255,0.4)">
                    Could not load news. Try again later.
                </span>
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <a class="news-item" href="${item.link}" target="_blank" rel="noopener noreferrer">
            <span class="news-item-title">${item.title}</span>
            <span class="news-item-date">${formatDate(item.pubDate)}</span>
        </a>
    `).join('');
    container.dataset.loaded = 'true';
}

/** Tab switching */
document.querySelectorAll('.news-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const source = tab.dataset.source;

        document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.news-list').forEach(list => list.classList.add('hidden'));
        document.getElementById(`news-${source}`).classList.remove('hidden');

        loadNews(source);
    });
});

/* Load the default (first) tab on page ready */
loadNews('technologyreview');
