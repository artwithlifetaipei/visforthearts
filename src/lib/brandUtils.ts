export const KNOWN_BRAND_IGS: Record<string, string> = {
    'looom': '@looomasia',
    'looom-club': '@looomasia',
    'looomasia': '@looomasia',
    'looom club邀請': '@looomasia',
    'pumpkin-vintage-watches': '@nangua.vintage.watches',
    'nangua': '@nangua.vintage.watches',
    '南瓜鐘錶': '@nangua.vintage.watches',
    'reborn-antique': '@reborn_antique_store',
    'reborn antique 古董雜貨鋪': '@reborn_antique_store',
    'dan-retro-furniture': '@dan_decoantique_',
    'dan retro & furniture': '@dan_decoantique_',
    'j-l-jewelry': '@jl_jewelry2020',
    '詠聆珠寶': '@jl_jewelry2020',
    'aaa': '@theartpressasia',
};

export function extractIgHandle(urlOrHandle: string | null | undefined, fallbackKey?: string): string {
    if (fallbackKey) {
        const normKey = fallbackKey.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
        if (KNOWN_BRAND_IGS[normKey]) return KNOWN_BRAND_IGS[normKey];
        if (KNOWN_BRAND_IGS[fallbackKey.toLowerCase().trim()]) return KNOWN_BRAND_IGS[fallbackKey.toLowerCase().trim()];
    }

    if (!urlOrHandle) return '@visforthearts';
    let clean = urlOrHandle.trim();
    if (!clean) return '@visforthearts';

    const lower = clean.toLowerCase();
    for (const [key, ig] of Object.entries(KNOWN_BRAND_IGS)) {
        if (lower.includes(key)) return ig;
    }

    if (clean.includes('instagram.com/')) {
        const after = clean.split('instagram.com/')[1];
        if (after) {
            const handle = after.split('/')[0].split('?')[0].split('&')[0].replace(/^@/, '').trim();
            if (handle) return `@${handle}`;
        }
    }

    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('.com') || clean.includes('.net') || clean.includes('.org') || clean.includes('/')) {
        return '@visforthearts';
    }

    clean = clean.replace(/^@+/, '').split('?')[0].split('/')[0].trim();
    return clean ? `@${clean}` : '@visforthearts';
}
