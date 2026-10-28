// Live SEO score for the article editor (NF-003). Same rules and points as
// api/components/BlogSeo.php::score, so the number the author sees while typing is
// the number the editor sees after saving; the stored score is always the server's.

export interface BlogSeoCheck {
  key: string;
  passed: boolean;
  points: number;
  max: number;
}

export interface BlogSeoInput {
  title: string;
  slug: string | null;
  contentHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  category: string | null;
  tags: string[];
  coverImageUrl: string | null;
  coverAlt: string | null;
  references: string | null;
}

export function blogPlainText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h2|\/h3|\/li|\/blockquote)[^>]*>/gi, ' $&')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function blogWordCount(html: string): number {
  const text = blogPlainText(html);
  return text ? text.split(/\s+/).length : 0;
}

/** Same as BlogSeo::slugify: "Five Pillars of Salah!" → "five-pillars-of-salah". */
export function blogSlugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80)
    .replace(/-+$/, '');
  return slug || 'article';
}

export function blogSeoScore(input: BlogSeoInput): { score: number; checks: BlogSeoCheck[] } {
  const html = input.contentHtml || '';
  const metaTitle = input.metaTitle || input.title || '';
  const metaDescription = input.metaDescription || '';
  const keyword = (input.focusKeyword || '').trim().toLowerCase();
  const words = blogWordCount(html);
  const firstParagraph = blogPlainText(/<p[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? '');
  const contains = (text: string) => keyword !== '' && text.toLowerCase().includes(keyword);
  const slug = input.slug ? blogSlugify(input.slug) : blogSlugify(input.title || '');

  const rules: Array<[string, boolean, number, number?]> = [
    ['meta_title_length', metaTitle.length >= 30 && metaTitle.length <= 60, 10],
    ['meta_description_length', metaDescription.length >= 120 && metaDescription.length <= 160, 10],
    ['keyword_set', keyword !== '', 5],
    ['keyword_in_title', contains(metaTitle) || contains(input.title || ''), 10],
    ['keyword_in_description', contains(metaDescription), 5],
    ['keyword_in_intro', contains(firstParagraph), 5],
    ['keyword_in_slug', keyword !== '' && slug.includes(blogSlugify(keyword)), 5],
    ['length', words >= 600, 15, words >= 300 ? 8 : 0],
    ['subheadings', /<h2[\s>]/i.test(html), 10],
    ['cover_image', !!input.coverImageUrl, 5],
    ['cover_alt', !!(input.coverAlt || '').trim(), 5],
    ['internal_link', /<a[^>]+href="(\/|https?:\/\/(www\.)?salah-times\.in)/i.test(html), 5],
    ['references', !!(input.references || '').trim(), 5],
    ['category_tags', !!input.category && input.tags.length > 0, 5]
  ];

  const checks = rules.map(([key, passed, max, partial]) => ({ key, passed, max, points: passed ? max : (partial ?? 0) }));
  return { score: checks.reduce((total, check) => total + check.points, 0), checks };
}
