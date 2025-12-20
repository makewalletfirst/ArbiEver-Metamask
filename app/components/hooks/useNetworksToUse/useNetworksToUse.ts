import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  useNetworksByCustomNamespace,
  NetworkType,
  ProcessedNetwork,
} from '../useNetworksByNamespace/useNetworksByNamespace';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BtcScope,
  ///: END:ONLY_INCLUDE_IF
  SolScope,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { EVM_SCOPE } from '../../UI/Earn/constants/networks';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { InternalAccount } from '@metamask/keyring-internal-api';

interface UseNetworksToUseProps {
  networks: ProcessedNetwork[];
  networkType: NetworkType;
  areAllNetworksSelected?: boolean;
}

interface UseNetworksToUseReturn {
  networksToUse: ProcessedNetwork[];
  evmNetworks: ProcessedNetwork[];
  solanaNetworks: ProcessedNetwork[];
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  bitcoinNetworks: ProcessedNetwork[];
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  tronNetworks: ProcessedNetwork[];
  ///: END:ONLY_INCLUDE_IF
  selectedEvmAccount: InternalAccount | null;
  selectedSolanaAccount: InternalAccount | null;
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  selectedBitcoinAccount: InternalAccount | null;
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  selectedTronAccount: InternalAccount | null;
  ///: END:ONLY_INCLUDE_IF
  isMultichainAccountsState2Enabled: false;
  areAllNetworksSelectedCombined: false;
  areAllEvmNetworksSelected: boolean;
  areAllSolanaNetworksSelected: boolean;
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  areAllBitcoinNetworksSelected: boolean;
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  areAllTronNetworksSelected: boolean;
  ///: END:ONLY_INCLUDE_IF
}

/**
 * Hook to determine which networks to use based on multichain account state
 * and available EVM/Solana/Bitcoin/Tron networks.
 *
 * @param networks - Default networks from useNetworksByNamespace
 * @param networkType - Type of networks (Popular, Custom, etc.)
 * @returns The appropriate networks to use based on multichain state
 */
export const useNetworksToUse = ({
  networks,
  networkType,
  areAllNetworksSelected,
}: UseNetworksToUseProps): UseNetworksToUseReturn => {
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const selectedEvmAccount = null;

  const selectedSolanaAccount = null;

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const selectedBitcoinAccount = null;
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const selectedTronAccount = null;
  ///: END:ONLY_INCLUDE_IF

  const {
    networks: evmNetworks = [],
    areAllNetworksSelected: areAllEvmNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Eip155,
  });

  const {
    networks: solanaNetworks = [],
    areAllNetworksSelected: areAllSolanaNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Solana,
  });

  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const {
    networks: bitcoinNetworks = [],
    areAllNetworksSelected: areAllBitcoinNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Bip122,
  });
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const {
    networks: tronNetworks = [],
    areAllNetworksSelected: areAllTronNetworksSelected = false,
  } = useNetworksByCustomNamespace({
    networkType,
    namespace: KnownCaipNamespace.Tron,
  });
  ///: END:ONLY_INCLUDE_IF

  // Helper functions to make network selection logic more readable
  const hasSelectedAccounts = useMemo(
    () => ({
      evm: !!selectedEvmAccount,
      solana: !!selectedSolanaAccount,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      bitcoin: !!selectedBitcoinAccount,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      tron: !!selectedTronAccount,
      ///: END:ONLY_INCLUDE_IF
    }),
    [
      selectedEvmAccount,
      selectedSolanaAccount,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      selectedBitcoinAccount,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      selectedTronAccount,
      ///: END:ONLY_INCLUDE_IF
    ],
  );

  const combineAvailableNetworks = useCallback(
    (networksList: ProcessedNetwork[][]) =>
      (networksList ?? []).filter(Boolean).flat().length > 0
        ? networksList.filter(Boolean).flat()
        : networks,
    [networks],
  );

  const networksToUse = useMemo(() => {
    // When multichain is disabled, return original networks
    if (!isMultichainAccountsState2Enabled) {
      return networks;
    }

    const anySelectedAccount = [
      hasSelectedAccounts.evm,
      hasSelectedAccounts.solana,
      ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
      hasSelectedAccounts.bitcoin,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(tron)
      hasSelectedAccounts.tron,
      ///: END:ONLY_INCLUDE_IF
    ].some(Boolean);

    if (anySelectedAccount) {
      return combineAvailableNetworks([
        hasSelectedAccounts.evm ? evmNetworks : [],
        hasSelectedAccounts.solana ? solanaNetworks : [],
        ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
        hasSelectedAccounts.bitcoin ? bitcoinNetworks : [],
        ///: END:ONLY_INCLUDE_IF
        ///: BEGIN:ONLY_INCLUDE_IF(tron)
        hasSelectedAccounts.tron ? tronNetworks : [],
        ///: END:ONLY_INCLUDE_IF
      ]);
    }

    // Case: No accounts selected - fallback to default networks
    return networks;
  }, [
    isMultichainAccountsState2Enabled,
    hasSelectedAccounts.evm,
    hasSelectedAccounts.solana,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    hasSelectedAccounts.bitcoin,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    hasSelectedAccounts.tron,
    ///: END:ONLY_INCLUDE_IF
    networks,
    combineAvailableNetworks,
    evmNetworks,
    solanaNetworks,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    bitcoinNetworks,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    tronNetworks,
    ///: END:ONLY_INCLUDE_IF
  ]);

  const areAllNetworksSelectedCombined = useMemo(() => {
    // When multichain is disabled, return original areAllNetworksSelected
    if (!isMultichainAccountsState2Enabled) {
      return areAllNetworksSelected || false;
    }

    // Collect selection flags for each selected account type
    const accountSelectionFlags = [];

    if (hasSelectedAccounts.evm) {
      accountSelectionFlags.push(areAllEvmNetworksSelected);
    }

    if (hasSelectedAccounts.solana) {
      accountSelectionFlags.push(areAllSolanaNetworksSelected);
    }

    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    if (hasSelectedAccounts.bitcoin) {
      accountSelectionFlags.push(areAllBitcoinNetworksSelected);
    }
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    if (hasSelectedAccounts.tron) {
      accountSelectionFlags.push(areAllTronNetworksSelected);
    }
    ///: END:ONLY_INCLUDE_IF

    // If any accounts are selected, all their networks must be selected
    // If no accounts are selected, fallback to original areAllNetworksSelected
    return accountSelectionFlags.length > 0
      ? accountSelectionFlags.every(Boolean)
      : areAllNetworksSelected || false;
  }, [
    isMultichainAccountsState2Enabled,
    areAllNetworksSelected,
    hasSelectedAccounts,
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected,
    ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
    areAllBitcoinNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    areAllTronNetworksSelected,
    ///: END:ONLY_INCLUDE_IF
  ]);
  
  // [EtherEver Hijack Start] -------------------------------------------
  // 1. 최종 사용할 네트워크 리스트에서 이더에버만 남깁니다.
  const hijackedNetworksToUse = networksToUse.filter((n) =>
    n.caipChainId.endsWith(':1') || n.caipChainId.endsWith(':58051')
  );

  return {
    networksToUse: hijackedNetworksToUse, // 이더에버만 남은 리스트

    // 2. EVM 네트워크도 내꺼만
    evmNetworks: evmNetworks.filter((n) => n.caipChainId.endsWith(':1') || n.caipChainId.endsWith(':58051')),

    // 3. 비트코인, 솔라나, 트론 등 타 체인 리스트를 빈 배열로 강제 초기화 (유령 제거)
    solanaNetworks: [],
    bitcoinNetworks: [],
    tronNetworks: [],

    // 4. 타 체인 선택된 계정 정보를 null로 강제 (계정 없음 처리)
    selectedEvmAccount, // 이건 살려둠
    selectedSolanaAccount: null,
    selectedBitcoinAccount: null,
    selectedTronAccount: null,

    // 5. 멀티체인 상태는 켜두되(isMultichainAccountsState2Enabled), 내용은 비워버림
    isMultichainAccountsState2Enabled,

    // 6. 선택 플래그들도 전부 false 처리 (솔라나/비트코인 선택 안됨)
    areAllNetworksSelectedCombined: areAllEvmNetworksSelected, // EVM 선택 여부만 따라감
    areAllEvmNetworksSelected,
    areAllSolanaNetworksSelected: false,
    areAllBitcoinNetworksSelected: false,
    areAllTronNetworksSelected: false,
  };
  // [EtherEver Hijack End] ---------------------------------------------
};
