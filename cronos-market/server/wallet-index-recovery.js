import {restoreColdSnapshot} from './cold-snapshot-recovery.js';
import {inspectWalletIndexImage} from './wallet-index-archive.js';
/** Compatibility wrapper; callers cannot supply arbitrary inspection code through the CLI. */
export async function restoreWalletIndex(options={}){return restoreColdSnapshot(options,{kind:'wallet-index',inspect:inspectWalletIndexImage})}
