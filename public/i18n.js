const getTranslations = async (lang) => {
    // Try to get from session storage first for efficiency
    const cached = sessionStorage.getItem(`translations_${lang}`);
    if (cached) {
        return JSON.parse(cached);
    }

    // If not cached, fetch from server
    try {
        const response = await fetch(`/locals/${lang}.json`);
        if (!response.ok) {
            console.error(`Could not load language file: ${lang}`);
            return null;
        }
        const translations = await response.json();
        // Cache the freshly fetched translations in session storage
        sessionStorage.setItem(`translations_${lang}`, JSON.stringify(translations));
        return translations;
    } catch (error) {
        console.error('Error fetching language file:', error);
        return null;
    }
};

async function setLanguage(lang) {
    const currentLang = lang || localStorage.getItem('language') || 'en';
    let translations = await getTranslations(currentLang);

    // Fallback to English if the selected language fails to load
    if (!translations && currentLang !== 'en') {
        console.warn(`Falling back to English because ${currentLang}.json could not be loaded.`);
        translations = await getTranslations('en');
    }

    if (!translations) {
        console.error('Failed to load any language files.');
        return;
    }

    localStorage.setItem('language', currentLang);
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) element.textContent = translations[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) element.placeholder = translations[key];
    });

    const langSelector = document.getElementById('language-selector');
    if (langSelector) langSelector.value = currentLang;
}

document.addEventListener('DOMContentLoaded', () => {
    setLanguage();

    const langChangeBtn = document.getElementById('change-language-btn');
    const langSelector = document.getElementById('language-selector');

    if (langChangeBtn && langSelector) {
        langChangeBtn.addEventListener('click', () => setLanguage(langSelector.value));
    }
});