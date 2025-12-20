import {
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';
import { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { getNetworkImageSource } from '../../../../util/networks';
import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';

/**
 * Static list of popular networks for trending features.
 * Returns ProcessedNetwork objects similar to usePopularNetworks hook.
 * This is a static constant that doesn't depend on Redux state.
 */
// Before adding a network, you MUST make sure it is supported on both `searchAPI` and `trendingAPI`
export const TRENDING_NETWORKS_LIST: ProcessedNetwork[] = [
  {
    id: NetworkToCaipChainId.ETHEREUM,
    name: 'Ethereum',
    caipChainId: NetworkToCaipChainId.ETHEREUM,
    isSelected: true,
    imageSource: getNetworkImageSource({
      chainId: NetworkToCaipChainId.ETHEREUM,
    }),
  },
];
