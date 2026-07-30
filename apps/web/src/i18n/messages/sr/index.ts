import about from './about.json'
import apps from './apps.json'
import blog from './blog.json'
import catalog from './catalog.json'
import categories from './categories.json'
import common from './common.json'
import contact from './contact.json'
import download from './download.json'
import features from './features.json'
import footer from './footer.json'
import hardware from './hardware.json'
import home from './home.json'
import howItWorks from './howItWorks.json'
import legal from './legal.json'
import meta from './meta.json'
import nav from './nav.json'
import pricing from './pricing.json'
import quote from './quote.json'
import solutions from './solutions.json'
import whatIsSignage from './whatIsSignage.json'

// One file per namespace (easier to hand to the marketing team later). Add a page
// by dropping its `<name>.json` here and mirroring the line in `en/index.ts`.
// `catalog` + `categories` are extracted from the CMS i18n (app copy by slug).
const messages = {
  meta,
  nav,
  footer,
  common,
  home,
  howItWorks,
  features,
  pricing,
  quote,
  whatIsSignage,
  hardware,
  solutions,
  about,
  download,
  apps,
  catalog,
  categories,
  contact,
  legal,
  blog,
}

export default messages
