import { blogSeoScore, blogSlugify, blogWordCount, BlogSeoInput } from './blog-seo-score';

// Same expectations as api/components/BlogSeo.php::score, so the editor's live score and the stored score agree.
describe('blogSeoScore', () => {
  const words = (count: number) => Array.from({ length: count }, () => 'word').join(' ');
  const base: BlogSeoInput = {
    title: 'How to pray Fajr salah on time',
    slug: null,
    contentHtml: '',
    metaTitle: null,
    metaDescription: null,
    focusKeyword: null,
    category: null,
    tags: [],
    coverImageUrl: null,
    coverAlt: null,
    references: null
  };

  it('scores an empty article only for its title length', () => {
    const result = blogSeoScore(base);
    expect(result.score).toBe(10);
    expect(result.checks.find(check => check.key === 'meta_title_length')?.passed).toBeTrue();
  });

  it('gives 100 when every check passes', () => {
    const result = blogSeoScore({
      ...base,
      contentHtml: `<p>Fajr salah is the first prayer. ${words(600)}</p><h2>Sleep early</h2><p><a href="/prayer-times">Prayer times</a></p>`,
      metaDescription: 'Simple habits that help you wake up for Fajr salah on time every day, from sleeping early to setting an azan alarm on your phone.',
      focusKeyword: 'Fajr salah',
      category: 'salah',
      tags: ['fajr'],
      coverImageUrl: 'https://example.test/cover.webp',
      coverAlt: 'Sunrise',
      references: 'Sahih Muslim 657'
    });
    expect(result.checks.filter(check => !check.passed).map(check => check.key)).toEqual([]);
    expect(result.score).toBe(100);
  });

  it('gives part marks for 300–599 words', () => {
    const result = blogSeoScore({ ...base, contentHtml: `<p>${words(320)}</p>` });
    expect(result.checks.find(check => check.key === 'length')?.points).toBe(8);
  });

  it('counts words across tags and entities', () => {
    expect(blogWordCount('<p>one&nbsp;two</p><h2>three</h2><ul><li>four</li></ul>')).toBe(4);
  });

  it('makes slugs like the API', () => {
    expect(blogSlugify('Five Pillars of Salah!')).toBe('five-pillars-of-salah');
    expect(blogSlugify('نماز')).toBe('article');
  });
});
