import type { PreinstalledSnap } from '@metamask/snaps-controllers';
import MessageSigningSnap from '@metamask/message-signing-snap/dist/preinstalled-snap.json';
import ENSResolverSnap from '@metamask/ens-resolver-snap/dist/preinstalled-snap.json';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import SolanaWalletSnap from '@metamask/solana-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
import BitcoinWalletSnap from '@metamask/bitcoin-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(flask)
import PreinstalledExampleSnap from '@metamask/preinstalled-example-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronWalletSnap from '@metamask/tron-wallet-snap/dist/preinstalled-snap.json';
///: END:ONLY_INCLUDE_IF

// [ArbiEver] SolanaWalletSnap / BitcoinWalletSnap / TronWalletSnap 을 array 에서 제외.
// import 는 fence 가 그대로 두지만 array 에 안 넣으므로 SnapsController 가
// "preinstalled snaps" 로 인식하지 않아 자동 설치되지 않음 → 비-EVM 계정 자동 생성 차단.
// fence 자체는 건드리지 않으므로 다른 27 개 파일의 초기화 path 는 그대로 유지.
const PREINSTALLED_SNAPS: readonly PreinstalledSnap[] = Object.freeze([
  ENSResolverSnap as unknown as PreinstalledSnap,
  MessageSigningSnap as unknown as PreinstalledSnap,
  // SolanaWalletSnap, BitcoinWalletSnap, TronWalletSnap 의도적으로 제외
  ///: BEGIN:ONLY_INCLUDE_IF(flask)
  PreinstalledExampleSnap as unknown as PreinstalledSnap,
  ///: END:ONLY_INCLUDE_IF
]);

// Reference 만 유지 (TS 의 unused import 경고 방지). 위 array 에 안 들어가니 동작은 없음.
void SolanaWalletSnap; void BitcoinWalletSnap; void TronWalletSnap;

export default PREINSTALLED_SNAPS;
