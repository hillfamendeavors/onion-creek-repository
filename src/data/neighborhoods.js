// One entry per neighborhood. Everything that differs between the four pages
// lives here; the listings themselves live in ./<slug>.json.
//
// `theme` is the per-neighborhood color palette. It is injected as CSS custom
// properties (a :root block) on each page, and directory.css references those
// variables — so each neighborhood keeps its own distinct colors.
//
// `order` is optional and only present where an "Order a Directory" modal
// should be rendered (currently Sunfield, kept dormant — no trigger wired,
// matching the original site).

export const neighborhoods = [
  {
    slug: 'avery-ranch',
    name: 'Avery Ranch',
    title: 'Avery Ranch Directory',
    footerLabel: 'Avery Ranch YP',
    formspreeId: 'mpqnezbn',
    subjectPrefix: 'New Avery Ranch Referral',
    // Navy & gold
    theme: {
      '--masters-green': '#1A365D',
      '--masters-green-mid': '#2B4C7E',
      '--masters-green-light': '#5A8FCE',
      '--masters-yellow': '#D4AF37',
      '--masters-yellow-pale': '#F4F8FC',
      '--white': '#ffffff',
      '--off-white': '#FAFBFD',
      '--light-gray': '#E2E8F0',
      '--mid-gray': '#4A5568',
      '--dark-gray': '#1A202C',
      '--text': '#2D3748',
      '--border': '#E2E8F0',
      '--phone': '#1A365D',
      '--phone-hover': '#0f2038',
    },
  },
  {
    slug: 'circle-c',
    name: 'Circle C',
    title: 'Circle C Directory',
    footerLabel: 'Circle C YP',
    formspreeId: 'xeedaqvl',
    subjectPrefix: 'New Circle C YP Referral',
    // Deep teal & warm gold
    theme: {
      '--masters-green': '#0F3B3F',
      '--masters-green-mid': '#215D60',
      '--masters-green-light': '#7FB3AD',
      '--masters-yellow': '#CFA45C',
      '--masters-yellow-pale': '#FBF7ED',
      '--white': '#ffffff',
      '--off-white': '#FBFBF9',
      '--light-gray': '#EAE7E0',
      '--mid-gray': '#55544F',
      '--dark-gray': '#1F1F1E',
      '--text': '#222221',
      '--border': '#E4E2DB',
      '--phone': '#9A5C2B',
      '--phone-hover': '#7a3f20',
    },
  },
  {
    slug: 'onion-creek',
    name: 'Onion Creek',
    title: 'Onion Creek Directory',
    footerLabel: 'Onion Creek YP',
    formspreeId: 'xqewrzww',
    subjectPrefix: 'New Onion Creek YP Referral',
    // Masters green & yellow
    theme: {
      '--masters-green': '#1a3a2a',
      '--masters-green-mid': '#2d5a3d',
      '--masters-green-light': '#3d7a52',
      '--masters-yellow': '#f5d06e',
      '--masters-yellow-pale': '#fdf6e3',
      '--white': '#ffffff',
      '--off-white': '#f8f8f6',
      '--light-gray': '#e8e8e4',
      '--mid-gray': '#999990',
      '--dark-gray': '#333330',
      '--text': '#1a1a18',
      '--border': '#d0d0c8',
      '--phone': '#cc2200',
      '--phone-hover': '#991a00',
    },
  },
  {
    slug: 'sunfield',
    name: 'Sunfield, Buda',
    title: 'Sunfield, Buda Directory',
    footerLabel: 'Sunfield, Buda YP',
    formspreeId: 'mwvyajvb',
    subjectPrefix: 'New Sunfield, Buda YP Referral',
    // Deep navy, muted teal & desaturated gold
    theme: {
      '--masters-green': '#0b2238',
      '--masters-green-mid': '#214f5a',
      '--masters-green-light': '#6fb1a6',
      '--masters-yellow': '#d8b86e',
      '--masters-yellow-pale': '#fbf6ea',
      '--white': '#ffffff',
      '--off-white': '#fbf7f2',
      '--light-gray': '#f1f4f5',
      '--mid-gray': '#9aa7ad',
      '--dark-gray': '#162226',
      '--text': '#0b1719',
      '--border': '#e6eaeb',
      '--phone': '#cc2200',
      '--phone-hover': '#991a00',
    },
    order: {
      addressPlaceholder: 'e.g. 123 Creekside Dr, Buda, TX',
      priceLine:
        "Physical copies of the Sunfield, Buda Directory can be purchased for $15 by cash, check, Venmo, or Zelle.",
    },
  },
];
