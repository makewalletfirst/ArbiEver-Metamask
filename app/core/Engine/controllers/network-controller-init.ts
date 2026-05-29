import { ControllerInitFunction } from '../types';
import {
  getDefaultNetworkControllerState,
  NetworkController,
  NetworkState,
  type NetworkControllerMessenger,
} from '@metamask/network-controller';
import { NetworkControllerInitMessenger } from '../messengers/network-controller-messenger';
import { ChainId, DEFAULT_MAX_RETRIES } from '@metamask/controller-utils';
import { getFailoverUrlsForInfuraNetwork } from '../../../util/networks/customNetworks';
import { INFURA_PROJECT_ID } from '../../../constants/network';
import { SECOND } from '../../../constants/time';
import { getIsQuicknodeEndpointUrl } from './network-controller/utils';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from './network-controller/messenger-action-handlers';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import { MetaMetrics } from '../../Analytics';
import { Hex, Json } from '@metamask/utils';
import Logger from '../../../util/Logger';

const NON_EMPTY = 'NON_EMPTY';

export const ADDITIONAL_DEFAULT_NETWORKS = [
  ChainId['megaeth-testnet'],
  ChainId['monad-testnet'],
];

export function getInitialNetworkControllerState(persistedState: {
  NetworkController?: Partial<NetworkState>;
}) {
  let initialNetworkControllerState =
    persistedState.NetworkController as NetworkState;

  if (!initialNetworkControllerState) {
    initialNetworkControllerState = getDefaultNetworkControllerState(
      ADDITIONAL_DEFAULT_NETWORKS,
    );

    // Add failovers for default Infura RPC endpoints
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId.mainnet
    ].rpcEndpoints[0].failoverUrls =
      ['https://etherever.ever-chain.xyz'];

    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['linea-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('linea-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['base-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('base-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['arbitrum-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('arbitrum-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['bsc-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('bsc-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['optimism-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('optimism-mainnet');
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId['polygon-mainnet']
    ].rpcEndpoints[0].failoverUrls =
      getFailoverUrlsForInfuraNetwork('polygon-mainnet');

    // Update default popular network names
    initialNetworkControllerState.networkConfigurationsByChainId[
      ChainId.mainnet
    ].name = 'EtherEver';

    // [ArbiEver] Add ArbiEver L2 (chainId 580511) as 2nd default chain
    const ARBIEVER_CHAIN_ID = '0x8db9f'; // toHex('580511')
    initialNetworkControllerState.networkConfigurationsByChainId[
      ARBIEVER_CHAIN_ID
    ] = {
      chainId: ARBIEVER_CHAIN_ID,
      name: 'ArbiEver',
      nativeCurrency: 'ETE',
      blockExplorerUrls: ['https://arbiever.ever-chain.xyz'],
      defaultBlockExplorerUrlIndex: 0,
      rpcEndpoints: [
        {
          name: 'ArbiEver',
          url: 'https://rpc-arbi.ever-chain.xyz',
          type: 'custom' as any,
          networkClientId: 'arbiever-mainnet',
          failoverUrls: [],
        },
      ],
      defaultRpcEndpointIndex: 0,
    } as any;

    // [ArbiEver] EtherEver(0xe2c3) + ArbiEver(0x8db9f) 외 모든 default 체인 제거.
    // 첫 설치 시 인기 네트워크 카테고리에 Linea/Base/Arbitrum/BSC/Optimism/Polygon/Sei 등이
    // 자동 노출되는 것을 막기 위해 NetworkController 초기 state 단계에서 통째로 비움.
    const ARBIEVER_KEEP_CHAIN_IDS = new Set(['0xe2c3', '0x8db9f']);
    Object.keys(
      initialNetworkControllerState.networkConfigurationsByChainId,
    ).forEach((cid) => {
      if (!ARBIEVER_KEEP_CHAIN_IDS.has(cid.toLowerCase())) {
        delete initialNetworkControllerState.networkConfigurationsByChainId[
          cid as Hex
        ];
      }
    });
  }

  return initialNetworkControllerState;
}

/**
 * Initialize the network controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const networkControllerInit: ControllerInitFunction<
  NetworkController,
  NetworkControllerMessenger,
  NetworkControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const infuraProjectId = INFURA_PROJECT_ID || NON_EMPTY;

  const controller = new NetworkController({
    infuraProjectId,
    state: getInitialNetworkControllerState(persistedState),
    messenger: controllerMessenger,
    getBlockTrackerOptions: () =>
      process.env.IN_TEST
        ? {}
        : {
            pollingInterval: 20 * SECOND,
            // The retry timeout is pretty short by default, and if the endpoint is
            // down, it will end up exhausting the max number of consecutive
            // failures quickly.
            retryTimeout: 20 * SECOND,
          },
    getRpcServiceOptions: (rpcEndpointUrl: string) => {
      // Note that the total number of attempts is 1 more than this
      // (which is why we add 1 below).
      const maxRetries = DEFAULT_MAX_RETRIES;
      const commonOptions = {
        fetch: globalThis.fetch.bind(globalThis),
        btoa: globalThis.btoa.bind(globalThis),
      };
      const commonPolicyOptions = {
        // Ensure that the "cooldown" period after breaking the circuit is short.
        circuitBreakDuration: 30 * SECOND,
        maxRetries,
      };

      if (getIsQuicknodeEndpointUrl(rpcEndpointUrl)) {
        return {
          ...commonOptions,
          policyOptions: {
            ...commonPolicyOptions,
            // The number of rounds of retries that will break the circuit,
            // triggering a "cooldown".
            //
            // When we fail over to QuickNode, we expect it to be down at first
            // while it is being automatically activated, and we don't want to
            // activate the "cooldown" accidentally.
            maxConsecutiveFailures: (maxRetries + 1) * 10,
          },
        };
      }

      return {
        ...commonOptions,
        policyOptions: {
          ...commonPolicyOptions,
          // Ensure that if the endpoint continually responds with errors, we
          // break the circuit relatively fast (but not prematurely).
          //
          // Note that the circuit will break much faster if the errors are
          // retriable (e.g. 503) than if not (e.g. 500), so we attempt to strike
          // a balance here.
          maxConsecutiveFailures: (maxRetries + 1) * 3,
        },
      };
    },
    additionalDefaultNetworks: ADDITIONAL_DEFAULT_NETWORKS,
  });

  initMessenger.subscribe(
    'NetworkController:rpcEndpointUnavailable',
    async ({
      chainId,
      endpointUrl,
      error,
    }: {
      chainId: Hex;
      endpointUrl: string;
      error: unknown;
    }) => {
      onRpcEndpointUnavailable({
        chainId,
        endpointUrl,
        infuraProjectId,
        error,
        trackEvent: ({ event, properties }) => {
          const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
            .addProperties(properties)
            .build();
          MetaMetrics.getInstance().trackEvent(metricsEvent);
        },
        metaMetricsId: await MetaMetrics.getInstance().getMetaMetricsId(),
      });
    },
  );

  initMessenger.subscribe(
    'NetworkController:rpcEndpointDegraded',
    async ({
      chainId,
      endpointUrl,
      error,
    }: {
      chainId: Hex;
      endpointUrl: string;
      error: unknown;
    }) => {
      onRpcEndpointDegraded({
        chainId,
        endpointUrl,
        error,
        infuraProjectId,
        trackEvent: ({ event, properties }) => {
          const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
            .addProperties(properties)
            .build();
          MetaMetrics.getInstance().trackEvent(metricsEvent);
        },
        metaMetricsId: await MetaMetrics.getInstance().getMetaMetricsId(),
      });
    },
  );

  controller.initializeProvider();

  // TODO: Move this to `network-controller`
  const toggleRpcFailover = (isRpcFailoverEnabled: Json) => {
      Logger.log('Enabling RPC failover (FORCED).');
      controller.enableRpcFailover();
  };

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    toggleRpcFailover,
    (state) => state.remoteFeatureFlags.walletFrameworkRpcFailoverEnabled,
  );

  const remoteFeatureFlagControllerState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  toggleRpcFailover(
    remoteFeatureFlagControllerState.remoteFeatureFlags
      .walletFrameworkRpcFailoverEnabled,
  );

  return {
    controller,
  };
};
