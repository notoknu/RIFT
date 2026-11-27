import {creatorAPIPlugin} from './creator-api.js';
import {statusAPIPlugin} from './status-api.js';
import {venueSnapshotPlugin} from './venue-snapshot.js';
import {collectionProfilePlugin} from './collection-profile.js';
import {collectionAPIPlugin} from './collection-api.js';
import {exchangeAPIPlugin} from './exchange-api.js';
import {ipfsAPIPlugin} from './ipfs-api.js';
import {marketAPIPlugin} from './market-api.js';
import {portfolioPlugin} from './portfolio.js';
import {walletArtPlugin} from './wallet-assets.js';
import {rankingsPlugin} from './rankings.js';
import {imagePlugin} from './images.js';
import {crosscheckPlugin} from './crosscheck.js';
import {searchPlugin} from './search.js';
import {metadataAuditPlugin} from './metadata-audit.js';
import {PRODUCT_FEATURES} from '../shared/product-support-contract.js';

const factories=Object.freeze({creator:creatorAPIPlugin,status:statusAPIPlugin,'venue-snapshot':venueSnapshotPlugin,'collection-profile':collectionProfilePlugin,collections:collectionAPIPlugin,exchange:exchangeAPIPlugin,'ipfs-preflight':ipfsAPIPlugin,'legacy-market':marketAPIPlugin,portfolio:portfolioPlugin,'wallet-art':walletArtPlugin,rankings:rankingsPlugin,images:imagePlugin,crosscheck:crosscheckPlugin,search:searchPlugin,'metadata-audit':metadataAuditPlugin});
/** Preserve the existing production registration order and factory defaults.
 * The inventory and production registration now share the same feature IDs. */
export function createProductPlugins(){
 if(Object.keys(factories).length!==PRODUCT_FEATURES.length)throw Error('PRODUCT_PLUGIN_REGISTRY_DRIFT');
 return PRODUCT_FEATURES.map(feature=>{const factory=factories[feature.id];if(typeof factory!=='function')throw Error('PRODUCT_PLUGIN_FACTORY_MISSING');const plugin=factory();if(plugin?.name!==feature.pluginName||typeof plugin.configureServer!=='function')throw Error('PRODUCT_PLUGIN_CONTRACT_MISMATCH');return plugin});
}
